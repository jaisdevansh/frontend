import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, Modal, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useStrictBack } from '../../hooks/useStrictBack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { Button } from '../../components/Button';
import { hostService } from '../../services/hostService';
import { useToast } from '../../context/ToastContext';
import { useAlert } from '../../context/AlertProvider';

const { width } = Dimensions.get('window');

export default function HostProfile() {
    const insets = useSafeAreaInsets();
    const { logout } = useAuth();
    const router = useRouter();
    const { showToast } = useToast();
    const { showAlert } = useAlert();
    const goBack = useStrictBack('/(host)/dashboard');

    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [previewVisible, setPreviewVisible] = useState(false);

    useFocusEffect(
        useCallback(() => {
            fetchProfile();
        }, [])
    );

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const res = await hostService.getProfile();
            if (res.success) {
                setProfile(res.data);
            }
        } catch (error: any) {
            showToast('Unable to reach services. Please try again.', 'error');
            
            if (error.response?.status === 403) {
                showToast('Action restricted. Check your role permissions.', 'info');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        showAlert(
            "Logout Confirmation",
            "Are you sure you want to sign out from the Host Dashboard? You will need to re-verify for access.",
            [
                { text: "Later", style: "cancel" },
                { text: "Sign Out", style: "destructive", onPress: async () => await logout() }
            ]
        );
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
                <Ionicons name="cloud-offline-outline" size={64} color="rgba(255,255,255,0.2)" />
                <Text style={{ color: 'white', marginTop: 16, fontSize: 16 }}>Failed to load profile</Text>
                <TouchableOpacity
                    style={{ marginTop: 20, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
                    onPress={fetchProfile}
                >
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.content}>
                <TouchableOpacity style={styles.backBtn} onPress={() => goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>

                <View style={styles.profileHeader}>
                    <TouchableOpacity activeOpacity={0.9} onPress={() => setPreviewVisible(true)}>
                        {profile?.profileImage ? (
                            <Image source={{ uri: profile.profileImage }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>
                                    {profile?.name?.substring(0, 2).toUpperCase() || 'HC'}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <Text style={styles.userName}>{profile?.name || 'Elite Curator'}</Text>
                    <Text style={styles.venueRole}>{profile?.businessName?.toUpperCase() || 'VENUE OWNER'}</Text>
                </View>

                <View style={styles.menu}>
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => router.push('/(host)/business-settings')}
                    >
                        <Ionicons name="settings-outline" size={22} color="white" style={{ marginRight: 16 }} />
                        <Text style={styles.menuText}>Business Settings</Text>
                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.2)" style={{ marginLeft: 'auto' }} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => router.push('/(host)/payouts')}
                    >
                        <Ionicons name="wallet-outline" size={22} color="white" style={{ marginRight: 16 }} />
                        <Text style={styles.menuText}>Payout History</Text>
                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.2)" style={{ marginLeft: 'auto' }} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => router.push('/(host)/staff')}
                    >
                        <Ionicons name="people-outline" size={22} color="white" style={{ marginRight: 16 }} />
                        <Text style={styles.menuText}>Staff Management</Text>
                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.2)" style={{ marginLeft: 'auto' }} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => router.push('/(host)/support')}
                    >
                        <Ionicons name="help-buoy-outline" size={22} color="white" style={{ marginRight: 16 }} />
                        <Text style={styles.menuText}>Support Dashboard</Text>
                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.2)" style={{ marginLeft: 'auto' }} />
                    </TouchableOpacity>
                </View>

                <Button
                    title="Logout"
                    onPress={handleLogout}
                    variant="glass"
                    style={styles.logoutBtn}
                    textStyle={{ color: '#FF3B30', fontWeight: '800' }}
                />

                <Modal visible={previewVisible} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setPreviewVisible(false)}>
                            <Ionicons name="close" size={30} color="white" />
                        </TouchableOpacity>
                        {profile?.profileImage ? (
                            <Image
                                source={{ uri: profile.profileImage }}
                                style={styles.fullImage}
                                resizeMode="contain"
                            />
                        ) : (
                            <View style={[styles.avatarPlaceholder, { width: width * 0.8, height: width * 0.8, borderRadius: 20 }]}>
                                <Text style={[styles.avatarText, { fontSize: 80 }]}>
                                    {profile?.name?.substring(0, 2).toUpperCase() || 'HC'}
                                </Text>
                            </View>
                        )}
                    </View>
                </Modal>
            </View>
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
    content: {
        flex: 1,
        padding: SPACING.xl,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24, // Increased
    },
    profileHeader: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: COLORS.primary,
        marginBottom: 16,
    },
    avatarPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(124, 77, 255, 0.1)',
        borderWidth: 4,
        borderColor: COLORS.primary,
        marginBottom: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: COLORS.primary,
        fontSize: 40,
        fontWeight: '800',
    },
    userName: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '800',
    },
    venueRole: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 2,
        marginTop: 4,
    },
    menu: {
        gap: 12,
    },
    menuItem: {
        height: 64,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    menuText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    logoutBtn: {
        marginTop: 'auto',
        marginBottom: 20,
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
        borderColor: 'rgba(255, 59, 48, 0.2)',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
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
