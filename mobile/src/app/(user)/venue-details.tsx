import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { useRouter, useNavigation, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { Button } from '../../components/Button';
import { userService } from '../../services/userService';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

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

export default function VenueDetails() {
    const router = useRouter();
    const navigation = useNavigation();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();

    const image = params.image && params.image !== 'undefined' ? String(params.image) : 'https://images.unsplash.com/photo-1514525253361-bee8a197c0c1?auto=format&fit=crop&q=80&w=800';
    const name = params.name && params.name !== 'undefined' ? String(params.name) : 'Exclusive Venue';
    const type = params.type && params.type !== 'undefined' ? String(params.type) : 'Nightclub';
    const venueId = params.id ? String(params.id) : null;

    const [events, setEvents] = useState<any[]>([]);
    const [venueData, setVenueData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            if (!venueId) {
                setLoading(false);
                return;
            }
            try {
                const [vRes, eRes] = await Promise.all([
                    userService.getVenueById(venueId),
                    userService.getEvents()
                ]);
                
                if (vRes.success) setVenueData(vRes.data);
                if (eRes.success) {
                    // In a real scenario, we'd filter events by hostId or venueId
                    setEvents(eRes.data);
                }
            } catch (err) {
                console.log('Error fetching venue details', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [venueId]);

    const openMaps = () => {
        const addr = venueData?.address || venueData?.venueProfile?.address;
        if (addr) Linking.openURL('https://maps.google.com/?q=' + encodeURIComponent(addr));
    };

    const coords = venueData?.coordinates || venueData?.venueProfile?.coordinates || { lat: 28.6139, lng: 77.2090 };


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
