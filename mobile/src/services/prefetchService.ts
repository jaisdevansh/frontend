/**
 * ⚡ PREFETCH SERVICE — Rocket-speed data warming
 * Fires silently after login to pre-load ALL critical data into React Query cache.
 * Result: Every screen opens INSTANTLY with zero loading spinners.
 */
import { QueryClient } from '@tanstack/react-query';
import { userService } from './userService';
import { hostService } from './hostService';
import adminService from './adminService';

const STALE = 5 * 60 * 1000; // 5 min

// ─── Pre-warm USER screens ────────────────────────────────────────────────────
export const prefetchUserData = (qc: QueryClient, userId: string | null) => {
    if (!userId) return;
    // Fire all in parallel — no awaiting, pure background
    qc.prefetchQuery({ queryKey: ['user-profile', userId], queryFn: userService.getProfile, staleTime: 0 });
    qc.prefetchQuery({ queryKey: ['events-list'], queryFn: userService.getEvents, staleTime: STALE });
    qc.prefetchQuery({ queryKey: ['venues-list'], queryFn: userService.getVenues, staleTime: STALE });
    qc.prefetchQuery({ queryKey: ['my-bookings', userId], queryFn: userService.getMyBookings, staleTime: STALE });
    qc.prefetchQuery({ queryKey: ['active-event', userId], queryFn: userService.getActiveEvent, staleTime: STALE });
};

// ─── Pre-warm HOST screens ────────────────────────────────────────────────────
export const prefetchHostData = (qc: QueryClient) => {
    // Pre-load all host dashboard data so every screen opens instantly
    qc.prefetchQuery({
        queryKey: ['dashboardStats'],
        queryFn: async () => {
            const res = await hostService.getDashboardStats();
            if (res?.data) return res.data;
            return res || { totalBookings: 0, totalEvents: 0 };
        },
        staleTime: STALE,
    });
    qc.prefetchQuery({
        queryKey: ['events'],
        queryFn: async () => {
            const res = await hostService.getEvents();
            return res?.events || res?.data || [];
        },
        staleTime: STALE,
    });
    qc.prefetchQuery({
        queryKey: ['host-bookings'],
        queryFn: async () => {
            const res = await hostService.getBookings();
            return res?.data || res?.bookings || [];
        },
        staleTime: STALE,
    });
    qc.prefetchQuery({
        queryKey: ['venueProfile'],
        queryFn: async () => {
            const res = await hostService.getVenueProfile();
            return res?.data || null;
        },
        staleTime: STALE,
    });
};

// ─── Pre-warm ADMIN screens ───────────────────────────────────────────────────
export const prefetchAdminData = (qc: QueryClient) => {
    qc.prefetchQuery({ queryKey: ['admin-stats'], queryFn: adminService.getStats, staleTime: STALE });
    qc.prefetchQuery({ queryKey: ['admin-hosts', 1], queryFn: () => adminService.getHosts(1, 25), staleTime: STALE });
    qc.prefetchQuery({ queryKey: ['admin-users', 1], queryFn: () => adminService.getUsers(1, 25), staleTime: STALE });
    qc.prefetchQuery({ queryKey: ['admin-bookings', 1], queryFn: () => adminService.getBookings(1, 30), staleTime: STALE });
};

