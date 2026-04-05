import { create } from 'zustand';

interface BookingState {
    selectedSeats: Set<string>;
    toggleSeat: (seatId: string, max: number) => void;
    clearSelection: () => void;
}

/**
 * High-performance Zustand store for seat selection.
 * Uses Set for O(1) complexity and atomic updates.
 */
export const useBookingStore = create<BookingState>((set) => ({
    selectedSeats: new Set<string>(),
    toggleSeat: (seatId, max) => set((state) => {
        const next = new Set(state.selectedSeats);
        if (next.has(seatId)) {
            next.delete(seatId);
        } else {
            if (next.size >= max) return state; // Block selection beyond limit
            next.add(seatId);
        }
        return { selectedSeats: next };
    }),
    clearSelection: () => set({ selectedSeats: new Set() })
}));
