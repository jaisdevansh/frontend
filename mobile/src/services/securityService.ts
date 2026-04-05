import apiClient from './apiClient';

export const securityService = {
    // Report issue (User-side)
    reportIssue: async (data: { eventId: string, type: string, message: string, hostId?: string, tableId?: string, zone?: string }) => {
        const response = await apiClient.post('/api/v1/security/reports', data);
        return response.data;
    },

    // Get all open issues
    getOpenIssues: async () => {
        const response = await apiClient.get('/api/v1/security/issues/open');
        return response.data;
    },

    // Respond to an issue
    respondToIssue: async (issueId: string) => {
        const response = await apiClient.put(`/api/v1/security/issues/${issueId}/respond`);
        return response.data;
    },

    // Resolve an issue
    resolveIssue: async (issueId: string) => {
        const response = await apiClient.put(`/api/v1/security/issues/${issueId}/resolve`);
        return response.data;
    },

    // Get current guard's in-progress issues
    getMyIssues: async () => {
        const response = await apiClient.get('/api/v1/security/issues/my');
        return response.data;
    },

    // Get resolved history
    getResolvedHistory: async () => {
        const response = await apiClient.get('/api/v1/security/issues/resolved');
        return response.data;
    },

    // Step 1: Verify Ticket (Gate Control)
    verifyTicket: async (qrPayload: string) => {
        const response = await apiClient.post('/api/v1/security/verify-ticket', { qrPayload });
        return response.data;
    },

    // Step 2: Confirm Entry
    confirmEntry: async (bookingId: string) => {
        const response = await apiClient.post('/api/v1/security/confirm-entry', { bookingId });
        return response.data;
    }
};
