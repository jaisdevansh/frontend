import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hostService } from '../../services/hostService';
import { useToast } from '../../context/ToastContext';
import { LinearGradient } from 'expo-linear-gradient';
import { uploadImage } from '../../services/cloudinaryService';
import { COLORS } from '../../constants/design-system';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';

// Custom lightweight Input component to avoid heavy re-renders
const ProfileInput = memo(({ label, value, onChangeText, placeholder, keyboardType = 'default', autoCapitalize = 'sentences', multiline = false }: any) => (
    <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{label}</Text>
        <TextInput
            style={[styles.input, multiline && styles.textArea]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="rgba(255,255,255,0.3)"
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            multiline={multiline}
            textAlignVertical={multiline ? 'top' : 'center'}
        />
    </View>
));

export default function EditProfileScreen() {
    const router = useRouter();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const { updateUser } = useAuth();
    const scrollViewRef = useRef<KeyboardAwareScrollView>(null);

    // Use SAME queryKey as useHostProfile hook → data is already cached, no extra network call
    const { data: profileData, isLoading: isFetching } = useQuery({
        queryKey: ['hostProfile'],
        queryFn: async () => {
            try {
                const res = await hostService.getProfile();
                if (!res) return null;
                // Backend returns { success: true, data: { name, email, ... } }
                return res.data || res.host || res;
            } catch {
                return null;
            }
        },
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

    const [form, setForm] = useState({
        name: '',
        username: '',
        profileImage: '',
        location: '',
        contactNumber: '',
        email: ''
    });

    // Pre-populate form when profile data arrives (or from cache)
    useEffect(() => {
        if (!profileData) return;
        // Profile data is already unwrapped at this point
        const p = profileData;
        setForm({
            name: p.name || '',
            username: p.username || '',
            profileImage: p.profileImage || p.logo || '',
            location: typeof p.location === 'object' ? (p.location?.address || '') : (p.location || ''),
            contactNumber: p.phone || p.contactNumber || '',
            email: p.email || ''
        });
    }, [profileData]);

    // Update Profile Mutation
    const updateMutation = useMutation({
        mutationFn: (updateData: typeof form) => hostService.updateProfile(updateData),
        onSuccess: (res: any) => {
            queryClient.invalidateQueries({ queryKey: ['hostProfile'] });
            if (res.data) {
                updateUser({
                    name: res.data.name,
                    profileImage: res.data.profileImage,
                    username: res.data.username
                });
            }
            showToast('Profile updated successfully', 'success');
            router.back();
        },
        onError: (error: any) => {
            showToast(error.response?.data?.message || 'Failed to update profile', 'error');
        }
    });

    const handleSave = useCallback(async () => {
        // Basic validation
        if (!form.name.trim() || !form.username) {
            showToast('Name and Username are required', 'error');
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        try {
            let finalImageUrl = form.profileImage;
            
            // ⚡ DIRECT UPLOAD: Bypass backend relay
            if (form.profileImage && !form.profileImage.startsWith('http')) {
                try {
                    finalImageUrl = await uploadImage(form.profileImage);
                } catch (err) {
                    showToast('Image upload issue, using placeholder', 'info');
                }
            }

            const finalPayload = { 
                name: form.name.trim(),
                username: form.username.trim(),
                profileImage: finalImageUrl,
                location: form.location.trim(),
                contactNumber: form.contactNumber.trim(),
                email: form.email.trim()
            };
            updateMutation.mutate(finalPayload as any);
        } catch (error) {
            showToast('Failed to process image', 'error');
        }
    }, [form, updateMutation, showToast]);

    const handleChange = useCallback((key: keyof typeof form, value: string) => {
        // Enforce lowercase no spaces for username instantly
        if (key === 'username') {
            value = value.toLowerCase().replace(/\s/g, '');
        }
        setForm(prev => ({ ...prev, [key]: value }));
    }, []);

    const pickImage = useCallback(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            const asset = result.assets[0];
            handleChange('profileImage', asset.uri);
            Haptics.selectionAsync();
        }
    }, [handleChange]);

    if (isFetching && !profileData) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 12, fontSize: 14 }}>Loading profile…</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.title}>Edit Profile</Text>
                <TouchableOpacity onPress={handleSave} disabled={updateMutation.isPending} style={{ padding: 4 }}>
                    {updateMutation.isPending ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                        <Text style={[styles.saveText, { color: COLORS.primary }]}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            <KeyboardAwareScrollView
                ref={scrollViewRef}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                enableOnAndroid={true}
                enableAutomaticScroll={true}
                extraHeight={250}
                extraScrollHeight={250}
                keyboardOpeningTime={0}
                keyboardShouldPersistTaps="handled"
            >
                    
                    {/* Image Section */}
                    <View style={styles.imageSection}>
                        <TouchableOpacity onPress={pickImage} activeOpacity={0.8} style={styles.imageWrapper}>
                            {form.profileImage ? (
                                <Image source={{ uri: form.profileImage }} style={styles.avatarPic} cachePolicy="memory-disk" />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Ionicons name="camera" size={32} color="rgba(255,255,255,0.4)" />
                                </View>
                            )}
                            <View style={styles.editIconBadge}>
                                <Ionicons name="pencil" size={12} color="white" />
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.imageHint}>Tap to change avatar</Text>
                    </View>

                    {/* Basic Info */}
                    <Text style={styles.sectionTitle}>Basic Info</Text>
                    <ProfileInput label="Full Name *" value={form.name} onChangeText={(t: string) => handleChange('name', t)} placeholder="e.g. John Doe" />
                    <ProfileInput label="Username (Unique) *" value={form.username} onChangeText={(t: string) => handleChange('username', t)} placeholder="e.g. johndoe_official" autoCapitalize="none" />
                    <ProfileInput label="Location" value={form.location} onChangeText={(t: string) => handleChange('location', t)} placeholder="e.g. Mumbai, IN" />

                    {/* Contact Info */}
                    <Text style={styles.sectionTitle}>Contact</Text>
                    <ProfileInput label="Phone Number" value={form.contactNumber} onChangeText={(t: string) => handleChange('contactNumber', t)} placeholder="+91 xxxxx xxxxx" keyboardType="phone-pad" />
                    <ProfileInput label="Email Address" value={form.email} onChangeText={(t: string) => handleChange('email', t)} placeholder="hello@company.com" keyboardType="email-address" autoCapitalize="none" />

                    <View style={{ height: 40 }} />
                </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0C16' },
    loadingContainer: { flex: 1, backgroundColor: '#0A0C16', alignItems: 'center', justifyContent: 'center' },
    
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    title: { color: 'white', fontSize: 18, fontWeight: '700' },
    saveText: { color: '#8B5CF6', fontSize: 16, fontWeight: '700' },

    scrollContent: { padding: 20 },

    imageSection: { alignItems: 'center', marginBottom: 30, marginTop: 10 },
    imageWrapper: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#8B5CF6', padding: 2 },
    avatarPic: { width: '100%', height: '100%', borderRadius: 50 },
    avatarPlaceholder: { width: '100%', height: '100%', borderRadius: 50, backgroundColor: '#161A2B', alignItems: 'center', justifyContent: 'center' },
    editIconBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#8B5CF6', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#0A0C16' },
    imageHint: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 12, fontWeight: '500' },

    sectionTitle: { color: 'white', fontSize: 18, fontWeight: '800', marginBottom: 16, marginTop: 10 },
    
    inputGroup: { marginBottom: 20 },
    inputLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600', marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { backgroundColor: '#131521', color: 'white', borderRadius: 16, padding: 16, fontSize: 15, fontWeight: '500', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    textArea: { height: 100 },

    typeRow: { flexDirection: 'row', gap: 10 },
    typeBadge: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#131521', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    typeBadgeActive: { backgroundColor: 'rgba(139, 92, 246, 0.1)', borderColor: '#8B5CF6' },
    typeText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '800' },
    typeTextActive: { color: '#8B5CF6' },
    nameRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
