import React, { useRef } from 'react';
import { Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator, Animated, Pressable, View } from 'react-native';
import { COLORS, BORDER_RADIUS, SPACING } from '../constants/design-system';
import * as Haptics from 'expo-haptics';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'glass' | 'outline';
    style?: ViewStyle | any;
    textStyle?: TextStyle | any;
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    style,
    textStyle,
    disabled,
    loading,
    icon
}) => {
    const scaleValue = useRef(new Animated.Value(1)).current;

    const getButtonStyle = () => {
        switch (variant) {
            case 'primary': return styles.primaryButton;
            case 'secondary': return styles.secondaryButton;
            case 'glass': return styles.glassButton;
            case 'outline': return styles.outlineButton;
            default: return styles.primaryButton;
        }
    };

    const handlePressIn = () => {
        if (!disabled && !loading) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Animated.spring(scaleValue, {
                toValue: 0.92,
                useNativeDriver: true,
                speed: 16,
                bounciness: 4,
            }).start();
        }
    };

    const handlePressOut = () => {
        if (!disabled && !loading) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Animated.spring(scaleValue, {
                toValue: 1,
                useNativeDriver: true,
                speed: 12,
                bounciness: 8,
            }).start();
        }
    };

    const containerStyle = {
        transform: [{ scale: scaleValue }],
        margin: (style as any)?.margin,
        marginTop: (style as any)?.marginTop,
        marginBottom: (style as any)?.marginBottom,
        marginLeft: (style as any)?.marginLeft,
        marginRight: (style as any)?.marginRight,
        marginHorizontal: (style as any)?.marginHorizontal,
        marginVertical: (style as any)?.marginVertical,
        flex: (style as any)?.flex,
        alignSelf: (style as any)?.alignSelf,
        width: (style as any)?.width,
        height: (style as any)?.height,
        position: (style as any)?.position,
        top: (style as any)?.top,
        bottom: (style as any)?.bottom,
        left: (style as any)?.left,
        right: (style as any)?.right,
        zIndex: (style as any)?.zIndex,
    };

    const pressableStyle = {
        ...styles.baseButton,
        ...getButtonStyle(),
        ...style,
        // Ensure some properties aren't duplicated or misused
        margin: 0, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0,
        marginHorizontal: 0, marginVertical: 0,
        position: 'relative', top: 0, bottom: 0, left: 0, right: 0,
        flex: 0, width: '100%', height: (style as any)?.height || styles.baseButton.height,
    };

    return (
        <Animated.View style={containerStyle as any}>
            <Pressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={[
                    pressableStyle as any,
                    (disabled || loading) && { opacity: 0.6 }
                ]}
                disabled={disabled || loading}
            >
                {loading ? (
                    <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : COLORS.primary} />
                ) : (
                    <View style={styles.contentContainer}>
                        {icon && <View style={styles.iconContainer}>{icon}</View>}
                        <Text style={[styles.baseText, textStyle]}>{title}</Text>
                    </View>
                )}
            </Pressable>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    baseButton: {
        height: 56,
        borderRadius: BORDER_RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.lg,
    },
    baseText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    primaryButton: {
        backgroundColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    glassButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    outlineButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    contentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        marginRight: 10,
    },
});
