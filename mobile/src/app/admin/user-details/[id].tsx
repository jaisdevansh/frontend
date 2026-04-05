import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, ScrollView, StatusBar, Linking
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import adminService, { AdminUser } from '../../../services/adminService';
import dayjs from 'dayjs';

const COLORS = {
    primary: '#3b82f6',
    bg: '#000000',
    card: '#080808',
    border: 'rgba(255,255,255,0.06)',
    textWhite: '#ffffff',
    textDim: '#a0a0a0',
    success: '#10B981',
    danger: '#F43F5E',
    warning: '#F59E0B',
};

const UserDetailScreen = () => {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const { data: user, isLoading, error } = useQuery<AdminUser & { bookings: any[] }>({
        queryKey: ['admin-user-detail', id],
        queryFn: () => adminService.getUserDetails(id as string),
        enabled: !!id,
    });

    if (isLoading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (error || !user) {
        return (
            <View style={[styles.container, styles.centered]}>
                <MaterialIcons name="error-outline" size={60} color={COLORS.danger} />
                <Text style={styles.errorText}>Failed to load user details</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtnLarge}>
                    <Text style={styles.backBtnText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleCall = () => {
        if (user.phone) Linking.openURL(`tel:${user.phone}`);
    };

    const handleEmail = () => {
        if (user.email) Linking.openURL(`mailto:${user.email}`);
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>User Dossier</Text>
                <TouchableOpacity style={styles.iconBtn}>
                    <MaterialIcons name="more-vert" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Profile Section */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <Image 
                            source={{ uri: user.profileImage || `https://ui-avatars.com/api/?name=${user.name}&background=111&color=fff&size=200` }} 
                            style={styles.avatar}
                            contentFit="cover"
                            transition={200}
                        />
                        <View style={[styles.statusIndicator, { backgroundColor: user.isActive ? COLORS.success : COLORS.danger }]} />
                    </View>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userRole}>{user.role?.toUpperCase() || 'USER'}</Text>
                    
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.actionBtn} onPress={handleCall} disabled={!user.phone}>
                            <Ionicons name="call" size={20} color={user.phone ? "#FFF" : COLORS.textDim} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={handleEmail} disabled={!user.email}>
                            <Ionicons name="mail" size={20} color={user.email ? "#FFF" : COLORS.textDim} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn}>
                            <Ionicons name="chatbubble-ellipses" size={20} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Info Cards */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Contact Intelligence</Text>
                    <View style={styles.infoCard}>
                        <InfoRow 
                            icon="mail-outline" 
                            label="Email Address" 
                            value={user.email || 'N/A'} 
                            isCopyable 
                        />
                        <View style={styles.divider} />
                        <InfoRow 
                            icon="phone-portrait-outline" 
                            label="Mobile Number" 
                            value={user.phone || 'N/A'} 
                            isCopyable 
                        />
                        <View style={styles.divider} />
                        <InfoRow 
                            icon="calendar-outline" 
                            label="Member Since" 
                            value={dayjs(user.createdAt).format('MMMM D, YYYY')} 
                        />
                        <View style={styles.divider} />
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Loyalty Points</Text>
                                <Text style={[styles.statValue, { color: COLORS.success }]}>{user.loyaltyPoints || 0}</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Account Type</Text>
                                <Text style={styles.statValue}>{user.role?.toUpperCase()}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Booking History */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Engagement Log</Text>
                        <Text style={styles.viewAll}>Recent 10</Text>
                    </View>
                    
                    {user.bookings && user.bookings.length > 0 ? (
                        user.bookings.map((booking: any) => (
                            <View key={booking._id} style={styles.bookingCard}>
                                <View style={styles.bookingInfo}>
                                    <Text style={styles.bookingTitle} numberOfLines={1}>
                                        {booking.eventId?.title || 'Private Event'}
                                    </Text>
                                    <Text style={styles.bookingDate}>
                                        {dayjs(booking.createdAt).format('MMM D, h:mm A')}
                                    </Text>
                                </View>
                                <View style={styles.bookingRight}>
                                    <Text style={styles.bookingPrice}>₹{booking.pricePaid}</Text>
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '15' }]}>
                                        <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                                            {booking.status.toUpperCase()}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyCard}>
                            <MaterialIcons name="history" size={32} color={COLORS.textDim} />
                            <Text style={styles.emptyText}>No recent engagements found</Text>
                        </View>
                    )}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
};

const InfoRow = ({ icon, label, value, isCopyable }: any) => (
    <View style={styles.infoRow}>
        <View style={styles.infoIconBg}>
            <Ionicons name={icon} size={18} color={COLORS.primary} />
        </View>
        <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
        {isCopyable && (
            <TouchableOpacity hitSlop={10}>
                <MaterialIcons name="content-copy" size={16} color={COLORS.textDim} />
            </TouchableOpacity>
        )}
    </View>
);

const getStatusColor = (status: string) => {
    switch(status.toLowerCase()) {
        case 'approved': return COLORS.success;
        case 'pending': return COLORS.warning;
        case 'cancelled': return COLORS.danger;
        default: return COLORS.textDim;
    }
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    centered: { justifyContent: 'center', alignItems: 'center' },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: 20, 
        paddingVertical: 15 
    },
    headerTitle: { color: COLORS.textWhite, fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
    iconBtn: { 
        width: 44, 
        height: 44, 
        borderRadius: 14, 
        backgroundColor: COLORS.card, 
        justifyContent: 'center', 
        alignItems: 'center', 
        borderWidth: 1, 
        borderColor: COLORS.border 
    },
    scrollContent: { paddingHorizontal: 20 },
    profileSection: { alignItems: 'center', marginTop: 20, marginBottom: 30 },
    avatarContainer: { position: 'relative' },
    avatar: { width: 110, height: 110, borderRadius: 36, backgroundColor: '#111' },
    statusIndicator: { 
        position: 'absolute', 
        bottom: 5, 
        right: 5, 
        width: 18, 
        height: 18, 
        borderRadius: 9, 
        borderWidth: 3, 
        borderColor: COLORS.bg 
    },
    userName: { color: COLORS.textWhite, fontSize: 24, fontWeight: '900', marginTop: 16 },
    userRole: { color: COLORS.primary, fontSize: 12, fontWeight: '900', marginTop: 4, letterSpacing: 2 },
    actionRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
    actionBtn: { 
        width: 50, 
        height: 50, 
        borderRadius: 18, 
        backgroundColor: COLORS.card, 
        justifyContent: 'center', 
        alignItems: 'center', 
        borderWidth: 1, 
        borderColor: COLORS.border 
    },
    actionBtnPrimary: { backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary + '40' },
    section: { marginBottom: 25 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { color: COLORS.textDim, fontSize: 13, fontWeight: '800', letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' },
    viewAll: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
    infoCard: { backgroundColor: COLORS.card, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: COLORS.border },
    infoRow: { flexDirection: 'row', alignItems: 'center' },
    infoIconBg: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(59,130,246,0.1)', justifyContent: 'center', alignItems: 'center' },
    infoTextContainer: { flex: 1, marginLeft: 15 },
    infoLabel: { color: COLORS.textDim, fontSize: 11, fontWeight: '600' },
    infoValue: { color: COLORS.textWhite, fontSize: 14, fontWeight: '700', marginTop: 2 },
    divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 15 },
    bookingCard: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: COLORS.card, 
        borderRadius: 20, 
        padding: 16, 
        borderWidth: 1, 
        borderColor: COLORS.border, 
        marginBottom: 10 
    },
    bookingInfo: { flex: 1 },
    bookingTitle: { color: COLORS.textWhite, fontSize: 15, fontWeight: '700' },
    bookingDate: { color: COLORS.textDim, fontSize: 12, marginTop: 4, fontWeight: '500' },
    bookingRight: { alignItems: 'flex-end' },
    bookingPrice: { color: COLORS.textWhite, fontSize: 14, fontWeight: '800', marginBottom: 6 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 9, fontWeight: '900' },
    emptyCard: { 
        alignItems: 'center', 
        paddingVertical: 40, 
        backgroundColor: COLORS.card, 
        borderRadius: 24, 
        borderWidth: 1, 
        borderColor: COLORS.border, 
        borderStyle: 'dashed' 
    },
    emptyText: { color: COLORS.textDim, fontSize: 13, fontWeight: '600', marginTop: 12 },
    errorText: { color: COLORS.textDim, fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 24 },
    backBtnLarge: { backgroundColor: COLORS.primary, paddingHorizontal: 30, paddingVertical: 14, borderRadius: 16 },
    backBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
    statsRow: { flexDirection: 'row', alignItems: 'center' },
    statItem: { flex: 1, alignItems: 'center' },
    statDivider: { width: 1, height: 25, backgroundColor: COLORS.border },
    statLabel: { color: COLORS.textDim, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    statValue: { color: COLORS.textWhite, fontSize: 16, fontWeight: '900' },
});

export default UserDetailScreen;
