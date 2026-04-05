import React, { useState, useCallback, memo, useMemo, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { 
    View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, 
    RefreshControl, Dimensions, Animated, Image, Pressable, Platform 
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/design-system';
import { useToast } from '../../context/ToastContext';
import { userService } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';
import * as Haptics from 'expo-haptics';
import {
    useAvailableOrders,
    useMyOrders,
    useCompletedOrders,
    useAcceptOrder,
    useUpdateOrderStatus,
    useWaiterSocket,
    useRejectOrder,
} from '../../hooks/useWaiterOrders';
import SafeFlashList from '../../components/SafeFlashList';

// --- CONSTANTS ---
const { width } = Dimensions.get('window');
const TabTypes = ['available', 'active', 'completed'] as const;
type TabType = typeof TabTypes[number];

const StatusConfig: any = {
    confirmed: { color: '#FFD700', label: 'NEW', icon: 'bell-ring' },
    accepted: { color: COLORS.primary, label: 'LOCKED', icon: 'lock' },
    preparing: { color: '#4F46E5', label: 'PREPARING', icon: 'fire' },
    out_for_delivery: { color: '#F59E0B', label: 'DELIVERING', icon: 'bicycle' },
    completed: { color: COLORS.emerald, label: 'SERVED', icon: 'check-circle' }
};

// --- HELPER COMPONENTS ---

const ScaleButton = ({ children, onPress, style, disabled }: any) => {
    const scale = useMemo(() => new Animated.Value(1), []);
    
    const onPressIn = () => {
        Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, tension: 200, friction: 10 }).start();
    };
    const onPressOut = () => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }).start();
    };

    return (
        <Pressable 
            onPress={onPress} 
            onPressIn={onPressIn} 
            onPressOut={onPressOut} 
            style={[style, { overflow: 'hidden' }, disabled && { opacity: 0.5 }]}
            disabled={disabled}
        >
            <Animated.View style={{ 
                transform: [{ scale }], 
                flex: 1,
                width: '100%', 
                height: '100%',
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'center'
            }}>
                {children}
            </Animated.View>
        </Pressable>
    );
};

const OrderHeader = memo(({ order, config, isGift }: any) => (
    <View style={styles.cardHeader}>
        <View style={styles.timestamp}>
            {isGift && <MaterialCommunityIcons name="gift" size={14} color="#EC4899" style={{ marginRight: 4 }} />}
            <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.4)" />
            <Text style={styles.timeText}>
                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
        </View>
        <View style={[styles.statusBadge, { borderColor: config.color + '40', backgroundColor: config.color + '15' }]}>
            <View style={[styles.statusDot, { backgroundColor: config.color }]} />
            <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
        </View>
    </View>
));

const Shimmer = ({ style }: any) => {
    const pulseAnim = useRef(new Animated.Value(0.15)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 0.35, duration: 900, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0.15, duration: 900, useNativeDriver: true })
            ])
        ).start();
    }, []);
    return <Animated.View style={[style, { backgroundColor: '#FFF', opacity: pulseAnim }]} />;
};

const OrderSkeleton = () => (
    <View style={styles.orderCard}>
        <View style={styles.cardHeader}>
            <Shimmer style={{ width: 80, height: 16, borderRadius: 4 }} />
            <Shimmer style={{ width: 60, height: 24, borderRadius: 12 }} />
        </View>
        <View style={styles.divider} />
        <View style={styles.infoGrid}>
            <View style={{ flex: 1 }}><Shimmer style={{ width: '40%', height: 10, borderRadius: 2, marginBottom: 8 }} /><Shimmer style={{ width: '80%', height: 16, borderRadius: 4 }} /></View>
            <View style={{ flex: 1 }}><Shimmer style={{ width: '40%', height: 10, borderRadius: 2, marginBottom: 8 }} /><Shimmer style={{ width: '80%', height: 16, borderRadius: 4 }} /></View>
        </View>
        <View style={styles.itemsSection}>
            <Shimmer style={{ width: '100%', height: 14, borderRadius: 4, marginBottom: 12 }} />
            <Shimmer style={{ width: '80%', height: 14, borderRadius: 4 }} />
        </View>
        <View style={styles.actionsRow}>
            <Shimmer style={{ flex: 1, height: 56, borderRadius: 18 }} />
            <Shimmer style={{ flex: 1, height: 56, borderRadius: 18 }} />
        </View>
    </View>
);

const OrderInfoRow = memo(({ order, isGift }: any) => (
    <View style={styles.infoGrid}>
        <View style={[styles.infoItem, { flex: 1.1 }]}>
            <Text style={styles.infoLabel}>LOCATION</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{order.zone?.toUpperCase() || 'VIP'}</Text>
        </View>
        <View style={[styles.infoItem, { flex: 0.8 }]}>
            <Text style={styles.infoLabel}>TABLE</Text>
            <Text style={styles.infoValue}>{order.tableId}</Text>
        </View>
        <View style={[styles.infoItem, { flex: 1.1 }]}>
            <Text style={styles.infoLabel}>GUEST</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
                {isGift ? order.receiverId?.name : (order.userId?.name || 'Guest')}
            </Text>
        </View>
    </View>
));

const OrderItems = memo(({ items }: { items: any[] }) => (
    <View style={styles.itemsSection}>
        {items.slice(0, 4).map((it, idx) => (
            <View key={idx} style={styles.itemRow}>
                <View style={styles.qtyBox}><Text style={styles.itemQty}>{it.qty || it.quantity}x</Text></View>
                <Text style={styles.itemName} numberOfLines={1}>{it.name}</Text>
            </View>
        ))}
        {items.length > 4 && (
            <Text style={styles.moreItems}>+ {items.length - 4} MORE ITEMS</Text>
        )}
    </View>
));

const OrderActions = memo(({ order, isAvailable, isActive, isGift, onAccept, onReject, onUpdateStatus }: any) => {
    if (isAvailable) {
        return (
            <View style={styles.actionsRow}>
                <ScaleButton style={styles.rejectBtn} onPress={() => onReject(order._id)}>
                    <Ionicons name="close-circle" size={18} color="#FF4D4D" />
                    <Text style={styles.rejectText}>REJECT</Text>
                </ScaleButton>
                <ScaleButton style={styles.acceptBtn} onPress={() => onAccept(order._id)}>
                    <LinearGradient
                        colors={isGift ? ['#EC4899', '#BE185D'] : [COLORS.primary, '#6366F1']}
                        style={[styles.acceptGrad, { width: '100%' }]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.acceptText}>{isGift ? 'CLAIM GIFT' : 'ACCEPT'}</Text>
                        <Ionicons name={isGift ? 'gift' : 'chevron-forward-circle'} size={18} color="white" />
                    </LinearGradient>
                </ScaleButton>
            </View>
        );
    }
    
    if (isActive) {
        const nextStatus = 
            order.status === 'accepted' ? 'preparing' : 
            order.status === 'preparing' ? 'out_for_delivery' : 
            order.status === 'out_for_delivery' ? 'completed' : null;
            
        const btnLabel = 
            order.status === 'accepted' ? 'START PREPARING' : 
            order.status === 'preparing' ? (isGift ? 'DELIVER GIFT' : 'START DELIVERY') : 
            order.status === 'out_for_delivery' ? (isGift ? 'GIFT GIVEN ✓' : 'MARK SERVED ✓') : '';

        const btnColor = 
            order.status === 'accepted' ? '#4F46E5' : 
            order.status === 'preparing' ? '#F59E0B' : 
            order.status === 'out_for_delivery' ? COLORS.emerald : COLORS.primary;

        if (!nextStatus) return null;

        return (
            <View style={styles.actionsRow}>
                <ScaleButton style={[styles.fullAction, { backgroundColor: btnColor }]} onPress={() => onUpdateStatus(order._id, nextStatus)}>
                    <Text style={styles.fullActionText}>{btnLabel}</Text>
                </ScaleButton>
            </View>
        );
    }

    return null;
});

const OrderCard = memo(({ order, activeTab, onAccept, onReject, onUpdateStatus }: any) => {
    const config = StatusConfig[order.status] || StatusConfig.confirmed;
    const isAvailable = activeTab === 'available';
    const isActive = activeTab === 'active';
    const isGift = order.type === 'gift';

    return (
        <View style={styles.orderCard}>
            <OrderHeader order={order} config={config} isGift={isGift} />
            <View style={styles.divider} />
            
            <OrderInfoRow order={order} isGift={isGift} />
            
            {isGift && order.senderId && (
                <View style={styles.giftContext}>
                    <Ionicons name="gift-outline" size={12} color="#EC4899" />
                    <Text style={styles.giftContextText}>
                        Gift from <Text style={{fontWeight:'700'}}>@{order.senderId?.name}</Text>
                    </Text>
                </View>
            )}

            <OrderItems items={order.items} />
            
            <OrderActions 
                order={order} 
                isAvailable={isAvailable} 
                isActive={isActive} 
                isGift={isGift}
                onAccept={onAccept}
                onReject={onReject}
                onUpdateStatus={onUpdateStatus}
            />
        </View>
    );
});

// --- MAIN PANEL ---

export default function WaiterPanel() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { logout } = useAuth();
    const { showToast } = useToast();
    
    const [activeTab, setActiveTab] = useState<TabType>('available');
    const [profile, setProfile] = useState<any>(null);

    // React Query
    const { data: avail = [], isLoading: availL, refetch: refAvail, isRefetching: availR } = useAvailableOrders();
    const { data: active = [], isLoading: activeL, refetch: refMy, isRefetching: activeR } = useMyOrders();
    const { data: comp = [], isLoading: compL, refetch: refComp, isRefetching: compR } = useCompletedOrders();
    
    const acceptMut = useAcceptOrder();
    const rejectMut = useRejectOrder();
    const updateMut = useUpdateOrderStatus();
    
    useWaiterSocket();

    const orders = activeTab === 'available' ? avail : activeTab === 'active' ? active : comp;
    const loading = activeTab === 'available' ? availL : activeTab === 'active' ? activeL : compL;
    const refreshing = activeTab === 'available' ? availR : activeTab === 'active' ? activeR : compR;

    const handleRefresh = useCallback(() => {
        if (activeTab === 'available') refAvail();
        else if (activeTab === 'active') refMy();
        else refComp();
    }, [activeTab, refAvail, refMy, refComp]);

    const fetchProfile = useCallback(async () => {
        try {
            const res = await userService.getProfile();
            if (res.success) setProfile(res.data);
        } catch {}
    }, []);

    useFocusEffect(useCallback(() => { fetchProfile(); }, [fetchProfile]));

    const onAccept = useCallback(async (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        try {
            await acceptMut.mutateAsync(id);
            showToast('Order Locked', 'success');
            setActiveTab('active');
        } catch (e: any) { showToast(e.response?.data?.message || 'Failed', 'error'); }
    }, [acceptMut, showToast]);

    const onReject = useCallback(async (id: string) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        try {
            await rejectMut.mutateAsync({ orderId: id, reason: 'Staff busy' });
            showToast('Order Rejected', 'error');
        } catch (e: any) { showToast(e.response?.data?.message || 'Failed', 'error'); }
    }, [rejectMut, showToast]);

    const onUpdate = useCallback(async (id: string, status: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            await updateMut.mutateAsync({ orderId: id, status });
        } catch { showToast('Update failed', 'error'); }
    }, [updateMut, showToast]);

    const renderItem = useCallback(({ item }: any) => (
        <OrderCard 
            order={item} 
            activeTab={activeTab} 
            onAccept={onAccept} 
            onReject={onReject} 
            onUpdateStatus={onUpdate} 
        />
    ), [activeTab, onAccept, onReject, onUpdate]);

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeContainer} edges={['top']}>
                {/* Header Section */}
                <View style={styles.topHeader}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity style={styles.avatarWrap} onPress={() => router.push('/(settings)/edit-profile')}>
                            {profile?.profileImage ? <Image source={{ uri: profile.profileImage }} style={styles.avatar} /> : <View style={styles.avatarEmpty}><Text style={styles.avatarChar}>{profile?.name?.[0] || 'W'}</Text></View>}
                            <View style={styles.statusPing} />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.rankLabel}>COMMANDER</Text>
                            <Text style={styles.userNameHeader}>{profile?.name?.split(' ')[0] || 'Staff'}</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.logoutBtn} onPress={logout}><Ionicons name="power" size={20} color="#FF3B30" /></TouchableOpacity>
                </View>

                {/* Assignment Banner */}
                {profile?.venue && (
                    <View style={styles.venueBanner}>
                        <Ionicons name="business" size={12} color={COLORS.primary} />
                        <Text style={styles.venueLabel}>ASSIGNED: {profile.venue.name.toUpperCase()}</Text>
                        <View style={styles.pulseDot} />
                    </View>
                )}

                {/* HUD Stats */}
                <View style={styles.hudContainer}>
                    {[ 
                        { val: comp.length, lbl: 'SERVED', col: '#FFF' },
                        { val: active.length, lbl: 'ACTIVE', col: '#F59E0B' },
                        { val: avail.length, lbl: 'IN POOL', col: COLORS.emerald }
                    ].map((stat, i) => (
                        <React.Fragment key={i}>
                            <View style={styles.hudStat}>
                                <Text style={[styles.hudValue, { color: stat.col }]}>{stat.val}</Text>
                                <Text style={styles.hudSub}>{stat.lbl}</Text>
                            </View>
                            {i < 2 && <View style={styles.hudSep} />}
                        </React.Fragment>
                    ))}
                </View>

                {/* Tab Switcher */}
                <View style={styles.tabContainer}>
                    {TabTypes.map(t => (
                        <TouchableOpacity key={t} style={[styles.tab, activeTab === t && styles.tabActive]} onPress={() => { Haptics.selectionAsync(); setActiveTab(t); }}>
                            <Text style={[styles.tabTextHeader, activeTab === t && styles.tabTextHeaderActive]}>{t.toUpperCase()}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {loading && !refreshing ? (
                    <View style={{ paddingHorizontal: 20 }}>
                        <OrderSkeleton />
                        <OrderSkeleton />
                    </View>
                ) : (
                    <SafeFlashList
                        data={orders}
                        keyExtractor={(it: any) => it._id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.list}
                        estimatedItemSize={292}
                        showsVerticalScrollIndicator={false}
                        removeClippedSubviews={Platform.OS === 'android'}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
                        ListEmptyComponent={() => (
                            <View style={styles.empty}><Ionicons name="clipboard-outline" size={64} color="rgba(255,255,255,0.05)" /><Text style={styles.emptyTextTitle}>QUEUE EMPTY</Text></View>
                        )}
                    />
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    safeContainer: { flex: 1 },
    
    // Header
    topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatarWrap: { position: 'relative' },
    avatar: { width: 48, height: 48, borderRadius: 16 },
    avatarEmpty: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#222' },
    avatarChar: { color: '#FFF', fontSize: 20, fontWeight: '900' },
    statusPing: { position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.emerald, borderWidth: 2, borderColor: '#000' },
    rankLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
    userNameHeader: { color: '#FFF', fontSize: 18, fontWeight: '900' },
    logoutBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,59,48,0.08)', alignItems: 'center', justifyContent: 'center' },

    venueBanner: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', backgroundColor: '#111', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, gap: 8, marginBottom: 15, borderWidth: 1, borderColor: '#222' },
    venueLabel: { color: COLORS.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    pulseDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.primary },

    hudContainer: { flexDirection: 'row', backgroundColor: '#0A0A0F', marginHorizontal: 20, borderRadius: 20, paddingVertical: 18, marginBottom: 20, borderWidth: 1, borderColor: '#1A1A1A' },
    hudStat: { flex: 1, alignItems: 'center' },
    hudValue: { fontSize: 22, fontWeight: '900' },
    hudSub: { color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: '800', marginTop: 4, letterSpacing: 1 },
    hudSep: { width: 1, height: '60%', backgroundColor: '#222', alignSelf: 'center' },

    tabContainer: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#0A0A0F', borderRadius: 14, padding: 4, marginBottom: 15, borderWidth: 1, borderColor: '#151515' },
    tab: { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
    tabActive: { backgroundColor: '#1A1A1A' },
    tabTextHeader: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    tabTextHeaderActive: { color: '#FFF' },

    // Card Styles
    list: { paddingHorizontal: 20, paddingBottom: 40 },
    orderCard: { 
        backgroundColor: '#12121A', 
        borderRadius: 24, 
        paddingHorizontal: 16, 
        paddingVertical: 18, 
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#1F1F26',
        gap: 16,
        // Shadow for iOS
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        // Elevation for Android
        elevation: 8
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    timestamp: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    timeText: { color: '#AAA', fontSize: 13, fontWeight: '700' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    divider: { height: 1, backgroundColor: '#1F1F26', width: '100%' },

    infoGrid: { flexDirection: 'row', gap: 12 },
    infoItem: { justifyContent: 'center' },
    infoLabel: { color: '#777', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 6, textTransform: 'uppercase' },
    infoValue: { color: '#FFF', fontSize: 15, fontWeight: '800' },

    giftContext: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(236,72,153,0.08)', padding: 10, borderRadius: 12 },
    giftContextText: { color: '#EC4899', fontSize: 11, fontWeight: '600' },

    itemsSection: { backgroundColor: '#0A0A0F', borderRadius: 16, padding: 15, gap: 10 },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    qtyBox: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(124, 77, 255, 0.15)', borderRadius: 8 },
    itemQty: { color: COLORS.primary, fontSize: 12, fontWeight: '900' },
    itemName: { color: '#FFF', fontSize: 14, fontWeight: '700', flex: 1 },
    moreItems: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginTop: 4, textAlign: 'center' },

    actionsRow: { flexDirection: 'row', gap: 12 },
    rejectBtn: { flex: 1, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,59,48,0.1)', borderWidth: 1, borderColor: 'rgba(255,59,48,0.25)' },
    rejectText: { color: '#FF4D4D', fontSize: 13, fontWeight: '900', letterSpacing: 1, marginLeft: 8 },
    acceptBtn: { flex: 1.2, borderRadius: 18, backgroundColor: '#1A1A1F' },
    acceptGrad: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 18 },
    acceptText: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },

    fullAction: { flex: 1, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    fullActionText: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },


    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { alignItems: 'center', marginTop: 100 },
    emptyTextTitle: { color: 'rgba(255,255,255,0.1)', fontSize: 14, fontWeight: '900', letterSpacing: 2, marginTop: 20 },
});
