import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, Dimensions, TextInput, Modal,
    ImageBackground, Animated, ActivityIndicator,
    Platform, FlatList, ScrollView, RefreshControl
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
        if (!searchQuery.trim()) return [];
        const safeEvents = Array.isArray(events) ? events : [];
        const safeVenues = Array.isArray(venues) ? venues : [];
        const query = searchQuery.toLowerCase();
        
        return [...safeEvents, ...safeVenues].filter((item: any) => {
            // Search by title/name
            const titleMatch = (item.name || item.title || '').toLowerCase().includes(query);
            
            // Search by city
            const cityMatch = (item.locationData?.city || item.location?.city || '').toLowerCase().includes(query);
            
            // Search by state
            const stateMatch = (item.locationData?.state || item.location?.state || '').toLowerCase().includes(query);
            
            // Search by address
            const addressMatch = (item.locationData?.address || item.location?.address || '').toLowerCase().includes(query);
            
            return titleMatch || cityMatch || stateMatch || addressMatch;
        }).slice(0, 10);
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

            {/* Search Modal */}
            <Modal visible={searchVisible} animationType="fade" transparent>
                <View style={[styles.searchOverlay, { paddingTop: insets.top }]}>
                    <LinearGradient 
                        colors={['#110B29', '#05020A', '#000000']} 
                        start={{ x: 0, y: 0 }} 
                        end={{ x: 1, y: 1 }} 
                        style={StyleSheet.absoluteFillObject} 
                    />
                    <View style={styles.stickySearch}>
                        <TouchableOpacity onPress={() => setSearchVisible(false)}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
                        <TextInput autoFocus placeholder="Search by city, state or event..." placeholderTextColor="rgba(255,255,255,0.3)" style={styles.sInput} value={searchQuery} onChangeText={setSearchQuery} />
                    </View>
                    <FlashList 
                        data={searchResults} 
                        renderItem={({ item }: any) => {
                            let distText = '';
                            if (userLoc && item.location?.coordinates) {
                                const d = getDistance(userLoc.lat, userLoc.lng, item.location.coordinates[1], item.location.coordinates[0]);
                                distText = ` · ${d.toFixed(1)}km away`;
                            }
                            
                            // Get location display
                            const locationText = item.locationData?.city || item.location?.city || item.locationData?.state || item.location?.state || '';
                            
                            return (
                                <TouchableOpacity style={styles.searchResultItem} onPress={() => { setSearchVisible(false); router.push({ pathname: '/(user)/event-details', params: { eventId: item._id } }); }}>
                                    <Image source={{ uri: item.coverImage }} style={styles.srThumb} cachePolicy="memory-disk" />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.srTitle}>{item.title}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                            {locationText && (
                                                <>
                                                    <Ionicons name="location" size={11} color="#2563EB" />
                                                    <Text style={[styles.srSub, { color: '#2563EB' }]}>
                                                        {locationText}
                                                    </Text>
                                                </>
                                            )}
                                            <Text style={styles.srSub}>
                                                {locationText && ' · '}
                                                {item.venueType || item.genre || 'Club Night'}
                                                <Text style={{ color: '#2563EB' }}>{distText}</Text>
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                                        <Text style={{ color: '#3B82F6', fontWeight: '800', fontSize: 13 }}>
                                            {item.displayPrice ? `₹${item.displayPrice.toLocaleString()}` : 'Free'}
                                        </Text>
                                        <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.3)" style={{ marginTop: 4 }} />
                                    </View>
                                </TouchableOpacity>
                            )
                        }}
                        estimatedItemSize={80}
                        contentContainerStyle={{ padding: 20 }}
                    />
                </View>
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
    searchOverlay: { flex: 1, backgroundColor: '#030303' },
    stickySearch: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    sInput: { flex: 1, height: 44, color: '#fff', fontSize: 17 },
    searchResultItem: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 15 },
    srThumb: { width: 64, height: 64, borderRadius: 16 },
    srTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
    srSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12 }
});