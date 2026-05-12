import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, Dimensions, TextInput, Modal,
    Animated, ActivityIndicator,
    Platform, FlatList, ScrollView, RefreshControl,
    TouchableWithoutFeedback, Keyboard
} from 'react-native';

import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, ImageBackground as ExpoImageBackground } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import SafeFlashList from '../../components/SafeFlashList';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import { COLORS } from '../../constants/design-system';
import { userService } from '../../services/userService';
import { useQuery } from '@tanstack/react-query';
import { usePrefetchEvent } from '../../hooks/useEventQuery';
import { hero, avatar } from '../../services/cloudinaryService';
import { useAuth } from '../../context/AuthContext';
import { log } from '../../utils/logger';
import { EventCardSkeleton } from '../../components/Skeletons/EventCardSkeleton';
import { useNotification } from '../../context/NotificationContext';

import { InteractionManager } from 'react-native';
const FlashList = SafeFlashList;

const { width } = Dimensions.get('window');
const DATE_OPTIONS = ['Today', 'Tomorrow', 'This Weekend', 'Next Week'];
const TOP_CITIES = ['All', 'Delhi', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Chennai', 'Goa', 'Pune'];

// 🚀 HIGH PERFORMANCE MEMOIZED EVENT CARD 🚀
const EventCardItem = React.memo(({ item, isLoading, onBodyPress, onDetailsPress, coverImageProps }: any) => {
    const dateStr = useMemo(() => {
        const base = item.date
            ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
            : 'TBA';
        if (!item.endDate) return base;
        const endStr = new Date(item.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
        return base !== endStr ? `${base} - ${endStr}` : base;
    }, [item.date, item.endDate]);
    
    // Check if tickets are live
    const isTicketLive = item.bookingOpenDate ? new Date() > new Date(item.bookingOpenDate) : true;
    
    // Get host name
    const getHostName = () => {
        // Try all possible fields
        const possibleNames = [
            item.hostId?.name,
            item.host?.name,
            item.createdBy?.name,
            item.hostId?.businessName,
            item.host?.businessName,
            item.venueName
        ];
        
        const foundName = possibleNames.find(name => name && name !== '');
        return foundName || 'Host';
    };
    
    const hostName = getHostName();
    
    // Location display logic — respects isLocationRevealed for delayed/hidden events
    const getLocationDisplay = () => {
        const isRevealed = item.isLocationRevealed === true;
        const hasAddress = !!item.locationData?.address;

        // If location has been revealed by host (regardless of original setting) → show address
        if (isRevealed && hasAddress) {
            const addressParts = item.locationData.address.split(',');
            const displayAddress = addressParts.length > 2 
                ? `${addressParts[0]}, ${addressParts[1]}`.trim()
                : item.locationData.address;
            return {
                text: displayAddress,
                icon: 'location-sharp' as const,
                color: '#22c55e'   // Green = revealed live
            };
        }

        if (item.locationVisibility === 'public' && hasAddress) {
            // Always-visible public address
            const addressParts = item.locationData.address.split(',');
            const displayAddress = addressParts.length > 2 
                ? `${addressParts[0]}, ${addressParts[1]}`.trim()
                : item.locationData.address;
            return {
                text: displayAddress,
                icon: 'location-sharp' as const,
                color: '#2563EB'
            };
        }

        if (item.locationVisibility === 'delayed') {
            return {
                text: 'Reveals at Event Time ⏳',
                icon: 'time-outline' as const,
                color: '#fb923c'
            };
        }

        // hidden / private / public with no address
        return {
            text: 'Location Revealed Post-Booking 🔒',
            icon: 'lock-closed' as const,
            color: '#ef4444'
        };
    };
    
    const locationInfo = getLocationDisplay();
    
    return (
        <TouchableOpacity 
            style={[styles.eventCard, isLoading && { opacity: 0.8 }]}
            activeOpacity={0.9}
            onPress={onBodyPress}
        >
            <ExpoImageBackground source={hero(item.coverImage) || 'https://images.unsplash.com/photo-1545128485-c400e7702796?q=80&w=800'} style={styles.cardImageBg} imageStyle={{ borderRadius: 28 }} {...coverImageProps}>
                {isLoading && (
                    <View style={styles.cardLoaderOverlay}>
                        <ActivityIndicator size="large" color="#fff" />
                    </View>
                )}
                <View style={styles.cardTopRow}>
                    <View style={styles.dateBadge}><Ionicons name="calendar-outline" size={12} color="#fff" /><Text style={styles.dateBadgeTxt}>{dateStr}</Text></View>
                    <View style={styles.verifiedBadge}><Ionicons name="checkmark-circle" size={12} color="#fff" /><Text style={styles.verifiedBadgeTxt}>VERIFIED</Text></View>
                </View>
                <LinearGradient colors={['transparent', 'rgba(10,10,10,0.85)', '#0a0a0a']} style={styles.cardContentBottom}>
                    <Text style={styles.cardEventTitle}>{item.title}</Text>
                    
                    {/* Location Info */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Ionicons name={locationInfo.icon as any} size={12} color={locationInfo.color} />
                        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '500' }}>
                            {locationInfo.text}
                        </Text>
                    </View>

                    {/* Ticket Live Status */}
                    {item.bookingOpenDate && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <View style={[styles.ticketStatusDot, { backgroundColor: isTicketLive ? '#22c55e' : '#fb923c' }]} />
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '500', fontStyle: 'italic' }}>
                                {isTicketLive 
                                    ? `Tickets live since ${new Date(item.bookingOpenDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
                                    : `Tickets go live: ${new Date(item.bookingOpenDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
                                }
                            </Text>
                        </View>
                    )}

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 18, backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start' }}>
                        <Image 
                            source={{ uri: avatar(
                                item.hostId?.profileImage || item.host?.profileImage || item.hostId?.logo || item.host?.logo, 
                                hostName
                            ) }} 
                            style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: '#2563EB' }} 
                            cachePolicy="memory-disk"
                            contentFit="cover"
                        />
                        <Text style={styles.cardEventHost}>
                            {hostName}
                        </Text>
                    </View>

                        <View style={styles.cardFooterStats}>
                            <View style={styles.statsRowLeft}>
                                <View style={styles.statChip}>
                                    <Text style={styles.statChipTxt}>
                                        {item.displayPrice ? `₹${item.displayPrice.toLocaleString()}` : 'Free'}
                                    </Text>
                                </View>
                                <View style={styles.statChip}><MaterialCommunityIcons name="account-group" size={14} color="#22c55e" /><Text style={styles.statChipTxt}>{item.occupancy || '0%'}</Text></View>
                            </View>
                        <TouchableOpacity 
                            style={styles.requestBtn} 
                            disabled={isLoading}
                            onPress={onDetailsPress}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#fff" style={{ width: 40 }} />
                            ) : (
                                <Text style={styles.requestBtnTxt}>Details</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </LinearGradient>
            </ExpoImageBackground>
        </TouchableOpacity>
    );
}, (prevProps, nextProps) => {
    return prevProps.isLoading === nextProps.isLoading && prevProps.item._id === nextProps.item._id;
});


export default function HomeScreen() {
    const router = useRouter();
    const { user: authUser } = useAuth();
    const insets = useSafeAreaInsets();
    const prefetchEvent = usePrefetchEvent();
    const { unreadCount } = useNotification();
    
    // ── SUPER-FAST PARALLEL DATA FETCHING ──
    const eventsQuery = useQuery({
        queryKey: ['home_events'],
        queryFn: async () => {
            console.log('🚀 [Home] Fetching events from API...');
            const res = await userService.getEvents();
            console.log('📦 [Home] API Response:', {
                success: res.success,
                dataLength: res.data?.length || 0,
                data: res.data
            });
            return res.data || [];
        },
        staleTime: 600000, // 10 min
    });

    const profileQuery = useQuery({
        queryKey: ['user_profile'],
        queryFn: () => userService.getProfile().then(res => res.data),
        staleTime: 1800000, // 30 min
    });

    const venuesQuery = useQuery({
        queryKey: ['home_venues'],
        queryFn: () => userService.getVenues().then(res => res.data || []),
        staleTime: 600000,
    });

    const isEventsLoading = eventsQuery.isLoading;
    const refetchEvents = eventsQuery.refetch;
    const profileData = profileQuery.data;
    const venuesData = venuesQuery.data;
    const eventsData = eventsQuery.data;

    // Extract UI data
    const profileImage = authUser?.profileImage || profileData?.profileImage || null;
    const rawName = authUser?.name || profileData?.name || '';
    const profileName = rawName.trim() || 'Hey there 👋';
    const events = eventsData || [];
    const venues = venuesData || [];
    const loading = isEventsLoading;

    // ── DEBUG LOGGING ──
    useEffect(() => {
        if (eventsData) {
            console.log('✅ [HomeScreen] Events loaded:', {
                count: eventsData.length,
                firstEvent: eventsData[0]?.title,
                timestamp: new Date().toLocaleTimeString()
            });
        }
        if (profileData) {
            console.log('👤 [HomeScreen] Profile loaded:', profileData.name);
        }
    }, [eventsData, profileData]);

    // UI & Filter State
    const [cityName, setCityName] = useState('Fetching location...');
    const [filterVisible, setFilterVisible] = useState(false);
    const [searchVisible, setSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingEventId, setLoadingEventId] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>('Any');
    const [maxDistance, setMaxDistance] = useState<number>(50); // 50 represents 'Any'
    const [sliderTempDist, setSliderTempDist] = useState<number>(50);
    const [priceRange, setPriceRange] = useState([0, 10000]);
    const [sliderTempPrice, setSliderTempPrice] = useState(10000);
    const [userLoc, setUserLoc] = useState<{lat: number, lng: number} | null>(null);
    const [selectedCity, setSelectedCity] = useState<string>('All');

    // ⚡ SIMPLE REFRESH: Regular pull-to-refresh
    const [refreshing, setRefreshing] = useState(false);
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await refetchEvents();
        } catch (error) {
            console.error('[Refresh] Error:', error);
        } finally {
            setRefreshing(false);
        }
    }, [refetchEvents]);

    useEffect(() => {
        const loadLocation = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    // Try to get cached location FIRST for instant load (0ms delay typically)
                    let loc = await Location.getLastKnownPositionAsync();
                    
                    if (!loc) {
                        // Fallback to Lowest accuracy for fast fetch since we just need the city
                        loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
                    }

                    if (loc) {
                        setUserLoc({ lat: loc.coords.latitude, lng: loc.coords.longitude });
                        const reverse = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
                        if (reverse && reverse.length > 0) {
                            const city = reverse[0].city || reverse[0].district || reverse[0].subregion || 'Your City';
                            const country = reverse[0].isoCountryCode || 'IN';
                            setCityName(`${city}, ${country}`);
                        } else {
                            setCityName('Your Location');
                        }
                    }
                } else {
                    // Permission denied
                    setCityName('Location Access Needed');
                }
            } catch (error: any) {
                setCityName('Location Unavailable');
            }
        };
        loadLocation();
    }, []);

    const searchResults = useMemo(() => {
        const safeEvents = Array.isArray(events) ? events : [];
        const safeVenues = Array.isArray(venues) ? venues : [];

        // Helper: deduplicate by _id
        const dedup = (arr: any[]) => {
            const seen = new Set<string>();
            return arr.filter(item => {
                const id = item._id || item.id;
                if (!id || seen.has(id)) return false;
                seen.add(id);
                return true;
            });
        };

        if (!searchQuery.trim()) {
            // Default: show only events (no venues) to avoid duplicates
            return dedup(safeEvents).map(item => ({ ...item, isCity: false }));
        }

        const query = searchQuery.toLowerCase().trim();
        
        const allCities = new Set<string>();
        [...safeEvents, ...safeVenues].forEach(item => {
            const city = item.locationData?.city || item.location?.city;
            if (city) allCities.add(city);
        });
        TOP_CITIES.forEach(c => { if (c !== 'All') allCities.add(c); });
        
        const matchedCities = Array.from(allCities)
            .filter(c => c.toLowerCase().includes(query))
            .map(c => ({ _id: `city_${c}`, isCity: true, name: c }));

        const combined = dedup([...safeEvents, ...safeVenues]);
        const matchedItems = combined.filter((item: any) => {
            const titleMatch = (item.name || item.title || '').toLowerCase().includes(query);
            const cityMatch = (item.locationData?.city || item.location?.city || '').toLowerCase().includes(query);
            const stateMatch = (item.locationData?.state || item.location?.state || '').toLowerCase().includes(query);
            const addressMatch = (item.locationData?.address || item.location?.address || '').toLowerCase().includes(query);
            return titleMatch || cityMatch || stateMatch || addressMatch;
        }).slice(0, 15).map((item: any) => ({ ...item, isCity: false }));

        return [...matchedCities, ...matchedItems];
    }, [searchQuery, events, venues]);

    // Calculate Distance (Haversine formula approximation)
    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    };

    const isTomorrow = (date: Date) => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return date.getDate() === tomorrow.getDate() && date.getMonth() === tomorrow.getMonth() && date.getFullYear() === tomorrow.getFullYear();
    };

    const isThisWeekend = (date: Date) => {
        const day = date.getDay();
        return day === 5 || day === 6 || day === 0; // Friday, Saturday, Sunday
    };

    // Derived Filtered Events
    const filteredEvents = useMemo(() => {
        const safeEvents = Array.isArray(events) ? events : [];
        return safeEvents.filter(ev => {
            // Price Filter
            const minPrice = ev.tickets?.[0]?.price || 0;
            if (minPrice > priceRange[1]) return false;

            // Date Filter
            if (selectedDate !== 'Any' && ev.date) {
                const evDate = new Date(ev.date);
                if (selectedDate === 'Today' && !isToday(evDate)) return false;
                if (selectedDate === 'Tomorrow' && !isTomorrow(evDate)) return false;
                if (selectedDate === 'This Weekend' && !isThisWeekend(evDate)) return false;
            }

            // Distance Filter
            if (userLoc && maxDistance < 50 && ev.location?.coordinates) {
                const dist = getDistance(userLoc.lat, userLoc.lng, ev.location.coordinates[1], ev.location.coordinates[0]);
                if (dist > maxDistance) return false;
            }

            // City Filter
            if (selectedCity !== 'All') {
                const evCity = (ev.locationData?.city || ev.location?.city || '').toLowerCase();
                const evAddress = (ev.locationData?.address || ev.location?.address || '').toLowerCase();
                if (!evCity.includes(selectedCity.toLowerCase()) && !evAddress.includes(selectedCity.toLowerCase())) {
                    return false;
                }
            }

            return true;
        });
    }, [events, selectedDate, priceRange, maxDistance, userLoc, selectedCity]);

    // Fast image rendering cache optimization
    const coverImageProps = useMemo(() => ({
        cachePolicy: 'memory-disk' as const,
        contentFit: 'cover' as const,
        transition: 200
    }), []);

    const handleEventPress = useCallback((id: string, cover: string) => {
        setLoadingEventId(id);
        Haptics.selectionAsync();
        
        // Priority 1: Navigation
        router.push({ pathname: '/(user)/event-details', params: { eventId: id } });

        // Priority 2: Background prefetch (after nav starts)
        InteractionManager.runAfterInteractions(() => {
            prefetchEvent(id, cover);
            setLoadingEventId(null);
        });
    }, [router, prefetchEvent]);

    const renderEvent = useCallback(({ item }: { item: any }) => {
        return (
            <EventCardItem 
                item={item} 
                isLoading={loadingEventId === item._id} 
                coverImageProps={coverImageProps}
                onBodyPress={() => handleEventPress(item._id, item.coverImage)}
                onDetailsPress={() => handleEventPress(item._id, item.coverImage)}
            />
        );
    }, [loadingEventId, handleEventPress, coverImageProps]);

    const ListHeader = useCallback(() => (
        <View>
            <View style={[styles.header, { paddingTop: 10 }]}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity style={styles.locationSelector}>
                        <Text style={styles.locLabel}>LOCATION <Ionicons name="chevron-down" size={10} color="#3b82f6" /></Text>
                        <Text style={styles.locValue}>{cityName}</Text>
                    </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity onPress={() => router.push('/(settings)/notifications' as any)} style={styles.bellBtn}>
                        <Ionicons name="notifications-outline" size={24} color="#FFF" />
                        {unreadCount > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push('/(user)/profile')} style={styles.profileWrapper}>
                        <Image source={{ uri: avatar(profileImage, profileName) || 'https://via.placeholder.com/100' }} cachePolicy="memory-disk" contentFit="cover" style={styles.profilePic} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.searchContainer}>
                <TouchableOpacity style={styles.searchBar} activeOpacity={0.9} onPress={() => setSearchVisible(true)}>
                    <Ionicons name="search" size={18} color="rgba(255,255,255,0.4)" />
                    <Text style={styles.searchPlaceholder}>Search by city, state or event...</Text>
                    <TouchableOpacity style={styles.filterInlineBtn} onPress={() => setFilterVisible(true)}>
                        <Ionicons name="options-outline" size={20} color="rgba(255,255,255,0.6)" />
                    </TouchableOpacity>
                </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 16 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
                    {TOP_CITIES.map(city => {
                        const isActive = selectedCity === city;
                        return (
                            <TouchableOpacity 
                                key={city} 
                                style={[styles.cityChip, isActive && styles.cityChipActive]} 
                                onPress={() => setSelectedCity(city)}
                            >
                                <Text style={[styles.cityChipText, isActive && styles.cityChipTextActive]}>{city}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
            
            <TouchableOpacity 
                activeOpacity={1} 
                style={{ paddingHorizontal: 20, marginBottom: 10 }}
            >
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>Explore Events</Text>
            </TouchableOpacity>
        </View>
    ), [cityName, profileImage, profileName, router, unreadCount, selectedCity]);

    const listEmptyComponent = useCallback(() => loading ? (
        <View style={{ paddingHorizontal: 20 }}>
            {[1, 2, 3].map((i) => <EventCardSkeleton key={i} />)}
        </View>
    ) : null, [loading]);
    const keyExtractor = useCallback((item: any) => item._id || item.id, []);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* 🌌 Premium Ambient Glow Background */}
            <LinearGradient 
                colors={['#0B1629', '#03080F', '#000000']} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 1 }} 
                style={StyleSheet.absoluteFillObject} 
            />
            
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            
            <FlashList
                data={filteredEvents}
                renderItem={renderEvent}
                keyExtractor={keyExtractor}
                estimatedItemSize={400}
                contentContainerStyle={{ paddingBottom: 100 }}
                ListHeaderComponent={ListHeader}
                ListEmptyComponent={listEmptyComponent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
            />

            {/* Premium Filter Modal */}
            <Modal visible={filterVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setFilterVisible(false)}><Ionicons name="close" size={24} color="#FFF" /></TouchableOpacity>
                            <Text style={styles.modalTitle}>Refined Filters</Text>
                            <TouchableOpacity onPress={() => { setSelectedDate('Any'); setPriceRange([0, 10000]); setSliderTempPrice(10000); setMaxDistance(50); setSliderTempDist(50); }}><Text style={styles.resetBtnText}>Reset</Text></TouchableOpacity>
                        </View>
                        
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                            <Text style={styles.filterSectionLabel}>DATE</Text>
                        <FlatList 
                            horizontal 
                            showsHorizontalScrollIndicator={false} 
                            contentContainerStyle={{ gap: 10, paddingRight: 20 }}
                            data={DATE_OPTIONS}
                            keyExtractor={(item) => item}
                            scrollEnabled={false}
                            renderItem={({ item: d }) => (
                                <TouchableOpacity style={[styles.dateChip, selectedDate === d && styles.dateChipActive]} onPress={() => setSelectedDate(d)}>
                                    <Text style={[styles.dateChipText, selectedDate === d && styles.dateChipTextActive]}>{d}</Text>
                                </TouchableOpacity>
                            )}
                        />

                            <Text style={[styles.filterSectionLabel, { marginTop: 24 }]}>DISTANCE</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 20 }}>
                                {['Any', '< 10km', '< 20km', '< 30km', '< 40km', '< 50km'].map(d => {
                                    let val = 50;
                                    if (d === '< 10km') val = 10;
                                    if (d === '< 20km') val = 20;
                                    if (d === '< 30km') val = 30;
                                    if (d === '< 40km') val = 40;
                                    if (d === '< 50km') val = 50;

                                    const isActive = (d === 'Any' && maxDistance === 50) || (d !== 'Any' && maxDistance === val);
                                    
                                    return (
                                        <TouchableOpacity key={d} style={[styles.dateChip, isActive && styles.dateChipActive]} onPress={() => { setMaxDistance(val); setSliderTempDist(val); }}>
                                            <Text style={[styles.dateChipText, isActive && styles.dateChipTextActive]}>{d}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            <View style={{ marginTop: 28, paddingHorizontal: 10 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                                    <Text style={[styles.filterSectionLabel, { marginBottom: 0 }]}>MAX DISTANCE</Text>
                                    <Text style={{ color: '#2563EB', fontWeight: '800', fontSize: 16 }}>{sliderTempDist === 50 ? 'Any' : `${sliderTempDist}km`}</Text>
                                </View>
                                <MultiSlider 
                                    values={[sliderTempDist]} 
                                    onValuesChange={(v) => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setSliderTempDist(v[0]);
                                    }} 
                                    onValuesChangeFinish={(v) => { 
                                        setSliderTempDist(v[0]); 
                                        setMaxDistance(v[0]); 
                                    }}
                                    min={1} max={50} step={1} 
                                    sliderLength={width - 68} 
                                    selectedStyle={{ backgroundColor: '#2563EB' }}
                                    markerStyle={{ backgroundColor: '#2563EB', width: 20, height: 20, marginTop: 4 }}
                                    trackStyle={{ height: 4, backgroundColor: 'rgba(255,255,255,0.1)' }}
                                />
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', opacity: 0.5, marginTop: -10 }}>
                                    <Text style={{ color: '#FFF', fontSize: 10 }}>1km</Text>
                                    <Text style={{ color: '#FFF', fontSize: 10 }}>50km+</Text>
                                </View>
                            </View>

                            <View style={{ marginTop: 28, marginBottom: 10, paddingHorizontal: 10 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                                    <Text style={[styles.filterSectionLabel, { marginBottom: 0 }]}>MAX ENTRY PRICE</Text>
                                    <Text style={{ color: '#2563EB', fontWeight: '800', fontSize: 16 }}>₹{sliderTempPrice.toLocaleString()}</Text>
                                </View>
                                <MultiSlider 
                                    values={[priceRange[1]]} 
                                    onValuesChange={(v) => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setSliderTempPrice(v[0]);
                                    }} 
                                    onValuesChangeFinish={(v) => { 
                                        setSliderTempPrice(v[0]); 
                                        setPriceRange([0, v[0]]); 
                                    }}
                                    min={0} max={10000} step={500} 
                                    sliderLength={width - 68} 
                                    selectedStyle={{ backgroundColor: '#2563EB' }}
                                    markerStyle={{ backgroundColor: '#2563EB', width: 20, height: 20, marginTop: 4 }}
                                    trackStyle={{ height: 4, backgroundColor: 'rgba(255,255,255,0.1)' }}
                                />
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', opacity: 0.5, marginTop: -10 }}>
                                    <Text style={{ color: '#FFF', fontSize: 10 }}>Free</Text>
                                    <Text style={{ color: '#FFF', fontSize: 10 }}>₹10,000+</Text>
                                </View>
                            </View>
                        </ScrollView>

                        <View style={{ position: 'absolute', bottom: insets.bottom + 20, left: 24, right: 24 }}>
                            <TouchableOpacity style={styles.applyBtn} onPress={() => setFilterVisible(false)}>
                                <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.applyBtnGrad}>
                                    <Text style={styles.applyBtnTxt}>Show {filteredEvents.length} Events</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ─── Production Search Modal ─── */}
            <Modal
                visible={searchVisible}
                animationType="fade"
                transparent
                onRequestClose={() => { setSearchVisible(false); setSearchQuery(''); }}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={[styles.searchOverlay, { paddingTop: insets.top }]}>
                        <LinearGradient
                            colors={['#0D0923', '#05020A', '#000000']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFillObject}
                        />

                        {/* ── Search Bar ── */}
                        <View style={styles.stickySearch}>
                            <TouchableOpacity
                                onPress={() => { setSearchVisible(false); setSearchQuery(''); }}
                                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            >
                                <Ionicons name="arrow-back" size={24} color="#fff" />
                            </TouchableOpacity>
                            <View style={styles.searchInputWrapper}>
                                <Ionicons name="search" size={16} color="rgba(255,255,255,0.3)" style={{ marginLeft: 12 }} />
                                <TextInput
                                    autoFocus
                                    placeholder="Search events, cities..."
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                    style={styles.sInput}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    returnKeyType="search"
                                    autoCorrect={false}
                                    autoCapitalize="none"
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity
                                        onPress={() => setSearchQuery('')}
                                        style={{ paddingHorizontal: 12 }}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.4)" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {/* ── Results ── */}
                        <FlatList
                            data={searchResults}
                            keyExtractor={(item: any) => String(item._id || item.id)}
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40, paddingTop: 8 }}
                            ListHeaderComponent={
                                !searchQuery.trim() ? (
                                    <Text style={styles.srSectionLabel}>ALL EVENTS</Text>
                                ) : searchResults.length > 0 ? (
                                    <Text style={styles.srSectionLabel}>RESULTS</Text>
                                ) : null
                            }
                            ListEmptyComponent={
                                <View style={styles.srEmpty}>
                                    <Ionicons name="search" size={40} color="rgba(255,255,255,0.12)" />
                                    <Text style={styles.srEmptyTitle}>No results found</Text>
                                    <Text style={styles.srEmptySubtitle}>Try searching by event name or city</Text>
                                </View>
                            }
                            renderItem={({ item, index }: any) => {
                                // ── City Suggestion Row ──
                                if (item.isCity) {
                                    return (
                                        <TouchableOpacity
                                            style={styles.citySuggRow}
                                            activeOpacity={0.7}
                                            onPress={() => {
                                                Haptics.selectionAsync();
                                                setSearchVisible(false);
                                                setSearchQuery('');
                                                setSelectedCity(item.name);
                                            }}
                                        >
                                            <View style={styles.cityIconBox}>
                                                <Ionicons name="location" size={18} color="#3B82F6" />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.cityRowName}>{item.name}</Text>
                                                <Text style={styles.cityRowSub}>Tap to explore events</Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
                                        </TouchableOpacity>
                                    );
                                }

                                // ── First event after cities — add section label ──
                                const isFirstEvent = searchQuery.trim() && index > 0 && searchResults[index - 1]?.isCity;

                                // Distance
                                let distText = '';
                                if (userLoc && item.location?.coordinates) {
                                    const d = getDistance(
                                        userLoc.lat, userLoc.lng,
                                        item.location.coordinates[1],
                                        item.location.coordinates[0]
                                    );
                                    if (d < 100) distText = `${d.toFixed(1)} km away`;
                                }

                                const city = item.locationData?.city || item.location?.city || '';
                                const state = item.locationData?.state || item.location?.state || '';
                                const locationLine = [city, state].filter(Boolean).join(', ');

                                const dateStr = item.date
                                    ? new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                                    : null;

                                const price = item.displayPrice
                                    ? `₹${item.displayPrice.toLocaleString('en-IN')}`
                                    : 'Free';

                                const thumb = hero(item.coverImage)?.uri || null;

                                return (
                                    <>
                                        {isFirstEvent && (
                                            <Text style={[styles.srSectionLabel, { marginTop: 16 }]}>EVENTS</Text>
                                        )}
                                        <TouchableOpacity
                                            style={styles.srRow}
                                            activeOpacity={0.75}
                                            onPress={() => {
                                                Haptics.selectionAsync();
                                                setSearchVisible(false);
                                                setSearchQuery('');
                                                router.push({ pathname: '/(user)/event-details', params: { eventId: item._id } });
                                            }}
                                        >
                                            {/* Thumbnail */}
                                            <View style={styles.srThumbBox}>
                                                {thumb ? (
                                                    <Image
                                                        source={{ uri: thumb }}
                                                        style={styles.srThumb}
                                                        cachePolicy="memory-disk"
                                                        contentFit="cover"
                                                    />
                                                ) : (
                                                    <View style={[styles.srThumb, styles.srThumbPlaceholder]}>
                                                        <Ionicons name="musical-notes" size={20} color="rgba(255,255,255,0.2)" />
                                                    </View>
                                                )}
                                                {dateStr && (
                                                    <View style={styles.srDateBadge}>
                                                        <Text style={styles.srDateBadgeTxt}>{dateStr}</Text>
                                                    </View>
                                                )}
                                            </View>

                                            {/* Info */}
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.srTitle} numberOfLines={1}>{item.title || item.name}</Text>
                                                {locationLine ? (
                                                    <View style={styles.srLocRow}>
                                                        <Ionicons name="location" size={11} color="#3B82F6" />
                                                        <Text style={styles.srLocText} numberOfLines={1}>{locationLine}</Text>
                                                    </View>
                                                ) : null}
                                                {distText ? (
                                                    <Text style={styles.srDistText}>{distText}</Text>
                                                ) : null}
                                            </View>

                                            {/* Price */}
                                            <View style={styles.srPriceBox}>
                                                <Text style={styles.srPrice}>{price}</Text>
                                                <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.2)" style={{ marginTop: 4 }} />
                                            </View>
                                        </TouchableOpacity>
                                    </>
                                );
                            }}
                        />
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050505' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8 },
    headerLeft: { flex: 1 },
    locationSelector: { justifyContent: 'center' },
    locLabel: { color: '#3b82f6', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
    locValue: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 2 },
    bellBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', position: 'relative' },
    badge: { position: 'absolute', top: 4, right: 4, backgroundColor: '#EF4444', minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#050505', paddingHorizontal: 4 },
    badgeText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
    profileWrapper: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', padding: 2 },
    profilePic: { width: '100%', height: '100%', borderRadius: 22 },
    searchContainer: { paddingHorizontal: 20, marginVertical: 12 },
    searchBar: { height: 50, backgroundColor: '#111', borderRadius: 25, flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 6 },
    searchPlaceholder: { flex: 1, color: 'rgba(255,255,255,0.4)', marginLeft: 12, fontSize: 14 },
    filterInlineBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    cityChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    cityChipActive: { backgroundColor: 'rgba(37,99,235,0.15)', borderColor: '#2563EB' },
    cityChipText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
    cityChipTextActive: { color: '#fff', fontWeight: '800' },
    eventCard: { marginHorizontal: 20, height: 400, borderRadius: 28, overflow: 'hidden', marginBottom: 24 },
    cardImageBg: { flex: 1 },
    cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
    dateBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 4 },
    dateBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
    verifiedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4f46e5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 4 },
    verifiedBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
    cardContentBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingTop: 60 },
    cardEventTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 4 },
    cardEventHost: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
    ticketStatusDot: { 
        width: 6, 
        height: 6, 
        borderRadius: 3,
    },
    cardFooterStats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statsRowLeft: { flexDirection: 'row', gap: 12 },
    statChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#151515', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 8 },
    statChipTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
    requestBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24 },
    requestBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '800' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#131521', borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 24, paddingHorizontal: 24, height: '80%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
    resetBtnText: { color: '#7c4dff', fontSize: 13, fontWeight: '800' },
    filterSectionLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '800', marginBottom: 15 },
    cardLoaderOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 10, borderRadius: 28 },
    dateChip: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', marginRight: 10 },
    dateChipActive: { backgroundColor: 'rgba(37,99,235,0.15)', borderWidth: 1, borderColor: '#2563EB' },
    dateChipText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '700' },
    dateChipTextActive: { color: '#fff' },
    applyBtn: { borderRadius: 20, overflow: 'hidden', marginTop: 30 },
    applyBtnGrad: { paddingVertical: 18, alignItems: 'center' },
    applyBtnTxt: { color: '#fff', fontSize: 17, fontWeight: '900' },
    searchOverlay: { flex: 1 },
    stickySearch: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    searchInputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        height: 46,
    },
    sInput: { flex: 1, height: 46, color: '#fff', fontSize: 15, paddingHorizontal: 10 },
    srSectionLabel: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.5,
        marginTop: 16,
        marginBottom: 10,
    },
    citySuggRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        gap: 14,
    },
    cityIconBox: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(37,99,235,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(37,99,235,0.3)',
    },
    cityRowName: { color: '#fff', fontSize: 15, fontWeight: '700' },
    cityRowSub: { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2 },
    srRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        gap: 14,
    },
    srThumbBox: { position: 'relative' },
    srThumb: { width: 68, height: 68, borderRadius: 14 },
    srThumbPlaceholder: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    srDateBadge: {
        position: 'absolute',
        bottom: 5,
        left: 5,
        backgroundColor: 'rgba(0,0,0,0.75)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
    },
    srDateBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },
    srTitle: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.1 },
    srLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    srLocText: { color: '#3B82F6', fontSize: 12, fontWeight: '600', flex: 1 },
    srDistText: { color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 3 },
    srPriceBox: { alignItems: 'flex-end', justifyContent: 'center', minWidth: 52 },
    srPrice: { color: '#3B82F6', fontWeight: '800', fontSize: 13 },
    srEmpty: {
        alignItems: 'center',
        paddingTop: 80,
        gap: 12,
    },
    srEmptyTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 16, fontWeight: '700' },
    srEmptySubtitle: { color: 'rgba(255,255,255,0.25)', fontSize: 13 },
    srSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
});