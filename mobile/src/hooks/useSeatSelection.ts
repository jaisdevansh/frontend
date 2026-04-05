import { useState, useCallback, useTransition } from 'react';
import * as Haptics from 'expo-haptics';

interface SelectionOptions {
    maxSelection: number;
    onSelectionChange?: (selectedIds: string[]) => void;
    onError?: (message: string) => void;
}

/**
 * Custom hook for ultra-fast seat selection.
 * Uses a Set for O(1) lookups and useTransition for non-blocking UI.
 */
export const useSeatSelection = ({ maxSelection, onSelectionChange, onError }: SelectionOptions) => {
    const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());
    const [isPending, startTransition] = useTransition();

    const toggleSeat = useCallback((seatId: string) => {
        // We use startTransition to ensure the UI stays responsive 
        // even if there's a lot of react work to do (though with memo it should be minimal).
        startTransition(() => {
            setSelectedSeats((prev) => {
                const next = new Set(prev);
                
                if (next.has(seatId)) {
                    next.delete(seatId);
                    Haptics.selectionAsync();
                } else {
                    if (next.size >= maxSelection) {
                        onError?.(`Please select exactly ${maxSelection} seats.`);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        return prev;
                    }
                    next.add(seatId);
                    Haptics.selectionAsync();
                }
                
                // Optional: sync back to parent if needed (e.g., for footer total)
                onSelectionChange?.(Array.from(next));
                
                return next;
            });
        });
    }, [maxSelection, onSelectionChange, onError]);

    const resetSelection = useCallback(() => {
        setSelectedSeats(new Set());
    }, []);

    return {
        selectedSeats,
        toggleSeat,
        resetSelection,
        isSelectionPending: isPending
    };
};
