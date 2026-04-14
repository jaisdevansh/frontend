import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStrictBack } from '../../hooks/useStrictBack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { hostService } from '../../services/hostService';
import dayjs from 'dayjs';

export default function PayoutHistory() {
    const insets = useSafeAreaInsets();
    const goBack = useStrictBack('/(host)/profile');

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'All' | 'Success' | 'Pending'>('All');
    const [summary, setSummary] = useState({
        totalEarnings: 0,
        pendingPayout: 0,
        completedPayout: 0
    });
    const [payments, setPayments] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [payoutRes, paymentRes] = await Promise.all([
                hostService.getPayouts(),
                hostService.getPayments()
            ]);

            if (payoutRes.success) setSummary(payoutRes.data.summary);
            if (paymentRes.success) setPayments(paymentRes.data);
        } catch (error) {
            // Silent error
        } finally {
            setLoading(false);
        }
    };

    const filteredPayments = payments.filter(p => {
        if (activeTab === 'All') return true;
        return p.status === activeTab;
    });

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Payout History</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Stats Summary */}
                <View style={styles.summaryGrid}>
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryLabel}>Total Earnings</Text>
                        <Text style={styles.summaryValue}>₹{summary.totalEarnings.toLocaleString()}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <View style={[styles.summaryCard, { flex: 1 }]}>
                            <Text style={styles.summaryLabel}>Pending</Text>
                            <Text style={[styles.summaryValue, { fontSize: 18, color: COLORS.gold }]}>
                                ₹{summary.pendingPayout.toLocaleString()}
                            </Text>
                        </View>
                        <View style={[styles.summaryCard, { flex: 1, marginLeft: 12 }]}>
                            <Text style={styles.summaryLabel}>Completed</Text>
                            <Text style={[styles.summaryValue, { fontSize: 18, color: COLORS.emerald }]}>
                                ₹{summary.completedPayout.toLocaleString()}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Filter Tabs */}
                <View style={styles.tabBar}>
                    {['All', 'Success', 'Pending'].map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tab, activeTab === tab && styles.activeTab]}
                            onPress={() => setActiveTab(tab as any)}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Payment List */}
                <View style={styles.listContainer}>
                    <Text style={styles.sectionTitle}>Member Payments</Text>
                    {filteredPayments.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="receipt-outline" size={48} color="rgba(255,255,255,0.1)" />
                            <Text style={styles.emptyText}>No transactions found</Text>
                        </View>
                    ) : (
                        filteredPayments.map((item, index) => (
                            <View key={item.id || index} style={styles.paymentCard}>
                                <View style={styles.paymentMain}>
                                    <View>
                                        <Text style={styles.memberName}>{item.memberName}</Text>
                                        <Text style={styles.planName}>{item.plan}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.amount}>₹{item.amount}</Text>
                                        <View style={[
                                            styles.statusBadge,
                                            { backgroundColor: item.status === 'Success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(212, 175, 55, 0.1)' }
                                        ]}>
                                            <Text style={[
                                                styles.statusText,
                                                { color: item.status === 'Success' ? COLORS.emerald : COLORS.gold }
                                            ]}>
                                                {item.status}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                <Text style={styles.date}>{dayjs(item.date).format('MMM DD, YYYY • hh:mm A')}</Text>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background.dark,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: COLORS.background.dark,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
    },
    scrollContent: {
        padding: SPACING.lg,
    },
    summaryGrid: {
        gap: 12,
        marginBottom: SPACING.xl,
    },
    summaryRow: {
        flexDirection: 'row',
    },
    summaryCard: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    summaryLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    summaryValue: {
        color: 'white',
        fontSize: 28,
        fontWeight: '800',
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        padding: 4,
        marginBottom: SPACING.lg,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: COLORS.primary,
    },
    tabText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 14,
        fontWeight: '600',
    },
    activeTabText: {
        color: 'white',
    },
    listContainer: {
        gap: 12,
    },
    sectionTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 8,
    },
    paymentCard: {
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    paymentMain: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    memberName: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    planName: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 13,
        marginTop: 2,
    },
    amount: {
        color: 'white',
        fontSize: 18,
        fontWeight: '800',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginTop: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    date: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 11,
        fontWeight: '500',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        color: 'rgba(255,255,255,0.2)',
        marginTop: 12,
        fontSize: 14,
    }
});
