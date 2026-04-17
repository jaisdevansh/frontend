import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Platform as RNPlatform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStrictBack } from '../../hooks/useStrictBack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING } from '../../constants/design-system';
import { useToast } from '../../context/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { hostService } from '../../services/hostService';
import { userService } from '../../services/userService';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import dayjs from 'dayjs';
import { Platform } from 'react-native';
import { PremiumDateTimePicker } from '../../components/PremiumDateTimePicker';

export default function HostVenueProfile() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const goBack = useStrictBack('/(host)/dashboard');
    const { showToast } = useToast();
    const { user: authUser } = useAuth();
    const queryClient = useQueryClient();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: '',
        venueType: '',
        address: '',
        openingTime: '',
        closingTime: '',
        capacity: '',
        rules: '',
        description: '',
        heroImage: '',
        coordinates: { lat: 0, long: 0 }
    });

    const [curator, setCurator] = useState({
        name: authUser?.name || '',
        profileImage: authUser?.profileImage || ''
    });

    // Premium Picker State
    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickerType, setPickerType] = useState<'opening' | 'closing'>('opening');
    const [pickerInitialDate, setPickerInitialDate] = useState(new Date());

    const openPicker = (type: 'opening' | 'closing') => {
        setPickerType(type);
        
        // Parse existing time or use current time
        const existingTime = type === 'opening' ? form.openingTime : form.closingTime;
        if (existingTime) {
            const parsed = dayjs(existingTime, 'hh:mm A');
            if (parsed.isValid()) {
                setPickerInitialDate(parsed.toDate());
            } else {
                setPickerInitialDate(new Date());
            }
        } else {
            setPickerInitialDate(new Date());
        }
        
        setPickerVisible(true);
    };

    const handlePremiumPickerSelect = (selectedDate: Date) => {
        const formattedTime = dayjs(selectedDate).format('hh:mm A');
        if (pickerType === 'opening') {
            setForm(prev => ({ ...prev, openingTime: formattedTime }));
        } else {
            setForm(prev => ({ ...prev, closingTime: formattedTime }));
        }
    };

    useEffect(() => {
        fetchVenueData();
    }, []);

    const fetchVenueData = async () => {
        try {
            // FIRE AND FORGET: Identity is already seeded from Auth, only fetch venue ops
            const venueRes = await hostService.getVenueProfile();

            if (venueRes.success) {
                const data = venueRes.data;
                setForm({
                    name: data.name || '',
                    venueType: data.venueType || 'Nightclub',
                    address: data.address || '',
                    openingTime: data.openingTime || '10:00 PM',
                    closingTime: data.closingTime || '04:00 AM',
                    capacity: data.capacity?.toString() || '0',
                    rules: data.rules || '',
                    description: data.description || '',
                    heroImage: data.heroImage || '',
                    coordinates: data.coordinates || { lat: 0, long: 0 }
                });
            }
        } catch (error) {
            showToast('Failed to load profile details', 'error');
        } finally {
            setLoading(false);
        }
    };

    const getCurrentLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                showToast('Permission to access location was denied', 'error');
                return;
            }

            setLoading(true);
            const location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;

            // Reverse Geocode
            const [addressObj] = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (addressObj) {
                const formattedAddress = [
                    addressObj.name,
                    addressObj.street,
                    addressObj.district,
                    addressObj.city,
                    addressObj.region,
                    addressObj.postalCode
                ].filter(Boolean).join(', ');

                setForm(prev => ({
                    ...prev,
                    address: formattedAddress,
                    coordinates: { lat: latitude, long: longitude }
                }));
                showToast('Location fetched successfully!', 'success');
            }
        } catch (error) {
            showToast('Failed to get current location', 'error');
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async (type: 'venue' | 'curator') => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: type === 'curator' ? [1, 1] : [16, 9],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled && result.assets[0].base64) {
            const imgUri = `data:image/jpeg;base64,${result.assets[0].base64}`;
            if (type === 'venue') {
                setForm({ ...form, heroImage: imgUri });
            } else {
                setCurator({ ...curator, profileImage: imgUri });
            }
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Only update venue profile, not user profile
            // Host profile is managed separately in host backend
            const venueUpdate = await hostService.updateVenueProfile({
                ...form,
                capacity: parseInt(form.capacity) || 0
            });

            if (venueUpdate.success) {
                // Invalidate venue profile cache so create-event gets fresh data
                queryClient.invalidateQueries({ queryKey: ['venueProfile'] });
                
                showToast('Venue Profile Updated!', 'success');
                goBack();
            } else {
                showToast('Failed to update venue profile', 'error');
            }
        } catch (error: any) {
            const errorMsg = error?.response?.data?.message || error.message || 'Failed to save changes';
            showToast(errorMsg, 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <KeyboardAwareScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                showsVerticalScrollIndicator={false}
                enableOnAndroid={true}
                extraScrollHeight={100}
            >
                <TouchableOpacity style={styles.backBtn} onPress={() => goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>

                <View style={styles.header}>
                    <Text style={styles.title}>Business Suite</Text>
                    <Text style={styles.subtitle}>Update Curator identity and Venue operations</Text>
                </View>

                {/* CURATOR IDENTITY SECTION */}
                <View style={styles.curatorIdentitySection}>
                    <Text style={styles.sectionLabel}>CURATOR IDENTITY</Text>
                    <View style={styles.curatorRow}>
                        <TouchableOpacity style={styles.curatorAvatarContainer} onPress={() => pickImage('curator')}>
                            {curator.profileImage ? (
                                <Image source={{ uri: curator.profileImage }} style={styles.curatorAvatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Ionicons name="person" size={24} color="rgba(255,255,255,0.2)" />
                                </View>
                            )}
                            <View style={styles.editAvatarIcon}>
                                <Ionicons name="camera" size={14} color="white" />
                            </View>
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Input
                                label="Curator Name (Display)"
                                value={curator.name}
                                onChangeText={(val) => setCurator({ ...curator, name: val })}
                                placeholder="Club Curator / Your Name"
                                containerStyle={{ marginBottom: 0 }}
                            />
                        </View>
                    </View>
                </View>

                {/* VENUE MEDIA */}
                <View style={styles.mediaSection}>
                    <Text style={styles.sectionLabel}>VENUE MEDIA</Text>
                    <TouchableOpacity style={styles.mediaPlaceholder} onPress={() => pickImage('venue')}>
                        {form.heroImage ? (
                            <Image source={{ uri: form.heroImage }} style={styles.heroImg} />
                        ) : (
                            <Text style={styles.uploadText}>Upload Hero Image</Text>
                        )}
                        {form.heroImage && (
                            <View style={styles.changeOverlay}>
                                <Ionicons name="camera" size={24} color="white" />
                                <Text style={styles.changeText}>Change Image</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.form}>
                    <Input
                        label="Venue Name"
                        value={form.name}
                        onChangeText={(text) => setForm({ ...form, name: text })}
                    />
                    <Input
                        label="Venue Type"
                        value={form.venueType}
                        onChangeText={(text) => setForm({ ...form, venueType: text })}
                    />
                    <View style={styles.addressWrapper}>
                        <Input
                            label="Address"
                            value={form.address}
                            onChangeText={(text) => setForm({ ...form, address: text })}
                            containerStyle={{ flex: 1 }}
                        />
                        <TouchableOpacity style={styles.locationBtn} onPress={getCurrentLocation}>
                            <Ionicons name="location" size={20} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>

                    {/* PREMIUM TIME PICKER SECTION */}
                    <View style={styles.timePickerSection}>
                        <Text style={styles.sectionLabel}>OPERATING HOURS</Text>
                        <View style={styles.timePickerContainer}>
                            {/* OPENING TIME PICKER */}
                            <View style={styles.timePickerCard}>
                                <View style={styles.timeIconWrapper}>
                                    <View style={styles.timeIconGlow} />
                                    <Ionicons name="sunny-outline" size={20} color={COLORS.primary} />
                                </View>
                                <Text style={styles.timeLabel}>Opening</Text>
                                <TouchableOpacity 
                                    style={styles.premiumTimeBox} 
                                    onPress={() => openPicker('opening')}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.premiumTimeText, !form.openingTime && styles.premiumTimePlaceholder]}>
                                        {form.openingTime || '--:-- --'}
                                    </Text>
                                    <View style={styles.timeEditIcon}>
                                        <Ionicons name="create-outline" size={14} color="rgba(255,255,255,0.5)" />
                                    </View>
                                </TouchableOpacity>
                            </View>

                            {/* DIVIDER */}
                            <View style={styles.timeDivider}>
                                <View style={styles.dividerLine} />
                                <View style={styles.dividerDot} />
                                <View style={styles.dividerLine} />
                            </View>

                            {/* CLOSING TIME PICKER */}
                            <View style={styles.timePickerCard}>
                                <View style={styles.timeIconWrapper}>
                                    <View style={styles.timeIconGlow} />
                                    <Ionicons name="moon-outline" size={20} color="#A78BFA" />
                                </View>
                                <Text style={styles.timeLabel}>Closing</Text>
                                <TouchableOpacity 
                                    style={styles.premiumTimeBox} 
                                    onPress={() => openPicker('closing')}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.premiumTimeText, !form.closingTime && styles.premiumTimePlaceholder]}>
                                        {form.closingTime || '--:-- --'}
                                    </Text>
                                    <View style={styles.timeEditIcon}>
                                        <Ionicons name="create-outline" size={14} color="rgba(255,255,255,0.5)" />
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <Input
                        label="Capacity"
                        value={form.capacity}
                        onChangeText={(text) => setForm({ ...form, capacity: text })}
                        keyboardType="numeric"
                    />
                    <Input
                        label="Rules / Dress Code"
                        value={form.rules}
                        onChangeText={(text) => setForm({ ...form, rules: text })}
                    />
                    <Input
                        label="Description"
                        value={form.description}
                        onChangeText={(text) => setForm({ ...form, description: text })}
                        multiline
                    />

                    <View style={{ marginTop: 12 }}>
                        <Text style={styles.sectionLabel}>OFFERINGS</Text>
                        <TouchableOpacity
                            style={styles.manageMenuBtn}
                            onPress={() => router.push('/(host)/venue-menu')}
                        >
                            <View style={styles.menuIconContainer}>
                                <Ionicons name="wine-outline" size={24} color={COLORS.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.menuBtnTitle}>Manage Drinks & Food</Text>
                                <Text style={styles.menuBtnSubtitle}>Add cocktails, mocktails and dishes</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAwareScrollView>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <Button
                    title={saving ? "Saving..." : "Save Changes"}
                    onPress={handleSave}
                    loading={saving}
                />
            </View>

            <PremiumDateTimePicker
                visible={pickerVisible}
                onClose={() => setPickerVisible(false)}
                onSelect={handlePremiumPickerSelect}
                mode="time"
                initialDate={pickerInitialDate}
                title={pickerType === 'opening' ? 'Opening Time' : 'Closing Time'}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background.dark,
    },
    scrollContent: {
        padding: SPACING.lg,
        paddingBottom: 180,
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
        marginBottom: 40,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '800',
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 14,
        marginTop: 4,
    },
    mediaSection: {
        marginBottom: 32,
    },
    curatorIdentitySection: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        padding: 20,
        borderRadius: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    curatorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        marginTop: 4,
    },
    curatorAvatarContainer: {
        position: 'relative',
        width: 72,
        height: 72,
    },
    curatorAvatar: {
        width: 72,
        height: 72,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    avatarPlaceholder: {
        width: 72,
        height: 72,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editAvatarIcon: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#000000',
    },
    sectionLabel: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 2,
        marginBottom: 12,
    },
    mediaPlaceholder: {
        width: '100%',
        height: 200,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 20,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    heroImg: {
        width: '100%',
        height: '100%',
    },
    changeOverlay: {
        position: 'absolute',
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0, // Hidden by default, could use hover effect or always visible for mobile
    },
    // Adding active state styles or just making it visible
    heroImgContainer: {
        position: 'relative',
    },
    changeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '700',
        marginTop: 4,
    },
    uploadText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '700',
    },
    form: {
        gap: 8,
    },
    row: {
        flexDirection: 'row',
        gap: 16,
    },
    flex1: {
        flex: 1,
    },
    manageMenuBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        gap: 16,
    },
    menuIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuBtnTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    menuBtnSubtitle: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 12,
        marginTop: 2,
    },
    footer: {
        padding: SPACING.lg,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    // PREMIUM TIME PICKER STYLES
    timePickerSection: {
        marginBottom: 24,
    },
    timePickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        padding: 24,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.1)',
    },
    timePickerCard: {
        flex: 1,
        alignItems: 'center',
        gap: 16,
    },
    timeIconWrapper: {
        position: 'relative',
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(99, 102, 241, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.15)',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    timeIconGlow: {
        position: 'absolute',
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#6366F1',
        opacity: 0.08,
    },
    timeLabel: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    premiumTimeBox: {
        position: 'relative',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        paddingHorizontal: 24,
        paddingVertical: 18,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.2)',
        minWidth: 150,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    premiumTimeText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: 1,
    },
    premiumTimePlaceholder: {
        color: 'rgba(255, 255, 255, 0.3)',
        fontWeight: '700',
    },
    timeEditIcon: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.2)',
    },
    timeDivider: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 8,
    },
    dividerLine: {
        width: 2,
        height: 20,
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        borderRadius: 1,
    },
    dividerDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#6366F1',
        opacity: 0.5,
    },
    addressWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
        marginBottom: 8,
    },
    locationBtn: {
        height: 56, // Matches standard Input height
        width: 56,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8, // Half of typical gap
    },
});
