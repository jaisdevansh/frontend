import { create } from 'zustand';

interface User {
    id: string;
    _id: string;
    name: string;
    image: string;
    distance: number;
    tags: string[];
    gender: string;
}

interface DiscoveryState {
    nearbyUsers: User[];
    visibility: boolean;
    liveCrowd: number;
    locationName: string;
    loading: boolean;
    setNearbyUsers: (users: User[]) => void;
    setVisibility: (visible: boolean) => void;
    setLiveCrowd: (count: number) => void;
    setLocationName: (name: string) => void;
    setLoading: (loading: boolean) => void;
}

/**
 * High-performance store for real-time discovery and radar features.
 * Split from global state to ensure minimal re-renders.
 */
export const useDiscoveryStore = create<DiscoveryState>(((set) => ({
    nearbyUsers: [],
    visibility: false,
    liveCrowd: 0,
    locationName: 'Locating...',
    loading: true,
    setNearbyUsers: (users) => set({ nearbyUsers: users }),
    setVisibility: (visible) => set({ visibility: visible }),
    setLiveCrowd: (count) => set({ liveCrowd: count }),
    setLocationName: (name) => set({ locationName: name }),
    setLoading: (loading) => set({ loading })
})));
