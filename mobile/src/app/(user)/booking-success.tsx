import React, { useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, Dimensions, Animated, ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const genBookingId = () => 'STX-' + Math.random().toString(36).toUpperCase().substring(2, 8);

export default function BookingSuccess() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();

    const fadeAnim  = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.85)).current;
    const tickAnim  = useRef(new Animated.Value(0)).current;

    // Params
    const eventTitle    = params.title       ? String(params.title)       : 'Midnight Rooftop Sessions';
    const venueName     = params.venueName   ? String(params.venueName)   : 'Karner Club';
    const zone          = params.zone        ? String(params.zone)        : 'Lounge';
    const timeSlot      = params.timeSlot    ? String(params.timeSlot)    : '10:00 PM';
    const guestCount    = params.guestCount  ? Number(params.guestCount)  : 4;
    const seatIds       = params.seatIds     ? String(params.seatIds).split(',') : ['L1-2'];
    const coverImage    = params.coverImage  ? String(params.coverImage)  : '';
    const participantsRaw = params.participants ? String(params.participants) : '';
    const participants  = participantsRaw ? participantsRaw.split(',') : [];
    const isSplit       = params.isSplit === 'true';

    const bookingId = params.bookingId ? String(params.bookingId) : useRef(genBookingId()).current;
    const avatarColors = ['#7c4dff', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

    useEffect(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Animated.parallel([
            Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.spring(tickAnim, { toValue: 1, tension: 80, friction: 6, delay: 300, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent />
            <LinearGradient colors={['#0a0520', '#030303', '#030303']} style={StyleSheet.absoluteFillObject} />

            {/* Close */}
            <TouchableOpacity
                style={[styles.closeBtn, { top: insets.top + 10 }]}
                onPress={() => router.replace('/(user)/home')}
            >
                <Ionicons name="close" size={20} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>

            <ScrollView
                contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* SUCCESS badge */}
                <Animated.View style={[styles.successBadge, { opacity: fadeAnim }]}>
                    <View style={styles.successDot} />
                    <Text style={styles.successBadgeTxt}>SUCCESS</Text>
                </Animated.View>

                {/* Ticket card */}
                <Animated.View style={[styles.ticketWrapper, { transform: [{ scale: scaleAnim }], opacity: fadeAnim }]}>
                    <LinearGradient colors={['#1a0a3d', '#0f0630', '#0a0520']} style={styles.ticketCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>

                        {/* Ticket icon */}
                        <Animated.View style={[styles.ticketIconWrap, {
                            transform: [{ scale: tickAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }]
                        }]}>
                            <LinearGradient colors={['#3d1a8c', '#1e0d5e']} style={styles.ticketIconGrad}>
                                <Ionicons name="ticket" size={40} color="rgba(255,255,255,0.9)" />
                                <Text style={styles.vipLabel}>VIP PASS</Text>
                            </LinearGradient>
                            <View style={styles.ticketGlow} />
                        </Animated.View>

                        {/* Notch divider */}
                        <View style={styles.notchRow}>
                            <View style={styles.notchLeft} />
                            <View style={styles.dashedLine} />
                            <View style={styles.notchRight} />
                        </View>

                        <Text style={styles.confirmedTitle}>{isSplit ? 'PAYMENT\nSUCCESS!' : 'TABLE\nCONFIRMED!'}</Text>
                        <Text style={styles.confirmedSubtitle}>
                            {isSplit 
                                ? `Your share for ${eventTitle} is paid.\nYour entry pass is now active!`
                                : `Booking confirmed for ${guestCount} guests.\nYou and ${Math.max(0, guestCount - 1)} others are now on the guestlist for `
                            }
                            <Text style={{ color: '#fff', fontWeight: '800' }}>{venueName}</Text>
                        </Text>

                        {/* Participant Avatars */}
                        {participants.length > 0 && (
                            <View style={styles.avatarsRow}>
                                {participants.slice(0, 5).map((name, idx) => (
                                    <View key={idx} style={[styles.avatarBubble, { marginLeft: idx > 0 ? -10 : 0, zIndex: 10 - idx, backgroundColor: avatarColors[idx % avatarColors.length] }]}>
                                        <Text style={styles.avatarInitial}>{name.trim()[0]?.toUpperCase() || '?'}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* All paid badge */}
                        <View style={styles.allPaidBadge}>
                            <View style={styles.allPaidDot} />
                            <Text style={styles.allPaidTxt}>ALL PAYMENTS RECEIVED</Text>
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* Info chips */}
                <Animated.View style={[styles.infoRow, { opacity: fadeAnim }]}>
                    <View style={styles.infoChip}><Ionicons name="location-sharp" size={12} color="#7c4dff" /><Text style={styles.infoChipTxt}>{zone} Zone</Text></View>
                    <View style={styles.infoChip}><Ionicons name="time" size={12} color="#7c4dff" /><Text style={styles.infoChipTxt}>{timeSlot}</Text></View>
                    <View style={styles.infoChip}><Ionicons name="people" size={12} color="#7c4dff" /><Text style={styles.infoChipTxt}>{guestCount} Guests</Text></View>
                </Animated.View>

                {/* Booking ID */}
                <Animated.View style={[styles.bookingIdRow, { opacity: fadeAnim }]}>
                    <Text style={styles.bookingIdLbl}>BOOKING ID</Text>
                    <Text style={styles.bookingIdVal}>{bookingId}</Text>
                </Animated.View>

                {/* CTAs */}
                <Animated.View style={[styles.ctaSection, { opacity: fadeAnim }]}>
                    <TouchableOpacity style={styles.openPassBtn} onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        router.push({
                            pathname: '/(user)/table-pass',
                            params: {
                                title:      eventTitle,
                                venueName,
                                zone,
                                timeSlot,
                                eventDate:  timeSlot,
                                guestCount: String(guestCount),
                                seatIds:    seatIds.join(','),
                                coverImage,
                                bookingId,
                            }
                        });
                    }}>
                        <LinearGradient colors={['#4c1d95', '#3730a3']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.openPassGrad}>
                            <Ionicons name="qr-code" size={18} color="#fff" />
                            <Text style={styles.openPassTxt}>OPEN TABLE PASS</Text>
                            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" />
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.myBookingsBtn} onPress={() => router.push('/(user)/my-bookings')}>
                        <Text style={styles.myBookingsTxt}>View in My Bookings</Text>
                    </TouchableOpacity>
                </Animated.View>

                <Animated.Text style={[styles.disclaimer, { opacity: fadeAnim }]}>TRANSACTION BUILT ON TRUST</Animated.Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container:          { flex: 1, backgroundColor: '#030303' },
    scroll:             { alignItems: 'center', paddingHorizontal: 24 },
    closeBtn:           { position: 'absolute', left: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
    successBadge:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(34,197,94,0.1)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(34,197,94,0.25)' },
    successDot:         { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e' },
    successBadgeTxt:    { color: '#22c55e', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
    ticketWrapper:      { width: '100%', marginBottom: 24 },
    ticketCard:         { borderRadius: 28, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(124,77,255,0.2)' },
    ticketIconWrap:     { position: 'relative', marginBottom: 24 },
    ticketIconGrad:     { width: 100, height: 100, borderRadius: 24, alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    vipLabel:           { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
    ticketGlow:         { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: '#7c4dff', opacity: 0.15, top: -10, left: -10, zIndex: -1 },
    notchRow:           { flexDirection: 'row', alignItems: 'center', width: '110%', marginBottom: 24 },
    notchLeft:          { width: 20, height: 20, borderRadius: 10, backgroundColor: '#030303', marginLeft: -28 },
    dashedLine:         { flex: 1, height: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    notchRight:         { width: 20, height: 20, borderRadius: 10, backgroundColor: '#030303', marginRight: -28 },
    confirmedTitle:     { color: '#fff', fontSize: 32, fontWeight: '900', textAlign: 'center', letterSpacing: -0.5, lineHeight: 36, marginBottom: 12 },
    confirmedSubtitle:  { color: 'rgba(255,255,255,0.45)', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
    avatarsRow:         { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    avatarBubble:       { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#0f0630' },
    avatarInitial:      { color: '#fff', fontSize: 13, fontWeight: '800' },
    allPaidBadge:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(34,197,94,0.08)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
    allPaidDot:         { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
    allPaidTxt:         { color: '#22c55e', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
    infoRow:            { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'center' },
    infoChip:           { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(124,77,255,0.08)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(124,77,255,0.15)' },
    infoChipTxt:        { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700' },
    bookingIdRow:       { alignItems: 'center', marginBottom: 28 },
    bookingIdLbl:       { color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: '800', letterSpacing: 2 },
    bookingIdVal:       { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '800', marginTop: 2 },
    ctaSection:         { width: '100%', gap: 12 },
    openPassBtn:        { borderRadius: 18, overflow: 'hidden' },
    openPassGrad:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 17 },
    openPassTxt:        { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
    myBookingsBtn:      { alignItems: 'center', paddingVertical: 14 },
    myBookingsTxt:      { color: 'rgba(255,255,255,0.35)', fontSize: 14, fontWeight: '600' },
    disclaimer:         { color: 'rgba(255,255,255,0.12)', fontSize: 9, fontWeight: '800', letterSpacing: 2, marginTop: 20 },
});
