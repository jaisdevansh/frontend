import React, { useState, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, StatusBar, Animated, Pressable, Platform, UIManager, LayoutAnimation, Alert
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import adminService, { AdminHost, AdminStaff } from '../../services/adminService';
import { DashboardSkeleton } from '../../components/admin/AdminSkeleton';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const C = {
    bg: '#000000',
    card: '#0a0a0f',
    cardElevated: '#12121a',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    expandedBg: 'rgba(255,255,255,0.02)',
    primary: '#6C63FF',
    primaryDim: 'rgba(108, 99, 255, 0.15)',
    gold: '#F5A623',
    goldDim: 'rgba(245, 166, 35, 0.12)',
    success: '#10B981',
    successDim: 'rgba(16, 185, 129, 0.12)',
    danger: '#F43F5E',
    dangerDim: 'rgba(244, 63, 94, 0.12)',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.5)',
    textMuted: 'rgba(255,255,255,0.2)',
};

// Role → color + icon mapping
const ROLE_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
    waiter:   { color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.12)', icon: 'restaurant' },
    manager:  { color: C.gold,   bg: C.goldDim,                   icon: 'manage-accounts' },
    entry:    { color: C.success, bg: C.successDim,               icon: 'sensor-door' },
    security: { color: C.danger,  bg: C.dangerDim,                icon: 'security' },
    default:  { color: C.primary, bg: C.primaryDim,               icon: 'person' },
};

function getRoleConfig(role?: string) {
    const key = (role || '').toLowerCase();
    return ROLE_CONFIG[key] || ROLE_CONFIG.default;
}

function getStatusColor(active?: boolean) {
    return active ? C.success : C.danger;
}

// ── STAFF ROW ─────────────────────────────────────────────────────────────
const StaffRow = React.memo(({ staff, isLast, onAction }: { staff: AdminStaff; isLast: boolean, onAction: (s: AdminStaff) => void }) => {
    const rc = getRoleConfig(staff.staffType || staff.role);
    return (
        <View style={[styles.staffRow, isLast && styles.staffRowLast]}>
            {/* Avatar */}
            <View style={[styles.staffAvatar, { backgroundColor: rc.bg, borderColor: rc.color + '20' }]}>
                <MaterialIcons name={rc.icon as any} size={16} color={rc.color} />
            </View>

            {/* Info */}
            <View style={styles.staffInfo}>
                <View style={styles.staffNameRow}>
                    <View style={styles.statusContainerSmall}>
                        <View style={[styles.statusGlowSmall, { backgroundColor: getStatusColor(staff.isActive) }]} />
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(staff.isActive) }]} />
                    </View>
                    <Text style={styles.staffName} numberOfLines={1}>{staff.name}</Text>
                </View>
                <View style={styles.staffMeta}>
                    <View style={[styles.rolePill, { backgroundColor: rc.bg, borderColor: rc.color + '15' }]}>
                        <Text style={[styles.rolePillText, { color: rc.color }]}>
                            {(staff.staffType || staff.role || 'STAFF').toUpperCase()}
                        </Text>
                    </View>
                    {staff.phone && (
                        <Text style={styles.staffPhone}>{staff.phone}</Text>
                    )}
                </View>
            </View>

            {/* Status badge */}
            <View style={[styles.activeBadge, {
                backgroundColor: staff.isActive ? C.successDim : C.dangerDim,
                borderColor: staff.isActive ? C.success + '20' : C.danger + '20',
            }]}>
                <Text style={[styles.activeBadgeText, { color: staff.isActive ? C.success : C.danger }]}>
                    {staff.isActive ? 'LIVE' : 'OFF'}
                </Text>
            </View>

            {/* Action Details */}
            <TouchableOpacity onPress={() => onAction(staff)} style={{ padding: 4, marginLeft: 4 }}>
                <MaterialIcons name="more-vert" size={20} color={C.textMuted} />
            </TouchableOpacity>
        </View>
    );
});

// ── HOST CARD ──────────────────────────────────────────────────────────────
const HostCard = React.memo(({ host, index }: { host: AdminHost; index: number }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const queryClient = useQueryClient();

    const { data: staffResponse, isLoading } = useQuery({
        queryKey: ['admin-staff', host._id],
        queryFn: () => adminService.getStaff({ hostId: host._id, limit: 100 }),
        enabled: isExpanded,
        staleTime: 60000,
    });

    const staffList: AdminStaff[] = staffResponse?.data || [];
    const staffCount = staffResponse?.count ?? (isExpanded && !isLoading ? staffList.length : null);
    const initials = (host.name || 'H').slice(0, 2).toUpperCase();

    // Status display
    const statusActive = ['ACTIVE', 'VERIFIED', 'APPROVED'].includes((host.hostStatus || '').toUpperCase());
    const statusColor = statusActive ? C.success : C.warning;

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsExpanded(v => !v);
    };

    const handleStaffAction = useCallback((staff: AdminStaff) => {
        Alert.alert(
            `Manage ${staff.name}`,
            `Role: ${(staff.staffType || 'Staff').toUpperCase()}\nStatus: ${staff.isActive ? 'Active' : 'Suspended'}`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: staff.isActive ? 'Suspend Access' : 'Restore Access',
                    style: staff.isActive ? 'destructive' : 'default',
                    onPress: async () => {
                        try {
                            await adminService.toggleStaffStatus(staff._id, !staff.isActive);
                            queryClient.invalidateQueries({ queryKey: ['admin-staff', host._id] });
                        } catch (err) {
                            Alert.alert('Error', 'Failed to update personnel status.');
                        }
                    } 
                },
                {
                    text: 'Permanently Remove',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert('Confirm Deletion', `Permanently delete ${staff.name}? This action cannot be undone.`, [
                            { text: 'Cancel', style: 'cancel' },
                            { 
                                text: 'Delete Personnel', 
                                style: 'destructive', 
                                onPress: async () => {
                                    try {
                                        await adminService.deleteStaff(staff._id);
                                        queryClient.invalidateQueries({ queryKey: ['admin-staff', host._id] });
                                    } catch (err) {
                                        Alert.alert('Error', 'Failed to permanently delete personnel.');
                                    }
                                } 
                            }
                        ]);
                    }
                }
            ]
        );
    }, [host._id, queryClient]);

    return (
        <Animated.View style={[styles.hostCardWrapper, { transform: [{ scale: scaleAnim }] }]}>
            <View style={[styles.hostCard, isExpanded && styles.hostCardExpanded]}>
                {/* Subtle left accent line */}
                <View style={[styles.cardAccent, { backgroundColor: statusColor, shadowColor: statusColor }]} />

                {/* HEADER — tap to expand */}
                <Pressable
                    onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start()}
                    onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()}
                    onPress={toggleExpand}
                    style={({ pressed }) => [styles.cardHeader, pressed && { backgroundColor: C.cardElevated }]}
                >
                    {/* Avatar */}
                    <LinearGradient
                        colors={['rgba(108,99,255,0.4)', 'rgba(108,99,255,0.05)']}
                        style={styles.hostAvatar}
                    >
                        <Text style={styles.hostInitials}>{initials}</Text>
                        <View style={styles.hostAvatarRing} />
                    </LinearGradient>

                    {/* Name + meta */}
                    <View style={styles.hostMeta}>
                        <Text style={styles.hostName} numberOfLines={1}>{host.name}</Text>
                        <View style={styles.hostSubRow}>
                            {/* Status pill */}
                            <View style={[styles.statusPill, { backgroundColor: statusColor + '15', borderColor: statusColor + '30' }]}>
                                <View style={[styles.statusDotSmall, { backgroundColor: statusColor }]} />
                                <Text style={[styles.statusPillText, { color: statusColor }]}>
                                    {host.hostStatus || 'PENDING'}
                                </Text>
                            </View>

                            {/* Staff count — shown after load */}
                            {staffCount !== null && (
                                <Text style={styles.hostStaffCount}>
                                    {staffCount} {staffCount === 1 ? 'personnel' : 'personnel'}
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Chevron */}
                    <View style={[styles.chevronBox, isExpanded && styles.chevronBoxActive]}>
                        <MaterialIcons
                            name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                            size={20}
                            color={isExpanded ? C.primary : C.textSecondary}
                        />
                    </View>
                </Pressable>

                {/* EXPANDED BODY */}
                {isExpanded && (
                    <View style={styles.expandedBody}>
                        {/* Divider with label */}
                        <View style={styles.dividerRow}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerLabel}>PERSONNEL OVERVIEW</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {isLoading ? (
                            <View style={styles.loadingBox}>
                                <ActivityIndicator color={C.primary} size="small" />
                                <Text style={styles.loadingText}>Fetching personnel records…</Text>
                            </View>
                        ) : staffList.length === 0 ? (
                            <View style={styles.emptyBox}>
                                <View style={styles.emptyIconRadius}>
                                    <MaterialIcons name="group-off" size={24} color={C.textMuted} />
                                </View>
                                <Text style={styles.emptyText}>No personnel assigned yet</Text>
                            </View>
                        ) : (
                            staffList.map((s, i) => (
                                <StaffRow key={s._id} staff={s} isLast={i === staffList.length - 1} onAction={handleStaffAction} />
                            ))
                        )}
                    </View>
                )}
            </View>
        </Animated.View>
    );
});

// ── MAIN SCREEN ────────────────────────────────────────────────────────────
export default function AdminStaffScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const { data: hostResponse, isLoading, isError, refetch } = useQuery({
        queryKey: ['admin-hosts-all'],
        queryFn: () => adminService.getHosts(1, 100),
        staleTime: 60000,
    });

    const hosts: AdminHost[] = hostResponse?.data || [];
    const renderItem = useCallback(({ item, index }: { item: AdminHost; index: number }) =>
        <HostCard host={item} index={index} />, []);
    const keyExtractor = useCallback((item: AdminHost) => item._id, []);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#050508', '#000000', '#000000']}
                style={StyleSheet.absoluteFillObject}
            />
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* HEADER */}
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={22} color="#FFF" />
                </TouchableOpacity>

                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Staff Registry</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <View style={styles.statsDotMain} />
                        <Text style={styles.headerSub}>
                            {isLoading ? 'SYNCING DATA…' : `${hosts.length} MANAGED VENUE${hosts.length !== 1 ? 'S' : ''}`}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.refreshBtn} onPress={() => refetch()} activeOpacity={0.7}>
                    <Ionicons name="refresh" size={18} color={C.primary} />
                </TouchableOpacity>
            </View>

            {/* BODY */}
            {isLoading ? (
                <DashboardSkeleton />
            ) : isError ? (
                <View style={styles.errorBox}>
                    <MaterialIcons name="wifi-off" size={40} color={C.danger} />
                    <Text style={styles.errorText}>Failed to load host registry</Text>
                    <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
                        <Text style={styles.retryBtnText}>Retry Connection</Text>
                    </TouchableOpacity>
                </View>
            ) : hosts.length === 0 ? (
                <View style={styles.errorBox}>
                    <MaterialIcons name="domain-disabled" size={40} color={C.textMuted} />
                    <Text style={styles.errorText}>No venues registered yet</Text>
                </View>
            ) : (
                <FlashList
                    data={hosts}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    // @ts-ignore
                    estimatedItemSize={90}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 100 }}
                    showsVerticalScrollIndicator={false}
                    onRefresh={refetch}
                    refreshing={isLoading}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },

    // ── Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 24,
        gap: 16,
        zIndex: 10,
    },
    backBtn: {
        width: 44, height: 44,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerContent: { flex: 1 },
    headerTitle: {
        fontSize: 26, fontWeight: '900',
        color: '#FFFFFF', letterSpacing: -0.5,
    },
    headerSub: {
        fontSize: 11, fontWeight: '800',
        color: C.textSecondary,
        textTransform: 'uppercase', letterSpacing: 1,
    },
    statsDotMain: {
        width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary, marginRight: 8, shadowColor: C.primary, shadowOpacity: 0.8, shadowRadius: 4, shadowOffset: { width: 0, height: 0 }
    },
    refreshBtn: {
        width: 44, height: 44,
        borderRadius: 16,
        backgroundColor: 'rgba(108, 99, 255, 0.1)',
        borderWidth: 1, borderColor: 'rgba(108, 99, 255, 0.2)',
        justifyContent: 'center', alignItems: 'center',
    },

    // ── Host Card
    hostCardWrapper: {
        marginBottom: 14,
    },
    hostCard: {
        backgroundColor: C.card,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: C.cardBorder,
        overflow: 'hidden',
    },
    hostCardExpanded: {
        borderColor: 'rgba(255,255,255,0.12)',
    },
    cardAccent: {
        position: 'absolute',
        left: 0, top: 20, bottom: 20,
        width: 4,
        borderTopRightRadius: 4, borderBottomRightRadius: 4,
        shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 6,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingLeft: 22,
        paddingVertical: 18,
        gap: 16,
    },
    hostAvatar: {
        width: 50, height: 50,
        borderRadius: 18,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(108,99,255,0.2)',
    },
    hostAvatarRing: {
        ...StyleSheet.absoluteFillObject, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
    },
    hostInitials: {
        fontSize: 18, fontWeight: '900',
        color: '#FFFFFF', letterSpacing: 1,
    },
    hostMeta: { flex: 1, gap: 5, justifyContent: 'center' },
    hostName: {
        fontSize: 17, fontWeight: '800',
        color: '#FFFFFF', letterSpacing: -0.3,
    },
    hostSubRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    statusPill: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: 8, borderWidth: 1,
    },
    statusDotSmall: { width: 6, height: 6, borderRadius: 3 },
    statusPillText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    hostStaffCount: {
        fontSize: 11, fontWeight: '600',
        color: C.textSecondary,
    },
    chevronBox: {
        width: 36, height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.03)',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    },
    chevronBoxActive: {
        backgroundColor: C.primaryDim,
        borderColor: C.primary + '30',
    },

    // ── Expanded body
    expandedBody: {
        paddingBottom: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.04)',
        backgroundColor: C.expandedBg,
    },
    dividerRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 14, gap: 12,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
    dividerLabel: {
        fontSize: 10, fontWeight: '900',
        color: C.textSecondary, letterSpacing: 1.5,
    },

    // ── Loading / empty / error
    loadingBox: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 10,
        paddingVertical: 28,
    },
    loadingText: { fontSize: 13, color: C.textSecondary, fontWeight: '600' },
    emptyBox: {
        alignItems: 'center', paddingVertical: 30, gap: 12,
    },
    emptyIconRadius: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    emptyText: { fontSize: 13, color: C.textSecondary, fontWeight: '600' },
    errorBox: {
        flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 40,
    },
    errorText: { fontSize: 15, color: C.textSecondary, fontWeight: '700' },
    retryBtn: {
        paddingHorizontal: 24, paddingVertical: 12,
        backgroundColor: C.primaryDim, borderRadius: 14,
        borderWidth: 1, borderColor: C.primary + '30',
    },
    retryBtnText: { color: C.primary, fontWeight: '900', fontSize: 14 },

    // ── Staff Row
    staffRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 14, paddingHorizontal: 20,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)',
        gap: 14,
    },
    staffRowLast: { borderBottomWidth: 0 },
    staffAvatar: {
        width: 40, height: 40, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1,
    },
    staffInfo: { flex: 1, gap: 4 },
    staffNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statusContainerSmall: { position: 'relative', width: 6, height: 6, justifyContent: 'center', alignItems: 'center' },
    statusGlowSmall: { position: 'absolute', width: 12, height: 12, borderRadius: 6, opacity: 0.3 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    staffName: {
        fontSize: 15, fontWeight: '800',
        color: '#FFFFFF', flex: 1, letterSpacing: -0.2,
    },
    staffMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    rolePill: {
        paddingHorizontal: 6, paddingVertical: 2,
        borderRadius: 6, borderWidth: 1,
    },
    rolePillText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
    staffPhone: { fontSize: 11, color: C.textSecondary, fontWeight: '600', fontFamily: 'monospace' },
    activeBadge: {
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 10, borderWidth: 1,
    },
    activeBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
});
