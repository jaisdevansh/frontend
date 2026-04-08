import { useQuery } from '@tanstack/react-query';
import { hostService } from '../services/hostService';
import { useAuth } from '../context/AuthContext';

export const useHostProfile = () => {
    const { token } = useAuth();
    return useQuery({
        queryKey: ['hostProfile'],
        enabled: !!token,
        queryFn: async () => {
            try {
                const res = await hostService.getProfile();
                if (!res) return null;
                return res.data || res.host || res;
            } catch (error: any) {
                // Return null gracefully — Global QueryCache handler (in _layout.tsx) handles the silencing
                return null;
            }
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
        retry: false,
        refetchOnWindowFocus: false
    });
};
