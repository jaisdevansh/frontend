import React, { useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, StatusBar, ActivityIndicator, TextInput, RefreshControl, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PremiumToast, { ToastRef } from '../../components/PremiumToast';
import { useAuth } from '../../context/AuthContext';
import adminService from '../../services/adminService';
import { DashboardSkeleton } from '../../components/admin/AdminSkeleton';

const { width } = Dimensions.get('window');

const COLORS = {
    primary: '#3b82f6',
    backgroundDark: '#000000',
    cardDark: '#080808',
    glassBorder: 'rgba(255, 255, 255, 0.05)',
    textWhite: '#ffffff',
    textDim: '#a0a0a0',
    success: '#10B981',
    warning: '#f59e0b',
    danger: '#F43F5E',
};

const StatCard = React.memo(({ title, value, icon, color, trend, onPress }: any) => (
    <TouchableOpacity 
        style={styles.statCard} 
        onPress={onPress} 
        activeOpacity={onPress ? 0.7 : 1}
        disabled={!onPress}
    >
        <View style={styles.statCardHeader}>
            <View style={[styles.statIconBox, { backgroundColor: `${color}15` }]}>
                <MaterialIcons name={icon} size={20} color={color} />
            </View>
            {trend && (
                <View style={styles.trendBadge}>
                    <Text style={[styles.statTrend, { color: trend.startsWith('+') ? COLORS.success : COLORS.primary }]}>{trend}</Text>
                </View>
            )}
        </View>
        <Text style={styles.statLabel}>{title}</Text>
        <Text style={styles.statValue}>{value}</Text>
    </TouchableOpacity>
));

const RotatingIcon = ({ isFetching }: { isFetching: boolean }) => {
    const rotation = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (isFetching) {
            Animated.loop(
                Animated.timing(rotation, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                })
            ).start();
        } else {
            Animated.timing(rotation, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [isFetching]);

    const spin = rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <MaterialIcons name="insights" size={20} color={COLORS.primary} />
        </Animated.View>
    );
};

export default function SaaSAdminDashboard() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const toastRef = useRef<ToastRef>(null);
    const queryClient = useQueryClient();

    const { logout, user } = useAuth();
    const [newHostEmail, setNewHostEmail] = useState('');
    const [newHostPhone, setNewHostPhone] = useState('');
    const [isCreatingHost, setIsCreatingHost] = useState(false);

    // ── DATA FETCHING ────────────────────────────────────────────────────────
    
    // 1. Global Admin Stats — Instant from cache (5 min stale window)
    const { data: stats, isLoading: isStatsLoading, isRefetching } = useQuery({
        queryKey: ['admin-stats'],
        queryFn: adminService.getStats,
        staleTime: 5 * 60 * 1000, // 5 min — serve from cache, refresh silently
        gcTime: 15 * 60 * 1000,   // Keep in memory 15 min
        refetchOnMount: false,     // Don't re-fetch every tab switch
        refetchOnWindowFocus: false,
    });

    // 2. Silent pre-fetch all admin tabs so they open instantly
    React.useEffect(() => {
        // Fire and forget — pre-warms React Query cache for sub-pages
        queryClient.prefetchQuery({ queryKey: ['admin-hosts', 1], queryFn: () => adminService.getHosts(1, 25), staleTime: 5 * 60 * 1000 });
        queryClient.prefetchQuery({ queryKey: ['admin-users', 1], queryFn: () => adminService.getUsers(1, 25), staleTime: 5 * 60 * 1000 });
        queryClient.prefetchQuery({ queryKey: ['admin-bookings', 1], queryFn: () => adminService.getBookings(1, 30), staleTime: 5 * 60 * 1000 });
        queryClient.prefetchQuery({ queryKey: ['admin-staff'], queryFn: () => adminService.getStaff({}), staleTime: 5 * 60 * 1000 });
    }, []);

    const formatCurrency = (val?: number) => `₹${(val || 0).toLocaleString()}`;

    const handleOnboardHost = async () => {
        if (!newHostEmail.trim() && !newHostPhone.trim()) {
            return toastRef.current?.show({ title: 'Input Required', message: 'Email or phone required.', type: 'error' });
        }
        setIsCreatingHost(true);
        try {
            await adminService.createHost({ 
                email: newHostEmail.trim() || undefined, 
                phone: newHostPhone.trim() || undefined, 
                name: 'Authorized Partner' 
            });
            
            setNewHostEmail('');
            setNewHostPhone('');
            toastRef.current?.show({ title: 'Success', message: 'Invitation sent successfully.', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
            queryClient.invalidateQueries({ queryKey: ['admin-hosts'] });
            queryClient.invalidateQueries({ queryKey: ['pending-hosts'] });
        } catch (err: any) {
            toastRef.current?.show({ title: 'Error', message: 'Failed to provision host.', type: 'error' });
        } finally {
            setIsCreatingHost(false);
        }
    };

    if (isStatsLoading && !stats) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                 <DashboardSkeleton />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            <ScrollView 
                contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={() => queryClient.invalidateQueries()} tintColor={COLORS.primary} />
                }
            >
                <View style={styles.pageHeader}>
                    <View style={styles.headerLeft}>
                        <View style={styles.headerAvatarBox}>
                            {(user as any)?.profileImage ? (
                                <Image source={{ uri: (user as any).profileImage }} style={styles.headerAvatarImg} />
                            ) : (
                                <Text style={styles.headerAvatarText}>{( (user as any)?.name?.[0] || 'A').toUpperCase()}</Text>
                            )}
                        </View>
                        <View style={styles.headerTextGroup}>
                            <Text style={styles.greeting}>Command Center</Text>
                            <Text style={styles.adminName}>{(user as any)?.name || 'Tactical Admin'}</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.refreshBtn} onPress={() => queryClient.invalidateQueries()} disabled={isRefetching}>
                        <RotatingIcon isFetching={isRefetching} />
                    </TouchableOpacity>
                </View>

                {/* Optimized KPI Grid */}
                <View style={styles.statGrid}>
                    <StatCard title="Revenue" value={formatCurrency(stats?.totalRevenue)} icon="payments" color="#22c55e" trend="+12.4%" />
                    <StatCard title="Total Users" value={stats?.users || 0} icon="person" color={COLORS.primary} trend="LIFETIME" onPress={() => router.push('/admin/users' as any)} />
                    <StatCard title="Total Hosts" value={stats?.hosts || 0} icon="business" color={COLORS.warning} trend="PROVISIONED" onPress={() => router.push('/admin/hosts' as any)} />
                    <StatCard title="Verified" value={stats?.activeHosts || 0} icon="verified" color={COLORS.success} trend="ONBOARDED" onPress={() => router.push('/admin/hosts' as any)} />
                    <StatCard title="Bookings" value={stats?.bookings || 0} icon="confirmation-number" color="#8b5cf6" trend="TOTAL" onPress={() => router.push('/admin/bookings' as any)} />
                    <StatCard title="Pending" value={stats?.pendingHosts || 0} icon="hourglass-top" color={COLORS.danger} trend="KYC" onPress={() => router.push('/admin/kyc-verification' as any)} />
                </View>

                {/* Quick Action: Host Onboarding */}
                <Text style={styles.sectionHeader}>PROVISION NEW HOST</Text>
                <View style={styles.onboardCard}>
                    <View style={styles.inputGroup}>
                        <View style={styles.inputBox}>
                            <MaterialIcons name="alternate-email" size={18} color={COLORS.primary} />
                            <TextInput 
                                style={styles.input} 
                                placeholder="Host Email (Optional)" 
                                placeholderTextColor={COLORS.textDim}
                                value={newHostEmail}
                                onChangeText={setNewHostEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                        <View style={styles.inputBox}>
                            <MaterialIcons name="phone" size={18} color={COLORS.primary} />
                            <TextInput 
                                style={styles.input} 
                                placeholder="Phone (Optional)" 
                                placeholderTextColor={COLORS.textDim}
                                value={newHostPhone}
                                onChangeText={setNewHostPhone}
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>
                    
                    <TouchableOpacity style={[styles.onboardBtn, isCreatingHost && { opacity: 0.7 }]} onPress={handleOnboardHost} disabled={isCreatingHost}>
                        {isCreatingHost ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.onboardBtnText}>Invite Partner</Text>}
                    </TouchableOpacity>
                </View>

                {/* Optimized Navigation Shortcuts */}
                <Text style={styles.sectionHeader}>ADMINISTRATION</Text>
                <View style={styles.toolsList}>
                    {[
                        { title: 'Identity Registry', sub: 'Users & Permissions', icon: 'people-alt', path: '/admin/users', color: COLORS.primary },
                        { title: 'Host Registry', sub: 'Manage Partner Accounts', icon: 'business', path: '/admin/hosts', color: '#8b5cf6' },
                        { title: 'Host Verification', sub: `${stats?.pendingHosts || 0} applications pending`, icon: 'verified-user', path: '/admin/kyc-verification', color: COLORS.success },
                        { title: 'Global Staff', sub: 'Field personnel intel', icon: 'badge', path: '/admin/staff', color: COLORS.warning },
                        { title: 'Advanced Analytics', sub: 'Trends & Forecasting', icon: 'analytics', path: '#', color: COLORS.textDim },
                    ].map((tool, idx) => (
                        <TouchableOpacity key={idx} style={styles.toolCard} onPress={() => router.push(tool.path as any)} activeOpacity={0.7}>
                            <View style={[styles.toolIconBox, { backgroundColor: `${tool.color}15` }]}>
                                <MaterialIcons name={tool.icon as any} size={24} color={tool.color} />
                            </View>
                            <View style={styles.toolInfo}>
                                <Text style={styles.toolTitle}>{tool.title}</Text>
                                <Text style={styles.toolSubtitle}>{tool.sub}</Text>
                            </View>
                            <MaterialIcons name="chevron-right" size={24} color={COLORS.textDim} />
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            <PremiumToast ref={toastRef} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.backgroundDark },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
    pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerAvatarBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: COLORS.cardDark, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.glassBorder, overflow: 'hidden' },
    headerAvatarImg: { width: '100%', height: '100%' },
    headerAvatarText: { color: COLORS.primary, fontSize: 20, fontWeight: '900' },
    headerTextGroup: {},
    greeting: { fontSize: 24, fontWeight: '900', color: COLORS.textWhite, letterSpacing: -0.5 },
    adminName: { fontSize: 13, color: COLORS.primary, marginTop: 4, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    subGreeting: { fontSize: 13, color: COLORS.textDim, marginTop: 4, fontWeight: '600' },
    refreshBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.cardDark, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.glassBorder },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginBottom: 32 },
    statCard: { width: (width - 48 - 12) / 2, backgroundColor: COLORS.cardDark, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: COLORS.glassBorder },
    statCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    statIconBox: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    trendBadge: { paddingHorizontal: 6, paddingVertical: 2, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 6 },
    statTrend: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    statLabel: { color: COLORS.textDim, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 },
    statValue: { color: COLORS.textWhite, fontSize: 24, fontWeight: '900', marginTop: 6 },
    sectionHeader: { color: COLORS.textDim, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16, marginTop: 10 },
    onboardCard: { backgroundColor: COLORS.cardDark, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: COLORS.glassBorder, marginBottom: 32 },
    inputGroup: { gap: 12, marginBottom: 16 },
    inputBox: { height: 52, backgroundColor: COLORS.backgroundDark, borderRadius: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.glassBorder },
    input: { flex: 1, marginLeft: 12, color: COLORS.textWhite, fontSize: 14, fontWeight: '600' },
    onboardBtn: { height: 52, backgroundColor: COLORS.primary, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    onboardBtnText: { color: COLORS.textWhite, fontSize: 15, fontWeight: '800' },
    toolsList: { gap: 12 },
    toolCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardDark, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: COLORS.glassBorder },
    toolIconBox: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    toolInfo: { flex: 1, marginLeft: 16 },
    toolTitle: { color: COLORS.textWhite, fontSize: 16, fontWeight: '800' },
    toolSubtitle: { color: COLORS.textDim, fontSize: 12, marginTop: 2, fontWeight: '600' },
});
