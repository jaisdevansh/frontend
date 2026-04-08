import { useQuery, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/userService';
import { Image } from 'expo-image';
import { log } from '../utils/logger';
import { useRef } from 'react';

// ─── Query Key Factory ────────────────────────────────────────────────────────
export const eventKeys = {
    all: ['events'] as const,
    list: () => [...eventKeys.all, 'list'] as const,
    detail: (id: string) => [...eventKeys.all, 'detail', id] as const,
    full: (id: string) => [...eventKeys.all, 'full', id] as const, // ⚡ NEW: Single endpoint
    floorPlan: (id: string) => [...eventKeys.all, 'floorPlan', id] as const,
};

// ⚡⚡⚡ ULTRA-OPTIMIZED: Single API call for all event data ⚡⚡⚡
const fetchEventFull = async (id: string) => {
    try {
        const res = await userService.getEventFull(id);
        if (!res?.success) throw new Error('Event not found');
        return res.data;
    } catch (e: any) {
        const status = e.response?.status;
        if (status === 502 || status === 503) {
            console.log('[EventQuery] Server cold start, retrying...');
        }
        throw e;
    }
};

// ⚡ STAFF+ LEVEL: Single hook with duplicate call prevention
export const useEventFullQuery = (eventId: string) => {
    const isFetching = useRef(false);
    
    return useQuery({
        queryKey: eventKeys.full(eventId),
        queryFn: async () => {
            // Prevent duplicate calls
            if (isFetching.current) {
                throw new Error('Already fetching');
            }
            isFetching.current = true;
            try {
                return await fetchEventFull(eventId);
            } finally {
                isFetching.current = false;
            }
        },
        enabled: !!eventId && eventId !== 'undefined',
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
        refetchOnMount: false, // Prevent duplicate on mount
        refetchOnWindowFocus: false, // Prevent duplicate on focus
    });
};

// ─── Legacy hooks (kept for backward compatibility) ───────────────────────────
const fetchEventBasic = async (id: string) => {
    try {
        const res = await userService.getEventBasic(id);
        if (!res?.success) throw new Error('Event not found');
        return res.data;
    } catch (e: any) {
        throw e;
    }
};

const fetchEventDetails = async (id: string) => {
    try {
        const res = await userService.getEventDetails(id);
        if (!res?.success) throw new Error('Details not found');
        return res.data;
    } catch (e: any) {
        throw e;
    }
};

const fetchEventTickets = async (id: string) => {
    try {
        const res = await userService.getEventTickets(id);
        if (!res?.success) throw new Error('Tickets not found');
        return res.data;
    } catch (e: any) {
        throw e;
    }
};

const fetchFloorPlan = async (id: string) => {
    try {
        const res = await userService.getFloorPlan(id);
        return res?.data ?? null;
    } catch (e: any) {
        return null;
    }
};

export const useEventBasicQuery = (eventId: string) => {
    const queryClient = useQueryClient();
    return useQuery({
        queryKey: [...eventKeys.detail(eventId), 'basic'],
        queryFn: () => fetchEventBasic(eventId),
        enabled: !!eventId,
        staleTime: 5 * 60 * 1000,
        placeholderData: () => queryClient.getQueryData([...eventKeys.detail(eventId), 'basic']),
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 10000),
    });
};

export const useEventDetailsQuery = (eventId: string) => {
    const queryClient = useQueryClient();
    return useQuery({
        queryKey: [...eventKeys.detail(eventId), 'details'],
        queryFn: () => fetchEventDetails(eventId),
        enabled: !!eventId,
        staleTime: 5 * 60 * 1000,
        placeholderData: () => queryClient.getQueryData([...eventKeys.detail(eventId), 'details']),
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 10000),
    });
};

export const useEventTicketsQuery = (eventId: string) => {
    return useQuery({
        queryKey: [...eventKeys.detail(eventId), 'tickets'],
        queryFn: () => fetchEventTickets(eventId),
        enabled: !!eventId,
        staleTime: 60 * 1000,
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 10000),
    });
};

export const useFloorPlanQuery = (eventId: string) =>
    useQuery({
        queryKey: eventKeys.floorPlan(eventId),
        queryFn: () => fetchFloorPlan(eventId),
        enabled: !!eventId,
        staleTime: 5 * 60 * 1000,
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    });

// ─── Prefetch Helper ──────────────────────────────────────────────────────────
export const usePrefetchEvent = () => {
    const queryClient = useQueryClient();

    return async (eventId: string, coverImage?: string) => {
        const tasks: Promise<any>[] = [
            queryClient.prefetchQuery({
                queryKey: eventKeys.full(eventId),
                queryFn: () => fetchEventFull(eventId),
                staleTime: 5 * 60 * 1000,
            }),
        ];

        if (coverImage) {
            tasks.push(Image.prefetch(coverImage, 'memory-disk'));
        }

        await Promise.all(tasks).catch(() => {});
    };
};

import { useCallback } from 'react';

// ─── Cache Invalidation Helper ────────────────────────────────────────────────
export const useInvalidateEvent = () => {
    const queryClient = useQueryClient();
    return useCallback((eventId: string) => {
        queryClient.invalidateQueries({ queryKey: eventKeys.full(eventId) });
        queryClient.invalidateQueries({ queryKey: [...eventKeys.detail(eventId), 'basic'] });
        queryClient.invalidateQueries({ queryKey: [...eventKeys.detail(eventId), 'details'] });
        queryClient.invalidateQueries({ queryKey: [...eventKeys.detail(eventId), 'tickets'] });
    }, [queryClient]);
};
