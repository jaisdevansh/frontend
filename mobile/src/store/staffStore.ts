import { create } from 'zustand';

interface StaffMember {
    _id: string;
    name: string;
    role: 'WAITRESS' | 'SECURITY' | 'HOST' | 'MANAGER';
    status: 'ACTIVE' | 'BREAK' | 'OFFLINE';
    lastActivity: string;
    location?: string;
}

interface StaffState {
    staffIds: string[];
    staffById: Record<string, StaffMember>;
    isFetching: boolean;
    setStaff: (staff: StaffMember[]) => void;
    updateStaff: (staffId: string, updates: Partial<StaffMember>) => void;
    setFetching: (val: boolean) => void;
}

/**
 * useStaffStore: High-performance Staff state.
 * Normalized structure for O(1) updates.
 * Optimized for large-scale staff activity monitoring.
 */
export const useStaffStore = create<StaffState>((set) => ({
    staffIds: [],
    staffById: {},
    isFetching: false,

    setStaff: (staff) => {
        const ids = staff.map(s => s._id);
        const byId = staff.reduce((acc, s) => ({ ...acc, [s._id]: s }), {});
        set({ staffIds: ids, staffById: byId });
    },

    updateStaff: (staffId, updates) => set((state) => {
        const current = state.staffById[staffId];
        if (!current) return state;
        return {
            staffById: {
                ...state.staffById,
                [staffId]: { ...current, ...updates }
            }
        };
    }),

    setFetching: (isFetching) => set({ isFetching }),
}));
