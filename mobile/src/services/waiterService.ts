import apiClient from './apiClient';

export const waiterService = {
    getAvailableOrders: async () => {
        const response = await apiClient.get('/api/v1/waiter/orders/available');
        return response.data;
    },

    acceptOrder: async (orderId: string) => {
        const response = await apiClient.put(`/api/v1/waiter/orders/${orderId}/accept`);
        return response.data;
    },

    rejectOrder: async (orderId: string, reason?: string) => {
        const response = await apiClient.put(`/api/v1/waiter/orders/${orderId}/reject`, { reason });
        return response.data;
    },

    getMyOrders: async () => {
        const response = await apiClient.get('/api/v1/waiter/orders/my');
        return response.data;
    },

    getCompletedOrders: async () => {
        const response = await apiClient.get('/api/v1/waiter/orders/completed');
        return response.data;
    },

    updateOrderStatus: async (orderId: string, status: string) => {
        const response = await apiClient.put(`/api/v1/waiter/orders/${orderId}/status`, { status });
        return response.data;
    }
};
