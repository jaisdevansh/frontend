import React, { useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Linking, StatusBar, Animated, Dimensions
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import adminService, { PendingHost } from '../../../services/adminService';

const { width } = Dimensions.get('window');

const STATUS_COLORS: Record<string, string> = {
    ACTIVE: '#10B981',
    SUSPENDED: '#F43F5E',
    PENDING_VERIFICATION: '#f59e0b',
    CREATED: '#3b82f6',
};

const STATUS_LABELS: Record<string, string> = {
    ACTIVE: 'Active',
    SUSPENDED: 'Suspended',
    PENDING_VERIFICATION: 'Pending KYC',
    CREATED: 'Onboarding',
};

export default function HostDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    const { data: host, isLoading, error } = useQuery<PendingHost>({
        queryKey: ['admin-host-detail', id],
        queryFn: () => adminService.getHostDetails(id as string),
        enabled: !!id,
    });

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
        ]).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.06, duration: 1800, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
            ])
        ).start();

        Animated.loop(
            Animated.timing(rotateAnim, { toValue: 1, duration: 8000, useNativeDriver: true })
        ).start();
    }, []);

    if (isLoading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Loading Partner Profile...</Text>
            </View>
        );
    }

    if (error || !host) {
        return (
            <View style={[styles.container, styles.centered]}>
                <MaterialIcons name="error-outline" size={48} color="#F43F5E" />
                <Text style={styles.errorText}>Partner retrieval failed</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
                    <Text style={styles.retryText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleCall = () => host.phone && Linking.openURL(`tel:${host.phone}`);
    const handleEmail = () => host.email && Linking.openURL(`mailto:${host.email}`);

    const statusColor = STATUS_COLORS[host.hostStatus] || '#3b82f6';
    const statusLabel = STATUS_LABELS[host.hostStatus] || host.hostStatus;
    const displayName = (host as any).name || (host as any).fullName || 'Host Partner';
    const createdStr = new Date(host.createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' });

    const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Background Gradient */}
            <LinearGradient
                colors={['#0a0a14', '#05050d', '#000000']}
                style={StyleSheet.absoluteFillObject}
            />

            {/* Ambient Glow */}
            <View style={[styles.ambientGlow, { backgroundColor: `${statusColor}18` }]} />

            {/* Header */}
            <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                    <Ionicons name="chevron-back" size={22} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Partner Profile</Text>
                    <Text style={styles.headerSub}>Admin Console</Text>
                </View>
                <TouchableOpacity style={styles.headerBtn}>
                    <Ionicons name="ellipsis-vertical" size={20} color="#FFF" />
                </TouchableOpacity>
            </Animated.View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Hero Section */}
                <Animated.View style={[styles.heroSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    {/* Avatar with animated ring */}
                    <View style={styles.avatarWrapper}>
                        {/* Spinning outer ring */}
                        <Animated.View style={[styles.spinRing, { transform: [{ rotate: spin }], borderColor: `${statusColor}55` }]} />
                        {/* Static colored ring */}
                        <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }], borderColor: statusColor }]} />
                        {/* Avatar */}
                        <View style={styles.avatarShadow}>
                            <Image
                                source={{ uri: host.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=111827&color=fff&bold=true&size=200` }}
                                style={styles.avatar}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                            />
                        </View>
                        {/* Status Dot */}
                        <View style={[styles.onlineDot, { backgroundColor: statusColor, shadowColor: statusColor }]} />
                    </View>

                    <Text style={styles.displayName}>{displayName}</Text>
                    {(host as any).username && (
                        <Text style={styles.username}>@{(host as any).username}</Text>
                    )}

                    {/* Status Badge */}
                    <LinearGradient
                        colors={[`${statusColor}25`, `${statusColor}10`]}
                        style={styles.statusBadge}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    >
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                    </LinearGradient>

                    <Text style={styles.since}>Partner since {createdStr}</Text>
                </Animated.View>

                {/* Stats Row */}
                <Animated.View style={[styles.statsRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <StatCard icon="monetization-on" label="Fiscal Status" value="Operational" color="#10B981" />
                    <StatCard icon="star" label="Account Tier" value="Host Pro" color="#8b5cf6" />
                    <StatCard icon="verified" label="KYC" value={host.kyc?.isVerified ? 'Verified' : 'Pending'} color={host.kyc?.isVerified ? '#10B981' : '#f59e0b'} />
                </Animated.View>

                {/* Communication Terminal */}
                <SectionLabel title="COMMUNICATION" />
                <Animated.View style={[styles.glassCard, { opacity: fadeAnim }]}>
                    <ContactRow
                        icon="call"
                        iconBg="rgba(59,130,246,0.12)"
                        iconColor="#3b82f6"
                        label="Phone"
                        value={host.phone || '—'}
                        onPress={handleCall}
                        disabled={!host.phone}
                    />
                    <View style={styles.cardDivider} />
                    <ContactRow
                        icon="mail"
                        iconBg="rgba(139,92,246,0.12)"
                        iconColor="#8b5cf6"
                        label="Email"
                        value={host.email || '—'}
                        onPress={handleEmail}
                        disabled={!host.email}
                    />
                </Animated.View>

                {/* Administrative Control */}
                <SectionLabel title="ADMINISTRATIVE CONTROL" />
                <Animated.View style={[styles.glassCard, { opacity: fadeAnim }]}>
                    <ActionRow
                        iconName="shield-checkmark"
                        iconBg="rgba(16,185,129,0.12)"
                        iconColor="#10B981"
                        label="Audit KYC Documentation"
                        onPress={() => router.push(`/admin/kyc-verification` as any)}
                    />
                    <View style={styles.cardDivider} />
                    <ActionRow
                        iconName="analytics"
                        iconBg="rgba(59,130,246,0.12)"
                        iconColor="#3b82f6"
                        label="View Performance Report"
                        onPress={() => {}}
                    />
                    <View style={styles.cardDivider} />
                    <ActionRow
                        iconName="ban"
                        iconBg="rgba(244,63,94,0.12)"
                        iconColor="#F43F5E"
                        label="Revoke Partner Access"
                        danger
                        onPress={() => {}}
                    />
                </Animated.View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.nodeId}>ID • {host._id}</Text>
                    <Text style={styles.securityTag}>🔐 Authorized Personnel Only</Text>
                </View>
            </ScrollView>
        </View>
    );
}

function SectionLabel({ title }: { title: string }) {
    return <Text style={styles.sectionLabel}>{title}</Text>;
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
    return (
        <View style={[styles.statCard, { borderColor: `${color}20` }]}>
            <LinearGradient colors={[`${color}20`, `${color}08`]} style={styles.statIconBg}>
                <MaterialIcons name={icon as any} size={18} color={color} />
            </LinearGradient>
            <Text style={[styles.statValue, { color }]}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

function ContactRow({ icon, iconBg, iconColor, label, value, onPress, disabled }: any) {
    return (
        <TouchableOpacity style={styles.cardRow} onPress={onPress} disabled={disabled} activeOpacity={0.7}>
            <View style={[styles.rowIconBox, { backgroundColor: iconBg }]}>
                <Ionicons name={icon} size={20} color={iconColor} />
            </View>
            <View style={styles.rowBody}>
                <Text style={styles.rowLabel}>{label}</Text>
                <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
            </View>
            {!disabled && <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />}
        </TouchableOpacity>
    );
}

function ActionRow({ iconName, iconBg, iconColor, label, onPress, danger }: any) {
    return (
        <TouchableOpacity style={styles.cardRow} onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.rowIconBox, { backgroundColor: iconBg }]}>
                <Ionicons name={iconName} size={20} color={iconColor} />
            </View>
            <Text style={[styles.rowValue, { flex: 1, color: danger ? '#F43F5E' : '#FFF' }]}>{label}</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    ambientGlow: {
        position: 'absolute', top: -100, left: '15%',
        width: width * 0.7, height: width * 0.7,
        borderRadius: width * 0.35, opacity: 0.6,
    },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12,
    },
    headerBtn: {
        width: 42, height: 42, borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.06)',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    headerCenter: { alignItems: 'center' },
    headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.3 },
    headerSub: { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 2 },

    scrollContent: { paddingBottom: 80 },

    // Hero
    heroSection: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 },
    avatarWrapper: { width: 130, height: 130, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    spinRing: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 65, borderWidth: 1.5,
        borderStyle: 'dashed',
    },
    pulseRing: {
        position: 'absolute', width: 118, height: 118,
        borderRadius: 59, borderWidth: 2.5,
    },
    avatarShadow: {
        shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5, shadowRadius: 20, elevation: 20,
    },
    avatar: {
        width: 108, height: 108, borderRadius: 54,
        backgroundColor: '#111', borderWidth: 3, borderColor: '#111',
    },
    onlineDot: {
        position: 'absolute', bottom: 6, right: 6,
        width: 18, height: 18, borderRadius: 9,
        borderWidth: 3, borderColor: '#000',
        shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6,
    },
    displayName: { color: '#FFF', fontSize: 26, fontWeight: '900', letterSpacing: 0.2, textAlign: 'center' },
    username: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '700', marginTop: 4 },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 16, paddingVertical: 7,
        borderRadius: 40, marginTop: 14,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
    since: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '600', marginTop: 12 },

    // Stats Row
    statsRow: {
        flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 28,
    },
    statCard: {
        flex: 1, borderRadius: 22, borderWidth: 1,
        padding: 14, alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    statIconBg: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
    statValue: { fontSize: 12, fontWeight: '900', textAlign: 'center' },
    statLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center', letterSpacing: 0.5 },

    // Section
    sectionLabel: {
        color: 'rgba(255,255,255,0.3)', fontSize: 10,
        fontWeight: '900', letterSpacing: 2,
        textTransform: 'uppercase',
        marginLeft: 24, marginBottom: 10,
    },

    // Glass Card
    glassCard: {
        marginHorizontal: 20, marginBottom: 24,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 28, borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.07)',
        overflow: 'hidden',
    },
    cardDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginLeft: 76 },
    cardRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, gap: 16 },
    rowIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    rowBody: { flex: 1 },
    rowLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    rowValue: { color: '#FFF', fontSize: 14, fontWeight: '700', marginTop: 3 },

    // Footer
    footer: { alignItems: 'center', paddingVertical: 32, gap: 6 },
    nodeId: { color: 'rgba(255,255,255,0.1)', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
    securityTag: { color: 'rgba(255,255,255,0.15)', fontSize: 10, fontWeight: '700' },

    // States
    loadingText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 16, fontWeight: '600' },
    errorText: { color: '#F43F5E', fontSize: 16, fontWeight: '800', marginTop: 16 },
    retryBtn: {
        paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.06)', marginTop: 24,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    retryText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
});
