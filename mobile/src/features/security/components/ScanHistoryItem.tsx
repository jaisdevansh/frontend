import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../constants/design-system';

interface ScanResult {
    _id: string;
    userName: string;
    status: 'VALID' | 'INVALID' | 'USED';
    timestamp: number;
    guestCount: number;
    zone: string;
}

interface ScanHistoryItemProps {
    item: ScanResult;
}

/**
 * Pure, memoized ScanHistoryItem for Security Dashboard.
 * Optimized for list virtualization with FlashList.
 */
export const ScanHistoryItem = React.memo(({ item }: ScanHistoryItemProps) => {
    const time = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isValid = item.status === 'VALID';

    return (
        <View style={styles.card}>
            <View style={[styles.statusIcon, { 
                backgroundColor: isValid ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)' 
            }]}>
                <Ionicons 
                    name={isValid ? "checkmark-circle" : "close-circle"} 
                    size={20} 
                    color={isValid ? COLORS.emerald : '#EF4444'} 
                />
            </View>
            <View style={styles.content}>
                <View style={styles.row}>
                    <Text style={styles.name} numberOfLines={1}>{item.userName}</Text>
                    <Text style={styles.time}>{time}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.details}>{item.zone} • {item.guestCount} Guests</Text>
                    <Text style={[styles.statusTxt, { color: isValid ? COLORS.emerald : '#EF4444' }]}>
                        {item.status}
                    </Text>
                </View>
            </View>
        </View>
    );
}, (prev, next) => (
    prev.item._id === next.item._id && prev.item.status === next.item.status
));

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 20,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    statusIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    content: { flex: 1 },
    row: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 4,
    },
    name: { color: 'white', fontSize: 15, fontWeight: '700' },
    time: { color: 'rgba(255, 255, 255, 0.3)', fontSize: 11, fontWeight: '600' },
    details: { color: 'rgba(255, 255, 255, 0.4)', fontSize: 12, fontWeight: '500' },
    statusTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }
});
