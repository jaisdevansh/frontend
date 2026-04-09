import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonBase } from './SkeletonBase';

/**
 * Profile Skeleton - Matches profile screen layout
 * Used in: Profile screen, User details
 */
export const ProfileSkeleton: React.FC = React.memo(() => {
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <SkeletonBase width={100} height={100} borderRadius={50} />
                <SkeletonBase width={150} height={24} borderRadius={6} style={styles.name} />
                <SkeletonBase width={120} height={16} borderRadius={4} style={styles.email} />
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
                {[1, 2, 3].map((i) => (
                    <View key={i} style={styles.statCard}>
                        <SkeletonBase width={40} height={28} borderRadius={6} />
                        <SkeletonBase width={60} height={14} borderRadius={4} style={{ marginTop: 8 }} />
                    </View>
                ))}
            </View>

            {/* Menu Items */}
            <View style={styles.menu}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <View key={i} style={styles.menuItem}>
                        <View style={styles.menuLeft}>
                            <SkeletonBase width={40} height={40} borderRadius={20} />
                            <SkeletonBase width={120} height={16} borderRadius={4} style={{ marginLeft: 12 }} />
                        </View>
                        <SkeletonBase width={20} height={20} borderRadius={10} />
                    </View>
                ))}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    name: {
        marginTop: 16,
    },
    email: {
        marginTop: 8,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 32,
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    menu: {
        gap: 12,
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    menuLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
