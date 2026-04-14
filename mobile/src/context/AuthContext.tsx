import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { jwtDecode } from 'jwt-decode';
import apiClient from '../services/apiClient';
import { useQueryClient } from '@tanstack/react-query';
import { prefetchAdminData, prefetchUserData, prefetchHostData } from '../services/prefetchService';

export type UserRole = 'admin' | 'host' | 'staff' | 'user' | null;

interface AuthState {
    token: string | null;
    userId: string | null;
    role: UserRole;
    hostId: string | null;
    onboardingCompleted: boolean;
    user: any | null; // Kept for UI logic, but never overwrites core auth
}

interface AuthContextType extends AuthState {
    isLoading: boolean;
    login: (authData: { token: string; role: string; refreshToken?: string; hostId?: string | null; user?: any; onboardingCompleted?: boolean }) => Promise<void>;
    updateUser: (userData: Partial<any>) => Promise<void>;
    setOnboardingStatus: (status: boolean) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [authState, setAuthState] = useState<AuthState>({
        token: null,
        userId: null,
        role: null,
        hostId: null,
        onboardingCompleted: false,
        user: null
    });
    const [isLoading, setIsLoading] = useState(true);
    const queryClient = useQueryClient();

    useEffect(() => {
        loadAuth();
        
        // Listen to explicit force-logout/expiry events
        const roleSub = DeviceEventEmitter.addListener('SESSION_EXPIRED', () => {
            logout();
        });
        return () => roleSub.remove();
    }, []);

    const loadAuth = async () => {
        try {
            const raw = await AsyncStorage.getItem('auth');
            const rawUser = await AsyncStorage.getItem('auth_user');
            
            if (raw) {
                const data = JSON.parse(raw);
                let userData = { onboardingCompleted: false, user: null };
                if (rawUser) userData = JSON.parse(rawUser);
                
                if (data.token) {
                    try {
                        const decoded: any = jwtDecode(data.token);
                        if (decoded && decoded.role) {
                            // ✅ CRITICAL: JWT stores role as 'ADMIN'/'HOST' but app uses lowercase 'admin'/'host'
                            data.role = (decoded.role as string).toLowerCase();
                        }
                        if (decoded && decoded.hostId) {
                            data.hostId = decoded.hostId;
                        }
                        if (decoded && (decoded.userId || decoded.id || decoded.sub)) {
                            data.userId = decoded.userId || decoded.id || decoded.sub;
                        }
                    } catch (decodeErr) {
                        // JWT decode failed, continue with basic data
                    }
                    
                    apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
                }
                
                setAuthState({ ...data, ...userData });
            }
        } catch (e) {
            // Silent fail - app continues with no auth
        } finally {
            setIsLoading(false);
        }
    };

    // 🔥 Silent server re-validation on boot (runs 3s after app loads)
    // This ensures that if admin approved/rejected the host while app was closed,
    // the routing guard will pick up the correct status instantly on next open.
    // AND fetches Admin profile image/data on boot.
    useEffect(() => {
        if (!authState.token || !authState.role) return;

        // Fire-and-forget background validation — never blocks UI
        const validateHostStatus = async () => {
            try {
                const res = await apiClient.get('/host/profile');
                const serverStatus = res.data?.data?.hostStatus;
                const storedStatus = authState.user?.hostStatus;

                if (serverStatus && serverStatus !== storedStatus) {
                    // Update both in-memory state and AsyncStorage silently
                    await persistAuth({
                        user: { ...authState.user, hostStatus: serverStatus },
                    });
                }
            } catch (e) {
                // Silently ignore — user experience unaffected
            }
        };

        // ⚡ ADMIN: Silent validation for Admin profile data on boot
        const fetchAdminProfile = async () => {
            try {
                const res = await apiClient.get('/admin/profile');
                if (res.data?.data) {
                    const profile = res.data.data;
                    await persistAuth({ user: profile });
                }
            } catch (e) {
                // Ignore silently
            }
        };

        if (authState.role === 'host') {
            const timer = setTimeout(validateHostStatus, 3000);
            return () => clearTimeout(timer);
        } else if (authState.role === 'admin') {
            const timer = setTimeout(fetchAdminProfile, 500); // Admin profile is critical for UI instantly
            return () => clearTimeout(timer);
        }
    }, [authState.token, authState.role]); // Only runs when token/role first loads

    // 🔥 Silent prefetch after state is set
    useEffect(() => {
        // 🔒 SAFETY: Don't prefetch any data if onboarding is not finished
        // This prevents the "404 User not found" background loops.
        if (!authState.token || !authState.role || !authState.onboardingCompleted) return;
        
        const role = authState.role.toLowerCase();
        if (role === 'admin') {
            prefetchAdminData(queryClient);
        } else if (role === 'host') {
            prefetchHostData(queryClient);
        } else {
            prefetchUserData(queryClient, authState.userId || undefined);
        }
    }, [authState.token, authState.onboardingCompleted]);

    const persistAuth = async (updates: Partial<AuthState>) => {
        setAuthState(prev => {
            const newState = { ...prev, ...updates };
            // Ensure exact rigid object persistence for auth
            AsyncStorage.setItem('auth', JSON.stringify({
                token: newState.token,
                role: newState.role,
                hostId: newState.hostId || null
            }));
            
            // Persist user metadata securely in a different bucket
            AsyncStorage.setItem('auth_user', JSON.stringify({
                onboardingCompleted: newState.onboardingCompleted,
                user: newState.user
            }));
            
            return newState;
        });
    };

    const login = async (authData: { token: string; role: string; refreshToken?: string; hostId?: string | null; user?: any; onboardingCompleted?: boolean }) => {
        // Validate role
        if (!authData.role) {
            throw new Error('Invalid authentication role received from server.');
        }

        const normalizedRole = authData.role.toLowerCase() as UserRole;
        if (!['admin', 'host', 'staff', 'user'].includes(normalizedRole as string)) {
            throw new Error('Invalid authentication role received from server.');
        }

        // ⚡ SENIOR ENGINEER FIX: HARD RESET everything before starting new session
        try {
            await AsyncStorage.clear(); 
            apiClient.defaults.headers.common['Authorization'] = '';
            delete apiClient.defaults.headers.common['Authorization'];
        } catch (e) {
            // Silent fail - continue with logout
        }

        await queryClient.cancelQueries();
        queryClient.clear();
        
        const decoded: any = jwtDecode(authData.token);
        const payload: AuthState = {
            token: authData.token,
            userId: decoded?.id || decoded?.sub || null,
            role: normalizedRole,
            hostId: authData.hostId || null,
            user: authData.user || null,
            onboardingCompleted: authData.onboardingCompleted ?? true
        };

        // ── STEP 2: Persist credentials to AsyncStorage FIRST (critical for session persistence) ──
        try {
            await AsyncStorage.setItem('auth', JSON.stringify({
                token: payload.token,
                role: payload.role,
                hostId: payload.hostId,
                refreshToken: authData.refreshToken || null,
            }));

            await AsyncStorage.setItem('auth_user', JSON.stringify({
                onboardingCompleted: payload.onboardingCompleted,
                user: payload.user,
            }));
        } catch (storageError) {
            throw new Error('Failed to save session. Please try again.');
        }

        // ── STEP 3: Attach token to API client ──
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${authData.token}`;

        // ── STEP 4: Update React state ──
        setAuthState(payload);

        // ── STEP 5: Prefetch data after navigation settles ──
        setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            
            if (normalizedRole === 'admin') {
                prefetchAdminData(queryClient);
            } else if (normalizedRole === 'host') {
                prefetchHostData(queryClient);
            } else {
                prefetchUserData(queryClient, payload.userId || undefined);
            }
        }, 300);
    };

    const setOnboardingStatus = async (status: boolean) => {
        await persistAuth({ onboardingCompleted: status });
    };

    // Merges non-critical user fields (name, image, hostStatus etc.) without touching token or role
    const updateUser = async (userData: Partial<any>) => {
        console.log('[AuthContext] 📝 updateUser called with:', userData);
        await persistAuth({
            user: { ...authState.user, ...userData },
        });
        console.log('[AuthContext] ✅ User updated. New user object:', { ...authState.user, ...userData });
    };

    const logout = async () => {
        try {
            // ── MANDATORY RESET ──
            await AsyncStorage.removeItem('auth');
            await AsyncStorage.removeItem('auth_user');
            await AsyncStorage.clear();
            
            // Force wipe axios common headers
            apiClient.defaults.headers.common['Authorization'] = '';
            delete apiClient.defaults.headers.common['Authorization'];
            
            // Wipe React Query entirely
            await queryClient.cancelQueries();
            queryClient.removeQueries(); // Completely drop them from memory instantly
            queryClient.clear();
        } catch (e) {
            // Silent cleanup failure
        }

        setAuthState({
            token: null,
            userId: null,
            role: null,
            hostId: null,
            user: null,
            onboardingCompleted: false,
        });
    };

    return (
        <AuthContext.Provider value={{ ...authState, isLoading, login, updateUser, setOnboardingStatus, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
