import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, StatusBar, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Logo } from '../components/Logo';

const { width } = Dimensions.get('window');

export default function Index() {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const router = useRouter();

    useEffect(() => {
        // Smooth animation matching splash duration
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800, // Match splash duration
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 10,
                friction: 9,
                useNativeDriver: true,
            })
        ]).start();

        // Note: Navigation is handled by _layout.tsx, not here
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            
            {/* Seamless deep space gradient to perfectly transition into the welcome screen */}
            <LinearGradient
                colors={['#040B16', '#0B1120', '#000000']}
                locations={[0, 0.4, 1]}
                style={StyleSheet.absoluteFillObject}
            />

            <Animated.View style={[
                styles.contentWrapper, 
                { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
            ]}>
                {/* Premium Logo rendering */}
                <Logo size={width * 0.45} />
            </Animated.View>
            
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});
