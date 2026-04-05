import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useWallet, useCoupons, useUserCoupons, useBuyCoupon } from '../../hooks/economics';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';

export default function RewardsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    
    const { data: wallet, isLoading: walletLoading } = useWallet();
    const { data: coupons, isLoading: storeLoading } = useCoupons();
    const { data: userCoupons, isLoading: userCouponsLoading } = useUserCoupons();
    const buyCoupon = useBuyCoupon();

    const displayPoints = wallet?.points ?? 0;

    if (walletLoading || storeLoading || userCouponsLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient 
                colors={['#0F121B', '#050510']} 
                style={StyleSheet.absoluteFill} 
            />
            
            {/* Mesh Glows */}
            <View style={[styles.meshGlow, { top: -100, right: -50, backgroundColor: 'rgba(124, 77, 255, 0.1)' }]} />
            <View style={[styles.meshGlow, { bottom: -150, left: -100, backgroundColor: 'rgba(34, 197, 94, 0.05)' }]} />

            <SafeAreaView style={styles.safe} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>ENTRY CLUB REWARDS</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    {/* Points Hero Card */}
                    <View style={styles.heroCard}>
                        <LinearGradient
                            colors={['rgba(30, 30, 50, 0.8)', 'rgba(15, 15, 25, 1)']}
                            style={styles.heroGrad}
                        >
                            <View style={styles.pointsStatus}>
                                <Ionicons name="sparkles" size={24} color="#FFD700" />
                                <Text style={styles.pointsLabel}>TOTAL LOYALTY BALANCE</Text>
                            </View>
                            <Text style={styles.pointsValue}>{displayPoints}</Text>
                            <Text style={styles.pointsMoney}>₹{(displayPoints * 10).toLocaleString()} VALUE</Text>
                            <View style={styles.pointsBarBase}>
                                <View style={[styles.pointsBarFill, { width: `${Math.min(100, (displayPoints / 500) * 100)}%` }]} />
                            </View>
                            <Text style={styles.tierStatus}>NEXT TIER AT 500 PTS</Text>
                        </LinearGradient>
                    </View>

                    {/* Active Coupons Section */}
                    {userCoupons && userCoupons.length > 0 ? (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>MY ACTIVE PERKS 🎟️</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel}>
                                {userCoupons.map((uc: any) => {
                                    const coupon = uc.couponId || {};
                                    return (
                                        <View key={uc._id} style={styles.ticketCard}>
                                            <View style={styles.ticketTop}>
                                                <Text style={styles.ticketTitle} numberOfLines={1}>{coupon.title || 'Special Perk'}</Text>
                                                <View style={styles.statusBadge}>
                                                    <Text style={styles.statusText}>READY</Text>
                                                </View>
                                            </View>
                                            <Text style={styles.ticketDesc}>
                                                {coupon.discountType === 'percentage' 
                                                    ? `${coupon.discountValue}% OFF` 
                                                    : `₹${coupon.discountValue} FLAT OFF`}
                                            </Text>
                                            <Text style={styles.ticketExpiry}>Expires: {new Date(uc.expiresAt).toLocaleDateString()}</Text>
                                            <View style={styles.ticketDashed} />
                                            <View style={styles.codeWrapper}>
                                                <Text style={styles.ticketCode}>{coupon.code || '------'}</Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>You haven't redeemed any coupons yet. 😔</Text>
                        </View>
                    )}

                    {/* Coupon Store Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>REDEEM POINTS 💎</Text>
                        {coupons?.map((c: any) => {
                            const canAfford = displayPoints >= c.pointsCost;
                            const alreadyOwned = userCoupons?.some((uc: any) => 
                                uc.couponId?._id === c._id || uc.couponId === c._id
                            );
                            const unavailable = c.isSoldOut || c.isInactive || c.isExpired || alreadyOwned;
                            const statusLabel = alreadyOwned ? 'IN WALLET' : c.isSoldOut ? 'SOLD OUT' : c.isExpired ? 'EXPIRED' : c.isInactive ? 'INACTIVE' : null;
                            const statusColor = alreadyOwned
                                ? { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', text: '#22c55e' }
                                : (c.isSoldOut || c.isExpired)
                                    ? { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', text: '#ef4444' }
                                    : { bg: 'rgba(255,255,255,0.07)', border: 'rgba(255,255,255,0.1)', text: 'rgba(255,255,255,0.4)' };

                            return (
                                <View key={c._id} style={[styles.storeCard, unavailable && { opacity: 0.45 }]}>
                                    <View style={styles.storeLeft}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                            <Text style={styles.storeTitle}>{c.title}</Text>
                                            {statusLabel && (
                                                <View style={{
                                                    backgroundColor: statusColor.bg,
                                                    paddingHorizontal: 6,
                                                    paddingVertical: 2,
                                                    borderRadius: 4,
                                                    borderWidth: 1,
                                                    borderColor: statusColor.border,
                                                }}>
                                                    <Text style={{
                                                        color: statusColor.text,
                                                        fontSize: 8,
                                                        fontWeight: '900',
                                                        letterSpacing: 0.5,
                                                    }}>{statusLabel}</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.storeValue}>
                                            {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                                        </Text>
                                        <Text style={styles.storeDesc}>
                                            Min Order ₹{c.minPurchase} • Valid on {c.applicableOn}
                                        </Text>
                                    </View>
                                    <TouchableOpacity 
                                        style={[styles.buyBtn, (!canAfford || unavailable) && styles.buyBtnDisabled]}
                                        disabled={!canAfford || unavailable || buyCoupon.isPending}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                                            buyCoupon.mutate(c._id);
                                        }}
                                    >
                                        {buyCoupon.isPending ? (
                                            <ActivityIndicator size="small" color="#000" />
                                        ) : (
                                            <>
                                                <Text style={styles.buyBtnText}>{c.pointsCost}</Text>
                                                <Ionicons name="flash" size={14} color="#000" />
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>

                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050510' },
    safe: { flex: 1 },
    meshGlow: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.8 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 60 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
    scrollContent: { padding: 20, paddingBottom: 100 },
    heroCard: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 32 },
    heroGrad: { padding: 30, alignItems: 'center' },
    pointsStatus: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    pointsLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
    pointsValue: { color: '#FFF', fontSize: 56, fontWeight: '900', marginBottom: 4 },
    pointsMoney: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 20 },
    pointsBarBase: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, marginBottom: 12 },
    pointsBarFill: { height: '100%', backgroundColor: '#FFD700', borderRadius: 3, shadowColor: '#FFD700', shadowRadius: 10, shadowOpacity: 0.5 },
    tierStatus: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700' },
    section: { marginBottom: 32 },
    sectionTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 20, marginLeft: 5 },
    carousel: { marginHorizontal: -20, paddingHorizontal: 20 },
    ticketCard: { width: 240, backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20, marginRight: 16, borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.2)' },
    ticketTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    ticketTitle: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    statusBadge: { backgroundColor: 'rgba(34, 197, 94, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { color: '#22C55E', fontSize: 9, fontWeight: '900' },
    ticketDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 4 },
    ticketExpiry: { color: 'rgba(255,255,255,0.3)', fontSize: 10, marginBottom: 20 },
    ticketDashed: { width: '100%', height: 1, borderStyle: 'dotted', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 16 },
    ticketCode: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 3, textAlign: 'center' },
    codeWrapper: { backgroundColor: 'rgba(0,0,0,0.3)', paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    emptyContainer: { padding: 40, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center' },
    storeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    storeLeft: { flex: 1 },
    storeTitle: { color: '#FFF', fontSize: 15, fontWeight: '800', marginBottom: 2 },
    storeValue: { color: '#FFD700', fontSize: 14, fontWeight: '900', marginBottom: 4 },
    storeDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
    buyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    buyBtnDisabled: { opacity: 0.3, backgroundColor: 'rgba(255,255,255,0.1)' },
    buyBtnText: { color: '#000', fontSize: 14, fontWeight: '900' },
});
