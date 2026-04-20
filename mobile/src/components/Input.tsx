import React, { useState, forwardRef } from 'react';
import { TextInput, StyleSheet, View, Text, ViewStyle, TextInputProps, TouchableOpacity } from 'react-native';
import { COLORS, BORDER_RADIUS, SPACING } from '../constants/design-system';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
    label?: string;
    containerStyle?: ViewStyle;
    wrapperStyle?: ViewStyle;
    isPassword?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(({
    label,
    containerStyle,
    wrapperStyle,
    style,
    isPassword,
    secureTextEntry,
    ...props
}, ref) => {
    const [isObscured, setIsObscured] = useState(secureTextEntry || isPassword);

    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View style={[
                styles.inputWrapper,
                props.multiline && styles.multilineWrapper,
                wrapperStyle
            ]}>
                <TextInput
                    style={[styles.input, style]}
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    autoCapitalize="none"
                    secureTextEntry={isObscured}
                    ref={ref}
                    {...props}
                />
                {(isPassword || secureTextEntry) && (
                    <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() => setIsObscured(!isObscured)}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={isObscured ? "eye-off-outline" : "eye-outline"}
                            size={20}
                            color="rgba(255, 255, 255, 0.5)"
                        />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.md,
    },
    label: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: SPACING.xs,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 56,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: SPACING.md,
    },
    multilineWrapper: {
        height: 120,
        paddingVertical: SPACING.sm,
        alignItems: 'flex-start',
    },
    input: {
        flex: 1,
        height: '100%',
        color: '#FFFFFF',
        fontSize: 16,
    },
    eyeIcon: {
        paddingLeft: SPACING.sm,
        height: '100%',
        justifyContent: 'center',
    }
});
