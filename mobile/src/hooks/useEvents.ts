import { useQuery } from '@tanstack/react-query';
import { hostService } from '../services/hostService';

export const useEvents = () => {
    return useQuery({
        queryKey: ['events'],
        placeholderData: [],
        queryFn: async () => {
            const res = await hostService.getEvents();
            if (!res) return [];
            return res.events || res.data || []; 
        },
        staleTime: 1000 * 60 * 5,
    });
};
