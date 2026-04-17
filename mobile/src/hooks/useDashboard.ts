import { useQuery } from '@tanstack/react-query';
import { hostService } from '../services/hostService';
import { useAuth } from '../context/AuthContext';

export const useDashboardStats = () => {
    const { token } = useAuth();
    return useQuery({
        queryKey: ['dashboardStats'],
        enabled: !!token,
        placeholderData: { totalBookings: 0, totalEvents: 0, revenue: 0, checkedIn: 0, capacityUsage: '0%' },
        queryFn: async () => {
            try {
                const res = await hostService.getDashboardStats();
                if (!res) return { totalBookings: 0, totalEvents: 0, revenue: 0, checkedIn: 0, capacityUsage: '0%' };
                // Backend returns { success, stats: { totalBookings, totalEvents, ... } }
                const stats = res.stats || res.data?.stats || res.data || res;
                return {
                    totalBookings: stats.totalBookings ?? 0,
                    totalEvents: stats.totalEvents ?? 0,
                    revenue: stats.revenue ?? 0,
                    checkedIn: stats.checkedIn ?? 0,
                    capacityUsage: stats.capacityUsage ?? '0%',
                };
            } catch (error: any) {
                return { totalBookings: 0, totalEvents: 0, revenue: 0, checkedIn: 0, capacityUsage: '0%' };
            }
        },
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnMount: true,
        refetchOnWindowFocus: true,
        retry: false,
    });
};
