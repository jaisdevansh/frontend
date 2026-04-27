import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator, Image, Switch, FlatList, Platform, Keyboard, ScrollView, KeyboardAvoidingView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets, SafeAreaView as SafeAreaContextView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStrictBack } from '../../hooks/useStrictBack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { useToast } from '../../context/ToastContext';
import { hostService } from '../../services/hostService';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import * as ImagePicker from 'expo-image-picker';
import { PremiumDateTimePicker } from '../../components/PremiumDateTimePicker';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

dayjs.extend(customParseFormat);

export default function HostCreateEvent() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const goBack = useStrictBack('/(host)/dashboard');
    const { showToast } = useToast();
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();
    const scrollViewRef = useRef<any>(null);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(''); // stored as DD/MM/YYYY string
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [floorCount, setFloorCount] = useState('1');
    const [coverImage, setCoverImage] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [bookingOpenDate, setBookingOpenDate] = useState(''); // when tickets go on sale
    const [freeRefreshments, setFreeRefreshments] = useState<{ title: string, description: string }[]>([]);
    const [newItemTitle, setNewItemTitle] = useState('');
    const [newItemDesc, setNewItemDesc] = useState('');
    const [showRefreshmentModal, setShowRefreshmentModal] = useState(false);
    
    // Location Details
    const [locationData, setLocationData] = useState<{ lat: number, lng: number, address: string } | null>(null);
    const [useVenueLocation, setUseVenueLocation] = useState(false);
    const [venueLocation, setVenueLocation] = useState<{ lat: number, lng: number, address: string } | null>(null);

    // Premium Picker State
    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickerMode, setPickerMode] = useState<'date' | 'time' | 'datetime'>('date');
    const [pickerType, setPickerType] = useState<'date' | 'start' | 'end' | 'reveal' | 'booking'>('date');
    const [pickerInitialDate, setPickerInitialDate] = useState(new Date());
    const [pickerTitle, setPickerTitle] = useState('Select Date & Time');

    const openPicker = (type: 'date' | 'start' | 'end' | 'reveal' | 'booking') => {
        setPickerType(type);
        if (type === 'date') {
            setPickerMode('date');
            setPickerTitle('Event Date');
        } else if (type === 'start') {
            setPickerMode('time');
            setPickerTitle('Start Time');
        } else if (type === 'end') {
            setPickerMode('time');
            setPickerTitle('End Time');
        } else if (type === 'reveal') {
            setPickerMode('datetime');
            setPickerTitle('Auto-Reveal Time');
        } else if (type === 'booking') {
            setPickerMode('datetime');
            setPickerTitle('Go Live Time');
        }
        setPickerInitialDate(new Date());
        setPickerVisible(true);
    };

    const handlePremiumPickerSelect = (selectedDate: Date) => {
        if (pickerType === 'date') {
            setDate(dayjs(selectedDate).format('DD/MM/YYYY'));
        } else if (pickerType === 'start') {
            setStartTime(dayjs(selectedDate).format('hh:mm A'));
        } else if (pickerType === 'end') {
            setEndTime(dayjs(selectedDate).format('hh:mm A'));
        } else if (pickerType === 'reveal') {
            setRevealTime(dayjs(selectedDate).format('DD/MM/YYYY hh:mm A'));
        } else if (pickerType === 'booking') {
            setBookingOpenDate(dayjs(selectedDate).format('DD/MM/YYYY hh:mm A'));
        }
    };
    
    // House Rules State
    const [ruleDressCode, setRuleDressCode] = useState(false);
    const [ruleIdRequired, setRuleIdRequired] = useState(false);
    const [ruleNoPhotos, setRuleNoPhotos] = useState(false);

    // Tickets State (Dynamic)
    const [tickets, setTickets] = useState<{ id?: string, type: string, price: string, capacity: string }[]>([
        { type: 'General Access', price: '', capacity: '100' }
    ]);

    // Location Config
    const [locationVisibility, setLocationVisibility] = useState<'public' | 'delayed' | 'hidden'>('public');
    const [revealTime, setRevealTime] = useState('');

    const { data: venueProfileData, isLoading: venueLoading } = useQuery({
        queryKey: ['venueProfile'],
        queryFn: async () => {
            const res = await hostService.getVenueProfile();
            return res.success ? res.data : null;
        },
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
    });

    // Update venueLocation whenever venueProfileData changes
    useEffect(() => {
        if (venueProfileData) {
            const vCoords = venueProfileData.coordinates;
            const vAddress = venueProfileData.address;
            const hasVenueCoords = vCoords?.lat && (vCoords?.long || vCoords?.lng);

            if (hasVenueCoords) {
                // ✅ Venue has saved coordinates — use them
                const loc = {
                    lat: parseFloat(vCoords.lat),
                    lng: parseFloat(vCoords.long || vCoords.lng),
                    address: vAddress || ''
                };
                setVenueLocation(loc);
                // Don't auto-set locationData, let user toggle it on
            } else if (vAddress) {
                // ✅ Venue has address but no coordinates — use address with dummy coords
                const loc = {
                    lat: 0,
                    lng: 0,
                    address: vAddress
                };
                setVenueLocation(loc);
                // Don't auto-set locationData, let user toggle it on
            } else {
                // 📍 No venue data at all — try GPS as fallback
                (async () => {
                    try {
                        const { status } = await Location.requestForegroundPermissionsAsync();
                        if (status === 'granted') {
                            const gps = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                            const geocode = await Location.reverseGeocodeAsync(gps.coords);
                            const formatted = geocode[0]
                                ? [geocode[0].name, geocode[0].street, geocode[0].city].filter(Boolean).join(', ')
                                : 'Current GPS Location';
                            const loc = {
                                lat: gps.coords.latitude,
                                lng: gps.coords.longitude,
                                address: formatted
                            };
                            setVenueLocation(loc);
                            // Don't auto-set locationData, let user toggle it on
                        }
                    } catch (_) {
                        // GPS failed — leave locationData null, host can set manually
                    }
                })();
            }
        }
    }, [venueProfileData]);

    const { data: eventData, isLoading: fetching } = useQuery({
        queryKey: ['eventDetails', id],
        queryFn: async () => {
            const res = await hostService.getEvent(id as string);
            if (res.success) return res.data;
            throw new Error('Failed to load event');
        },
        enabled: !!id,
    });

    useEffect(() => {
        if (eventData) {
            const event = eventData;
            setTitle(event.title || '');
            setDescription(event.description || '');
            setDate(event.date ? dayjs(event.date).format('DD/MM/YYYY') : '');
            setStartTime(event.startTime || '');
            setEndTime(event.endTime || '');
            setFloorCount(event.floorCount?.toString() || '1');
            setCoverImage(event.coverImage || '');
            setImages(event.images || []);

            setLocationVisibility(event.locationVisibility || 'public');
            setRevealTime(event.revealTime ? dayjs(event.revealTime).format('DD/MM/YYYY hh:mm A') : '');
            setBookingOpenDate(event.bookingOpenDate ? dayjs(event.bookingOpenDate).format('DD/MM/YYYY hh:mm A') : '');
            setFreeRefreshments(event.freeRefreshments || []);
            
            if (event.locationData) setLocationData(event.locationData);

            if (event.houseRules) {
                setRuleDressCode(event.houseRules.some((r: any) => r.title?.includes('Dress Code')));
                setRuleIdRequired(event.houseRules.some((r: any) => r.title?.includes('ID Required') || r.title?.includes('Age')));
                setRuleNoPhotos(event.houseRules.some((r: any) => r.title?.includes('No-Photo')));
            }

            if (event.tickets && Array.isArray(event.tickets) && event.tickets.length > 0) {
                setTickets(event.tickets.map((t: any) => ({
                    id: t._id,
                    type: t.type,
                    price: t.price?.toString() || '',
                    capacity: t.capacity?.toString() || ''
                })));
            }
        }
    }, [eventData]);

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [16, 9],
                quality: 0.5,
                base64: true,
            });

            if (!result.canceled && result.assets[0].base64) {
                setCoverImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
            }
        } catch (error) {
            showToast('Failed to pick image', 'error');
        }
    };

    const pickAdditionalImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsMultipleSelection: true,
                selectionLimit: 10,
                quality: 0.5,
                base64: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const newImages = result.assets
                    .filter(asset => asset.base64)
                    .map(asset => `data:image/jpeg;base64,${asset.base64}`);
                
                setImages(prev => [...prev, ...newImages]);
                showToast(`${newImages.length} image${newImages.length > 1 ? 's' : ''} added`, 'success');
            }
        } catch (error) {
            showToast('Failed to pick additional image', 'error');
        }
    };

    const eventMutation = useMutation({
        mutationFn: async ({ eventData, targetStatus }: any) => {
            console.log('[MUTATION] Starting mutation, id:', id);
            console.log('[MUTATION] Event data:', eventData);
            
            const result = id
                ? await hostService.updateEvent(id as string, eventData)
                : await hostService.createEvent(eventData);
            
            console.log('[MUTATION] Result:', result);
            return result;
        },
        onSuccess: (response, variables) => {
            console.log('[MUTATION SUCCESS] Response:', response);
            if (response.success) {
                showToast(variables.targetStatus === 'DRAFT' ? 'Experience saved as Draft' : (id ? 'Experience Updated!' : 'Experience Launched!'), 'success');
                queryClient.invalidateQueries({ queryKey: ['events'] });
                queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
                goBack();
            } else {
                showToast(response.message || 'Action failed', 'error');
            }
        },
        onError: (error: any) => {
            console.log('[MUTATION ERROR]', error);
            console.log('[MUTATION ERROR] Response:', error?.response?.data);
            showToast(error?.response?.data?.message || 'Something went wrong', 'error');
        }
    });

    const handleSave = (targetStatus: 'DRAFT' | 'LIVE' = 'LIVE') => {
        if (!title || !date || !startTime || tickets.length === 0 || !tickets[0].price || !tickets[0].capacity) {
            showToast('Please fill all required fields and at least one ticket', 'error');
            return;
        }

        const parsedDate = dayjs(date, ['DD/MM/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY'], true);
        if (!parsedDate.isValid()) {
            showToast('Invalid date format. Use DD/MM/YYYY', 'error');
            return;
        }

        const houseRules = [];
        if (ruleDressCode) houseRules.push({ icon: 'shirt-outline', title: 'Dress Code: Smart Sophisticated', detail: 'No sportswear, trainers, or caps.' });
        if (ruleIdRequired) houseRules.push({ icon: 'person-outline', title: 'ID Required (21+ only)', detail: 'Valid government-issued photo ID is mandatory.' });
        if (ruleNoPhotos) houseRules.push({ icon: 'eye-off-outline', title: 'Strict No-Photo Policy', detail: 'Photography is strictly prohibited inside the venue.' });

        // Resolve locationData: prioritize venueLocation if toggle is ON, else manual locationData
        let finalLocation = locationData;
        if (useVenueLocation && venueLocation) {
            finalLocation = venueLocation;
        }

        const eventData = {
            title,
            description,
            date: parsedDate.toISOString(),
            startTime,
            endTime,
            floorCount: parseInt(floorCount) || 1,
            coverImage,
            images,
            houseRules,
            locationVisibility,
            revealTime: (locationVisibility === 'delayed' && revealTime) ? dayjs(revealTime, ['DD/MM/YYYY hh:mm A', 'DD/MM/YYYY HH:mm', 'YYYY-MM-DD HH:mm']).toISOString() : undefined,
            bookingOpenDate: bookingOpenDate ? dayjs(bookingOpenDate, ['DD/MM/YYYY hh:mm A', 'DD/MM/YYYY HH:mm', 'YYYY-MM-DD HH:mm']).toISOString() : undefined,
            tickets: tickets.map(t => ({
                ...(t.id && t.id !== 'temp' ? { _id: t.id } : {}), // Only include _id if it's a real ID
                type: t.type,
                price: parseFloat(t.price) || 0,
                capacity: parseInt(t.capacity) || 0
            })),
            freeRefreshments,
            locationData: finalLocation,
            status: targetStatus
        };

        console.log('[UPDATE EVENT] Event ID:', id);
        console.log('[UPDATE EVENT] Event Data:', JSON.stringify(eventData, null, 2));
        console.log('[UPDATE EVENT] Target Status:', targetStatus);

        eventMutation.mutate({ eventData, targetStatus });
    };

    if (fetching) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </SafeAreaView>
        );
    }

    return (
        <>
        <SafeAreaContextView style={[styles.container, { flex: 1 }]} edges={['top', 'left', 'right']}>
            <KeyboardAwareScrollView 
                ref={scrollViewRef}
                style={{ flex: 1 }} 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                enableOnAndroid={true}
                extraHeight={Platform.OS === 'ios' ? 120 : 150}
            >
            <TouchableOpacity style={styles.backBtn} onPress={() => goBack()}>
                <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>

            <View style={styles.header}>
                <Text style={styles.title}>{id ? 'Edit Experience' : 'New Experience'}</Text>
                <Text style={styles.subtitle}>{id ? 'Refine your curation' : 'Curate a night to remember'}</Text>
            </View>

            <View style={styles.form}>
                <TouchableOpacity style={styles.imageConfigPicker} onPress={pickImage}>
                    {coverImage ? (
                        <Image source={{ uri: coverImage }} style={styles.previewImage} />
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <Ionicons name="image-outline" size={32} color={COLORS.primary} />
                            <Text style={styles.uploadText}>Upload Event Cover</Text>
                        </View>
                    )}
                </TouchableOpacity>

                    <Input
                        label="Event Title"
                        placeholder="e.g. Midnight Mixology"
                        value={title}
                        onChangeText={setTitle}
                    />

                    <Input
                        label="About this Event"
                        placeholder="What's happening? (e.g. Menu, DJ Lineup, Dress code)"
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                    />

                    <View style={styles.row}>
                        {/* DATE PICKER */}
                        <View style={styles.flex1}>
                            <Text style={styles.pickerLabel}>DATE</Text>
                            <TouchableOpacity style={styles.pickerBox} onPress={() => openPicker('date')}>
                                <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                                <Text style={[styles.pickerText, !date && styles.pickerPlaceholder]}>
                                    {date || 'Pick date'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* START TIME PICKER */}
                        <View style={styles.flex1}>
                            <Text style={styles.pickerLabel}>EVENT STARTS</Text>
                            <TouchableOpacity style={styles.pickerBox} onPress={() => openPicker('start')}>
                                <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                                <Text style={[styles.pickerText, !startTime && styles.pickerPlaceholder]}>
                                    {startTime || 'Pick time'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* BOOKING START TIME */}
                    <View style={{ marginTop: 16 }}>
                        <Text style={styles.pickerLabel}>TICKETS GO LIVE ON</Text>
                        <TouchableOpacity style={styles.pickerBox} onPress={() => openPicker('booking')}>
                            <Ionicons name="ticket-outline" size={16} color={COLORS.primary} />
                            <Text style={[styles.pickerText, !bookingOpenDate && styles.pickerPlaceholder]}>
                                {bookingOpenDate || 'Select date & time when tickets become available'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* END TIME + FLOORS ROW */}
                    <View style={[styles.row, { marginTop: 16 }]}>
                        {/* END TIME PICKER */}
                        <View style={styles.flex1}>
                            <Text style={styles.pickerLabel}>EVENT ENDS</Text>
                            <TouchableOpacity style={styles.pickerBox} onPress={() => openPicker('end')}>
                                <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                                <Text style={[styles.pickerText, !endTime && styles.pickerPlaceholder]}>
                                    {endTime || 'Pick time'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.flex1}>
                            <Input
                                label="Total Floors"
                                placeholder="e.g. 2"
                                value={floorCount}
                                onChangeText={setFloorCount}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    {/* Additional Images Gallery */}
                    <Text style={styles.sectionLabel}>GALLERY ({images.length})</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                        <TouchableOpacity style={styles.addThumbBtn} onPress={pickAdditionalImage}>
                            <Ionicons name="add" size={24} color={COLORS.primary} />
                        </TouchableOpacity>
                        {images.map((img, i) => (
                            <View key={i} style={styles.thumbnailWrapper}>
                                <Image source={{ uri: img }} style={styles.thumbnailImg} />
                                <TouchableOpacity style={styles.thumbDelete} onPress={() => setImages(prev => prev.filter((_, idx) => idx !== i))}>
                                    <Ionicons name="close" size={14} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>

                    {/* House Rules */}
                    <Text style={styles.sectionLabel}>HOUSE RULES</Text>
                    <View style={styles.ruleToggleRow}>
                        <View style={styles.ruleToggleTextGroup}>
                            <Text style={styles.ruleTitle}>Dress Code: Smart</Text>
                            <Text style={styles.ruleDesc}>No sportswear or caps allowed</Text>
                        </View>
                        <Switch value={ruleDressCode} onValueChange={setRuleDressCode} trackColor={{ false: '#333', true: COLORS.primary }} thumbColor="#FFF" />
                    </View>
                    <View style={styles.ruleToggleRow}>
                        <View style={styles.ruleToggleTextGroup}>
                            <Text style={styles.ruleTitle}>ID Required (21+)</Text>
                            <Text style={styles.ruleDesc}>Valid government photo ID required</Text>
                        </View>
                        <Switch value={ruleIdRequired} onValueChange={setRuleIdRequired} trackColor={{ false: '#333', true: COLORS.primary }} thumbColor="#FFF" />
                    </View>
                    <View style={styles.ruleToggleRow}>
                        <View style={styles.ruleToggleTextGroup}>
                            <Text style={styles.ruleTitle}>No-Photo Policy</Text>
                            <Text style={styles.ruleDesc}>No photography inside the venue</Text>
                        </View>
                        <Switch value={ruleNoPhotos} onValueChange={setRuleNoPhotos} trackColor={{ false: '#333', true: COLORS.primary }} thumbColor="#FFF" />
                    </View>

                    {/* EVENT LOCATION CONTROL */}
                    <Text style={styles.sectionLabel}>EVENT LOCATION</Text>
                    <View style={styles.privacyCard}>
                         <View style={styles.ruleToggleRow}>
                            <View style={styles.ruleToggleTextGroup}>
                                <Text style={styles.ruleTitle}>Use Venue Location</Text>
                                <Text style={styles.ruleDesc}>{venueLocation?.address || 'Your saved business address'}</Text>
                            </View>
                            <Switch 
                                value={useVenueLocation} 
                                onValueChange={(val) => {
                                    setUseVenueLocation(val);
                                    if (val) {
                                        // When turning ON: Use venue location if available
                                        if (venueLocation) {
                                            setLocationData(venueLocation);
                                            showToast('Using venue location', 'success');
                                        } else {
                                            showToast('No venue location saved', 'error');
                                        }
                                    } else {
                                        // When turning OFF: Clear locationData so user can set custom
                                        setLocationData(null);
                                    }
                                }} 
                                trackColor={{ false: '#333', true: COLORS.primary }} 
                                thumbColor="#FFF" 
                            />
                        </View>

                        {!useVenueLocation && (
                            <View style={{ marginTop: 12, gap: 12 }}>
                                {/* Manual Address Input */}
                                <Input
                                    label="Custom Event Address"
                                    placeholder="Type event address manually..."
                                    value={locationData?.address || ''}
                                    onChangeText={(text) => {
                                        setLocationData(prev => ({
                                            lat: prev?.lat || 0,
                                            lng: prev?.lng || 0,
                                            address: text
                                        }));
                                    }}
                                    multiline
                                    numberOfLines={2}
                                />
                                
                                {/* GPS Pin Drop Button */}
                                <TouchableOpacity 
                                    style={styles.locationPickerBtn}
                                    onPress={async () => {
                                        try {
                                            const { status } = await Location.requestForegroundPermissionsAsync();
                                            if (status !== 'granted') {
                                                showToast('Location permission required', 'error');
                                                return;
                                            }
                                            
                                            showToast('Getting current location...', 'info');
                                            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                                            const addr = await Location.reverseGeocodeAsync(loc.coords);
                                            const formatted = addr[0] 
                                                ? [addr[0].name, addr[0].street, addr[0].city, addr[0].region].filter(Boolean).join(', ')
                                                : 'Current GPS Location';
                                            
                                            setLocationData({
                                                lat: loc.coords.latitude,
                                                lng: loc.coords.longitude,
                                                address: formatted
                                            });
                                            showToast('Location captured!', 'success');
                                        } catch (error) {
                                            showToast('Failed to get location', 'error');
                                        }
                                    }}
                                >
                                    <Ionicons name="navigate" size={20} color={COLORS.primary} />
                                    <Text style={styles.locationPickerText}>
                                        Or Drop Pin at Current GPS Location
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* LOCATION CONFIG */}
                    <Text style={styles.sectionLabel}>LOCATION PRIVACY</Text>
                    <View style={styles.privacyCard}>
                        <View style={styles.privacyHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.ruleTitle}>Visibility Mode</Text>
                                <Text style={styles.ruleDesc}>
                                    {locationVisibility === 'public' 
                                        ? 'Visible to everyone immediately' 
                                        : locationVisibility === 'delayed' 
                                        ? 'Reveals automatically at drop time' 
                                        : 'Strictly hidden until manual reveal'}
                                </Text>
                            </View>
                        </View>
                        
                        <View style={styles.segmentContainer}>
                            {['public', 'delayed', 'hidden'].map((opt) => (
                                <TouchableOpacity 
                                    key={opt}
                                    style={[styles.segmentBtn, locationVisibility === opt && styles.segmentBtnActive]}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setLocationVisibility(opt as any);
                                    }}
                                >
                                    <Text style={[styles.segmentText, locationVisibility === opt && styles.segmentTextActive]}>
                                        {opt.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {locationVisibility === 'delayed' && (
                            <View style={{ marginTop: 20 }}>
                                <Text style={styles.pickerLabel}>AUTO-REVEAL AT</Text>
                                <TouchableOpacity style={styles.pickerBox} onPress={() => openPicker('reveal')}>
                                    <Ionicons name="notifications-outline" size={16} color={COLORS.primary} />
                                    <Text style={[styles.pickerText, !revealTime && styles.pickerPlaceholder]}>
                                        {revealTime || 'Set drop time...'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {locationVisibility === 'hidden' && (
                        <View style={styles.infoBox}>
                            <Ionicons name="lock-closed" size={18} color={COLORS.primary} />
                            <Text style={styles.infoBoxText}>
                                Strict Mode: Location will stay hidden for everyone until you manually click "Reveal" in Event Management.
                            </Text>
                        </View>
                    )}

                    {/* FREE REFRESHMENTS */}
                    <Text style={styles.sectionLabel}>FREE REFRESHMENTS & INCLUSIONS</Text>
                    {freeRefreshments.map((item, idx) => (
                        <View key={idx} style={styles.refreshmentItem}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.refreshmentTitle}>{item.title}</Text>
                                <Text style={styles.refreshmentDesc}>{item.description}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setFreeRefreshments(prev => prev.filter((_, i) => i !== idx))}>
                                <Ionicons name="trash-outline" size={20} color={COLORS.error || '#ff4444'} />
                            </TouchableOpacity>
                        </View>
                    ))}

                    <TouchableOpacity 
                        style={styles.addRefreshmentBtn} 
                        onPress={() => setShowRefreshmentModal(!showRefreshmentModal)}
                    >
                        <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
                        <Text style={styles.addRefreshmentText}>Add Inclusion/Refreshment</Text>
                    </TouchableOpacity>

                    {showRefreshmentModal && (
                        <View style={styles.addInclusionBox}>
                            <Input
                                label="Item Title"
                                placeholder="e.g. 1st Drink Free"
                                value={newItemTitle}
                                onChangeText={setNewItemTitle}
                            />
                            <Input
                                label="Description (Optional)"
                                placeholder="e.g. Valid until 11 PM for ticket holders"
                                value={newItemDesc}
                                onChangeText={setNewItemDesc}
                                multiline
                            />
                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                                <Button 
                                    title="Add Item" 
                                    style={{ flex: 1 }}
                                    onPress={() => {
                                        if (!newItemTitle) return;
                                        setFreeRefreshments(prev => [...prev, { title: newItemTitle, description: newItemDesc }]);
                                        setNewItemTitle('');
                                        setNewItemDesc('');
                                        setShowRefreshmentModal(false);
                                    }}
                                />
                                <TouchableOpacity 
                                    style={styles.cancelBtn}
                                    onPress={() => setShowRefreshmentModal(false)}
                                >
                                    <Text style={{ color: '#fff' }}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <Text style={styles.sectionLabel}>TICKET CONFIGURATION</Text>

                    {tickets.map((ticket, index) => (
                        <View key={index} style={styles.ticketCard}>
                            <View style={styles.ticketHeaderRow}>
                                <View style={{ flex: 1 }}>
                                    <Input
                                        label={index === 0 ? "Default Ticket Name" : `Ticket Type #${index + 1}`}
                                        placeholder="e.g. VIP Table, Front Row"
                                        value={ticket.type}
                                        onChangeText={(val) => {
                                            const newTickets = [...tickets];
                                            newTickets[index].type = val;
                                            setTickets(newTickets);
                                        }}
                                        containerStyle={{ marginBottom: 0 }}
                                    />
                                </View>
                                {index > 0 && (
                                    <TouchableOpacity 
                                        style={styles.ticketDeleteBtn}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setTickets(tickets.filter((_, i) => i !== index));
                                        }}
                                    >
                                        <Ionicons name="trash-outline" size={20} color={COLORS.error || '#ff4444'} />
                                    </TouchableOpacity>
                                )}
                            </View>
                            
                            <View style={styles.ticketInputsRow}>
                                <View style={styles.flex2}>
                                    <Input
                                        label="Price"
                                        placeholder="₹ Price"
                                        value={ticket.price}
                                        onChangeText={(val) => {
                                            const newTickets = [...tickets];
                                            newTickets[index].price = val;
                                            setTickets(newTickets);
                                        }}
                                        keyboardType="numeric"
                                        containerStyle={styles.compactInputContainer}
                                    />
                                </View>
                                <View style={styles.flex1}>
                                    <Input
                                        label="Limit"
                                        placeholder="Qty"
                                        value={ticket.capacity}
                                        onChangeText={(val) => {
                                            const newTickets = [...tickets];
                                            newTickets[index].capacity = val;
                                            setTickets(newTickets);
                                        }}
                                        keyboardType="numeric"
                                        containerStyle={styles.compactInputContainer}
                                    />
                                </View>
                            </View>
                        </View>
                    ))}

                    <TouchableOpacity 
                        style={styles.addTicketBtn}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setTickets([...tickets, { type: '', price: '', capacity: '50' }]);
                        }}
                    >
                        <Ionicons name="add-circle" size={20} color={COLORS.primary} />
                        <Text style={styles.addTicketText}>Add Ticket Type</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAwareScrollView>
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                <View style={styles.footerRow}>
                    <TouchableOpacity 
                        style={[styles.draftBtn, eventMutation.isPending && { opacity: 0.5 }]} 
                        onPress={() => handleSave('DRAFT')}
                        disabled={eventMutation.isPending}
                    >
                        <Text style={styles.draftBtnText}>Save Draft</Text>
                    </TouchableOpacity>
                    
                    <View style={{ flex: 1.5 }}>
                        <Button
                            title={eventMutation.isPending ? (id ? "Updating..." : "Launching...") : (id ? "Update Event" : "Publish Now")}
                            onPress={() => handleSave('LIVE')}
                            disabled={eventMutation.isPending}
                        />
                    </View>
                </View>
            </View>
        </SafeAreaContextView>

            <PremiumDateTimePicker
                visible={pickerVisible}
                onClose={() => setPickerVisible(false)}
                onSelect={handlePremiumPickerSelect}
                mode={pickerMode}
                initialDate={pickerInitialDate}
                title={pickerTitle}
                minDate={new Date()}
            />
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background.dark,
    },
    scrollContent: {
        padding: SPACING.lg,
        paddingTop: 40,
        paddingBottom: 40,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    header: {
        marginBottom: 32,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: '800',
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 14,
        marginTop: 4,
    },
    imageConfigPicker: {
        width: '100%',
        height: 200,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: BORDER_RADIUS.xl,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderStyle: 'dashed',
        marginBottom: 20,
        overflow: 'hidden',
    },
    previewImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    imagePlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    uploadText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    form: {
        width: '100%',
    },
    row: {
        flexDirection: 'row',
        gap: 16,
    },
    sectionLabel: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 2,
        marginTop: 24,
        marginBottom: 16,
        paddingLeft: 4,
    },
    addThumbBtn: {
        width: 80,
        height: 80,
        borderRadius: BORDER_RADIUS.default,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    thumbnailWrapper: {
        width: 80,
        height: 80,
        borderRadius: BORDER_RADIUS.default,
        marginRight: 10,
        overflow: 'hidden',
    },
    thumbnailImg: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    thumbDelete: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ruleToggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.02)',
        padding: 16,
        borderRadius: BORDER_RADIUS.default,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    ruleToggleTextGroup: {
        flex: 1,
        paddingRight: 12,
    },
    ruleTitle: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    ruleDesc: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
    },
    ticketCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: BORDER_RADIUS.xl,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    ticketTypeLabel: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 12,
    },
    ticketInputsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    compactInputContainer: {
        marginBottom: 0,
    },
    flex1: {
        flex: 1,
    },
    flex2: {
        flex: 2,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: 'rgba(124, 77, 255, 0.05)',
        padding: 16,
        borderRadius: 16,
        gap: 12,
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(124, 77, 255, 0.1)',
    },
    infoBoxText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 12,
        flex: 1,
        lineHeight: 18,
    },
    footer: {
        padding: SPACING.lg,
        backgroundColor: 'rgba(11, 15, 26, 0.95)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    footerRow: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    draftBtn: {
        flex: 1,
        height: 56,
        borderRadius: BORDER_RADIUS.default,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(255,255,255,0.02)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    draftBtnText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700',
    },
    pickerLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.5,
        marginBottom: 8,
        paddingLeft: 4,
    },
    pickerBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 14,
        paddingVertical: 14,
        marginBottom: 16,
    },
    pickerText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    pickerPlaceholder: {
        color: 'rgba(255,255,255,0.3)',
        fontWeight: '400',
    },
    refreshmentItem: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 16,
        borderRadius: BORDER_RADIUS.lg,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    refreshmentTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
    refreshmentDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 },
    addRefreshmentBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 4 },
    addRefreshmentText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
    addInclusionBox: { backgroundColor: '#111', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: COLORS.primary, marginBottom: 20 },
    cancelBtn: { padding: 16, justifyContent: 'center', alignItems: 'center' },
    privacyCard: {
        backgroundColor: 'rgba(255,255,255,0.02)',
        padding: 20,
        borderRadius: BORDER_RADIUS.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        marginBottom: 10,
    },
    privacyHeader: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    segmentContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 4,
        borderRadius: 14,
        gap: 4,
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
    },
    segmentBtnActive: {
        backgroundColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    segmentText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    segmentTextActive: {
        color: '#FFF',
    },
    locationPickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(124,77,255,0.2)',
    },
    locationPickerText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
    },
    ticketHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    ticketDeleteBtn: {
        padding: 8,
        backgroundColor: 'rgba(255, 68, 68, 0.1)',
        borderRadius: 10,
        marginBottom: 8,
    },
    addTicketBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 16,
        borderRadius: 16,
        backgroundColor: 'rgba(124, 77, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(124, 77, 255, 0.1)',
        borderStyle: 'dashed',
        marginBottom: 24,
    },
    addTicketText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '700',
    },
});
