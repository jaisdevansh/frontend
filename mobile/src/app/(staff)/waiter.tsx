import React, { useState, useCallback, memo, useMemo, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { 
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, 
    RefreshControl, Dimensions, Animated, Image, Pressable, Platform 
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { COLORS } from '../../constants/design-system';
import { useToast } from '../../context/ToastContext';
import { staffService } from '../../services/staffService';
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
import { useNotification } from '../../context/NotificationContext';

const { width } = Dimensions.get('window');
const TabTypes = ['available', 'active', 'completed'] as const;
type TabType = typeof TabTypes[number];

const StatusConfig: any = {
    confirmed:         { color: '#F59E0B', label: 'NEW ORDER',  icon: 'bell-ring',       grad: ['#F59E0B', '#D97706'] },
    accepted:          { color: '#6C63FF', label: 'LOCKED IN',  icon: 'lock',            grad: ['#6C63FF', '#4F46E5'] },
    preparing:         { color: '#8B5CF6', label: 'PREPARING',  icon: 'fire',            grad: ['#8B5CF6', '#6D28D9'] },
    out_for_delivery:  { color: '#F97316', label: 'DELIVERING', icon: 'bicycle',         grad: ['#F97316', '#EA580C'] },
    completed:         { color: '#10B981', label: 'SERVED ✓',   icon: 'check-circle',    grad: ['#10B981', '#059669'] },
};

// ─── Fade + Slide-up Card Entrance ──────────────────────────────────────────
const FadeInCard = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
    const opacity   = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(24)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity,    { toValue: 1, duration: 340, delay, useNativeDriver: true, easing: (t) => t }),
            Animated.spring(translateY, { toValue: 0, delay, useNativeDriver: true, tension: 80, friction: 9 }),
        ]).start();
    }, []);

    return (
        <Animated.View style={{ opacity, transform: [{ translateY }] }}>
            {children}
        </Animated.View>
    );
};

// ─── Scale Pressable ────────────────────────────────────────────────────────
const ScaleButton = ({ children, onPress, style, disabled }: any) => {
    const scale = useMemo(() => new Animated.Value(1), []);
    const onIn  = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, tension: 200, friction: 10 }).start();
    const onOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, tension: 200, friction: 10 }).start();
    return (
        <Pressable onPress={onPress} onPressIn={onIn} onPressOut={onOut}
            style={[style, disabled && { opacity: 0.45 }]} disabled={disabled}>
            <Animated.View style={{ transform: [{ scale }], flex: 1, width: '100%', height: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                {children}
            </Animated.View>
        </Pressable>
    );
};

// ─── Shimmer Skeleton ────────────────────────────────────────────────────────
const Shimmer = ({ style }: any) => {
    const anim = useRef(new Animated.Value(0.08)).current;
    useEffect(() => {
        Animated.loop(Animated.sequence([
            Animated.timing(anim, { toValue: 0.22, duration: 900, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0.08, duration: 900, useNativeDriver: true }),
        ])).start();
    }, []);
    return <Animated.View style={[style, { backgroundColor: '#FFF', opacity: anim }]} />;
};

const OrderSkeleton = () => (
    <View style={styles.orderCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            <Shimmer style={{ width: 90, height: 16, borderRadius: 8 }} />
            <Shimmer style={{ width: 80, height: 26, borderRadius: 13 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <Shimmer style={{ flex: 1, height: 54, borderRadius: 16 }} />
            <Shimmer style={{ flex: 1, height: 54, borderRadius: 16 }} />
            <Shimmer style={{ flex: 1, height: 54, borderRadius: 16 }} />
        </View>
        <Shimmer style={{ width: '100%', height: 80, borderRadius: 16, marginBottom: 16 }} />
        <Shimmer style={{ width: '100%', height: 56, borderRadius: 18 }} />
    </View>
);

// ─── Order Card ──────────────────────────────────────────────────────────────
const OrderCard = memo(({ order, activeTab, onAccept, onReject, onUpdateStatus }: any) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const cfg = StatusConfig[order.status] || StatusConfig.confirmed;
    const isAvailable = activeTab === 'available';
    const isActive    = activeTab === 'active';
    const isGift      = order.type === 'gift';
    const timeStr     = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const nextStatus = order.status === 'accepted' ? 'preparing'
                     : order.status === 'preparing' ? 'out_for_delivery'
                     : order.status === 'out_for_delivery' ? 'completed' : null;

    const nextLabel  = order.status === 'accepted' ? '🔥  START PREPARING'
                     : order.status === 'preparing' ? (isGift ? '🎁  DELIVER GIFT' : '🚴  START DELIVERY')
                     : order.status === 'out_for_delivery' ? (isGift ? '✅  GIFT DELIVERED' : '✅  MARK SERVED') : '';

    const nextGrad = order.status === 'accepted' ? ['#8B5CF6', '#6D28D9']
                   : order.status === 'preparing' ? ['#F97316', '#EA580C']
                   : ['#10B981', '#059669'];

    return (
        <TouchableOpacity activeOpacity={0.9} onPress={() => { Haptics.selectionAsync(); setIsExpanded(!isExpanded); }} style={[styles.orderCard, isGift && styles.giftCard]}>
            {/* Left accent strip */}
            <LinearGradient colors={cfg.grad as any} style={styles.cardAccentStrip} />

            {/* Header */}
            <View style={styles.cardTopRow}>
                <View style={styles.cardTimeWrap}>
                    {isGift && <MaterialCommunityIcons name="gift" size={13} color="#EC4899" style={{ marginRight: 4 }} />}
                    <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.35)" />
                    <Text style={styles.cardTimeText}>{timeStr}</Text>
                </View>
                <View style={[styles.statusPill, { borderColor: cfg.color + '40', backgroundColor: cfg.color + '18' }]}>
                    <View style={[styles.statusDotSmall, { backgroundColor: cfg.color }]} />
                    <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
            </View>

            {/* Info Strip */}
            <View style={styles.infoStrip}>
                <View style={[styles.infoChip, { borderColor: 'rgba(255,255,255,0.07)' }]}>
                    <Text style={styles.infoChipLabel}>ZONE</Text>
                    <Text style={styles.infoChipValue} numberOfLines={isExpanded ? undefined : 1}>{order.zone?.toUpperCase() || 'VIP'}</Text>
                </View>
                <View style={[styles.infoChip, { borderColor: `${cfg.color}30`, backgroundColor: `${cfg.color}10` }]}>
                    <Text style={styles.infoChipLabel}>TABLE</Text>
                    <Text style={[styles.infoChipValue, { color: cfg.color }]} numberOfLines={isExpanded ? undefined : 1}>
                        {(() => {
                            const tid = order.tableId || '';
                            if (tid.includes('_s')) return tid.split('_s')[1];
                            if (tid.length > 10) return tid.substring(tid.length - 4).toUpperCase();
                            return tid || '—';
                        })()}
                    </Text>
                </View>
                <View style={[styles.infoChip, { borderColor: 'rgba(255,255,255,0.07)', flex: 1.2 }]}>
                    <Text style={styles.infoChipLabel}>GUEST</Text>
                    <Text style={[styles.infoChipValue, { textAlign: 'center' }]} numberOfLines={isExpanded ? undefined : 2}>
                        {isGift ? (order.receiverId?.name || 'Guest') : (order.userId?.name || 'Guest')}
                    </Text>
                </View>
            </View>

            {/* Gift Context */}
            {isGift && (order.senderId || order.receiverId) && (
                <View style={styles.giftBanner}>
                    <LinearGradient colors={['rgba(236,72,153,0.15)', 'rgba(236,72,153,0.04)']} style={styles.giftBannerInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                        <MaterialCommunityIcons name="gift-outline" size={18} color="#EC4899" />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.giftSender}>
                                <Text style={{ color: '#EC4899', fontWeight: '800' }}>{order.senderId?.name || 'Someone'}</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.5)' }}> → </Text>
                                <Text style={{ color: '#10B981', fontWeight: '800' }}>{order.receiverId?.name || 'Guest'}</Text>
                            </Text>
                            {order.tableId && <Text style={styles.giftDeliverTo}>📍 {order.tableId}</Text>}
                        </View>
                    </LinearGradient>
                </View>
            )}

            {/* Items */}
            <View style={styles.itemsBox}>
                {(order.items || []).slice(0, isExpanded ? 999 : 4).map((it: any, idx: number) => (
                    <View key={idx} style={styles.itemRow}>
                        <View style={[styles.qtyBadge, { backgroundColor: `${cfg.color}20`, borderColor: `${cfg.color}30` }]}>
                            <Text style={[styles.qtyText, { color: cfg.color }]}>{it.qty || it.quantity}×</Text>
                        </View>
                        <Text style={styles.itemName} numberOfLines={isExpanded ? undefined : 1}>{it.name}</Text>
                        {it.price && <Text style={styles.itemPrice}>₹{it.price}</Text>}
                    </View>
                ))}
                {!isExpanded && (order.items?.length || 0) > 4 && (
                    <Text style={styles.moreItems}>+{order.items.length - 4} more items</Text>
                )}
            </View>

            {/* Actions */}
            {isAvailable && (
                <View style={styles.actionsRow}>
                    <ScaleButton style={styles.rejectBtn} onPress={() => onReject(order._id)}>
                        <Ionicons name="close-circle-outline" size={18} color="#FF4D4D" />
                        <Text style={styles.rejectText}>SKIP</Text>
                    </ScaleButton>
                    <ScaleButton style={styles.acceptBtn} onPress={() => onAccept(order._id)}>
                        <LinearGradient
                            colors={isGift ? ['#EC4899', '#BE185D'] : [COLORS.primary, '#6366F1']}
                            style={styles.acceptGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                            <Text style={styles.acceptText}>{isGift ? 'CLAIM GIFT' : 'ACCEPT ORDER'}</Text>
                            <Ionicons name="flash" size={16} color="white" />
                        </LinearGradient>
                    </ScaleButton>
                </View>
            )}

            {isActive && nextStatus && (
                <ScaleButton style={styles.progressBtn} onPress={() => onUpdateStatus(order._id, nextStatus)}>
                    <LinearGradient colors={nextGrad as any} style={styles.progressGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                        <Text style={styles.progressText}>{nextLabel}</Text>
                    </LinearGradient>
                </ScaleButton>
            )}
        </TouchableOpacity>
    );
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function WaiterPanel() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { logout } = useAuth();
    const { showToast } = useToast();
    const { unreadCount } = useNotification();
    const [activeTab, setActiveTab] = useState<TabType>('available');
    const [profile, setProfile] = useState<any>(null);

    const { data: avail = [], isLoading: availL, refetch: refAvail, isRefetching: availR } = useAvailableOrders();
    const { data: active = [], isLoading: activeL, refetch: refMy,   isRefetching: activeR } = useMyOrders();
    const { data: comp  = [], isLoading: compL,  refetch: refComp, isRefetching: compR  } = useCompletedOrders();

    const acceptMut = useAcceptOrder();
    const rejectMut = useRejectOrder();
    const updateMut = useUpdateOrderStatus();
    useWaiterSocket();

    const orders    = activeTab === 'available' ? avail : activeTab === 'active' ? active : comp;
    const loading   = activeTab === 'available' ? availL : activeTab === 'active' ? activeL : compL;
    const refreshing = activeTab === 'available' ? availR : activeTab === 'active' ? activeR : compR;

    const handleRefresh = useCallback(() => {
        if (activeTab === 'available') refAvail();
        else if (activeTab === 'active') refMy();
        else refComp();
    }, [activeTab]);

    const fetchProfile = useCallback(async () => {
        try {
            const res = await staffService.getProfile();
            // staffService returns response.data = { success, data: staff }
            const staffData = res?.data || (res?.success ? res : null);
            if (staffData) setProfile(staffData);
        } catch {}
    }, []);

    useFocusEffect(useCallback(() => { fetchProfile(); }, [fetchProfile]));

    const onAccept = useCallback(async (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        try { await acceptMut.mutateAsync(id); showToast('✅ Order Locked!', 'success'); setActiveTab('active'); }
        catch (e: any) { showToast(e.response?.data?.message || 'Failed', 'error'); }
    }, [acceptMut, showToast]);

    const onReject = useCallback(async (id: string) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        try { await rejectMut.mutateAsync({ orderId: id, reason: 'Staff busy' }); showToast('Order Skipped', 'error'); }
        catch (e: any) { showToast(e.response?.data?.message || 'Failed', 'error'); }
    }, [rejectMut, showToast]);

    const onUpdate = useCallback(async (id: string, status: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try { await updateMut.mutateAsync({ orderId: id, status }); }
        catch { showToast('Update failed', 'error'); }
    }, [updateMut, showToast]);

    const renderItem = useCallback(({ item, index }: any) => (
        <FadeInCard delay={Math.min(index * 60, 300)}>
            <OrderCard order={item} activeTab={activeTab} onAccept={onAccept} onReject={onReject} onUpdateStatus={onUpdate} />
        </FadeInCard>
    ), [activeTab, onAccept, onReject, onUpdate]);

    const TAB_ICONS: any  = { available: 'layers-outline', active: 'flash-outline', completed: 'checkmark-done-outline' };
    const TAB_COLORS: any = { available: '#F59E0B', active: '#6C63FF', completed: '#10B981' };

    // Tab fade transition
    const tabOpacity = useRef(new Animated.Value(1)).current;
    const switchTab = useCallback((t: TabType) => {
        Haptics.selectionAsync();
        Animated.sequence([
            Animated.timing(tabOpacity, { toValue: 0, duration: 100, useNativeDriver: true }),
            Animated.timing(tabOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        ]).start();
        setActiveTab(t);
    }, [tabOpacity]);

    // 3 fixed stat animation refs — no hooks inside map!
    const stat0Anim = useRef(new Animated.Value(0)).current;
    const stat1Anim = useRef(new Animated.Value(0)).current;
    const stat2Anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const anims = [stat0Anim, stat1Anim, stat2Anim];
        Animated.stagger(80, anims.map(a =>
            Animated.spring(a, { toValue: 1, friction: 8, tension: 45, useNativeDriver: true })
        )).start();
    }, []);

    return (
        <View style={styles.root}>
            <LinearGradient colors={['#0D0D14', '#070710', '#000']} style={StyleSheet.absoluteFill} />

            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* ── Premium Header ── */}
                <LinearGradient
                    colors={['rgba(108,99,255,0.12)', 'transparent']}
                    style={styles.headerGradient}
                >
                    <View style={styles.topHeader}>
                        <View style={styles.headerLeft}>
                            <TouchableOpacity style={styles.avatarContainer} onPress={() => router.push('/(settings)/edit-profile')}>
                                <LinearGradient colors={['#6C63FF', '#4F46E5']} style={styles.avatarRing}>
                                    {profile?.profileImage
                                        ? <Image source={{ uri: profile.profileImage }} style={styles.avatar} />
                                        : <View style={styles.avatarFallback}><Text style={styles.avatarChar}>{(profile?.name || 'W')[0].toUpperCase()}</Text></View>
                                    }
                                </LinearGradient>
                                <View style={styles.onlineDot} />
                            </TouchableOpacity>
                            <View>
                                <Text style={styles.roleLabel}>⚡ WAITER</Text>
                                <Text style={styles.nameLabel} numberOfLines={1}>
                                    {profile?.name || profile?.username || 'Staff Member'}
                                </Text>
                                {profile?.username ? (
                                    <Text style={styles.usernameLabel}>@{profile.username}</Text>
                                ) : null}
                                {profile?.hostId && (
                                    <Text style={styles.venueLabel} numberOfLines={1}>
                                        📍 {profile.hostId.name || profile.hostId.businessName || 'Venue'}
                                    </Text>
                                )}
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <TouchableOpacity style={styles.bellBtn} onPress={() => router.push('/(settings)/notifications' as any)}>
                                <Ionicons name="notifications-outline" size={24} color="#FFF" />
                                {unreadCount > 0 && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.logoutBtn} onPress={() => logout(true)}>
                                <LinearGradient colors={['rgba(255,59,48,0.15)', 'rgba(255,59,48,0.05)']} style={styles.logoutInner}>
                                    <Ionicons name="power" size={18} color="#FF4D4D" />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </LinearGradient>

                {/* ── Stats Row ── */}
                <View style={styles.statsRow}>
                    {[
                        { val: avail.length,  label: 'IN POOL', color: '#F59E0B', icon: 'layers-outline',         bg: ['rgba(245,158,11,0.15)', 'rgba(245,158,11,0.04)'],  tab: 'available', anim: stat0Anim },
                        { val: active.length, label: 'ACTIVE',  color: '#6C63FF', icon: 'flash-outline',          bg: ['rgba(108,99,255,0.15)', 'rgba(108,99,255,0.04)'],  tab: 'active',    anim: stat1Anim },
                        { val: comp.length,   label: 'SERVED',  color: '#10B981', icon: 'checkmark-done-outline', bg: ['rgba(16,185,129,0.15)', 'rgba(16,185,129,0.04)'],  tab: 'completed', anim: stat2Anim },
                    ].map((s, i) => (
                        <Animated.View key={i} style={{ flex: 1, opacity: s.anim, transform: [{ scale: s.anim.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }) }] }}>
                            <TouchableOpacity style={styles.statCard} onPress={() => switchTab(s.tab as TabType)} activeOpacity={0.8}>
                                <LinearGradient colors={s.bg as any} style={styles.statCardInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                                    <Ionicons name={s.icon as any} size={18} color={s.color} style={{ marginBottom: 8 }} />
                                    <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
                                    <Text style={styles.statLabel}>{s.label}</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>
                    ))}
                </View>

                {/* ── Tab Bar ── */}
                <View style={styles.tabRow}>
                    {TabTypes.map(t => {
                        const isActive = activeTab === t;
                        return (
                            <TouchableOpacity key={t} style={styles.tabItem} onPress={() => switchTab(t)} activeOpacity={0.8}>
                                {isActive
                                    ? <LinearGradient colors={[TAB_COLORS[t] + '30', TAB_COLORS[t] + '10']} style={[styles.tabPill, { borderColor: TAB_COLORS[t] + '50' }]}>
                                        <Ionicons name={TAB_ICONS[t]} size={12} color={TAB_COLORS[t]} />
                                        <Text style={[styles.tabLabel, { color: TAB_COLORS[t] }]} numberOfLines={1}>{t === 'available' ? 'NEW' : t === 'completed' ? 'DONE' : 'ACTIVE'}</Text>
                                        {(t === 'available' ? avail.length : t === 'active' ? active.length : comp.length) > 0 && (
                                            <View style={[styles.tabBadge, { backgroundColor: TAB_COLORS[t] }]}>
                                                <Text style={styles.tabBadgeText}>{t === 'available' ? avail.length : t === 'active' ? active.length : comp.length}</Text>
                                            </View>
                                        )}
                                    </LinearGradient>
                                    : <View style={[styles.tabPill, { borderColor: 'transparent', backgroundColor: 'transparent' }]}>
                                        <Ionicons name={TAB_ICONS[t]} size={12} color="rgba(255,255,255,0.25)" />
                                        <Text style={[styles.tabLabel, { color: 'rgba(255,255,255,0.25)' }]} numberOfLines={1}>{t === 'available' ? 'NEW' : t === 'completed' ? 'DONE' : 'ACTIVE'}</Text>
                                        {(t === 'available' ? avail.length : t === 'active' ? active.length : comp.length) > 0 && (
                                            <View style={[styles.tabBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                                                <Text style={[styles.tabBadgeText, { color: 'rgba(255,255,255,0.8)' }]}>{t === 'available' ? avail.length : t === 'active' ? active.length : comp.length}</Text>
                                            </View>
                                        )}
                                    </View>
                                }
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* ── List ── */}
                {loading && !refreshing ? (
                    <View style={{ padding: 20 }}><OrderSkeleton /><OrderSkeleton /></View>
                ) : (
                    <Animated.View style={{ flex: 1, opacity: tabOpacity }}>
                    <SafeFlashList
                        data={orders}
                        keyExtractor={(it: any) => it._id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.list}
                        estimatedItemSize={310}
                        showsVerticalScrollIndicator={false}
                        removeClippedSubviews={Platform.OS === 'android'}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
                        ListEmptyComponent={() => (
                            <View style={styles.empty}>
                                <LinearGradient colors={['rgba(108,99,255,0.10)', 'transparent']} style={styles.emptyCircle}>
                                    <Ionicons name="clipboard-outline" size={48} color="rgba(108,99,255,0.3)" />
                                </LinearGradient>
                                <Text style={styles.emptyTitle}>QUEUE CLEAR</Text>
                                <Text style={styles.emptySub}>No orders in this section right now</Text>
                            </View>
                        )}
                    />
                    </Animated.View>
                )}
            </SafeAreaView>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000' },

    // Header
    headerGradient: { paddingBottom: 12, paddingTop: 18 },
    topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 0, paddingBottom: 8 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    avatarContainer: { position: 'relative' },
    avatarRing: { width: 52, height: 52, borderRadius: 18, padding: 2, alignItems: 'center', justifyContent: 'center' },
    avatar: { width: 48, height: 48, borderRadius: 16 },
    avatarFallback: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#0D0D20', alignItems: 'center', justifyContent: 'center' },
    avatarChar: { color: '#FFF', fontSize: 22, fontWeight: '900' },
    onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 13, height: 13, borderRadius: 7, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#000' },
    roleLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
    nameLabel: { color: '#FFF', fontSize: 17, fontWeight: '900', marginTop: 1, maxWidth: 180 },
    usernameLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 15, fontWeight: '700', marginTop: 2 },
    venueLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '600', marginTop: 2, maxWidth: 180 },
    bellBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', position: 'relative' },
    badge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#EF4444', minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000', paddingHorizontal: 4 },
    badgeText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
    logoutBtn: { borderRadius: 14, overflow: 'hidden' },
    logoutInner: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

    // Stats
    statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 14, marginTop: 8 },
    statCard: { flex: 1, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
    statCardInner: { padding: 14, alignItems: 'center' },
    statVal: { fontSize: 26, fontWeight: '900', marginBottom: 2 },
    statLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '900', letterSpacing: 1 },

    // Tabs
    tabRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    tabItem: { flex: 1 },
    tabPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
    tabLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    tabBadge: { position: 'absolute', top: -6, right: -4, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#000' },
    tabBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '900', includeFontPadding: false, textAlignVertical: 'center', marginTop: Platform.OS === 'ios' ? 1 : 0 },

    // List
    list: { paddingHorizontal: 20, paddingBottom: 50 },

    // Order Card
    orderCard: {
        backgroundColor: '#0E0E18',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.07)',
        marginBottom: 16,
        padding: 18,
        gap: 14,
        position: 'relative',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 10,
    },
    giftCard: { borderColor: 'rgba(236,72,153,0.2)' },
    cardAccentStrip: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, borderTopLeftRadius: 24, borderBottomLeftRadius: 24 },

    cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginLeft: 10 },
    cardTimeWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    cardTimeText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '700' },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
    statusDotSmall: { width: 6, height: 6, borderRadius: 3 },
    statusPillText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },

    // Info chips
    infoStrip: { flexDirection: 'row', gap: 6, marginLeft: 6 },
    infoChip: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
    infoChipLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: '900', letterSpacing: 1.2, marginBottom: 5 },
    infoChipValue: { color: '#FFF', fontSize: 13, fontWeight: '900', textAlign: 'center' },

    // Gift banner
    giftBanner: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(236,72,153,0.2)' },
    giftBannerInner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
    giftSender: { fontSize: 13, fontWeight: '600' },
    giftDeliverTo: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 3 },

    // Items
    itemsBox: { backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 16, padding: 14, gap: 10, marginLeft: 6 },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    qtyBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
    qtyText: { fontSize: 12, fontWeight: '900' },
    itemName: { flex: 1, color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '700' },
    itemPrice: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700' },
    moreItems: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 1, textAlign: 'center', marginTop: 4 },

    // Actions
    actionsRow: { flexDirection: 'row', gap: 10, marginLeft: 6 },
    rejectBtn: { width: 88, height: 54, borderRadius: 16, backgroundColor: 'rgba(255,59,48,0.08)', borderWidth: 1, borderColor: 'rgba(255,59,48,0.2)', gap: 4 },
    rejectText: { color: '#FF4D4D', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    acceptBtn: { flex: 1, height: 54, borderRadius: 16, overflow: 'hidden', backgroundColor: '#1A1A2A' },
    acceptGrad: { flex: 1, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16 },
    acceptText: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },

    progressBtn: { height: 56, borderRadius: 18, overflow: 'hidden', marginLeft: 6 },
    progressGrad: { flex: 1, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
    progressText: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 },

    // Empty
    empty: { alignItems: 'center', marginTop: 80 },
    emptyCircle: { width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    emptyTitle: { color: 'rgba(255,255,255,0.15)', fontSize: 16, fontWeight: '900', letterSpacing: 3 },
    emptySub: { color: 'rgba(255,255,255,0.1)', fontSize: 12, fontWeight: '600', marginTop: 8 },
});
