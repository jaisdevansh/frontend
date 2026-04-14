import { useQuery } from '@tanstack/react-query';
import apiClient from '../services/apiClient';
import { useAuth } from '../context/AuthContext';

export interface GiftItem {
    _id: string;
    id?: string;
    name: string;
    image?: string;
    price: number;
    description?: string;
    desc?: string;
    category?: string;
    tags?: string[];
}

export interface NearbyUser {
    id: string;
    _id: string;
    name: string;
    image: string;
    profileImage: string;
    distance: number;
    tags: string[];
    gender: string;
    lat: number;
    lng: number;
}

export const useDiscovery = (eventId?: string | null) => {
    const { token } = useAuth();
    
    const nearby = useQuery({
        queryKey: ['discovery', 'nearby', eventId],
        queryFn: async () => {
            if (!eventId) return [];
            try {
                const res = await apiClient.get(`/discovery/nearby/${eventId}`);
                return res.data.success && res.data.data ? res.data.data : [];
            } catch (e: any) {
                const status = e.response?.status;
                if (status === 502 || status === 503) {
                    console.warn('⚠️ [useDiscovery] Backend cold start, retrying...');
                }
                return [];
            }
        },
        enabled: !!eventId && !!token,
        staleTime: Infinity, // Never consider data stale - only refetch manually
        gcTime: 1000 * 60 * 30, // 30 minutes cache
        refetchInterval: false, // Disable auto refetch
        refetchOnWindowFocus: false, // Disable refetch on focus
        refetchOnMount: false, // Only fetch once on mount
        refetchOnReconnect: false, // Don't refetch on socket reconnect
        retry: 2,
        retryDelay: 2000,
    });

    const gifts = useQuery({
        queryKey: ['discovery', 'gifts', eventId],
        queryFn: async () => {
            if (!eventId) return [];
            try {
                const res = await apiClient.get(`/discovery/gifts/${eventId}`);
                return res.data.success && res.data.data ? res.data.data : [];
            } catch (e: any) {
                const status = e.response?.status;
                if (status === 502 || status === 503) {
                    console.warn('⚠️ [useDiscovery] Backend cold start, retrying...');
                }
                return [];
            }
        },
        enabled: !!eventId && !!token,
        staleTime: 1000 * 60 * 10, // 10 minutes
        gcTime: 1000 * 60 * 20,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        retry: 2,
        retryDelay: 2000,
    });

    const menu = useQuery({
        queryKey: ['discovery', 'menu', eventId],
        queryFn: async () => {
            if (!eventId) return [];
            try {
                const res = await apiClient.get(`/discovery/menu/${eventId}`);
                return res.data.success ? res.data.data : [];
            } catch (e: any) {
                const status = e.response?.status;
                if (status === 502 || status === 503) {
                    console.warn('⚠️ [useDiscovery] Backend cold start, retrying...');
                }
                return [];
            }
        },
        enabled: !!eventId && !!token,
        staleTime: 1000 * 60 * 15, // 15 minutes
        gcTime: 1000 * 60 * 30,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        retry: 2,
        retryDelay: 2000,
    });

    return {
        nearby,
        gifts,
        menu,
        isLoading: nearby.isLoading || gifts.isLoading || menu.isLoading,
        refetchAll: () => {
            nearby.refetch();
            gifts.refetch();
            menu.refetch();
        }
    };
};
