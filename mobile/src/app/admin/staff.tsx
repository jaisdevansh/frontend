import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, StatusBar, Animated
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import adminService, { AdminHost, AdminStaff } from '../../services/adminService';
import { DashboardSkeleton } from '../../components/admin/AdminSkeleton';

const C = {
    bg: '#050508',
    card: '#0d0d12',
    cardBorder: 'rgba(255, 255, 255, 0.06)',
    expandedBg: '#07070b',
    primary: '#6C63FF',
    primaryDim: 'rgba(108, 99, 255, 0.15)',
    gold: '#F5A623',
    goldDim: 'rgba(245, 166, 35, 0.12)',
    success: '#00E5A0',
    successDim: 'rgba(0, 229, 160, 0.12)',
    danger: '#FF4E6A',
    dangerDim: 'rgba(255, 78, 106, 0.12)',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.45)',
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
const StaffRow = React.memo(({ staff, isLast }: { staff: AdminStaff; isLast: boolean }) => {
    const rc = getRoleConfig(staff.staffType || staff.role);
    return (
        <View style={[styles.staffRow, isLast && styles.staffRowLast]}>
            {/* Avatar */}
            <View style={[styles.staffAvatar, { backgroundColor: rc.bg, borderColor: rc.color + '30' }]}>
                <MaterialIcons name={rc.icon as any} size={16} color={rc.color} />
            </View>

            {/* Info */}
            <View style={styles.staffInfo}>
                <View style={styles.staffNameRow}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(staff.isActive) }]} />
                    <Text style={styles.staffName} numberOfLines={1}>{staff.name}</Text>
                </View>
                <View style={styles.staffMeta}>
                    <View style={[styles.rolePill, { backgroundColor: rc.bg }]}>
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
                borderColor: staff.isActive ? C.success + '30' : C.danger + '30',
            }]}>
                <Text style={[styles.activeBadgeText, { color: staff.isActive ? C.success : C.danger }]}>
                    {staff.isActive ? 'LIVE' : 'OFF'}
                </Text>
            </View>
        </View>
    );
});

// ── HOST CARD ──────────────────────────────────────────────────────────────
const HostCard = React.memo(({ host, index }: { host: AdminHost; index: number }) => {
    const [isExpanded, setIsExpanded] = useState(false);

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

    return (
        <View style={styles.hostCard}>
            {/* Subtle left accent line */}
            <View style={[styles.cardAccent, { backgroundColor: statusColor }]} />

            {/* HEADER — tap to expand */}
            <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => setIsExpanded(v => !v)}
                style={styles.cardHeader}
            >
                {/* Avatar */}
                <LinearGradient
                    colors={['rgba(108,99,255,0.35)', 'rgba(108,99,255,0.1)']}
                    style={styles.hostAvatar}
                >
                    <Text style={styles.hostInitials}>{initials}</Text>
                </LinearGradient>

                {/* Name + meta */}
                <View style={styles.hostMeta}>
                    <Text style={styles.hostName} numberOfLines={1}>{host.name}</Text>
                    <View style={styles.hostSubRow}>
                        {/* Status pill */}
                        <View style={[styles.statusPill, { backgroundColor: statusColor + '18', borderColor: statusColor + '35' }]}>
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
                        size={22}
                        color={isExpanded ? C.primary : C.textSecondary}
                    />
                </View>
            </TouchableOpacity>

            {/* EXPANDED BODY */}
            {isExpanded && (
                <View style={styles.expandedBody}>
                    {/* Divider with label */}
                    <View style={styles.dividerRow}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerLabel}>PERSONNEL</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {isLoading ? (
                        <View style={styles.loadingBox}>
                            <ActivityIndicator color={C.primary} size="small" />
                            <Text style={styles.loadingText}>Fetching personnel…</Text>
                        </View>
                    ) : staffList.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <MaterialIcons name="group-off" size={32} color={C.textMuted} />
                            <Text style={styles.emptyText}>No personnel assigned</Text>
                        </View>
                    ) : (
                        staffList.map((s, i) => (
                            <StaffRow key={s._id} staff={s} isLast={i === staffList.length - 1} />
                        ))
                    )}
                </View>
            )}
        </View>
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
        <View style={[styles.container, { backgroundColor: C.bg }]}>
            <StatusBar barStyle="light-content" backgroundColor={C.bg} />

            {/* HEADER */}
            <LinearGradient
                colors={[C.bg, 'rgba(5,5,8,0)']}
                style={[styles.header, { paddingTop: insets.top + 16 }]}
            >
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={20} color="#FFF" />
                </TouchableOpacity>

                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Staff Registry</Text>
                    <Text style={styles.headerSub}>
                        {isLoading ? 'Loading…' : `${hosts.length} venue${hosts.length !== 1 ? 's' : ''}`}
                    </Text>
                </View>

                <View style={styles.refreshBtn}>
                    <TouchableOpacity onPress={() => refetch()}>
                        <Ionicons name="refresh" size={20} color={C.primary} />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* BODY */}
            {isLoading ? (
                <DashboardSkeleton />
            ) : isError ? (
                <View style={styles.errorBox}>
                    <MaterialIcons name="wifi-off" size={40} color={C.danger} />
                    <Text style={styles.errorText}>Failed to load host registry</Text>
                    <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
                        <Text style={styles.retryBtnText}>Retry</Text>
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
                    estimatedItemSize={88}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 40 }}
                    showsVerticalScrollIndicator={false}
                    onRefresh={refetch}
                    refreshing={isLoading}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    // ── Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 20,
        gap: 12,
        zIndex: 10,
    },
    backBtn: {
        width: 40, height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerContent: { flex: 1 },
    headerTitle: {
        fontSize: 22, fontWeight: '900',
        color: '#FFFFFF', letterSpacing: -0.3,
    },
    headerSub: {
        fontSize: 11, fontWeight: '700',
        color: C.primary, marginTop: 2,
        textTransform: 'uppercase', letterSpacing: 1.5,
    },
    refreshBtn: {
        width: 40, height: 40,
        borderRadius: 12,
        backgroundColor: C.primaryDim,
        borderWidth: 1, borderColor: C.primary + '25',
        justifyContent: 'center', alignItems: 'center',
    },

    // ── Host Card
    hostCard: {
        backgroundColor: C.card,
        borderRadius: 18,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: C.cardBorder,
        overflow: 'hidden',
        flexDirection: 'column',
    },
    cardAccent: {
        position: 'absolute',
        left: 0, top: 14, bottom: 14,
        width: 3,
        borderRadius: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingLeft: 22,
        paddingVertical: 16,
        gap: 14,
    },
    hostAvatar: {
        width: 46, height: 46,
        borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(108,99,255,0.3)',
    },
    hostInitials: {
        fontSize: 17, fontWeight: '900',
        color: '#FFFFFF', letterSpacing: 1,
    },
    hostMeta: { flex: 1, gap: 6 },
    hostName: {
        fontSize: 16, fontWeight: '800',
        color: '#FFFFFF', letterSpacing: -0.2,
    },
    hostSubRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statusPill: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 20, borderWidth: 1,
    },
    statusDotSmall: { width: 5, height: 5, borderRadius: 3 },
    statusPillText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
    hostStaffCount: {
        fontSize: 10, fontWeight: '600',
        color: C.textSecondary,
    },
    chevronBox: {
        width: 32, height: 32,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.04)',
        justifyContent: 'center', alignItems: 'center',
    },
    chevronBoxActive: {
        backgroundColor: C.primaryDim,
        borderWidth: 1, borderColor: C.primary + '25',
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
        paddingHorizontal: 16, paddingVertical: 10, gap: 8,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
    dividerLabel: {
        fontSize: 9, fontWeight: '800',
        color: C.textMuted, letterSpacing: 1.5,
    },

    // ── Loading / empty / error
    loadingBox: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 10,
        paddingVertical: 24,
    },
    loadingText: { fontSize: 13, color: C.textSecondary, fontWeight: '500' },
    emptyBox: {
        alignItems: 'center', paddingVertical: 28, gap: 8,
    },
    emptyText: { fontSize: 13, color: C.textMuted, fontWeight: '600' },
    errorBox: {
        flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12,
    },
    errorText: { fontSize: 14, color: C.textSecondary, fontWeight: '600' },
    retryBtn: {
        paddingHorizontal: 24, paddingVertical: 10,
        backgroundColor: C.primaryDim, borderRadius: 12,
        borderWidth: 1, borderColor: C.primary + '30',
    },
    retryBtnText: { color: C.primary, fontWeight: '800', fontSize: 13 },

    // ── Staff Row
    staffRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 12, paddingHorizontal: 16,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)',
        gap: 12,
    },
    staffRowLast: { borderBottomWidth: 0 },
    staffAvatar: {
        width: 38, height: 38, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1,
    },
    staffInfo: { flex: 1, gap: 5 },
    staffNameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    staffName: {
        fontSize: 14, fontWeight: '700',
        color: '#FFFFFF', flex: 1,
    },
    staffMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    rolePill: {
        paddingHorizontal: 7, paddingVertical: 2,
        borderRadius: 6,
    },
    rolePillText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
    staffPhone: { fontSize: 10, color: C.textSecondary, fontWeight: '500' },
    activeBadge: {
        paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: 8, borderWidth: 1,
    },
    activeBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
});
