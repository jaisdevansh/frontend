import apiClient from './apiClient';

export const analyticsService = {
    getSummary: async () => {
        const response = await apiClient.get('/analytics/summary');
        return response.data;
    },
    getRevenueTrend: async () => {
        const response = await apiClient.get('/analytics/revenue-trend');
        return response.data;
    },
    getTopItems: async () => {
        const response = await apiClient.get('/analytics/top-items');
        return response.data;
    },
    getTopUsers: async () => {
        const response = await apiClient.get('/analytics/top-users');
        return response.data;
    }
};
