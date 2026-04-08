import React, { useMemo, useState, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, StatusBar, Dimensions, Animated, RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import adminService, { AdminSummary, RevenueTrend, TopItem, TopUser } from '../../services/adminService';
import { Image } from 'expo-image';
import Svg, { Path, Rect, G, Text as SvgText, Line, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
    bg: '#020206',
    card: '#0d0d14',
    cardBorder: 'rgba(255,255,255,0.06)',
    primary: '#6366f1',
    accent: '#818cf8',
    success: '#10b981',
    danger: '#f43f5e',
    amber: '#f59e0b',
    cyan: '#06b6d4',
    white: '#ffffff',
    dim: '#8890a6',
    muted: '#383850',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (v?: number) => {
    if (v == null) return '₹0';
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
    return `₹${v.toLocaleString()}`;
};

const fmtShort = (v: number) => {
    if (v >= 100000) return `${(v / 100000).toFixed(0)}L`;
    if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
    return `${Math.round(v)}`;
};

// ─── Pulse Dot ───────────────────────────────────────────────────────────────
const PulseDot = () => {
    const scale = useRef(new Animated.Value(1)).current;
    React.useEffect(() => {
        Animated.loop(Animated.sequence([
            Animated.timing(scale, { toValue: 1.8, duration: 700, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])).start();
    }, []);
    return (
        <View style={{ width: 10, height: 10, justifyContent: 'center', alignItems: 'center' }}>
            <Animated.View style={{ position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary, opacity: 0.4, transform: [{ scale }] }} />
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.primary }} />
        </View>
    );
};

// ─── Refresh Button ───────────────────────────────────────────────────────────
const RefreshBtn = ({ onPress, loading }: { onPress: () => void; loading: boolean }) => {
    const rot = useRef(new Animated.Value(0)).current;
    const animRef = useRef<Animated.CompositeAnimation | null>(null);
    React.useEffect(() => {
        if (loading) {
            animRef.current = Animated.loop(Animated.timing(rot, { toValue: 1, duration: 900, useNativeDriver: true }));
            animRef.current.start();
        } else {
            animRef.current?.stop();
            rot.setValue(0);
        }
    }, [loading]);
    const spin = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.refreshBtn}>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <MaterialIcons name="refresh" size={20} color={C.white} />
            </Animated.View>
        </TouchableOpacity>
    );
};

// ─── SVG Line+Area Chart ─────────────────────────────────────────────────────
const LineAreaChart = ({ data }: { data: { value: number; label: string }[] }) => {
    const W = Math.max(width - 96, data.length * 32);
    const H = 150;
    const padL = 40, padR = 24, padT = 16, padB = 36;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;
    const maxVal = Math.max(...data.map(d => d.value), 1);

    const pts = data.map((d, i) => ({
        x: padL + (i / (data.length - 1 || 1)) * chartW,
        y: padT + chartH - (d.value / maxVal) * chartH,
    }));

    // Smooth path (cardinal spline approximation)
    let linePath = '';
    let areaPath = '';
    if (pts.length > 1) {
        linePath = `M ${pts[0].x} ${pts[0].y}`;
        for (let i = 1; i < pts.length; i++) {
            const prev = pts[i - 1];
            const curr = pts[i];
            const cpx = (prev.x + curr.x) / 2;
            linePath += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
        }
        areaPath = linePath + ` L ${pts[pts.length - 1].x},${padT + chartH} L ${pts[0].x},${padT + chartH} Z`;
    }

    // Y-axis labels
    const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
        y: padT + chartH - f * chartH,
        label: fmtShort(f * maxVal),
    }));

    // X labels — show every Nth so they don't overlap
    const every = Math.ceil(data.length / 7);

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Svg width={W} height={H}>
                <Defs>
                    <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={C.primary} stopOpacity={0.35} />
                        <Stop offset="1" stopColor={C.primary} stopOpacity={0} />
                    </LinearGradient>
                </Defs>

                {/* Grid lines */}
                {ticks.map((t, i) => (
                    <G key={i}>
                        <Line x1={padL} y1={t.y} x2={W - padR} y2={t.y} stroke={C.muted + '40'} strokeWidth={1} />
                        <SvgText x={padL - 6} y={t.y + 4} fontSize={9} fill={C.dim} textAnchor="end">{t.label}</SvgText>
                    </G>
                ))}

                {/* Area fill */}
                {areaPath ? <Path d={areaPath} fill="url(#areaGrad)" /> : null}

                {/* Line */}
                {linePath ? <Path d={linePath} stroke={C.primary} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}

                {/* Data points + x labels */}
                {pts.map((p, i) => (
                    <G key={i}>
                        {i % every === 0 && (
                            <SvgText x={p.x} y={H - 4} fontSize={9} fill={C.dim} textAnchor="middle">
                                {data[i].label}
                            </SvgText>
                        )}
                        {data.length <= 20 && (
                            <>
                                <Circle cx={p.x} cy={p.y} r={5} fill={C.card} />
                                <Circle cx={p.x} cy={p.y} r={3} fill={C.accent} />
                            </>
                        )}
                    </G>
                ))}
            </Svg>
        </ScrollView>
    );
};

// ─── SVG Bar Chart ─────────────────────────────────────────────────────────────
const BarChartSvg = ({ data }: { data: { value: number; label: string }[] }) => {
    const barW = 18;
    const gap = 12;
    const padL = 40, padR = 16, padT = 16, padB = 36;
    const H = 150;
    const W = Math.max(width - 96, padL + data.length * (barW + gap) + padR);
    const chartH = H - padT - padB;
    const maxVal = Math.max(...data.map(d => d.value), 1);
    const every = Math.ceil(data.length / 7);

    const ticks = [0, 0.5, 1].map(f => ({
        y: padT + chartH - f * chartH,
        label: fmtShort(f * maxVal),
    }));

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Svg width={W} height={H}>
                <Defs>
                    <LinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={C.primary} stopOpacity={1} />
                        <Stop offset="1" stopColor={C.accent} stopOpacity={0.7} />
                    </LinearGradient>
                </Defs>

                {ticks.map((t, i) => (
                    <G key={i}>
                        <Line x1={padL} y1={t.y} x2={W - padR} y2={t.y} stroke={C.muted + '40'} strokeWidth={1} />
                        <SvgText x={padL - 6} y={t.y + 4} fontSize={9} fill={C.dim} textAnchor="end">{t.label}</SvgText>
                    </G>
                ))}

                {data.map((d, i) => {
                    const x = padL + i * (barW + gap);
                    const barH = Math.max((d.value / maxVal) * chartH, 3);
                    const y = padT + chartH - barH;
                    return (
                        <G key={i}>
                            <Rect x={x} y={y} width={barW} height={barH} rx={4} fill="url(#barGrad)" />
                            {i % every === 0 && (
                                <SvgText x={x + barW / 2} y={H - 4} fontSize={9} fill={C.dim} textAnchor="middle">
                                    {d.label}
                                </SvgText>
                            )}
                        </G>
                    );
                })}
            </Svg>
        </ScrollView>
    );
};

// ─── SVG Donut Chart ──────────────────────────────────────────────────────────
const DonutChart = ({ segments, total, label }: { segments: { value: number; color: string; name: string }[]; total: number; label: string }) => {
    const R = 60, r = 40, cx = 80, cy = 80;
    const totalVal = segments.reduce((a, s) => a + s.value, 0) || 1;

    let currentAngle = -Math.PI / 2;
    const paths = segments.map(seg => {
        const angle = (seg.value / totalVal) * 2 * Math.PI;
        const x1 = cx + R * Math.cos(currentAngle);
        const y1 = cy + R * Math.sin(currentAngle);
        const x2 = cx + R * Math.cos(currentAngle + angle);
        const y2 = cy + R * Math.sin(currentAngle + angle);
        const xi1 = cx + r * Math.cos(currentAngle + angle);
        const yi1 = cy + r * Math.sin(currentAngle + angle);
        const xi2 = cx + r * Math.cos(currentAngle);
        const yi2 = cy + r * Math.sin(currentAngle);
        const large = angle > Math.PI ? 1 : 0;
        const d = `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${xi1} ${yi1} A ${r} ${r} 0 ${large} 0 ${xi2} ${yi2} Z`;
        currentAngle += angle;
        return { d, color: seg.color };
    });

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
            <Svg width={160} height={160}>
                {paths.map((p, i) => <Path key={i} d={p.d} fill={p.color} />)}
                <Circle cx={cx} cy={cy} r={r - 2} fill={C.card} />
                <SvgText x={cx} y={cy - 6} fontSize={14} fontWeight="bold" fill={C.white} textAnchor="middle">{label}</SvgText>
                <SvgText x={cx} y={cy + 10} fontSize={10} fill={C.dim} textAnchor="middle">Total</SvgText>
            </Svg>
            <View style={{ flex: 1, gap: 14 }}>
                {segments.map((seg, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: seg.color }} />
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: C.dim, fontSize: 11, fontWeight: '700' }}>{seg.name}</Text>
                            <Text style={{ color: C.white, fontWeight: '900', fontSize: 16 }}>{fmt(seg.value)}</Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
};

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionTitle = ({ title, badge }: { title: string; badge?: string }) => (
    <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {badge && (
            <View style={styles.liveBadge}>
                <PulseDot />
                <Text style={styles.liveText}>{badge}</Text>
            </View>
        )}
    </View>
);

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, color }: any) => (
    <View style={[styles.kpiCard]}>
        <View style={[styles.kpiIconBox, { backgroundColor: color + '1a' }]}>
            <MaterialCommunityIcons name={icon} size={18} color={color} />
        </View>
        <Text style={styles.kpiLabel}>{label}</Text>
        <Text style={[styles.kpiValue, { color }]}>{value}</Text>
    </View>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AnalyticsScreen() {
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();
    const { role } = useAuth();
    const [chartMode, setChartMode] = useState<'line' | 'bar'>('line');
    const [refreshing, setRefreshing] = useState(false);
    
    // Check if user is admin (hide food/staff/live orders cards)
    const isAdmin = role?.toLowerCase() === 'admin';

    const { data: summary, isLoading: sumLoading } = useQuery({
        queryKey: ['admin-summary'],
        queryFn: adminService.getSummary,
        staleTime: 2 * 60 * 1000,
    });
    const { data: trend, isLoading: trendLoading } = useQuery({
        queryKey: ['admin-revenue-trend'],
        queryFn: adminService.getRevenueTrend,
        staleTime: 5 * 60 * 1000,
    });
    const { data: topUsers, isLoading: usersLoading } = useQuery({
        queryKey: ['admin-top-users'],
        queryFn: adminService.getTopUsers,
        staleTime: 10 * 60 * 1000,
    });
    const { data: topItems, isLoading: itemsLoading } = useQuery({
        queryKey: ['admin-top-items'],
        queryFn: adminService.getTopItems,
        staleTime: 10 * 60 * 1000,
    });

    const isFetching = sumLoading || trendLoading || usersLoading || itemsLoading;

    const handleRefresh = async () => {
        setRefreshing(true);
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['admin-summary'] }),
            queryClient.invalidateQueries({ queryKey: ['admin-revenue-trend'] }),
            queryClient.invalidateQueries({ queryKey: ['admin-top-users'] }),
            queryClient.invalidateQueries({ queryKey: ['admin-top-items'] }),
        ]);
        setRefreshing(false);
    };

    // ── Trend data ──
    const trendData = useMemo(() => {
        if (!trend || trend.length === 0) return [];
        return (trend as RevenueTrend[]).map(t => {
            const d = new Date(t.date);
            return { value: t.revenue || 0, label: `${d.getDate()}/${d.getMonth() + 1}` };
        });
    }, [trend]);

    // ── Pie segments ──
    const pieSegments = useMemo(() => [
        { value: summary?.ticketRevenue || 0, color: C.primary, name: 'Ticket Sales' },
        { value: summary?.orderRevenue || 0, color: C.success, name: 'Food Orders' },
    ], [summary]);

    // ── Conversion ──
    const convRate = useMemo(() => {
        const d = summary?.deliveredOrders || 0;
        const t = summary?.totalOrders || 1;
        return Math.round((d / t) * 100);
    }, [summary]);

    if (sumLoading && !summary) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <StatusBar barStyle="light-content" />
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={{ color: C.dim, marginTop: 16, fontSize: 14, fontWeight: '600' }}>Crunching numbers...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Analytics</Text>
                    <Text style={styles.headerSub}>Real-time business intelligence</Text>
                </View>
                <RefreshBtn onPress={handleRefresh} loading={isFetching} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />}
            >
                {/* ── KPI Cards ── */}
                <View style={{ gap: 10, marginBottom: 20 }}>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <KpiCard icon="cash-multiple" label="Net Revenue" value={fmt(summary?.totalRevenue)} color={C.success} />
                        <KpiCard icon="ticket-confirmation" label="Tickets" value={fmt(summary?.ticketRevenue)} color={C.amber} />
                    </View>
                    {/* Only show Food/Staff/Live Orders for Host role */}
                    {!isAdmin && (
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <KpiCard icon="food" label="Food Rev" value={fmt(summary?.orderRevenue)} color={C.primary} />
                            <KpiCard icon="account-group" label="Staff" value={`${summary?.activeStaff || 0}`} color={C.accent} />
                            <KpiCard icon="clock-fast" label="Live Orders" value={`${summary?.liveOrders || 0}`} color={C.cyan} />
                        </View>
                    )}
                </View>

                {/* ── Revenue Trend ── */}
                <View style={styles.card}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <SectionTitle title="Revenue Trend" badge="30-DAY" />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16 }}>
                        <View style={styles.toggleRow}>
                            <TouchableOpacity onPress={() => setChartMode('line')} style={[styles.toggleBtn, chartMode === 'line' && styles.toggleActive]}>
                                <Ionicons name="analytics" size={14} color={chartMode === 'line' ? C.white : C.dim} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setChartMode('bar')} style={[styles.toggleBtn, chartMode === 'bar' && styles.toggleActive]}>
                                <Ionicons name="bar-chart" size={14} color={chartMode === 'bar' ? C.white : C.dim} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {trendLoading ? (
                        <ActivityIndicator color={C.primary} style={{ marginVertical: 40 }} />
                    ) : trendData.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <Ionicons name="bar-chart-outline" size={40} color={C.muted} />
                            <Text style={styles.emptyText}>No revenue data yet</Text>
                        </View>
                    ) : chartMode === 'line' ? (
                        <LineAreaChart data={trendData} />
                    ) : (
                        <BarChartSvg data={trendData} />
                    )}
                </View>

                {/* ── Revenue Split Donut ── */}
                <View style={styles.card}>
                    <SectionTitle title="Revenue Split" />
                    <View style={{ marginTop: 20 }}>
                        {(summary?.totalRevenue || 0) === 0 ? (
                            <View style={styles.emptyBox}>
                                <Ionicons name="pie-chart-outline" size={40} color={C.muted} />
                                <Text style={styles.emptyText}>No revenue data yet</Text>
                            </View>
                        ) : (
                            <DonutChart
                                segments={pieSegments}
                                total={summary?.totalRevenue || 0}
                                label={fmt(summary?.totalRevenue)}
                            />
                        )}
                    </View>
                </View>

                {/* ── Conversion Rate ── */}
                <View style={styles.card}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <SectionTitle title="Conversion Rate" />
                        <Text style={[styles.bigPct, { color: convRate >= 70 ? C.success : convRate >= 40 ? C.amber : C.danger }]}>
                            {convRate}%
                        </Text>
                    </View>
                    <View style={styles.progressBg}>
                        <View style={[styles.progressFill, {
                            width: `${convRate}%`,
                            backgroundColor: convRate >= 70 ? C.success : convRate >= 40 ? C.amber : C.danger,
                        }]} />
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 14 }}>
                        {[
                            { label: 'Fulfilled', val: summary?.deliveredOrders || 0, color: C.success },
                            { label: 'Cancelled', val: summary?.rejectedOrders || 0, color: C.danger },
                            { label: 'Pending', val: Math.max(0, (summary?.totalOrders || 0) - (summary?.deliveredOrders || 0) - (summary?.rejectedOrders || 0)), color: C.amber },
                        ].map(item => (
                            <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color }} />
                                <Text style={{ color: C.dim, fontSize: 12, fontWeight: '700' }}>{item.val} {item.label}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* ── Top Customers ── */}
                <View style={styles.card}>
                    <SectionTitle title="Top Customers" />
                    {usersLoading ? (
                        <ActivityIndicator color={C.primary} style={{ marginVertical: 24 }} />
                    ) : !topUsers || topUsers.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <Ionicons name="person-outline" size={36} color={C.muted} />
                            <Text style={styles.emptyText}>No customer data yet</Text>
                        </View>
                    ) : (
                        <View style={{ marginTop: 20, gap: 16 }}>
                            {(topUsers as TopUser[]).map((user, idx) => (
                                <View key={user.id} style={styles.listRow}>
                                    <Text style={styles.rankBadge}>#{idx + 1}</Text>
                                    <Image
                                        source={{ uri: user.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=161622&color=818cf8&bold=true` }}
                                        style={styles.avatar}
                                        contentFit="cover"
                                    />
                                    <Text style={styles.listName} numberOfLines={1}>{user.name}</Text>
                                    <Text style={styles.listAmt}>{fmt(user.totalSpent)}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* ── Top Menu Items ── */}
                <View style={styles.card}>
                    <SectionTitle title="Top Menu Items" />
                    {itemsLoading ? (
                        <ActivityIndicator color={C.primary} style={{ marginVertical: 24 }} />
                    ) : !topItems || topItems.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <Ionicons name="fast-food-outline" size={36} color={C.muted} />
                            <Text style={styles.emptyText}>No sales data yet</Text>
                        </View>
                    ) : (
                        <View style={{ marginTop: 20, gap: 16 }}>
                            {(topItems as TopItem[]).map((item, idx) => {
                                const maxSold = Math.max(...(topItems as TopItem[]).map(i => i.totalSold));
                                const pct = maxSold > 0 ? (item.totalSold / maxSold) : 0;
                                return (
                                    <View key={item.name}>
                                        <View style={styles.listRow}>
                                            <View style={[styles.trendIcon, { backgroundColor: idx === 0 ? C.primary + '22' : C.muted + '22' }]}>
                                                <Ionicons name={idx === 0 ? 'trophy' : 'trending-up'} size={14} color={idx === 0 ? C.accent : C.success} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.listName} numberOfLines={1}>{item.name}</Text>
                                                <Text style={{ color: C.dim, fontSize: 11, fontWeight: '600', marginTop: 2 }}>{item.totalSold} sold</Text>
                                            </View>
                                            <Text style={styles.listAmt}>{fmt(item.revenue)}</Text>
                                        </View>
                                        <View style={{ height: 3, backgroundColor: C.muted + '30', borderRadius: 2, marginTop: 8, marginLeft: 50 }}>
                                            <View style={{ height: 3, width: `${pct * 100}%`, backgroundColor: C.primary, borderRadius: 2 }} />
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },

    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24,
    },
    headerTitle: { fontSize: 28, fontWeight: '900', color: C.white, letterSpacing: -0.5 },
    headerSub: { fontSize: 13, color: C.dim, marginTop: 3, fontWeight: '600' },
    refreshBtn: {
        width: 44, height: 44, borderRadius: 14, backgroundColor: C.card,
        borderWidth: 1, borderColor: C.cardBorder, justifyContent: 'center', alignItems: 'center',
    },

    kpiCard: {
        flex: 1, backgroundColor: C.card, borderRadius: 18, padding: 14,
        borderWidth: 1, borderColor: C.cardBorder,
    },
    kpiIconBox: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    kpiLabel: { color: C.dim, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
    kpiValue: { fontSize: 18, fontWeight: '900', marginTop: 3 },

    card: {
        backgroundColor: C.card, borderRadius: 22, borderWidth: 1, borderColor: C.cardBorder,
        padding: 22, marginBottom: 14,
    },

    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    sectionTitle: { fontSize: 17, fontWeight: '900', color: C.white },
    liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.primary + '18', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    liveText: { color: C.accent, fontSize: 10, fontWeight: '900' },

    toggleRow: { flexDirection: 'row', backgroundColor: C.bg, borderRadius: 10, padding: 3, gap: 2, borderWidth: 1, borderColor: C.cardBorder },
    toggleBtn: { width: 32, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    toggleActive: { backgroundColor: C.primary },

    progressBg: { width: '100%', height: 8, backgroundColor: C.muted + '30', borderRadius: 4, marginTop: 14, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 4 },
    bigPct: { fontSize: 26, fontWeight: '900' },

    listRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rankBadge: { width: 22, color: C.dim, fontSize: 12, fontWeight: '900', textAlign: 'center' },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.muted + '40' },
    listName: { flex: 1, color: C.white, fontSize: 14, fontWeight: '800' },
    listAmt: { color: C.success, fontSize: 14, fontWeight: '900' },
    trendIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

    emptyBox: { alignItems: 'center', paddingVertical: 32, gap: 10 },
    emptyText: { color: C.dim, fontSize: 13, fontWeight: '600' },
});
