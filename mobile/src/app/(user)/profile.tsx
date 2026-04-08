import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { userService } from '../../services/userService';
import { COLORS } from '../../constants/design-system';
import { useToast } from '../../context/ToastContext';
import { avatar } from '../../services/cloudinaryService';

// ─── Feature-colour palette ───────────────────────────────────────────────────
const MENU_ITEMS = [
    {
        label: 'Edit Profile',
        sublabel: 'Manage your info & photos',
        icon: 'person' as const,
        route: '/(settings)/edit-profile',
        color: '#818CF8',           // indigo
        bg: 'rgba(129,140,248,0.12)',
    },
    {
        label: 'Notification Settings',
        sublabel: 'Alerts, sounds & preferences',
        icon: 'notifications' as const,
        route: '/(settings)/notification-settings',
        color: '#FB923C',           // amber-orange
        bg: 'rgba(251,146,60,0.12)',
    },
    {
        label: 'Invite & Earn',
        sublabel: 'Refer friends · get bonus credits',
        icon: 'gift' as const,
        route: '/(user)/referral',
        color: '#A78BFA',           // violet
        bg: 'rgba(167,139,250,0.12)',
        badge: 'BONUS',
    },
    {
        label: 'My Rewards & Coupons',
        sublabel: 'Points, perks & exclusive deals',
        icon: 'ticket' as const,
        route: '/(user)/rewards',
        color: '#34D399',           // emerald
        bg: 'rgba(52,211,153,0.12)',
    },
    {
        label: 'Rate the App',
        sublabel: 'Share your feedback',
        icon: 'star' as const,
        route: '/(user)/app-rating',
        color: '#FBBF24',           // gold-yellow
        bg: 'rgba(251,191,36,0.12)',
    },
    {
        label: 'Terms & Support',
        sublabel: 'Help centre & legal',
        icon: 'help-circle' as const,
        route: '/(settings)/terms-support',
        color: '#94A3B8',           // slate
        bg: 'rgba(148,163,184,0.10)',
    },
];

export default function UserProfile() {
    const router = useRouter();
    const { logout, user: authUser } = useAuth();
    const { showToast } = useToast();
    const [isImageVisible, setImageVisible] = useState(false);
    
    // We start seamlessly with whatever authUser we have to completely eliminate loading spinners
    const [profile, setProfile] = useState<any>(authUser || null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // 🔥 KEY FIX: When AuthContext updates (e.g. after onboarding or edit-profile saves),
    // sync local profile state immediately — name/image appear without extra fetch
    useEffect(() => {
        if (authUser) {
            setProfile((prev: any) => {
                const merged = prev ? { ...prev, ...authUser } : authUser;
                return merged;
            });
        }
    }, [authUser]);


    useFocusEffect(
        useCallback(() => {
            let isActive = true;
            const fetchProfile = async () => {
                try {
                    const res = await userService.getProfile();
                    if (res.success && isActive) setProfile(res.data);
                } catch (error: any) {
                    // silently fail, use AuthContext
                }
            };
            fetchProfile();
            return () => { isActive = false; };
        }, [])
    );

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try { await authService.logout(); await logout(); }
        catch { await logout(); }
        finally { setIsLoggingOut(false); }
    };

    const defaultImage = 'https://via.placeholder.com/100';
    let profileImageUrl = profile?.profileImage || authUser?.profileImage || defaultImage;
    if (profileImageUrl && !profileImageUrl.startsWith('http') && !profileImageUrl.startsWith('file') && !profileImageUrl.startsWith('data:')) {
        profileImageUrl = `data:image/jpeg;base64,${profileImageUrl}`;
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* ── Header ── */}
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>Profile</Text>
                </View>

                {/* ── Avatar card ── */}
                <View style={styles.avatarCard}>
                    <LinearGradient
                        colors={['rgba(129,140,248,0.08)', 'rgba(167,139,250,0.04)', 'transparent']}
                        style={StyleSheet.absoluteFillObject}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    />
                    <TouchableOpacity onPress={() => setImageVisible(true)} activeOpacity={0.85}>
                        <View style={styles.avatarRing}>
                            <Image
                                source={{ uri: avatar(profileImageUrl, profile?.name || authUser?.name) || 'https://via.placeholder.com/100' }}
                                style={styles.avatar}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                            />
                        </View>
                    </TouchableOpacity>
                    <View style={styles.avatarInfo}>
                        <Text style={styles.userName}>{profile?.name || authUser?.name || 'Member'}</Text>
                        <Text style={styles.userEmail} numberOfLines={1}>{profile?.email || authUser?.email || profile?.phone || authUser?.phone || ''}</Text>
                        <View style={styles.tierPill}>
                            <View style={styles.tierDot} />
                            <Text style={styles.tierText}>ENTRY CLUB MEMBER</Text>
                        </View>
                    </View>
                </View>

                {/* ── Menu items ── */}
                <View style={styles.menu}>
                    {MENU_ITEMS.map((item) => (
                        <TouchableOpacity
                            key={item.route}
                            style={styles.menuItem}
                            activeOpacity={0.78}
                            onPress={() => router.push(item.route as any)}
                        >
                            {/* Left icon */}
                            <View style={[styles.iconBox, { backgroundColor: item.bg }]}>
                                <Ionicons name={item.icon} size={19} color={item.color} />
                            </View>

                            {/* Labels */}
                            <View style={styles.menuLabels}>
                                <Text style={styles.menuLabel}>{item.label}</Text>
                                <Text style={styles.menuSub}>{item.sublabel}</Text>
                            </View>

                            {/* Badge or chevron */}
                            {item.badge ? (
                                <View style={[styles.badge, { backgroundColor: item.bg, borderColor: item.color }]}>
                                    <Text style={[styles.badgeText, { color: item.color }]}>{item.badge}</Text>
                                </View>
                            ) : null}
                            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Logout ── */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} disabled={isLoggingOut} activeOpacity={0.8}>
                    {isLoggingOut
                        ? <ActivityIndicator size="small" color="#FF4D4F" />
                        : <>
                            <Ionicons name="log-out-outline" size={20} color="#FF4D4F" />
                            <Text style={styles.logoutText}>Sign Out</Text>
                          </>
                    }
                </TouchableOpacity>

                <Text style={styles.versionText}>Entry Club v1.0</Text>
            </ScrollView>

            {/* ── Full-screen image modal ── */}
            <Modal visible={isImageVisible} transparent animationType="fade">
                <View style={styles.modalContainer}>
                    <TouchableOpacity style={styles.closeButton} onPress={() => setImageVisible(false)}>
                        <Ionicons name="close" size={26} color="#FFF" />
                    </TouchableOpacity>
                    <Image source={{ uri: profileImageUrl }} style={styles.fullScreenImage} contentFit="contain" />
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#030303' },
    scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 60 },

    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, marginBottom: 24 },
    headerTitle: { color: '#FFF', fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },

    // Avatar card
    avatarCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 18,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        padding: 20,
        marginBottom: 24,
        overflow: 'hidden',
    },
    avatarRing: {
        width: 72, height: 72, borderRadius: 36,
        borderWidth: 2, borderColor: '#818CF8',
        padding: 2,
    },
    avatar: { width: '100%', height: '100%', borderRadius: 34 },
    avatarInfo: { flex: 1 },
    userName: { color: '#FFF', fontSize: 20, fontWeight: '800', marginBottom: 2 },
    userEmail: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 8 },
    tierPill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(129,140,248,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(129,140,248,0.2)' },
    tierDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#818CF8' },
    tierText: { color: '#818CF8', fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },

    // Menu
    menu: { gap: 8, marginBottom: 24 },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 14,
    },
    iconBox: {
        width: 40, height: 40,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuLabels: { flex: 1 },
    menuLabel: { color: '#FFF', fontSize: 15, fontWeight: '700', marginBottom: 2 },
    menuSub: { color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '500' },

    badge: {
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 8, borderWidth: 1,
        marginRight: 4,
    },
    badgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

    // Logout
    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 16, borderRadius: 18, gap: 10,
        backgroundColor: 'rgba(255,77,79,0.08)',
        borderWidth: 1, borderColor: 'rgba(255,77,79,0.2)',
        marginBottom: 20,
    },
    logoutText: { color: '#FF4D4F', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
    versionText: { color: 'rgba(255,255,255,0.15)', fontSize: 11, textAlign: 'center', fontWeight: '600' },

    // Modal
    modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.96)', justifyContent: 'center', alignItems: 'center' },
    closeButton: { position: 'absolute', top: 60, right: 20, zIndex: 1, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 22 },
    fullScreenImage: { width: '100%', height: '80%' },
});
