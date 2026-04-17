import React, { useMemo, useCallback } from 'react';
import {
    View, Text, StyleSheet, ActivityIndicator,
    TouchableOpacity, Dimensions, RefreshControl, SectionList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { hostService } from '../../services/hostService';
import { Image } from 'expo-image';
import dayjs from 'dayjs';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const C = {
    bg: '#000000',
    card: '#0a0a0f',
    cardBorder: 'rgba(255,255,255,0.07)',
    primary: '#6C63FF',
    green: '#10B981',
    amber: '#F59E0B',
    rose: '#F43F5E',
    blue: '#3B82F6',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.5)',
    textMuted: 'rgba(255,255,255,0.2)',
};

// ── STATUS COLOR ──────────────────────────────────────────────────────────────
function statusColor(status: string) {
    if (status === 'Success' || status === 'paid') return C.green;
    if (status === 'Pending' || status === 'pending') return C.amber;
    return C.rose;
}

// ── SUMMARY CARD ──────────────────────────────────────────────────────────────
const SummaryCard = React.memo(({ label, value, icon, color, sub }: any) => (
    <View style={[styles.summaryCard, { borderColor: color + '18' }]}>
        <LinearGradient
            colors={[color + '22', 'transparent']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />
        <View style={[styles.summaryIcon, { backgroundColor: color + '18' }]}>
            <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.summaryValue}>{value}</Text>
        <Text style={styles.summaryLabel}>{label}</Text>
        {sub ? <Text style={[styles.summarySub, { color }]}>{sub}</Text> : null}
    </View>
));

// ── PAYMENT ROW ───────────────────────────────────────────────────────────────
const PaymentRow = React.memo(({ item, isLast }: { item: any; isLast: boolean }) => {
    const sc = statusColor(item.status);
    return (
        <View style={[styles.row, isLast && { borderBottomWidth: 0 }]}>
            {item.memberImage ? (
                <Image source={{ uri: item.memberImage }} style={styles.avatar} contentFit="cover" />
            ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                    <Ionicons name="person" size={16} color={C.textMuted} />
                </View>
            )}
            <View style={styles.rowInfo}>
                <Text style={styles.rowName} numberOfLines={1}>{item.memberName || 'Guest'}</Text>
                <Text style={styles.rowSub}>{item.plan || 'Standard'} · {dayjs(item.date).format('DD MMM, hh:mm A')}</Text>
            </View>
            <View style={styles.rowRight}>
                <Text style={styles.rowAmount}>₹{(item.amount || 0).toLocaleString()}</Text>
                <View style={[styles.statusPill, { backgroundColor: sc + '18', borderColor: sc + '30' }]}>
                    <Text style={[styles.statusText, { color: sc }]}>{item.status || 'Pending'}</Text>
                </View>
            </View>
        </View>
    );
});

// ── ORDER ROW ─────────────────────────────────────────────────────────────────
const OrderRow = React.memo(({ item, isLast }: { item: any; isLast: boolean }) => {
    const sc = statusColor(item.status);
    const items: string[] = (item.items || []).map((i: any) => i.name || i.itemName || '').filter(Boolean);
    return (
        <View style={[styles.row, isLast && { borderBottomWidth: 0 }]}>
            <View style={[styles.orderIcon, { backgroundColor: C.amber + '14' }]}>
                <MaterialCommunityIcons name="silverware-fork-knife" size={18} color={C.amber} />
            </View>
            <View style={styles.rowInfo}>
                <Text style={styles.rowName} numberOfLines={1}>
                    {items.length > 0 ? items.join(', ') : 'Order'}
                </Text>
                <Text style={styles.rowSub}>{dayjs(item.createdAt).format('DD MMM, hh:mm A')}</Text>
            </View>
            <View style={styles.rowRight}>
                <Text style={styles.rowAmount}>₹{(item.totalAmount || item.total || 0).toLocaleString()}</Text>
                <View style={[styles.statusPill, { backgroundColor: sc + '18', borderColor: sc + '30' }]}>
                    <Text style={[styles.statusText, { color: sc }]}>{item.status || 'Pending'}</Text>
                </View>
            </View>
        </View>
    );
});

// ── SECTION HEADER ────────────────────────────────────────────────────────────
const SectionHeader = ({ title, count }: { title: string; count: number }) => (
    <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.countBadge}>
            <Text style={styles.countText}>{count}</Text>
        </View>
    </View>
);

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
export default function PaymentsScreen() {
    const router = useRouter();

    const { data: paymentsRes, isLoading: l1, refetch: r1 } = useQuery({
        queryKey: ['hostPayments'],
        queryFn: async () => {
            const res = await hostService.getPayments();
            return res?.data || [];
        },
        staleTime: 2 * 60 * 1000,
        retry: false,
    });

    const { data: payoutsRes, isLoading: l2, refetch: r2 } = useQuery({
        queryKey: ['hostPayouts'],
        queryFn: async () => {
            const res = await hostService.getPayouts();
            return res?.data || { history: [], summary: { totalEarnings: 0, pendingPayout: 0, completedPayout: 0 } };
        },
        staleTime: 2 * 60 * 1000,
        retry: false,
    });

    const { data: ordersRes, isLoading: l3, refetch: r3 } = useQuery({
        queryKey: ['hostOrders'],
        queryFn: async () => {
            const res = await hostService.getOrders();
            return res?.data || [];
        },
        staleTime: 2 * 60 * 1000,
        retry: false,
    });

    const isLoading = l1 || l2 || l3;
    const onRefresh = useCallback(async () => { await Promise.all([r1(), r2(), r3()]); }, [r1, r2, r3]);

    const payments: any[] = Array.isArray(paymentsRes) ? paymentsRes : [];
    const orders: any[] = Array.isArray(ordersRes) ? ordersRes : [];
    const summary = payoutsRes?.summary || { totalEarnings: 0, pendingPayout: 0, completedPayout: 0 };
    const payoutHistory: any[] = payoutsRes?.history || [];

    const totalTicketRevenue = useMemo(() => payments.filter(p => p.status === 'Success').reduce((s, p) => s + (p.amount || 0), 0), [payments]);
    const totalOrderRevenue = useMemo(() => orders.filter(o => o.status === 'delivered' || o.status === 'completed').reduce((s, o) => s + (o.totalAmount || o.total || 0), 0), [orders]);
    const totalRevenue = totalTicketRevenue + totalOrderRevenue;
    const pendingPayments = payments.filter(p => p.status === 'Pending').length;

    // Build Production-Grade SectionList Data Strategy
    const sections = useMemo(() => {
        const s = [
            {
                type: 'payments',
                title: 'Ticket Payments',
                data: payments.length > 0 ? payments : [{ _isEmpty: true, msg: 'No ticket payments yet', icon: 'ticket-outline' as const }]
            },
            {
                type: 'orders',
                title: 'Food & Drink Orders',
                data: orders.length > 0 ? orders : [{ _isEmpty: true, msg: 'No food orders yet', icon: 'silverware-fork-knife' as const }]
            }
        ];
        if (payoutHistory.length > 0) {
            s.push({ type: 'payouts', title: 'Payout History', data: payoutHistory });
        }
        return s;
    }, [payments, orders, payoutHistory]);

    if (isLoading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={styles.loadingText}>Loading financial data…</Text>
            </SafeAreaView>
        );
    }

    const ListHeader = (
        <View style={styles.listHeaderPadding}>
            <Text style={styles.overviewTitle}>Financial Overview</Text>
            <View style={styles.summaryGrid}>
                <SummaryCard label="Total Revenue" value={`₹${totalRevenue.toLocaleString()}`} icon="wallet-outline" color={C.green} sub={`↑ Tickets + Orders`} />
                <SummaryCard label="Ticket Revenue" value={`₹${totalTicketRevenue.toLocaleString()}`} icon="ticket-outline" color={C.primary} sub={`${payments.filter(p => p.status === 'Success').length} bookings`} />
                <SummaryCard label="Order Revenue" value={`₹${totalOrderRevenue.toLocaleString()}`} icon="restaurant-outline" color={C.amber} sub={`${orders.length} orders`} />
                <SummaryCard label="Pending Payout" value={`₹${(summary.pendingPayout || 0).toLocaleString()}`} icon="time-outline" color={C.rose} sub={pendingPayments > 0 ? `${pendingPayments} pending` : 'All settled'} />
            </View>
            {summary.totalEarnings > 0 && (
                <View style={styles.earningsBar}>
                    <LinearGradient colors={['#10B98118', 'transparent']} style={StyleSheet.absoluteFillObject} />
                    <View style={styles.earningsBarRow}>
                        <View>
                            <Text style={styles.earningsBarLabel}>TOTAL EARNINGS</Text>
                            <Text style={styles.earningsBarValue}>₹{summary.totalEarnings.toLocaleString()}</Text>
                        </View>
                        <View style={styles.earnDivider} />
                        <View>
                            <Text style={styles.earningsBarLabel}>SETTLED</Text>
                            <Text style={[styles.earningsBarValue, { color: C.green }]}>₹{(summary.completedPayout || 0).toLocaleString()}</Text>
                        </View>
                        <View style={styles.earnDivider} />
                        <View>
                            <Text style={styles.earningsBarLabel}>PENDING</Text>
                            <Text style={[styles.earningsBarValue, { color: C.amber }]}>₹{(summary.pendingPayout || 0).toLocaleString()}</Text>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );

    const renderItem = ({ item, index, section }: any) => {
        if (item._isEmpty) {
            return (
                <View style={styles.emptyBox}>
                    {section.type === 'orders' 
                        ? <MaterialCommunityIcons name={item.icon} size={36} color={C.textMuted} />
                        : <Ionicons name={item.icon} size={36} color={C.textMuted} />}
                    <Text style={styles.emptyText}>{item.msg}</Text>
                </View>
            );
        }

        const isFirst = index === 0;
        const isLast = index === section.data.length - 1;

        let ChildNode;
        if (section.type === 'payments') {
            ChildNode = <PaymentRow item={item} isLast={isLast} />;
        } else if (section.type === 'orders') {
            ChildNode = <OrderRow item={item} isLast={isLast} />;
        } else {
            const sc = statusColor(item.status || 'Pending');
            ChildNode = (
                <View style={[styles.row, isLast && { borderBottomWidth: 0 }]}>
                    <View style={[styles.orderIcon, { backgroundColor: C.green + '14' }]}>
                        <Ionicons name="card-outline" size={18} color={C.green} />
                    </View>
                    <View style={styles.rowInfo}>
                        <Text style={styles.rowName}>{item.method || 'Bank Transfer'}</Text>
                        <Text style={styles.rowSub}>{dayjs(item.date || item.createdAt).format('DD MMM YYYY')}</Text>
                    </View>
                    <View style={styles.rowRight}>
                        <Text style={[styles.rowAmount, { color: C.green }]}>₹{(item.amount || 0).toLocaleString()}</Text>
                        <View style={[styles.statusPill, { backgroundColor: sc + '18', borderColor: sc + '30' }]}>
                            <Text style={[styles.statusText, { color: sc }]}>{item.status || 'Pending'}</Text>
                        </View>
                    </View>
                </View>
            );
        }

        return (
            <View style={[
                styles.listItemWrapper,
                isFirst && styles.listItemFirst,
                isLast && styles.listItemLast,
            ]}>
                {ChildNode}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Nav Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={22} color="white" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Payments & Revenue</Text>
                    <Text style={styles.headerSub}>{dayjs().format('MMM YYYY')} · Live Data</Text>
                </View>
                <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} activeOpacity={0.7}>
                    <Ionicons name="refresh" size={18} color={C.primary} />
                </TouchableOpacity>
            </View>

            {/* Virtualized Section List */}
            <SectionList
                sections={sections}
                keyExtractor={(item, index) => item._id || item.id || String(index)}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={ListHeader}
                renderSectionHeader={({ section }) => (
                    <SectionHeader title={section.title} count={section.data[0]?._isEmpty ? 0 : section.data.length} />
                )}
                renderItem={renderItem}
                ListFooterComponent={<View style={{ height: 60 }} />}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    loadingContainer: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 16 },
    loadingText: { color: C.textSecondary, fontSize: 14, fontWeight: '600' },

    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
        gap: 14,
    },
    backBtn: {
        width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center',
    },
    headerCenter: { flex: 1 },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: -0.4 },
    headerSub: { color: C.primary, fontSize: 11, fontWeight: '700', marginTop: 2, letterSpacing: 0.5 },
    refreshBtn: {
        width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(108,99,255,0.1)',
        borderWidth: 1, borderColor: 'rgba(108,99,255,0.2)', alignItems: 'center', justifyContent: 'center',
    },

    scrollContent: { paddingHorizontal: 20, paddingTop: 24 },
    listHeaderPadding: { marginBottom: 12 },

    overviewTitle: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: -0.2, marginBottom: 14 },
    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
    summaryCard: { width: (width - 52) / 2, backgroundColor: C.card, borderRadius: 20, borderWidth: 1, padding: 18, overflow: 'hidden' },
    summaryIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    summaryValue: { color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 4, letterSpacing: -0.5 },
    summaryLabel: { color: C.textSecondary, fontSize: 12, fontWeight: '700' },
    summarySub: { fontSize: 11, fontWeight: '700', marginTop: 4 },

    earningsBar: {
        backgroundColor: C.card, borderRadius: 20, padding: 20, marginBottom: 24,
        borderWidth: 1, borderColor: C.green + '18', overflow: 'hidden',
    },
    earningsBarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    earningsBarLabel: { color: C.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
    earningsBarValue: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: -0.4 },
    earnDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.08)' },

    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, marginTop: 8 },
    sectionTitle: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: -0.2 },
    countBadge: { backgroundColor: 'rgba(108,99,255,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    countText: { color: C.primary, fontSize: 12, fontWeight: '900' },

    // Seamless Section Item Containers
    listItemWrapper: {
        backgroundColor: C.card,
        borderLeftWidth: 1, borderRightWidth: 1,
        borderLeftColor: C.cardBorder, borderRightColor: C.cardBorder,
    },
    listItemFirst: {
        borderTopWidth: 1, borderTopColor: C.cardBorder,
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
    },
    listItemLast: {
        borderBottomWidth: 1, borderBottomColor: C.cardBorder,
        borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
        marginBottom: 24, // spacing between groups
    },

    row: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 14, paddingHorizontal: 16,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
        gap: 12,
    },
    avatar: { width: 42, height: 42, borderRadius: 14 },
    avatarFallback: { backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
    orderIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    rowInfo: { flex: 1 },
    rowName: { color: '#fff', fontSize: 14, fontWeight: '800', marginBottom: 3 },
    rowSub: { color: C.textSecondary, fontSize: 11, fontWeight: '500' },
    rowRight: { alignItems: 'flex-end', gap: 5 },
    rowAmount: { color: '#fff', fontSize: 15, fontWeight: '900' },
    statusPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
    statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },

    emptyBox: { alignItems: 'center', paddingVertical: 36, gap: 10, marginBottom: 24, backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.cardBorder },
    emptyText: { color: C.textSecondary, fontSize: 14, fontWeight: '600' },
});
