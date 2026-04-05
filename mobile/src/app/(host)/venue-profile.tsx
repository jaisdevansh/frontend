import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStrictBack } from '../../hooks/useStrictBack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING } from '../../constants/design-system';
import { useToast } from '../../context/ToastContext';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { hostService } from '../../services/hostService';
import { userService } from '../../services/userService';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { Platform } from 'react-native';

export default function HostVenueProfile() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const goBack = useStrictBack('/(host)/dashboard');
    const { showToast } = useToast();
    const { user: authUser } = useAuth();

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

    const [showOpeningPicker, setShowOpeningPicker] = useState(false);
    const [showClosingPicker, setShowClosingPicker] = useState(false);

    // Initial dates for pickers (dummy dates used for time only)
    const [pickerOpening, setPickerOpening] = useState(new Date());
    const [pickerClosing, setPickerClosing] = useState(new Date());

    const openPicker = (type: 'opening' | 'closing') => {
        const currentDate = type === 'opening' ? pickerOpening : pickerClosing;
        
        if (Platform.OS === 'android') {
            DateTimePickerAndroid.open({
                value: currentDate,
                mode: 'time',
                is24Hour: false,
                onChange: (_, selected) => {
                    if (selected) {
                        if (type === 'opening') {
                            setPickerOpening(selected);
                            setForm(prev => ({ ...prev, openingTime: dayjs(selected).format('hh:mm A') }));
                        } else {
                            setPickerClosing(selected);
                            setForm(prev => ({ ...prev, closingTime: dayjs(selected).format('hh:mm A') }));
                        }
                    }
                }
            });
        } else {
            if (type === 'opening') setShowOpeningPicker(true);
            if (type === 'closing') setShowClosingPicker(true);
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
            console.error('Location Error:', error);
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
            const [venueUpdate, curatorUpdate] = await Promise.all([
                hostService.updateVenueProfile({
                    ...form,
                    capacity: parseInt(form.capacity) || 0
                }),
                userService.updateProfile({
                    name: curator.name,
                    profileImage: curator.profileImage
                })
            ]);

            if (venueUpdate.success && curatorUpdate.success) {
                showToast('Business Profile Updated!', 'success');
                goBack();
            } else {
                showToast('Partially updated, please check results', 'info');
            }
        } catch (error: any) {
            console.error('Save Venue Error:', error);
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
            <ScrollView contentContainerStyle={styles.scrollContent}>
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

                    <View style={styles.row}>
                        {/* OPENING TIME PICKER */}
                        <View style={styles.flex1}>
                            <Text style={styles.pickerLabel}>OPENING TIME</Text>
                            <TouchableOpacity style={styles.pickerBox} onPress={() => openPicker('opening')}>
                                <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                                <Text style={[styles.pickerText, !form.openingTime && styles.pickerPlaceholder]}>
                                    {form.openingTime || 'Pick time'}
                                </Text>
                            </TouchableOpacity>
                            {Platform.OS === 'ios' && showOpeningPicker && (
                                <DateTimePicker
                                    value={pickerOpening}
                                    mode="time"
                                    is24Hour={false}
                                    display="spinner"
                                    onChange={(_, selected) => {
                                        setShowOpeningPicker(false);
                                        if (selected) {
                                            setPickerOpening(selected);
                                            setForm({ ...form, openingTime: dayjs(selected).format('hh:mm A') });
                                        }
                                    }}
                                />
                            )}
                        </View>

                        {/* CLOSING TIME PICKER */}
                        <View style={styles.flex1}>
                            <Text style={styles.pickerLabel}>CLOSING TIME</Text>
                            <TouchableOpacity style={styles.pickerBox} onPress={() => openPicker('closing')}>
                                <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                                <Text style={[styles.pickerText, !form.closingTime && styles.pickerPlaceholder]}>
                                    {form.closingTime || 'Pick time'}
                                </Text>
                            </TouchableOpacity>
                            {Platform.OS === 'ios' && showClosingPicker && (
                                <DateTimePicker
                                    value={pickerClosing}
                                    mode="time"
                                    is24Hour={false}
                                    display="spinner"
                                    onChange={(_, selected) => {
                                        setShowClosingPicker(false);
                                        if (selected) {
                                            setPickerClosing(selected);
                                            setForm({ ...form, closingTime: dayjs(selected).format('hh:mm A') });
                                        }
                                    }}
                                />
                            )}
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
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <Button
                    title={saving ? "Saving..." : "Save Changes"}
                    onPress={handleSave}
                    loading={saving}
                />
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
        padding: SPACING.lg,
        paddingBottom: 120,
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
    pickerLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 2,
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
