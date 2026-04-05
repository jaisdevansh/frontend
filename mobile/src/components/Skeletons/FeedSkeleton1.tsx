import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ScrollView } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';

export default function FeedSkeleton1() {
    const pulseAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                })
            ])
        ).start();
    }, [pulseAnim]);

    const SkeletonBox = ({ style }: any) => (
        <Animated.View style={[styles.box, style, { opacity: pulseAnim }]} />
    );

    return (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header / Search Skeleton */}
            <View style={styles.header}>
                <SkeletonBox style={{ width: '60%', height: 28, borderRadius: 8 }} />
                <SkeletonBox style={{ width: 40, height: 40, borderRadius: 20 }} />
            </View>

            {/* Horizontal Cards (Hero discovery) Layout */}
            <View style={styles.horizontalScroll}>
                {[1, 2].map((i) => (
                    <View key={i} style={styles.heroCard}>
                        <SkeletonBox style={{ width: 320, height: 400, borderRadius: BORDER_RADIUS.xl }} />
                        <View style={styles.heroFooter}>
                            <SkeletonBox style={{ width: '70%', height: 24, borderRadius: 4, marginBottom: 8 }} />
                            <SkeletonBox style={{ width: '40%', height: 16, borderRadius: 4 }} />
                        </View>
                    </View>
                ))}
            </View>

            {/* Minor Items Section */}
            <View style={styles.section}>
                <SkeletonBox style={{ width: 120, height: 20, borderRadius: 4, marginBottom: 16 }} />
                {[1, 2, 3].map((i) => (
                    <View key={i} style={styles.listItem}>
                        <SkeletonBox style={{ width: 60, height: 60, borderRadius: 12 }} />
                        <View style={styles.listText}>
                            <SkeletonBox style={{ width: '80%', height: 16, borderRadius: 4, marginBottom: 8 }} />
                            <SkeletonBox style={{ width: '50%', height: 12, borderRadius: 4 }} />
                        </View>
                        <SkeletonBox style={{ width: 24, height: 24, borderRadius: 12 }} />
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: COLORS.background.dark,
        paddingBottom: 40,
    },
    box: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.lg,
        marginTop: 20,
    },
    horizontalScroll: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.xl,
        gap: 16,
    },
    heroCard: {
        position: 'relative',
    },
    heroFooter: {
        position: 'absolute',
        bottom: 24,
        left: 24,
        right: 24,
    },
    section: {
        paddingHorizontal: SPACING.xl,
        marginTop: SPACING.xxl,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        padding: 12,
        borderRadius: BORDER_RADIUS.lg,
    },
    listText: {
        flex: 1,
        marginLeft: 16,
    }
});
