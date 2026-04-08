import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import apiClient from '../services/apiClient';
import { useQueryClient } from '@tanstack/react-query';
import { prefetchAdminData, prefetchUserData, prefetchHostData } from '../services/prefetchService';

export type UserRole = 'admin' | 'host' | 'staff' | 'user' | null;

interface AuthState {
    token: string | null;
    role: UserRole;
    hostId: string | null;
    onboardingCompleted: boolean;
    user: any | null; // Kept for UI logic, but never overwrites core auth
}

interface AuthContextType extends AuthState {
    isLoading: boolean;
    login: (authData: { token: string; role: string; hostId?: string | null; user?: any; onboardingCompleted?: boolean }) => Promise<void>;
    updateUser: (userData: Partial<any>) => Promise<void>;
    setOnboardingStatus: (status: boolean) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [authState, setAuthState] = useState<AuthState>({
        token: null,
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
                
                setAuthState({ ...data, ...userData });
                
                if (data.token) {
                    apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
                }
            }
        } catch (e) {
            console.error('[Auth] Load failed:', e);
        } finally {
            setIsLoading(false);
        }
    };

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
            prefetchUserData(queryClient);
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

        // ── STEP 1: Wipe ALL previous-user React Query cache BEFORE setting new state ──
        await queryClient.cancelQueries();
        queryClient.clear();
        
        // ⚡ CRITICAL: Also clear AsyncStorage cached data to prevent stale profile
        try {
            await AsyncStorage.removeItem('user_profile_cache');
            await AsyncStorage.removeItem('cached_profile');
        } catch (e) {
            console.error('[Auth] Cache clear failed:', e);
        }

        const payload: AuthState = {
            token: authData.token,
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
            console.error('[Auth] Storage failed:', storageError);
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
                prefetchUserData(queryClient);
            }
        }, 300);
    };

    const setOnboardingStatus = async (status: boolean) => {
        await persistAuth({ onboardingCompleted: status });
    };

    // Merges non-critical user fields (name, image, hostStatus etc.) without touching token or role
    const updateUser = async (userData: Partial<any>) => {
        await persistAuth({
            user: { ...authState.user, ...userData },
        });
    };

    const logout = async () => {
        console.log('[Auth] Starting logout - clearing ALL user data...');
        
        // ── Clear ALL user data from every layer ──────────────────────────────
        await AsyncStorage.removeItem('auth');
        await AsyncStorage.removeItem('auth_user');
        await AsyncStorage.removeItem('user_profile_cache');
        await AsyncStorage.removeItem('cached_profile');
        
        // Clear any other potential cached keys
        try {
            const allKeys = await AsyncStorage.getAllKeys();
            const cacheKeys = allKeys.filter(key => 
                key.includes('cache') || 
                key.includes('profile') || 
                key.includes('user_')
            );
            if (cacheKeys.length > 0) {
                await AsyncStorage.multiRemove(cacheKeys);
                console.log('[Auth] Cleared additional cache keys:', cacheKeys);
            }
        } catch (e) {
            console.error('[Auth] Error clearing additional cache:', e);
        }
        
        delete apiClient.defaults.headers.common['Authorization'];

        // Wipe React Query cache so no previous-user data leaks into next login
        await queryClient.cancelQueries();
        queryClient.clear();

        setAuthState({
            token: null,
            role: null,
            hostId: null,
            user: null,
            onboardingCompleted: false,
        });
        
        console.log('[Auth] Logout complete - all data cleared');
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
