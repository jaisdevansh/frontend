import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image, TouchableOpacity, ActivityIndicator, Linking, Platform, Dimensions } from 'react-native';
import { useRouter, useNavigation, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { Button } from '../../components/Button';
import { userService } from '../../services/userService';
import { log } from '../../utils/logger';

const GEOAPIFY_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_KEY || 'e6f13848c19246eab1bef2662e18ebd0';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function VenueDetails() {
    const router = useRouter();
    const navigation = useNavigation();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();

    useEffect(() => {
        log(`STEP 3: SCREEN OPEN (Venue Details)`);
        log(`STEP 4: PARAM venueId: ${params.id}`);
    }, [params.id]);

    const fallbackImage = params.image && params.image !== 'undefined' ? String(params.image) : 'https://images.unsplash.com/photo-1514525253361-bee8a197c0c1?auto=format&fit=crop&q=80&w=800';
    const fallbackName = params.name && params.name !== 'undefined' ? String(params.name) : 'Exclusive Venue';
    const fallbackType = params.type && params.type !== 'undefined' ? String(params.type) : 'Nightclub';
    const venueId = params.id ? String(params.id) : null;

    const [events, setEvents] = useState<any[]>([]);
    const [venueData, setVenueData] = useState<any>(null);
    const [venueMedia, setVenueMedia] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);

    if (!venueId) {
        log("ERROR: ID MISSING (Venue details)");
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#FFF' }}>Error: Venue ID Missing.</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
                    <Text style={{ color: COLORS.primary }}>Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    useEffect(() => {
        const fetchAll = async () => {
            log(`STEP 5: API CALL START (Venue): ${venueId}`);
            try {
                // Fetch venue by hostId (new endpoint)
                const vRes = await userService.getVenueByHostId(venueId);
                
                if (vRes.success && vRes.data) {
                    log(`STEP 6: API SUCCESS (Venue)`);
                    const venueInfo = vRes.data;
                    
                    // Log only keys, not full data (to avoid huge image data in logs)
                    console.log('[VENUE DEBUG] ✓ Venue data received');
                    console.log('[VENUE DEBUG] Venue name:', venueInfo.name);
                    console.log('[VENUE DEBUG] Venue type:', venueInfo.venueType);
                    console.log('[VENUE DEBUG] Description:', venueInfo.description?.substring(0, 50) + '...');
                    console.log('[VENUE DEBUG] Media count:', venueInfo.media?.length || 0);
                    
                    setVenueData(venueInfo);
                    if (Array.isArray(venueInfo.media) && venueInfo.media.length > 0) {
                        setVenueMedia(venueInfo.media);
                    }
                } else {
                    console.error('[VENUE DEBUG] ✗ API call failed or no data');
                }
                
                // Fetch events separately
                const eRes = await userService.getEvents();
                if (eRes.success) {
                    setEvents(eRes.data);
                }
            } catch (err: any) {
                log(`STEP 6: API ERROR (Venue): ${err.message || 'Unknown'}`);
                console.error('[VENUE DEBUG] Exception:', err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [venueId]);

    // Try multiple possible coordinate field structures
    const realLat = parseFloat(
        venueData?.coordinates?.lat || 
        venueData?.coordinates?.latitude ||
        venueData?.location?.coordinates?.lat ||
        venueData?.location?.coordinates?.latitude ||
        venueData?.location?.coordinates?.[1] ||
        venueData?.lat ||
        venueData?.latitude as any
    );
    const realLng = parseFloat(
        venueData?.coordinates?.lng || 
        venueData?.coordinates?.long ||
        venueData?.coordinates?.longitude ||
        venueData?.location?.coordinates?.lng ||
        venueData?.location?.coordinates?.long ||
        venueData?.location?.coordinates?.longitude ||
        venueData?.location?.coordinates?.[0] ||
        venueData?.lng ||
        venueData?.long ||
        venueData?.longitude as any
    );
    
    console.log('[VENUE COORDS] venueData.coordinates:', venueData?.coordinates);
    console.log('[VENUE COORDS] venueData.location:', venueData?.location);
    console.log('[VENUE COORDS] realLat:', realLat, 'realLng:', realLng);
    
    const safeLat = realLat || 28.6139;
    const safeLng = realLng || 77.2090;
    const coords = { lat: safeLat, lng: safeLng };
    const staticMapUrl = `https://maps.geoapify.com/v1/staticmap?style=osm-carto&width=600&height=320&center=lonlat:${coords.lng},${coords.lat}&zoom=15.5&marker=lonlat:${coords.lng},${coords.lat};color:%237c4dff;size:large&apiKey=${GEOAPIFY_KEY}`;

    const openMaps = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const addr = venueData?.address || venueData?.location?.address || venueData?.venueProfile?.address;

        let destination: string;
        if (realLat && realLng) {
            destination = `${realLat},${realLng}`;
        } else if (addr) {
            destination = encodeURIComponent(addr);
        } else if (displayName) {
            destination = encodeURIComponent(displayName);
        } else {
            return;
        }

        const url = Platform.select({
            ios: `http://maps.apple.com/?daddr=${destination}&dirflg=d`,
            android: `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`,
            default: `https://www.google.com/maps/dir/?api=1&destination=${destination}`
        })!;

        Linking.openURL(url).catch(() => {});
    };


    // Try multiple field names for each property
    const displayImage = venueData?.heroImage || venueData?.image || venueData?.coverImage || fallbackImage;
    const displayName = venueData?.name || venueData?.businessName || venueData?.venueName || fallbackName;
    const displayType = venueData?.venueType || venueData?.type || venueData?.category || fallbackType;
    const displayRules = venueData?.rules || venueData?.dressCode || 'Smart Elegant';
    const displayCapacity = venueData?.capacity || venueData?.maxCapacity;
    const displayDesc = venueData?.description || venueData?.about || venueData?.bio || "Experience the pinnacle of nightlife. Monochromatic luxury interior with architectural lighting and world-class acoustics.";
    const displayAddress = venueData?.address || venueData?.location?.address || venueData?.fullAddress || 'Premium Lounge & Nightclub';

    console.log('[VENUE DISPLAY] Name:', displayName, '| Type:', displayType);
    console.log('[VENUE DISPLAY] Description:', displayDesc?.substring(0, 60) + '...');
    console.log('[VENUE DISPLAY] Has custom image:', !!venueData?.heroImage);

    // Collect all images for carousel
    const allImages: string[] = [];
    
    // Add hero image first
    if (displayImage) {
        allImages.push(displayImage);
    }
    
    // Add media images from venueMedia state (interior category)
    if (venueMedia && venueMedia.length > 0) {
        const interiorImages = venueMedia
            .filter((m: any) => (m.category === 'interior' || !m.category) && m.type !== 'video')
            .map((m: any) => m.url);
        allImages.push(...interiorImages);
        console.log('[CAROUSEL] Total images:', allImages.length, '(hero + interior)');
    }
    
    // If no images at all, use fallback
    const carouselImages = allImages.length > 0 ? allImages : [fallbackImage];

    const handleScroll = (event: any) => {
        const scrollPosition = event.nativeEvent.contentOffset.x;
        const index = Math.round(scrollPosition / SCREEN_WIDTH);
        setCurrentImageIndex(index);
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Image Carousel Header */}
                <View style={styles.imageHeader}>
                    <ScrollView
                        ref={scrollViewRef}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                    >
                        {carouselImages.map((imageUrl, index) => (
                            <Image
                                key={index}
                                source={{ uri: imageUrl }}
                                style={styles.heroImage}
                            />
                        ))}
                    </ScrollView>
                    
                    {/* Image Counter Badge */}
                    {carouselImages.length > 1 && (
                        <View style={styles.imageCounter}>
                            <Ionicons name="images" size={14} color="white" />
                            <Text style={styles.imageCounterText}>
                                {currentImageIndex + 1}/{carouselImages.length}
                            </Text>
                        </View>
                    )}
                    
                    {/* Pagination Dots */}
                    {carouselImages.length > 1 && (
                        <View style={styles.paginationDots}>
                            {carouselImages.map((_, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.dot,
                                        index === currentImageIndex && styles.activeDot
                                    ]}
                                />
                            ))}
                        </View>
                    )}
                    
                    <TouchableOpacity
                        style={[styles.backButton, { top: 20 + insets.top }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    <View style={styles.titleSection}>
                        <Text style={styles.venueName}>{displayName}</Text>
                        <View style={styles.ratingRow}>
                            <View style={styles.stars}>
                                <Ionicons name="star" size={16} color={COLORS.gold} />
                                <Ionicons name="star" size={16} color={COLORS.gold} />
                                <Ionicons name="star" size={16} color={COLORS.gold} />
                                <Ionicons name="star" size={16} color={COLORS.gold} />
                                <Ionicons name="star" size={16} color={COLORS.gold} />
                            </View>
                            <Text style={styles.ratingText}>4.9 (124 reviews)</Text>
                        </View>
                    </View>

                    <View style={styles.infoGrid}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>TYPE</Text>
                            <Text style={styles.infoValue}>{displayType}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>DRESS CODE</Text>
                            <Text style={styles.infoValue}>{displayRules}</Text>
                        </View>
                        {displayCapacity ? (
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>CAPACITY</Text>
                                <Text style={styles.infoValue}>{displayCapacity} PAX</Text>
                            </View>
                        ) : null}
                    </View>

                    <Text style={styles.description}>
                        {displayDesc}
                    </Text>

                    <TouchableOpacity 
                        style={styles.reviewPromptBtn}
                        activeOpacity={0.7}
                        onPress={() => router.push({
                            pathname: '/(user)/write-review' as any,
                            params: { id: venueId, name: displayName, image: displayImage, type: displayType }
                        })}
                    >
                        <View style={styles.reviewPromptLeft}>
                            <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                            <Text style={styles.reviewPromptText}>Write a Review</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.3)" />
                    </TouchableOpacity>

                    {/* LOCATION SECTION */}
                    <Text style={styles.sectionTitle}>Location</Text>
                    <View style={styles.mapCard}>
                        <View style={{ height: 160, overflow: 'hidden' }}>
                            <Image
                                source={{ uri: staticMapUrl }}
                                style={StyleSheet.absoluteFillObject}
                                resizeMode="cover"
                            />
                            <TouchableOpacity style={styles.mapOverlay} activeOpacity={0.8} onPress={openMaps} />
                        </View>
                        <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>{displayName}</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 }}>
                                    {displayAddress}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={openMaps} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 }}>
                                <Ionicons name="navigate-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
                                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Get Directions</Text>
                            </TouchableOpacity>
                        </View>
                    </View>




                    {/* GALLERY SECTION — Host uploaded media, live instantly */}
                    {venueMedia && venueMedia.length > 0 && (() => {
                        const interior = venueMedia.filter((m: any) => m.category === 'interior' || !m.category);
                        const events   = venueMedia.filter((m: any) => m.category === 'events');
                        const totalMedia = interior.length + events.length;
                        
                        return (
                            <View style={{ marginBottom: 28 }}>
                                {/* Gallery Header with Count */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Ionicons name="images" size={20} color="#8B5CF6" />
                                        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Media Gallery</Text>
                                        <View style={{ backgroundColor: 'rgba(139,92,246,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                                            <Text style={{ color: '#8B5CF6', fontSize: 12, fontWeight: '800' }}>{totalMedia}</Text>
                                        </View>
                                    </View>
                                </View>
                                
                                {/* Club Interior */}
                                {interior.length > 0 && (
                                    <View style={{ marginBottom: 24 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                            <Ionicons name="business-outline" size={16} color="#6C63FF" />
                                            <Text style={styles.sectionTitle}>Club Interior</Text>
                                            <View style={{ backgroundColor: 'rgba(108,99,255,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                                                <Text style={{ color: '#6C63FF', fontSize: 11, fontWeight: '700' }}>{interior.length}</Text>
                                            </View>
                                        </View>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                                            {interior.map((m: any, idx: number) => (
                                                <View key={m._id || idx} style={{ width: 160, height: 110, borderRadius: 14, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(108,99,255,0.2)' }}>
                                                    <Image source={{ uri: m.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                                </View>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}

                                {/* Past Events */}
                                {events.length > 0 && (
                                    <View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                            <Ionicons name="images-outline" size={16} color="#F59E0B" />
                                            <Text style={styles.sectionTitle}>Past Events</Text>
                                            <View style={{ backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                                                <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '700' }}>{events.length}</Text>
                                            </View>
                                        </View>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                                            {events.map((m: any, idx: number) => (
                                                <View key={m._id || idx} style={{ width: 160, height: 110, borderRadius: 14, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)' }}>
                                                    <Image source={{ uri: m.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                                    {m.type === 'video' && (
                                                        <View style={{ ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' }}>
                                                            <Ionicons name="play-circle" size={32} color="#fff" />
                                                        </View>
                                                    )}
                                                </View>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>
                        );
                    })()}


                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Exclusive Events</Text>
                    </View>

                    {loading ? (
                        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
                    ) : events.length > 0 ? (
                        events.map((event, index) => {
                            const dateObj = new Date(event.date);
                            const day = dateObj.getDate();
                            const month = dateObj.toLocaleString('default', { month: 'short' }).toUpperCase();
                            const price = event.tickets && event.tickets.length > 0 ? event.tickets[0].price : 2000;
                            return (
                                <TouchableOpacity
                                    key={event._id || index}
                                    style={[styles.eventCard, loading && { opacity: 0.8 }]}
                                    onPress={() => {
                                        setLoading(true);
                                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                        const startTime = Date.now();
                                        setTimeout(() => {
                                            router.push({
                                                pathname: '/(user)/event-details',
                                                params: {
                                                    eventId: event._id,
                                                    title: event.title,
                                                    image: event.coverImage || displayImage
                                                }
                                            });
                                            console.log(`[PERF] VenueEvent Navigation took ${Date.now() - startTime}ms`);
                                            setTimeout(() => setLoading(false), 500);
                                        }, 150);
                                    }}
                                    disabled={loading}
                                >
                                    <View style={styles.eventDate}>
                                        <Text style={styles.dateDay}>{day}</Text>
                                        <Text style={styles.dateMonth}>{month}</Text>
                                    </View>
                                    <View style={styles.eventInfo}>
                                        <Text style={styles.eventTitle}>{event.title}</Text>
                                        <Text style={styles.eventTime}>
                                            {loading ? <ActivityIndicator size="small" color={COLORS.primary} /> : `${event.time || '10:00 PM'} • ₹${price} onwards`}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    ) : (
                        <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 10 }}>No events available for this venue right now.</Text>
                    )}
                </View>
            </ScrollView>

            <View style={styles.stickyFooter}>
                <TouchableOpacity 
                    style={[styles.footerBtn, loading && { opacity: 0.7 }]} 
                    onPress={() => {
                        setLoading(true);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        const footStartTime = Date.now();
                        setTimeout(() => {
                            router.push('/(user)/event-details');
                            console.log(`[PERF] VenueFooter Navigation took ${Date.now() - footStartTime}ms`);
                            setTimeout(() => setLoading(false), 500);
                        }, 150);
                    }}
                    disabled={loading}
                >
                    <LinearGradient colors={['#6d28d9', '#4f46e5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.footerBtnInner}>
                        {loading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.footerBtnText}>Book Private Table</Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background.dark,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    imageHeader: {
        width: '100%',
        height: 300,
        position: 'relative',
    },
    heroImage: {
        width: SCREEN_WIDTH,
        height: 300,
    },
    imageCounter: {
        position: 'absolute',
        top: 20,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    imageCounterText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '700',
    },
    paginationDots: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.4)',
    },
    activeDot: {
        width: 20,
        backgroundColor: 'white',
    },
    backButton: {
        position: 'absolute',
        top: 20,
        left: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: SPACING.lg,
    },
    titleSection: {
        marginBottom: SPACING.lg,
    },
    venueName: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: '800',
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    stars: {
        flexDirection: 'row',
        marginRight: 8,
    },
    ratingText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 14,
    },
    infoGrid: {
        flexDirection: 'row',
        gap: 40,
        marginBottom: SPACING.xl,
        paddingVertical: SPACING.md,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    infoItem: {},
    infoLabel: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    infoValue: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 2,
    },
    description: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 15,
        lineHeight: 22,
        marginBottom: SPACING.lg,
    },
    reviewPromptBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: 16,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        marginBottom: SPACING.xxl,
    },
    reviewPromptLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    reviewPromptText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    sectionHeader: {
        marginBottom: SPACING.md,
    },
    sectionTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
    },
    eventCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 16,
        gap: 16,
    },
    eventDate: {
        alignItems: 'center',
        gap: 2,
        paddingRight: 16,
        borderRightWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    dateDay: {
        color: COLORS.primary,
        fontSize: 20,
        fontWeight: '800',
    },
    dateMonth: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 10,
        fontWeight: '700',
    },
    eventInfo: {
        flex: 1,
    },
    eventTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    eventTime: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 13,
        marginTop: 2,
    },
    stickyFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: SPACING.lg,
        backgroundColor: 'rgba(11, 15, 26, 0.8)',
    },
    footerBtn: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    footerBtnInner: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
    },
    mapCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.07)',
        overflow: 'hidden',
        marginTop: 12,
        marginBottom: 32,
    },
    markerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
    },
    markerCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    mapOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
});
