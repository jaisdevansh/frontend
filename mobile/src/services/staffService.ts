import apiClient from './apiClient';

export const staffService = {
    /**
     * Get staff profile
     */
    getProfile: async () => {
        const response = await apiClient.get('/api/v1/staff/profile');
        return response.data;
    },

    /**
     * Update staff profile
     */
    updateProfile: async (data: any) => {
        const response = await apiClient.put('/api/v1/staff/profile', data);
        return response.data;
    },

    /**
     * Get pool of confirmed, unassigned orders
     */
    getAvailableOrders: async () => {
        const response = await apiClient.get('/api/v1/staff/orders/available');
        return response.data;
    },

    /**
     * Accept an order with atomic locking
     */
    acceptOrder: async (orderId: string) => {
        const response = await apiClient.post(`/api/v1/staff/orders/${orderId}/accept`);
        return response.data;
    },

    /**
     * Get orders assigned to the logged-in staff member
     */
    getMyOrders: async () => {
        const response = await apiClient.get('/api/v1/staff/orders/my-orders');
        return response.data;
    },

    /**
     * Update order status (preparing, delivering, completed)
     */
    updateOrderStatus: async (orderId: string, status: string) => {
        const response = await apiClient.put(`/api/v1/staff/orders/${orderId}/status`, { status });
        return response.data;
    }
};
