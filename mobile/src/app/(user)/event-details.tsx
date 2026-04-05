import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, FlatList, ActivityIndicator, StatusBar, Linking, Platform, InteractionManager } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useNavigation, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/design-system';
import { API_BASE_URL } from '../../services/apiClient';
import { io } from 'socket.io-client';
import * as Haptics from 'expo-haptics';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useToast } from '../../context/ToastContext';
import { useStrictBack } from '../../hooks/useStrictBack';
import { useEventBasicQuery, useEventDetailsQuery, useInvalidateEvent } from '../../hooks/useEventQuery';
import { hero, avatar } from '../../services/cloudinaryService';

const { width } = Dimensions.get('window');

const nightMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#263c3f" }] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#6b9a76" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#746855" }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#1f2835" }] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#f3d19c" }] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#2f3948" }] },
  { "featureType": "transit.station", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#515c6d" }] },
  { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [{ "color": "#17263c" }] }
];

const EventDetails = () => {
    const router = useRouter();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const eventId = params.eventId as string;

    const [activeSlide, setActiveSlide] = useState(0);

    // ── Performance Tracking ──────────────────────────────────────────────────
    useEffect(() => {
        // Fresh timestamp each mount — avoids stale ref after back-navigation
        const mountedAt = Date.now();
        console.log(`[PERF] EventDetails mounting...`);
        InteractionManager.runAfterInteractions(() => {
            console.log(`[PERF] EventDetails INTERACTION ready in ${Date.now() - mountedAt}ms`);
        });
    }, []);

    const { showToast } = useToast();
    const [expandedRule, setExpandedRule] = useState<number | null>(null);
    const [bookingLoader, setBookingLoader] = useState(false);
    const goBack = useStrictBack('/(user)/discover');

    // ── React Query: instant from cache, silent background refresh ──────────
    const { data: eventBasic, isLoading: isBasicLoading, isFetching: isBasicFetching } = useEventBasicQuery(eventId);
    const { data: eventDetails, isLoading: isDetailsLoading } = useEventDetailsQuery(eventId);
    
    // useMemo: stable object ref, prevents new {} on every render causing downstream re-render cascade
    const event = useMemo(() => {
        if (!eventBasic && !eventDetails) return null;
        return { ...(eventBasic || {}), ...(eventDetails || {}) };
    }, [eventBasic, eventDetails]);

    const isLoading = isBasicLoading || isDetailsLoading;
    const isFetching = isBasicFetching;
    const invalidateEvent = useInvalidateEvent();

    // ── Socket.io: real-time updates invalidate cache ────────────────────────
    useEffect(() => {
        if (!eventId) return;
        const sock = io(API_BASE_URL, { transports: ['websocket'] });

        sock.on('location_revealed', (data: any) => {
            if (data.eventId === eventId) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showToast('Location Revealed! 📍', 'success');
                invalidateEvent(eventId);
            }
        });
        sock.on('event_updated', (data: any) => {
            if (data.eventId === eventId) invalidateEvent(eventId);
        });
        sock.on('venue_updated', (data: any) => {
            // Use eventId only (no stale closure over event object)
            invalidateEvent(eventId);
        });

        return () => { sock.disconnect(); }; // ✅ guaranteed cleanup
    }, [eventId, invalidateEvent, showToast]);

    const onScroll = (e: any) => setActiveSlide(Math.round(e.nativeEvent.contentOffset.x / width));

    const handleBookNow = useCallback(() => {
        if (!event) return;
        
        // Push instantly! No delays or re-rendering state blocking JS execution.
        const vName = event.venue?.name || event.hostId?.name || 'Exclusive Venue';
        router.push({
            pathname: '/(user)/ticket-selection',
            params: {
                eventId: event._id,
                title: event.title,
                venueName: vName,
                coverImage: event.coverImage || event.images?.[0] || '',
                hostId: event.hostId?._id || event.hostId,
                price: event.tickets?.length > 0 ? event.tickets[0].price : 0,
            },
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setBookingLoader(true);
        setTimeout(() => {
            router.push({
                pathname: '/(user)/ticket-selection',
                params: {
                    eventId: event._id,
                    title: event.title,
                    venueName: event.venueId?.name || '',
                    coverImage: event.coverImage || '',
                    hostId: event.hostId?._id || event.hostId?.id || ''
                }
            });
            setTimeout(() => setBookingLoader(false), 500);
        }, 800);
    }, [event, router]);

    // ── Loading State: only show spinner if no cached data at all ───────────
    if (isLoading && !event) return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <StatusBar barStyle="light-content" backgroundColor="#030303" />
            <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
    );

    if (!event) return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <StatusBar barStyle="light-content" backgroundColor="#030303" />
            <Text style={{ color: '#FFF' }}>Event not found.</Text>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
                <Text style={{ color: COLORS.primary }}>Go Back</Text>
            </TouchableOpacity>
        </View>
    );

    const eventImages = event.images?.length > 0 ? event.images : event.coverImage ? [event.coverImage] : ['https://images.unsplash.com/photo-1514525253361-bee8a197c0c1?auto=format&fit=crop&q=80&w=800'];
    const lowestPrice = event.tickets?.length > 0 ? Math.min(...event.tickets.map((t: any) => t.price)) : null;

    const houseRules = event.houseRules?.length > 0 ? event.houseRules : [
        { icon: 'shirt-outline', title: 'Dress Code: Smart Sophisticated', detail: 'No sportswear, trainers, or caps. Smart attire is required.' },
        { icon: 'person-outline', title: 'ID Required (21+ only)', detail: 'Valid government-issued photo ID is mandatory.' },
        { icon: 'camera-off-outline', title: 'Strict No-Photo Policy', detail: 'Photography is strictly prohibited inside the venue.' },
    ];

    const isLocationMasked = (event.locationVisibility === 'hidden' || event.locationVisibility === 'delayed') && !event.isLocationRevealed;
    const venueName = isLocationMasked ? 'Secret Location 🤫' : (event.title || 'Exclusive Event');
    const venueAddress = isLocationMasked 
        ? (event.locationVisibility === 'delayed' ? 'Location reveals at scheduled time' : 'Location drops exact coordinates before event')
        : (event.locationData?.address || event.hostId?.venueProfile?.address || '');
    const coords = event.locationData || event.hostId?.venueProfile?.coordinates || { lat: 28.6139, lng: 77.2090 };

    const openMaps = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (isLocationMasked) return;

        const { lat, lng } = coords;
        const destination = (lat && lng) ? `${lat},${lng}` : encodeURIComponent(venueAddress);
        
        const url = Platform.select({
            ios: `http://maps.apple.com/?daddr=${destination}&dirflg=d`,
            android: `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`,
            default: `https://www.google.com/maps/dir/?api=1&destination=${destination}`
        });

        if (url) {
            Linking.canOpenURL(url).then(supported => {
                if (supported) Linking.openURL(url);
                else showToast('Could not open map app', 'error');
            });
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <ScrollView contentContainerStyle={{ paddingBottom: 130 + insets.bottom }} showsVerticalScrollIndicator={false}>

                {/* HERO */}
                <View style={{ width, height: 340 }}>
                    <FlatList data={eventImages} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                        keyExtractor={(_, i) => i.toString()} onScroll={onScroll} scrollEventThrottle={16}
                        renderItem={({ item, index }) => {
                            if (index === 0) console.time("[IMAGE_LOAD] Event");
                            return (
                                <Image 
                                    source={{ uri: hero(item) }} 
                                    style={{ width, height: 340 }} 
                                    contentFit="cover" 
                                    transition={300} 
                                    cachePolicy="memory-disk" 
                                    onLoad={() => { if (index === 0) console.timeEnd("[IMAGE_LOAD] Event"); }}
                                />
                            );
                        }}
                    />
                    <LinearGradient colors={['transparent', 'rgba(3,3,3,0.7)', '#030303']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 }} />

                    <View style={[styles.topBar, { top: insets.top + 10 }]}>
                        <TouchableOpacity style={styles.circleBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); goBack(); }}>
                            <Ionicons name="chevron-back" size={22} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.topTitle}>Event Details</Text>
                        <TouchableOpacity style={styles.circleBtn}>
                            <Ionicons name="share-outline" size={22} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    {eventImages.length > 1 && (
                        <View style={{ position: 'absolute', bottom: 55, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                            {eventImages.map((_: any, i: number) => <View key={i} style={[styles.dot, i === activeSlide && styles.dotActive]} />)}
                        </View>
                    )}

                    <View style={{ position: 'absolute', bottom: 22, left: 20, flexDirection: 'row', gap: 8 }}>
                        <View style={styles.heroBadge}><Ionicons name="lock-closed" size={10} color="#fff" /><Text style={styles.heroBadgeText}>PRIVATE PARTY</Text></View>
                        <View style={[styles.heroBadge, { borderColor: 'rgba(34,197,94,0.3)' }]}><Ionicons name="checkmark-circle" size={10} color="#22c55e" /><Text style={[styles.heroBadgeText, { color: '#22c55e' }]}>VERIFIED HOST</Text></View>
                    </View>
                </View>

                {/* CONTENT */}
                <View style={styles.content}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.description}>{event.description}</Text>

                    {/* BOOK NOW */}
                    <TouchableOpacity style={styles.bookBtn} activeOpacity={0.85} onPress={handleBookNow} disabled={bookingLoader}>
                        <LinearGradient colors={['#6d28d9', '#4f46e5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.bookBtnInner}>
                            {bookingLoader ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <ActivityIndicator size="small" color="#fff" />
                                    <Text style={styles.bookBtnText}>Processing...</Text>
                                </View>
                            ) : (
                                <Text style={styles.bookBtnText}>{lowestPrice ? 'Book Now  \u00b7  \u20b9' + lowestPrice : 'Book Now'}</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* HOST INFO */}
                    <View style={styles.hostContainer}>
                        <Image 
                            source={{ uri: avatar(event.hostId?.profileImage, event.hostId?.name) }} 
                            style={styles.hostAvatar} 
                            cachePolicy="memory-disk" 
                        />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.hostLabel}>HOSTED BY</Text>
                            <Text style={styles.hostName}>
                                {event.hostId?.name || (event.hostId?.firstName ? `${event.hostId.firstName} ${event.hostId.lastName || ''}`.trim() : 'Collective Underground')}
                            </Text>
                        </View>
                        <View style={styles.hostStats}>
                            <Text style={styles.hostStatsTxt}>{event.attendeeCount || '100+'} ATTENDING</Text>
                            <Text style={styles.hostStatsSub}>{event.startTime || '10PM'} - {event.endTime || 'LATE'}</Text>
                        </View>
                    </View>

                    {/* HOUSE RULES */}
                    <Text style={styles.sectionLabel}>HOUSE RULES</Text>
                    <View style={styles.rulesCard}>
                        {houseRules.map((rule: any, i: number) => (
                            <TouchableOpacity key={i} style={[styles.ruleRow, i < houseRules.length - 1 && styles.ruleRowBorder]}
                                onPress={() => { Haptics.selectionAsync(); setExpandedRule(expandedRule === i ? null : i); }} activeOpacity={0.7}>
                                <View style={styles.ruleLeft}>
                                    <View style={styles.ruleIconBox}><Ionicons name={rule.icon || 'information-circle-outline'} size={16} color="rgba(255,255,255,0.7)" /></View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.ruleTitle}>{rule.title}</Text>
                                        {expandedRule === i && rule.detail && <Text style={styles.ruleDetail}>{rule.detail}</Text>}
                                    </View>
                                </View>
                                <Ionicons name={expandedRule === i ? 'chevron-up' : 'chevron-down'} size={16} color="rgba(255,255,255,0.3)" />
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* LOCATION MAP */}
                    <Text style={[styles.sectionLabel, { marginTop: 28 }]}>LOCATION</Text>
                    <View style={styles.mapCard}>
                        { isLocationMasked ? (
                            <View style={{ height: 160, backgroundColor: '#0a0a14', alignItems: 'center', justifyContent: 'center' }}>
                                <View style={styles.maskedIconCircle}>
                                    <Ionicons name="lock-closed" size={32} color="#7c4dff" />
                                </View>
                                <Text style={styles.maskedTxt}>
                                    {event.locationVisibility === 'delayed' ? 'Reveals at scheduled time ⏳' : 'Reveals 4 hours before entry'}
                                </Text>
                            </View>
                        ) : (
                            <View style={{ height: 160, overflow: 'hidden' }}>
                                <MapView
                                    provider={PROVIDER_GOOGLE}
                                    style={StyleSheet.absoluteFillObject}
                                    initialRegion={{
                                        latitude: coords.lat,
                                        longitude: coords.lng,
                                        latitudeDelta: 0.005,
                                        longitudeDelta: 0.005,
                                    }}
                                    customMapStyle={nightMapStyle}
                                    pitchEnabled={false}
                                    rotateEnabled={false}
                                    zoomEnabled={false}
                                    scrollEnabled={false}
                                >
                                    <Marker coordinate={{ latitude: coords.lat, longitude: coords.lng }}>
                                        <View style={styles.markerContainer}>
                                            <LinearGradient colors={['#7c4dff', '#4f46e5']} style={styles.markerCircle}>
                                                <Ionicons name="location" size={16} color="#FFF" />
                                            </LinearGradient>
                                        </View>
                                    </Marker>
                                </MapView>
                                <TouchableOpacity style={styles.mapOverlay} activeOpacity={1} onPress={openMaps}>
                                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.4)']} style={StyleSheet.absoluteFillObject} />
                                </TouchableOpacity>
                            </View>
                        )}
                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.mapVenueName}>{venueName}</Text>
                                {venueAddress ? <Text style={[styles.mapAddress, (event.locationVisibility === 'hidden' && !event.isLocationRevealed) && { color: COLORS.primary }]} numberOfLines={1}>{venueAddress}</Text> : null}
                            </View>
                            { !isLocationMasked && (
                                <TouchableOpacity style={styles.directionsBtn} onPress={openMaps}>
                                    <Text style={styles.directionsBtnText}>Directions</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* COMPLIMENTARY REFRESHMENTS */}
                    {event.freeRefreshments && event.freeRefreshments.length > 0 && (
                        <View style={{ marginTop: 12 }}>
                            <Text style={styles.sectionLabel}>COMPLIMENTARY REFRESHMENTS</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20 }}>
                                {event.freeRefreshments.map((item: any, idx: number) => (
                                    <View key={idx} style={styles.inclusionCard}>
                                        <LinearGradient colors={['rgba(124, 77, 255, 0.15)', 'rgba(79, 70, 229, 0.05)']} style={styles.inclusionInner}>
                                            <Ionicons name={(item.icon || 'star') as any} size={20} color={COLORS.primary} />
                                            <View>
                                                <Text style={styles.inclusionTitle}>{item.title}</Text>
                                                {item.description ? <Text style={styles.inclusionDesc} numberOfLines={1}>{item.description}</Text> : null}
                                            </View>
                                        </LinearGradient>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                </View>
            </ScrollView>

            {/* FOOTER */}
            <View style={[styles.stickyFooter, { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 20 }]}>
                <View style={{ flex: 1 }}>
                    {lowestPrice && <><Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600' }}>From</Text><Text style={{ color: '#fff', fontSize: 22, fontWeight: '900' }}>{'\u20b9'}{lowestPrice}</Text></>}
                </View>
                <TouchableOpacity style={styles.footerBtn} onPress={handleBookNow} activeOpacity={0.85} disabled={bookingLoader}>
                    <LinearGradient colors={['#6d28d9', '#4f46e5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 }}>
                        {bookingLoader ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: 100, justifyContent: 'center' }}>
                                <ActivityIndicator size="small" color="#fff" />
                                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Wait...</Text>
                            </View>
                        ) : (
                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Book Now</Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#030303' },
    topBar: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, zIndex: 10 },
    topTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
    circleBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
    dotActive: { backgroundColor: '#fff', width: 20 },
    heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
    heroBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    content: { paddingHorizontal: 20, paddingTop: 4 },
    eventTitle: { color: '#fff', fontSize: 26, fontWeight: '900', marginBottom: 10, lineHeight: 32 },
    description: { color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 22, marginBottom: 24 },
    sectionLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 14 },
    bookBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
    bookBtnInner: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
    bookBtnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
    hostContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D0D0D', borderRadius: 20, padding: 16, gap: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginBottom: 28 },
    hostAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)' },
    hostLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    hostName: { color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 2 },
    hostStats: { alignItems: 'flex-end' },
    hostStatsTxt: { color: '#22c55e', fontSize: 11, fontWeight: '800' },
    hostStatsSub: { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '600', marginTop: 2 },
    rulesCard: { backgroundColor: '#0D0D0D', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: 28 },
    ruleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 15 },
    ruleRowBorder: { borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    ruleLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, marginRight: 8 },
    ruleIconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    ruleTitle: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600' },
    ruleDetail: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 5, lineHeight: 18 },
    mapCard: { backgroundColor: '#0D0D0D', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: 16 },
    mapVenueName: { color: '#fff', fontSize: 15, fontWeight: '700' },
    mapAddress: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
    directionsBtn: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
    directionsBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    menuBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0D0D0D', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginBottom: 8 },
    menuBtnText: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '600' },
    stickyFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, backgroundColor: 'rgba(3,3,3,0.96)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
    footerBtn: { borderRadius: 14, overflow: 'hidden' },
    maskedIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(124, 77, 255, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(124, 77, 255, 0.3)' },
    maskedTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '600' },
    markerContainer: { alignItems: 'center', justifyContent: 'center', width: 40, height: 40 },
    markerCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
    mapOverlay: { ...StyleSheet.absoluteFillObject },
    inclusionCard: { borderRadius: 16, overflow: 'hidden', minWidth: 160, maxWidth: 220 },
    inclusionInner: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(124, 77, 255, 0.2)' },
    inclusionTitle: { color: '#FFF', fontSize: 13, fontWeight: '700' },
    inclusionDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },
});

export default React.memo(EventDetails);