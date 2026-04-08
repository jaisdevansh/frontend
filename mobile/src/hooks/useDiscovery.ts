import { useQuery } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

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
                    console.log('Waking up backend...');
                }
                return [];
            }
        },
        enabled: !!eventId,
        staleTime: 1000 * 30,
        refetchInterval: 1000 * 60,
        retry: 4,
        retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 15000),
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
                    console.log('Waking up backend...');
                }
                return [];
            }
        },
        enabled: !!eventId,
        staleTime: 1000 * 60 * 2,
        gcTime: 1000 * 60 * 15,
        retry: 4,
        retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 15000),
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
                    console.log('Waking up backend...');
                }
                return [];
            }
        },
        enabled: !!eventId,
        staleTime: 1000 * 60 * 10,
        retry: 4,
        retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 15000),
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
