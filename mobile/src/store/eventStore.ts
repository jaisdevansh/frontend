import { create } from 'zustand';

interface EventStats {
    totalGuests: number;
    liveRevenue: number;
    occupancy: number;
    capacity: number;
}

interface EventState {
    eventId: string | null;
    title: string;
    isActive: boolean;
    stats: EventStats;
    lastAction: string;
    setEvent: (id: string, title: string, capacity: number) => void;
    toggleActive: () => void;
    updateStats: (guests: number, revenue: number) => void;
}

/**
 * useEventStore: Hyper-optimized Event Control state.
 * Separates static data from high-frequency stats to minimize re-renders.
 */
export const useEventStore = create<EventState>((set) => ({
    eventId: null,
    title: '',
    isActive: false,
    stats: { totalGuests: 0, liveRevenue: 0, occupancy: 0, capacity: 0 },
    lastAction: '',

    setEvent: (id, title, capacity) => set({ 
        eventId: id, 
        title, 
        stats: { totalGuests: 0, liveRevenue: 0, occupancy: 0, capacity } 
    }),

    toggleActive: () => set((state) => ({
        isActive: !state.isActive,
        lastAction: !state.isActive ? 'STARTED' : 'STOPPED'
    })),

    updateStats: (guests, revenue) => set((state) => ({
        stats: {
            ...state.stats,
            totalGuests: guests,
            liveRevenue: revenue,
            occupancy: Math.round((guests / state.stats.capacity) * 100)
        }
    })),
}));
