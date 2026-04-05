import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const SkeletonItem = ({ height = 80, width = '100%', borderRadius = 20, style = {} }) => {
    const animatedValue = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(animatedValue, {
                    toValue: 0,
                    duration: 1200,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const opacity = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <Animated.View style={[styles.skeleton, { height, width: width as any, borderRadius, opacity }, style]}>
            <LinearGradient
                colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
            />
        </Animated.View>
    );
};

export const UserListSkeleton = () => (
    <View style={styles.container}>
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <SkeletonItem key={i} style={styles.mb} />
        ))}
    </View>
);

export const DashboardSkeleton = () => (
    <View style={styles.container}>
        <View style={styles.row}>
            <SkeletonItem height={150} width="48%" />
            <SkeletonItem height={150} width="48%" />
        </View>
        <View style={[styles.row, styles.mt]}>
            <SkeletonItem height={150} width="48%" />
            <SkeletonItem height={150} width="48%" />
        </View>
        <View style={[styles.row, styles.mt]}>
            <SkeletonItem height={150} width="48%" />
            <SkeletonItem height={150} width="48%" />
        </View>
        <SkeletonItem height={200} style={styles.mt} borderRadius={24} />
        <SkeletonItem height={300} style={styles.mt} borderRadius={24} />
    </View>
);

const styles = StyleSheet.create({
    container: { padding: 24, gap: 12 },
    mb: { marginBottom: 12 },
    mt: { marginTop: 20 },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    skeleton: { backgroundColor: '#080808', overflow: 'hidden' },
});
