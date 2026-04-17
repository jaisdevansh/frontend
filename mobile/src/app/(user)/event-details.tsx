import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, FlatList, ActivityIndicator, StatusBar, Linking, Platform, InteractionManager, Share } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useNavigation, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/design-system';
import { API_BASE_URL } from '../../services/apiClient';
import { io } from 'socket.io-client';
import * as Haptics from 'expo-haptics';
import { useToast } from '../../context/ToastContext';
import { useStrictBack } from '../../hooks/useStrictBack';
import { useEventBasicQuery, useEventDetailsQuery, useInvalidateEvent } from '../../hooks/useEventQuery';
import { hero, avatar } from '../../services/cloudinaryService';
import { log } from '../../utils/logger';
import dayjs from 'dayjs';

const { width } = Dimensions.get('window');

const GEOAPIFY_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_KEY || 'e6f13848c19246eab1bef2662e18ebd0';

// ── Safe array helper: always returns a real array ───────────────────────────
const safeArray = <T,>(val: any): T[] => (Array.isArray(val) ? val : []);

const EventDetails = () => {
    const router = useRouter();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const eventId = params.eventId as string;

    const [activeSlide, setActiveSlide] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const scrollTimer = useRef<any>(null);
    const isUserInteracting = useRef(false);

    // ── Performance Tracking ──────────────────────────────────────────────────
    useEffect(() => {
        const mountedAt = Date.now();
        InteractionManager.runAfterInteractions(() => {
            // Screen ready
        });
    }, [eventId]);

    const { showToast } = useToast();
    const [expandedRule, setExpandedRule] = useState<number | null>(null);
    const [bookingLoader, setBookingLoader] = useState(false);
    const goBack = useStrictBack('/(user)/discover');

    // ── React Query: instant from cache, silent background refresh ──────────
    const { data: eventBasic, isLoading: isBasicLoading, isFetching: isBasicFetching, isError: isBasicError } = useEventBasicQuery(eventId);
    const { data: eventDetails, isLoading: isDetailsLoading, isError: isDetailsError } = useEventDetailsQuery(eventId);

    // useMemo: stable object ref, prevents new {} on every render causing downstream re-render cascade
    const event = useMemo(() => {
        if (!eventBasic && !eventDetails) return null;
        return { ...(eventBasic || {}), ...(eventDetails || {}) };
    }, [eventBasic, eventDetails]);

    const isLoading = isBasicLoading || isDetailsLoading;
    const isError = isBasicError && isDetailsError; // Only show overall error if BOTH failed
    const invalidateEvent = useInvalidateEvent();

    // ── Step 7: Log event data before render ─────────────────────────────────
    useEffect(() => {
        if (event && event._id) {
            // Event data loaded
        }
    }, [event]);

    // ── Socket.io: real-time updates invalidate cache ────────────────────────
    useEffect(() => {
        if (!eventId) return;
        const sock = io(API_BASE_URL, { transports: ['websocket'] });

        sock.on('location_revealed', (data: any) => {
            if (data?.eventId === eventId) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showToast('Location Revealed! 📍', 'success');
                invalidateEvent(eventId);
            }
        });
        sock.on('event_updated', (data: any) => {
            if (data?.eventId === eventId) invalidateEvent(eventId);
        });
        sock.on('venue_updated', (_data: any) => {
            invalidateEvent(eventId);
        });

        return () => { sock.disconnect(); };
    }, [eventId, invalidateEvent, showToast]);

    const internalIndex = useRef(0);
    const onScroll = useCallback((e: any) => {
        const index = Math.round(e.nativeEvent.contentOffset.x / width);
        setActiveSlide(index);
        internalIndex.current = index;
    }, []);

    const handleBookNow = useCallback(() => {
        if (!event) return;

        const tickets = safeArray<any>(event.tickets);
        const vName = (event.venue as any)?.name || (event.hostId as any)?.name || 'Exclusive Venue';
        const coverImg = (event.coverImage as string) || safeArray<any>(event.images)[0] || '';
        const lowestPriceVal: number = tickets.length > 0 ? (Number((tickets[0] as any)?.price) || 0) : 0;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setBookingLoader(true);

        setTimeout(() => {
            router.push({
                pathname: '/(user)/ticket-selection',
                params: {
                    eventId: event._id,
                    title: event.title || '',
                    venueName: vName,
                    coverImage: coverImg,
                    hostId: event.hostId?._id || event.hostId || '',
                    price: lowestPriceVal,
                },
            });
            setTimeout(() => setBookingLoader(false), 500);
        }, 150);
    }, [event, router]);

    // ── Step 6: Derive data for carousel hook ────────────────────────────────
    const eventImages = useMemo(() => {
        const images = safeArray<any>(event?.images);
        if (images.length > 0) return images;
        if (event?.coverImage) return [event.coverImage];
        return ['https://images.unsplash.com/photo-1514525253361-bee8a197c0c1?auto=format&fit=crop&q=80&w=800'];
    }, [event?.images, event?.coverImage]);

    // ── Ultra-Robust Auto Carousel Logic ─────────────────────────────────────
    useEffect(() => {
        if (!eventImages || eventImages.length <= 1 || isLoading) return;

        const startAutoScroll = () => {
            if (scrollTimer.current) clearInterval(scrollTimer.current);
            scrollTimer.current = setInterval(() => {
                if (isUserInteracting.current) return;
                
                internalIndex.current = (internalIndex.current + 1) % eventImages.length;
                flatListRef.current?.scrollToIndex({
                    index: internalIndex.current,
                    animated: true
                });
            }, 4000);
        };

        const interactionTimeout = setTimeout(startAutoScroll, 500);
        return () => {
            clearTimeout(interactionTimeout);
            if (scrollTimer.current) clearInterval(scrollTimer.current);
        };
    }, [eventImages.length, isLoading]);

    // ── Loading State: only show spinner if no cached data at all ───────────
    if (!eventId) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <StatusBar barStyle="light-content" backgroundColor="#030303" />
                <Text style={{ color: '#FFF' }}>Error: Event ID Missing.</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
                    <Text style={{ color: COLORS.primary }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (isLoading && !event) return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <StatusBar barStyle="light-content" backgroundColor="#030303" />
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 16, fontSize: 13, fontWeight: '600' }}>Entering Experience...</Text>
        </View>
    );

    // Show loading if still fetching (retrying)
    if ((isBasicFetching || isDetailsLoading) && !event) return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <StatusBar barStyle="light-content" backgroundColor="#030303" />
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 16, fontSize: 13, fontWeight: '600' }}>Loading event details...</Text>
        </View>
    );

    if (!event) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 30 }]}>
                <StatusBar barStyle="light-content" backgroundColor="#030303" />
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                    <Ionicons name="search-outline" size={32} color="#EF4444" />
                </View>
                <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '800' }}>Event details not found</Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 10, lineHeight: 20 }}>
                    This event may have been updated or moved. Try refreshing your discovery list.
                </Text>
                
                <TouchableOpacity 
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); invalidateEvent(eventId); }} 
                    style={{ marginTop: 30, backgroundColor: COLORS.primary, paddingHorizontal: 30, paddingVertical: 14, borderRadius: 16 }}
                >
                    <Text style={{ color: '#FFF', fontWeight: '800' }}>Retry Now</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 24 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ── Step 7: Final data preparation ───────────────────────────────────────
    const tickets   = safeArray<any>(event.tickets);
    const houseRulesRaw = safeArray<any>(event.houseRules);
    const refreshments  = safeArray<any>(event.freeRefreshments);

    const lowestPrice = tickets.length > 0
        ? Math.min(...tickets.map((t: any) => Number(t?.price) || 0))
        : null;

    const houseRules = houseRulesRaw.length > 0 ? houseRulesRaw : [
        { icon: 'shirt-outline', title: 'Dress Code: Smart Sophisticated', detail: 'No sportswear, trainers, or caps. Smart attire is required.' },
        { icon: 'person-outline', title: 'ID Required (21+ only)', detail: 'Valid government-issued photo ID is mandatory.' },
        { icon: 'eye-off-outline', title: 'Strict No-Photo Policy', detail: 'Photography is strictly prohibited inside the venue.' },
    ];

    const isLocationMasked = (event.locationVisibility === 'hidden' || event.locationVisibility === 'delayed') && !event.isLocationRevealed;
    const venueName = isLocationMasked ? 'Secret Location 🤫' : (event.venueId?.name || event.hostId?.name || event.title || 'Exclusive Event');
    const venueAddress = isLocationMasked
        ? (event.locationVisibility === 'delayed' ? 'Location reveals at scheduled time' : 'Location drops exact coordinates before event')
        : (event.locationData?.address || event.venueId?.address || event.hostId?.location?.address || event.hostId?.venueProfile?.address || '');
    const realLat = parseFloat(event.locationData?.lat || event.venueId?.coordinates?.lat || event.hostId?.location?.coordinates?.[1] || event.hostId?.venueProfile?.coordinates?.lat as any);
    const realLng = parseFloat(event.locationData?.lng || event.venueId?.coordinates?.long || event.venueId?.coordinates?.lng || event.hostId?.location?.coordinates?.[0] || event.hostId?.venueProfile?.coordinates?.lng as any);

    const safeLat = realLat || 28.6139;
    const safeLng = realLng || 77.2090;
    const coords = { lat: safeLat, lng: safeLng };
    const staticMapUrl = `https://maps.geoapify.com/v1/staticmap?style=osm-carto&width=600&height=320&center=lonlat:${coords.lng},${coords.lat}&zoom=15.5&marker=lonlat:${coords.lng},${coords.lat};color:%237c4dff;size:large&apiKey=${GEOAPIFY_KEY}`;

    const openMaps = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (isLocationMasked) {
            showToast('Location is hidden until event time', 'info');
            return;
        }

        // Build destination: prefer coordinates, fall back to address, then venue name
        let destination: string;
        if (realLat && realLng) {
            destination = `${realLat},${realLng}`;
        } else if (venueAddress) {
            destination = encodeURIComponent(venueAddress);
        } else if (venueName && venueName !== 'Secret Location 🤫') {
            destination = encodeURIComponent(venueName);
        } else {
            showToast('Location not available yet', 'info');
            return;
        }

        const url = Platform.select({
            ios: `http://maps.apple.com/?daddr=${destination}&dirflg=d`,
            android: `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`,
            default: `https://www.google.com/maps/dir/?api=1&destination=${destination}`
        })!;

        Linking.openURL(url).catch(() => showToast('Could not open maps app', 'error'));
    };

    const handleShare = async () => {
        if (!event) return;
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const appLink = 'https://entryclub.com/download'; // 🌐 Final production app link
            const message = `Check out "${event.title}" on Entry Club! 🥂\n\n${event.description || ''}\n\nBook your spot here: ${appLink}`;
            
            await Share.share({
                message,
                title: event.title,
            });
        } catch (error) {
            showToast('Unable to share event', 'error');
        }
    };

    // ── Step Extra: try/catch wrapper around entire render ───────────────────
    try {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
                <ScrollView contentContainerStyle={{ paddingBottom: 130 + insets.bottom }} showsVerticalScrollIndicator={false}>

                    {/* HERO */}
                    <View style={{ width, height: 340 }}>
                        <FlatList
                            ref={flatListRef}
                            data={eventImages}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={(_item, i) => String(i)}
                            onScroll={onScroll}
                            scrollEventThrottle={16}
                            onScrollBeginDrag={() => { isUserInteracting.current = true; }}
                            onScrollEndDrag={() => { isUserInteracting.current = false; }}
                            removeClippedSubviews={true}
                            initialNumToRender={5}
                            maxToRenderPerBatch={5}
                            windowSize={5}
                            onScrollToIndexFailed={(info) => {
                                // Fallback: if scroll fails (common on quick mounting), just jump to index
                                flatListRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
                            }}
                            renderItem={({ item, index }: { item: any; index: number }) => {
                                return (
                                    <Image
                                        source={{ uri: hero(item) || '' }}
                                        style={{ width, height: 340 }}
                                        contentFit="cover"
                                        transition={300}
                                        cachePolicy="memory-disk"
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
                            <TouchableOpacity style={styles.circleBtn} onPress={handleShare}>
                                <Ionicons name="share-outline" size={22} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        {eventImages.length > 1 && (
                            <View style={{ position: 'absolute', bottom: 55, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                                {eventImages.map((_: any, i: number) => <View key={i} style={[styles.dot, i === activeSlide && styles.dotActive]} />)}
                            </View>
                        )}

                        <View style={{ position: 'absolute', bottom: 22, left: 20, flexDirection: 'row', gap: 8 }}>
                            {/* Dynamic Location Badge */}
                            {event.locationVisibility === 'public' ? (
                                <View style={[styles.heroBadge, { borderColor: 'rgba(124,77,255,0.3)' }]}>
                                    <Ionicons name="location-sharp" size={10} color="#7c4dff" />
                                    <Text style={[styles.heroBadgeText, { color: '#7c4dff' }]}>PUBLIC LOCATION</Text>
                                </View>
                            ) : event.locationVisibility === 'delayed' ? (
                                <View style={[styles.heroBadge, { borderColor: 'rgba(251,146,60,0.3)' }]}>
                                    <Ionicons name="time-outline" size={10} color="#fb923c" />
                                    <Text style={[styles.heroBadgeText, { color: '#fb923c' }]}>AUTO-REVEAL</Text>
                                </View>
                            ) : (
                                <View style={styles.heroBadge}>
                                    <Ionicons name="lock-closed" size={10} color="#fff" />
                                    <Text style={styles.heroBadgeText}>PRIVATE LOCATION</Text>
                                </View>
                            )}
                            <View style={[styles.heroBadge, { borderColor: 'rgba(34,197,94,0.3)' }]}>
                                <Ionicons name="checkmark-circle" size={10} color="#22c55e" />
                                <Text style={[styles.heroBadgeText, { color: '#22c55e' }]}>VERIFIED HOST</Text>
                            </View>
                        </View>
                    </View>

                    {/* CONTENT */}
                    <View style={styles.content}>
                        <Text style={styles.eventTitle}>{event?.title || ''}</Text>
                        
                        {/* EVENT TIMING INFO */}
                        <View style={styles.timingSection}>
                            {/* Event Date & Time */}
                            <View style={styles.timingCard}>
                                <View style={styles.timingIconWrapper}>
                                    <Ionicons name="calendar" size={18} color="#7c4dff" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.timingLabel}>Event Date</Text>
                                    <Text style={styles.timingValue}>
                                        {event?.date ? dayjs(event.date).format('MMM DD, YYYY') : 'TBD'}
                                    </Text>
                                </View>
                            </View>

                            {/* Start & End Time */}
                            <View style={styles.timingRow}>
                                <View style={[styles.timingCard, { flex: 1 }]}>
                                    <View style={styles.timingIconWrapper}>
                                        <Ionicons name="play-circle" size={18} color="#22c55e" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.timingLabel}>Starts</Text>
                                        <Text style={styles.timingValue}>
                                            {event?.startTime || '--:--'}
                                        </Text>
                                    </View>
                                </View>
                                
                                <View style={[styles.timingCard, { flex: 1 }]}>
                                    <View style={styles.timingIconWrapper}>
                                        <Ionicons name="stop-circle" size={18} color="#ef4444" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.timingLabel}>Ends</Text>
                                        <Text style={styles.timingValue}>
                                            {event?.endTime || '--:--'}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Ticket Live Status */}
                            {event?.bookingOpenDate && (
                                <View style={[styles.timingCard, { 
                                    backgroundColor: new Date() > new Date(event.bookingOpenDate) 
                                        ? 'rgba(34, 197, 94, 0.08)' 
                                        : 'rgba(251, 146, 60, 0.08)',
                                    borderColor: new Date() > new Date(event.bookingOpenDate)
                                        ? 'rgba(34, 197, 94, 0.2)'
                                        : 'rgba(251, 146, 60, 0.2)'
                                }]}>
                                    <View style={styles.timingIconWrapper}>
                                        <Ionicons 
                                            name="ticket" 
                                            size={18} 
                                            color={new Date() > new Date(event.bookingOpenDate) ? '#22c55e' : '#fb923c'} 
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.timingLabel}>
                                            {new Date() > new Date(event.bookingOpenDate) ? 'Tickets Live Since' : 'Tickets Go Live'}
                                        </Text>
                                        <Text style={styles.timingValue}>
                                            {dayjs(event.bookingOpenDate).format('MMM DD, hh:mm A')}
                                        </Text>
                                    </View>
                                    {new Date() > new Date(event.bookingOpenDate) && (
                                        <View style={styles.livePulse}>
                                            <View style={styles.liveDot} />
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>

                        <Text style={styles.description}>{event?.description || ''}</Text>

                        {/* BOOK NOW */}
                        <TouchableOpacity style={styles.bookBtn} activeOpacity={0.85} onPress={handleBookNow} disabled={bookingLoader}>
                            <LinearGradient colors={['#6d28d9', '#4f46e5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.bookBtnInner}>
                                {bookingLoader ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <ActivityIndicator size="small" color="#fff" />
                                        <Text style={styles.bookBtnText}>Processing...</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.bookBtnText}>{lowestPrice ? 'Book Now  ·  ₹' + lowestPrice : 'Book Now'}</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* HOST INFO */}
                        <TouchableOpacity 
                            style={styles.hostContainer} 
                            activeOpacity={0.8}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.push({
                                    pathname: '/(user)/host-media' as any,
                                    params: { hostId: event.hostId?._id || event.hostId || event.host?._id || event.host || '' }
                                });
                            }}
                        >
                            <Image
                                source={{ uri: avatar(event.hostId?.profileImage, event.hostId?.name) || '' }}
                                style={styles.hostAvatar}
                                cachePolicy="memory-disk"
                            />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.hostLabel}>HOSTED BY</Text>
                                <Text style={styles.hostName}>
                                    {event.hostId?.name || 
                                     event.host?.name || 
                                     event.hostId?.businessName || 
                                     event.host?.businessName || 
                                     event.venueName ||
                                     (event.hostId?.firstName ? `${event.hostId.firstName} ${event.hostId.lastName || ''}`.trim() : 'Host')}
                                </Text>
                            </View>
                            <View style={styles.hostStats}>
                                <Text style={styles.hostStatsTxt}>{event.attendeeCount || '100+'} ATTENDING</Text>
                                <Text style={styles.hostStatsSub}>{event.startTime || '10PM'} - {event.endTime || 'LATE'}</Text>
                            </View>
                        </TouchableOpacity>

                        {/* HOUSE RULES */}
                        <Text style={styles.sectionLabel}>HOUSE RULES</Text>
                        <View style={styles.rulesCard}>
                            {houseRules.map((rule: any, i: number) => {
                                const t = (rule?.title || '').toLowerCase();
                                let iconColor = COLORS.primary;
                                let bgColor = 'rgba(124, 77, 255, 0.1)';
                                
                                if (t.includes('dress') || t.includes('code')) {
                                    iconColor = '#eab308'; // Yellow
                                    bgColor = 'rgba(234, 179, 8, 0.15)';
                                } else if (t.includes('id ') || t.includes('age') || t.includes('21+')) {
                                    iconColor = '#22c55e'; // Green
                                    bgColor = 'rgba(34, 197, 94, 0.15)';
                                } else if (t.includes('photo') || t.includes('camera')) {
                                    iconColor = '#ef4444'; // Red
                                    bgColor = 'rgba(239, 68, 68, 0.15)';
                                }

                                return (
                                    <TouchableOpacity key={i} style={[styles.ruleRow, i < houseRules.length - 1 && styles.ruleRowBorder]}
                                        onPress={() => { Haptics.selectionAsync(); setExpandedRule(expandedRule === i ? null : i); }} activeOpacity={0.7}>
                                        <View style={styles.ruleLeft}>
                                            <View style={[styles.ruleIconBox, { backgroundColor: bgColor }]}><Ionicons name={rule?.icon || 'information-circle-outline'} size={16} color={iconColor} /></View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.ruleTitle}>{rule?.title || ''}</Text>
                                                {expandedRule === i && rule?.detail && <Text style={styles.ruleDetail}>{rule.detail}</Text>}
                                            </View>
                                        </View>
                                        <Ionicons name={expandedRule === i ? 'chevron-up' : 'chevron-down'} size={16} color="rgba(255,255,255,0.3)" />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* LOCATION MAP */}
                        <Text style={[styles.sectionLabel, { marginTop: 28 }]}>LOCATION</Text>
                        <View style={styles.mapCard}>
                            {isLocationMasked ? (
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
                                    <Image
                                        source={{ uri: staticMapUrl }}
                                        style={StyleSheet.absoluteFillObject}
                                        contentFit="cover"
                                    />
                                    <TouchableOpacity style={styles.mapOverlay} activeOpacity={0.8} onPress={openMaps} />
                                </View>
                            )}
                            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, gap: 12 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.mapVenueName}>{venueName}</Text>
                                    {venueAddress ? <Text style={[styles.mapAddress, (event.locationVisibility === 'hidden' && !event.isLocationRevealed) && { color: COLORS.primary }]} numberOfLines={1}>{venueAddress}</Text> : null}
                                </View>
                                <TouchableOpacity onPress={openMaps} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 }}>
                                    <Ionicons name="navigate-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
                                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Get Directions</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* COMPLIMENTARY REFRESHMENTS */}
                        {refreshments.length > 0 && (
                            <View style={{ marginTop: 12 }}>
                                <Text style={styles.sectionLabel}>COMPLIMENTARY REFRESHMENTS</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20 }}>
                                    {refreshments.map((item: any, idx: number) => (
                                        <View key={idx} style={styles.inclusionCard}>
                                            <LinearGradient colors={['rgba(124, 77, 255, 0.15)', 'rgba(79, 70, 229, 0.05)']} style={styles.inclusionInner}>
                                                <Ionicons name={(item?.icon || 'star') as any} size={20} color={COLORS.primary} />
                                                <View>
                                                    <Text style={styles.inclusionTitle}>{item?.title || ''}</Text>
                                                    {item?.description ? <Text style={styles.inclusionDesc} numberOfLines={1}>{item.description}</Text> : null}
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
                        {lowestPrice && <><Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600' }}>From</Text><Text style={{ color: '#fff', fontSize: 22, fontWeight: '900' }}>{'₹'}{lowestPrice}</Text></>}
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
    } catch (e: any) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
                <StatusBar barStyle="light-content" backgroundColor="#030303" />
                <Ionicons name="alert-circle-outline" size={48} color={COLORS.primary} style={{ marginBottom: 16 }} />
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Error loading screen</Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', marginBottom: 24 }}>Something went wrong while displaying this event.</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}>
                    <Text style={{ color: '#FFF', fontWeight: '700' }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }
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
    eventTitle: { color: '#fff', fontSize: 26, fontWeight: '900', marginBottom: 16, lineHeight: 32 },
    
    // Timing Section Styles
    timingSection: {
        marginBottom: 20,
        gap: 12,
    },
    timingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        padding: 14,
        gap: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    timingRow: {
        flexDirection: 'row',
        gap: 12,
    },
    timingIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    timingLabel: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    timingValue: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },
    livePulse: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#22c55e',
    },
    
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
    rulesCard: { backgroundColor: 'rgba(124, 77, 255, 0.03)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(124, 77, 255, 0.3)', overflow: 'hidden', marginBottom: 28 },
    ruleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 15 },
    ruleRowBorder: { borderBottomWidth: 1, borderColor: 'rgba(124, 77, 255, 0.15)' },
    ruleLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, marginRight: 8 },
    ruleIconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(124, 77, 255, 0.1)', alignItems: 'center', justifyContent: 'center' },
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