import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { COLORS } from '../../../constants/design-system';
import { useSecurityStore } from '../../../store/securityStore';

/**
 * ScannerView: Hyper-optimized QR scanner for rapid event entry.
 * Implements local cache lookup for sub-10ms validation feedback.
 * Uses Haptics for tactile confirmation of scan success.
 */
export const ScannerView = () => {
    const [permission, requestPermission] = useCameraPermissions();
    const lastScan = useSecurityStore(state => state.lastScan);
    const validationCache = useSecurityStore(state => state.validationCache);
    const setLastScan = useSecurityStore(state => state.setLastScan);
    const cacheTicketStatus = useSecurityStore(state => state.cacheTicketStatus);
    
    const [scanned, setScanned] = useState(false);
    const [localValidating, setLocalValidating] = useState(false);

    const processScan = useCallback(async (ticketId: string) => {
        if (scanned || localValidating) return;
        setScanned(true);
        setLocalValidating(true);

        // Instant Haptic Feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // STEP 1: Check Local Cache (Instant)
        const cachedStatus = validationCache[ticketId];
        if (cachedStatus) {
            setLastScan({
                _id: `scan_${Date.now()}`,
                ticketId,
                userName: 'Cached User',
                status: cachedStatus,
                timestamp: Date.now(),
                guestCount: 1,
                zone: 'Verified Zone'
            });
            setLocalValidating(false);
            return;
        }

        // STEP 2: Simulated Server Sync (Optimistic UI)
        try {
            // Mock API Result
            const status = ticketId.startsWith('TKT-') ? 'VALID' : 'INVALID';
            cacheTicketStatus(ticketId, status);
            setLastScan({
                _id: `scan_${Date.now()}`,
                ticketId,
                userName: status === 'VALID' ? 'Verified Guest' : 'Unknown',
                status,
                timestamp: Date.now(),
                guestCount: 1,
                zone: 'General Entry'
            });
        } finally {
            setLocalValidating(false);
        }
    }, [scanned, localValidating, validationCache, setLastScan, cacheTicketStatus]);

    const handleBarcodeScanned = useCallback(({ data }: { data: string }) => {
        processScan(data);
    }, [processScan]);

    const resetScanner = useCallback(() => {
        setScanned(false);
    }, []);

    const statusColor = useMemo(() => {
        if (!lastScan) return COLORS.primary;
        return lastScan.status === 'VALID' ? COLORS.emerald : '#FF3B30';
    }, [lastScan]);

    if (!permission) return <View style={styles.container} />;
    
    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <Ionicons name="camera-outline" size={64} color="gray" />
                <Text style={styles.permissionText}>Camera Access Required</Text>
                <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                    <Text style={styles.btnText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView
                style={styles.camera}
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            >
                <View style={styles.overlay}>
                    <View style={[styles.scannerFrame, { borderColor: scanned ? statusColor : 'rgba(255,255,255,0.3)' }]} />
                    
                    {localValidating && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="small" color="white" />
                        </View>
                    )}
                </View>
            </CameraView>

            {/* ─── Premium Modals for Scan Results ───────────────────────── */}
            <Modal visible={scanned && lastScan !== null} transparent animationType="fade">
                <View style={styles.modalBg}>
                    {lastScan?.status === 'VALID' ? (
                        /* SUCCESS MODAL (Green Theme) */
                        <View style={[styles.resultCard, styles.successCard]}>
                            {/* Header */}
                            <View style={styles.modalHeader}>
                                <TouchableOpacity onPress={resetScanner}>
                                    <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.5)" />
                                </TouchableOpacity>
                                <Text style={styles.modalHeaderTxt}>Guestlist Management</Text>
                                <Ionicons name="search" size={20} color="rgba(255,255,255,0.5)" />
                            </View>

                            {/* Glow & Icon */}
                            <View style={styles.iconGlowWrapper}>
                                <View style={[styles.glowRing, { borderColor: 'rgba(0, 208, 158, 0.1)' }]} />
                                <View style={[styles.glowRingInner, { borderColor: 'rgba(0, 208, 158, 0.2)' }]} />
                                <View style={[styles.statusIconBox, { backgroundColor: '#00D09E' }]}>
                                    <Ionicons name="checkmark-sharp" size={40} color="#050C16" />
                                </View>
                            </View>

                            <Text style={styles.resultTitle}>Check-in Successful</Text>
                            <View style={styles.titleUnderline} />

                            {/* Profile Card */}
                            <View style={styles.profileBox}>
                                <View style={styles.avatarWrapper}>
                                    <View style={styles.avatarPlaceholder}>
                                        <Ionicons name="person" size={40} color="rgba(255,255,255,0.2)" />
                                    </View>
                                    <View style={[styles.verifiedBadge, { backgroundColor: '#00D09E' }]}>
                                        <Ionicons name="shield-checkmark" size={10} color="#050C16" />
                                    </View>
                                </View>
                                <Text style={styles.profileName}>{lastScan.userName.toUpperCase() || 'USER NAME'}</Text>
                                <Text style={styles.verifiedTxt}>VERIFIED MEMBER</Text>
                                
                                <View style={styles.entryPill}>
                                    <View style={styles.entrySquare} />
                                    <Text style={styles.entryTxt}>Entry: 1/1</Text>
                                </View>
                            </View>

                            <View style={styles.bottomSection}>
                                <Text style={styles.timestampTxt}>
                                    ENTRY TIMESTAMP: {new Date(lastScan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>

                                <TouchableOpacity style={styles.actionBtnDark} onPress={resetScanner}>
                                    <Text style={styles.actionBtnTxt}>Done <Ionicons name="chevron-forward" size={12} /></Text>
                                </TouchableOpacity>

                                <Text style={styles.footerBranding}>PREMIUM NIGHTLIFE HOST V2.0</Text>
                            </View>
                        </View>
                    ) : (
                        /* REJECTED MODAL (Orange Theme) */
                        <View style={[styles.resultCard, styles.errorCard]}>
                            {/* Header */}
                            <View style={styles.modalHeader}>
                                <TouchableOpacity onPress={resetScanner}>
                                    <Ionicons name="close" size={20} color="rgba(255,255,255,0.5)" />
                                </TouchableOpacity>
                                <Text style={styles.modalHeaderTxt}>BOOTH SCANNER</Text>
                                <View style={{ width: 20 }} />
                            </View>

                            {/* Glow & Icon */}
                            <View style={styles.iconGlowWrapper}>
                                <View style={[styles.glowRing, { borderColor: 'rgba(249, 84, 32, 0.1)' }]} />
                                <View style={[styles.glowRingInner, { borderColor: 'rgba(249, 84, 32, 0.2)' }]} />
                                <View style={[styles.statusIconBox, { backgroundColor: '#F95420' }]}>
                                    <Text style={styles.exclamationTxt}>!</Text>
                                </View>
                            </View>

                            <View style={styles.pillTag}>
                                <Text style={styles.pillTagTxt}>SCAN FAILED</Text>
                            </View>

                            <Text style={styles.resultTitle}>Pass Invalid</Text>
                            <Text style={styles.errorSub}>
                                This VIP pass has already been used or is not registered for this booth.
                            </Text>

                            <View style={styles.errorDetailsBox}>
                                <View style={styles.errorRow}>
                                    <Text style={styles.errorKey}>ERROR CODE</Text>
                                    <Text style={styles.errorVal}>SEC-403-VIP</Text>
                                </View>
                                <View style={[styles.errorRow, { borderBottomWidth: 0, marginTop: 12 }]}>
                                    <Text style={styles.errorKey}>BOOTH ID</Text>
                                    <Text style={styles.errorVal}>MAIN_STAGE_A1</Text>
                                </View>
                            </View>

                            <View style={{ width: '100%', marginTop: 'auto', paddingBottom: 20 }}>
                                <TouchableOpacity style={styles.actionBtnOrange} onPress={resetScanner}>
                                    <Ionicons name="refresh" size={18} color="white" />
                                    <Text style={styles.actionBtnTxtOrange}>Try Again</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.actionBtnDarkRow} onPress={resetScanner}>
                                    <Text style={styles.actionBtnTxt}>Manual Entry</Text>
                                </TouchableOpacity>

                                <Text style={styles.supportTxt}>Need help? Contact VIP Support</Text>
                            </View>
                        </View>
                    )}
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black', borderRadius: 32, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    camera: { flex: 1 },
    overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
    scannerFrame: {
        width: 240,
        height: 240,
        borderWidth: 4,
        borderRadius: 40,
        backgroundColor: 'transparent',
    },
    permissionContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    permissionText: { color: 'white', fontSize: 16, marginTop: 16, marginBottom: 24, fontWeight: '600' },
    permissionBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16 },
    btnText: { color: 'white', fontWeight: '800' },
    loadingOverlay: {
        position: 'absolute',
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 12,
        borderRadius: 12,
    },
    // ─── Modal Styles ──────────────────────────────────────────
    modalBg: { flex: 1, backgroundColor: 'rgba(5, 12, 22, 0.95)', justifyContent: 'center', alignItems: 'center' },
    resultCard: { width: '100%', height: '100%', paddingHorizontal: 20, paddingTop: 40, alignItems: 'center' },
    successCard: { backgroundColor: '#080E16' },
    errorCard: { backgroundColor: '#1C100E' },

    modalHeader: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
    modalHeaderTxt: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '800', letterSpacing: 2 },

    iconGlowWrapper: { width: 140, height: 140, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    glowRing: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 1 },
    glowRingInner: { position: 'absolute', width: 100, height: 100, borderRadius: 50, borderWidth: 1 },
    statusIconBox: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 0 } },
    exclamationTxt: { color: 'white', fontSize: 36, fontWeight: '900', marginTop: -4 },

    resultTitle: { color: 'white', fontSize: 28, fontWeight: '800', marginBottom: 6 },
    titleUnderline: { width: 40, height: 3, backgroundColor: '#00D09E', borderRadius: 2, marginBottom: 30 },

    pillTag: { backgroundColor: 'rgba(249, 84, 32, 0.1)', borderWidth: 1, borderColor: 'rgba(249, 84, 32, 0.2)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
    pillTagTxt: { color: '#F95420', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },

    errorSub: { color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20, marginBottom: 30 },

    profileBox: { width: '100%', backgroundColor: '#0D141E', borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)', shadowColor: 'black', shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
    avatarWrapper: { marginBottom: 16 },
    avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 2, borderColor: '#00D09E', justifyContent: 'center', alignItems: 'center' },
    verifiedBadge: { position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#0D141E' },
    profileName: { color: 'white', fontSize: 18, fontWeight: '800', marginBottom: 6 },
    verifiedTxt: { color: '#00D09E', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 16 },
    entryPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    entrySquare: { width: 8, height: 8, backgroundColor: '#00D09E', borderRadius: 2, marginRight: 8 },
    entryTxt: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700' },

    errorDetailsBox: { width: '100%', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    errorRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 12 },
    errorKey: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
    errorVal: { color: 'white', fontSize: 12, fontWeight: '700' },

    bottomSection: { width: '100%', alignItems: 'center', marginTop: 'auto', paddingBottom: 20 },
    timestampTxt: { color: '#00D09E', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 20 },
    actionBtnDark: { backgroundColor: '#121822', paddingVertical: 18, paddingHorizontal: 40, borderRadius: 16, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    actionBtnDarkRow: { backgroundColor: '#1A1110', paddingVertical: 18, borderRadius: 16, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    actionBtnTxt: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '700' },
    
    actionBtnOrange: { backgroundColor: '#F95420', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 16, width: '100%', marginBottom: 12, shadowColor: '#F95420', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
    actionBtnTxtOrange: { color: 'white', fontSize: 16, fontWeight: '800', marginLeft: 8 },
    supportTxt: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 24, letterSpacing: 0.5 },
    footerBranding: { color: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: '800', letterSpacing: 2, marginTop: 30 }
});
