import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { SkeletonBase } from './SkeletonBase';

const { width } = Dimensions.get('window');

/**
 * Event Card Skeleton - Matches event card layout
 * Used in: Home screen, Event list
 */
export const EventCardSkeleton: React.FC = React.memo(() => {
    return (
        <View style={styles.card}>
            {/* Cover Image */}
            <SkeletonBase width="100%" height={200} borderRadius={20} />
            
            <View style={styles.content}>
                {/* Category Badge */}
                <SkeletonBase width={80} height={20} borderRadius={10} style={styles.badge} />
                
                {/* Title */}
                <SkeletonBase width="90%" height={24} borderRadius={6} style={styles.title} />
                
                {/* Subtitle */}
                <SkeletonBase width="70%" height={16} borderRadius={4} style={styles.subtitle} />
                
                {/* Footer Row */}
                <View style={styles.footer}>
                    <View style={styles.footerLeft}>
                        <SkeletonBase width={40} height={40} borderRadius={20} />
                        <View style={styles.footerText}>
                            <SkeletonBase width={80} height={14} borderRadius={4} />
                            <SkeletonBase width={60} height={12} borderRadius={4} style={{ marginTop: 4 }} />
                        </View>
                    </View>
                    <SkeletonBase width={70} height={32} borderRadius={16} />
                </View>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 24,
        marginBottom: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    content: {
        padding: 16,
    },
    badge: {
        marginBottom: 12,
    },
    title: {
        marginBottom: 8,
    },
    subtitle: {
        marginBottom: 16,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    footerText: {
        gap: 4,
    },
});
