import React, { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions, Image, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS } from '../../constants/design-system';
import { useToast } from '../../context/ToastContext';
import { useAlert } from '../../context/AlertProvider';
import { securityService } from '../../services/securityService';
import { staffService } from '../../services/staffService';
import { useAuth } from '../../context/AuthContext';
import * as Haptics from 'expo-haptics';
import {
    useOpenIssues,
    useMyIssues,
    useResolvedIssues,
    useRespondToIssue,
    useResolveIssue,
    useSecuritySocket,
} from '../../hooks/useSecurityIssues';

type TabType = 'active' | 'in_progress' | 'history';

const { width, height } = Dimensions.get('window');

const PRIORITY_CONFIG: any = {
    medical: { color: '#FF3B30', icon: 'hospital-box', label: 'MEDICAL', grad: ['#FF3B3030', '#1A0B0B'] },
    harassment: { color: '#FF9500', icon: 'account-alert', label: 'HARASSMENT', grad: ['#FF950030', '#1A1005'] },
    fight: { color: '#AF52DE', icon: 'hand-back-fist', label: 'FIGHT', grad: ['#AF52DE30', '#160A1C'] },
    unsafe: { color: '#FFCC00', icon: 'eye-warning', label: 'UNSAFE', grad: ['#FFCC0030', '#1A1705'] },
    other: { color: '#FF8A00', icon: 'information', label: 'INFO', grad: ['#FF8A0030', '#1A0E05'] }
};

export default function SecurityPanel() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { logout, user: authUser } = useAuth();
    const { showToast } = useToast();
    const { showAlert } = useAlert();
    
    // UI States
    const [activeTab, setActiveTab] = useState<TabType>('active');
    const [profile, setProfile] = useState<any>(null);

    // Scanner States
    const [isScannerVisible, setIsScannerVisible] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const [isScanning, setIsScanning] = useState(false);
    const [scannedTicket, setScannedTicket] = useState<any>(null);
    const [isVerifying, setIsVerifying] = useState(false);

    // ── React Query hooks ─────────────────────────────────────────────────────
    const { data: openIssues = [], isLoading: openLoading, refetch: refetchOpen, isRefetching: openRefreshing } = useOpenIssues();
    const { data: myIssues = [], isLoading: myLoading, refetch: refetchMy, isRefetching: myRefreshing } = useMyIssues();
    const { data: resolvedIssues = [], isLoading: resolvedLoading, refetch: refetchResolved, isRefetching: resolvedRefreshing } = useResolvedIssues();
    const respondMutation = useRespondToIssue();
    const resolveMutation = useResolveIssue();

    // ── Real-time Socket.io ───────────────────────────────────────────────────
    useSecuritySocket();

    // Derive current list and loading state from active tab
    const issues = activeTab === 'active' ? openIssues : activeTab === 'in_progress' ? myIssues : resolvedIssues;
    const loading = activeTab === 'active' ? openLoading : activeTab === 'in_progress' ? myLoading : resolvedLoading;
    const refreshing = activeTab === 'active' ? openRefreshing : activeTab === 'in_progress' ? myRefreshing : resolvedRefreshing;

    const handleRefresh = useCallback(() => {
        if (activeTab === 'active') refetchOpen();
        else if (activeTab === 'in_progress') refetchMy();
        else refetchResolved();
    }, [activeTab, refetchOpen, refetchMy, refetchResolved]);

    const fetchProfile = async () => {
        try {
            const res = await staffService.getProfile();
            if (res.success) setProfile(res.data);
        } catch (err) {
            // Silent error
        }
    };

    useFocusEffect(useCallback(() => { fetchProfile(); }, []));

    const handleRespond = useCallback(async (issueId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        try {
            await respondMutation.mutateAsync(issueId);
            showToast('🚨 Incident Claimed. Dispatched.', 'info');
            setActiveTab('in_progress');
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to claim incident', 'error');
        }
    }, [respondMutation, showToast]);

    const handleResolve = useCallback(async (issueId: string) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
            await resolveMutation.mutateAsync(issueId);
            showToast('✅ Situation Secured', 'success');
        } catch (error) {
            showToast('Sync failed.', 'error');
        }
    }, [resolveMutation, showToast]);

    // 🎟️ QR Scan Handler - Fetch Real Data
    const handleBarCodeScanned = async ({ data }: { data: string }) => {
        if (isScanning) return;
        setIsScanning(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        try {
            // Real API Call to get guest/ticket info
            const res = await securityService.verifyTicket(data);
            if (res.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                setScannedTicket(res.data);
            }
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            
            // If server returns data (like "Already Entered"), we show it so guard can verify identity
            if (error.response?.data?.data) {
                setScannedTicket(error.response.data.data);
                return;
            }

            const msg = error.response?.data?.message || 'Invalid Ticket';
            showToast(`❌ ${msg}`, 'error');
            setIsScanning(false);
        }
    };

    // ✅ Confirm Check-in - Real Database Sync
    const handleConfirmEntry = async () => {
        if (!scannedTicket) return;
        setIsVerifying(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const res = await securityService.confirmEntry(scannedTicket._id);
            if (res.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showToast('✅ ACCESS GRANTED', 'success');
                setScannedTicket(null);
                setIsScannerVisible(false);
                setIsScanning(false);
                // Trigger any history Refresh here
            }
        } catch (error: any) {
             const msg = error.response?.data?.message || 'Check-in failed';
             showToast(`❌ ${msg}`, 'error');
        } finally {
            setIsVerifying(false);
        }
    };

    const openScanner = async () => {
        if (!permission?.granted) {
            const { granted } = await requestPermission();
            if (!granted) {
                showToast('Camera permission required for gate scanning', 'error');
                return;
            }
        }
        setIsScannerVisible(true);
    };

    const getTimeAgo = (date: string) => {
        const diff = Math.floor((new Date().getTime() - new Date(date).getTime()) / 60000);
        return diff <= 0 ? 'Recently' : `${diff}m ago`;
    };

    // Rock-solid tableId decoder — handles composite slugs like "69dcf6d6_s69" from DB
    const sanitizeTableId = (val: string) => {
        if (!val) return 'FLOOR';
        const trimmed = val.trim();
        if (!trimmed || trimmed === 'N/A' || trimmed === '--' || trimmed === 'General Entry') return 'FLOOR';
        // Already a clean short value
        if (trimmed.length <= 10) return trimmed.toUpperCase();
        // Pattern: {hexId}_s{seatNumber} — extract seat number (e.g. "69dcf6d6_s69" → "SEAT 69")
        const seatMatch = trimmed.match(/_s(\d+)$/i);
        if (seatMatch) return `SEAT ${seatMatch[1]}`;
        // Try splitting and finding readable part
        const parts = trimmed.split(/[-_]/);
        const readable = parts.find(p => p.length < 8 && /[A-Za-z0-9]/.test(p) && !/^[a-f0-9]{6,}$/i.test(p));
        if (readable) return readable.toUpperCase();
        // Pure garbage (long hex ObjectId with no seat suffix)
        return 'FLOOR';
    };

    const sanitizeZone = (val: string) => {
        if (!val) return 'GENERAL';
        const trimmed = val.trim().toUpperCase();
        // If it's a ticket type like 'General Access Zone', shorten it
        const knownMapping: Record<string, string> = {
            'GENERAL ACCESS ZONE': 'GENERAL',
            'GENERAL': 'GENERAL',
            'MAIN FLOOR': 'FLOOR',
            'VIP': 'VIP',
            'VVIP': 'VVIP',
        };
        return knownMapping[trimmed] || trimmed.split(' ')[0]; // Take first word if unknown
    };

    const renderIssueCard = ({ item: issue }: { item: any }) => {
        const theme = PRIORITY_CONFIG[issue.type] || PRIORITY_CONFIG.other;
        const isActive = activeTab === 'active';
        const isInProgress = activeTab === 'in_progress';
        
        const isCritical = issue.type && issue.type !== 'other' && PRIORITY_CONFIG[issue.type];
        
        return (
            <View style={[styles.issueCard, { shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 15 }]}>
                <LinearGradient
                    colors={['rgba(25, 20, 15, 0.9)', 'rgba(10, 8, 5, 0.95)', '#050505']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.cardContent}
                >
                    {/* Sleek Saffron Accent Border */}
                    <LinearGradient 
                        colors={[theme.color, 'transparent']} 
                        style={styles.cardGlowBorder} 
                    />

                    <View style={styles.cardHeader}>
                        <View style={styles.headerL}>
                            <View style={[styles.iconBox, { backgroundColor: `${theme.color}15`, borderColor: `${theme.color}30` }]}>
                                <MaterialCommunityIcons name={theme.icon} size={22} color={theme.color} />
                            </View>
                            <View>
                                <Text style={[styles.typeLabel, { color: theme.color }]}>{theme.label} ALERT</Text>
                                <Text style={styles.timeLabel}>{getTimeAgo(issue.createdAt)}</Text>
                            </View>
                        </View>
                        <View style={[styles.priorityTag, { borderColor: `${theme.color}30`, backgroundColor: `${theme.color}10` }]}>
                            <View style={[styles.priorityDot, { backgroundColor: theme.color }]} />
                            <Text style={[styles.priorityText, { color: 'white' }]}>{isCritical ? 'CRITICAL' : 'NORMAL'}</Text>
                        </View>
                    </View>

                    <View style={[styles.locationStrip, { backgroundColor: 'rgba(0,0,0,0.4)', borderColor: `${theme.color}20`, borderWidth: 1 }]}>
                        <View style={styles.stripItem}>
                            <Text style={styles.stripLabel}>ZONE</Text>
                            <Text style={[styles.stripValue, { color: 'white' }]}>{sanitizeZone(issue.zone)}</Text>
                        </View>
                        <View style={styles.stripDivider} />
                        <View style={styles.stripItem}>
                            <Text style={styles.stripLabel}>TABLE</Text>
                            <Text style={[styles.stripValue, { color: theme.color }]}>
                                {sanitizeTableId(issue.tableId)}
                            </Text>
                        </View>
                        <View style={styles.stripDivider} />
                        <View style={styles.stripItem}>
                            <Text style={styles.stripLabel}>USER</Text>
                            <Text style={[styles.stripValue, { color: 'white' }]} numberOfLines={1}>{issue.displayName || issue.userName || issue.userId?.name || 'Guest'}</Text>
                        </View>
                    </View>

                    <View style={styles.messageBox}>
                        <Text style={styles.messageText}>"{issue.message}"</Text>
                    </View>

                    {isActive && (
                        <TouchableOpacity 
                            style={styles.actionBtnWrapper}
                            onPress={() => handleRespond(issue._id)}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#F59E0B', '#B45309']} // Premium Dark Saffron Gradient
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.actionBtnGlowing}
                            >
                                <Text style={styles.actionTextDark}>RESPOND NOW</Text>
                                <Ionicons name="flash-outline" size={18} color="#111" />
                            </LinearGradient>
                        </TouchableOpacity>
                    )}

                    {isInProgress && (
                        <TouchableOpacity 
                            style={styles.actionBtnWrapper}
                            onPress={() => handleResolve(issue._id)}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#10B981', '#059669']}
                                style={styles.actionBtnGlowing}
                            >
                                <Text style={styles.actionText}>RESOLVE SECURELY</Text>
                                <Ionicons name="shield-checkmark" size={18} color="white" />
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                </LinearGradient>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0F0F0F', '#050510']} style={StyleSheet.absoluteFill} />
            <SafeAreaView edges={['top']} style={styles.safeContainer}>
                
                {/* Header Container */}
                <View style={[styles.topHeader, { paddingTop: insets.top > 0 ? 10 : 20 }]}>
                    <View style={styles.officerRow}>
                        <TouchableOpacity 
                            style={styles.avatarWrap} 
                            onPress={() => router.push('/(settings)/edit-profile')}
                            activeOpacity={0.8}
                        >
                            {profile?.profileImage ? (
                                <Image source={{ uri: profile.profileImage }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarText}>{profile?.name?.slice(0, 1).toUpperCase() || 'G'}</Text>
                                </View>
                            )}
                            <View style={styles.liveDot} />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.badgeId}>GUARD #{profile?._id?.slice(-4).toUpperCase() || '0000'}</Text>
                            <Text style={styles.officerName}>{profile?.username || profile?.name || 'Security'}</Text>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                         <TouchableOpacity 
                            style={styles.logoutCircle} 
                            onPress={() => {
                                showAlert(
                                    'Secure Logout',
                                    'Are you sure you want to sign out from the Tactical Panel?',
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        { text: 'Logout', style: 'destructive', onPress: async () => await logout() }
                                    ]
                                );
                            }}
                        >
                            <Ionicons name="power" size={20} color="#FF3B30" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Venue Assignment Bar */}
                {profile?.hostId && (
                    <View style={styles.venueBar}>
                        <Ionicons name="shield-checkmark" size={14} color="#FF3B30" />
                        <Text style={styles.venueName}>SECURE PERIMETER: {profile.hostId.name?.toUpperCase() || profile.hostId.businessName?.toUpperCase() || 'VENUE'}</Text>
                    </View>
                )}

                {/* Gate Control Button */}
                <TouchableOpacity 
                    style={styles.gateControlBtn} 
                    onPress={openScanner}
                    activeOpacity={0.9}
                >
                    <LinearGradient
                        colors={[COLORS.primary, '#6366F1']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0.5 }}
                        style={styles.gateGradient}
                    >
                        <View style={styles.gateLeft}>
                            <View style={styles.gateIconBg}>
                                <Ionicons name="qr-code" size={24} color="white" />
                            </View>
                            <View>
                                <Text style={styles.gateTitle}>GATE CONTROL</Text>
                                <Text style={styles.gateSub}>Scan digital tickets for entry</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="white" opacity={0.5} />
                    </LinearGradient>
                </TouchableOpacity>

                {/* Tabs */}
                <View style={styles.tabWrapper}>
                    <View style={styles.tabContainer}>
                        {(['active', 'in_progress', 'history'] as TabType[]).map((tab) => (
                            <TouchableOpacity 
                                key={tab} 
                                style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]} 
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    setActiveTab(tab);
                                }}
                            >
                                <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
                                    {tab === 'active' ? 'ALERTS' : tab === 'in_progress' ? 'ACTIVE' : 'LOGS'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={issues}
                        keyExtractor={(it) => it._id}
                        renderItem={renderIssueCard}
                        contentContainerStyle={styles.listArea}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyWrap}>
                                <View style={styles.shieldIconBg}>
                                    <MaterialCommunityIcons name="security-network" size={80} color="rgba(255,255,255,0.03)" />
                                </View>
                                <Text style={styles.emptyTitle}>ALL CLEAR</Text>
                                <Text style={styles.emptySub}>No security incidents reported in your zone.</Text>
                            </View>
                        )}
                    />
                )}
            </SafeAreaView>

            {/* QR Scanner Modal */}
            <Modal visible={isScannerVisible} animationType="slide" transparent={false}>
                <View style={styles.scannerModal}>
                    <CameraView
                        style={StyleSheet.absoluteFill}
                        facing="back"
                        onBarcodeScanned={isScanning ? undefined : handleBarCodeScanned}
                        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                    />

                    {/* All overlays go OUTSIDE CameraView using absolute positioning */}
                    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                        <View style={[styles.scannerHeader, { backgroundColor: 'rgba(3, 3, 3, 0.85)' }]}>
                           <View style={styles.scannerHeaderInner}>
                                <Text style={styles.scannerTitle}>GATE SCANNER</Text>
                                <TouchableOpacity 
                                    style={styles.closeScanner} 
                                    onPress={() => setIsScannerVisible(false)}
                                >
                                    <Ionicons name="close" size={24} color="white" />
                                </TouchableOpacity>
                           </View>
                        </View>
                        
                        <View style={styles.scannerOverlay}>
                            <View style={styles.scanTarget}>
                                <View style={[styles.corner, styles.cornerTL]} />
                                <View style={[styles.corner, styles.cornerTR]} />
                                <View style={[styles.corner, styles.cornerBL]} />
                                <View style={[styles.corner, styles.cornerBR]} />
                                {isScanning && (
                                    <View style={styles.scanProgress}>
                                        <ActivityIndicator color={COLORS.primary} />
                                    </View>
                                )}
                            </View>
                            <Text style={styles.scanInstruction}>Place the ticket QR code within the frame</Text>
                        </View>
                    </View>

                    {/* 🛡️ ELITE GUEST VERIFICATION MODAL */}
                    {scannedTicket && (
                        <View style={styles.reviewOverlay}>
                            <View style={[styles.reviewCard, { backgroundColor: 'rgba(15, 15, 15, 0.98)' }]}>
                                
                                {/* 🏷️ Status Header - Vertical Clean Stack */}
                                <View style={styles.reviewStatusHeader}>
                                     <View style={[styles.statusBadge, { backgroundColor: scannedTicket.status === 'checked_in' ? 'rgba(255, 59, 48, 0.1)' : 'rgba(52, 199, 89, 0.1)' }]}>
                                        <Text style={[styles.statusBadgeText, { color: scannedTicket.status === 'checked_in' ? '#FF3B30' : '#34C759' }]}>
                                            {scannedTicket.status === 'checked_in' ? '⚠️ WARNING: USED' : '✓ VALID ENTRY'}
                                        </Text>
                                     </View>
                                     <View style={styles.accessMessageRow}>
                                        <Ionicons 
                                            name={scannedTicket.status === 'checked_in' ? "warning" : "checkmark-circle"} 
                                            size={28} 
                                            color={scannedTicket.status === 'checked_in' ? '#FF3B30' : '#34C759'} 
                                        />
                                        <Text style={[styles.accessText, { color: scannedTicket.status === 'checked_in' ? '#FF3B30' : '#34C759' }]}>
                                            {scannedTicket.status === 'checked_in' ? 'ACCESS DENIED' : 'ACCESS GRANTED'}
                                        </Text>
                                     </View>
                                </View>

                                <View style={styles.reviewBody}>
                                    <View style={styles.guestAvatarWrap}>
                                        {scannedTicket.guest?.image ? (
                                            <Image source={{ uri: scannedTicket.guest.image }} style={styles.guestAvatar} />
                                        ) : (
                                            <View style={styles.guestAvatarPlaceholder}>
                                                <Text style={styles.guestAvatarText}>{scannedTicket.guest?.name?.slice(0,1).toUpperCase() || 'G'}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.guestName}>{scannedTicket.guest?.name || 'Guest Member'}</Text>
                                    <View style={[styles.typeBadge, { borderColor: COLORS.primary + '30' }]}>
                                        <Text style={styles.ticketType}>{scannedTicket.ticketType || 'GENERAL'}</Text>
                                    </View>
                                </View>
                                
                                <View style={styles.ticketMeta}>
                                    <View style={styles.metaBox}>
                                        <Text style={styles.metaLabel}>GUEST ENTRIES</Text>
                                        <Text style={styles.metaValue}>
                                            {(scannedTicket.enteredCount || 0)} / {(scannedTicket.guests || 1)}
                                        </Text>
                                        <Text style={styles.metaSub}>
                                            {(scannedTicket.remainingGuests || 0)} REMAINING
                                        </Text>
                                    </View>
                                    <View style={styles.metaDivider} />
                                    <View style={styles.metaBox}>
                                        <Text style={styles.metaLabel}>LOCATION/TABLE</Text>
                                        <Text style={styles.metaValue}>{scannedTicket.tableId || 'GENERAL'}</Text>
                                        <Text style={styles.metaSub}>ASSIGNED ZONE</Text>
                                    </View>
                                </View>

                                <View style={styles.reviewActions}>
                                    <TouchableOpacity 
                                        style={styles.cancelBtn} 
                                        onPress={() => {
                                            setScannedTicket(null);
                                            setIsScanning(false);
                                        }}
                                    >
                                        <Text style={styles.cancelBtnText}>CLOSE</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity 
                                        style={[styles.approveBtn, (isVerifying || scannedTicket.status === 'checked_in') && { opacity: 0.5 }]} 
                                        onPress={handleConfirmEntry}
                                        disabled={isVerifying || scannedTicket.status === 'checked_in'}
                                    >
                                        <LinearGradient
                                            colors={scannedTicket.status === 'checked_in' ? ['#333', '#222'] : [COLORS.primary, '#6366F1']}
                                            style={styles.approveGrad}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                        >
                                            {isVerifying ? (
                                                <ActivityIndicator color="white" />
                                            ) : (
                                                <>
                                                    <Text style={styles.approveText}>
                                                        {scannedTicket.status === 'checked_in' ? 'ALREADY IN' : 'APPROVE ENTRY'}
                                                    </Text>
                                                    <Ionicons name="chevron-forward" size={18} color="white" />
                                                </>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    )}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    safeContainer: { flex: 1 },
    topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15 },
    officerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatarWrap: { position: 'relative' },
    avatar: { width: 50, height: 50, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    avatarPlaceholder: { width: 50, height: 50, borderRadius: 18, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    avatarText: { color: 'white', fontSize: 20, fontWeight: '900' },
    liveDot: { position: 'absolute', top: -2, right: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#10B981', borderWidth: 3, borderColor: '#000' },
    badgeId: { color: COLORS.primary, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    bigDecision: { fontSize: 24, fontWeight: '900', marginTop: 4, letterSpacing: 1 },
    officerName: { color: 'white', fontSize: 20, fontWeight: '900' },
    logoutCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center' },
    
    venueBar: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', backgroundColor: 'rgba(255, 59, 48, 0.08)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, gap: 10, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255, 59, 48, 0.15)' },
    venueName: { color: '#FF3B30', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },

    gateControlBtn: { marginHorizontal: 20, borderRadius: 24, overflow: 'hidden', marginTop: 10, marginBottom: 20 },
    gateGradient: { padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    gateLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    gateIconBg: { width: 50, height: 50, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    gateTitle: { color: 'white', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
    gateSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },

    tabWrapper: { paddingHorizontal: 20, marginBottom: 15 },
    tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 100, padding: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 100 },
    tabBtnActive: { backgroundColor: 'rgba(255,255,255,0.05)' },
    tabLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
    tabLabelActive: { color: 'white' },

    listArea: { paddingHorizontal: 20, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    
    issueCard: { marginBottom: 18, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.15)', backgroundColor: '#050505', position: 'relative' },
    cardGlowBorder: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, zIndex: 10, opacity: 0.8 },
    cardContent: { padding: 22 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    headerL: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    iconBox: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    typeLabel: { fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
    timeLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 4, fontWeight: '700', letterSpacing: 0.5 },
    priorityTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
    priorityDot: { width: 6, height: 6, borderRadius: 3, shadowColor: '#FFF', shadowOpacity: 0.5, shadowRadius: 3, shadowOffset: { width: 0, height: 0 } },
    priorityText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    
    locationStrip: { flexDirection: 'row', borderRadius: 16, padding: 14, marginBottom: 22 },
    stripItem: { flex: 1, alignItems: 'center' },
    stripLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: '900', marginBottom: 6, letterSpacing: 1.5 },
    stripValue: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
    stripDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
    
    messageBox: { marginBottom: 24, backgroundColor: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
    messageText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 24, fontWeight: '400', fontStyle: 'italic', letterSpacing: 0.2 },
    
    actionBtnWrapper: { borderRadius: 18, shadowColor: '#B45309', shadowOpacity: 0.3, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
    actionBtnGlowing: { height: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    actionText: { color: 'white', fontSize: 15, fontWeight: '900', letterSpacing: 1.5 },
    actionTextDark: { color: '#111', fontSize: 15, fontWeight: '900', letterSpacing: 2 },
    
    emptyWrap: { alignItems: 'center', marginTop: 100 },
    shieldIconBg: { marginBottom: 20 },
    emptyTitle: { color: 'white', fontSize: 18, fontWeight: '900', letterSpacing: 1.5 },
    emptySub: { color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 8, textAlign: 'center' },

    // Scanner Styles
    scannerModal: { flex: 1, backgroundColor: '#000' },
    scannerHeader: { position: 'absolute', top: 0, width: '100%', zIndex: 10 },
    scannerHeaderInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
    scannerTitle: { color: 'white', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
    closeScanner: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    scannerOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scanTarget: { width: width * 0.7, height: width * 0.7, position: 'relative', justifyContent: 'center', alignItems: 'center' },
    scanInstruction: { color: 'white', marginTop: 40, fontSize: 15, fontWeight: '600', opacity: 0.8 },
    corner: { position: 'absolute', width: 40, height: 40, borderColor: COLORS.primary, borderWidth: 4 },
    cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 20 },
    cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 20 },
    cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 20 },
    cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 20 },
    scanProgress: { backgroundColor: 'rgba(0,0,0,0.5)', padding: 20, borderRadius: 100 },

    // 🛡️ Premium Review Modal Styles - Adaptive & Secure Fit
    reviewOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    reviewCard: { width: '100%', borderTopLeftRadius: 35, borderTopRightRadius: 35, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 60, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    
    reviewStatusHeader: { alignItems: 'center', marginBottom: 18 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, marginBottom: 8, overflow: 'hidden' },
    statusBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 2 },
    accessMessageRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    accessText: { fontSize: 22, fontWeight: '900', letterSpacing: 1 },

    reviewBody: { alignItems: 'center', marginBottom: 18 },
    guestAvatarWrap: { width: 75, height: 75, borderRadius: 28, borderWidth: 2, borderColor: COLORS.primary, padding: 3, marginBottom: 12 },
    guestAvatar: { width: '100%', height: '100%', borderRadius: 24 },
    guestAvatarPlaceholder: { width: '100%', height: '100%', borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    guestAvatarText: { color: 'white', fontSize: 32, fontWeight: '900' },
    guestName: { color: 'white', fontSize: 22, fontWeight: '900', marginBottom: 4 },
    typeBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    ticketType: { color: COLORS.primary, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    
    ticketMeta: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
    metaBox: { flex: 1, alignItems: 'center' },
    metaLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: '900', marginBottom: 4, letterSpacing: 1 },
    metaValue: { color: 'white', fontSize: 20, fontWeight: '900' },
    metaSub: { color: 'rgba(255,255,255,0.15)', fontSize: 9, fontWeight: '700', marginTop: 3 },
    metaDivider: { width: 1, height: '60%', backgroundColor: 'rgba(255,255,255,0.06)', alignSelf: 'center' },
    
    reviewActions: { flexDirection: 'row', gap: 12 },
    cancelBtn: { flex: 1, height: 52, borderRadius: 18, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    cancelBtnText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
    approveBtn: { flex: 2, height: 52, borderRadius: 18, overflow: 'hidden' },
    approveGrad: { width: '100%', height: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    approveText: { color: 'white', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
    approveBtnText: { color: 'white', fontSize: 14, fontWeight: '900', letterSpacing: 1 }
});
