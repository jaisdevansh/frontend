import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { 
    useAnimatedStyle, 
    withSpring, 
    withSequence, 
    useSharedValue,
    interpolate
} from 'react-native-reanimated';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface SeatProps {
    id: string;
    isSelected: boolean;
    isBooked: boolean;
    color: string;
    onPress: (id: string) => void;
}

/**
 * Pure, memoized Seat component with Haptics and Reanimated.
 */
export const Seat = React.memo(({ id, isSelected, isBooked, color, onPress }: SeatProps) => {
    const seatNum = id.includes('_s') ? id.split('_s')[1] : id;
    const progress = useSharedValue(isSelected ? 1 : 0);

    React.useEffect(() => {
        progress.value = withSpring(isSelected ? 1 : 0, {
            damping: 15,
            stiffness: 150
        });
    }, [isSelected]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { scale: interpolate(progress.value, [0, 0.5, 1], [1, 0.94, 1.05]) }
            ],
            backgroundColor: isBooked ? '#050505' : (isSelected ? color : '#080808'),
            borderColor: isSelected ? color : color + '40'
        };
    });

    const handlePress = () => {
        if (!isBooked) {
             Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
             onPress(id);
        }
    };

    return (
        <AnimatedTouchable 
            onPress={handlePress}
            disabled={isBooked}
            activeOpacity={0.7}
            style={[
                styles.seat, 
                animatedStyle,
                isBooked && styles.seatBooked
            ]}
        >
            <Text style={[
                styles.seatNum, 
                isSelected && { color: '#000', opacity: 1 }, 
                isBooked && { opacity: 0.1 }
            ]}>
                {seatNum}
            </Text>
            {isSelected && (
                <View style={styles.checkWrapper}>
                   <Ionicons name="checkmark" size={10} color="#000" />
                </View>
            )}
        </AnimatedTouchable>
    );
}, (prev, next) => (
    prev.isSelected === next.isSelected && 
    prev.isBooked === next.isBooked && 
    prev.color === next.color
));

const styles = StyleSheet.create({
    seat: { 
        width: 48, 
        height: 48, 
        borderRadius: 14, 
        borderWidth: 1.5, 
        alignItems: 'center', 
        justifyContent: 'center', 
        position: 'relative',
        margin: 5
    },
    seatBooked: { 
        borderColor: '#111' 
    },
    seatNum: { 
        color: 'rgba(255,255,255,0.85)', 
        fontSize: 14, 
        fontWeight: '900' 
    },
    checkWrapper: { 
        position: 'absolute', 
        top: 4, 
        right: 4 
    }
});
