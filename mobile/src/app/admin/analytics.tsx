import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, Dimensions, Animated, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import adminService, { AdminSummary, RevenueTrend } from '../../services/adminService';


const { width } = Dimensions.get('window');

const COLORS = {
    primary: '#3b82f6',
    bg: '#000000',
    card: '#080808',
    border: 'rgba(255,255,255,0.06)',
    textWhite: '#ffffff',
    textDim: '#a0a0a0',
    success: '#10B981',
    danger: '#F43F5E',
};

const NeonButton = ({ children, onPress, style }: any) => {
    const scale = new Animated.Value(1);
    
    const handlePressIn = () => {
        Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
    };
    const handlePressOut = () => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    };

    return (
        <Animated.View style={[{ transform: [{ scale }] }, style]}>
            <Pressable 
                onPressIn={handlePressIn} 
                onPressOut={handlePressOut} 
                onPress={onPress}
                style={({ pressed }) => [
                    styles.neonBtnBase,
                    pressed && { opacity: 0.9 }
                ]}
            >
                {children}
            </Pressable>
        </Animated.View>
    );
};

const TrendBar = React.memo(({ item, maxVal }: { item: RevenueTrend, maxVal: number }) => {

    const heightPercent = maxVal > 0 ? (item.revenue / maxVal) * 100 : 0;
    const dateObj = new Date(item.date);
    const dateLabel = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });

    return (
        <View style={styles.chartCol}>
            <View style={[styles.chartBarWrapper, { height: `${Math.max(heightPercent, 8)}%` as any }]}>
                {/* Glow Layer */}
                <View style={[styles.chartBarFill, { backgroundColor: COLORS.primary, opacity: 0.8 }]} />
                <View style={[styles.chartBarFill, { backgroundColor: COLORS.primary, opacity: 0.3, transform: [{ scaleX: 1.5 }] }]} />
            </View>
            <Text style={styles.chartLabel}>{dateLabel}</Text>
        </View>
    );
});

const RotatingIcon = ({ isFetching }: { isFetching: boolean }) => {
    const rotation = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (isFetching) {
            Animated.loop(
                Animated.timing(rotation, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                })
            ).start();
        } else {
            Animated.timing(rotation, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [isFetching]);

    const spin = rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <MaterialIcons name="refresh" size={20} color="#FFF" />
        </Animated.View>
    );
};

export default function AnalyticsScreen() {
    const insets = useSafeAreaInsets();

    const { data: summary, isLoading: sumLoading, refetch: refetchSum } = useQuery({
        queryKey: ['admin-summary'],
        queryFn: adminService.getSummary,
    });

    const { data: trend, isLoading: trendLoading, refetch: refetchTrend } = useQuery({
        queryKey: ['admin-revenue-trend'],
        queryFn: adminService.getRevenueTrend,
    });

    const maxTrendVal = useMemo(() => {
        if (!trend || trend.length === 0) return 0;
        const revenues = trend.map((t: RevenueTrend) => t.revenue || 0);

        return Math.max(0, ...revenues);
    }, [trend]);

    const formatCurr = (val?: number) => `₹${(val || 0).toLocaleString()}`;

    const queryClient = useQueryClient();
    const handleRefresh = async () => {
        // High-performance invalidation for real-time sync
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['admin-summary'] }),
            queryClient.invalidateQueries({ queryKey: ['admin-revenue-trend'] })
        ]);
    };

    const isDataFetching = sumLoading || trendLoading;

    if (sumLoading && !summary) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.centerBox}><ActivityIndicator size="large" color={COLORS.primary} /></View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" />

            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>System Intelligence</Text>
                    <Text style={styles.subtitle}>Real-time fiscal reporting</Text>
                </View>
                <NeonButton onPress={handleRefresh} style={styles.refreshBtn} disabled={isDataFetching}>
                    <RotatingIcon isFetching={isDataFetching} />
                </NeonButton>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* KPI Cards */}
                <View style={styles.statGrid}>
                    <View style={styles.statCard}>
                        <View style={styles.statIconBox}><MaterialIcons name="account-balance-wallet" size={20} color={COLORS.primary} /></View>
                        <Text style={styles.statLabel}>Net Revenue</Text>
                        <Text style={styles.statValue}>{formatCurr(summary?.totalRevenue)}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}><MaterialIcons name="confirmation-number" size={20} color={COLORS.success} /></View>
                        <Text style={styles.statLabel}>Ticket Sales</Text>
                        <Text style={styles.statValue}>{formatCurr(summary?.ticketRevenue)}</Text>
                    </View>
                </View>

                {/* Trend Chart */}
                <View style={styles.chartCard}>
                    <View style={styles.chartHeader}>
                        <Text style={styles.sectionTitle} numberOfLines={1} adjustsFontSizeToFit>Volume Over Time</Text>
                        <View style={styles.liveBadge}><View style={styles.pulseDot} /><Text style={styles.liveText}>HYPER-SYNCED</Text></View>
                    </View>

                    {trendLoading ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartBars}>
                            {(trend || []).map((item: RevenueTrend) => (
                                <TrendBar key={item.date} item={item} maxVal={maxTrendVal} />
                            ))}

                        </ScrollView>
                    )}
                </View>

                {/* Performance Radar */}
                <View style={styles.conversionCard}>
                    <View style={styles.metaRow}>
                        <Text style={styles.sectionTitle}>Conversion Efficiency</Text>
                        <Text style={styles.percentText}>{Math.round(((summary?.deliveredOrders || 0) / (summary?.totalOrders || 1)) * 100)}%</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${((summary?.deliveredOrders || 0) / (summary?.totalOrders || 1)) * 100}%` }]} />
                    </View>
                    <View style={styles.conversionMeta}>
                        <View style={styles.metaItem}><View style={[styles.dot, { backgroundColor: COLORS.success }]} /><Text style={styles.metaLabel}>{summary?.deliveredOrders || 0} Successful</Text></View>
                        <View style={styles.metaItem}><View style={[styles.dot, { backgroundColor: COLORS.danger }]} /><Text style={styles.metaLabel}>{summary?.rejectedOrders || 0} Revoked</Text></View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 26, fontWeight: '900', color: COLORS.textWhite },
    subtitle: { fontSize: 13, color: COLORS.textDim, marginTop: 4, fontWeight: '600' },
    refreshBtn: { width: 44, height: 44, borderRadius: 12, overflow: 'hidden' },
    neonBtnBase: { width: '100%', height: '100%', backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 5 },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },
    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    
    // Cards
    statGrid: { flexDirection: 'row', gap: 16, marginBottom: 24 },
    statCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 28, padding: 20, borderWidth: 1, borderColor: COLORS.border },
    statIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(59, 130, 246, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    statLabel: { color: COLORS.textDim, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2 },
    statValue: { color: COLORS.textWhite, fontSize: 22, fontWeight: '900', marginTop: 4 },

    // Chart
    chartCard: { backgroundColor: COLORS.card, borderRadius: 32, borderWidth: 1, borderColor: COLORS.border, padding: 24, marginBottom: 24 },
    chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, gap: 10 },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: COLORS.textWhite, flex: 1, flexShrink: 1 },
    liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(59, 130, 246, 0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },
    liveText: { color: COLORS.primary, fontSize: 10, fontWeight: '900' },
    chartBars: { flexDirection: 'row', height: 180, alignItems: 'flex-end', gap: 20, paddingRight: 40 },
    chartCol: { alignItems: 'center', gap: 12, height: '100%', justifyContent: 'flex-end', width: 14 },
    chartBarWrapper: { width: '100%', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderTopLeftRadius: 10, borderTopRightRadius: 10, overflow: 'hidden' },
    chartBarFill: { ...StyleSheet.absoluteFillObject },
    chartLabel: { fontSize: 10, fontWeight: '800', color: COLORS.textDim, transform: [{ rotate: '-45deg' }], marginTop: 10 },

    // Conversion
    conversionCard: { backgroundColor: COLORS.card, borderRadius: 32, borderWidth: 1, borderColor: COLORS.border, padding: 24 },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    percentText: { color: COLORS.success, fontSize: 24, fontWeight: '900' },
    progressBarBg: { width: '100%', height: 10, backgroundColor: '#111', borderRadius: 5, marginTop: 24, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 5 },
    conversionMeta: { flexDirection: 'row', gap: 24, marginTop: 20 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    metaLabel: { color: COLORS.textDim, fontSize: 12, fontWeight: '700' },
});
