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
    // Local environment IP
    return 'http://10.230.230.18:3000';
};

export const API_BASE_URL = getBaseUrl();

// 🚀 AGGRESSIVE WAKE-UP: Ping server immediately + with backoff to kill cold start delays
// This fires BEFORE any real API calls so Render is already awake when user logs in
let _serverAwake = false;
export const wakeUpServer = () => {
    if (_serverAwake) return;
    const ping = (delay: number) => setTimeout(() => {
        axios.get(`${API_BASE_URL}/health`, { timeout: 10000 })
            .then(() => { 
                _serverAwake = true;
                console.log(`[Server] Backend is awake ✅`); 
            })
            .catch(() => console.log(`[Server] Waking up... (retry in ${delay}ms)`));
    }, delay);
    
    // Fire 3 pings: immediately, after 10s, after 25s (covers Render's cold start window)
    ping(0);
    ping(10000);
    ping(25000);
};

// Auto-trigger on import
wakeUpServer();

// Keep server warm every 10 minutes while app is open
setInterval(() => {
    axios.get(`${API_BASE_URL}/health`, { timeout: 5000 }).catch(() => {});
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
    (config) => config,
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
                                    hostId: parsed.hostId || null
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
        }

        return Promise.reject(error);
    }
);

// ── API Interceptors for visibility ──────────────────────────────────────────
apiClient.interceptors.request.use(
    (config) => {
        console.log(`[API Request Out] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.data || '(no body)');
        return config;
    },
    (error) => {
        console.error('[API Request Error]', error);
        return Promise.reject(error);
    }
);

apiClient.interceptors.response.use(
    (response) => {
        console.log(`[API Response In] ${response.status} ${response.config.url}`, response.data);
        return response;
    },
    (error) => {
        if (error.response) {
            // Use warn instead of error for 401s so we don't trigger the red Expo Error Screen
            if (error.response.status === 401) {
                console.warn(`[AUTH] 401 Unauthorized for ${error.config.url} - session will reset.`);
            } else {
                console.error(`[API Response Fail] ${error.response.status} ${error.config.url}`, error.response.data);
            }
        } else {
            console.error(`[API Connectivity Fail] ${error.config?.url} could not reach ${API_BASE_URL}.`);
        }
        return Promise.reject(error);
    }
);

export default apiClient;
