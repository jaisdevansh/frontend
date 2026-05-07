import { useQuery } from '@tanstack/react-query';
import { hostService } from '../services/hostService';

export const useEvents = () => {
    return useQuery({
        queryKey: ['events'],
        placeholderData: [],
        queryFn: async () => {
            console.log('📡 [HostEvents] Fetching events from API...');
            const res = await hostService.getEvents();
            console.log('📦 [HostEvents] API Response:', {
                success: res?.success,
                count: res?.events?.length || res?.data?.length || 0,
                hasEvents: !!res?.events,
                hasData: !!res?.data
            });
            if (!res) return [];
            return res.events || res.data || []; 
        },
        staleTime: 1000 * 60 * 5,
    });
};
