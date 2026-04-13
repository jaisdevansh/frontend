import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    StatusBar, TextInput, ActivityIndicator, Dimensions, Modal, BackHandler, Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../constants/design-system';
import { userService } from '../../services/userService';
import { initiateRazorpayPayment } from '../../services/razorpayService';
import { useToast } from '../../context/ToastContext';
import { useUserCoupons, useApplyCoupon } from '../../hooks/economics';
import apiClient from '../../services/apiClient';

const { width, height } = Dimensions.get('window');

export default function SecureCheckout() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { showToast } = useToast();
    const params = useLocalSearchParams();

    // Context from params
    const eventId   = params.eventId ? String(params.eventId) : '';
    const hostId    = params.hostId  ? String(params.hostId)  : '';
    const title     = params.title   ? String(params.title)   : 'Private Event';
    const venueName = params.venueName ? String(params.venueName) : '';
    const cover     = params.coverImage ? String(params.coverImage) : 'https://images.unsplash.com/photo-1514525253361-bee8a197c0c1';
    const zone      = params.zone    ? String(params.zone)    : 'VIP';
    const timeSlot  = params.timeSlot ? String(params.timeSlot) : '10:30 PM onwards';
    const seatIds   = params.seatIds ? String(params.seatIds).split(',') : [];

    // Local state
    const initialGuests = params.guests ? Number(params.guests) : (params.guestCount ? Number(params.guestCount) : 2);
    const [profile, setProfile] = useState<any>(null);
    const [guests, setGuests] = useState(initialGuests);
    const [coupon, setCoupon] = useState('');
    const [isApplied, setIsApplied] = useState(false);
    const [appliedDiscount, setAppliedDiscount] = useState(0);
    const [selectedUserCoupon, setSelectedUserCoupon] = useState<any>(null); // tracks the full UserCoupon object
    const [showCouponPicker, setShowCouponPicker] = useState(false);

    const [promo, setPromo] = useState('');
    const [isPromoApplied, setIsPromoApplied] = useState(false);
    const [promoDiscount, setPromoDiscount] = useState(0);

    const [processing, setProcessing] = useState(false);
    const [showSelection, setShowSelection] = useState(false);

    const { data: userCoupons } = useUserCoupons();
    const applyCouponMut = useApplyCoupon();

    useEffect(() => {
        userService.getProfile().then(r => { if (r.success) setProfile(r.data); }).catch(() => {});
    }, []);

    // Price calcs
    // Prefer total from params if available (calculated in previous step), fallback to estimate
    const passedTotal = params.total ? Number(params.total) : 0;
    const basePrice = passedTotal > 0 ? (passedTotal / guests) : (zone.includes('VIP') ? 2500 : zone.includes('Lounge') ? 1500 : 800);
    const subtotal  = passedTotal > 0 ? passedTotal : (Math.max(1, guests) * basePrice);
    const taxRate   = 0.08;
    const tax       = Math.round(subtotal * taxRate);
    const totalDiscount = (isApplied ? appliedDiscount : 0) + (isPromoApplied ? promoDiscount : 0);
    const total     = Math.max(0, subtotal + tax - totalDiscount);

    // Razorpay receipt: max 40 chars
    const makeReceipt = (prefix: string) =>
        `${prefix}_${Date.now()}`.substring(0, 40);

    const goBack = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace({
                pathname: '/(user)/floor-plan',
                params: { 
                    eventId, hostId, title, venueName, coverImage: cover, 
                    guests: String(guests), zone, timeSlot, 
                    seatIds: seatIds.join(',') 
                }
            });
        }
    }, [router, eventId, hostId, title, venueName, cover, guests, zone, timeSlot, seatIds]);

    useEffect(() => {
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            goBack();
            return true;
        });
        return () => sub.remove();
    }, [goBack]);

    const applyCoupon = () => {
        if (!coupon) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        const activeCoupon = userCoupons?.find((uc: any) => uc.couponId?.code === coupon.toUpperCase());
        
        if (activeCoupon) {
            console.log('[Frontend] Applying coupon:', { 
                userCouponId: activeCoupon._id, 
                orderType: 'event', 
                subtotal, 
                hostId 
            });
            
            applyCouponMut.mutate(
                { userCouponId: activeCoupon._id, orderType: 'event', subtotal, hostId },
                {
                    onSuccess: (data: any) => {
                        console.log('[Frontend] Coupon applied successfully:', data);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        setIsApplied(true);
                        setAppliedDiscount(data.discount);
                        setSelectedUserCoupon(activeCoupon);
                        showToast(`Coupon Applied! Saved ₹${data.discount}`, 'success');
                    },
                    onError: (error: any) => {
                        console.log('[Frontend] Coupon apply error:', error.response?.data || error.message);
                        showToast(error.response?.data?.message || 'Failed to apply coupon', 'error');
                    }
                }
            );
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showToast('Invalid or unowned coupon code', 'error');
        }
    };

    const applyFromPicker = (uc: any) => {
        console.log('[Frontend] 🔥 applyFromPicker CALLED with:', uc);
        setShowCouponPicker(false);
        const code = uc.couponId?.code || '';
        setCoupon(code);

        console.log('[Frontend] Applying coupon from picker:', { 
            userCouponId: uc._id, 
            orderType: 'event', 
            subtotal, 
            hostId,
            couponCode: code
        });

        applyCouponMut.mutate(
            { userCouponId: uc._id, orderType: 'event', subtotal, hostId },
            {
                onSuccess: (data: any) => {
                    console.log('[Frontend] ✅ Coupon applied successfully:', data);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setIsApplied(true);
                    setAppliedDiscount(data.discount);
                    setSelectedUserCoupon(uc);
                    showToast(`Coupon Applied! Saved ₹${data.discount}`, 'success');
                },
                onError: (error: any) => {
                    console.log('[Frontend] ❌ Coupon apply error:', error.response?.data || error.message);
                    showToast(error.response?.data?.message || 'Failed to apply coupon', 'error');
                }
            }
        );
    };

    const applyPromo = async () => {
        if (!promo) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        try {
            const { data } = await apiClient.post('/api/v1/coupons/verify-code', {
                code: promo,
                subtotal,
                hostId
            });

            if (data.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setIsPromoApplied(true);
                setPromoDiscount(data.data.discount);
                showToast(`Promo Applied! Saved ₹${data.data.discount}`, 'success');
            }
        } catch (error: any) {
            const msg = error?.response?.data?.message || 'Invalid Promo Code';
            showToast(msg, 'error');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    };

    const handleFullPayment = async () => {
        setShowSelection(false);

        if (!total || total < 1) {
            showToast('Invalid amount', 'error');
            return;
        }

        setProcessing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        const result = await initiateRazorpayPayment(
            {
                amount: total,
                receipt: makeReceipt('rcpt'),
                description: `${zone} Booking – ${title}`,
                prefillName:    profile?.name    || '',
                prefillEmail:   profile?.email   || '',
                prefillContact: profile?.phone   || '',
                notes: { zone, eventId, seats: seatIds.join(',') },
            },
            {
                eventId,
                hostId,
                ticketType: `${zone} Zone`,
                tableId: seatIds[0] || undefined,
                pricePaid: total,
                seatIds,
                zone,
                guestCount: guests,
                userCouponId: selectedUserCoupon?._id || undefined, // ← backend marks this as used
            }
        );

        setProcessing(false);

        if (result.success) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.push({
                pathname: '/(user)/booking-success',
                params: {
                    title,
                    venueName,
                    zone,
                    timeSlot,
                    guestCount: String(guests),
                    seatIds: seatIds.join(','),
                    coverImage: cover,
                    bookingId: result.booking?._id || '',
                }
            });
        } else if (result.error !== 'Payment cancelled') {
            showToast(result.error || 'Payment failed', 'error');
        }
    };

    const handleSplitPayment = () => {
        setShowSelection(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push({
            pathname: '/(user)/split-payment',
            params: { ...params, total: total.toString(), guests: guests.toString() }
        });
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent />
            
            {/* ── HEADER ── */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={20} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Secure Checkout</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 120 + insets.bottom }]} showsVerticalScrollIndicator={false}>
                
                {/* ── EVENT CARD ── */}
                <View style={styles.eventCard}>
                    <Image source={{ uri: cover }} style={styles.eventImg} contentFit="cover" />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.eventHost}>{zone.toUpperCase()} GUESTLIST</Text>
                        <Text style={styles.eventTitle}>{title}</Text>
                        <View style={styles.eventDetailRow}>
                             <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.4)" />
                             <Text style={styles.eventDetailTxt}>{timeSlot}</Text>
                        </View>
                    </View>
                </View>

                {/* Location Pill */}
                <View style={styles.locationCard}>
                    <View style={styles.locLeft}>
                         <View style={styles.locCircle}>
                             <Ionicons name="location-sharp" size={14} color="rgba(255,255,255,0.6)" />
                         </View>
                         <Text style={styles.locName}>{venueName || 'Exclusive Venue'}</Text>
                    </View>
                    <TouchableOpacity>
                        <Text style={styles.detailsLink}>Details <Ionicons name="open-outline" size={12} /></Text>
                    </TouchableOpacity>
                </View>

                {/* ── GUESTS ── */}
                <View style={[styles.guestsCard, { alignItems: 'center' }]}>
                    <View style={styles.guestIconBox}>
                        <Ionicons name="people" size={20} color="#7c4dff" />
                    </View>
                    <View style={{ flex: 1, paddingLeft: 12 }}>
                        <Text style={styles.guestTitle}>Members</Text>
                        <Text style={styles.guestSub}>Total passes included</Text>
                    </View>
                    <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'rgba(124,77,255,0.1)', borderRadius: 12 }}>
                        <Text style={[styles.stepVal, { color: '#7c4dff', fontWeight: '800', fontSize: 20 }]}>{guests.toString().padStart(2, '0')}</Text>
                    </View>
                </View>

                {/* ── MY COUPONS ── */}
                {userCoupons && userCoupons.length > 0 && (
                    <>
                        <Text style={styles.sectionLabel}>My Coupons</Text>
                        <TouchableOpacity 
                            style={[styles.couponCard, isApplied && { borderColor: 'rgba(34,197,94,0.3)' }]}
                            onPress={() => {
                                if (!isApplied) {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setShowCouponPicker(true);
                                }
                            }}
                        >
                            <Ionicons name="ticket" size={20} color={isApplied ? '#22c55e' : 'rgba(255,255,255,0.4)'} />
                            <View style={{ flex: 1 }}>
                                {isApplied && selectedUserCoupon ? (
                                    <>
                                        <Text style={{ color: '#22c55e', fontSize: 13, fontWeight: '800' }}>{selectedUserCoupon.couponId?.code}</Text>
                                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 }}>Saved ₹{appliedDiscount} • Applied ✓</Text>
                                    </>
                                ) : (
                                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '600' }}>
                                        {userCoupons.length} coupon{userCoupons.length > 1 ? 's' : ''} available — tap to select
                                    </Text>
                                )}
                            </View>
                            {isApplied ? (
                                <TouchableOpacity 
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setIsApplied(false);
                                        setAppliedDiscount(0);
                                        setSelectedUserCoupon(null);
                                        setCoupon('');
                                    }}
                                    style={{ padding: 8 }}
                                >
                                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                                </TouchableOpacity>
                            ) : (
                                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />
                            )}
                        </TouchableOpacity>
                    </>
                )}

                {/* ── PROMO CODE ── */}
                <Text style={styles.sectionLabel}>Promo Code</Text>
                <View style={styles.couponCard}>
                    <Ionicons name="flash-outline" size={20} color={isPromoApplied ? '#22c55e' : "rgba(255,255,255,0.4)"} />
                    <TextInput 
                        placeholder="ENTER PROMO CODE" 
                        placeholderTextColor="rgba(255,255,255,0.2)"
                        style={styles.couponInput}
                        value={promo}
                        onChangeText={setPromo}
                        autoCapitalize="characters"
                        editable={!isPromoApplied}
                    />
                    {isPromoApplied ? (
                        <TouchableOpacity 
                            style={[styles.applyBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]} 
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setIsPromoApplied(false);
                                setPromoDiscount(0);
                                setPromo('');
                            }}
                        >
                            <Text style={[styles.applyBtnTxt, { color: '#ef4444' }]}>REMOVE</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity 
                            style={styles.applyBtn} 
                            onPress={applyPromo}
                        >
                            <Text style={styles.applyBtnTxt}>APPLY</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* ── PAYMENT SUMMARY ── */}
                <View style={styles.summaryTable}>
                    <View style={styles.summaryHeader}>
                        <Ionicons name="receipt-outline" size={18} color="#7c4dff" />
                        <Text style={styles.summaryTitle}>Payment Summary</Text>
                    </View>
                    
                    <View style={styles.row}>
                        <Text style={[styles.rowLbl, { flex: 1 }]} numberOfLines={1}>{zone} ({guests} Guests)</Text>
                        <Text style={styles.rowVal}>₹{subtotal.toFixed(2)}</Text>
                    </View>
                    {seatIds.length > 0 && (
                        <View style={styles.row}>
                            <Text style={[styles.rowLbl, { flex: 1 }]} numberOfLines={1}>Seats: {seatIds.join(', ')}</Text>
                            <Text style={styles.rowVal}>Reserved</Text>
                        </View>
                    )}
                    <View style={styles.row}>
                        <Text style={[styles.rowLbl, { flex: 1 }]}>Luxury Tax (8%)</Text>
                        <Text style={styles.rowVal}>₹{tax.toFixed(2)}</Text>
                    </View>
                    {isApplied && (
                        <View style={styles.row}>
                            <Text style={[styles.rowLbl, { color: '#22c55e', flex: 1 }]}>Invite Discount</Text>
                            <Text style={[styles.rowVal, { color: '#22c55e' }]}>- ₹{appliedDiscount.toFixed(2)}</Text>
                        </View>
                    )}
                    {isPromoApplied && (
                        <View style={styles.row}>
                            <Text style={[styles.rowLbl, { color: '#22c55e', flex: 1 }]}>Promo Discount</Text>
                            <Text style={[styles.rowVal, { color: '#22c55e' }]}>- ₹{promoDiscount.toFixed(2)}</Text>
                        </View>
                    )}
                    <View style={styles.dash} />
                    <View style={[styles.row, { marginBottom: 0 }]}>
                        <Text style={styles.totalLbl}>Total Payable</Text>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.totalVal}>₹{total.toFixed(2)}</Text>
                            <Text style={styles.taxSub}>INCL. ALL TAXES</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* ── FOOTER ── */}
            <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 20 }]}>
                <TouchableOpacity 
                    style={[styles.payBtn, processing && { opacity: 0.7 }]} 
                    onPress={() => { setShowSelection(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                    disabled={processing}
                >
                    <LinearGradient
                        colors={['#6d28d9', '#4f46e5']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={styles.payGrad}
                    >
                        {processing ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.payTxt}>Pay with Razorpay</Text>
                                <Ionicons name="lock-closed" size={14} color="rgba(255,255,255,0.4)" />
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
                <Text style={styles.secureBanner}>100% SECURE TRANSACTION</Text>
            </View>

            {/* ── PAYMENT METHOD SELECTION (MODAL) ── */}
            <Modal visible={showSelection} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowSelection(false)} />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHandle} />
                            <Text style={styles.modalTitle}>Choose Payment Method</Text>
                            <Text style={styles.modalSub}>Select how you want to pay ₹{total.toLocaleString()}</Text>
                        </View>

                        <View style={styles.optionList}>
                            <TouchableOpacity style={styles.optionCard} onPress={handleFullPayment}>
                                <View style={[styles.optionIcon, { backgroundColor: 'rgba(124,77,255,0.1)' }]}>
                                    <Ionicons name="card" size={24} color="#7c4dff" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.optionLabel}>Pay Full Amount</Text>
                                    <Text style={styles.optionDesc}>Settle entire booking ₹{total.toLocaleString()} now</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.2)" />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.optionCard} onPress={handleSplitPayment}>
                                <View style={[styles.optionIcon, { backgroundColor: 'rgba(34,197,94,0.1)' }]}>
                                    <Ionicons name="people" size={24} color="#22c55e" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.optionLabel}>Split with Friends</Text>
                                    <Text style={styles.optionDesc}>Split ₹{total.toLocaleString()} with your squad</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.2)" />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.closeBtn} onPress={() => setShowSelection(false)}>
                            <Text style={styles.closeBtnTxt}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ── COUPON PICKER MODAL ── */}
            <Modal visible={showCouponPicker} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowCouponPicker(false)} />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHandle} />
                            <Text style={styles.modalTitle}>My Coupons</Text>
                            <Text style={styles.modalSub}>Select a coupon to apply at checkout</Text>
                        </View>

                        <View style={{ gap: 12, marginBottom: 24 }}>
                            {userCoupons?.map((uc: any) => {
                                const c = uc.couponId || {};
                                return (
                                    <TouchableOpacity 
                                        key={uc._id}
                                        style={[styles.optionCard, { flexDirection: 'column', alignItems: 'flex-start' }]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            applyFromPicker(uc);
                                        }}
                                    >
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 8 }}>
                                            <Text style={{ color: '#22c55e', fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>READY FOR USE</Text>
                                            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 2 }}>{c.code}</Text>
                                        </View>
                                        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>{c.title}</Text>
                                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>
                                            {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                                            {c.minPurchase > 0 ? ` • Min ₹${c.minPurchase}` : ''}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <TouchableOpacity style={styles.closeBtn} onPress={() => setShowCouponPicker(false)}>
                            <Text style={styles.closeBtnTxt}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    container:      { flex: 1, backgroundColor: '#030303' },
    header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16 },
    backBtn:        { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 22 },
    headerTitle:    { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
    scroll:         { paddingHorizontal: 20, paddingTop: 10 },
    eventCard:      { backgroundColor: '#0D0D0D', borderRadius: 24, padding: 16, flexDirection: 'row', gap: 16, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    eventImg:       { width: 70, height: 70, borderRadius: 35, backgroundColor: '#1a1a1a' },
    eventHost:      { color: '#7c4dff', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 4 },
    eventTitle:     { color: '#fff', fontSize: 17, fontWeight: '800', marginBottom: 6 },
    eventDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    eventDetailTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '600' },
    locationCard:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0D0D0D', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    locLeft:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
    locCircle:      { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    locName:        { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
    detailsLink:    { color: '#7c4dff', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
    guestsCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D0D0D', borderRadius: 24, padding: 16, gap: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 24 },
    guestIconBox:   { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(124,77,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    guestTitle:     { color: '#fff', fontSize: 15, fontWeight: '800' },
    guestSub:       { color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2 },
    stepper:        { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 6, paddingVertical: 6, borderRadius: 30 },
    stepBtn:        { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
    stepBtnTxt:     { color: '#fff', fontSize: 18, fontWeight: '400' },
    stepVal:        { color: '#fff', fontSize: 16, fontWeight: '900', minWidth: 24, textAlign: 'center' },
    sectionLabel:   { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
    couponCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D0D0D', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 28 },
    couponInput:    { flex: 1, color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
    applyBtn:       { backgroundColor: 'rgba(124,77,255,0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
    applyBtnTxt:    { color: '#7c4dff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    summaryTable:   { backgroundColor: '#0D0D0D', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    summaryHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    summaryTitle:   { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
    row:            { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
    rowLbl:         { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '600' },
    rowVal:         { color: '#fff', fontSize: 14, fontWeight: '700' },
    dash:           { height: 1.5, backgroundColor: 'rgba(255,255,255,0.04)', marginBottom: 16, borderStyle: 'dashed' },
    totalLbl:       { color: '#fff', fontSize: 16, fontWeight: '800' },
    totalVal:       { color: '#fff', fontSize: 24, fontWeight: '900' },
    taxSub:         { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '800', marginTop: 2 },
    footer:         { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 16, backgroundColor: 'rgba(3,3,3,0.98)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
    payBtn:         { borderRadius: 18, overflow: 'hidden' },
    payGrad:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
    payTxt:         { color: '#fff', fontSize: 16, fontWeight: '900' },
    secureBanner:   { color: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: '800', textAlign: 'center', marginTop: 12, letterSpacing: 1 },
    modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    modalContent:   { backgroundColor: '#0D0D0D', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    modalHeader:    { alignItems: 'center', marginBottom: 28 },
    modalHandle:    { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 20 },
    modalTitle:     { color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 6 },
    modalSub:       { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
    optionList:     { gap: 12, marginBottom: 24 },
    optionCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', padding: 18, borderRadius: 24, gap: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    optionIcon:     { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    optionLabel:    { color: '#fff', fontSize: 16, fontWeight: '800' },
    optionDesc:     { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 4 },
    closeBtn:       { alignItems: 'center', paddingVertical: 12 },
    closeBtnTxt:    { color: 'rgba(255,255,255,0.3)', fontSize: 15, fontWeight: '700' },
});