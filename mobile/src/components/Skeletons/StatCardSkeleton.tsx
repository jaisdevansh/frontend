import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { SkeletonBase } from './SkeletonBase';

const { width } = Dimensions.get('window');

/**
 * Stat Card Skeleton - Matches dashboard stat card layout
 * Used in: Host Dashboard stats section
 */
export const StatCardSkeleton: React.FC = React.memo(() => {
    return (
        <View style={styles.card}>
            {/* Label */}
            <SkeletonBase width={100} height={12} borderRadius={4} style={styles.label} />
            
            {/* Value */}
            <SkeletonBase width={60} height={28} borderRadius={6} style={styles.value} />
            
            {/* Change Text */}
            <SkeletonBase width={80} height={12} borderRadius={4} />
        </View>
    );
});

export const StatCardHalfSkeleton: React.FC = React.memo(() => {
    return (
        <View style={styles.cardHalf}>
            {/* Label */}
            <SkeletonBase width={100} height={12} borderRadius={4} style={styles.label} />
            
            {/* Value */}
            <SkeletonBase width={50} height={28} borderRadius={6} style={styles.value} />
            
            {/* Change Text */}
            <SkeletonBase width={70} height={12} borderRadius={4} />
        </View>
    );
});

const styles = StyleSheet.create({
    card: {
        flex: 1,
        backgroundColor: '#0A0A0A',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.03)',
    },
    cardHalf: {
        width: (width - 40 - 12) / 2,
        backgroundColor: '#0A0A0A',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.03)',
    },
    label: {
        marginBottom: 12,
    },
    value: {
        marginBottom: 8,
    },
});
