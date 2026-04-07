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
        throw e;
    }
};

const fetchEventDetails = async (id: string) => {
    const res = await userService.getEventDetails(id);
    if (!res?.success) throw new Error('Details not found');
    return res.data;
};

const fetchEventTickets = async (id: string) => {
    console.time("[API] Event_Tickets");
    const res = await userService.getEventTickets(id);
    console.timeEnd("[API] Event_Tickets");
    console.log("[API] TICKETS SIZE:", JSON.stringify(res.data || {}).length);
    if (!res?.success) throw new Error('Tickets not found');
    return res.data;
};

const fetchFloorPlan = async (id: string) => {
    const res = await userService.getFloorPlan(id);
    return res?.data ?? null;
};

export const useEventBasicQuery = (eventId: string) => {
    const queryClient = useQueryClient();
    return useQuery({
        queryKey: [...eventKeys.detail(eventId), 'basic'],
        queryFn: () => fetchEventBasic(eventId),
        enabled: !!eventId,
        staleTime: 5 * 60 * 1000,
        placeholderData: () => queryClient.getQueryData([...eventKeys.detail(eventId), 'basic']),
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
    });
};

export const useEventTicketsQuery = (eventId: string) => {
    return useQuery({
        queryKey: [...eventKeys.detail(eventId), 'tickets'],
        queryFn: () => fetchEventTickets(eventId),
        enabled: !!eventId,
        staleTime: 60 * 1000, // shorter stale time for live inventory tracking
    });
};

// ─── Floor Plan Hook ──────────────────────────────────────────────────────────
export const useFloorPlanQuery = (eventId: string) =>
    useQuery({
        queryKey: eventKeys.floorPlan(eventId),
        queryFn: () => fetchFloorPlan(eventId),
        enabled: !!eventId,
        staleTime: 5 * 60 * 1000,
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

// ─── Cache Invalidation Helper ────────────────────────────────────────────────
export const useInvalidateEvent = () => {
    const queryClient = useQueryClient();
    return (eventId: string) => {
        queryClient.invalidateQueries({ queryKey: [...eventKeys.detail(eventId), 'basic'] });
        queryClient.invalidateQueries({ queryKey: [...eventKeys.detail(eventId), 'details'] });
        queryClient.invalidateQueries({ queryKey: [...eventKeys.detail(eventId), 'tickets'] });
    }
};
