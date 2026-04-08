import { useQuery, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/userService';
import { Image } from 'expo-image';
import { log } from '../utils/logger';

// ─── Query Key Factory ────────────────────────────────────────────────────────
export const eventKeys = {
    all: ['events'] as const,
    list: () => [...eventKeys.all, 'list'] as const,
    detail: (id: string) => [...eventKeys.all, 'detail', id] as const,
    floorPlan: (id: string) => [...eventKeys.all, 'floorPlan', id] as const,
};

// ─── Fetch Functions ──────────────────────────────────────────────────────────
const fetchEventBasic = async (id: string) => {
    log(`STEP 5: API CALL START (Basic): ${id}`);
    try {
        const res = await userService.getEventBasic(id);
        log(`STEP 6: API SUCCESS (Basic) SIZE: ${JSON.stringify(res.data || {}).length}`);
        if (!res?.success) throw new Error('Event not found');
        return res.data;
    } catch (e: any) {
        log("STEP 6: API ERROR (Basic)", e.message);
        // Don't throw on 502/503 - let React Query retry handle it
        const status = e.response?.status;
        if (status === 502 || status === 503) {
            console.log('[EventQuery] Server cold start, React Query will retry...');
        }
        throw e;
    }
};

const fetchEventDetails = async (id: string) => {
    try {
        const res = await userService.getEventDetails(id);
        if (!res?.success) throw new Error('Details not found');
        return res.data;
    } catch (e: any) {
        const status = e.response?.status;
        if (status === 502 || status === 503) {
            console.log('[EventQuery] Server cold start on details, React Query will retry...');
        }
        throw e;
    }
};

const fetchEventTickets = async (id: string) => {
    console.time("[API] Event_Tickets");
    try {
        const res = await userService.getEventTickets(id);
        console.timeEnd("[API] Event_Tickets");
        console.log("[API] TICKETS SIZE:", JSON.stringify(res.data || {}).length);
        if (!res?.success) throw new Error('Tickets not found');
        return res.data;
    } catch (e: any) {
        console.timeEnd("[API] Event_Tickets");
        const status = e.response?.status;
        if (status === 502 || status === 503) {
            console.log('[EventQuery] Server cold start on tickets, React Query will retry...');
        }
        throw e;
    }
};

const fetchFloorPlan = async (id: string) => {
    try {
        const res = await userService.getFloorPlan(id);
        return res?.data ?? null;
    } catch (e: any) {
        const status = e.response?.status;
        if (status === 502 || status === 503) {
            console.log('[EventQuery] Server cold start on floor plan, React Query will retry...');
        }
        return null; // Floor plan is optional, don't throw
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
        retry: 4, // Increased from 3 to 4 for longer cold starts
        retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 15000), // Longer delays: 2s, 4s, 8s, 15s
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
        retry: 4,
        retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 15000),
    });
};

export const useEventTicketsQuery = (eventId: string) => {
    return useQuery({
        queryKey: [...eventKeys.detail(eventId), 'tickets'],
        queryFn: () => fetchEventTickets(eventId),
        enabled: !!eventId,
        staleTime: 60 * 1000, // shorter stale time for live inventory tracking
        retry: 4,
        retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 15000),
    });
};

// ─── Floor Plan Hook ──────────────────────────────────────────────────────────
export const useFloorPlanQuery = (eventId: string) =>
    useQuery({
        queryKey: eventKeys.floorPlan(eventId),
        queryFn: () => fetchFloorPlan(eventId),
        enabled: !!eventId,
        staleTime: 5 * 60 * 1000,
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    });

// ─── Prefetch Helper — call on hover/tap BEFORE navigation ───────────────────
export const usePrefetchEvent = () => {
    const queryClient = useQueryClient();

    return async (eventId: string, coverImage?: string) => {
        // Parallel: prefetch event data + preload cover image
        const tasks: Promise<any>[] = [
            queryClient.prefetchQuery({
                queryKey: [...eventKeys.detail(eventId), 'basic'],
                queryFn: () => fetchEventBasic(eventId),
                staleTime: 5 * 60 * 1000,
            }),
            queryClient.prefetchQuery({
                queryKey: [...eventKeys.detail(eventId), 'details'],
                queryFn: () => fetchEventDetails(eventId),
                staleTime: 5 * 60 * 1000,
            }),
            // Silently prefetch floor plan so booking screen is instant too
            queryClient.prefetchQuery({
                queryKey: eventKeys.floorPlan(eventId),
                queryFn: () => fetchFloorPlan(eventId),
                staleTime: 5 * 60 * 1000,
            }),
        ];

        // Preload cover image into expo-image's memory+disk cache
        if (coverImage) {
            tasks.push(Image.prefetch(coverImage, 'memory-disk'));
        }

        await Promise.all(tasks).catch(() => {}); // Never block navigation
    };
};

import { useCallback } from 'react';

// ─── Cache Invalidation Helper ────────────────────────────────────────────────
export const useInvalidateEvent = () => {
    const queryClient = useQueryClient();
    return useCallback((eventId: string) => {
        queryClient.invalidateQueries({ queryKey: [...eventKeys.detail(eventId), 'basic'] });
        queryClient.invalidateQueries({ queryKey: [...eventKeys.detail(eventId), 'details'] });
        queryClient.invalidateQueries({ queryKey: [...eventKeys.detail(eventId), 'tickets'] });
    }, [queryClient]);
};
