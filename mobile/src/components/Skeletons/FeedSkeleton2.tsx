import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ScrollView } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';

export default function FeedSkeleton2() {
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
            {/* Header / Filter Navigation Skeleton */}
            <View style={styles.header}>
                <SkeletonBox style={{ width: '40%', height: 28, borderRadius: 8 }} />
                <SkeletonBox style={{ width: 40, height: 40, borderRadius: 20 }} />
            </View>

            {/* horizontal chips */}
            <View style={styles.chipScroll}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <SkeletonBox key={i} style={{ width: 80, height: 32, borderRadius: 16, marginRight: 8 }} />
                ))}
            </View>

            {/* Vertical list (Recommended feed) Layout */}
            <View style={styles.verticalFeed}>
                <SkeletonBox style={{ width: '50%', height: 16, borderRadius: 8, marginBottom: 20 }} />
                
                {[1, 2, 3, 4, 5].map((i) => (
                    <View key={i} style={styles.feedCard}>
                        <SkeletonBox style={styles.feedImage} />
                        <View style={styles.feedContent}>
                            <View style={styles.feedRow}>
                                <SkeletonBox style={{ width: '60%', height: 16, borderRadius: 4 }} />
                                <SkeletonBox style={{ width: 24, height: 16, borderRadius: 4 }} />
                            </View>
                            <SkeletonBox style={{ width: '80%', height: 14, borderRadius: 4, marginTop: 8 }} />
                            <View style={styles.feedBadge}>
                                <SkeletonBox style={{ width: 12, height: 12, borderRadius: 6 }} />
                                <SkeletonBox style={{ width: '40%', height: 12, borderRadius: 4, marginLeft: 6 }} />
                            </View>
                        </View>
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
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.md,
    },
    chipScroll: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.xl,
        marginBottom: SPACING.xl,
    },
    verticalFeed: {
        paddingHorizontal: SPACING.xl,
    },
    feedCard: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: BORDER_RADIUS.xl,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        marginBottom: 16,
    },
    feedImage: {
        width: 80,
        height: 80,
        borderRadius: 12,
    },
    feedContent: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'center',
    },
    feedRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    feedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
    }
});
