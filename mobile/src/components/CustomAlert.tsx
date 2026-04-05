import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { BlurView as ExpoBlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/design-system';

const { width, height } = Dimensions.get('window');

export interface AlertButton {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertProps {
    visible: boolean;
    title: string;
    message: string;
    buttons?: AlertButton[];
    onClose: () => void;
}

export const CustomAlert = ({ visible, title, message, buttons = [], onClose }: CustomAlertProps) => {
    const scale = useRef(new Animated.Value(0.9)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scale, {
                    toValue: 1,
                    friction: 8,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            scale.setValue(0.9);
            opacity.setValue(0);
        }
    }, [visible]);

    if (!visible) return null;

    const renderButtons = () => {
        if (buttons.length === 0) {
            return (
                <TouchableOpacity style={[styles.button, styles.buttonFlex]} onPress={onClose}>
                    <Text style={styles.buttonText}>OK</Text>
                </TouchableOpacity>
            );
        }

        return buttons.map((btn, index) => {
            const isDestructive = btn.style === 'destructive';
            const isCancel = btn.style === 'cancel';
            const isStack = buttons.length > 2;

            return (
                <TouchableOpacity
                    key={index}
                    style={[
                        styles.button,
                        !isStack && styles.buttonFlex,
                        isStack ? (index < buttons.length - 1 && styles.buttonBorderBottom) : (index < buttons.length - 1 && styles.buttonBorderRight),
                        isDestructive && styles.destructiveBtn
                    ]}
                    onPress={() => {
                        onClose();
                        if (btn.onPress) btn.onPress();
                    }}
                >
                    <Text style={[
                        styles.buttonText,
                        isDestructive && { color: '#FF3B30' },
                        isCancel && { color: 'rgba(255,255,255,0.6)', fontWeight: '500' }
                    ]}>
                        {btn.text}
                    </Text>
                </TouchableOpacity>
            );
        });
    };

    return (
        <Modal transparent visible={visible} animationType="none">
            <View style={styles.overlay}>
                <ExpoBlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                <Animated.View style={[styles.alertBox, { opacity, transform: [{ scale }] }]}>
                    <TouchableOpacity style={styles.closeIconBtn} onPress={onClose}>
                        <Ionicons name="close" size={20} color="rgba(255,255,255,0.3)" />
                    </TouchableOpacity>
                    <View style={styles.content}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="notifications-outline" size={28} color={COLORS.primary} />
                        </View>
                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.message}>{message}</Text>
                    </View>
                    <View style={buttons.length > 2 ? styles.buttonStack : styles.buttonRow}>
                        {renderButtons()}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    alertBox: {
        width: '100%',
        backgroundColor: '#1C1C1E',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    closeIconBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
        padding: 4,
    },
    content: {
        padding: 24,
        alignItems: 'center',
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(115, 148, 10, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    buttonRow: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    buttonStack: {
        flexDirection: 'column',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    button: {
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonFlex: {
        flex: 1,
    },
    buttonBorderRight: {
        borderRightWidth: 1,
        borderRightColor: 'rgba(255,255,255,0.05)',
    },
    buttonBorderBottom: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    buttonText: {
        color: COLORS.primary,
        fontSize: 16,
        fontWeight: '700',
    },
    destructiveBtn: {
        // Style for destructive action container if needed
    }
});
