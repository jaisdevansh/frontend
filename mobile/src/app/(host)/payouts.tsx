import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStrictBack } from '../../hooks/useStrictBack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/design-system';
import { hostService } from '../../services/hostService';
import dayjs from 'dayjs';
import Svg, { Rect, Text as SvgText, Line, Defs, LinearGradient, Stop } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 48;
const CHART_HEIGHT = 200;
const BAR_RADIUS = 7;
const PLATFORM_FEE = 0.10;

// ─── Types ────────────────────────────────────────────────────────────────────
interface EventRevenue {
    eventId: string;
    event_name: string;
    total_revenue: number;
    ticket_revenue: number;
    order_revenue: number;
    total_tickets_sold: number;
    total_orders: number;
}

interface Summary {
    totalEarnings: number;
    completedPayout: number;
    eventRevenue: EventRevenue[];
}

interface Payment {
    id: string;
    memberName: string;
    plan: string;
    amount: number;
    status: 'Success' | 'Pending';
    date: string;
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
const EarningsBarChart = React.memo(({ eventRevenue }: { eventRevenue: EventRevenue[] }) => {
    if (!eventRevenue.length) {
        return (
            <View style={chartStyles.empty}>
                <Ionicons name="bar-chart-outline" size={40} color="rgba(255,255,255,0.1)" />
                <Text style={chartStyles.emptyText}>No event revenue data yet</Text>
            </View>
        );
    }

    const data = eventRevenue.slice(0, 6);
    const maxRevenue = Math.max(...data.map(e => e.total_revenue), 1);
    const barCount = data.length;
    const BAR_GROUP_W = CHART_WIDTH / barCount;
    const HALF_BAR = Math.min(BAR_GROUP_W * 0.26, 18);
    const GAP = 3;
    const BOTTOM_H = 36;
    const GRAPH_H = CHART_HEIGHT - BOTTOM_H;
    const Y_LINES = 4;

    return (
        <View>
            <View style={chartStyles.legend}>
                <View style={chartStyles.legendItem}>
                    <View style={[chartStyles.legendDot, { backgroundColor: 'rgba(124,77,255,0.7)' }]} />
                    <Text style={chartStyles.legendText}>Gross</Text>
                </View>
                <View style={chartStyles.legendItem}>
                    <View style={[chartStyles.legendDot, { backgroundColor: COLORS.emerald }]} />
                    <Text style={chartStyles.legendText}>Net (after 10% fee)</Text>
                </View>
            </View>

            <Svg width={CHART_WIDTH} height={CHART_HEIGHT + 10}>
                <Defs>
                    <LinearGradient id="gG" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor="#7C4DFF" stopOpacity="0.9" />
                        <Stop offset="1" stopColor="#7C4DFF" stopOpacity="0.2" />
                    </LinearGradient>
                    <LinearGradient id="nG" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor="#10B981" stopOpacity="0.95" />
                        <Stop offset="1" stopColor="#10B981" stopOpacity="0.3" />
                    </LinearGradient>
                </Defs>

                {/* Horizontal guide lines */}
                {Array.from({ length: Y_LINES + 1 }).map((_, i) => {
                    const y = (GRAPH_H / Y_LINES) * i;
                    const val = maxRevenue - (maxRevenue / Y_LINES) * i;
                    return (
                        <React.Fragment key={i}>
                            <Line x1={0} y1={y} x2={CHART_WIDTH} y2={y}
                                stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                            <SvgText x={2} y={y - 3} fill="rgba(255,255,255,0.25)"
                                fontSize={9} fontWeight="500">
                                {val >= 1000 ? `₹${Math.round(val / 1000)}k` : `₹${Math.round(val)}`}
                            </SvgText>
                        </React.Fragment>
                    );
                })}

                {/* Bars per event */}
                {data.map((ev, i) => {
                    const cx = BAR_GROUP_W * i + BAR_GROUP_W / 2;
                    const grossH = Math.max((ev.total_revenue / maxRevenue) * GRAPH_H, 4);
                    const netH = Math.max((ev.total_revenue * 0.9 / maxRevenue) * GRAPH_H, 4);
                    const grossX = cx - HALF_BAR - GAP / 2 - HALF_BAR;
                    const netX = cx + GAP / 2;
                    const label = ev.event_name?.split(' ')[0]?.substring(0, 7) ?? `E${i + 1}`;
                    const netVal = Math.round(ev.total_revenue * 0.9);

                    return (
                        <React.Fragment key={ev.eventId || i}>
                            <Rect x={grossX} y={GRAPH_H - grossH} width={HALF_BAR}
                                height={grossH} fill="url(#gG)" rx={BAR_RADIUS} ry={BAR_RADIUS} />
                            <Rect x={netX} y={GRAPH_H - netH} width={HALF_BAR}
                                height={netH} fill="url(#nG)" rx={BAR_RADIUS} ry={BAR_RADIUS} />
                            <SvgText x={cx} y={GRAPH_H + 16} fill="rgba(255,255,255,0.4)"
                                fontSize={9} fontWeight="600" textAnchor="middle">
                                {label}
                            </SvgText>
                            {netH > 22 && (
                                <SvgText x={netX + HALF_BAR / 2} y={GRAPH_H - netH - 5}
                                    fill="#10B981" fontSize={8} fontWeight="700" textAnchor="middle">
                                    {netVal >= 1000 ? `${Math.round(netVal / 1000)}k` : `${netVal}`}
                                </SvgText>
                            )}
                        </React.Fragment>
                    );
                })}
            </Svg>
        </View>
    );
});

EarningsBarChart.displayName = 'EarningsBarChart';

const chartStyles = StyleSheet.create({
    legend: { flexDirection: 'row', gap: 20, marginBottom: 14 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' },
    empty: { height: 160, alignItems: 'center', justifyContent: 'center', gap: 10 },
    emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 13 },
});

// ─── Tab Type ─────────────────────────────────────────────────────────────────
type Tab = 'All' | 'Success' | 'Pending';
const TABS: Tab[] = ['All', 'Success', 'Pending'];

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function InsightsPayouts() {
    const insets = useSafeAreaInsets();
    const goBack = useStrictBack('/(host)/profile');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('All');
    const [summary, setSummary] = useState<Summary>({
        totalEarnings: 0,
        completedPayout: 0,
        eventRevenue: [],
    });
    const [payments, setPayments] = useState<Payment[]>([]);

    const fetchData = useCallback(async () => {
        setError(false);
        setLoading(true);
        try {
            const [payoutRes, paymentRes] = await Promise.all([
                hostService.getPayouts(),
                hostService.getPayments(),
            ]);
            if (payoutRes.success) setSummary(payoutRes.data.summary);
            if (paymentRes.success) setPayments(paymentRes.data);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Derived values – computed once on summary change
    const { gross, fee, net, pending } = useMemo(() => {
        const g = summary.totalEarnings;
        const f = g * PLATFORM_FEE;
        return {
            gross: g,
            fee: f,
            net: g - f,
            pending: Math.max(0, (g - f) - summary.completedPayout),
        };
    }, [summary]);

    const filteredPayments = useMemo(() =>
        activeTab === 'All' ? payments : payments.filter(p => p.status === activeTab),
        [payments, activeTab]
    );

    const fmt = (n: number) => `₹${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

    // ── Loading ──
    if (loading) {
        return (
            <View style={[styles.center, { paddingTop: insets.top, backgroundColor: COLORS.background.dark }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    // ── Error ──
    if (error) {
        return (
            <View style={[styles.center, { paddingTop: insets.top, backgroundColor: COLORS.background.dark }]}>
                <Ionicons name="cloud-offline-outline" size={56} color="rgba(255,255,255,0.15)" />
                <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 12 }}>Failed to load insights</Text>
                <TouchableOpacity
                    style={{ marginTop: 20, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
                    onPress={fetchData}
                >
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={goBack}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Insights & Payouts</Text>
                <TouchableOpacity style={styles.backBtn} onPress={fetchData}>
                    <Ionicons name="refresh-outline" size={20} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews
            >
                {/* ── Hero: Net Earnings ── */}
                <View style={styles.heroCard}>
                    <View style={styles.heroRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.heroLabel}>NET EARNINGS</Text>
                            <Text style={styles.heroValue}>{fmt(net)}</Text>
                            <Text style={styles.heroSub}>After 10% platform fee deduction</Text>
                        </View>
                        <View style={styles.feeBox}>
                            <Ionicons name="remove-circle" size={14} color="#ef4444" />
                            <Text style={styles.feeText}>{fmt(fee)}</Text>
                            <Text style={styles.feeLabel}>Platform Fee</Text>
                        </View>
                    </View>
                </View>

                {/* ── Stats Row ── */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Gross Revenue</Text>
                        <Text style={styles.statValue}>{fmt(gross)}</Text>
                    </View>
                    <View style={[styles.statCard, { borderColor: 'rgba(212,175,55,0.4)' }]}>
                        <Text style={styles.statLabel}>Pending</Text>
                        <Text style={[styles.statValue, { color: COLORS.gold }]}>{fmt(pending)}</Text>
                    </View>
                    <View style={[styles.statCard, { borderColor: 'rgba(16,185,129,0.4)' }]}>
                        <Text style={styles.statLabel}>Paid Out</Text>
                        <Text style={[styles.statValue, { color: COLORS.emerald }]}>{fmt(summary.completedPayout)}</Text>
                    </View>
                </View>

                {/* ── Revenue Chart ── */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Revenue by Event</Text>
                    <Text style={styles.sectionSub}>Purple = Gross · Green = Real Income</Text>
                    <EarningsBarChart eventRevenue={summary.eventRevenue} />
                </View>

                {/* ── Per-Event Table ── */}
                {summary.eventRevenue.length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Per-Event Breakdown</Text>
                        {summary.eventRevenue.slice(0, 8).map((ev, i) => (
                            <View
                                key={ev.eventId || i}
                                style={[
                                    styles.tableRow,
                                    i === Math.min(summary.eventRevenue.length, 8) - 1 && { borderBottomWidth: 0 }
                                ]}
                            >
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={styles.tableEventName} numberOfLines={1}>{ev.event_name}</Text>
                                    <Text style={styles.tableSubInfo}>
                                        {ev.total_tickets_sold} tickets · {ev.total_orders} orders
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.tableNet}>{fmt(ev.total_revenue * 0.9)}</Text>
                                    <Text style={styles.tableGross}>Gross {fmt(ev.total_revenue)}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* ── Filter Tabs ── */}
                <View style={styles.tabBar}>
                    {TABS.map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tab, activeTab === tab && styles.activeTab]}
                            onPress={() => setActiveTab(tab)}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Payments List ── */}
                <View style={styles.listContainer}>
                    <Text style={styles.sectionTitle}>Member Payments</Text>
                    {filteredPayments.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="receipt-outline" size={44} color="rgba(255,255,255,0.08)" />
                            <Text style={styles.emptyText}>No transactions found</Text>
                        </View>
                    ) : (
                        filteredPayments.map((item, index) => {
                            const netPay = Math.round(item.amount * 0.9);
                            const isSuccess = item.status === 'Success';
                            return (
                                <View key={item.id || index} style={styles.paymentCard}>
                                    <View style={styles.paymentMain}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.memberName}>{item.memberName}</Text>
                                            <Text style={styles.planName}>{item.plan}</Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={styles.amountGross}>₹{item.amount}</Text>
                                            <Text style={styles.amountNet}>₹{netPay}</Text>
                                            <View style={[
                                                styles.statusBadge,
                                                { backgroundColor: isSuccess ? 'rgba(16,185,129,0.1)' : 'rgba(212,175,55,0.1)' }
                                            ]}>
                                                <Text style={[styles.statusText, { color: isSuccess ? COLORS.emerald : COLORS.gold }]}>
                                                    {item.status}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                    <Text style={styles.date}>{dayjs(item.date).format('MMM DD, YYYY • hh:mm A')}</Text>
                                </View>
                            );
                        })
                    )}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background.dark },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    },
    backBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: '700' },
    scrollContent: { padding: 20 },

    // Hero
    heroCard: {
        backgroundColor: 'rgba(16,185,129,0.07)',
        borderRadius: 20, borderWidth: 1.5,
        borderColor: 'rgba(16,185,129,0.25)',
        padding: 20, marginBottom: 14,
    },
    heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
    heroLabel: { color: COLORS.emerald, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
    heroValue: { color: '#fff', fontSize: 32, fontWeight: '900', marginBottom: 4 },
    heroSub: { color: 'rgba(255,255,255,0.35)', fontSize: 11 },
    feeBox: {
        alignItems: 'center', backgroundColor: 'rgba(239,68,68,0.08)',
        padding: 12, borderRadius: 12, borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.15)', gap: 2,
    },
    feeText: { color: '#ef4444', fontSize: 15, fontWeight: '800' },
    feeLabel: { color: 'rgba(239,68,68,0.55)', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },

    // Stats
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    statCard: {
        flex: 1, backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 14, padding: 12,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    },
    statLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 },
    statValue: { color: 'white', fontSize: 13, fontWeight: '800' },

    // Cards
    card: {
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 20, borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        padding: 20, marginBottom: 14,
    },
    sectionTitle: { color: 'white', fontSize: 16, fontWeight: '800', marginBottom: 4 },
    sectionSub: { color: 'rgba(255,255,255,0.3)', fontSize: 11, marginBottom: 18 },

    // Table
    tableRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    tableEventName: { color: 'white', fontSize: 13, fontWeight: '700', marginBottom: 2 },
    tableSubInfo: { color: 'rgba(255,255,255,0.35)', fontSize: 11 },
    tableNet: { color: COLORS.emerald, fontSize: 14, fontWeight: '800' },
    tableGross: { color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 2 },

    // Tabs
    tabBar: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 4, marginBottom: 14 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    activeTab: { backgroundColor: COLORS.primary },
    tabText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '600' },
    activeTabText: { color: 'white' },

    // Payment cards
    listContainer: { gap: 10 },
    paymentCard: {
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    },
    paymentMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    memberName: { color: 'white', fontSize: 15, fontWeight: '700' },
    planName: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
    amountGross: { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '500', textDecorationLine: 'line-through' },
    amountNet: { color: '#fff', fontSize: 17, fontWeight: '800' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4 },
    statusText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
    date: { color: 'rgba(255,255,255,0.3)', fontSize: 11 },
    emptyState: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { color: 'rgba(255,255,255,0.2)', marginTop: 12, fontSize: 14 },
});
