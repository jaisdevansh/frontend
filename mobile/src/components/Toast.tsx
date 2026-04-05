import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/design-system';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
    message: string;
    type: ToastType;
    onHide: () => void;
    duration?: number;
}

export const Toast = ({ message, type, onHide, duration = 3000 }: ToastProps) => {
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.delay(duration),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onHide();
        });
    }, []);

    let backgroundColor;
    let iconName: any;

    switch (type) {
        case 'success':
            backgroundColor = '#4CAF50';
            iconName = 'checkmark-circle';
            break;
        case 'error':
            backgroundColor = '#FF3B30';
            iconName = 'alert-circle';
            break;
        case 'warning':
            backgroundColor = '#FF9500';
            iconName = 'warning';
            break;
        case 'info':
        default:
            backgroundColor = COLORS.primary;
            iconName = 'information-circle';
            break;
    }

    return (
        <Animated.View
            style={[
                styles.container,
                { opacity, transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
            ]}
        >
            <View style={[styles.toast, { backgroundColor }]}>
                <Ionicons name={iconName} size={24} color="#FFFFFF" />
                <Text style={styles.message}>{message}</Text>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 60,
        left: 16,
        right: 16,
        alignItems: 'center',
        zIndex: 9999,
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        gap: 12,
        width: '100%',
    },
    message: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
        flexShrink: 1,
        flexWrap: 'wrap',
        lineHeight: 20,
    },
});
