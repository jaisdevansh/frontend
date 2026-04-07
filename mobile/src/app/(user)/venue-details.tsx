import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image, TouchableOpacity, ActivityIndicator, Linking, Platform } from 'react-native';
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

export default function VenueDetails() {
    const router = useRouter();
    const navigation = useNavigation();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();

    useEffect(() => {
        log(`STEP 3: SCREEN OPEN (Venue Details)`);
        log(`STEP 4: PARAM venueId: ${params.id}`);
    }, [params.id]);

    const image = params.image && params.image !== 'undefined' ? String(params.image) : 'https://images.unsplash.com/photo-1514525253361-bee8a197c0c1?auto=format&fit=crop&q=80&w=800';
    const name = params.name && params.name !== 'undefined' ? String(params.name) : 'Exclusive Venue';
    const type = params.type && params.type !== 'undefined' ? String(params.type) : 'Nightclub';
    const venueId = params.id ? String(params.id) : null;

    const [events, setEvents] = useState<any[]>([]);
    const [venueData, setVenueData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

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
                const [vRes, eRes] = await Promise.all([
                    userService.getVenueById(venueId),
                    userService.getEvents()
                ]);
                
                if (vRes.success) {
                    log(`STEP 6: API SUCCESS (Venue) SIZE: ${JSON.stringify(vRes.data || {}).length}`);
                    setVenueData(vRes.data);
                }
                if (eRes.success) {
                    setEvents(eRes.data);
                }
            } catch (err: any) {
                log(`STEP 6: API ERROR (Venue): ${err.message || 'Unknown'}`);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [venueId]);

    const realLat = parseFloat(venueData?.coordinates?.lat || venueData?.location?.coordinates?.[1] || venueData?.venueProfile?.coordinates?.lat as any);
    const realLng = parseFloat(venueData?.coordinates?.long || venueData?.coordinates?.lng || venueData?.location?.coordinates?.[0] || venueData?.venueProfile?.coordinates?.lng as any);
    
    const safeLat = realLat || 28.6139;
    const safeLng = realLng || 77.2090;
    const coords = { lat: safeLat, lng: safeLng };
    const staticMapUrl = `https://maps.geoapify.com/v1/staticmap?style=dark-matter&width=600&height=320&center=lonlat:${coords.lng},${coords.lat}&zoom=15.5&marker=lonlat:${coords.lng},${coords.lat};color:%237c4dff;size:large&apiKey=${GEOAPIFY_KEY}`;

    const openMaps = () => {
        const addr = venueData?.address || venueData?.location?.address || venueData?.venueProfile?.address;
        const destination = (realLat && realLng) ? `${realLat},${realLng}` : encodeURIComponent(addr || '');
        if (!destination) return;

        const url = Platform.select({
            ios: `http://maps.apple.com/?daddr=${destination}&dirflg=d`,
            android: `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`,
            default: `https://www.google.com/maps/dir/?api=1&destination=${destination}`
        });

        if (url) Linking.openURL(url);
    };


    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.imageHeader}>
                    <Image
                        source={{ uri: image }}
                        style={styles.heroImage}
                    />
                    <TouchableOpacity
                        style={[styles.backButton, { top: 20 + insets.top }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    <View style={styles.titleSection}>
                        <Text style={styles.venueName}>{name}</Text>
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
                            <Text style={styles.infoValue}>{type}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>DRESS CODE</Text>
                            <Text style={styles.infoValue}>Smart Elegant</Text>
                        </View>
                    </View>

                    <Text style={styles.description}>
                        Experience the pinnacle of London's nightlife. Monochromatic luxury nightclub interior with architectural lighting and world-class acoustics.
                    </Text>

                    <TouchableOpacity 
                        style={styles.reviewPromptBtn}
                        activeOpacity={0.7}
                        onPress={() => router.push({
                            pathname: '/(user)/write-review' as any,
                            params: { id: venueId, name: name, image: image, type: type }
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
                            <TouchableOpacity style={styles.mapOverlay} activeOpacity={0.8} onPress={openMaps}>
                                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFillObject} />
                                <View style={{ position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 }}>
                                    <Ionicons name="navigate-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
                                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Get Directions</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                        <View style={{ padding: 16 }}>
                            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>{name}</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 }}>
                                {venueData?.address || venueData?.venueProfile?.address || 'Premium Lounge & Nightclub'}
                            </Text>
                        </View>
                    </View>




                    {/* GALLERY SECTION — Host uploaded media */}
                    {venueData?.media && venueData.media.length > 0 && (
                        <View style={{ marginBottom: 28 }}>
                            <Text style={styles.sectionTitle}>Gallery 📸</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={{ marginTop: 12 }}
                                contentContainerStyle={{ gap: 10 }}
                            >
                                {venueData.media.map((m: any, idx: number) => (
                                    <View
                                        key={m._id || idx}
                                        style={{
                                            width: 160,
                                            height: 110,
                                            borderRadius: 14,
                                            overflow: 'hidden',
                                            backgroundColor: 'rgba(255,255,255,0.05)',
                                        }}
                                    >
                                        <Image
                                            source={{ uri: m.url }}
                                            style={{ width: '100%', height: '100%' }}
                                            resizeMode="cover"
                                        />
                                        {m.type === 'video' && (
                                            <View style={{
                                                ...StyleSheet.absoluteFillObject,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: 'rgba(0,0,0,0.35)',
                                            }}>
                                                <Ionicons name="play-circle" size={32} color="#fff" />
                                            </View>
                                        )}
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    )}

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
                                                    image: event.coverImage || image
                                                }
                                            });
                                            console.log(`[PERF] VenueEvent Navigation took ${Date.now() - startTime}ms`);
                                            setTimeout(() => setLoading(false), 500);
                                        }, 10);
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
                        }, 10);
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
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    backButton: {
        position: 'absolute',
        top: 20,
        left: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
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
