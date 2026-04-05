import React, { memo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../../services/analyticsService';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');

// Memoized Stat Card
const StatCard = memo(({ label, value, icon, color }: any) => (
    <View style={styles.statCard}>
        <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
            <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
));

export default function AnalyticsDashboard() {
    const router = useRouter();

    const { data: summaryRes, isLoading: l1 } = useQuery({ queryKey: ['analytics_summary'], queryFn: analyticsService.getSummary });
    const { data: topItemsRes, isLoading: l2 } = useQuery({ queryKey: ['analytics_items'], queryFn: analyticsService.getTopItems });
    const { data: topUsersRes, isLoading: l3 } = useQuery({ queryKey: ['analytics_users'], queryFn: analyticsService.getTopUsers });
    const { data: trendRes, isLoading: l4 } = useQuery({ queryKey: ['analytics_trend'], queryFn: analyticsService.getRevenueTrend });

    const isLoading = l1 || l2 || l3 || l4;

    if (isLoading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
            </SafeAreaView>
        );
    }

    const s = summaryRes?.data || { totalRevenue: 0, ticketRevenue: 0, orderRevenue: 0, totalOrders: 0 };
    const items = topItemsRes?.data || [];
    const users = topUsersRes?.data || [];
    const trends = trendRes?.data || [];

    // Derive max daily revenue for simple bar chart renderer
    const maxRev = trends.length ? Math.max(...trends.map((t: any) => t.revenue)) : 1;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.title}>Payment & Orders Analytics</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* 1. Dashboard UI Summary Cards */}
                <Text style={styles.sectionTitle}>Overview Insights</Text>
                <View style={styles.statsContainer}>
                    <View style={styles.statsRow}>
                        <StatCard label="Total Revenue" value={`₹${s.totalRevenue.toLocaleString()}`} icon="wallet" color="#10B981" />
                        <StatCard label="Ticket Revenue" value={`₹${s.ticketRevenue.toLocaleString()}`} icon="ticket" color="#8B5CF6" />
                    </View>
                    <View style={styles.statsRow}>
                        <StatCard label="Order Revenue" value={`₹${s.orderRevenue.toLocaleString()}`} icon="restaurant" color="#F59E0B" />
                        <StatCard label="Total Orders" value={s.totalOrders.toLocaleString()} icon="stats-chart" color="#3B82F6" />
                    </View>
                </View>

                {/* 2. Revenue Trend Simple Bar Chart */}
                {trends.length > 0 && (
                    <View style={styles.chartSection}>
                        <Text style={styles.sectionTitle}>30-Day Revenue Trend</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroll}>
                            {trends.map((t: any, i: number) => {
                                const heightPercent = Math.max((t.revenue / maxRev) * 100, 5); // Ensure min height 5%
                                return (
                                    <View key={i} style={styles.chartCol}>
                                        <Text style={styles.chartValue} numberOfLines={1}>
                                            {t.revenue > 1000 ? `${(t.revenue/1000).toFixed(1)}k` : t.revenue}
                                        </Text>
                                        <View style={[styles.barContainer, { height: 100 }]}>
                                            <View style={[styles.barFill, { height: `${heightPercent}%` }]} />
                                        </View>
                                        <Text style={styles.chartDate}>{t.date.split('-')[2]}</Text>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                {/* 3. Top Items List */}
                {items.length > 0 && (
                    <View style={styles.listSection}>
                        <Text style={styles.sectionTitle}>Top Selling Items</Text>
                        <View style={styles.cardBox}>
                            {items.map((item: any, i: number) => (
                                <View key={i} style={styles.listItem}>
                                    <View style={styles.rankBadge}>
                                        <Text style={styles.rankText}>#{i+1}</Text>
                                    </View>
                                    <View style={styles.itemInfo}>
                                        <Text style={styles.itemName}>{item.name}</Text>
                                        <Text style={styles.itemSub}>{item.totalSold} sold</Text>
                                    </View>
                                    <Text style={styles.itemRevenue}>₹{item.revenue.toLocaleString()}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* 4. Top Users (Highest Spenders) */}
                {users.length > 0 && (
                    <View style={styles.listSection}>
                        <Text style={styles.sectionTitle}>Top Spending VIPs</Text>
                        <View style={styles.cardBox}>
                            {users.map((u: any, i: number) => (
                                <View key={u.id || i} style={[styles.listItem, { borderBottomWidth: i === users.length -1 ? 0 : 1 }]}>
                                    <Image source={{ uri: u.profileImage || 'https://via.placeholder.com/150' }} style={styles.userAvatar} />
                                    <View style={styles.itemInfo}>
                                        <Text style={styles.itemName}>{u.name}</Text>
                                    </View>
                                    <Text style={styles.userSpent}>₹{u.totalSpent.toLocaleString()}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                <View style={{ height: 60 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0C16' },
    loadingContainer: { flex: 1, backgroundColor: '#0A0C16', alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    title: { color: 'white', fontSize: 18, fontWeight: '700' },
    
    scrollContent: { padding: 20 },
    sectionTitle: { color: 'white', fontSize: 18, fontWeight: '800', marginBottom: 16, marginTop: 10 },
    
    // Stats Dashboard UI rules - Pixel perfect to existing
    statsContainer: { gap: 12, marginBottom: 24 },
    statsRow: { flexDirection: 'row', gap: 12 },
    statCard: { flex: 1, backgroundColor: '#161A2B', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    statValue: { color: 'white', fontSize: 24, fontWeight: '800', marginBottom: 4 },
    statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },

    // Chart
    chartSection: { marginBottom: 24 },
    chartScroll: { gap: 16, paddingRight: 20, paddingBottom: 10, paddingTop: 10 },
    chartCol: { alignItems: 'center', width: 40 },
    chartValue: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginBottom: 4 },
    barContainer: { width: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
    barFill: { width: '100%', backgroundColor: '#8B5CF6', borderRadius: 4 },
    chartDate: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 6 },

    // Lists
    listSection: { marginBottom: 24 },
    cardBox: { backgroundColor: '#131521', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)', padding: 10 },
    listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    rankBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(139, 92, 246, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    rankText: { color: '#8B5CF6', fontSize: 13, fontWeight: '800' },
    itemInfo: { flex: 1 },
    itemName: { color: 'white', fontSize: 15, fontWeight: '700' },
    itemSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2, fontWeight: '600' },
    itemRevenue: { color: '#10B981', fontSize: 16, fontWeight: '800' },
    
    userAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: '#161A2B' },
    userSpent: { color: '#F59E0B', fontSize: 16, fontWeight: '800' },
});
