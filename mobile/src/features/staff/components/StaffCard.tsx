import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

interface StaffMember {
    _id: string;
    fullName: string;
    staffType: string;
    isActive?: boolean;
    status?: string;
    phone?: string;
    username?: string;
    profileImage?: string;
}

interface StaffCardProps {
    staff: StaffMember;
    onUpdate: (staffId: string, updates: Partial<StaffMember>) => void;
    onLongPressDelete?: (staff: StaffMember) => void;
}

const ROLE_ICON: Record<string, string> = {
    security: 'shield-checkmark',
    SECURITY: 'shield-checkmark',
    waiter: 'restaurant',
    WAITER: 'restaurant',
    WAITRESS: 'restaurant',
};

/**
 * StaffCard — pure memoised card.
 * NO Modal here — modal is ONE instance at the parent (staff.tsx) level.
 * Long press just fires a callback up to the parent.
 */
export const StaffCard = React.memo(({ staff, onUpdate, onLongPressDelete }: StaffCardProps) => {
    // Default to active unless host explicitly toggled off
    const isActive = staff.isActive !== false;
    const statusColor = isActive ? '#10B981' : '#EF4444';
    const roleIcon = (ROLE_ICON[staff.staffType] ?? 'person-circle') as any;

    const handleToggle = useCallback(() => {
        onUpdate(staff._id, { isActive: !isActive });
    }, [staff._id, isActive, onUpdate]);

    const handleLongPress = useCallback(() => {
        onLongPressDelete?.(staff);
    }, [staff, onLongPressDelete]);

    return (
        <Pressable
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.88 }]}
            onLongPress={handleLongPress}
            delayLongPress={400}
        >
            <View style={[styles.avatar, { backgroundColor: statusColor + '20' }]}>
                {staff.profileImage ? (
                    <Image source={{ uri: staff.profileImage }} style={styles.avatarImg} />
                ) : (
                    <Ionicons name={roleIcon} size={24} color={statusColor} />
                )}
            </View>

            <View style={styles.info}>
                <Text style={styles.name}>{staff.fullName}</Text>
                <Text style={styles.role}>
                    {staff.staffType?.toUpperCase()}{staff.phone ? ` • ${staff.phone}` : ''}
                </Text>
                <View style={styles.activityRow}>
                    <View style={[styles.dot, { backgroundColor: statusColor }]} />
                    <Text style={styles.activityTxt}>{isActive ? 'On Duty' : 'Off Duty'}</Text>
                    {onLongPressDelete && (
                        <Text style={styles.hint}>Hold to remove</Text>
                    )}
                </View>
            </View>

            <TouchableOpacity
                style={[styles.toggle, { borderColor: statusColor + '40' }]}
                onPress={handleToggle}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
                <View style={[styles.dot, { backgroundColor: statusColor, marginRight: 6 }]} />
                <Text style={[styles.toggleTxt, { color: statusColor }]}>
                    {isActive ? 'ACTIVE' : 'OFF'}
                </Text>
            </TouchableOpacity>
        </Pressable>
    );
},
// Custom equality — only re-render if meaningful data changed
(prev, next) =>
    prev.staff._id === next.staff._id &&
    prev.staff.isActive === next.staff.isActive &&
    prev.staff.fullName === next.staff.fullName &&
    prev.staff.profileImage === next.staff.profileImage
);

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 24,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    avatar: {
        width: 48, height: 48, borderRadius: 24,
        alignItems: 'center', justifyContent: 'center', marginRight: 14,
        overflow: 'hidden',
    },
    avatarImg: {
        width: '100%', height: '100%',
    },
    info: { flex: 1 },
    name: { color: 'white', fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
    role: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700', marginTop: 2, letterSpacing: 0.5 },
    activityRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    activityTxt: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '600' },
    hint: { color: 'rgba(255,255,255,0.1)', fontSize: 9, fontWeight: '600', marginLeft: 4 },
    toggle: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1,
    },
    toggleTxt: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
});
