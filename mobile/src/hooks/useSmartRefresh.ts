import { useState, useCallback, useRef } from 'react';
import apiClient from '../services/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SmartRefreshOptions {
    endpoint: string; // e.g., '/user/events'
    checkUpdatesEndpoint: string; // e.g., '/user/events/check-updates'
    cacheKey: string; // e.g., 'events_lastFetch'
    onRefresh: () => Promise<void>; // Actual data fetch function
    debounceMs?: number;
}

interface SmartRefreshReturn {
    refreshing: boolean;
    onRefresh: () => Promise<void>;
    lastFetchedAt: number | null;
}

/**
 * Smart Pull-To-Refresh Hook
 * 
 * Features:
 * - Checks for updates before fetching full data
 * - Debounces refresh to prevent spam
 * - Stores lastFetchedAt timestamp
 * - Only fetches when hasUpdates === true
 * 
 * Usage:
 * ```ts
 * const { refreshing, onRefresh } = useSmartRefresh({
 *   endpoint: '/user/events',
 *   checkUpdatesEndpoint: '/user/events/check-updates',
 *   cacheKey: 'events_lastFetch',
 *   onRefresh: async () => { await refetchEvents(); }
 * });
 * ```
 */
export const useSmartRefresh = ({
    endpoint,
    checkUpdatesEndpoint,
    cacheKey,
    onRefresh: fetchData,
    debounceMs = 2000,
}: SmartRefreshOptions): SmartRefreshReturn => {
    const [refreshing, setRefreshing] = useState(false);
    const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
    const lastRefreshTime = useRef<number>(0);

    // Load lastFetchedAt from storage on mount
    const loadLastFetch = useCallback(async () => {
        try {
            const stored = await AsyncStorage.getItem(cacheKey);
            if (stored) {
                setLastFetchedAt(parseInt(stored));
            }
        } catch (e) {
            console.error('[SmartRefresh] Failed to load lastFetchedAt:', e);
        }
    }, [cacheKey]);

    // Save lastFetchedAt to storage
    const saveLastFetch = useCallback(async (timestamp: number) => {
        try {
            await AsyncStorage.setItem(cacheKey, timestamp.toString());
            setLastFetchedAt(timestamp);
        } catch (e) {
            console.error('[SmartRefresh] Failed to save lastFetchedAt:', e);
        }
    }, [cacheKey]);

    const onRefresh = useCallback(async () => {
        // Debounce: Prevent spam refresh
        const now = Date.now();
        if (now - lastRefreshTime.current < debounceMs) {
            console.log('[SmartRefresh] Debounced - too soon');
            return;
        }
        lastRefreshTime.current = now;

        setRefreshing(true);

        try {
            // Load lastFetchedAt if not loaded
            if (!lastFetchedAt) {
                await loadLastFetch();
            }

            // Step 1: Check if updates are available (lightweight API call)
            console.log('[SmartRefresh] Checking for updates...');
            const checkRes = await apiClient.get(checkUpdatesEndpoint, {
                params: { lastFetchedAt: lastFetchedAt || 0 },
                timeout: 5000, // Fast timeout for check
            });

            const { hasUpdates } = checkRes.data;

            if (hasUpdates) {
                // Step 2: Fetch full data only if updates exist
                console.log('[SmartRefresh] Updates found, fetching data...');
                await fetchData();
                await saveLastFetch(Date.now());
            } else {
                // No updates - just stop refresh animation
                console.log('[SmartRefresh] No updates, skipping fetch');
            }
        } catch (error: any) {
            console.error('[SmartRefresh] Error:', error.message);
            // On error, still try to fetch data (fallback)
            try {
                await fetchData();
                await saveLastFetch(Date.now());
            } catch (fetchError) {
                console.error('[SmartRefresh] Fetch failed:', fetchError);
            }
        } finally {
            setRefreshing(false);
        }
    }, [
        lastFetchedAt,
        checkUpdatesEndpoint,
        fetchData,
        saveLastFetch,
        loadLastFetch,
        debounceMs,
    ]);

    return {
        refreshing,
        onRefresh,
        lastFetchedAt,
    };
};
