import { useQuery } from '@tanstack/react-query';
import { hostService } from '../services/hostService';
import { useAuth } from '../context/AuthContext';

export const useHostProfile = () => {
    const { token } = useAuth();
    return useQuery({
        queryKey: ['hostProfile'],
        enabled: !!token,
        placeholderData: null,
        queryFn: async () => {
            try {
                const res = await hostService.getProfile();
                if (!res) return null;
                return res.data || res.host || res;
            } catch (error: any) {
                return null;
            }
        },
        staleTime: 0,               // ⚡ Always stale
        gcTime: 0,                  // ⚡ No cache - always fresh from server
        retry: false,               // No retry for speed
        refetchOnMount: true,       // ✅ Re-check on every screen mount
        refetchOnWindowFocus: true, // ✅ Re-check when app comes back to foreground
        refetchInterval: false,     // Disable auto-refetch (we control it manually)
    });
};

