import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { waiterService } from '../services/waiterService';
import { getSocket } from '../lib/socketClient';

export const waiterKeys = {
    available: ['waiter', 'available'] as const,
    my: ['waiter', 'my'] as const,
    completed: ['waiter', 'completed'] as const,
};

export const useAvailableOrders = () =>
    useQuery({
        queryKey: waiterKeys.available,
        queryFn: async () => {
            const res = await waiterService.getAvailableOrders();
            return (res.data as any[]) ?? [];
        },
        staleTime: 20_000,
        refetchOnWindowFocus: false,
    });

export const useMyOrders = () =>
    useQuery({
        queryKey: waiterKeys.my,
        queryFn: async () => {
            const res = await waiterService.getMyOrders();
            return (res.data as any[]) ?? [];
        },
        staleTime: 20_000,
        refetchOnWindowFocus: false,
    });

export const useCompletedOrders = () =>
    useQuery({
        queryKey: waiterKeys.completed,
        queryFn: async () => {
            const res = await waiterService.getCompletedOrders();
            return (res.data as any[]) ?? [];
        },
        staleTime: 60_000,
    });

export const useAcceptOrder = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (orderId: string) => waiterService.acceptOrder(orderId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: waiterKeys.available });
            qc.invalidateQueries({ queryKey: waiterKeys.my });
        },
    });
};

export const useRejectOrder = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ orderId, reason }: { orderId: string; reason?: string }) =>
            waiterService.rejectOrder(orderId, reason),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: waiterKeys.available });
        },
    });
};

export const useUpdateOrderStatus = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
            waiterService.updateOrderStatus(orderId, status),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: waiterKeys.my });
            qc.invalidateQueries({ queryKey: waiterKeys.completed });
        },
    });
};

/**
 * Real-time waiter socket:
 * Listens for new_order and order_updated from server.
 * On receive → invalidates React Query cache so UI auto-refreshes.
 */
export const useWaiterSocket = () => {
    const qc = useQueryClient();

    useEffect(() => {
        let socketRef: any;

        (async () => {
            try {
                socketRef = await getSocket();
                socketRef.emit('join_room', 'waiter_room');

                // New order arrived → refresh available list
                socketRef.on('new_order', () => {
                    qc.invalidateQueries({ queryKey: waiterKeys.available });
                });

                // Any order status change → refresh all lists
                socketRef.on('order_updated', () => {
                    qc.invalidateQueries({ queryKey: waiterKeys.available });
                    qc.invalidateQueries({ queryKey: waiterKeys.my });
                    qc.invalidateQueries({ queryKey: waiterKeys.completed });
                });
            } catch (err) {
                console.warn('[useWaiterSocket] Failed to connect:', err);
            }
        })();

        return () => {
            if (socketRef) {
                socketRef.off('new_order');
                socketRef.off('order_updated');
            }
        };
    }, [qc]);
};
