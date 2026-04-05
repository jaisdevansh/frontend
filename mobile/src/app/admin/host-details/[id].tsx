import React from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Linking, Share, StatusBar
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, FontAwesome } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import adminService, { PendingHost } from '../../../services/adminService';

const COLORS = {
    primary: '#3b82f6',
    bg: '#000000',
    card: '#080808',
    border: 'rgba(255,255,255,0.06)',
    textWhite: '#ffffff',
    textDim: '#a0a0a0',
    success: '#10B981',
    warning: '#f59e0b',
    danger: '#F43F5E',
};

const Metric = ({ label, value, icon, color }: any) => (
    <View style={styles.metricCard}>
        <View style={[styles.metricIcon, { backgroundColor: `${color}15` }]}>
            <MaterialIcons name={icon} size={18} color={color} />
        </View>
        <View>
            <Text style={styles.metricLabel}>{label}</Text>
            <Text style={styles.metricValue}>{value}</Text>
        </View>
    </View>
);

export default function HostDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const { data: host, isLoading, error } = useQuery<PendingHost>({
        queryKey: ['admin-host-detail', id],
        queryFn: () => adminService.getHostDetails(id as string),
        enabled: !!id,
    });

    if (isLoading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Retrieving Partner Dossier...</Text>
            </View>
        );
    }

    if (error || !host) {
        return (
            <View style={[styles.container, styles.centered]}>
                <MaterialIcons name="error-outline" size={48} color={COLORS.danger} />
                <Text style={styles.errorText}>Partner retrieval failed</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
                    <Text style={styles.retryText}>Return to Registry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleCall = () => host.phone && Linking.openURL(`tel:${host.phone}`);
    const handleEmail = () => host.email && Linking.openURL(`mailto:${host.email}`);

    const getStatusColor = () => {
        switch (host.hostStatus) {
            case 'ACTIVE': return COLORS.success;
            case 'SUSPENDED': return COLORS.danger;
            case 'PENDING_VERIFICATION': return COLORS.warning;
            default: return COLORS.primary;
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" />
            
            {/* Header Identity Bar */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Partner Identity</Text>
                <TouchableOpacity style={styles.moreBtn}>
                    <MaterialIcons name="more-vert" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                
                {/* Profile Hero Section */}
                <View style={styles.heroSection}>
                    <View style={styles.avatarContainer}>
                        <Image 
                            source={{ uri: host.profileImage || `https://ui-avatars.com/api/?name=${host.fullName}&background=111&color=fff` }} 
                            style={styles.avatar}
                        />
                        <View style={[styles.statusRing, { borderColor: getStatusColor() }]} />
                    </View>
                    <Text style={styles.fullName}>{host.fullName}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}15` }]}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
                        <Text style={[styles.statusText, { color: getStatusColor() }]}>{host.hostStatus?.replace('_', ' ')}</Text>
                    </View>
                    
                    <Text style={styles.sinceDate}>Partner since {new Date(host.createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' })}</Text>
                </View>

                {/* Primary Intelligence Metrics */}
                <View style={styles.metricsGrid}>
                    <Metric label="Fiscal Status" value="Operational" icon="monetization-on" color={COLORS.success} />
                    <Metric label="Account Level" value="Host Pro" icon="star" color="#8b5cf6" />
                </View>

                {/* Contact Intelligence */}
                <Text style={styles.sectionHeader}>COMMUNICATION TERMINAL</Text>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.contactItem} onPress={handleCall} disabled={!host.phone}>
                        <View style={styles.contactIcon}><MaterialIcons name="phone" size={20} color={COLORS.primary} /></View>
                        <View style={styles.contactInfo}>
                            <Text style={styles.contactLabel}>Voice Frequency</Text>
                            <Text style={styles.contactValue}>{host.phone || 'Registry Missing'}</Text>
                        </View>
                        <MaterialIcons name="call" size={18} color={COLORS.textDim} />
                    </TouchableOpacity>
                    <View style={styles.divider} />
                    <TouchableOpacity style={styles.contactItem} onPress={handleEmail} disabled={!host.email}>
                        <View style={styles.contactIcon}><MaterialIcons name="alternate-email" size={20} color={COLORS.primary} /></View>
                        <View style={styles.contactInfo}>
                            <Text style={styles.contactLabel}>Encrypted Email</Text>
                            <Text style={styles.contactValue}>{host.email || 'Email Not Documented'}</Text>
                        </View>
                        <MaterialIcons name="mail" size={18} color={COLORS.textDim} />
                    </TouchableOpacity>
                </View>

                {/* Operational Control */}
                <Text style={styles.sectionHeader}>ADMINISTRATIVE CONTROL</Text>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.actionItem} onPress={() => router.push(`/admin/kyc-verification` as any)}>
                        <View style={[styles.actionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}><MaterialIcons name="verified" size={20} color={COLORS.success} /></View>
                        <Text style={styles.actionText}>Audit KYC Documentation</Text>
                        <MaterialIcons name="chevron-right" size={24} color={COLORS.textDim} />
                    </TouchableOpacity>
                    <View style={styles.divider} />
                    <TouchableOpacity style={styles.actionItem}>
                        <View style={[styles.actionIcon, { backgroundColor: 'rgba(244, 63, 94, 0.1)' }]}><MaterialIcons name="block" size={20} color={COLORS.danger} /></View>
                        <Text style={[styles.actionText, { color: COLORS.danger }]}>Revoke Access (Suspend)</Text>
                        <MaterialIcons name="chevron-right" size={24} color={COLORS.textDim} />
                    </TouchableOpacity>
                </View>

                <View style={styles.footerInfo}>
                    <Text style={styles.nodeId}>NODE_ID: {host._id}</Text>
                    <Text style={styles.securityText}>Authorized Administrative Personnel Only</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    centered: { justifyContent: 'center', alignItems: 'center', padding: 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
    headerTitle: { fontSize: 16, fontWeight: '800', color: '#FFF' },
    backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
    moreBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
    scrollContent: { paddingBottom: 60 },
    heroSection: { alignItems: 'center', marginTop: 24, marginBottom: 32 },
    avatarContainer: { width: 110, height: 110, justifyContent: 'center', alignItems: 'center' },
    avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#000' },
    statusRing: { ...StyleSheet.absoluteFillObject, borderRadius: 55, borderWidth: 3, borderStyle: 'dashed', opacity: 0.5 },
    fullName: { color: '#FFF', fontSize: 24, fontWeight: '900', marginTop: 20 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 10 },
    statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
    statusText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
    sinceDate: { color: COLORS.textDim, fontSize: 12, marginTop: 12, fontWeight: '600' },
    metricsGrid: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 32 },
    metricCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center', gap: 12 },
    metricIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    metricLabel: { color: COLORS.textDim, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    metricValue: { color: '#FFF', fontSize: 15, fontWeight: '800', marginTop: 2 },
    sectionHeader: { color: COLORS.textDim, fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginLeft: 24, marginBottom: 12 },
    card: { backgroundColor: COLORS.card, marginHorizontal: 20, borderRadius: 28, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginBottom: 24 },
    contactItem: { flexDirection: 'row', alignItems: 'center', padding: 18 },
    contactIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(59, 130, 246, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    contactInfo: { flex: 1 },
    contactLabel: { color: COLORS.textDim, fontSize: 11, fontWeight: '700' },
    contactValue: { color: '#FFF', fontSize: 15, fontWeight: '700', marginTop: 2 },
    divider: { height: 1, backgroundColor: COLORS.border, marginLeft: 78 },
    actionItem: { flexDirection: 'row', alignItems: 'center', padding: 18 },
    actionIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    actionText: { flex: 1, color: '#FFF', fontSize: 15, fontWeight: '800' },
    loadingText: { color: COLORS.textDim, fontSize: 14, marginTop: 16, fontWeight: '600' },
    errorText: { color: COLORS.danger, fontSize: 16, fontWeight: '800', marginTop: 16 },
    retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, backgroundColor: COLORS.card, marginTop: 24, borderWidth: 1, borderColor: COLORS.border },
    retryText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
    footerInfo: { padding: 40, alignItems: 'center' },
    nodeId: { color: COLORS.border, fontSize: 10, fontWeight: '800' },
    securityText: { color: COLORS.border, fontSize: 9, fontWeight: '700', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }
});
