import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../../constants/design-system';
import { securityService } from '../../../services/securityService';
import { useToast } from '../../../context/ToastContext';

const { width } = Dimensions.get('window');

export default function StaffScannerScreen() {
    const { showToast } = useToast();
    const [permission, requestPermission] = useCameraPermissions();
    const [isScanning, setIsScanning] = useState(false);
    const [scannedTicket, setScannedTicket] = useState<any>(null);
    const [isVerifying, setIsVerifying] = useState(false);

    const handleBarCodeScanned = async ({ data }: { data: string }) => {
        if (isScanning || scannedTicket) return;
        setIsScanning(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        try {
            const res = await securityService.verifyTicket(data);
            if (res.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                setScannedTicket(res.data);
            }
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const msg = error.response?.data?.message || 'Invalid Ticket';
            showToast(`❌ ${msg}`, 'error');
            setIsScanning(false);
        }
    };

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
                setIsScanning(false);
            }
        } catch (error: any) {
             const msg = error.response?.data?.message || 'Check-in failed';
             showToast(`❌ ${msg}`, 'error');
        } finally {
            setIsVerifying(false);
        }
    };

    if (!permission) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;

    if (!permission.granted) {
        return (
            <View style={styles.center}>
                <Ionicons name="camera" size={60} color="rgba(255,255,255,0.1)" />
                <Text style={styles.permissionText}>Camera permission is required to scan tickets</Text>
                <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                    <Text style={styles.permissionBtnText}>GRANT PERMISSION</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                onBarcodeScanned={isScanning ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            >
                <SafeAreaView edges={['top']} style={styles.header}>
                    <View style={[styles.headerBlur, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
                        <Text style={styles.headerTitle}>GATE SCANNER</Text>
                    </View>
                </SafeAreaView>

                <View style={styles.overlay}>
                    <View style={styles.scanTarget}>
                        <View style={[styles.corner, styles.cornerTL]} />
                        <View style={[styles.corner, styles.cornerTR]} />
                        <View style={[styles.corner, styles.cornerBL]} />
                        <View style={[styles.corner, styles.cornerBR]} />
                    </View>
                    <Text style={styles.instruction}>Align QR code with the frame</Text>
                </View>
            </CameraView>

            {scannedTicket && (
                <View style={styles.reviewOverlay}>
                    <View style={[styles.reviewCard, { backgroundColor: 'rgba(20,20,20,0.95)' }]}>
                        <View style={styles.reviewHeader}>
                            <Text style={styles.reviewLabel}>ENTRY VERIFICATION</Text>
                            <TouchableOpacity onPress={() => { setScannedTicket(null); setIsScanning(false); }}>
                                <Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.3)" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.guestInfo}>
                            <View style={styles.avatarWrap}>
                                {scannedTicket.userId?.profileImage ? (
                                    <Image source={{ uri: scannedTicket.userId.profileImage }} style={styles.avatar} />
                                ) : (
                                    <View style={styles.avatarPlace}>
                                        <Text style={styles.avatarText}>{scannedTicket.userId?.name?.charAt(0) || '?'}</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.guestName}>{scannedTicket.userId?.name || 'Guest'}</Text>
                            <Text style={styles.ticketType}>{scannedTicket.ticketType?.toUpperCase() || 'GENERAL'}</Text>
                        </View>

                        <View style={styles.metaRow}>
                            <View style={styles.metaBox}>
                                <Text style={styles.metaLabel}>GUESTS</Text>
                                <Text style={styles.metaValue}>{scannedTicket.guests || 1}</Text>
                            </View>
                            <View style={styles.metaBox}>
                                <Text style={styles.metaLabel}>STATUS</Text>
                                <Text style={[styles.metaValue, { color: scannedTicket.status === 'checked_in' ? '#FF3B30' : '#34C759' }]}>
                                    {scannedTicket.status === 'checked_in' ? 'USED' : 'VALID'}
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: scannedTicket.status === 'checked_in' ? '#1A1A1A' : COLORS.primary }]}
                            onPress={handleConfirmEntry}
                            disabled={isVerifying || scannedTicket.status === 'checked_in'}
                        >
                            {isVerifying ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.actionBtnText}>
                                    {scannedTicket.status === 'checked_in' ? 'ALREADY ENTERED' : 'APPROVE ENTRY'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', padding: 40 },
    permissionText: { color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 20, fontSize: 16, lineHeight: 24 },
    permissionBtn: { marginTop: 30, backgroundColor: COLORS.primary, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 15 },
    permissionBtnText: { color: 'white', fontWeight: '900', letterSpacing: 1 },
    header: { position: 'absolute', top: 0, width: '100%', zIndex: 10 },
    headerBlur: { padding: 20, alignItems: 'center' },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
    overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scanTarget: { width: width * 0.7, height: width * 0.7, position: 'relative' },
    corner: { position: 'absolute', width: 40, height: 40, borderColor: COLORS.primary, borderWidth: 4, borderRadius: 5 },
    cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
    cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
    cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
    cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
    instruction: { color: 'white', marginTop: 40, fontSize: 16, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 10 },
    
    reviewOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    reviewCard: { padding: 30, paddingBottom: 50, borderTopLeftRadius: 40, borderTopRightRadius: 40, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
    reviewLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
    guestInfo: { alignItems: 'center', marginBottom: 30 },
    avatarWrap: { width: 90, height: 90, borderRadius: 30, borderWidth: 3, borderColor: COLORS.primary, padding: 4, marginBottom: 16 },
    avatar: { width: '100%', height: '100%', borderRadius: 25 },
    avatarPlace: { width: '100%', height: '100%', borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: 'white', fontSize: 32, fontWeight: '900' },
    guestName: { color: 'white', fontSize: 24, fontWeight: '900' },
    ticketType: { color: COLORS.primary, fontSize: 12, fontWeight: '900', letterSpacing: 3, marginTop: 4 },
    metaRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 20, gap: 20, marginBottom: 30 },
    metaBox: { flex: 1, alignItems: 'center' },
    metaLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '900', marginBottom: 4 },
    metaValue: { color: 'white', fontSize: 18, fontWeight: '900' },
    actionBtn: { height: 65, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    actionBtnText: { color: 'white', fontSize: 16, fontWeight: '900', letterSpacing: 1 }
});
