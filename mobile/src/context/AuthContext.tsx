import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import apiClient from '../services/apiClient';
import { useQueryClient } from '@tanstack/react-query';
import { prefetchAdminData, prefetchUserData } from '../services/prefetchService';

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
                if (rawUser) {
                    userData = JSON.parse(rawUser);
                }
                
                setAuthState({ ...data, ...userData });
                
                // 🚨 CRITICAL: Set global API header IMMEDIATELY upon reloading auth.
                // This guarantees every subsequent query has the persistent session token.
                if (data.token) {
                    apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
                }
            }
        } catch (e) {
            console.error('[Auth] Local load failed:', e);
        } finally {
            setIsLoading(false); // Only render app AFTER load is complete
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

    const login = async (authData: { token: string; role: string; hostId?: string | null; user?: any; onboardingCompleted?: boolean }) => {
        // Remove default role fallbacks
        if (!authData.role) {
            throw new Error('Invalid authentication role received from server.');
        }

        const normalizedRole = authData.role.toLowerCase() as UserRole;
        if (!['admin', 'host', 'staff', 'user'].includes(normalizedRole as string)) {
             throw new Error('Invalid authentication role received from server.');
        }

        const payload: AuthState = {
            token: authData.token,
            role: normalizedRole,
            hostId: authData.hostId || null,
            user: authData.user || null,
            onboardingCompleted: authData.onboardingCompleted ?? true
        };

        // Strict requirement: save exact object for 'auth'
        await AsyncStorage.setItem('auth', JSON.stringify({
            token: payload.token,
            role: payload.role,
            hostId: payload.hostId
        }));
        
        await AsyncStorage.setItem('auth_user', JSON.stringify({
            onboardingCompleted: payload.onboardingCompleted,
            user: payload.user
        }));
        
        setAuthState(payload);

        // Attach to global axios instance
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${authData.token}`;

        // 🔥 Fire-and-forget prefetch for all role-specific data
        setTimeout(() => {
            if (normalizedRole === 'admin') {
                prefetchAdminData(queryClient);
            } else {
                prefetchUserData(queryClient);
            }
        }, 500); // small delay so navigation completes first
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
        await AsyncStorage.removeItem('auth');
        await AsyncStorage.removeItem('auth_user');
        delete apiClient.defaults.headers.common['Authorization'];
        setAuthState({
            token: null,
            role: null,
            hostId: null,
            user: null,
            onboardingCompleted: false
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
