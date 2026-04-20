import { useQuery } from '@tanstack/react-query';
import { hostService } from '../services/hostService';
import { useAuth } from '../context/AuthContext';

export const useHostProfile = () => {
    const { token, role } = useAuth();
    
    // Only fetch if user is a host AND token is available
    const isHost = role === 'host';
    const shouldFetch = !!token && isHost;
    
    return useQuery({
        queryKey: ['hostProfile'],
        enabled: shouldFetch, // Only fetch when token AND role are ready
        queryFn: async () => {
            // Double-check token exists before making request
            if (!token) {
                console.warn('[useHostProfile] No token available, skipping fetch');
                return null;
            }
            
            try {
                const res = await hostService.getProfile();
                if (!res) {
                    return null;
                }
                const profile = res.data || res.host || res;
                return profile;
            } catch (error: any) {
                console.warn('[useHostProfile] Fetch failed:', error.message);
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

