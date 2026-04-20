import { QueryClient } from '@tanstack/react-query';
import apiClient from './apiClient';

/**
 * Prefetch Service - Instagram/Zepto Style Instant Loading
 * Prefetches data in background so it's ready when user needs it
 */

export const prefetchUserData = async (queryClient: QueryClient, userId?: string) => {
    if (!userId) return;
    
    // Prefetch user profile and common data
    try {
        await queryClient.prefetchQuery({
            queryKey: ['user', 'profile'],
            queryFn: async () => {
                const res = await apiClient.get('/user/profile');
                return res.data?.data || null;
            },
            staleTime: 1000 * 60 * 5,
        });
    } catch (e) {
        false && console.log('[Prefetch] User data prefetch failed');
    }
};

export const prefetchHostData = async (queryClient: QueryClient, hostId?: string) => {
    // Prefetch host dashboard data
    try {
        await queryClient.prefetchQuery({
            queryKey: ['host', 'dashboard'],
            queryFn: async () => {
                const res = await apiClient.get('/host/dashboard/summary');
                return res.data?.data || null;
            },
            staleTime: 1000 * 60 * 2,
        });
    } catch (e) {
        false && console.log('[Prefetch] Host data prefetch failed');
    }
};

export const prefetchAdminData = async (queryClient: QueryClient) => {
    // Prefetch admin stats (uses /admin/stats — the correct backend endpoint)
    try {
        await queryClient.prefetchQuery({
            queryKey: ['admin-stats'],
            queryFn: async () => {
                const res = await apiClient.get('/admin/stats');
                return res.data?.data || null;
            },
            staleTime: 1000 * 60 * 2,
        });
    } catch (e) {
        false && console.log('[Prefetch] Admin data prefetch failed');
    }
};

export const prefetchMenuAndGifts = async (queryClient: QueryClient, hostId: string) => {
    if (!hostId) return;

    // Prefetch menu and gifts in parallel
    try {
        await Promise.all([
            queryClient.prefetchQuery({
                queryKey: ['host', 'menu', hostId],
                queryFn: async () => {
                    const res = await apiClient.get(`/user/host/${hostId}/menu`);
                    return res.data?.data || [];
                },
                staleTime: 1000 * 60 * 5,
            }),
            queryClient.prefetchQuery({
                queryKey: ['host', 'gifts', hostId],
                queryFn: async () => {
                    const res = await apiClient.get(`/user/host/${hostId}/gifts`);
                    return res.data?.data || [];
                },
                staleTime: 1000 * 60 * 5,
            }),
        ]);
    } catch (e) {
        false && console.log('[Prefetch] Menu/Gifts prefetch failed');
    }
};

export const prefetchEventData = async (queryClient: QueryClient, eventId: string) => {
    if (!eventId) return;

    try {
        await queryClient.prefetchQuery({
            queryKey: ['event', 'menu', eventId],
            queryFn: async () => {
                const res = await apiClient.get(`/user/events/${eventId}/menu`);
                return res.data?.data || [];
            },
            staleTime: 1000 * 60 * 5,
        });
    } catch (e) {
        false && console.log('[Prefetch] Event data prefetch failed');
    }
};
