import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { DeviceEventEmitter } from 'react-native';

/**
 * API CONFIGURATION
 * -----------------
 * Switch comments below to change environment.
 * For local dev, set LOCAL_IP to your machine's LAN IP (run `ipconfig`).
 */

const LOCAL_IP = '172.21.1.18'; // ← Change to your machine's IP for local dev only

const getBaseUrl = () => {
    const env = Constants.expoConfig?.extra?.ENV || 'production';

    if (env === 'development') {
        return `http://${LOCAL_IP}:3001`;   // Local dev
    }
    return 'https://stayin.in/api1';        // ✅ Production (AWS Nginx)
};

const getAdminBaseUrl = () => {
    const env = Constants.expoConfig?.extra?.ENV || 'production';

    if (env === 'development') {
        return `http://${LOCAL_IP}:3002`;   // Local dev
    }
    return 'https://stayin.in/api2';        // ✅ Production (AWS Nginx)
};

export const API_BASE_URL        = getBaseUrl();
export const ADMIN_API_BASE_URL  = getAdminBaseUrl();

// 🔌 Socket config — auto-detects correct Nginx path
export const SOCKET_ORIGIN = API_BASE_URL.replace('/api1', '').replace('/api2', '');
export const SOCKET_PATH   = API_BASE_URL.includes('/api1') ? '/api1/socket.io' : (API_BASE_URL.includes('/api2') ? '/api2/socket.io' : '/socket.io');

// 🚀 ULTRA-AGGRESSIVE WAKE-UP: Ping server with exponential backoff
// Render free tier sleeps after 15min inactivity, takes 30-60s to wake up
let _serverAwake = false;
let _wakeAttempts = 0;
const MAX_WAKE_ATTEMPTS = 8;

export const wakeUpServer = () => {
    if (_serverAwake) return;
    
    const ping = (delay: number, attempt: number) => setTimeout(async () => {
        if (_serverAwake || attempt > MAX_WAKE_ATTEMPTS) return;
        
        false && console.log(`Waking up backend...`);
        
        try {
            // Parallel ping both servers with 30s timeout (Render needs time)
            await Promise.race([
                axios.get(`${API_BASE_URL}/health`, { timeout: 30000 }),
                axios.get(`${ADMIN_API_BASE_URL}/health`, { timeout: 30000 })
            ]);
            
            _serverAwake = true;
            DeviceEventEmitter.emit('BACKEND_CONNECTED', { 
                isLocal: API_BASE_URL.includes('172.21') || API_BASE_URL.includes('localhost') 
            });
            false && console.log(`Backend is ready`);
        } catch (err) {
            false && console.log(`Waking up backend...`);
            
            // Exponential backoff: 0s, 5s, 10s, 15s, 20s, 30s, 40s, 50s
            const nextDelay = Math.min(5000 * attempt, 50000);
            ping(nextDelay, attempt + 1);
        }
    }, delay);
    
    // Start immediately
    ping(0, 1);
};

// Auto-trigger on import
wakeUpServer();

// Keep servers warm every 8 minutes (before 15min sleep threshold)
setInterval(() => {
    if (_serverAwake) {
        axios.get(`${API_BASE_URL}/health`, { timeout: 5000 }).catch(() => { _serverAwake = false; });
        axios.get(`${ADMIN_API_BASE_URL}/health`, { timeout: 5000 }).catch(() => {});
    }
}, 8 * 60 * 1000);

// 🛡️ INITIAL LOAD PROTECTION: Prevent SESSION_EXPIRED during app startup
// This flag is set to true for the first 5 seconds after app loads
// to prevent race conditions where API calls happen before token is fully loaded
let _isInitialLoad = true;
setTimeout(() => {
    _isInitialLoad = false;
}, 5000);

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 120000, // 2 minutes - allowing large image uploads on 3G/4G
});

// ── Auth Token Injection ──────────────────────────────────────────────────────
// Token is set globally via apiClient.defaults.headers.common['Authorization'] in AuthContext.
// This is set on login AND on every app boot when loading auth from AsyncStorage.
// No per-request AsyncStorage lookup needed — it's already in the Axios instance.
apiClient.interceptors.request.use(
    (config) => {
        // Smart Routing: Route admin, host, and staff modules to the Admin Backend
        if (config.url) {
            const normalizedUrl = config.url.replace(/^\//, '');
            const adminPrefixes = [
                'admin',
                'admin-chat',
                'host',
                'analytics',
                'api/v1/staff',
                'api/v1/waiter',
                'api/v1/security',
                'api/chat',        // 🆕 Production Chat System
            ];
            
            if (adminPrefixes.some(prefix => normalizedUrl.startsWith(prefix))) {
                config.baseURL = ADMIN_API_BASE_URL;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // 🚨 RENDER COLD START DETECTION
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || 
            error.response?.status === 502 || error.response?.status === 503 || error.response?.status === 504) {
            
            false && console.log('Waking up backend...');
            _serverAwake = false;
            wakeUpServer();
            
            // Retry after 3 seconds if not already retried
            if (!originalRequest._coldStartRetry) {
                originalRequest._coldStartRetry = true;
                await new Promise(resolve => setTimeout(resolve, 3000));
                return apiClient(originalRequest);
            }
        }

        // Prevent refresh logic for login/verify-otp endpoints - they are public
        const isAuthEndpoint = originalRequest?.url?.includes('/auth/refresh') || 
                               originalRequest?.url?.includes('/auth/verify-otp') ||
                               originalRequest?.url?.includes('/auth/login');

        if (isAuthEndpoint) {
            return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
            const apiMessage = error.response?.data?.message;

            if (apiMessage === 'Token is invalid or expired') {
                if (isRefreshing) {
                    return new Promise((resolve, reject) => {
                        failedQueue.push({ resolve, reject });
                    })
                        .then((token) => {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                            return apiClient(originalRequest);
                        })
                        .catch((err) => Promise.reject(err));
                }

                originalRequest._retry = true;
                isRefreshing = true;

                try {
                    const authStr = await AsyncStorage.getItem('auth');
                    let refreshToken = null;
                    if (authStr) {
                        try {
                            refreshToken = JSON.parse(authStr).refreshToken;
                        } catch (e) {}
                    }

                    if (!refreshToken) {
                        processQueue({ message: 'No refresh token', isSilent: true }, null);
                        // Don't emit SESSION_EXPIRED during initial load
                        if (!_isInitialLoad) {
                            DeviceEventEmitter.emit('SESSION_EXPIRED');
                        } else {
                            console.log('[API] Suppressing SESSION_EXPIRED during initial load');
                        }
                        return Promise.reject({ message: 'No refresh token', isSilent: true });
                    }

                    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                        token: refreshToken
                    });

                    if (response.data.success) {
                        const { accessToken, role } = response.data.data;
                        const authStr = await AsyncStorage.getItem('auth');
                        if (authStr) {
                            try {
                                const parsed = JSON.parse(authStr);
                                parsed.token = accessToken;
                                if (role) parsed.role = role.toLowerCase();
                                await AsyncStorage.setItem('auth', JSON.stringify({
                                    token: parsed.token,
                                    role: parsed.role,
                                    hostId: parsed.hostId || null,
                                    refreshToken: parsed.refreshToken
                                }));
                                DeviceEventEmitter.emit('ROLE_UPDATED', { role: parsed.role });
                            } catch (e) {}
                        }
                        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                        processQueue(null, accessToken);
                        return apiClient(originalRequest);
                    }
                } catch (refreshError) {
                    processQueue(refreshError, null);
                    // Don't emit SESSION_EXPIRED during initial load
                    if (!_isInitialLoad) {
                        DeviceEventEmitter.emit('SESSION_EXPIRED');
                    } else {
                        console.log('[API] Suppressing SESSION_EXPIRED during initial load');
                    }
                    return Promise.reject(refreshError);
                } finally {
                    isRefreshing = false;
                }
            } else if (error.response?.status === 404 && apiMessage === 'User not found') {
                // 🚨 CRITICAL: Stale session detected (ID no longer exists in DB)
                // Force logout immediately to clear invalid local state and prevent loops
                // Don't emit SESSION_EXPIRED during initial load
                if (!_isInitialLoad) {
                    DeviceEventEmitter.emit('SESSION_EXPIRED');
                } else {
                    console.log('[API] Suppressing SESSION_EXPIRED during initial load');
                }
            } else if (apiMessage && (
                apiMessage.toLowerCase().includes('not authorized') ||
                apiMessage.toLowerCase().includes('invalid token') ||
                apiMessage.toLowerCase().includes('session expired')
            )) {
                // Only emit SESSION_EXPIRED for explicit auth failures
                // Don't emit SESSION_EXPIRED during initial load
                if (!_isInitialLoad) {
                    DeviceEventEmitter.emit('SESSION_EXPIRED');
                } else {
                    console.log('[API] Suppressing SESSION_EXPIRED during initial load');
                }
            }
            // For other 401s (like permission issues), just reject without logging out
        } else if (error.response?.status === 401 && originalRequest._retry) {
            // Don't emit SESSION_EXPIRED during initial load
            if (!_isInitialLoad) {
                DeviceEventEmitter.emit('SESSION_EXPIRED');
            } else {
                console.log('[API] Suppressing SESSION_EXPIRED during initial load');
            }
        }

        return Promise.reject(error);
    }
);


export default apiClient;

