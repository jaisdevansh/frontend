import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { InteractionManager } from 'react-native';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, FlatList, Dimensions, Modal, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING } from '../../constants/design-system';
import { useDashboardStats } from '../../hooks/useDashboard';
import { useEvents } from '../../hooks/useEvents';
import { useHostProfile } from '../../hooks/useHostProfile';
import { Image } from 'expo-image';
import dayjs from 'dayjs';
import { PendingVerification } from '../../components/host/PendingVerification';
import { useQueryClient } from '@tanstack/react-query';
import { StatCardSkeleton, StatCardHalfSkeleton } from '../../components/Skeletons/StatCardSkeleton';
import { HostEventCardSkeleton } from '../../components/Skeletons/HostEventCardSkeleton';

const { width } = Dimensions.get('window');

const EventCard = React.memo(({ item, onPress }: { item: any; onPress: (id: string) => void }) => {
    const imgUrl = item.coverImage || item.image || item.imageUrl;
    const isTicketLive = item.bookingOpenDate ? dayjs().isAfter(dayjs(item.bookingOpenDate)) : true;
    
    return (
        <TouchableOpacity style={styles.eventCard} onPress={() => onPress(item._id || item.id)} activeOpacity={0.85}>
            <View style={styles.eventImageContainer}>
                {imgUrl ? (
                    <Image
                        source={{ uri: imgUrl }}
                        style={styles.eventImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                    />
                ) : (
                    <View style={[styles.eventImage, styles.placeholderImage]}>
                        <Text style={styles.placeholderText}>EC</Text>
                    </View>
                )}
                {/* Ticket Status Badge */}
                <View style={[styles.ticketStatusBadge, isTicketLive ? styles.ticketLiveBadge : styles.ticketUpcomingBadge]}>
                    <View style={[styles.ticketStatusDot, isTicketLive ? styles.liveDot : styles.upcomingDot]} />
                    <Text style={styles.ticketStatusText}>
                        {isTicketLive ? 'LIVE' : 'UPCOMING'}
                    </Text>
                </View>
            </View>
            <View style={styles.eventInfo}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.eventTitle} numberOfLines={1}>{item.title || 'event'}</Text>
                    <Text style={styles.eventDate}>
                        {item.date 
                            ? `${dayjs(item.date).format('MMM DD')}${item.startTime ? ` • ${item.startTime}` : ''}` 
                            : 'Date TBD'}
                    </Text>
                    {/* Ticket Live Time */}
                    {item.bookingOpenDate && (
                        <Text style={styles.ticketLiveTime}>
                            {isTicketLive 
                                ? `Tickets live since ${dayjs(item.bookingOpenDate).format('MMM DD, hh:mm A')}`
                                : `Tickets go live: ${dayjs(item.bookingOpenDate).format('MMM DD, hh:mm A')}`
                            }
                        </Text>
                    )}
                </View>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>MANAGE</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
});

const ManagementToolCard = React.memo(({ tool, onPress }: { tool: any; onPress: () => void }) => (
    <TouchableOpacity 
        style={styles.toolGridCard} 
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={[styles.toolIconWrap, { backgroundColor: `${tool.color}15` }]}>
            <MaterialCommunityIcons name={tool.icon as any} size={24} color={tool.color} />
        </View>
        <Text style={styles.toolLabel}>{tool.label}</Text>
    </TouchableOpacity>
));

export default function HostDashboard() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { logout, user } = useAuth();
    
    const { data: hostProfile, isLoading: profileLoading } = useHostProfile();
    const { data: stats, isLoading: statsLoading } = useDashboardStats();
    const { data: events, isLoading: eventsLoading } = useEvents();
    
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    
    const queryClient = useQueryClient();
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        // Will refresh all currently active queries on the screen
        await queryClient.invalidateQueries();
        setRefreshing(false);
    }, [queryClient]);

    const handleEventPress = useCallback((eventId: string) => {
        setTimeout(() => {
            InteractionManager.runAfterInteractions(() => {
                router.push(`/(host)/events` as any); // Redirects to 'See All' screen as requested
            });
        }, 50);
    }, [router]);

    const renderEvent = useCallback(({ item }: { item: any }) => (
        <EventCard item={item} onPress={handleEventPress} />
    ), [handleEventPress]);

    const handleToolPress = useCallback((route: string) => {
        setTimeout(() => {
            InteractionManager.runAfterInteractions(() => {
                router.push(route as any);
            });
        }, 50);
    }, [router]);

    const renderManagementTool = useCallback((tool: any) => (
        <ManagementToolCard 
            key={tool.label} 
            tool={tool} 
            onPress={() => handleToolPress(tool.route)} 
        />
    ), [handleToolPress]);

    const managementTools = useMemo(() => [
        { label: 'Venue', icon: 'office-building-outline', route: '/(host)/venue-profile', color: '#F59E0B' },
        { label: 'Coupons', icon: 'tag-outline', route: '/(host)/coupons', color: '#3B82F6' },
        { label: 'Media', icon: 'cloud-upload-outline', route: '/(host)/media-upload', color: '#EC4899' },
        { label: 'Menu', icon: 'silverware-fork-knife', route: '/(host)/venue-menu', color: '#10B981' },
        { label: 'Gifts', icon: 'gift-outline', route: '/(host)/venue-gifts', color: '#6366F1' },
        { label: 'Staff', icon: 'account-group-outline', route: '/(host)/staff', color: '#06B6D4' },
        { label: 'Incidents', icon: 'alert-box-outline', route: '/(host)/incidents', color: '#EF4444' },
    ], []);

    const isPending = user?.hostStatus === 'PENDING_VERIFICATION';

    if (isPending) {
        return (
            <PendingVerification 
                onLogout={logout} 
                onSupport={() => router.push('/(host)/support' as any)} 
            />
        );
    }

    return (
        <ScrollView 
            style={[styles.container, { paddingTop: insets.top }]} 
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl 
                    refreshing={refreshing} 
                    onRefresh={onRefresh} 
                    tintColor={COLORS.primary} 
                    colors={[COLORS.primary]} 
                />
            }
        >
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            
            <View style={styles.topBar}>
                <TouchableOpacity onPress={logout} style={styles.powerBtn}>
                    <Ionicons name="power" size={18} color="#ef4444" />
                </TouchableOpacity>
            </View>

            <View style={styles.header}>
                <View>
                    <Text style={styles.welcome}>Welcome back,</Text>
                    <Text style={styles.title}>{hostProfile?.name || user?.name || 'Host'}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowProfileMenu(true)} activeOpacity={0.8}>
                    {hostProfile?.profileImage || hostProfile?.logo || user?.profileImage ? (
                        <Image source={{ uri: hostProfile?.profileImage || hostProfile?.logo || user?.profileImage }} style={styles.profilePic} cachePolicy="memory-disk" />
                    ) : (
                        <View style={styles.profilePicPlaceholder}>
                            <Ionicons name="person-outline" size={20} color="white" />
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.statsContainer}>
                {statsLoading ? (
                    <>
                        <View style={styles.statsRow}>
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                        </View>
                        <View style={styles.statsRow}>
                            <StatCardHalfSkeleton />
                        </View>
                    </>
                ) : (
                    <>
                        <View style={styles.statsRow}>
                            <View style={styles.statCard}>
                                <Text style={styles.statLbl}>TOTAL BOOKINGS</Text>
                                <Text style={styles.statVal}>{stats?.totalBookings ?? '0'}</Text>
                                <Text style={styles.statChange}>+0% this week</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={styles.statLbl}>TOTAL EVENTS</Text>
                                <Text style={styles.statVal}>{stats?.totalEvents ?? '0'}</Text>
                                <Text style={styles.statChange}>Active Platform</Text>
                            </View>
                        </View>
                        <View style={styles.statsRow}>
                            <View style={styles.statCardHalf}>
                                <Text style={styles.statLbl}>CAPACITY USAGE</Text>
                                <Text style={styles.statVal}>0%</Text>
                                <Text style={styles.statChange}>Realtime Data</Text>
                            </View>
                        </View>
                    </>
                )}
            </View>

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Upcoming Events</Text>
                <TouchableOpacity onPress={() => router.push('/(host)/events' as any)}>
                    <Text style={styles.seeAll}>See All</Text>
                </TouchableOpacity>
            </View>

            {eventsLoading ? (
                <View style={styles.eventsList}>
                    <HostEventCardSkeleton />
                    <HostEventCardSkeleton />
                    <HostEventCardSkeleton />
                </View>
            ) : (
                <FlatList
                    data={events?.slice(0, 3) || []}
                    renderItem={renderEvent}
                    keyExtractor={(item) => item._id || item.id || Math.random().toString()}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.eventsList}
                    removeClippedSubviews
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    initialNumToRender={6}
                />
            )}

            <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(host)/qr-scanner' as any)}>
                    <Ionicons name="qr-code-outline" size={20} color="white" />
                    <Text style={styles.primaryBtnText}>Scan QR</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(host)/create-event' as any)}>
                    <Ionicons name="add-circle-outline" size={20} color="white" />
                    <Text style={styles.primaryBtnText}>New Event</Text>
                </TouchableOpacity>
            </View>

            <Text style={[styles.sectionTitle, { marginHorizontal: 20, marginTop: 16, marginBottom: 16 }]}>
                Management Tools
            </Text>
            
            <View style={styles.toolsGrid}>
                {managementTools.map(renderManagementTool)}
            </View>

            <View style={{ height: 40 }} />

            <Modal visible={showProfileMenu} animationType="slide" transparent={true} onRequestClose={() => setShowProfileMenu(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowProfileMenu(false)}>
                    <View style={styles.menuContainer}>
                        <View style={styles.menuHandle} />
                        <Text style={styles.menuTitle}>Host Settings</Text>

                        <TouchableOpacity style={styles.menuItem} onPress={() => { setShowProfileMenu(false); router.push('/(host)/edit-profile' as any); }}>
                            <Ionicons name="person-outline" size={24} color="white" />
                            <Text style={styles.menuItemText}>Edit Profile</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={() => { setShowProfileMenu(false); router.push('/(host)/payments' as any); }}>
                            <Ionicons name="card-outline" size={24} color="white" />
                            <Text style={styles.menuItemText}>Payments & Orders</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={() => { setShowProfileMenu(false); router.push('/(host)/support' as any); }}>
                            <Ionicons name="chatbubbles-outline" size={24} color="white" />
                            <Text style={styles.menuItemText}>Support (Chat to Admin)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => { setShowProfileMenu(false); logout(); }}>
                            <Ionicons name="log-out-outline" size={24} color="#EF4444" />
                            <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Logout</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    loader: { flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
    topBar: { alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
    powerBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(239, 68, 68, 0.1)', justifyContent: 'center', alignItems: 'center' },
    
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 24 },
    welcome: { color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: '500', marginBottom: 2 },
    title: { color: 'white', fontSize: 28, fontWeight: '800' },
    profilePicPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#1A1D2E', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    profilePic: { width: 50, height: 50, borderRadius: 25 },
    
    statsContainer: { paddingHorizontal: 20, gap: 12, marginBottom: 32 },
    statsRow: { flexDirection: 'row', gap: 12 },
    statCard: { flex: 1, backgroundColor: '#0A0A0A', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    statCardHalf: { width: (width - 40 - 12) / 2, backgroundColor: '#0A0A0A', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    statLbl: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 12 },
    statVal: { color: 'white', fontSize: 24, fontWeight: '800', marginBottom: 8 },
    statChange: { color: '#10B981', fontSize: 12, fontWeight: '600' },
    
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
    sectionTitle: { color: 'white', fontSize: 20, fontWeight: '700' },
    seeAll: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
    
    eventsList: { paddingHorizontal: 20, gap: 16, paddingBottom: 8 },
    eventCard: { width: width - 40, backgroundColor: '#0A0A0A', borderRadius: 20, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    eventImageContainer: { width: '100%', height: 160, borderRadius: 12, overflow: 'hidden', marginBottom: 12, position: 'relative' },
    eventImage: { width: '100%', height: '100%' },
    placeholderImage: { backgroundColor: '#1E2336', alignItems: 'center', justifyContent: 'center' },
    placeholderText: { color: 'rgba(255,255,255,0.8)', fontSize: 40, fontWeight: '300', letterSpacing: 2 },
    ticketStatusBadge: { 
        position: 'absolute', 
        top: 12, 
        right: 12, 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 10, 
        paddingVertical: 6, 
        borderRadius: 8,
        gap: 6,
    },
    ticketLiveBadge: { 
        backgroundColor: 'rgba(16, 185, 129, 0.9)',
    },
    ticketUpcomingBadge: { 
        backgroundColor: 'rgba(251, 146, 60, 0.9)',
    },
    ticketStatusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    liveDot: {
        backgroundColor: '#FFFFFF',
    },
    upcomingDot: {
        backgroundColor: '#FFFFFF',
    },
    ticketStatusText: { 
        color: '#FFFFFF', 
        fontSize: 11, 
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    eventInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 4, gap: 12 },
    eventTitle: { color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 4 },
    eventDate: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '500' },
    ticketLiveTime: { 
        color: 'rgba(255,255,255,0.4)', 
        fontSize: 11, 
        fontWeight: '500',
        marginTop: 4,
        fontStyle: 'italic',
    },
    badge: { backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    badgeText: { color: '#10B981', fontSize: 11, fontWeight: '700' },
    
    actionButtons: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginTop: 20 },
    primaryBtn: { flex: 1, flexDirection: 'row', backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, gap: 8 },
    primaryBtnText: { color: 'white', fontSize: 16, fontWeight: '600' },
    
    toolsGrid: { paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 10 },
    toolGridCard: { backgroundColor: '#131521', width: '31%', height: 110, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)', marginBottom: 14 },
    toolIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    toolLabel: { color: 'white', fontSize: 13, fontWeight: '500' },
    
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    menuContainer: { backgroundColor: '#0A0A0A', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    menuHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    menuTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', gap: 16 },
    menuItemText: { color: 'white', fontSize: 16, fontWeight: '500' },
});
