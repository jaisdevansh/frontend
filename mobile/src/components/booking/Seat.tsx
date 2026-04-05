import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SeatProps {
    id: string;
    isSelected: boolean;
    isBooked: boolean;
    color: string;
    onPress: (id: string) => void;
}

/**
 * Highly optimized Seat component.
 * Uses React.memo for strict re-render control.
 * Interaction targets are minimal to prevent heavy layout computation.
 */
export const Seat = React.memo(({ id, isSelected, isBooked, color, onPress }: SeatProps) => {
    // Determine number from ID (e.g., "A-1" -> "1")
    const seatNum = id.includes('-') ? id.split('-')[1] : id;

    return (
        <TouchableOpacity 
            onPress={() => onPress(id)}
            disabled={isBooked}
            activeOpacity={0.7}
            style={[
                styles.seat, 
                { borderColor: color + '40' },
                isSelected && { backgroundColor: color, borderColor: color },
                isBooked && styles.seatBooked
            ]}
        >
            <Text style={[
                styles.seatNum, 
                isSelected && { color: '#000' }, 
                isBooked && { opacity: 0.1 }
            ]}>
                {seatNum}
            </Text>
            {isSelected && (
                <View style={styles.checkWrapper}>
                   <Ionicons name="checkmark" size={10} color="#000" />
                </View>
            )}
        </TouchableOpacity>
    );
}, (prev, next) => {
    // Manual optimization: only re-render if selection or booking status changes
    return prev.isSelected === next.isSelected && prev.isBooked === next.isBooked;
});

const styles = StyleSheet.create({
    seat: { 
        width: 46, 
        height: 46, 
        borderRadius: 14, 
        borderWidth: 1.5, 
        backgroundColor: '#080808', 
        alignItems: 'center', 
        justifyContent: 'center', 
        position: 'relative',
        margin: 5
    },
    seatBooked: { 
        backgroundColor: '#050505', 
        borderColor: '#111' 
    },
    seatNum: { 
        color: 'rgba(255,255,255,0.4)', 
        fontSize: 14, 
        fontWeight: '700' 
    },
    checkWrapper: { 
        position: 'absolute', 
        top: 4, 
        right: 4 
    }
});
