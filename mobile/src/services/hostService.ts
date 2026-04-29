import apiClient from './apiClient';

export const hostService = {
    // Dashboard
    getDashboardStats: async () => {
        const response = await apiClient.get('/host/dashboard/summary');
        return response.data;
    },

    // Profile
    getProfile: async () => {
        // Add cache-busting timestamp to force fresh data
        const response = await apiClient.get(`/host/profile?_t=${Date.now()}`);
        return response.data;
    },
    updateProfile: async (data: any) => {
        const response = await apiClient.put('/host/profile/update', data);
        return response.data;
    },
    completeProfile: async (data: {
        name: string;
        dob: string;
        location: string;
        profileImage: string | null;
        aadhaarUrl?: string;
        panUrl?: string;
    }) => {
        const response = await apiClient.put('/host/profile/complete', data);
        return response.data;
    },

    // Venue Profile
    getVenueProfile: async () => {
        const response = await apiClient.get('/host/venue-profile');
        return response.data;
    },
    updateVenueProfile: async (data: any) => {
        const response = await apiClient.put('/host/profile/venue', data);
        return response.data;
    },

    // Payments & Payouts
    getPayments: async () => {
        const response = await apiClient.get('/host/payments');
        return response.data;
    },
    getPayouts: async () => {
        const response = await apiClient.get('/host/payouts');
        return response.data;
    },

    // Staff
    getStaff: async () => {
        const response = await apiClient.get('/host/staff');
        return response.data;
    },
    addStaff: async (data: any) => {
        const response = await apiClient.post('/host/staff/add', data);
        return response.data;
    },
    removeStaff: async (staffId: string) => {
        const response = await apiClient.delete(`/host/staff/remove/${staffId}`);
        return response.data;
    },
    updateStaff: async (staffId: string, data: any) => {
        const response = await apiClient.put(`/host/staff/update/${staffId}`, data);
        return response.data;
    },

    // Admin Chat
    getAdminChat: async () => {
        const response = await apiClient.get('/host/admin-chat');
        return response.data;
    },
    sendAdminMessage: async (content: string) => {
        const response = await apiClient.post('/host/admin-chat/send', { content });
        return response.data;
    },

    // Events
    getEvents: async () => {
        const response = await apiClient.get('/host/events');
        return response.data;
    },
    createEvent: async (data: any) => {
        const response = await apiClient.post('/host/events', data);
        return response.data;
    },
    getEvent: async (eventId: string) => {
        const response = await apiClient.get(`/host/events/${eventId}`);
        return response.data;
    },
    updateEvent: async (eventId: string, data: any) => {
        const response = await apiClient.put(`/host/events/${eventId}`, data);
        return response.data;
    },
    deleteEvent: async (eventId: string) => {
        const response = await apiClient.delete(`/host/events/${eventId}`);
        return response.data;
    },
    updateEventStatus: async (eventId: string, status: 'LIVE' | 'PAUSED' | 'DRAFT') => {
        const response = await apiClient.patch(`/host/events/${eventId}/status`, { status });
        return response.data;
    },
    revealLocation: async (eventId: string) => {
        const response = await apiClient.post(`/host/events/${eventId}/reveal-location`);
        return response.data;
    },

    // Bookings
    getBookings: async () => {
        const response = await apiClient.get('/host/bookings');
        return response.data;
    },
    updateBookingStatus: async (bookingId: string, status: string) => {
        const response = await apiClient.put(`/host/bookings/${bookingId}/status`, { status });
        return response.data;
    },

    // Waitlist
    getWaitlist: async () => {
        const response = await apiClient.get('/host/waitlist');
        return response.data;
    },
    processWaitlist: async (waitlistId: string, action: string) => {
        // action might be 'approved' or 'rejected'
        const response = await apiClient.put(`/host/waitlist/${waitlistId}/process`, { action });
        return response.data;
    },

    // Live POS Orders
    getOrders: async () => {
        const response = await apiClient.get('/host/orders');
        return response.data;
    },
    updateOrderStatus: async (orderId: string, status: string) => {
        const response = await apiClient.put(`/host/orders/${orderId}/status`, { status });
        return response.data;
    },

    // Security & Insights
    getIncidents: async () => {
        const response = await apiClient.get('/host/incidents');
        return response.data;
    },
    resolveIncident: async (incidentId: string) => {
        const response = await apiClient.put(`/host/incidents/${incidentId}/resolve`);
        return response.data;
    },
    deleteIncident: async (incidentId: string) => {
        const response = await apiClient.delete(`/host/incidents/${incidentId}`);
        return response.data;
    },
    getReviews: async () => {
        const response = await apiClient.get('/host/reviews');
        return response.data;
    },

    // Coupons
    getCoupons: async () => {
        const response = await apiClient.get('/host/coupons');
        return response.data;
    },
    createCoupon: async (data: any) => {
        const response = await apiClient.post('/host/coupons', data);
        return response.data;
    },
    removeCoupon: async (couponId: string) => {
        const response = await apiClient.delete(`/host/coupons/${couponId}`);
        return response.data;
    },

    // Media
    getMedia: async () => {
        const response = await apiClient.get('/host/media');
        return response.data;
    },
    uploadMedia: async (data: any) => {
        const response = await apiClient.post('/host/media/upload', data);
        return response.data;
    },
    approveMedia: async () => {
        const response = await apiClient.put('/host/media/approve');
        return response.data;
    },
    removeMedia: async (id: string) => {
        const response = await apiClient.delete(`/host/media/remove/${id}`);
        return response.data;
    },
    // Tickets
    getTickets: async () => {
        const response = await apiClient.get('/host/tickets');
        return response.data;
    },
    raiseTicket: async (data: any) => {
        const response = await apiClient.post('/host/tickets', data);
        return response.data;
    },

    // Floors
    getFloors: async (eventId: string) => {
        const response = await apiClient.get(`/api/v1/floors/${eventId}`);
        return response.data;
    },
    addFloor: async (eventId: string, data: any) => {
        const response = await apiClient.post(`/api/v1/floors/${eventId}`, data);
        return response.data;
    },
    updateFloor: async (eventId: string, floorId: string, data: any) => {
        const response = await apiClient.put(`/api/v1/floors/${eventId}/${floorId}`, data);
        return response.data;
    },
    deleteFloor: async (eventId: string, floorId: string) => {
        const response = await apiClient.delete(`/api/v1/floors/${eventId}/${floorId}`);
        return response.data;
    },

    // ─── Gifts (Standalone Gift model) ───────────────────────────────────────
    getGifts: async () => {
        const response = await apiClient.get('/host/gifts');
        return response.data;
    },
    createGift: async (data: {
        name: string; description?: string; price: number;
        category: string; image?: string; inStock?: boolean;
    }) => {
        const response = await apiClient.post('/host/gifts', data);
        return response.data;
    },
    updateGift: async (giftId: string, data: Partial<{
        name: string; description: string; price: number;
        category: string; image: string; inStock: boolean;
    }>) => {
        const response = await apiClient.put(`/host/gifts/${giftId}`, data);
        return response.data;
    },
    removeGift: async (giftId: string) => {
        const response = await apiClient.delete(`/host/gifts/${giftId}`);
        return response.data;
    },

    // ─── Menu Items (Standalone DB - per host) ──────────────────────────────
    getMenuItems: async () => {
        const response = await apiClient.get('/host/menu');
        return response.data;
    },
    addMenuItem: async (data: {
        name: string; price: number; category: string;
        desc?: string; image?: string; inStock?: boolean;
    }) => {
        const response = await apiClient.post('/host/menu', data);
        return response.data;
    },
    updateMenuItem: async (itemId: string, data: any) => {
        const response = await apiClient.put(`/host/menu/${itemId}`, data);
        return response.data;
    },
    removeMenuItem: async (itemId: string) => {
        const response = await apiClient.delete(`/host/menu/${itemId}`);
        return response.data;
    },
};
