import { create } from 'zustand';

interface ScanResult {
    _id: string;
    ticketId: string;
    userName: string;
    status: 'VALID' | 'INVALID' | 'USED';
    timestamp: number;
    guestCount: number;
    zone: string;
}

interface SecurityState {
    lastScan: ScanResult | null;
    scanIds: string[];
    scansById: Record<string, ScanResult>;
    validationCache: Record<string, 'VALID' | 'INVALID' | 'USED'>;
    isValidating: boolean;
    setLastScan: (scan: ScanResult) => void;
    cacheTicketStatus: (ticketId: string, status: 'VALID' | 'INVALID' | 'USED') => void;
    clearHistory: () => void;
}

/**
 * useSecurityStore: High-performance Security state.
 * Implements local validation cache for sub-10ms UX feedback.
 * Uses normalized state for scanning history.
 */
export const useSecurityStore = create<SecurityState>((set) => ({
    lastScan: null,
    scanIds: [],
    scansById: {},
    validationCache: {},
    isValidating: false,

    setLastScan: (scan) => set((state) => ({
        lastScan: scan,
        scanIds: [scan._id, ...state.scanIds].slice(0, 100),
        scansById: { ...state.scansById, [scan._id]: scan }
    })),

    cacheTicketStatus: (ticketId, status) => set((state) => ({
        validationCache: { ...state.validationCache, [ticketId]: status }
    })),

    clearHistory: () => set({ scanIds: [], scansById: {}, lastScan: null }),
}));
