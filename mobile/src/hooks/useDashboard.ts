import { useQuery } from '@tanstack/react-query';
import { hostService } from '../services/hostService';
import { useAuth } from '../context/AuthContext';

export const useDashboardStats = () => {
    const { token } = useAuth();
    return useQuery({
        queryKey: ['dashboardStats'],
        enabled: !!token,
        placeholderData: { totalBookings: 0, totalEvents: 0 },
        queryFn: async () => {
            try {
                const res = await hostService.getDashboardStats();
                if (!res) return { totalBookings: 0, totalEvents: 0 };
                if (res.data) return res.data;
                return res || { totalBookings: 0, totalEvents: 0 };
            } catch (error: any) {
                return { totalBookings: 0, totalEvents: 0 };
            }
        },
        staleTime: 60 * 1000,       // 1 min - dashboard is live data
        gcTime: 5 * 60 * 1000,      // Keep in memory for 5 min
        refetchOnMount: true,        // Always re-check on screen mount
        refetchOnWindowFocus: true,  // Re-fetch when app returns to foreground
        retry: false,
    });
};
