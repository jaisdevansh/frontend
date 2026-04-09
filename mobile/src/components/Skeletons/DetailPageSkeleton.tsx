import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SkeletonBase } from './SkeletonBase';

/**
 * Detail Page Skeleton - For event details, venue details
 * Used in: Event details screen, Venue profile
 */
export const DetailPageSkeleton: React.FC = React.memo(() => {
    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Hero Image */}
            <SkeletonBase width="100%" height={300} borderRadius={0} />
            
            <View style={styles.content}>
                {/* Title Section */}
                <View style={styles.section}>
                    <SkeletonBase width={100} height={20} borderRadius={10} style={styles.badge} />
                    <SkeletonBase width="90%" height={32} borderRadius={8} style={styles.title} />
                    <SkeletonBase width="70%" height={18} borderRadius={4} style={styles.subtitle} />
                </View>

                {/* Info Cards */}
                <View style={styles.infoCards}>
                    {[1, 2, 3].map((i) => (
                        <View key={i} style={styles.infoCard}>
                            <SkeletonBase width={40} height={40} borderRadius={20} />
                            <SkeletonBase width={80} height={14} borderRadius={4} style={{ marginTop: 8 }} />
                        </View>
                    ))}
                </View>

                {/* Description */}
                <View style={styles.section}>
                    <SkeletonBase width={120} height={20} borderRadius={6} style={styles.sectionTitle} />
                    <SkeletonBase width="100%" height={16} borderRadius={4} />
                    <SkeletonBase width="95%" height={16} borderRadius={4} style={{ marginTop: 6 }} />
                    <SkeletonBase width="85%" height={16} borderRadius={4} style={{ marginTop: 6 }} />
                </View>

                {/* Gallery */}
                <View style={styles.section}>
                    <SkeletonBase width={100} height={20} borderRadius={6} style={styles.sectionTitle} />
                    <View style={styles.gallery}>
                        {[1, 2, 3].map((i) => (
                            <SkeletonBase key={i} width="31%" height={100} borderRadius={12} />
                        ))}
                    </View>
                </View>

                {/* Action Button */}
                <SkeletonBase width="100%" height={56} borderRadius={16} style={{ marginTop: 24 }} />
            </View>
        </ScrollView>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#080810',
    },
    content: {
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    badge: {
        marginBottom: 12,
    },
    title: {
        marginBottom: 8,
    },
    subtitle: {
        marginBottom: 4,
    },
    sectionTitle: {
        marginBottom: 16,
    },
    infoCards: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
        gap: 12,
    },
    infoCard: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    gallery: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
});
