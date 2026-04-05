import { useQuery } from '@tanstack/react-query';
import { hostService } from '../services/hostService';

export const useDashboardStats = () => {
    return useQuery({
        queryKey: ['dashboardStats'],
        queryFn: async () => {
            try {
                const res = await hostService.getDashboardStats();
                if (!res) return { totalBookings: 0, totalEvents: 0 };
                // If it has 'data' property that holds the stats
                if (res.data) return res.data;
                // If res is directly the stats object (or has other props)
                return res || { totalBookings: 0, totalEvents: 0 };
            } catch (error) {
                console.error('getDashboardStats query error:', error);
                return { totalBookings: 0, totalEvents: 0 };
            }
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};
