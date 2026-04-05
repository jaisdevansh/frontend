import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Image } from 'react-native';
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

    const insets = useSafeAreaInsets();
    const { setOnboardingStatus, updateUser } = useAuth();
    const router = useRouter();
    const { showToast } = useToast();
    const { showAlert } = useAlert();
    const queryClient = useQueryClient();

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

        if (!result.canceled) {
            setProfileImage(result.assets[0].uri);
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            showToast('Permission to access camera is required!', 'error');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setProfileImage(result.assets[0].uri);
        }
    };

    const handleCompleteOnboarding = async () => {
        if (!firstName || !lastName || !username || !gender) {
            showToast('Please fill in all required fields including Username', 'error');
            return;
        }

        setLoading(true);
        try {
            const fullName = `${firstName.trim()} ${lastName.trim()}`;
            const res = await authService.completeOnboarding({
                name: fullName,
                username: username.trim(),
                gender,
                profileImage: profileImage || undefined
            } as any);

            if (res.success) {
                // Clear stale cache and trigger refetch so profile shows on Home/Profile screens
                userService.clearCache();
                queryClient.invalidateQueries({ queryKey: ['user_profile'] });

                // Overwrite the 'Club Member' default in global AuthContext immediately
                await updateUser({
                    name: fullName,
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    username: username.trim(),
                    gender,
                    profileImage: profileImage || undefined
                });

                // --- Referral Code Application ---
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
            showToast('Failed to save profile', 'error');
        } finally {
            setLoading(false);
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
                        <Text style={styles.title}>Complete Profile</Text>
                    </View>

                    <View style={styles.previewContainer}>
                        <View style={styles.previewImageWrapper}>
                            {profileImage ? (
                                <Image source={{ uri: profileImage }} style={styles.previewImage} />
                            ) : (
                                <Ionicons name="person" size={40} color="rgba(255, 255, 255, 0.5)" />
                            )}
                        </View>
                    </View>

                    <View style={styles.form}>
                        <Input
                            label=""
                            placeholder="Username (e.g. johndoe123)"
                            value={username}
                            onChangeText={(text) => setUsername(text.toLowerCase().replace(/\s/g, ''))}
                            containerStyle={styles.inputGap}
                            autoCapitalize="none"
                        />
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

                        <Button
                            title="Continue"
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
    header: { alignItems: 'center', marginBottom: SPACING.xl },
    title: { color: '#FFF', fontSize: 28, fontWeight: '800', letterSpacing: 0.5 },
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
});
