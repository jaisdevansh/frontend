import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { securityService } from '../services/securityService';
import { getSocket } from '../lib/socketClient';

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const securityKeys = {
    open: ['security', 'open'] as const,
    myIssues: ['security', 'my'] as const,
    resolved: ['security', 'resolved'] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Fetch open (unassigned) issues — priority sorted by backend */
export const useOpenIssues = () =>
    useQuery({
        queryKey: securityKeys.open,
        queryFn: async () => {
            const res = await securityService.getOpenIssues();
            return res.data as any[];
        },
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    });

/** Fetch issues assigned to current guard */
export const useMyIssues = () =>
    useQuery({
        queryKey: securityKeys.myIssues,
        queryFn: async () => {
            const res = await securityService.getMyIssues();
            return res.data as any[];
        },
        staleTime: 15_000,
    });

/** Fetch resolved issue history (limit 50, sorted by resolvedAt) */
export const useResolvedIssues = () =>
    useQuery({
        queryKey: securityKeys.resolved,
        queryFn: async () => {
            const res = await securityService.getResolvedHistory();
            return res.data as any[];
        },
        staleTime: 60_000,
    });

/** Respond to (claim) an issue */
export const useRespondToIssue = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (issueId: string) => securityService.respondToIssue(issueId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: securityKeys.open });
            queryClient.invalidateQueries({ queryKey: securityKeys.myIssues });
        },
    });
};

/** Mark an issue as resolved */
export const useResolveIssue = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (issueId: string) => securityService.resolveIssue(issueId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: securityKeys.myIssues });
            queryClient.invalidateQueries({ queryKey: securityKeys.resolved });
        },
    });
};

/**
 * Real-time socket hook.
 * Joins 'security_room', listens for new_issue / issue_updated / issue_escalated.
 * Triggers React Query cache invalidation instead of manually patching state.
 * 
 * NOTE: Socket is disabled for staff role (uses admin backend, socket is on user backend)
 */
export const useSecuritySocket = () => {
    const queryClient = useQueryClient();

    useEffect(() => {
        let socketRef: any;

        (async () => {
            try {
                socketRef = await getSocket();

                // Join security room so server can target this guard
                socketRef.emit('join_room', 'security_room');

                // New issue came in → refresh open list
                socketRef.on('new_issue', () => {
                    queryClient.invalidateQueries({ queryKey: securityKeys.open });
                });

                // Issue changed status → refresh all lists
                socketRef.on('issue_updated', () => {
                    queryClient.invalidateQueries({ queryKey: securityKeys.open });
                    queryClient.invalidateQueries({ queryKey: securityKeys.myIssues });
                    queryClient.invalidateQueries({ queryKey: securityKeys.resolved });
                });

                // Escalation from background job → force-refresh open list
                socketRef.on('issue_escalated', () => {
                    queryClient.invalidateQueries({ queryKey: securityKeys.open });
                });
            } catch (err) {
                // Socket not available for staff - this is expected, not an error
                // Staff will use pull-to-refresh instead of real-time updates
            }
        })();

        return () => {
            if (socketRef) {
                socketRef.off('new_issue');
                socketRef.off('issue_updated');
                socketRef.off('issue_escalated');
            }
        };
    }, [queryClient]);
};
