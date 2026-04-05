import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStrictBack } from '../../hooks/useStrictBack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { hostService } from '../../services/hostService';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '@/utils/date-utils';

export default function TicketHistory() {
    const insets = useSafeAreaInsets();
    const goBack = useStrictBack('/(host)/support');
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tickets, setTickets] = useState<any[]>([]);

    const fetchTickets = async () => {
        try {
            const res = await hostService.getTickets();
            if (res.success) {
                setTickets(res.data);
            }
        } catch (error) {
            showToast('Failed to load tickets', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchTickets();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Open': return '#007AFF';
            case 'In Progress': return COLORS.gold;
            case 'Resolved': return COLORS.emerald;
            case 'Closed': return 'rgba(255,255,255,0.3)';
            default: return 'white';
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Ticket History</Text>
                <View style={{ width: 44 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
                    }
                >
                    {tickets.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="receipt-outline" size={60} color="rgba(255,255,255,0.05)" />
                            <Text style={styles.emptyText}>No tickets raised yet</Text>
                        </View>
                    ) : (
                        tickets.map((ticket) => (
                            <View key={ticket._id} style={styles.ticketCard}>
                                <View style={styles.cardHeader}>
                                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(ticket.status)}20`, borderColor: getStatusColor(ticket.status) }]}>
                                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(ticket.status) }]} />
                                        <Text style={[styles.statusText, { color: getStatusColor(ticket.status) }]}>{ticket.status}</Text>
                                    </View>
                                    <Text style={styles.date}>{formatDate(ticket.createdAt)}</Text>
                                </View>

                                <Text style={styles.subject}>{ticket.subject}</Text>
                                <Text style={styles.description} numberOfLines={2}>{ticket.description}</Text>

                                <View style={styles.cardFooter}>
                                    <View style={styles.categoryBadge}>
                                        <Text style={styles.categoryText}>{ticket.category || 'Support'}</Text>
                                    </View>
                                    <TouchableOpacity style={styles.viewBtn}>
                                        <Text style={styles.viewBtnText}>View Details</Text>
                                        <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background.dark,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.lg,
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
        paddingBottom: 40,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ticketCard: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    date: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 12,
    },
    subject: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    description: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 16,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    categoryBadge: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    categoryText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontWeight: '600',
    },
    viewBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    viewBtnText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '700',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
    },
    emptyText: {
        color: 'rgba(255,255,255,0.2)',
        fontSize: 16,
        marginTop: 16,
    }
});
