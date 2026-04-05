import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import Animated, { 
    useAnimatedStyle, 
    withSpring, 
    interpolateColor, 
    useDerivedValue 
} from 'react-native-reanimated';

interface PremiumToggleProps {
    value: boolean;
    onValueChange: (newValue: boolean) => void;
    disabled?: boolean;
}

const PremiumToggle = ({ value, onValueChange, disabled }: PremiumToggleProps) => {
    const translateX = useDerivedValue(() => {
        return withSpring(value ? 20 : 0, { damping: 15, stiffness: 150 });
    });

    const trackStyle = useAnimatedStyle(() => {
        const backgroundColor = interpolateColor(
            translateX.value,
            [0, 20],
            ['rgba(255,255,255,0.08)', '#3b82f6']
        );
        return { backgroundColor };
    });

    const thumbStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }],
        };
    });

    return (
        <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => !disabled && onValueChange(!value)}
            style={styles.container}
            disabled={disabled}
        >
            <Animated.View style={[styles.track, trackStyle]}>
                <Animated.View style={[styles.thumb, thumbStyle]} />
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 44,
        height: 24,
        justifyContent: 'center',
    },
    track: {
        width: 44,
        height: 24,
        borderRadius: 12,
        padding: 2,
    },
    thumb: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
});

export default PremiumToggle;
