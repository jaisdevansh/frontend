import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Image, Switch, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

dayjs.extend(customParseFormat);

export default function HostCreateEvent() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const goBack = useStrictBack('/(host)/dashboard');
    const { showToast } = useToast();
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();

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
    const [useVenueLocation, setUseVenueLocation] = useState(true);
    const [venueLocation, setVenueLocation] = useState<{ lat: number, lng: number, address: string } | null>(null);

    // Picker visibility state
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    // Internal Date objects for the native pickers
    const [pickerDate, setPickerDate] = useState(new Date());
    const [pickerStart, setPickerStart] = useState(new Date());
    const [pickerEnd, setPickerEnd] = useState(new Date());
    const [pickerReveal, setPickerReveal] = useState(new Date());

    const [showRevealPicker, setShowRevealPicker] = useState(false);
    const [showBookingPicker, setShowBookingPicker] = useState(false);
    const [pickerBooking, setPickerBooking] = useState(new Date());

    const openPicker = (type: 'date' | 'start' | 'end' | 'reveal' | 'booking') => {
        if (Platform.OS === 'android') {
            if (type === 'date') {
                DateTimePickerAndroid.open({
                    value: pickerDate, mode: 'date', minimumDate: new Date(),
                    onChange: (_, selected) => { if (selected) { setPickerDate(selected); setDate(dayjs(selected).format('DD/MM/YYYY')); } }
                });
            } else if (type === 'start') {
                DateTimePickerAndroid.open({
                    value: pickerStart, mode: 'time', is24Hour: false,
                    onChange: (_, selected) => { if (selected) { setPickerStart(selected); setStartTime(dayjs(selected).format('hh:mm A')); } }
                });
            } else if (type === 'end') {
                DateTimePickerAndroid.open({
                    value: pickerEnd, mode: 'time', is24Hour: false,
                    onChange: (_, selected) => { if (selected) { setPickerEnd(selected); setEndTime(dayjs(selected).format('hh:mm A')); } }
                });
            } else if (type === 'reveal') {
                DateTimePickerAndroid.open({
                    value: pickerReveal, mode: 'time', // Android doesn't have "datetime" mode natively
                    onChange: (_, selectedTime) => { 
                        if (selectedTime) { 
                            // Second step: Ask for date on Android
                            DateTimePickerAndroid.open({
                                value: pickerReveal, mode: 'date', minimumDate: new Date(),
                                onChange: (__, selectedDate) => {
                                    if (selectedDate) {
                                        const finalDate = new Date(selectedDate);
                                        finalDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
                                        setPickerReveal(finalDate);
                                        setRevealTime(dayjs(finalDate).format('DD/MM/YYYY hh:mm A'));
                                    }
                                }
                            });
                        } 
                    }
                });
            } else if (type === 'booking') {
                DateTimePickerAndroid.open({
                    value: pickerBooking, mode: 'time',
                    onChange: (_, selectedTime) => { 
                        if (selectedTime) { 
                            DateTimePickerAndroid.open({
                                value: pickerBooking, mode: 'date', minimumDate: new Date(),
                                onChange: (__, selectedDate) => {
                                    if (selectedDate) {
                                        const finalDate = new Date(selectedDate);
                                        finalDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
                                        setPickerBooking(finalDate);
                                        setBookingOpenDate(dayjs(finalDate).format('DD/MM/YYYY hh:mm A'));
                                    }
                                }
                            });
                        } 
                    }
                });
            }
        } else {
            if (type === 'date') setShowDatePicker(true);
            if (type === 'start') setShowStartPicker(true);
            if (type === 'end') setShowEndPicker(true);
            if (type === 'reveal') setShowRevealPicker(true);
            if (type === 'booking') setShowBookingPicker(true);
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

    useQuery({
        queryKey: ['venueProfile'],
        queryFn: async () => {
            const res = await hostService.getVenueProfile();
            if (res.success && res.data) {
                const loc = {
                    lat: res.data.coordinates?.lat || 28.6139,
                    lng: res.data.coordinates?.long || 77.2090, 
                    address: res.data.address || ''
                };
                setVenueLocation(loc);
                if (!id) setLocationData(loc); 
            }
            return res.data;
        }
    });

    const { isLoading: fetching } = useQuery({
        queryKey: ['eventDetails', id],
        queryFn: async () => {
            const res = await hostService.getEvent(id as string);
            if (res.success) {
                const event = res.data;
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
                return event;
            }
            throw new Error('Failed to load event');
        },
        enabled: !!id,
    });

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
                allowsEditing: true,
                aspect: [16, 9],
                quality: 0.5,
                base64: true,
            });

            if (!result.canceled && result.assets[0].base64) {
                setImages(prev => [...prev, `data:image/jpeg;base64,${result.assets[0].base64}`]);
            }
        } catch (error) {
            showToast('Failed to pick additional image', 'error');
        }
    };

    const eventMutation = useMutation({
        mutationFn: async ({ eventData, targetStatus }: any) => {
            return id
                ? await hostService.updateEvent(id as string, eventData)
                : await hostService.createEvent(eventData);
        },
        onSuccess: (response, variables) => {
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
        if (ruleNoPhotos) houseRules.push({ icon: 'camera-off-outline', title: 'Strict No-Photo Policy', detail: 'Photography is strictly prohibited inside the venue.' });

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
                _id: t.id,
                type: t.type,
                price: parseFloat(t.price) || 0,
                capacity: parseInt(t.capacity) || 0
            })),
            freeRefreshments,
            locationData: useVenueLocation ? venueLocation : locationData,
            status: targetStatus
        };

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
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
        >
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
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
                            {Platform.OS === 'ios' && showDatePicker && (
                                <DateTimePicker
                                    value={pickerDate}
                                    mode="date"
                                    display="spinner"
                                    minimumDate={new Date()}
                                    onChange={(_, selected) => {
                                        setShowDatePicker(false);
                                        if (selected) {
                                            setPickerDate(selected);
                                            setDate(dayjs(selected).format('DD/MM/YYYY'));
                                        }
                                    }}
                                />
                            )}
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
                            {Platform.OS === 'ios' && showStartPicker && (
                                <DateTimePicker
                                    value={pickerStart}
                                    mode="time"
                                    is24Hour={false}
                                    display="spinner"
                                    onChange={(_, selected) => {
                                        setShowStartPicker(false);
                                        if (selected) {
                                            setPickerStart(selected);
                                            setStartTime(dayjs(selected).format('hh:mm A'));
                                        }
                                    }}
                                />
                            )}
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
                        {Platform.OS === 'ios' && showBookingPicker && (
                            <DateTimePicker
                                value={pickerBooking}
                                mode="datetime"
                                minimumDate={new Date()}
                                display="spinner"
                                onChange={(_, selected) => {
                                    setShowBookingPicker(false);
                                    if (selected) {
                                        setPickerBooking(selected);
                                        setBookingOpenDate(dayjs(selected).format('DD/MM/YYYY hh:mm A'));
                                    }
                                }}
                            />
                        )}
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
                            {Platform.OS === 'ios' && showEndPicker && (
                                <DateTimePicker
                                    value={pickerEnd}
                                    mode="time"
                                    is24Hour={false}
                                    display="spinner"
                                    onChange={(_, selected) => {
                                        setShowEndPicker(false);
                                        if (selected) {
                                            setPickerEnd(selected);
                                            setEndTime(dayjs(selected).format('hh:mm A'));
                                        }
                                    }}
                                />
                            )}
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
                                    if (val && venueLocation) setLocationData(venueLocation);
                                }} 
                                trackColor={{ false: '#333', true: COLORS.primary }} 
                                thumbColor="#FFF" 
                            />
                        </View>

                        {!useVenueLocation && (
                            <View style={{ marginTop: 12 }}>
                                <TouchableOpacity 
                                    style={styles.locationPickerBtn}
                                    onPress={async () => {
                                        const { status } = await Location.requestForegroundPermissionsAsync();
                                        if (status !== 'granted') return showToast('Location permission required', 'error');
                                        const loc = await Location.getCurrentPositionAsync({});
                                        const addr = await Location.reverseGeocodeAsync(loc.coords);
                                        const formatted = addr[0] ? `${addr[0].name || ''}, ${addr[0].street || ''}, ${addr[0].city || ''}` : 'Current GPS Location';
                                        setLocationData({
                                            lat: loc.coords.latitude,
                                            lng: loc.coords.longitude,
                                            address: formatted
                                        });
                                        showToast('Pin dropped at current location', 'success');
                                    }}
                                >
                                    <Ionicons name="location" size={20} color={COLORS.primary} />
                                    <Text style={styles.locationPickerText}>
                                        {locationData?.address || 'Tap to Drop Pin at Current Location'}
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
                                {Platform.OS === 'ios' && showRevealPicker && (
                                    <DateTimePicker
                                        value={pickerReveal}
                                        mode="datetime"
                                        minimumDate={new Date()}
                                        display="spinner"
                                        onChange={(_, selected) => {
                                            setShowRevealPicker(false);
                                            if (selected) {
                                                setPickerReveal(selected);
                                                setRevealTime(dayjs(selected).format('DD/MM/YYYY hh:mm A'));
                                            }
                                        }}
                                    />
                                )}
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
            </ScrollView>

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
        </SafeAreaView>
        </KeyboardAvoidingView>
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
        paddingBottom: 160, // Increased to account for the floating footer + tab bar
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
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(11, 15, 26, 0.95)',
        paddingBottom: 30,
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
