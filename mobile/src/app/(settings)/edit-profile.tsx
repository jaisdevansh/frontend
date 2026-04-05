import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    TextInput, 
    ScrollView, 
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Image,
    Keyboard,
    TouchableWithoutFeedback,
    Modal
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStrictBack } from '../../hooks/useStrictBack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { useToast } from '../../context/ToastContext';
import { useAlert } from '../../context/AlertProvider';
import { userService } from '../../services/userService';
import { uploadImage } from '../../services/cloudinaryService';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import * as Haptics from 'expo-haptics';

const PremiumInput = ({ label, value, onChangeText, placeholder, keyboardType = 'default', editable = true, multiline = false, icon, rightIcon, onRightIconPress, ...rest }: any) => {
    return (
        <View style={styles.inputGroup}>
            <Text style={styles.label}>{label}</Text>
            <View style={[
                styles.inputWrapper, 
                !editable && styles.inputWrapperDisabled,
                multiline && { height: 100, alignItems: 'flex-start', paddingTop: 12 }
            ]}>
                {icon && <Ionicons name={icon} size={20} color="rgba(255,255,255,0.4)" style={{ marginRight: 12 }} />}
                <TextInput
                    style={[styles.input, !editable && styles.inputDisabledText]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType={keyboardType}
                    editable={editable}
                    multiline={multiline}
                    {...rest}
                />
                {rightIcon && (
                    <TouchableOpacity onPress={onRightIconPress} style={styles.rightIconBtn}>
                        <Ionicons name={rightIcon} size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

export default function EditProfile() {
    const router = useRouter();
    const goBack = useStrictBack('/');
    const { showToast } = useToast();
    const { showAlert } = useAlert();
    const { role, user: authUser, updateUser } = useAuth();
    const queryClient = useQueryClient();
    
    const isStaff = ['staff', 'waiter', 'security'].includes(role?.toLowerCase() || '');

    // ⚡ HYPER-FAST SEEDING: Pre-fill from AuthContext immediately (sub-1ms)
    const [name, setName] = useState(authUser?.name || '');
    const [firstName, setFirstName] = useState(authUser?.firstName || (authUser?.name?.split(' ')[0] ?? ''));
    const [lastName, setLastName] = useState(authUser?.lastName || (authUser?.name?.split(' ').slice(1).join(' ') ?? ''));
    const [gender, setGender] = useState('Male');
    const [dob, setDob] = useState('');
    const [location, setLocation] = useState('');
    const [username, setUsername] = useState(authUser?.username || '');
    const [email, setEmail] = useState(authUser?.email || '');
    const [phone, setPhone] = useState(authUser?.phone || '');
    const [profileImage, setProfileImage] = useState(authUser?.profileImage || '');

    // No full-screen loading spinner — form is already seeded
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [locating, setLocating] = useState(false);
    
    // Username Systems
    const [initialUsername, setInitialUsername] = useState(authUser?.username || '');
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);

    // Calendar Picker State
    const [showDatePicker, setShowDatePicker] = useState(false);

    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        
        if (selectedDate) {
            setDob(selectedDate.toISOString().split('T')[0]);
        }
    };

    useEffect(() => {
        // BACKGROUND SYNC: Quietly fetch full profile to fill missing fields (dob, location, etc.)
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const res = await userService.getProfile();
            if (res.success && res.data) {
                const d = res.data;
                // Only update fields not already seeded from authUser
                if (d.name) setName(d.name);
                if (d.firstName) setFirstName(d.firstName);
                if (d.lastName) setLastName(d.lastName);
                if (d.gender) setGender(d.gender);
                if (d.dob) setDob(new Date(d.dob).toISOString().split('T')[0]);
                if (d.location) setLocation(d.location);
                if (d.username) { setUsername(d.username); setInitialUsername(d.username); }
                if (d.email) setEmail(d.email);
                if (d.phone) setPhone(d.phone);
                if (d.profileImage) setProfileImage(d.profileImage);
            }
        } catch (error: any) {
            // Silent fail — form is already usable from authUser seed
            console.warn('[EditProfile] Background sync failed:', error?.message);
        }
    };

    useEffect(() => {
        if (!username || username === initialUsername) {
            setUsernameStatus('idle');
            return;
        }

        const formattedUsername = username.toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9_.]/g, '');
        if (username !== formattedUsername) {
            setUsername(formattedUsername);
            return;
        }

        if (username.length < 3) {
            setUsernameStatus('idle');
            return;
        }

        setUsernameStatus('checking');
        const timeoutId = setTimeout(async () => {
            try {
                const res = await userService.checkUsername(username);
                if (res.available) {
                    setUsernameStatus('available');
                    setUsernameSuggestions([]);
                } else {
                    setUsernameStatus('taken');
                    setUsernameSuggestions(res.suggestions || []);
                }
            } catch (err) {
                setUsernameStatus('idle');
            }
        }, 600);
        return () => clearTimeout(timeoutId);
    }, [username, initialUsername]);

    const handlePickImage = async () => {
        showAlert(
            'Gallery Access',
            'Entry Club needs access to your gallery to update your profile image. This ensures your tactical ID is always up to date.',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Open Gallery', 
                    style: 'default',
                    onPress: async () => {
                        const result = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ['images'],
                            allowsEditing: true,
                            aspect: [1, 1],
                            quality: 0.5,
                            base64: true,
                        });

                        if (!result.canceled && result.assets && result.assets.length > 0) {
                            const asset = result.assets[0];
                            if (asset.base64) {
                                const mimeType = asset.mimeType || 'image/jpeg';
                                setProfileImage(`data:${mimeType};base64,${asset.base64}`);
                            } else {
                                setProfileImage(asset.uri);
                            }
                        }
                    }
                }
            ]
        );
    };

    const handleGetLocation = async () => {
        setLocating(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                showToast('Location permission denied', 'error');
                return;
            }

            const currentLoc = await Location.getCurrentPositionAsync({});
            const reverseGeocode = await Location.reverseGeocodeAsync({
                latitude: currentLoc.coords.latitude,
                longitude: currentLoc.coords.longitude,
            });

            if (reverseGeocode.length > 0) {
                const place = reverseGeocode[0];
                const formattedLocation = `${place.city || place.subregion || ''}, ${place.country || ''}`;
                setLocation(formattedLocation.startsWith(', ') ? formattedLocation.slice(2) : formattedLocation);
                showToast('Location updated', 'success');
            }
        } catch (error) {
            showToast('Failed to fetch location', 'error');
        } finally {
            setLocating(false);
        }
    };

    const handleSave = async () => {
        if (usernameStatus === 'taken' || usernameStatus === 'checking') {
            showToast('Please select a valid username', 'error');
            return;
        }
        if (username.length > 0 && (username.length < 3 || username.length > 20)) {
            showToast('Username must be 3-20 characters', 'error');
            return;
        }

        setSaving(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            // ─── STAGE 1: Direct Cloudinary Upload (bypasses backend pipeline) ───
            // Only upload if it's a local URI (base64 or file://), not an existing https URL
            let finalImageUrl = profileImage;
            const isLocalImage = profileImage && !profileImage.startsWith('http');
            
            if (isLocalImage) {
                try {
                    finalImageUrl = await uploadImage(profileImage);
                } catch (imgErr) {
                    showToast('Image upload failed, saving other changes...', 'info');
                    finalImageUrl = profileImage.startsWith('data:') ? '' : profileImage;
                }
            }

            const payload: any = {
                username: username.replace(/\s/g, ''),
                ...(finalImageUrl && { profileImage: finalImageUrl }),
            };

            if (isStaff) {
                const trimmed = name.trim();
                if (trimmed) payload.name = trimmed;
            } else {
                const fTrim = firstName.trim();
                const lTrim = lastName.trim();
                if (fTrim) payload.firstName = fTrim;
                if (lTrim) payload.lastName = lTrim;
                // Only build full name if at least first name is present
                if (fTrim) payload.name = `${fTrim}${lTrim ? ' ' + lTrim : ''}`;
                if (dob) payload.dob = dob;
                if (location) payload.location = location.trim();
                payload.gender = gender;
            }

            // ─── STAGE 2: Optimistic UI Update — user sees result instantly ───
            if (updateUser) {
                updateUser({
                    name: payload.name,
                    ...(finalImageUrl && { profileImage: finalImageUrl }),
                    username: payload.username,
                });
            }

            // ─── STAGE 3: Backend persist (now lightning-fast — no Cloudinary) ───
            const res = await userService.updateProfile(payload);
            if (res.success) {
                userService.clearCache();
                queryClient.invalidateQueries({ queryKey: ['user_profile'] });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showToast('Profile updated! ✅', 'success');
                setTimeout(() => goBack(), 300);
            }
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to update profile', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleVerifyEdit = (type: 'phone' | 'email') => {
        showToast(`OTP verification required to change ${type}`, 'info');
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving}>
                    {saving ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={styles.saveHeaderBtn}>Done</Text>}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    
                    {isStaff ? (
                        <View style={styles.staffHeader}>
                            <View style={styles.staffIconCircle}>
                                <Ionicons 
                                    name={role?.toLowerCase() === 'security' ? 'shield-checkmark' : 'cafe'} 
                                    size={40} 
                                    color={COLORS.primary} 
                                />
                            </View>
                            <View style={styles.roleBadge}>
                                <Text style={styles.roleBadgeText}>{role?.toUpperCase() || 'STAFF'}</Text>
                            </View>
                            <Text style={styles.staffIdText}>EMPLOYEE ID: #{authUser?._id?.slice(-6).toUpperCase()}</Text>
                        </View>
                    ) : (
                        <View style={styles.avatarSection}>
                            <TouchableOpacity onPress={handlePickImage} activeOpacity={0.9}>
                                <View style={styles.avatarWrapper}>
                                    {profileImage ? (
                                        <Image source={{ uri: profileImage }} style={styles.avatar} />
                                    ) : (
                                        <View style={styles.avatarPlaceholder}>
                                            <Ionicons name="person" size={40} color="rgba(255,255,255,0.2)" />
                                        </View>
                                    )}
                                    <View style={styles.cameraIcon}>
                                        <Ionicons name="camera" size={16} color="white" />
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={styles.section}>
                        {isStaff ? (
                             <PremiumInput label="FULL NAME" value={name} onChangeText={setName} placeholder="Full Name" />
                        ) : (
                            <View style={styles.row}>
                                <View style={{ flex: 1, marginRight: 12 }}>
                                    <PremiumInput label="FIRST NAME" value={firstName} onChangeText={setFirstName} placeholder="First Name" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <PremiumInput label="LAST NAME" value={lastName} onChangeText={setLastName} placeholder="Last Name" />
                                </View>
                            </View>
                        )}

                        {!isStaff && (
                            <View>
                                <Text style={styles.label}>GENDER</Text>
                                <View style={styles.genderRow}>
                                    {['Male', 'Female', 'Other'].map((item) => (
                                        <TouchableOpacity
                                            key={item}
                                            style={[styles.genderBox, gender === item && styles.genderBoxActive]}
                                            onPress={() => setGender(item)}
                                        >
                                            <Text style={[styles.genderText, gender === item && styles.genderTextActive]}>{item}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        <View>
                            <PremiumInput 
                                label="NICK NAME / USERNAME" 
                                value={username} 
                                onChangeText={setUsername} 
                                placeholder="@username" 
                                icon="at-outline" 
                                autoCapitalize="none"
                                autoCorrect={false}
                                autoComplete="off"
                            />
                            {usernameStatus === 'checking' && <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginLeft: 4, marginTop: 6 }}>Checking availability...</Text>}
                            {usernameStatus === 'available' && <Text style={{ color: '#10b981', fontSize: 12, marginLeft: 4, marginTop: 6 }}>✅ Available</Text>}
                            {usernameStatus === 'taken' && (
                                <View style={{ marginTop: 8 }}>
                                    <Text style={{ color: '#ef4444', fontSize: 12, marginLeft: 4, marginBottom: 8, fontWeight: '600' }}>❌ Taken. Try these:</Text>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                        {usernameSuggestions.map(s => (
                                            <TouchableOpacity key={s} onPress={() => setUsername(s)} style={styles.suggestionChip}>
                                                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{s}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>

                    {isStaff && (
                        <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
                             <Text style={styles.sectionTitle}>WORK PROFILE</Text>
                             <View style={styles.infoCard}>
                                <View style={styles.infoCardItem}>
                                    <Text style={styles.infoCardLabel}>Status</Text>
                                    <View style={styles.statusRow}>
                                        <View style={styles.onlinePing} />
                                        <Text style={styles.onlineText}>Active Duty</Text>
                                    </View>
                                </View>
                             </View>
                        </View>
                    )}

                    <View style={styles.divider} />

                    <View style={styles.section}>
                        {!isStaff && (
                            <>
                                <TouchableOpacity onPress={(() => setShowDatePicker(true))} activeOpacity={0.8}>
                                    <View pointerEvents="none">
                                        <PremiumInput label="DATE OF BIRTH" value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" icon="calendar-outline" />
                                    </View>
                                </TouchableOpacity>

                                {/* iOS Date Picker Modal */}
                                {Platform.OS === 'ios' && showDatePicker && (
                                    <Modal transparent animationType="slide">
                                        <View style={styles.datePickerOverlay}>
                                            <View style={styles.datePickerContainer}>
                                                <View style={styles.datePickerHeader}>
                                                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                                        <Text style={styles.datePickerDone}>Done</Text>
                                                    </TouchableOpacity>
                                                </View>
                                                <DateTimePicker
                                                    value={dob ? new Date(dob) : new Date(2000, 0, 1)}
                                                    mode="date"
                                                    display="spinner"
                                                    textColor="white"
                                                    maximumDate={new Date()}
                                                    onChange={handleDateChange}
                                                />
                                            </View>
                                        </View>
                                    </Modal>
                                )}
                                
                                {/* Android Date Picker */}
                                {Platform.OS === 'android' && showDatePicker && (
                                    <DateTimePicker
                                        value={dob ? new Date(dob) : new Date(2000, 0, 1)}
                                        mode="date"
                                        display="default"
                                        maximumDate={new Date()}
                                        onChange={handleDateChange}
                                    />
                                )}

                                <PremiumInput 
                                    label="LOCATION" 
                                    value={location} 
                                    onChangeText={setLocation} 
                                    placeholder="City, Country" 
                                    icon="location-outline" 
                                    rightIcon={locating ? undefined : "locate-outline"}
                                    onRightIconPress={handleGetLocation}
                                />
                                {locating && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: -40, alignSelf: 'flex-end', marginRight: 20 }} />}
                            </>
                        )}
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>CONTACT INFO (PROTECTED)</Text>
                        <TouchableOpacity style={styles.lockedInput} onPress={() => handleVerifyEdit('email')}>
                            <View style={styles.lockedInfo}>
                                <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.4)" />
                                <Text style={styles.lockedText}>{email || 'Not verified'}</Text>
                            </View>
                            <Text style={styles.verifyBtn}>Verify</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.lockedInput} onPress={() => handleVerifyEdit('phone')}>
                            <View style={styles.lockedInfo}>
                                <Ionicons name="call-outline" size={20} color="rgba(255,255,255,0.4)" />
                                <Text style={styles.lockedText}>{phone || 'Not verified'}</Text>
                            </View>
                            <Text style={styles.verifyBtn}>Verify</Text>
                        </TouchableOpacity>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#030303' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    backButton: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { color: 'white', fontSize: 17, fontWeight: '700' },
    saveHeaderBtn: { color: COLORS.primary, fontSize: 16, fontWeight: '700' },
    content: { paddingBottom: 40 },
    avatarSection: { alignItems: 'center', paddingVertical: 32 },
    avatarWrapper: { width: 100, height: 100, borderRadius: 50, position: 'relative' },
    avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: COLORS.primary },
    avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.primary, width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#030303' },
    section: { paddingHorizontal: 20, gap: 20 },
    row: { flexDirection: 'row' },
    inputGroup: { gap: 4, position: 'relative' },
    label: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginLeft: 4 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: BORDER_RADIUS.default, paddingHorizontal: 16, height: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    inputWrapperDisabled: { opacity: 0.6 },
    input: { flex: 1, color: 'white', fontSize: 15, fontWeight: '500', height: '100%' },
    inputDisabledText: { color: 'rgba(255,255,255,0.5)' },
    rightIconBtn: { padding: 8, marginRight: -8 },
    genderRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: BORDER_RADIUS.default, padding: 4 },
    genderBox: { flex: 1, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: BORDER_RADIUS.sm },
    genderBoxActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
    genderText: { color: 'rgba(255,255,255,0.4)', fontWeight: '700', fontSize: 13 },
    genderTextActive: { color: 'white' },
    suggestionChip: { backgroundColor: `${COLORS.primary}20`, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: COLORS.primary },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 32 },
    sectionTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 8 },
    lockedInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: BORDER_RADIUS.default, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    lockedInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    lockedText: { color: 'rgba(255,255,255,0.5)', fontSize: 15 },
    verifyBtn: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
    datePickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    datePickerContainer: { backgroundColor: '#1A1D24', paddingBottom: 30, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    datePickerHeader: { flexDirection: 'row', justifyContent: 'flex-end', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    datePickerDone: { color: COLORS.primary, fontSize: 16, fontWeight: '800' },
    
    // Staff UI Styles
    staffHeader: { alignItems: 'center', paddingVertical: 40, gap: 15 },
    staffIconCircle: { width: 90, height: 90, borderRadius: 30, backgroundColor: 'rgba(124, 77, 255, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(124, 77, 255, 0.2)' },
    roleBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12 },
    roleBadgeText: { color: 'white', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
    staffIdText: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
    
    infoCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    infoCardItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    infoCardLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '600' },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    onlinePing: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
    onlineText: { color: '#10b981', fontSize: 13, fontWeight: '700' }
});
