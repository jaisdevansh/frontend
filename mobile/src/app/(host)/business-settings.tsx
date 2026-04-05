import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Modal, ActivityIndicator, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStrictBack } from '../../hooks/useStrictBack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { hostService } from '../../services/hostService';
import { useToast } from '../../context/ToastContext';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

export default function BusinessSettings() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const goBack = useStrictBack('/(host)/profile');
    const { showToast } = useToast();

    const [form, setForm] = useState({
        hostName: '',
        profileImage: '',
        businessName: '',
        venueAddress: '',
        contactNumber: '',
        businessDescription: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [previewVisible, setPreviewVisible] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await hostService.getProfile();
            if (res.success) {
                setForm({
                    hostName: res.data.hostName || '',
                    profileImage: res.data.profileImage || '',
                    businessName: res.data.businessName || '',
                    venueAddress: res.data.venueAddress || '',
                    contactNumber: res.data.contactNumber || '',
                    businessDescription: res.data.businessDescription || '',
                });
            }
        } catch (error: any) {
            console.error('[BusinessSettings] Load error:', error);
            const msg = error.response?.data?.message || error.message || 'Connection failed';
            showToast(`Error: ${msg}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await hostService.updateProfile(form);
            if (res.success) {
                showToast('Settings saved', 'success');
            }
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to save settings', 'error');
        } finally {
            setSaving(false);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled && result.assets[0].base64) {
            setForm({ ...form, profileImage: `data:image/jpeg;base64,${result.assets[0].base64}` });
        }
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Business Settings</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <TouchableOpacity style={styles.avatarSection} onPress={() => setPreviewVisible(true)}>
                    {form.profileImage ? (
                        <Image source={{ uri: form.profileImage }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>{form.hostName?.charAt(0) || 'H'}</Text>
                        </View>
                    )}
                    <TouchableOpacity style={styles.cameraBtn} onPress={pickImage}>
                        <Ionicons name="camera" size={20} color="white" />
                    </TouchableOpacity>
                </TouchableOpacity>

                <View style={styles.form}>
                    <Input
                        label="Host Name"
                        value={form.hostName}
                        onChangeText={(t) => setForm({ ...form, hostName: t })}
                        placeholder="Your Name"
                    />
                    <Input
                        label="Contact Number"
                        value={form.contactNumber}
                        onChangeText={(t) => setForm({ ...form, contactNumber: t })}
                        placeholder="+91 XXXXX XXXXX"
                        keyboardType="phone-pad"
                    />
                    <Input
                        label="Business Name"
                        value={form.businessName}
                        onChangeText={(t) => setForm({ ...form, businessName: t })}
                        placeholder="Business/Venue Name"
                    />
                    <Input
                        label="Venue Address"
                        value={form.venueAddress}
                        onChangeText={(t) => setForm({ ...form, venueAddress: t })}
                        placeholder="Full Address"
                        multiline
                    />
                    <Input
                        label="Business Description"
                        value={form.businessDescription}
                        onChangeText={(t) => setForm({ ...form, businessDescription: t })}
                        placeholder="Tell members about your venue"
                        multiline
                    />
                </View>

                <Button
                    title={saving ? "Saving..." : "Save Changes"}
                    onPress={handleSave}
                    loading={saving}
                    style={styles.saveBtn}
                />
            </ScrollView>

            {/* Image Preview Modal */}
            <Modal visible={previewVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.closeBtn} onPress={() => setPreviewVisible(false)}>
                        <Ionicons name="close" size={30} color="white" />
                    </TouchableOpacity>
                    {form.profileImage ? (
                        <Image
                            source={{ uri: form.profileImage }}
                            style={styles.fullImage}
                            resizeMode="contain"
                        />
                    ) : (
                        <View style={[styles.avatarPlaceholder, { width: width * 0.8, height: width * 0.8, borderRadius: 20 }]}>
                            <Text style={[styles.avatarText, { fontSize: 80 }]}>{form.hostName?.charAt(0) || 'H'}</Text>
                        </View>
                    )}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background.dark,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: COLORS.background.dark,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md, // Increased padding
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
    },
    scrollContent: {
        padding: SPACING.lg,
    },
    avatarSection: {
        alignItems: 'center',
        marginVertical: SPACING.xl,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: COLORS.primary,
    },
    avatarPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(124, 77, 255, 0.1)',
        borderWidth: 3,
        borderColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: COLORS.primary,
        fontSize: 40,
        fontWeight: '800',
    },
    cameraBtn: {
        position: 'absolute',
        bottom: 0,
        right: width / 2 - 60,
        backgroundColor: COLORS.primary,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: COLORS.background.dark,
    },
    form: {
        gap: SPACING.sm,
    },
    saveBtn: {
        marginTop: SPACING.xl,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeBtn: {
        position: 'absolute',
        top: 60,
        right: 20,
        zIndex: 1,
    },
    fullImage: {
        width: '100%',
        height: '80%',
    },
});
