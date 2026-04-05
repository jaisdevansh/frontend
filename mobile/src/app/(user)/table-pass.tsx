import React, { useRef, useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, Dimensions, ScrollView, Share, Platform,
    ActivityIndicator, Animated
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { userService } from '../../services/userService';
import dayjs from 'dayjs';
import { COLORS } from '../../constants/design-system';

const { width } = Dimensions.get('window');

export default function TablePass() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // ── Load live booking from backend ──
    const bookingId = params.bookingId ? String(params.bookingId) : '';
    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (bookingId) {
            userService.getBookingById(bookingId).then(res => {
                if (res?.success && res.data) {
                    setBooking(res.data);
                    // hostIdRaw = plain string ObjectId injected by backend (always reliable)
                    const resolvedHostId =
                        res.data.hostIdRaw ||                                            // ✅ raw string (best)
                        res.data.hostId?._id?.toString() ||                             // populated object
                        (typeof res.data.hostId === 'string' ? res.data.hostId : null); // plain string
                    console.log('✅ [table-pass] Booking loaded:', JSON.stringify({
                        bookingId: res.data._id,
                        hostIdRaw: res.data.hostIdRaw,
                        resolvedHostId,
                        status: res.data.status,
                    }));
                } else {
                    console.warn('⚠️ [table-pass] No booking data');
                }
            }).finally(() => setLoading(false));
        }
    }, [bookingId]);

    // ── Animate in instantly ──
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 50,
            useNativeDriver: true,
        }).start();
    }, []);

    // ── Fallback to params if no live data ──
    const event = booking?.eventId || {};
    const host  = booking?.hostId  || {};

    const eventTitle  = event.title          || (params.title       ? String(params.title)      : 'Exclusive Event');
    const venueName   = event.venue?.name    || host.name           || (params.venueName  ? String(params.venueName)  : 'The Onyx Lounge');
    const coverImage  = event.coverImage     || host.profileImage   || (params.coverImage ? String(params.coverImage) : '');
    const zone        = booking?.ticketType  || (params.zone        ? String(params.zone)        : 'VIP');
    const timeSlot    = event.startTime      || (params.timeSlot    ? String(params.timeSlot)    : '11:30 PM');
    const eventDate   = event.date
        ? dayjs(event.date).format('ddd, DD MMM YYYY')
        : (params.eventDate ? String(params.eventDate) : 'TBA');

    const guestCount  = String(booking?.guests || (params.guestCount ? Number(params.guestCount) : 1));
    const numGuests   = booking?.guests || (params.guestCount ? Number(params.guestCount) : 1);
    const tableId     = booking?.tableId
        || (params.seatIds ? String(params.seatIds).split(',')[0] : 'TABLE-01');
    const seatIds     = booking?.seatIds
        ? booking.seatIds
        : (params.seatIds ? String(params.seatIds).split(',') : [tableId]);
    const displayBookingId = bookingId
        ? 'STX-' + bookingId.substring(0, 6).toUpperCase()
        : (params.bookingRef ? String(params.bookingRef) : 'STX-000000');
    const pricePaid   = booking?.pricePaid || 0;
    const status      = booking?.status || 'pending';

    const statusColor = status === 'approved' || status === 'active' ? '#22c55e'
                      : status === 'pending' ? '#f59e0b'
                      : status === 'cancelled' ? '#ef4444' : '#22c55e';

    const statusLabel = status === 'approved' ? 'Confirmed'
                      : status === 'active' ? 'Active'
                      : status === 'pending' ? 'Pending Approval'
                      : status === 'cancelled' ? 'Cancelled'
                      : 'Confirmed';

    const handleShare = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await Share.share({
                title: 'My Table Pass',
                message: `🎟️ I'm going to ${eventTitle} at ${venueName}!\n📅 ${eventDate} • ${timeSlot}\n💜 Booking: ${displayBookingId}`,
            });
        } catch {}
    };

    // Removed blocking loader to enable 0-latency perceived performance using params

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent />
            <LinearGradient colors={['#0d0620', '#080415', '#030303']} style={StyleSheet.absoluteFillObject} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity style={styles.headerBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
                    <Ionicons name="chevron-back" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Reservation</Text>
                <TouchableOpacity style={styles.headerBtn} onPress={handleShare}>
                    <Ionicons name="share-outline" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            <Animated.ScrollView
                contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
                showsVerticalScrollIndicator={false}
                style={{ opacity: fadeAnim }}
            >
                {/* Confirmed icon */}
                <View style={styles.checkCircle}>
                    <LinearGradient
                        colors={status === 'cancelled' ? ['#ef4444', '#b91c1c'] : ['#6d28d9', '#4f46e5']}
                        style={styles.checkGrad}
                    >
                        <Ionicons name={status === 'cancelled' ? 'close' : 'checkmark'} size={28} color="#fff" />
                    </LinearGradient>
                    <View style={[styles.ripple, { width: 72, height: 72, opacity: 0.2, borderColor: statusColor }]} />
                    <View style={[styles.ripple, { width: 92, height: 92, opacity: 0.1, borderColor: statusColor }]} />
                </View>

                <Text style={styles.confirmedTitle}>
                    {status === 'cancelled' ? 'Booking Cancelled' : 'Reservation Confirmed'}
                </Text>
                <Text style={styles.tableIdLabel}>TABLE: {tableId.toUpperCase()}</Text>

                {/* Status badge */}
                <View style={[styles.statusPill, { backgroundColor: statusColor + '20', borderColor: statusColor + '50' }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusPillTxt, { color: statusColor }]}>{statusLabel.toUpperCase()}</Text>
                </View>

                {/* Venue card */}
                <View style={styles.venueCard}>
                    {/* Cover image */}
                    <View style={styles.venueImgWrap}>
                        {coverImage ? (
                            <Image source={{ uri: coverImage }} style={styles.venueImg} contentFit="cover" />
                        ) : (
                            <LinearGradient colors={['#1a0a3d', '#0f0630']} style={styles.venueImg}>
                                <Ionicons name="musical-notes" size={40} color="rgba(124,77,255,0.4)" />
                            </LinearGradient>
                        )}
                        <LinearGradient colors={['transparent', 'rgba(8,4,21,0.85)']} style={StyleSheet.absoluteFillObject} />
                    </View>

                    {/* Venue name */}
                    <View style={styles.venueNameSection}>
                        <View style={styles.exclusiveBadge}>
                            <Text style={styles.exclusiveTxt}>EXCLUSIVE {zone.toUpperCase()} ACCESS</Text>
                        </View>
                        <Text style={styles.venueName}>{venueName}</Text>
                        <Text style={styles.eventTitleTxt}>{eventTitle}</Text>
                    </View>

                    {/* Details grid */}
                    <View style={styles.detailsGrid}>
                        <View style={styles.detailCell}>
                            <Text style={styles.detailCellLbl}>DATE</Text>
                            <Text style={styles.detailCellVal}>{eventDate}</Text>
                        </View>
                        <View style={[styles.detailCell, styles.detailCellRight]}>
                            <Text style={styles.detailCellLbl}>TIME</Text>
                            <Text style={styles.detailCellVal}>{timeSlot}</Text>
                        </View>
                        <View style={[styles.detailCell, { borderBottomWidth: 0 }]}>
                            <Text style={styles.detailCellLbl}>GUEST LIST</Text>
                            <Text style={styles.detailCellVal}>{guestCount} Persons</Text>
                        </View>
                        <View style={[styles.detailCell, styles.detailCellRight, { borderBottomWidth: 0 }]}>
                            <Text style={styles.detailCellLbl}>STATUS</Text>
                            <View style={styles.confirmedBadge}>
                                <View style={[styles.confirmedDot, { backgroundColor: statusColor }]} />
                                <Text style={[styles.confirmedBadgeTxt, { color: statusColor }]}>{statusLabel}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Price row */}
                    {pricePaid > 0 && (
                        <View style={styles.priceRow}>
                            <Text style={styles.priceLbl}>Amount Paid</Text>
                            <Text style={styles.priceVal}>₹{pricePaid.toLocaleString()}</Text>
                        </View>
                    )}

                    {/* Dynamic QR Carousel — one QR per guest */}
                    <View style={[styles.qrSection, { paddingHorizontal: 0 }]}>
                        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                            {[...Array(numGuests)].map((_, i) => {
                                const qrData = `STITCH|${bookingId}|${zone}|${tableId}|Pass${i + 1}of${numGuests}`;
                                const qrUrl  = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrData)}&bgcolor=0D0D0D&color=A78BFA&margin=14&ecc=H`;
                                return (
                                    <View key={i} style={{ width: width - 40, alignItems: 'center' }}>
                                        <View style={styles.qrFrame}>
                                            <View style={[styles.corner, styles.cornerTL]} />
                                            <View style={[styles.corner, styles.cornerTR]} />
                                            <View style={[styles.corner, styles.cornerBL]} />
                                            <View style={[styles.corner, styles.cornerBR]} />
                                            <Image source={{ uri: qrUrl }} style={styles.qrImage} contentFit="contain" />
                                        </View>
                                        <Text style={styles.qrHint}>Show Pass {i + 1} of {numGuests} at entrance</Text>
                                        <Text style={styles.bookingIdTxt}>{displayBookingId}-{i + 1}</Text>
                                    </View>
                                );
                            })}
                        </ScrollView>

                        {numGuests > 1 && (
                            <View style={styles.swipeHintContainer}>
                                <Ionicons name="swap-horizontal" size={14} color="rgba(255,255,255,0.4)" />
                                <Text style={styles.swipeHintTxt}>Swipe for all {numGuests} passes</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* CTA — Order from Host Menu */}
                {(booking?.hostIdRaw || booking?.hostId) && (() => {
                    // Use hostIdRaw (always plain string) or fall back
                    const resolvedHostId =
                        booking.hostIdRaw ||
                        booking.hostId?._id?.toString() ||
                        (typeof booking.hostId === 'string' ? booking.hostId : null);

                    if (!resolvedHostId) return null;
                    return (
                        <View style={{ width: '100%', marginTop: 8 }}>
                            <TouchableOpacity
                                activeOpacity={0.85}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    console.log('🍽️ [table-pass] Opening menu with hostId:', resolvedHostId);
                                    router.push({
                                        pathname: '/(user)/discover' as any,
                                        params: { 
                                            tab: 'orders',
                                            hostId: resolvedHostId,
                                            eventId: booking.eventId?._id || booking.eventId,
                                            tableId: booking.tableId,
                                            zone: booking.ticketType || 'Reservation'
                                        }
                                    });
                                }}
                                style={styles.ctaBtn}
                            >
                                <LinearGradient colors={['#6d28d9', '#4f46e5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaBtnInner}>
                                    <Ionicons name="restaurant" size={18} color="#fff" />
                                    <Text style={styles.ctaBtnTxt}>View Menu 🍽️</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    );
                })()}
            </Animated.ScrollView>
        </View>
    );
}

const CARD_RADIUS = 24;

const styles = StyleSheet.create({
    container:          { flex: 1, backgroundColor: '#030303' },
    scroll:             { alignItems: 'center', paddingHorizontal: 20, paddingTop: 12 },

    // Header
    header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
    headerBtn:          { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
    headerTitle:        { color: '#fff', fontSize: 17, fontWeight: '700' },

    // Check icon
    checkCircle:        { alignItems: 'center', justifyContent: 'center', marginBottom: 16, position: 'relative' },
    checkGrad:          { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
    ripple:             { position: 'absolute', borderRadius: 999, borderWidth: 1.5, borderColor: '#7c4dff' },

    // Titles
    confirmedTitle:     { color: '#fff', fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
    tableIdLabel:       { color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '700', letterSpacing: 2, marginBottom: 10 },

    // Status pill
    statusPill:         { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginBottom: 24 },
    statusDot:          { width: 7, height: 7, borderRadius: 4 },
    statusPillTxt:      { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },

    // Venue Card
    venueCard:          { width: '100%', backgroundColor: '#0d0620', borderRadius: CARD_RADIUS, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(124,77,255,0.2)', marginBottom: 20 },
    venueImgWrap:       { width: '100%', height: 160, position: 'relative' },
    venueImg:           { width: '100%', height: '100%' } as any,

    venueNameSection:   { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 0 },
    exclusiveBadge:     { backgroundColor: 'rgba(124,77,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(124,77,255,0.25)' },
    exclusiveTxt:       { color: '#a78bfa', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
    venueName:          { color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 4 },
    eventTitleTxt:      { color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: '600', marginBottom: 16 },

    // Details grid
    detailsGrid:        { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 20, marginBottom: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' },
    detailCell:         { width: '50%', padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    detailCellRight:    { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.05)' },
    detailCellLbl:      { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 5 },
    detailCellVal:      { color: '#fff', fontSize: 14, fontWeight: '700' },

    // Confirmed badge
    confirmedBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
    confirmedDot:       { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e' },
    confirmedBadgeTxt:  { fontSize: 14, fontWeight: '700' },

    // Price row
    priceRow:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginTop: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
    priceLbl:           { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700' },
    priceVal:           { color: '#fff', fontSize: 18, fontWeight: '900' },

    // QR section
    qrSection:          { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 24 },
    qrFrame:            { position: 'relative', padding: 12, backgroundColor: '#0d0620', borderRadius: 20, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(124,77,255,0.25)' },
    qrImage:            { width: 180, height: 180 },

    // Corner accents
    corner:             { position: 'absolute', width: 20, height: 20, borderColor: '#7c4dff' },
    cornerTL:           { top: 4, left: 4, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderTopLeftRadius: 6 },
    cornerTR:           { top: 4, right: 4, borderTopWidth: 2.5, borderRightWidth: 2.5, borderTopRightRadius: 6 },
    cornerBL:           { bottom: 4, left: 4, borderBottomWidth: 2.5, borderLeftWidth: 2.5, borderBottomLeftRadius: 6 },
    cornerBR:           { bottom: 4, right: 4, borderBottomWidth: 2.5, borderRightWidth: 2.5, borderBottomRightRadius: 6 },

    qrHint:             { color: 'rgba(255,255,255,0.35)', fontSize: 12, textAlign: 'center' },
    bookingIdTxt:       { color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: '700', marginTop: 6, letterSpacing: 1 },

    swipeHintContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 },
    swipeHintTxt:       { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700', letterSpacing: 1 },

    // CTA buttons
    ctaBtn:             { width: '100%', borderRadius: 14, overflow: 'hidden' },
    ctaBtnInner:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15 },
    ctaBtnOutline:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15, borderWidth: 1, borderColor: 'rgba(124,77,255,0.35)', borderRadius: 14, backgroundColor: 'rgba(124,77,255,0.06)' },
    ctaBtnTxt:          { color: '#fff', fontSize: 15, fontWeight: '800' },
});
