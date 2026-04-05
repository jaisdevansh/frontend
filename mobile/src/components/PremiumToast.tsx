import React, { useState, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ToastOptions {
    title: string;
    message?: string;
    type?: 'success' | 'info' | 'warning' | 'error';
    duration?: number;
}

export interface ToastRef {
    show: (options: ToastOptions) => void;
}

const PremiumToast = forwardRef<ToastRef, {}>((props, ref) => {
    const insets = useSafeAreaInsets();
    const [toast, setToast] = useState<ToastOptions | null>(null);
    const translateY = useSharedValue(-150);
    const opacity = useSharedValue(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const hide = useCallback(() => {
        translateY.value = withTiming(-150, { duration: 400 });
        opacity.value = withTiming(0, { duration: 300 }, (finished) => {
            if (finished) runOnJS(setToast)(null);
        });
    }, []);

    useImperativeHandle(ref, () => ({
        show: (options: ToastOptions) => {
            if (timerRef.current) clearTimeout(timerRef.current);
            setToast(options);
            translateY.value = withSpring(insets.top + 12, { damping: 12, stiffness: 90, mass: 0.6 });
            opacity.value = withTiming(1, { duration: 250 });

            timerRef.current = setTimeout(() => {
                hide();
            }, options.duration || 3200);
        }
    }));

    const rStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
        opacity: opacity.value,
    }));

    if (!toast) return null;

    const getIcon = () => {
        switch (toast.type) {
            case 'success': return 'shield-checkmark';
            case 'error': return 'alert-circle';
            case 'warning': return 'warning';
            default: return '闪电'; // Use flash for info/elite
        }
    };
    
    // Fix flash icon name
    const iconName: any = toast.type === 'success' ? 'shield-checkmark' : 
                        toast.type === 'error' ? 'alert-circle' : 
                        toast.type === 'warning' ? 'warning' : 'flash';

    const getColor = () => {
        switch (toast.type) {
            case 'success': return '#10B981';
            case 'error': return '#F43F5E';
            case 'warning': return '#f59e0b';
            default: return '#3b82f6';
        }
    };

    return (
        <Animated.View style={[styles.toastContainer, rStyle]}>
            <View style={[styles.iconBox, { shadowColor: getColor() }]}>
                <Ionicons name={iconName} size={22} color={getColor()} />
            </View>
            <View style={styles.content}>
                <Text style={styles.title}>{toast.title.toUpperCase()}</Text>
                {toast.message && <Text style={styles.message}>{toast.message}</Text>}
            </View>
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    toastContainer: {
        position: 'absolute',
        top: 0,
        left: 16,
        right: 16,
        backgroundColor: 'rgba(5, 5, 5, 0.92)',
        borderRadius: 24,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.15)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.7,
        shadowRadius: 24,
        elevation: 20,
        zIndex: 999999,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.04)',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    content: { flex: 1, gap: 1 },
    title: { fontSize: 13, fontWeight: '900', color: '#ffffff', letterSpacing: 0.8 },
    message: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
});

export default PremiumToast;
