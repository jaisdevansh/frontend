import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../../constants/design-system';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { userService } from '../../../services/userService';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

export default function StaffProfileScreen() {
    const { logout, role } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);

    useFocusEffect(
        useCallback(() => {
            fetchProfile();
        }, [])
    );

    const fetchProfile = async () => {
        try {
            const res = await userService.getProfile();
            if (res.success) {
                setProfile(res.data);
            }
        } catch (err) {
            console.log('Staff Tab Profile fetch error', err);
        }
    };

    const handleLogout = () => {
        showToast('🔓 Logging out...', 'info');
        setTimeout(logout, 1000);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <LinearGradient
                colors={['#000000', '#1a1a2e']}
                style={StyleSheet.absoluteFill}
            />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.profileHeader}>
                    <TouchableOpacity style={styles.avatarContainer} onPress={() => router.push('/(settings)/edit-profile')}>
                        <LinearGradient
                            colors={[COLORS.primary, '#9d50bb']}
                            style={styles.avatarGradient}
                        >
                            {profile?.profileImage ? (
                                <Image source={{ uri: profile.profileImage }} style={styles.avatarImage} />
                            ) : (
                                <Text style={styles.avatarInitial}>{profile?.name?.charAt(0) || 'S'}</Text>
                            )}
                        </LinearGradient>
                        <View style={styles.activeDot} />
                    </TouchableOpacity>
                    <Text style={styles.profileName}>{profile?.name || 'Curator Staff'}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>{role?.toUpperCase() || 'OFFICER'}</Text>
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{profile?.completedOrders || 0}</Text>
                        <Text style={styles.statLabel}>COMPLETED</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{profile?.rating?.toFixed(1) || '5.0'}</Text>
                        <Text style={styles.statLabel}>RATING</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{profile?.staffType || 'ACTIVE'}</Text>
                        <Text style={styles.statLabel}>STATUS</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Preferences</Text>
                    <TouchableOpacity style={styles.menuItem}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.iconBox, { backgroundColor: 'rgba(52, 199, 89, 0.1)' }]}>
                                <Ionicons name="location" size={20} color="#34C759" />
                            </View>
                            <Text style={styles.menuText}>Role: {profile?.staffType || 'WAITER'}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.menuItem}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.iconBox, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}>
                                <Ionicons name="notifications" size={20} color="#FF9500" />
                            </View>
                            <Text style={styles.menuText}>Notification Settings</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.iconBox, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
                                <Ionicons name="log-out" size={20} color="#FF3B30" />
                            </View>
                            <Text style={[styles.menuText, { color: '#FF3B30' }]}>Log Out</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <Text style={styles.versionText}>Stitch Staff v1.4.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background.dark,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    profileHeader: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatarGradient: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    avatarInitial: {
        fontSize: 40,
        fontWeight: '800',
        color: 'white',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 50,
    },
    activeDot: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#34C759',
        borderWidth: 4,
        borderColor: COLORS.background.dark,
    },
    profileName: {
        fontSize: 24,
        fontWeight: '800',
        color: 'white',
        letterSpacing: -0.5,
    },
    roleBadge: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    roleText: {
        color: COLORS.primary,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
    },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.lg,
        gap: 12,
        marginBottom: 40,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    statValue: {
        color: 'white',
        fontSize: 20,
        fontWeight: '800',
    },
    statLabel: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 9,
        fontWeight: '800',
        marginTop: 4,
        letterSpacing: 0.5,
    },
    section: {
        paddingHorizontal: SPACING.lg,
        marginBottom: 32,
    },
    sectionTitle: {
        color: 'white',
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 16,
        letterSpacing: 1,
        textTransform: 'uppercase',
        opacity: 0.4,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 14,
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    menuLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
    versionText: {
        textAlign: 'center',
        color: 'rgba(255,255,255,0.2)',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 20,
    }
});
