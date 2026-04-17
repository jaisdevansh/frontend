import React, { useState, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import adminService, { AdminBooking } from '../../services/adminService';
import { UserListSkeleton } from '../../components/admin/AdminSkeleton';

const COLORS = {
    bg: '#000000',
    card: '#0a0a0a',
    cardBorder: '#1a1a1a',
    primary: '#4f46e5',
    textWhite: '#f8fafc',
    textDim: '#64748b',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    cyan: '#06b6d4',
    badgeBg: '#1e293b',
};

const STATUS_FILTERS = [
    { label: 'ALL',        value: '',           color: COLORS.textDim },
    { label: 'PENDING',    value: 'pending',    color: COLORS.warning },
    { label: 'ACTIVE',     value: 'active',     color: COLORS.primary },
    { label: 'CHECKED IN', value: 'checked_in', color: COLORS.success },
];

const getStatusColor = (status: string) => {
    switch (status) {
        case 'checked_in': return COLORS.success;
        case 'approved':   return COLORS.cyan;
        case 'active':     return COLORS.primary;
        case 'pending':    return COLORS.warning;
        case 'cancelled':  return COLORS.danger;
        case 'rejected':   return COLORS.danger;
        default:           return COLORS.textDim;
    }
};

const formatDate = (iso: string) => {
    if (!iso) return 'N/A';
    const d = new Date(iso);
    return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
};

const BookingRow = React.memo(({ item }: { item: AdminBooking }) => {
    const isPaid = item.paymentStatus === 'paid';
    const statusColor = getStatusColor(item.status);
    const bookingId = item._id ? item._id.substring(item._id.length - 8).toUpperCase() : 'N/A';
    
    let contactInfo = item.userId?.email || item.userId?.phone;
    let contactType = item.userId?.email ? 'email' : 'phone';
    
    if (!contactInfo && item.userId?._id) {
        contactInfo = item.userId._id.substring(item.userId._id.length - 8).toUpperCase();
        contactType = 'id';
    }

    return (
        <View style={styles.card}>
            {/* Header: ID, Date */}
            <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                    <Text style={styles.bookingId}>#{bookingId}</Text>
                    <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                </View>
            </View>

            {/* Body: Host -> Event -> User Details */}
            <View style={styles.cardBody}>
                {/* Host Info (Primary focus) */}
                <View style={styles.entityRow}>
                    <View style={[styles.avatarWrap, { borderRadius: 18 }]}>
                        <Image
                            source={{ uri: item.hostId?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.hostId?.name || 'Platform')}&background=4f46e5&color=fff&bold=true` }}
                            style={styles.avatar}
                            cachePolicy="memory-disk"
                        />
                    </View>
                    <View style={styles.entityInfo}>
                        <Text style={styles.entityName} numberOfLines={1}>{item.hostId?.name || 'Platform Admin'}</Text>
                        <View style={styles.contactRow}>
                            <MaterialIcons name="event" size={12} color={COLORS.primary} />
                            <Text style={[styles.contactText, { color: COLORS.primary }]} numberOfLines={1}>{item.eventId?.title || 'Unknown Event'}</Text>
                        </View>
                    </View>
                </View>

                {/* User Info (Secondary focus) */}
                <View style={[styles.entityRow, { marginTop: 12 }]}>
                    <View style={[styles.avatarWrap, { width: 30, height: 30, borderRadius: 15 }]}>
                        <Image
                            source={{ uri: item.userId?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.userId?.name || 'U')}&background=1e293b&color=fff&bold=true` }}
                            style={styles.avatar}
                            cachePolicy="memory-disk"
                        />
                    </View>
                    <View style={styles.entityInfo}>
                        <Text style={[styles.entityName, { fontSize: 13, color: COLORS.textDim }]} numberOfLines={1}>{item.userId?.name || 'Unknown User'}</Text>
                        <View style={styles.contactRow}>
                            <MaterialCommunityIcons 
                                name={contactType === 'email' ? 'email-outline' : contactType === 'phone' ? 'phone-outline' : 'identifier'} 
                                size={12} 
                                color={COLORS.textDim} 
                            />
                            <Text style={[styles.contactText, { fontSize: 11 }]} numberOfLines={1}>{contactInfo || 'N/A'}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Footer: Meta & Amount */}
            <View style={styles.cardFooter}>
                <View style={styles.metaContainer}>
                    <View style={styles.metaTag}>
                        <MaterialIcons name="people-outline" size={12} color={COLORS.textWhite} />
                        <Text style={styles.metaTagText}>{item.guests ?? 1} GUEST{(item.guests ?? 1) !== 1 ? 'S' : ''}</Text>
                    </View>
                    {item.ticketType && (
                        <View style={styles.metaTag}>
                            <MaterialCommunityIcons name="ticket-confirmation-outline" size={12} color={COLORS.textWhite} />
                            <Text style={styles.metaTagText}>{item.ticketType.toUpperCase()}</Text>
                        </View>
                    )}
                    <View style={[styles.metaTag, { backgroundColor: statusColor + '20', borderColor: statusColor + '40' }]}>
                        <Text style={[styles.metaTagText, { color: statusColor, paddingLeft: 2 }]}>{item.status?.replace('_', ' ').toUpperCase()}</Text>
                    </View>
                </View>

                <View style={styles.amountBox}>
                    <Text style={styles.amountSymbol}>₹</Text>
                    <Text style={styles.amountValue}>{(item.pricePaid || 0).toLocaleString('en-IN')}</Text>
                </View>
            </View>
        </View>
    );
});

export default function BookingsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [statusFilter, setStatusFilter] = useState('');

    const {
        data, isLoading, isFetchingNextPage, fetchNextPage,
        hasNextPage, refetch, isRefetching
    } = useInfiniteQuery({
        queryKey: ['admin-bookings', statusFilter],
        queryFn: ({ pageParam = 1 }) => adminService.getBookings(pageParam, 30, statusFilter || undefined),
        getNextPageParam: (lastPage) => (lastPage.pages > lastPage.page ? lastPage.page + 1 : undefined),
        initialPageParam: 1,
        staleTime: 2 * 60 * 1000,
        refetchOnMount: true,
        refetchOnWindowFocus: true,
    });

    const bookings = useMemo(() => data?.pages.flatMap(page => page.data) || [], [data]);
    const total = data?.pages[0]?.total || 0;

    const renderItem = useCallback(({ item }: { item: AdminBooking }) => <BookingRow item={item} />, []);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={20} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>All Bookings</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.subtitle}>
                            {total.toLocaleString()} records {statusFilter ? `(${statusFilter})` : ''}
                        </Text>
                        {isRefetching && <ActivityIndicator size={10} color={COLORS.primary} style={{ marginLeft: 8 }} />}
                    </View>
                </View>
            </View>

            {/* Filter Chips */}
            <View style={styles.chipRow}>
                {STATUS_FILTERS.map(f => {
                    const active = statusFilter === f.value;
                    return (
                        <TouchableOpacity
                            key={f.value}
                            style={[styles.chip, active && styles.chipActive]}
                            onPress={() => setStatusFilter(f.value)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {isLoading ? (
                <UserListSkeleton />
            ) : bookings.length === 0 ? (
                <View style={styles.empty}>
                    <MaterialCommunityIcons name="database-off-outline" size={48} color={COLORS.cardBorder} />
                    <Text style={styles.emptyTitle}>NO RECORDS</Text>
                    <Text style={styles.emptySubtitle}>
                        {statusFilter ? `No ${statusFilter.replace('_', ' ')} reservations till now` : 'No reservations till now'}
                    </Text>
                </View>
            ) : (
                <FlashList
                    data={bookings}
                    keyExtractor={(it: AdminBooking) => it._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    // @ts-ignore
                    estimatedItemSize={190}
                    onEndReached={() => hasNextPage && fetchNextPage()}
                    onEndReachedThreshold={0.5}
                    refreshing={isRefetching}
                    onRefresh={refetch as any}
                    ListFooterComponent={
                        isFetchingNextPage
                            ? <ActivityIndicator style={{ marginVertical: 24 }} color={COLORS.textDim} />
                            : null
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
    backBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.cardBorder },
    headerInfo: { flex: 1 },
    title: { fontSize: 20, fontWeight: '800', color: COLORS.textWhite, letterSpacing: -0.5 },
    subtitle: { fontSize: 13, color: COLORS.textDim, marginTop: 2, fontWeight: '500', fontFamily: 'Courier', letterSpacing: -0.2 },

    // Chips
    chipRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder },
    chipActive: { backgroundColor: COLORS.textWhite, borderColor: COLORS.textWhite },
    chipText: { color: COLORS.textDim, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
    chipTextActive: { color: COLORS.bg },

    // List
    listContent: { paddingHorizontal: 16, paddingBottom: 100 },

    // Card (Data-heavy dashboard style)
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        marginBottom: 12,
    },
    
    // Header section of card
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.cardBorder,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    bookingId: { color: COLORS.textWhite, fontSize: 12, fontFamily: 'monospace', fontWeight: '800' },
    dateText: { color: COLORS.textDim, fontSize: 11, fontWeight: '500' },
    paymentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    paymentIndicator: { width: 6, height: 6, borderRadius: 3 },
    paymentText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

    // Body section of card
    cardBody: { padding: 14 },
    entityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatarWrap: { width: 36, height: 36, borderRadius: 6, overflow: 'hidden', backgroundColor: COLORS.cardBorder },
    avatar: { width: '100%', height: '100%' },
    iconWrap: { width: 36, height: 36, borderRadius: 6, backgroundColor: COLORS.badgeBg, justifyContent: 'center', alignItems: 'center' },
    entityInfo: { flex: 1, justifyContent: 'center' },
    entityName: { color: COLORS.textWhite, fontSize: 15, fontWeight: '700', marginBottom: 2 },
    contactRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    contactText: { color: COLORS.textDim, fontSize: 12, fontWeight: '500', fontFamily: 'monospace' },

    // Footer section of card
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.cardBorder,
    },
    metaContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, flex: 1, paddingRight: 10 },
    metaTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 4, backgroundColor: COLORS.badgeBg, borderWidth: 1, borderColor: COLORS.cardBorder },
    metaTagText: { color: COLORS.textWhite, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    
    amountBox: { alignItems: 'flex-end', flexDirection: 'row', gap: 2 },
    amountSymbol: { color: COLORS.textDim, fontSize: 12, fontWeight: '700', marginBottom: 2 },
    amountValue: { color: COLORS.textWhite, fontSize: 18, fontWeight: '800', fontFamily: 'monospace' },

    // Empty State
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyTitle: { color: COLORS.textDim, fontSize: 14, fontWeight: '800', marginTop: 16, letterSpacing: 1 },
    emptySubtitle: { color: '#334155', fontSize: 12, marginTop: 4, textAlign: 'center', fontWeight: '500' },
});
