import { create } from 'zustand';

interface POSItem {
    _id: string;
    name: string;
    price: number;
    image?: string;
    type: string;
}

interface CartItem {
    _id: string;
    qty: number;
}

interface POSState {
    products: POSItem[];
    cartIds: string[];
    cartById: Record<string, number>; // itemId -> qty
    isProcessing: boolean;
    setProducts: (items: POSItem[]) => void;
    addToCart: (itemId: string) => void;
    removeFromCart: (itemId: string) => void;
    updateQty: (itemId: string, delta: number) => void;
    clearCart: () => void;
}

/**
 * usePOSStore: Hyper-optimized POS state.
 * Uses normalized state (cartIds + cartById) for O(1) access and minimal re-renders.
 * Avoids nested objects in the core state for better performance.
 */
export const usePOSStore = create<POSState>((set) => ({
    products: [],
    cartIds: [],
    cartById: {},
    isProcessing: false,

    setProducts: (items) => set({ products: items }),

    addToCart: (itemId) => set((state) => {
        const currentQty = state.cartById[itemId] || 0;
        if (currentQty > 0) {
            return {
                cartById: { ...state.cartById, [itemId]: currentQty + 1 }
            };
        }
        return {
            cartIds: [...state.cartIds, itemId],
            cartById: { ...state.cartById, [itemId]: 1 }
        };
    }),

    removeFromCart: (itemId) => set((state) => {
        const { [itemId]: _, ...remainingById } = state.cartById;
        return {
            cartIds: state.cartIds.filter(id => id !== itemId),
            cartById: remainingById
        };
    }),

    updateQty: (itemId, delta) => set((state) => {
        const currentQty = state.cartById[itemId] || 0;
        const nextQty = currentQty + delta;
        
        if (nextQty <= 0) {
            const { [itemId]: _, ...remainingById } = state.cartById;
            return {
                cartIds: state.cartIds.filter(id => id !== itemId),
                cartById: remainingById
            };
        }

        return {
            cartById: { ...state.cartById, [itemId]: nextQty }
        };
    }),

    clearCart: () => set({ cartIds: [], cartById: {}, isProcessing: false }),
}));
