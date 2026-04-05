import { create } from 'zustand';

interface FoodItem {
    _id: string;
    name: string;
    description: string;
    price: number;
    image: string;
    type: string;
}

interface CartItem extends FoodItem {
    quantity: number;
}

interface FoodState {
    menuItems: FoodItem[];
    categories: string[];
    cart: Map<string, CartItem>;
    loading: boolean;
    setMenu: (items: FoodItem[]) => void;
    addToCart: (item: FoodItem) => void;
    removeFromCart: (itemId: string) => void;
    clearCart: () => void;
    setLoading: (loading: boolean) => void;
}

/**
 * Optimized menu and cart management.
 * Uses Map for O(1) cart updates and atomic cart calculations.
 */
export const useFoodStore = create<FoodState>((set) => ({
    menuItems: [],
    categories: [],
    cart: new Map<string, CartItem>(),
    loading: false,
    setMenu: (items) => set({ 
        menuItems: items,
        categories: Array.from(new Set(items.map((i) => i.type))).filter(Boolean) as string[]
    }),
    addToCart: (item) => set((state) => {
        const next = new Map(state.cart);
        const existing = next.get(item._id);
        if (existing) {
            next.set(item._id, { ...existing, quantity: existing.quantity + 1 });
        } else {
            next.set(item._id, { ...item, quantity: 1 });
        }
        return { cart: next };
    }),
    removeFromCart: (itemId) => set((state) => {
        const next = new Map(state.cart);
        const existing = next.get(itemId);
        if (existing && existing.quantity > 1) {
            next.set(itemId, { ...existing, quantity: existing.quantity - 1 });
        } else {
            next.delete(itemId);
        }
        return { cart: next };
    }),
    clearCart: () => set({ cart: new Map() }),
    setLoading: (loading) => set({ loading })
}));
