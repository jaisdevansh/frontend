import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../services/apiClient';
import { useToast } from '../context/ToastContext';

// --- WALLET HOOK ---
export const useWallet = () => {
    return useQuery({
        queryKey: ['wallet'],
        queryFn: async () => {
            const { data } = await apiClient.get('/api/v1/wallet');
            return data.data; // { userId, points }
        },
        staleTime: 5 * 60 * 1000, // 5 minutes fresh
        gcTime: 10 * 60 * 1000,
    });
};

// --- COUPON STORE INVENTORY HOOK ---
export const useCoupons = () => {
    return useQuery({
        queryKey: ['coupons-store'],
        queryFn: async () => {
            const { data } = await apiClient.get('/api/v1/coupons');
            return data.data; // list of standard/points coupons
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
};

// --- USER ACTIVE COUPONS HOOK ---
export const useUserCoupons = () => {
    return useQuery({
        queryKey: ['user-coupons'],
        queryFn: async () => {
            const { data } = await apiClient.get('/api/v1/coupons/user');
            return data.data; // UserCoupon instances with populated couponId
        },
        staleTime: 2 * 60 * 1000, // Shorter stale time as usage changes faster
        gcTime: 10 * 60 * 1000,
    });
};

// --- BUY COUPON HOOK (Optimistic Update) ---
export const useBuyCoupon = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async (couponId: string) => {
            const { data } = await apiClient.post('/api/v1/coupons/buy', { couponId });
            return data;
        },
        onMutate: async (couponId) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['wallet'] });

            // Snapshot previous state
            const previousWallet = queryClient.getQueryData<any>(['wallet']);

            // We cannot optimistically deduct accurately if we don't safely know the exact cost
            // from the cache because Mutation only takes 'couponId'.
            // For safety, we will just await the resolution to invalidate.
            // (Strict optimistic would require looking up the coupon cost from 'coupons-store').

            return { previousWallet };
        },
        onSuccess: () => {
            showToast('Coupon Redeemed Successfully! 🎉', 'success');
            // Background invalidate to refresh truths
            queryClient.invalidateQueries({ queryKey: ['wallet'] });
            queryClient.invalidateQueries({ queryKey: ['user-coupons'] });
        },
        onError: (err: any, _, context) => {
            showToast(err.response?.data?.message || 'Transaction Failed', 'error');
            if (context?.previousWallet) {
                queryClient.setQueryData(['wallet'], context.previousWallet);
            }
        }
    });
};

// --- APPLY COUPON HOOK ---
export const useApplyCoupon = () => {
    const { showToast } = useToast();
    
    return useMutation({
        mutationFn: async (payload: { userCouponId: string, orderType: string, subtotal: number }) => {
            const { data } = await apiClient.post('/api/v1/coupons/apply', payload);
            return data.data; // { discount, finalAmount }
        },
        onError: (err: any) => {
            showToast(err.response?.data?.message || 'Invalid Coupon', 'error');
        }
    });
};
