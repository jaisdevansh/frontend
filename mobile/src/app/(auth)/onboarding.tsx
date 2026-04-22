import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { authService } from '../../services/authService';
import { useToast } from '../../context/ToastContext';
import { useAlert } from '../../context/AlertProvider';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../services/apiClient';
import { useQueryClient } from '@tanstack/react-query';
import { userService } from '../../services/userService';
import { uploadImage } from '../../services/cloudinaryService';

const AVATARS = [
    { id: 'male', uri: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' },
    { id: 'female', uri: 'https://cdn-icons-png.flaticon.com/512/3135/3135789.png' },
    { id: 'mysterious', uri: 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png' },
];

export default function OnboardingScreen() {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [username, setUsername] = useState('');
    const [gender, setGender] = useState('Male');
    const [profileImage, setProfileImage] = useState<string | null>(AVATARS[0].uri);
    const [loading, setLoading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done'>('idle');
    // ── imageKey: bump this every time the user picks/captures a new photo.
    // It is used as the <key> prop on the preview image so React unmounts &
    // remounts the component, bypassing any in-memory cache from the previous URI.
    const [imageKey, setImageKey] = useState(0);

    const insets = useSafeAreaInsets();
    const { setOnboardingStatus, updateUser, logout } = useAuth();
    const router = useRouter();
    const { showToast } = useToast();
    const { showAlert } = useAlert();
    const queryClient = useQueryClient();

    // Username recommendation system
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);

    useEffect(() => {
        if (!username || username.length < 3) {
            setUsernameStatus('idle');
            setUsernameSuggestions([]);
            return;
        }
        setUsernameStatus('checking');
        const t = setTimeout(async () => {
            try {
                const res = await userService.checkUsername(username);
                if (res.available) {
                    setUsernameStatus('available');
                    setUsernameSuggestions([]);
                } else {
                    setUsernameStatus('taken');
                    setUsernameSuggestions(res.suggestions || []);
                }
            } catch { setUsernameStatus('idle'); }
        }, 600);
        return () => clearTimeout(t);
    }, [username]);

    // ── Normalise URI ────────────────────────────────────────────────────────────
    // Android camera sometimes returns a content:// URI without a file extension.
    // expo-image needs at least a hint for the MIME type; appending ?type=jpg is
    // the lightest hint that doesn't break content:// resolution.
    const normaliseUri = (uri: string): string => {
        if (Platform.OS !== 'android') return uri;
        if (uri.startsWith('content://') && !uri.includes('?')) {
            return `${uri}?type=jpg`;
        }
        return uri;
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            showToast('Permission to access camera roll is required!', 'error');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled && result.assets[0]?.uri) {
            const uri = normaliseUri(result.assets[0].uri);
            setProfileImage(uri);
            setImageKey(k => k + 1); // force preview remount
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            showToast('Permission to access camera is required!', 'error');
            return;
        }

        // ── WHY allowsEditing is disabled on Android ─────────────────────────
        // On Android, allowsEditing:true routes the capture through the system
        // crop Activity which writes the result to a temp content:// path that
        // React-Native's Image component cannot always read back (permission
        // denied or stale cache).  We skip the in-app crop so the raw camera
        // URI is returned directly — this is always readable and renderable.
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: Platform.OS === 'ios', // crop only on iOS where it is safe
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled && result.assets[0]?.uri) {
            const uri = normaliseUri(result.assets[0].uri);
            setProfileImage(uri);
            setImageKey(k => k + 1); // force preview remount
        }
    };

    const handleCompleteOnboarding = async () => {
        if (!firstName.trim() || !lastName.trim() || !username || !gender) {
            showToast('Please fill in all required fields including Username', 'error');
            return;
        }
        if (usernameStatus === 'checking') {
            showToast('Please wait while we check username availability.', 'error');
            return;
        }
        if (usernameStatus === 'taken') {
            showToast('That username is already taken. Please choose another.', 'error');
            return;
        }

        setLoading(true);
        try {
            const fullName = `${firstName.trim()} ${lastName.trim()}`;

            // ─── STEP 1: Upload profile image to Cloudinary ─────────────────────
            // A local file:// URI only exists on the device during this session.
            // We MUST upload it to Cloudinary before saving to the backend so the
            // profile picture renders everywhere (profile screen, home, etc.).
            let finalProfileImageUrl: string | undefined = profileImage || undefined;

            const isLocalUri =
                finalProfileImageUrl &&
                !finalProfileImageUrl.startsWith('http');

            if (isLocalUri) {
                setUploadStatus('uploading');
                try {
                    const cloudinaryUrl = await uploadImage(finalProfileImageUrl!);
                    // uploadImage returns the original URI on failure — detect that
                    if (cloudinaryUrl && cloudinaryUrl.startsWith('http')) {
                        finalProfileImageUrl = cloudinaryUrl;
                    } else {
                        // Upload failed silently — warn but don't block onboarding
                        console.warn('[Onboarding] Cloudinary upload failed; falling back to avatar URL.');
                        // Use the first avatar as a safe fallback so DB doesn't store a dead local path
                        finalProfileImageUrl = AVATARS[0].uri;
                    }
                } catch (uploadErr) {
                    console.error('[Onboarding] Image upload error:', uploadErr);
                    finalProfileImageUrl = AVATARS[0].uri;
                } finally {
                    setUploadStatus('done');
                }
            }

            // ─── STEP 2: Persist to backend with the final HTTPS URL ─────────────
            const res = await authService.completeOnboarding({
                name: fullName,
                username: username.trim(),
                gender,
                profileImage: finalProfileImageUrl,
            } as any);

            if (res.success) {
                // ─── STEP 3: Sync AuthContext cache with the same HTTPS URL ─────
                // This ensures the profile tab shows the correct image immediately
                // without waiting for an API refetch.
                await updateUser({
                    name: fullName,
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    username: username.trim(),
                    gender,
                    profileImage: finalProfileImageUrl,
                });

                // ─── STEP 4: Bust TanStack Query cache ──────────────────────────
                userService.clearCache();
                queryClient.invalidateQueries({ queryKey: ['user_profile'] });
                queryClient.invalidateQueries({ queryKey: ['user-profile'] });

                // ─── STEP 5: Apply pending referral code ────────────────────────
                try {
                    const pendingCode = await AsyncStorage.getItem('pending_referral_code');
                    if (pendingCode) {
                        console.log('[Onboarding] 🎁 Applying pending referral code:', pendingCode);
                        const referralRes = await apiClient.post('/user/referral/apply', { code: pendingCode });
                        if (referralRes.data.success) {
                            showToast('Referral applied! 50 bonus points added.', 'success');
                            await AsyncStorage.removeItem('pending_referral_code');
                        }
                    }
                } catch (err) {
                    console.error('[Referral] Application failed during onboarding:', err);
                }

                showToast('Welcome to Entry Club!', 'success');
                await setOnboardingStatus(true);
            }
        } catch (error: any) {
            console.error('[Onboarding] handleCompleteOnboarding error:', error);
            showToast('Failed to save profile. Please try again.', 'error');
        } finally {
            setLoading(false);
            setUploadStatus('idle');
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#030303', '#0D0D0D', '#030303']}
                style={styles.background}
            />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView 
                    contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 40 }]}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backButton} onPress={async () => {
                            await logout();
                            router.replace('/(auth)/login');
                        }}>
                            <Ionicons name="chevron-back" size={28} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.title}>Complete Profile</Text>
                        <View style={styles.rightSpacer} />
                    </View>

                    <View style={styles.previewContainer}>
                        <View style={styles.previewImageWrapper}>
                            {profileImage ? (
                                // ── Use expo-image for the preview ──────────────────────────────
                                // expo-image correctly handles:
                                //   • file:// URIs (gallery picks)
                                //   • content:// URIs (Android camera captures)
                                // cachePolicy='none' ensures the latest capture is always shown
                                // even if the URI path looks the same as a previous capture.
                                // The `key` prop forces a full unmount+remount whenever imageKey
                                // changes, completely bypassing any internal component cache.
                                <ExpoImage
                                    key={`preview-${imageKey}`}
                                    source={{ uri: profileImage }}
                                    style={styles.previewImage}
                                    contentFit="cover"
                                    cachePolicy="none"
                                    transition={200}
                                />
                            ) : (
                                <Ionicons name="person" size={40} color="rgba(255, 255, 255, 0.5)" />
                            )}
                        </View>
                    </View>

                    <View style={styles.form}>
                        <View>
                            <Input
                                label=""
                                placeholder="Username (e.g. john_doe)"
                                value={username}
                                onChangeText={(text) => setUsername(text.toLowerCase().replace(/\s/g, ''))}
                                containerStyle={styles.inputGap}
                                autoCapitalize="none"
                            />
                            {usernameStatus === 'checking' && <Text style={styles.usernameChecking}>Checking availability...</Text>}
                            {usernameStatus === 'available' && <Text style={styles.usernameAvailable}>✓ Username available</Text>}
                            {usernameStatus === 'taken' && (
                                <View style={{ marginBottom: 8 }}>
                                    <Text style={styles.usernameTaken}>✕ Already taken. Try one of these:</Text>
                                    <View style={styles.chipRow}>
                                        {usernameSuggestions.map(s => (
                                            <TouchableOpacity key={s} onPress={() => setUsername(s)} style={styles.chip}>
                                                <Text style={styles.chipText}>{s}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}
                        </View>
                        <Input
                            label=""
                            placeholder="First Name"
                            value={firstName}
                            onChangeText={setFirstName}
                            containerStyle={styles.inputGap}
                        />
                        <Input
                            label=""
                            placeholder="Last Name"
                            value={lastName}
                            onChangeText={setLastName}
                            containerStyle={styles.inputGap}
                        />

                        <View style={styles.dividerContainer}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>Select Gender</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <View style={styles.genderRow}>
                            {['Male', 'Female', 'Other'].map((item) => (
                                <TouchableOpacity
                                    key={item}
                                    style={[
                                        styles.genderBox,
                                        gender === item && styles.genderBoxActive
                                    ]}
                                    onPress={() => setGender(item)}
                                >
                                    <Text style={[
                                        styles.genderText,
                                        gender === item && styles.genderTextActive
                                    ]}>{item}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.dividerContainer}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>Choose Avatar</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <View style={styles.avatarGrid}>
                            {AVATARS.map((avatar) => (
                                <TouchableOpacity 
                                    key={avatar.id} 
                                    onPress={() => setProfileImage(avatar.uri)}
                                    style={[
                                        styles.avatarItem,
                                        profileImage === avatar.uri && styles.avatarItemActive
                                    ]}
                                >
                                    <Image source={{ uri: avatar.uri }} style={styles.avatarSmall} />
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.dividerContainer}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>or</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <View style={styles.imageActionRow}>
                            <TouchableOpacity onPress={takePhoto} style={styles.cameraBtn}>
                                <Ionicons name="camera-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                                <Text style={styles.galleryBtnText}>Capture Photo</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={pickImage} style={styles.galleryBtnHalf}>
                                <Ionicons name="image-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                                <Text style={styles.galleryBtnText}>Gallery</Text>
                            </TouchableOpacity>
                        </View>

                        {uploadStatus === 'uploading' && (
                            <View style={styles.uploadBanner}>
                                <Ionicons name="cloud-upload-outline" size={16} color="#818CF8" style={{ marginRight: 8 }} />
                                <Text style={styles.uploadBannerText}>Uploading profile picture…</Text>
                            </View>
                        )}

                        <Button
                            title={uploadStatus === 'uploading' ? 'Uploading...' : 'Continue'}
                            onPress={handleCompleteOnboarding}
                            style={styles.continueBtn}
                            loading={loading}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#030303' },
    background: { ...StyleSheet.absoluteFillObject },
    keyboardView: { flex: 1 },
    scrollContent: { paddingHorizontal: SPACING.xl, paddingBottom: 60 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.xl },
    title: { color: '#FFF', fontSize: 26, fontWeight: '800', letterSpacing: 0.5 },
    backButton: { width: 40, paddingVertical: 8, alignItems: 'flex-start' },
    rightSpacer: { width: 40 },
    form: { width: '100%' },
    inputGap: { marginBottom: 16 },
    dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 24, opacity: 0.4 },
    dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.2)' },
    dividerText: { color: '#FFF', paddingHorizontal: 12, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
    genderRow: { flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: BORDER_RADIUS.default, padding: 4 },
    genderBox: { flex: 1, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: BORDER_RADIUS.sm },
    genderBoxActive: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
    genderText: { color: 'rgba(255, 255, 255, 0.4)', fontWeight: '700', fontSize: 13 },
    genderTextActive: { color: '#FFF' },
    avatarGrid: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
    avatarItem: { width: 80, height: 80, borderRadius: 40, padding: 2, borderWidth: 2, borderColor: 'transparent' },
    avatarItemActive: { borderColor: COLORS.primary },
    avatarSmall: { width: '100%', height: '100%', borderRadius: 40 },
    imageActionRow: { flexDirection: 'row', gap: 12 },
    cameraBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)', height: 50, borderRadius: BORDER_RADIUS.default, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
    galleryBtnHalf: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)', height: 50, borderRadius: BORDER_RADIUS.default, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
    galleryBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
    previewContainer: { alignItems: 'center', marginBottom: SPACING.xl },
    previewImageWrapper: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: COLORS.primary, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)' },
    previewImage: { width: '100%', height: '100%' },
    continueBtn: { marginTop: 32, height: 56, borderRadius: BORDER_RADIUS.default },
    usernameChecking: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginLeft: 4, marginBottom: 8 },
    usernameAvailable: { color: '#10B981', fontSize: 12, fontWeight: '700', marginLeft: 4, marginBottom: 8 },
    usernameTaken: { color: '#ef4444', fontSize: 12, fontWeight: '700', marginLeft: 4, marginBottom: 8 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginLeft: 4 },
    chip: { backgroundColor: 'rgba(59,130,246,0.15)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.4)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
    chipText: { color: '#60a5fa', fontSize: 12, fontWeight: '700' },
    uploadBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(129,140,248,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(129,140,248,0.2)',
        borderRadius: BORDER_RADIUS.default,
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginTop: 16,
    },
    uploadBannerText: { color: '#818CF8', fontSize: 13, fontWeight: '600' },
});
