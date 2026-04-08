import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { DeviceEventEmitter } from 'react-native';

/**
 * API CONFIGURATION
 * -----------------
 * Standard logic for development environments to ensure connectivity.
 */
const getBaseUrl = () => {
    // Production Render URL
    return 'https://entry-user-backend.onrender.com';
    // Local Testing URL (uncomment for local dev)
    // return 'http://10.225.202.18:3000';
};

export const API_BASE_URL = getBaseUrl();
export const ADMIN_API_BASE_URL = 'https://entry-admin-backend.onrender.com';

// 🚀 AGGRESSIVE WAKE-UP: Ping server immediately + with backoff to kill cold start delays
// This fires BEFORE any real API calls so Render is already awake when user logs in
let _serverAwake = false;
export const wakeUpServer = () => {
    if (_serverAwake) return;
    const ping = (delay: number) => setTimeout(() => {
        axios.get(`${API_BASE_URL}/health`, { timeout: 10000 })
            .then(() => { 
                _serverAwake = true;
                console.log(`[Server] User Backend is awake ✅`); 
            })
            .catch(() => console.log(`[Server] Waking up User Backend... (retry in ${delay}ms)`));
            
        axios.get(`${ADMIN_API_BASE_URL}/health`, { timeout: 10000 })
            .then(() => console.log(`[Server] Admin Backend is awake ✅`))
            .catch(() => {});
    }, delay);
    
    // Fire 3 pings: immediately, after 10s, after 25s (covers Render's cold start window)
    ping(0);
    ping(10000);
    ping(25000);
};

// Auto-trigger on import
wakeUpServer();

// Keep servers warm every 10 minutes while app is open
setInterval(() => {
    axios.get(`${API_BASE_URL}/health`, { timeout: 5000 }).catch(() => {});
    axios.get(`${ADMIN_API_BASE_URL}/health`, { timeout: 5000 }).catch(() => {});
}, 10 * 60 * 1000);

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 60000, 
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
                'api/v1/security'
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
                        DeviceEventEmitter.emit('SESSION_EXPIRED');
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
                    DeviceEventEmitter.emit('SESSION_EXPIRED');
                    return Promise.reject(refreshError);
                } finally {
                    isRefreshing = false;
                }
            } else if (error.response?.status === 404 && apiMessage === 'User not found') {
                // 🚨 CRITICAL: Stale session detected (ID no longer exists in DB)
                // Force logout immediately to clear invalid local state and prevent loops
                DeviceEventEmitter.emit('SESSION_EXPIRED');
            } else {
                // If it's a 401 but NOT explicitly 'Token expired', emit SESSION_EXPIRED
                // to force logout and cleanup stale credentials (like 'Not authorized to access this route')
                DeviceEventEmitter.emit('SESSION_EXPIRED');
            }
        } else if (error.response?.status === 401 && originalRequest._retry) {
            DeviceEventEmitter.emit('SESSION_EXPIRED');
        }

        return Promise.reject(error);
    }
);


export default apiClient;

