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
                // Return default stats — Global QueryCache handler (in _layout.tsx) handles the silencing
                return { totalBookings: 0, totalEvents: 0 };
            }
        },
        staleTime: 1000 * 60 * 5,
        retry: false,
    });
};
