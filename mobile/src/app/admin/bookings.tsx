import React, { useState, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, FlatList,
    ActivityIndicator, StatusBar, Animated, Pressable
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import adminService, { AdminBooking } from '../../services/adminService';
import { UserListSkeleton } from '../../components/admin/AdminSkeleton';


const COLORS = {
    primary: '#3b82f6',
    bg: '#000000',
    card: '#080808',
    border: 'rgba(255,255,255,0.06)',
    textWhite: '#ffffff',
    textDim: '#a0a0a0',
    success: '#10B981',
    warning: '#f59e0b',
    danger: '#F43F5E',
    info: '#3b82f6'
};

const STATUS_FILTERS = [
    { label: 'All Unit', value: '' },
    { label: 'Pending', value: 'pending' },
    { label: 'Verified', value: 'paid' },
    { label: 'Finalized', value: 'checked_in' },
];

const BookingRow = React.memo(({ item }: { item: AdminBooking }) => {

    const statusObj = useMemo(() => {
        switch (item.status) {
            case 'checked_in': return { color: COLORS.success, bg: 'rgba(16, 185, 129, 0.15)', text: 'CHECKED IN' };
            case 'paid': return { color: COLORS.info, bg: 'rgba(59, 130, 246, 0.15)', text: 'CONFIRMED' };
            case 'pending': return { color: COLORS.warning, bg: 'rgba(245, 158, 11, 0.15)', text: 'PENDING' };
            default: return { color: COLORS.textDim, bg: 'rgba(255, 255, 255, 0.08)', text: item.status?.toUpperCase() || 'UNKNOWN' };
        }
    }, [item.status]);

    return (
        <TouchableOpacity style={styles.bookingCardWrapper} activeOpacity={0.8}>
            <LinearGradient
                colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBorder}
            >
                <BlurView intensity={20} tint="dark" style={styles.bookingCardInner}>
                    <View style={styles.bookingHeader}>
                        <View style={styles.userSection}>
                            <View style={styles.avatarContainer}>
                                <LinearGradient
                                    colors={[COLORS.primary, '#8b5cf6']}
                                    style={styles.avatarGradientRing}
                                />
                                <Image 
                                    source={{ uri: item.userId?.profileImage || `https://ui-avatars.com/api/?name=${item.userId?.name || 'U'}&background=111&color=fff&bold=true` }} 
                                    style={styles.avatar} 
                                    cachePolicy="memory-disk"
                                />
                            </View>
                            <View style={styles.userInfo}>
                                <Text style={styles.userName} numberOfLines={1}>{item.userId?.name || 'Guest User'}</Text>
                                <Text style={styles.userEmail} numberOfLines={1}>{item.userId?.email || 'N/A'}</Text>
                            </View>
                        </View>
                        <View style={[styles.statusGlowBox, { backgroundColor: statusObj.bg, shadowColor: statusObj.color }]}>
                            <View style={[styles.statusDot, { backgroundColor: statusObj.color }]} />
                            <Text style={[styles.statusText, { color: statusObj.color }]}>{statusObj.text}</Text>
                        </View>
                    </View>

                    <LinearGradient
                        colors={['transparent', 'rgba(255,255,255,0.1)', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.premiumDivider}
                    />

                    <View style={styles.bookingDetails}>
                        <View style={styles.eventInfo}>
                            <View style={styles.eventHeaderRow}>
                                <View style={styles.iconBox}>
                                    <MaterialIcons name="event-seat" size={12} color={COLORS.primary} />
                                </View>
                                <Text style={styles.eventTitle} numberOfLines={1}>{item.eventId?.title || 'Private Event'}</Text>
                            </View>
                            <View style={styles.hostRow}>
                                <MaterialIcons name="storefront" size={12} color={COLORS.textDim} style={{ marginRight: 6 }} />
                                <Text style={styles.hostName} numberOfLines={1}>by {item.hostId?.name || 'Partner Host'}</Text>
                            </View>
                        </View>
                        <View style={styles.priceContainer}>
                            <Text style={styles.priceLabel}>TOTAL AMOUNT</Text>
                            <View style={styles.priceAmountRow}>
                                <Text style={styles.currencySymbol}>₹</Text>
                                <Text style={styles.detailValue}>{(item.pricePaid || 0).toLocaleString()}</Text>
                            </View>
                        </View>
                    </View>
                </BlurView>
            </LinearGradient>
        </TouchableOpacity>
    );
});

export default function BookingsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [statusFilter, setStatusFilter] = useState('');

    const { 
        data, 
        isLoading, 
        isFetchingNextPage, 
        fetchNextPage, 
        hasNextPage,
        refetch,
        isRefetching
    } = useInfiniteQuery({
        queryKey: ['admin-bookings', statusFilter],
        queryFn: ({ pageParam = 1 }) => adminService.getBookings(pageParam, 30, statusFilter || undefined),
        getNextPageParam: (lastPage) => (lastPage.pages > lastPage.page ? lastPage.page + 1 : undefined),
        initialPageParam: 1,
        staleTime: 30000,
    });

    const bookings = useMemo(() => data?.pages.flatMap(page => page.data) || [], [data]);
    const total = data?.pages[0]?.total || 0;

    const renderItem = useCallback(({ item }: { item: AdminBooking }) => <BookingRow item={item} />, []);


    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>Reservation Intel</Text>
                    <Text style={styles.subtitle}>{total.toLocaleString()} active directives</Text>
                </View>
                {isLoading && <ActivityIndicator size="small" color={COLORS.primary} />}
            </View>

            <View style={styles.filterWrapper}>
                <FlatList
                    horizontal
                    data={STATUS_FILTERS}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterBar}
                    keyExtractor={(item) => item.label}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.filterTab, statusFilter === item.value && styles.activeTab]}
                            onPress={() => setStatusFilter(item.value)}
                        >
                            <Text style={[styles.filterText, statusFilter === item.value && styles.activeText]}>
                                {item.label.toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {isLoading ? (
                <UserListSkeleton />
            ) : bookings.length === 0 ? (
                <View style={styles.centered}>
                    <MaterialIcons name="event-busy" size={60} color={COLORS.textDim} />
                    <Text style={styles.emptyTitle}>No Entries Found</Text>
                    <Text style={styles.emptySubtitle}>Refine your intelligence filters.</Text>
                </View>
            ) : (
                <FlashList
                    data={bookings}
                    keyExtractor={(it: AdminBooking) => it._id}

                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    // @ts-ignore
                    estimatedItemSize={140}
                    onEndReached={() => hasNextPage && fetchNextPage()}
                    onEndReachedThreshold={0.5}
                    refreshing={isRefetching}
                    onRefresh={refetch as any}
                    ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={{ marginVertical: 20 }} color={COLORS.primary} /> : null}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: { paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', alignItems: 'center' },
    backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', marginRight: 16, borderWidth: 1, borderColor: COLORS.border },
    headerInfo: { flex: 1 },
    title: { fontSize: 24, fontWeight: '900', color: COLORS.textWhite },
    subtitle: { fontSize: 13, color: COLORS.textDim, marginTop: 2, fontWeight: '600' },
    filterWrapper: { marginBottom: 20 },
    filterBar: { paddingHorizontal: 24 },
    filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, marginRight: 10 },
    activeTab: { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: COLORS.primary },
    filterText: { color: COLORS.textDim, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    activeText: { color: COLORS.primary },
    listContent: { paddingHorizontal: 24, paddingBottom: 100 },
    bookingCardWrapper: { marginBottom: 18, borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.4, shadowRadius: 24, elevation: 8 },
    gradientBorder: { padding: 1, borderRadius: 24 },
    bookingCardInner: { borderRadius: 23, padding: 20, backgroundColor: 'rgba(8,8,8,0.4)', overflow: 'hidden' },
    bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    userSection: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, marginRight: 10 },
    avatarContainer: { position: 'relative', width: 54, height: 54, justifyContent: 'center', alignItems: 'center' },
    avatarGradientRing: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 27, opacity: 0.8 },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#111', borderWidth: 2, borderColor: COLORS.card },
    userInfo: { flex: 1, justifyContent: 'center' },
    userName: { color: COLORS.textWhite, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
    userEmail: { color: COLORS.textDim, fontSize: 13, marginTop: 4, fontWeight: '600' },
    statusGlowBox: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 10, elevation: 3 },
    statusDot: { width: 6, height: 6, borderRadius: 3, shadowColor: '#fff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 4 },
    statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
    premiumDivider: { height: 1, marginVertical: 20, opacity: 0.5 },
    bookingDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    eventInfo: { flex: 1, gap: 8, marginRight: 16 },
    eventHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconBox: { width: 24, height: 24, borderRadius: 8, backgroundColor: 'rgba(59, 130, 246, 0.15)', justifyContent: 'center', alignItems: 'center' },
    eventTitle: { color: COLORS.textWhite, fontSize: 15, fontWeight: '800', letterSpacing: -0.2, flex: 1 },
    hostRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 32 },
    hostName: { color: COLORS.textDim, fontSize: 12, fontWeight: '600' },
    priceContainer: { alignItems: 'flex-end' },
    priceLabel: { color: COLORS.textDim, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
    priceAmountRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 2, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)' },
    currencySymbol: { color: COLORS.success, fontSize: 14, fontWeight: '700', marginTop: 2 },
    detailValue: { color: COLORS.success, fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyTitle: { color: COLORS.textWhite, fontSize: 20, fontWeight: '900', marginTop: 16 },
    emptySubtitle: { color: COLORS.textDim, fontSize: 14, marginTop: 8, textAlign: 'center' },
});
