import { useQuery } from '@tanstack/react-query';
import { hostService } from '../services/hostService';
import { useAuth } from '../context/AuthContext';

export const useHostProfile = () => {
    const { token, role } = useAuth();
    
    // Only fetch if user is a host
    const isHost = role === 'host';
    
    return useQuery({
        queryKey: ['hostProfile'],
        enabled: !!token && isHost, // Only fetch for hosts
        queryFn: async () => {
            try {
                const res = await hostService.getProfile();
                if (!res) {
                    return null;
                }
                const profile = res.data || res.host || res;
                return profile;
            } catch (error: any) {
                return null;
            }
        },
        staleTime: 0,               // Always stale
        gcTime: 0,                  // Never cache
        retry: false,               // No retry
        refetchOnMount: true,       // Refetch on mount
        refetchOnWindowFocus: false, // ❌ DISABLE to prevent infinite loop
        refetchInterval: false,     // No auto-polling
    });
};

