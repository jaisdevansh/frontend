import { useQuery } from '@tanstack/react-query';
import { hostService } from '../services/hostService';

export const useHostProfile = () => {
    return useQuery({
        queryKey: ['hostProfile'],
        queryFn: async () => {
            try {
                const res = await hostService.getProfile();
                if (!res) return null;
                return res.data || res.host || res; 
            } catch (error) {
                console.error('getProfile query error:', error);
                return null;
            }
        },
        // Low staleTime to ensure the host sees their verification status updates in real-time
        staleTime: 1000 * 30, // 30 seconds
        refetchOnWindowFocus: true
    });
};
