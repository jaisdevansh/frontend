import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, Dimensions, ActivityIndicator
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { initiateRazorpayPayment } from '../../services/razorpayService';
import { userService } from '../../services/userService';

const { width, height } = Dimensions.get('window');

export default function SplitRequestReceived() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();

    const [loading, setLoading] = useState(false);
    const [declining, setDeclining] = useState(false);

    // Pull data from params
    const requesterName   = params.requesterName   ? String(params.requesterName)   : 'Ananya Sharma';
    const requesterAvatar = params.requesterAvatar ? String(params.requesterAvatar) : 'https://i.pravatar.cc/150?u=ananya';
    const eventTitle      = params.title           ? String(params.title)            : 'Midnight Rooftop Sessions';
    const venueName       = params.venueName       ? String(params.venueName)        : 'Karner Club, Indiranagar';
    const coverImage      = params.coverImage      ? String(params.coverImage)       : 'https://images.unsplash.com/photo-1514525253361-bee8a197c0c1?auto=format&fit=crop&q=80&w=800';
    const shareAmount     = params.shareAmount     ? Number(params.shareAmount)      : 6250;
    const totalGuests     = params.totalGuests     ? Number(params.totalGuests)      : 4;
    const eventDate       = params.eventDate       ? String(params.eventDate)        : 'Friday, Oct 24th • 10:00 PM';
    const zone            = params.zone            ? String(params.zone)             : 'Lounge';
    const eventId         = params.eventId         ? String(params.eventId)          : '';

    const participantsRaw = params.participants ? String(params.participants) : '';
    const participants: string[] = participantsRaw ? participantsRaw.split(',') : [requesterName, 'You', 'Rohan', 'Ishani'];

    const handleAccept = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Guard: amount must be a valid positive number
        if (!shareAmount || shareAmount <= 0 || isNaN(shareAmount)) {
            console.warn('[Split] Invalid shareAmount:', shareAmount);
            return;
        }

        setLoading(true);

        // Fetch current user's profile for prefill
        let profile: any = null;
        try { const r = await userService.getProfile(); if (r.success) profile = r.data; } catch {}

        // Receipt must be max 40 chars
        const receipt = `split_${Date.now()}`.substring(0, 40);

        const result = await initiateRazorpayPayment(
            {
                amount: shareAmount,
                receipt,
                description: `Split Payment – ${eventTitle}`,
                prefillName:    profile?.name    || '',
                prefillEmail:   profile?.email   || '',
                prefillContact: profile?.phone   || '',
                notes: { type: 'split', zone, eventId },
            },
            {
                eventId,
                ticketType: `${zone} Zone (Split)`,
                pricePaid: shareAmount,
                zone,
                guestCount: totalGuests,
            }
        );

        setLoading(false);

        if (result.success) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.push({
                pathname: '/(user)/booking-success',
                params: {
                    isSplit:      'true',
                    title:        eventTitle,
                    venueName,
                    zone,
                    timeSlot:     eventDate,
                    guestCount:   String(totalGuests),
                    participants: participantsRaw,
                    eventId,
                    coverImage:   coverImage, // Pass for table-pass
                    bookingId:     result.booking?._id || undefined, // Use real booking ID from backend
                }
            });
        } else if (result.error !== 'Payment cancelled') {
            // Show error via Alert for simplicity here
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    };

    const handleDecline = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setDeclining(true);
        setTimeout(() => { setDeclining(false); router.back(); }, 800);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent />

            {/* Hero Background */}
            <View style={styles.heroSection}>
                <Image
                    source={{ uri: coverImage }}
                    style={StyleSheet.absoluteFillObject}
                    contentFit="cover"
                />
                <LinearGradient
                    colors={['rgba(3,3,3,0.2)', 'rgba(3,3,3,0.6)', '#030303']}
                    style={StyleSheet.absoluteFillObject}
                />

                {/* Back button */}
                <TouchableOpacity
                    style={[styles.backBtn, { top: insets.top + 12 }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
                >
                    <Ionicons name="chevron-back" size={22} color="#fff" />
                </TouchableOpacity>

                {/* Invite label */}
                <View style={[styles.heroContent, { paddingTop: insets.top + 60 }]}>
                    <View style={styles.inviteBadge}>
                        <Ionicons name="people" size={12} color="#7c4dff" />
                        <Text style={styles.inviteBadgeTxt}>TABLE INVITE</Text>
                    </View>

                    {/* Requester avatar */}
                    <View style={styles.avatarRing}>
                        <Image source={{ uri: requesterAvatar }} style={styles.avatar} contentFit="cover" />
                    </View>

                    <Text style={styles.heroSub}>
                        <Text style={styles.heroSubHighlight}>{requesterName}</Text> invited you to{'\n'}split the booking for
                    </Text>
                    <Text style={styles.heroTitle} numberOfLines={2}>{eventTitle}</Text>
                </View>
            </View>

            {/* Main Card */}
            <View style={styles.card}>

                {/* Your Share */}
                <View style={styles.shareSection}>
                    <Text style={styles.shareLabel}>YOUR SHARE</Text>
                    <View style={styles.amountRow}>
                        <Text style={styles.amountCurrency}>₹</Text>
                        <Text style={styles.amountValue}>{shareAmount.toLocaleString()}</Text>
                    </View>
                    <Text style={styles.splitBreakdown}>1/{participants.length} of total booking</Text>
                </View>

                <View style={styles.divider} />

                {/* Venue Info */}
                <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                        <Ionicons name="location" size={16} color="#7c4dff" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.detailTitle}>{venueName}</Text>
                        <Text style={styles.detailSub}>{zone} Zone</Text>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                        <Ionicons name="calendar" size={16} color="#7c4dff" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.detailTitle}>{eventDate}</Text>
                        <Text style={styles.detailSub}>{totalGuests} Guests Total</Text>
                    </View>
                </View>

                {/* Participants */}
                <View style={styles.participantsRow}>
                    {participants.slice(0, 4).map((name, idx) => (
                        <View key={idx} style={[styles.participantBubble, { marginLeft: idx > 0 ? -10 : 0, zIndex: 10 - idx }]}>
                            <Image
                                source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=7c4dff&color=fff&size=64` }}
                                style={styles.participantAvatar}
                                contentFit="cover"
                            />
                        </View>
                    ))}
                    <Text style={styles.participantLabel}>
                        {participants[0]}{participants.length > 1 ? ` & ${participants.length - 1} others` : ''}
                    </Text>
                </View>

                <View style={styles.divider} />

                {/* Security note */}
                <View style={styles.securityRow}>
                    <Ionicons name="shield-checkmark" size={14} color="#22c55e" />
                    <Text style={styles.securityTxt}>Payment held in escrow · Full refund if cancelled 24h before</Text>
                </View>

            </View>

            {/* Footer CTAs */}
            <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 24 }]}>
                <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept} disabled={loading} activeOpacity={0.88}>
                    <LinearGradient colors={['#6d28d9', '#4f46e5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.acceptGrad}>
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="card" size={18} color="#fff" />
                                <Text style={styles.acceptTxt}>Pay & Join</Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.declineBtn} onPress={handleDecline} disabled={declining} activeOpacity={0.7}>
                    <Text style={styles.declineTxt}>{declining ? 'Declining...' : 'Decline'}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container:          { flex: 1, backgroundColor: '#030303' },

    // Hero
    heroSection:        { height: height * 0.42, position: 'relative' },
    backBtn:            { position: 'absolute', left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
    heroContent:        { paddingHorizontal: 24, paddingBottom: 24, flex: 1, justifyContent: 'flex-end' },
    inviteBadge:        { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(124,77,255,0.18)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(124,77,255,0.3)' },
    inviteBadgeTxt:     { color: '#7c4dff', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
    avatarRing:         { width: 72, height: 72, borderRadius: 36, borderWidth: 2.5, borderColor: '#7c4dff', padding: 3, marginBottom: 14, backgroundColor: 'rgba(124,77,255,0.1)' },
    avatar:             { width: '100%', height: '100%', borderRadius: 32 },
    heroSub:            { color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 20, marginBottom: 6 },
    heroSubHighlight:   { color: '#fff', fontWeight: '800' },
    heroTitle:          { color: '#fff', fontSize: 26, fontWeight: '900', lineHeight: 32 },

    // Card
    card:               { flex: 1, backgroundColor: '#030303', paddingHorizontal: 24, paddingTop: 24 },
    shareSection:       { alignItems: 'center', marginBottom: 20 },
    shareLabel:         { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 6 },
    amountRow:          { flexDirection: 'row', alignItems: 'flex-start' },
    amountCurrency:     { color: '#7c4dff', fontSize: 24, fontWeight: '700', marginTop: 6, marginRight: 2 },
    amountValue:        { color: '#fff', fontSize: 52, fontWeight: '900', letterSpacing: -1 },
    splitBreakdown:     { color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '600', marginTop: 4 },
    divider:            { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 16 },

    // Details
    detailRow:          { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
    detailIcon:         { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(124,77,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    detailTitle:        { color: '#fff', fontSize: 14, fontWeight: '700' },
    detailSub:          { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },

    // Participants
    participantsRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    participantBubble:  { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#030303', overflow: 'hidden' },
    participantAvatar:  { width: '100%', height: '100%' },
    participantLabel:   { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '600', marginLeft: 14 },

    // Security
    securityRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
    securityTxt:        { color: 'rgba(255,255,255,0.35)', fontSize: 11, flex: 1, lineHeight: 16 },

    // Footer
    footer:             { paddingHorizontal: 24, paddingTop: 12, backgroundColor: '#030303' },
    acceptBtn:          { borderRadius: 18, overflow: 'hidden', marginBottom: 12 },
    acceptGrad:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 17 },
    acceptTxt:          { color: '#fff', fontSize: 17, fontWeight: '900' },
    declineBtn:         { alignItems: 'center', paddingVertical: 14 },
    declineTxt:         { color: 'rgba(255,255,255,0.4)', fontSize: 15, fontWeight: '600' },
});
