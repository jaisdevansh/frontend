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
            console.log('[AuthContext] 🔄 Loading auth from AsyncStorage...');
            const raw = await AsyncStorage.getItem('auth');
            const rawUser = await AsyncStorage.getItem('auth_user');
            
            if (raw) {
                const data = JSON.parse(raw);
                console.log('[AuthContext] ✅ Auth data found:', { 
                    hasToken: !!data.token, 
                    role: data.role,
                    hasRefreshToken: !!data.refreshToken 
                });
                
                let userData = { onboardingCompleted: false, user: null };
                if (rawUser) {
                    userData = JSON.parse(rawUser);
                    console.log('[AuthContext] ✅ User data found:', { 
                        onboardingCompleted: userData.onboardingCompleted,
                        hasUser: !!userData.user 
                    });
                }
                
                setAuthState({ ...data, ...userData });
                
                // 🚨 CRITICAL: Set global API header IMMEDIATELY upon reloading auth
                if (data.token) {
                    apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
                    console.log('[AuthContext] ✅ Token attached to API client on app restart');
                }
            } else {
                console.log('[AuthContext] ℹ️ No saved auth found (fresh install or logged out)');
            }
        } catch (e) {
            console.error('[AuthContext] ❌ Local load failed:', e);
        } finally {
            setIsLoading(false);
            console.log('[AuthContext] ✅ Auth loading complete');
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
        console.log('[AuthContext] Login called with:', { 
            hasToken: !!authData.token, 
            role: authData.role,
            hasRefreshToken: !!authData.refreshToken,
            onboardingCompleted: authData.onboardingCompleted 
        });
        
        // Validate role
        if (!authData.role) {
            throw new Error('Invalid authentication role received from server.');
        }

        const normalizedRole = authData.role.toLowerCase() as UserRole;
        if (!['admin', 'host', 'staff', 'user'].includes(normalizedRole as string)) {
            throw new Error('Invalid authentication role received from server.');
        }

        console.log('[AuthContext] Role validated:', normalizedRole);

        // ── STEP 1: Wipe ALL previous-user React Query cache BEFORE setting new state ──
        await queryClient.cancelQueries();
        queryClient.clear();

        const payload: AuthState = {
            token: authData.token,
            role: normalizedRole,
            hostId: authData.hostId || null,
            user: authData.user || null,
            onboardingCompleted: authData.onboardingCompleted ?? true
        };

        console.log('[AuthContext] Payload prepared:', { 
            hasToken: !!payload.token,
            role: payload.role,
            onboardingCompleted: payload.onboardingCompleted 
        });

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

            console.log('[AuthContext] ✅ Data persisted to AsyncStorage');
        } catch (storageError) {
            console.error('[AuthContext] ❌ AsyncStorage failed:', storageError);
            throw new Error('Failed to save session. Please try again.');
        }

        // ── STEP 3: Attach token to API client ──
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${authData.token}`;
        console.log('[AuthContext] ✅ Token attached to API client');

        // ── STEP 4: Update React state ──
        setAuthState(payload);
        console.log('[AuthContext] ✅ Auth state updated in React');

        // ── STEP 5: Prefetch data after navigation settles ──
        setTimeout(() => {
            console.log('[AuthContext] Starting data prefetch for role:', normalizedRole);
            // Force invalidate any cached profile data to ensure fresh fetch
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
        
        console.log('[AuthContext] ✅ Login completed successfully');
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
        // ── Clear ALL user data from every layer ──────────────────────────────
        await AsyncStorage.removeItem('auth');
        await AsyncStorage.removeItem('auth_user');
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
