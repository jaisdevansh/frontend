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

interface GiftRequest {
    requestId: string;
    senderId: string;
    senderName: string;
    senderImage?: string;
    receiverId: string;
    item: {
        _id: string;
        name: string;
        price: number;
        image?: string;
    };
    message: string;
    timestamp: string;
}

interface DiscoveryState {
    nearbyUsers: User[];
    visibility: boolean;
    liveCrowd: number;
    locationName: string;
    loading: boolean;
    giftRequests: Record<string, GiftRequest>; // Pending gift requests by requestId
    onGiftRequest?: (request: GiftRequest) => void;
    setNearbyUsers: (users: User[]) => void;
    setVisibility: (visible: boolean) => void;
    setLiveCrowd: (count: number) => void;
    setLocationName: (name: string) => void;
    setLoading: (loading: boolean) => void;
    addGiftRequest: (request: GiftRequest) => void;
    removeGiftRequest: (requestId: string) => void;
    setGiftRequestCallback: (callback: (request: GiftRequest) => void) => void;
}

/**
 * High-performance store for real-time discovery and radar features.
 * Split from global state to ensure minimal re-renders.
 */
export const useDiscoveryStore = create<DiscoveryState>(((set, get) => ({
    nearbyUsers: [],
    visibility: false,
    liveCrowd: 0,
    locationName: 'Locating...',
    loading: true,
    giftRequests: {},
    onGiftRequest: undefined,
    setNearbyUsers: (users) => set({ nearbyUsers: users }),
    setVisibility: (visible) => set({ visibility: visible }),
    setLiveCrowd: (count) => set({ liveCrowd: count }),
    setLocationName: (name) => set({ locationName: name }),
    setLoading: (loading) => set({ loading }),
    addGiftRequest: (request) => {
        set((state) => ({
            giftRequests: {
                ...state.giftRequests,
                [request.requestId]: request
            }
        }));
        // Trigger callback if set
        const callback = get().onGiftRequest;
        if (callback) {
            callback(request);
        }
    },
    removeGiftRequest: (requestId) => {
        set((state) => {
            const newRequests = { ...state.giftRequests };
            delete newRequests[requestId];
            return { giftRequests: newRequests };
        });
    },
    setGiftRequestCallback: (callback) => set({ onGiftRequest: callback })
})));
