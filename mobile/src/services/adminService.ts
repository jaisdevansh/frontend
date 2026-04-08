import apiClient from './apiClient';

export interface AdminUser {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    profileImage?: string;
    isActive: boolean;
    role: string;
    loyaltyPoints?: number;
    createdAt: string;
}

export interface AdminBooking {
    _id: string;
    userId: {
        _id: string;
        name: string;
        email?: string;
        profileImage?: string;
    };
    hostId: {
        _id: string;
        name?: string;
        profileImage?: string;
    };
    eventId: {
        _id: string;
        title: string;
    };
    pricePaid: number;
    guests: number;
    status: string;
    createdAt: string;
}

export interface AdminStaff {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    staffType?: string;
    role?: string;
    isActive: boolean;
    createdAt: string;
}


export interface AdminSummary {
    totalRevenue: number;
    ticketRevenue: number;
    orderRevenue: number;
    totalOrders: number;
    deliveredOrders: number;
    rejectedOrders: number;
    activeStaff: number;
    liveOrders: number;
}

export interface AdminStats {
    users: number;
    hosts: number;
    activeHosts: number;
    pendingHosts: number;
    bookings: number;
    totalRevenue: number;
    updatedAt: string;
}


export interface PendingHost {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    kyc?: {
        isVerified: boolean;
        documents: Array<{
            type: string;
            url: string;
            status: string;
        }>;
    };
    profileImage?: string;
    hostStatus: string;
    createdAt: string;
}

export interface RevenueTrend {
    date: string;
    revenue: number;
}

export interface TopItem {
    name: string;
    totalSold: number;
    revenue: number;
}

export interface TopUser {
    id: string;
    name: string;
    profileImage: string;
    totalSpent: number;
}


export type AdminHost = PendingHost;

const adminService = {
    // Analytics
    getSummary: async (): Promise<AdminSummary> => {
        const response = await apiClient.get('/analytics/summary');
        return response.data.data;
    },

    getRevenueTrend: async (): Promise<RevenueTrend[]> => {
        const response = await apiClient.get('/analytics/revenue-trend');
        return response.data.data;
    },

    getBookingTrend: async (): Promise<RevenueTrend[]> => {
        const response = await apiClient.get('/analytics/booking-trend');
        return response.data.data;
    },

    getTopItems: async (): Promise<TopItem[]> => {
        const response = await apiClient.get('/analytics/top-items');
        return response.data.data;
    },

    getTopUsers: async (): Promise<TopUser[]> => {
        const response = await apiClient.get('/analytics/top-users');
        return response.data.data;
    },

    // Hosts
    getHosts: async (page = 1, limit = 25, search = '', status = ''): Promise<{ data: PendingHost[], total: number, pages: number, page: number }> => {
        const url = `/admin/hosts?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&status=${status}`;
        const response = await apiClient.get(url);
        return { ...response.data, page };
    },

    createHost: async (data: { email?: string, phone?: string, name?: string }) => {
        const response = await apiClient.post('/admin/hosts/create', data);
        return response.data;
    },

    getPendingHosts: async (page = 1, limit = 20) => {
        const response = await apiClient.get(`/admin/hosts/pending?page=${page}&limit=${limit}`);
        return response.data;
    },

    verifyHost: async (id: string, action: 'approve' | 'reject', reason?: string) => {
        const response = await apiClient.put(`/admin/hosts/${id}/verify`, { action, reason });
        return response.data;
    },

    suspendHost: async (id: string, reason?: string) => {
        const response = await apiClient.put(`/admin/hosts/${id}/suspend`, { reason });
        return response.data;
    },

    getHostDetails: async (id: string): Promise<PendingHost> => {
        const response = await apiClient.get(`/admin/hosts/${id}`);
        return response.data.data;
    },

    toggleHostStatus: async (id: string, status: 'ACTIVE' | 'SUSPENDED') => {
        const response = await apiClient.put(`/admin/hosts/${id}/status-toggle`, { status });
        return response.data;
    },

    deleteHost: async (id: string) => {
        const response = await apiClient.delete(`/admin/hosts/${id}`);
        return response.data;
    },

    // Events
    toggleEventFlags: async (eventId: string, flags: { isFeatured?: boolean, isTrending?: boolean }) => {
        const response = await apiClient.put(`/admin/events/${eventId}/flags`, flags);
        return response.data;
    },

    // Staff
    getStaff: async (params: { page?: number, limit?: number, type?: string, hostId?: string }): Promise<{ data: AdminStaff[], total: number, pages: number, count: number, page: number }> => {
        const { page = 1, limit = 30, type, hostId } = params;
        let url = `/admin/staff?page=${page}&limit=${limit}`;
        if (type) url += `&type=${type}`;
        if (hostId) url += `&hostId=${hostId}`;
        
        const response = await apiClient.get(url);
        return { ...response.data, page };
    },



    // Admin Global Stats
    getStats: async (): Promise<AdminStats> => {
        const response = await apiClient.get('/admin/stats');
        return response.data.data;
    },


    // Users
    getUsers: async (page = 1, limit = 25, search = ''): Promise<{ data: AdminUser[], total: number, pages: number, page: number }> => {
        const response = await apiClient.get(`/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
        // Add current page to response for infinite query
        return { ...response.data, page };
    },
    
    getUserDetails: async (id: string): Promise<AdminUser & { bookings: any[] }> => {
        const response = await apiClient.get(`/admin/users/${id}`);
        return response.data.data;
    },

    toggleUserStatus: async (id: string, isActive: boolean) => {
        const response = await apiClient.put(`/admin/users/${id}/status`, { isActive });
        return response.data;
    },

    deleteUser: async (id: string) => {
        const response = await apiClient.delete(`/admin/users/${id}`);
        return response.data;
    },


    getBookings: async (page = 1, limit = 30, status?: string): Promise<{ data: AdminBooking[], total: number, pages: number, page: number }> => {
        const url = status 
            ? `/admin/bookings?page=${page}&limit=${limit}&status=${status}` 
            : `/admin/bookings?page=${page}&limit=${limit}`;
        const response = await apiClient.get(url);
        return { ...response.data, page };
    },


    // Profile Management
    updateProfile: async (data: { name?: string, profileImage?: string }) => {
        const response = await apiClient.put('/admin/profile/update', data);
        return response.data;
    },
};

export default adminService;
