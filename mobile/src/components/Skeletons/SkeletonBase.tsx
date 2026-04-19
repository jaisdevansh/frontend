import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SkeletonBaseProps {
    width?: DimensionValue;
    height?: DimensionValue;
    borderRadius?: number;
    style?: ViewStyle;
}

/**
 * Base Skeleton Component with Shimmer Animation
 * Reusable across all skeleton implementations
 */
export const SkeletonBase: React.FC<SkeletonBaseProps> = React.memo(({ 
    width = '100%', 
    height = 20, 
    borderRadius = 8,
    style 
}) => {
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const shimmer = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerAnim, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                }),
            ])
        );
        shimmer.start();
        return () => shimmer.stop();
    }, [shimmerAnim]);

    const translateX = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-300, 300],
    });

    return (
        <View style={[styles.container, { width, height, borderRadius }, style]}>
            <Animated.View
                style={[
                    StyleSheet.absoluteFillObject,
                    { transform: [{ translateX }] },
                ]}
            >
                <LinearGradient
                    colors={[
                        'rgba(255,255,255,0.03)',
                        'rgba(255,255,255,0.08)',
                        'rgba(255,255,255,0.03)',
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFillObject}
                />
            </Animated.View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        overflow: 'hidden',
    },
});
