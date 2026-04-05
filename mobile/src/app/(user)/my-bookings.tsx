import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import SafeFlashList from '../../components/SafeFlashList';
const FlashList = SafeFlashList;
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { userService } from '../../services/userService';
import { useToast } from '../../context/ToastContext';
import dayjs from 'dayjs';
import { thumb } from '../../services/cloudinaryService';
import apiClient from '../../services/apiClient';

type Tab = 'upcoming' | 'past' | 'orders';

const ORDER_STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
    pending:    { color: '#FBBF24', bg: 'rgba(251,191,36,0.12)',   label: 'PENDING'    },
    confirmed:  { color: '#34D399', bg: 'rgba(52,211,153,0.12)',   label: 'CONFIRMED'  },
    preparing:  { color: '#FB923C', bg: 'rgba(251,146,60,0.12)',   label: 'PREPARING'  },
    ready:      { color: '#818CF8', bg: 'rgba(129,140,248,0.12)',  label: 'READY'      },
    delivered:  { color: '#34D399', bg: 'rgba(52,211,153,0.10)',   label: 'COMPLETED'  },
    completed:  { color: '#34D399', bg: 'rgba(52,211,153,0.10)',   label: 'COMPLETED'  },
    cancelled:  { color: '#FF4D4F', bg: 'rgba(255,77,79,0.10)',    label: 'CANCELLED'  },
};

export default function MyBookings() {
    const router = useRouter();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<Tab>('upcoming');
    const [loading, setLoading] = useState(true);
    const [allBookings, setAllBookings] = useState<any[]>([]);

    const [orders, setOrders] = useState<any[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    
    const params = useLocalSearchParams<{ tab?: Tab }>();

    React.useEffect(() => {
        if (params.tab && ['upcoming', 'past', 'orders'].includes(params.tab)) {
            setActiveTab(params.tab as Tab);
        }
    }, [params.tab]);

    useFocusEffect(
        useCallback(() => {
            let active = true;
            const fetchBookings = async () => {
                try {
                    setLoading(true);
                    const res = await userService.getMyBookings();
                    if (res.success && res.data && active) setAllBookings(res.data);
                } catch (error: any) {
                    // silently fail in production
                } finally {
                    if (active) setLoading(false);
                }
            };
            const fetchOrders = async () => {
                try {
                    setLoadingOrders(true);
                    const res = await apiClient.get('/user/orders/my');
                    if (res.data?.success && active) setOrders(res.data.data || []);
                } catch { } // silent on orders
                finally { if (active) setLoadingOrders(false); }
            };

            fetchBookings();
            fetchOrders();
            return () => { active = false; };
        }, [])
    );

    const getStatusGroup = useCallback((booking: any) => {
        if (['cancelled', 'rejected'].includes(booking.status)) return 'cancelled';
        if (['completed', 'checked_in'].includes(booking.status)) return 'past';
        if (booking.eventId?.date && dayjs(booking.eventId.date).endOf('day').isBefore(dayjs())) return 'past';
        return 'upcoming';
    }, []);

    const upcomingBookings = useMemo(() => allBookings.filter(b => getStatusGroup(b) === 'upcoming'), [allBookings, getStatusGroup]);
    const pastBookings = useMemo(() => allBookings.filter(b => getStatusGroup(b) === 'past'), [allBookings, getStatusGroup]);

    const displayedData = useMemo(() => 
        activeTab === 'upcoming' ? upcomingBookings : 
        activeTab === 'past' ? pastBookings : 
        orders,
    [activeTab, upcomingBookings, pastBookings, orders]);

    const navigateToBooking = useCallback((booking: any) => {
        const event = booking.eventId || {};
        router.push({
            pathname: '/(user)/table-pass',
            params: {
                bookingId:  booking._id,
                title:      event.title || 'Private Event',
                venueName:  event.venue?.name || booking.hostId?.name || 'Exclusive Venue',
                coverImage: event.coverImage || booking.hostId?.profileImage || '',
                zone:       booking.ticketType || 'Reservation',
                timeSlot:   event.startTime || dayjs(booking.createdAt).format('hh:mm A'),
                guestCount: String(booking.guests || 2),
                seatIds:    booking.seatIds ? booking.seatIds.join(',') : booking.tableId || '',
                eventDate:  event.date ? dayjs(event.date).format('ddd, DD MMM YYYY') : 'TBA',
            }
        });
    }, [router]);

    const keyExtractor = useCallback((item: any) => item._id, []);

    const renderBooking = useCallback(({ item: booking }: { item: any }) => (
        <TouchableOpacity
            style={styles.bookingCard}
            activeOpacity={0.8}
            onPress={() => navigateToBooking(booking)}
        >
            <View style={styles.cardHeader}>
                <View style={[
                    styles.statusBadge,
                    (booking.status === 'completed' || booking.status === 'checked_in') && styles.statusCompleted,
                    (booking.status === 'cancelled' || booking.status === 'rejected') && styles.statusCancelled
                ]}>
                    <Text style={[
                        styles.statusText,
                        (booking.status === 'completed' || booking.status === 'checked_in') && styles.statusTextCompleted,
                        (booking.status === 'cancelled' || booking.status === 'rejected') && styles.statusTextCancelled
                    ]}>{booking.status?.toUpperCase() || 'PENDING'}</Text>
                </View>
                <Text style={styles.bookingId}>#{booking._id.substring(0, 8).toUpperCase()}</Text>
            </View>

            <View style={styles.detailsRow}>
                <Image
                    source={{ uri: thumb(booking.eventId?.coverImage || booking.hostId?.profileImage) || 'https://via.placeholder.com/64' }}
                    style={styles.venueThumb}
                    cachePolicy="memory-disk"
                    contentFit="cover"
                />
                <View style={styles.info}>
                    <Text style={styles.venueName}>{booking.hostId?.name || booking.eventId?.venue?.name || 'Exclusive Club'}</Text>
                    <Text style={styles.eventTitle}>{booking.eventId?.title || booking.ticketType || 'Premium Access'}</Text>
                    <Text style={styles.dateTime}>
                        {booking.eventId?.date ? dayjs(booking.eventId.date).format('ddd, DD MMM') + ' • ' + booking.eventId.startTime : dayjs(booking.createdAt).format('ddd, DD MMM • hh:mm A')}
                    </Text>
                </View>
            </View>

            <View style={styles.cardFooter}>
                <View style={styles.footerTop}>
                    <Text style={styles.type}>Price: ₹{booking.pricePaid || 0}</Text>
                    <TouchableOpacity onPress={() => navigateToBooking(booking)}>
                        <Text style={styles.viewTickets}>View Details →</Text>
                    </TouchableOpacity>
                </View>
                {activeTab === 'past' && (
                    <TouchableOpacity 
                        style={styles.reviewBtn}
                        onPress={() => router.push({ 
                            pathname: '/(user)/write-review', 
                            params: { 
                                name: booking.eventId?.title || booking.eventId?.venue?.name || booking.hostId?.name || 'Exclusive Event',
                                image: booking.eventId?.coverImage || booking.hostId?.profileImage || '',
                                eventId: booking.eventId?._id || '',
                                hostId: booking.hostId?._id || booking.hostId || '',
                            } 
                        })}
                    >
                        <Text style={styles.reviewBtnText}>Write a Review</Text>
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    ), [activeTab, navigateToBooking, router]);

    const renderOrder = useCallback(({ item }: { item: any }) => {
        const status = item.status?.toLowerCase() || 'pending';
        const cfg = ORDER_STATUS_CONFIG[status] || ORDER_STATUS_CONFIG.pending;
        const items: any[] = item.items || [];
        const total = item.totalAmount ?? items.reduce((s: number, i: any) => s + (i.price * i.quantity), 0);

        return (
            <View style={styles.orderCard}>
                <View style={styles.orderCardHeader}>
                    <View>
                        <Text style={styles.orderId}>#{String(item._id).slice(-8).toUpperCase()}</Text>
                        <Text style={styles.orderTime}>{dayjs(item.createdAt).format('ddd, DD MMM • hh:mm A')}</Text>
                    </View>
                    <View style={[styles.orderStatusBadge, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
                        <View style={[styles.orderStatusDot, { backgroundColor: cfg.color }]} />
                        <Text style={[styles.orderStatusText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                </View>

                <View style={styles.orderItemsList}>
                    {items.slice(0, 3).map((i: any, idx: number) => (
                        <View key={idx} style={styles.orderItemRow}>
                            <View style={styles.orderItemQtyBox}>
                                <Text style={styles.orderItemQty}>{i.quantity}×</Text>
                            </View>
                            <Text style={styles.orderItemName} numberOfLines={1}>{i.name || i.menuItemId?.name || 'Item'}</Text>
                            <Text style={styles.orderItemPrice}>₹{(i.price * i.quantity).toLocaleString()}</Text>
                        </View>
                    ))}
                    {items.length > 3 && (
                        <Text style={styles.orderMoreItems}>+{items.length - 3} more items</Text>
                    )}
                </View>

                <View style={styles.orderCardFooter}>
                    <View>
                        <Text style={styles.orderEventName} numberOfLines={1}>
                            {item.eventId?.title || item.eventId || 'In-Event Order'}
                        </Text>
                    </View>
                    <View style={styles.orderTotalRow}>
                        <Text style={styles.orderTotalLabel}>Total</Text>
                        <Text style={styles.orderTotalAmount}>₹{total.toLocaleString()}</Text>
                    </View>
                </View>
            </View>
        );
    }, []);

    const renderItem = useCallback(({ item }: { item: any }) => {
        if (activeTab === 'orders') return renderOrder({ item });
        return renderBooking({ item });
    }, [activeTab, renderOrder, renderBooking]);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{activeTab === 'orders' ? 'My Orders' : 'My Bookings'}</Text>
            </View>

            <View style={styles.tabsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
                    {(['upcoming', 'past', 'orders'] as const).map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tab, activeTab === tab && styles.tabActive]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                                {tab === 'orders' ? 'My Orders' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <FlashList
                data={displayedData}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                estimatedItemSize={145}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={(
                    loading || loadingOrders ? (
                        <View style={{ flex: 1, alignItems: 'center', marginTop: 80 }}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                        </View>
                    ) : (
                        <View style={styles.emptyContainer}>
                            <View style={styles.glowOverlay} />
                            <View style={styles.emptyContent}>
                                <View style={styles.illustrationContainer}>
                                    <View style={styles.illustrationGlow} />
                                    <Image
                                        source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDuCl4k5YwoqyL5AjjHqRzuJYlZrJX4J9duYv_3cx3zXbiEzmeP71Cr3ygTy4-ZAMFSo4hM6qouWIu_eH3bhGL2XqWJOB4Fmf49GpgXSZKgfF2AdxKUregWLkTPbO_RKlcxXbczmo4_bkHzzoxJ4AxUTXRxgfxfIyCueTpXnh6ElSMMRueI9Eg1e-MIy6Zd_lkPv_vVHHhgn7LrGPEP8lrCpzbmcriivL3-9QyN6Y-rTiYMNBigOntc7uRQaoIY0TonxK0D8aFf-OPC' }}
                                        style={styles.illustration}
                                        contentFit="contain"
                                        cachePolicy="memory-disk"
                                    />
                                </View>
                                <Text style={styles.emptyTitle}>
                                    {activeTab === 'upcoming' ? 'No exclusive plans yet' : 
                                     activeTab === 'past' ? 'No event history' : 
                                     'No orders yet'}
                                </Text>
                                <Text style={styles.emptySubtitle}>
                                    {activeTab === 'upcoming' ? 'Your upcoming events and table reservations will appear here.' : 
                                     activeTab === 'past' ? 'Your completed event experiences will be listed here.' : 
                                     'Your food and drinks orders will appear here.'}
                                </Text>
                                <TouchableOpacity
                                    style={styles.emptyCta}
                                    onPress={() => {
                                        if (activeTab === 'orders') {
                                            // Find the first active/upcoming booking to get event context
                                            const activeBooking = upcomingBookings[0] || allBookings[0];
                                            const eventId = activeBooking?.eventId?._id || activeBooking?.eventId || '';
                                            const hostId  = activeBooking?.hostId?._id || activeBooking?.hostId || '';
                                            const zone    = activeBooking?.ticketType || '';
                                            const tableId = activeBooking?.tableId || '';
                                            router.push({
                                                pathname: '/(user)/discover',
                                                params: { tab: 'orders', eventId, hostId, zone, tableId }
                                            });
                                        } else {
                                            router.push('/(user)/home');
                                        }
                                    }}
                                >
                                    <LinearGradient
                                        colors={activeTab === 'orders' ? ['#1D4ED8', '#2563EB', '#3B82F6'] : ['#4F46E5', '#6366F1']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.emptyCtaGrad}
                                    >
                                        <Text style={styles.emptyCtaText}>
                                            {activeTab === 'orders' ? 'EXPLORE MENU' : 'DISCOVER EVENTS'}
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background.dark,
    },
    header: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        // Removed fixed paddingTop to let SafeAreaView handle it properly or add consistent spacing
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 32, // Increased size for bold header look
        fontWeight: '800',
    },
    tabsContainer: {
        marginBottom: 24,
    },
    tabs: {
        flexDirection: 'row',
        gap: 10, // Tighter gap to bring chips closer
        paddingHorizontal: SPACING.md, 
        alignItems: 'center',
    },
    tab: {
        paddingHorizontal: 18, // Balanced padding
        paddingVertical: 10, // Slightly reduced vertical padding
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    tabText: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 14,
        fontWeight: '700',
    },
    tabTextActive: {
        color: '#FFFFFF',
    },
    scrollContent: {
        paddingHorizontal: SPACING.md,
        paddingBottom: 100, // Extra padding for bottom tabs
    },
    bookingCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        marginBottom: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    statusBadge: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusCompleted: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    statusCancelled: {
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
    },
    statusText: {
        color: COLORS.emerald,
        fontSize: 10,
        fontWeight: '800',
    },
    statusTextCompleted: {
        color: '#FFFFFF',
    },
    statusTextCancelled: {
        color: '#FF3B30',
    },
    bookingId: {
        color: 'rgba(255, 255, 255, 0.3)',
        fontSize: 11,
        fontWeight: '600',
    },
    detailsRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 20,
    },
    venueThumb: {
        width: 64,
        height: 64,
        borderRadius: 12,
        backgroundColor: '#333',
    },
    info: {
        flex: 1,
        gap: 2,
    },
    venueName: {
        color: COLORS.primary,
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    eventTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    dateTime: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 13,
        marginTop: 4,
    },
    cardFooter: {
        flexDirection: 'column',
        paddingTop: 16,
        borderTopWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        gap: 12,
    },
    footerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    type: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    footerActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    reviewBtn: {
        backgroundColor: 'rgba(124, 77, 255, 0.15)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(124, 77, 255, 0.4)',
        alignItems: 'center',
    },
    reviewBtnText: {
        color: '#9D7AFF',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    viewTickets: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '700',
    },
    emptyContainer: {
        flex: 1,
        minHeight: 500,
        justifyContent: 'center',
        alignItems: 'center',
    },
    glowOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'transparent',
    },
    emptyContent: {
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    illustrationContainer: {
        width: 240,
        height: 240,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    illustrationGlow: {
        position: 'absolute',
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: 'rgba(124, 77, 255, 0.2)',
    },
    illustration: {
        width: '100%',
        height: '100%',
    },
    emptyTitle: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 12,
        lineHeight: 34,
    },
    emptySubtitle: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 40,
    },
    emptyCta: {
        width: '100%',
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 15,
        elevation: 8,
    },
    emptyCtaGrad: {
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyCtaText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 2,
        textAlign: 'center',
    },

    // Order card styles
    orderCard: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        marginBottom: 12,
        overflow: 'hidden',
    },
    orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, paddingBottom: 12 },
    orderId: { color: '#FFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.4 },
    orderTime: { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2 },
    orderStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
    orderStatusDot: { width: 6, height: 6, borderRadius: 3 },
    orderStatusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

    orderItemsList: { paddingHorizontal: 16, paddingBottom: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)', paddingTop: 12, gap: 8 },
    orderItemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    orderItemQtyBox: { width: 28, height: 22, borderRadius: 6, backgroundColor: 'rgba(129,140,248,0.12)', alignItems: 'center', justifyContent: 'center' },
    orderItemQty: { color: '#818CF8', fontSize: 11, fontWeight: '800' },
    orderItemName: { flex: 1, color: '#FFF', fontSize: 13, fontWeight: '600' },
    orderItemPrice: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },
    orderMoreItems: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontStyle: 'italic', marginTop: 2 },

    orderCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
    orderEventName: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600', maxWidth: 180 },
    orderTotalRow: { alignItems: 'flex-end' },
    orderTotalLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    orderTotalAmount: { color: '#818CF8', fontSize: 16, fontWeight: '900' },
});

