import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonBase } from './SkeletonBase';

interface ListSkeletonProps {
    count?: number;
    itemHeight?: number;
}

/**
 * Generic List Skeleton - Reusable for any list
 * Used in: Bookings, Orders, Search results
 */
export const ListSkeleton: React.FC<ListSkeletonProps> = React.memo(({ 
    count = 5,
    itemHeight = 120 
}) => {
    return (
        <View style={styles.container}>
            {Array.from({ length: count }).map((_, i) => (
                <View key={i} style={[styles.item, { minHeight: itemHeight }]}>
                    <View style={styles.row}>
                        <SkeletonBase width={80} height={80} borderRadius={16} />
                        <View style={styles.content}>
                            <SkeletonBase width="80%" height={18} borderRadius={4} />
                            <SkeletonBase width="60%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
                            <SkeletonBase width="40%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
                        </View>
                    </View>
                    <View style={styles.footer}>
                        <SkeletonBase width={100} height={16} borderRadius={4} />
                        <SkeletonBase width={80} height={32} borderRadius={16} />
                    </View>
                </View>
            ))}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        padding: 20,
        gap: 16,
    },
    item: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    row: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
});
