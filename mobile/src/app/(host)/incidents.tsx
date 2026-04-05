import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Modal, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStrictBack } from '../../hooks/useStrictBack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { useToast } from '../../context/ToastContext';
import { useAlert } from '../../context/AlertProvider';
import * as Haptics from 'expo-haptics';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { avatar, thumb, detail } from '../../services/cloudinaryService';
import { getSocket } from '../../lib/socketClient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

import { hostService } from '../../services/hostService';

export default function SecurityIncidents() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const goBack = useStrictBack('/(host)/dashboard');
    const { showToast } = useToast();
    const { showAlert } = useAlert();

    const [incidents, setIncidents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchIncidents = async () => {
        try {
            const res = await hostService.getIncidents();
            if (res.success) {
                setIncidents(res.data);
            }
        } catch (error) {
            console.error('Fetch Incidents:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIncidents();

        let socket: any;
        const initSocket = async () => {
            try {
                socket = await getSocket();
                socket.on('new_incident', (newReport: any) => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    setIncidents(prev => [newReport, ...prev]);
                });
            } catch (err) {
                console.log('Socket init error:', err);
            }
        };

        initSocket();
        return () => socket?.off('new_incident');
    }, []);

    const markResolved = async (id: string) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIncidents((prev: any[]) => prev.map((inc: any) => inc._id === id ? { ...inc, status: 'resolved' } : inc));
        showToast('Incident marked as resolved', 'success');
        
        try {
            await hostService.resolveIncident(id);
        } catch (error) {
            console.error('Resolve Incident:', error);
            showToast('Failed to resolve. Reverting...', 'error');
            fetchIncidents();
        }
    };

    const confirmDelete = (id: string, isResolved: boolean) => {
        if (!isResolved) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        showAlert(
            "Delete Incident",
            "Are you sure you want to delete this resolved incident record?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive",
                    onPress: async () => {
                        setIncidents((prev: any[]) => prev.filter((inc: any) => inc._id !== id));
                        showToast('Incident deleted', 'success');
                        try {
                            await hostService.deleteIncident(id);
                        } catch (error) {
                            console.error('Delete Incident:', error);
                            showToast('Failed to delete', 'error');
                            fetchIncidents();
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <View style={styles.headerTextGroup}>
                    <Text style={styles.headerTitle}>Security Console</Text>
                    <Text style={styles.headerSubtitle}>Live Incident Reports</Text>
                </View>
                <View style={[styles.liveIndicator, { backgroundColor: 'rgba(255, 69, 58, 0.1)' }]}>
                    <View style={[styles.liveDot, { backgroundColor: '#FF453A' }]} />
                    <Text style={[styles.liveTxt, { color: '#FF453A' }]}>ACTIVE</Text>
                </View>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#FF453A" />
                </View>
            ) : (
                    <FlashList
                        data={incidents}
                        keyExtractor={(item: any) => item._id}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        // @ts-ignore
                        estimatedItemSize={250}
                        onRefresh={fetchIncidents}
                        refreshing={loading}
                        ListHeaderComponent={() => (
                            incidents.filter((i: any) => i.status === 'open').length > 0 ? (
                                <Text style={styles.sectionTitle}>Open Reports</Text>
                            ) : null
                        )}
                        renderItem={({ item: incident }: { item: any }) => {
                            const isResolved = incident.status === 'resolved';
                            const statusColor = incident.priority ? '#FF3B30' : COLORS.gold;
                            const reporterName = incident.userId?.name || incident.userId?.firstName || 'Anonymous';
                            const reporterImg = avatar(incident.userId?.profileImage);

                            return (
                                <TouchableOpacity 
                                    style={[styles.card, isResolved && styles.cardResolved, incident.priority && !isResolved && styles.cardPriority]}
                                    activeOpacity={0.9}
                                    onLongPress={() => confirmDelete(incident._id, isResolved)}
                                >
                                    {/* Priority Indicator */}
                                    {incident.priority && !isResolved && (
                                        <View style={styles.priorityBadge}>
                                            <Ionicons name="flash" size={10} color="#FFF" />
                                            <Text style={styles.priorityTxt}>IMMEDIATE ACTION</Text>
                                        </View>
                                    )}

                                    {/* Card Header: Info + Time */}
                                    <View style={styles.cardHeaderRow}>
                                        <View style={styles.reporterInfo}>
                                            <Image 
                                                source={reporterImg} 
                                                style={styles.userAv} 
                                                transition={200}
                                                contentFit="cover"
                                            />
                                            <View>
                                                <Text style={[styles.incTitle, isResolved && styles.txtDimmed]}>{incident.title}</Text>
                                                <Text style={styles.incUser}>Reporting: {reporterName}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.incTime}>{new Date(incident.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                                    </View>

                                    {/* Description */}
                                    <Text style={[styles.incDesc, isResolved && styles.txtDimmed]}>{incident.description}</Text>

                                    {/* ⚡ EVIDENCE GALLERY: High-speed horizontal scroll */}
                                    {incident.images && incident.images.length > 0 && (
                                        <View style={styles.galleryContainer}>
                                            <ScrollView 
                                                horizontal 
                                                showsHorizontalScrollIndicator={false}
                                                contentContainerStyle={styles.galleryContent}
                                                decelerationRate="fast"
                                            >
                                                {incident.images.map((img: string, idx: number) => (
                                                    <TouchableOpacity 
                                                        key={`${incident._id}-img-${idx}`}
                                                        onPress={() => {
                                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                            setSelectedImage(img);
                                                        }}
                                                        activeOpacity={0.8}
                                                    >
                                                        <Image 
                                                            source={thumb(img)} 
                                                            style={styles.evidenceThumb} 
                                                            transition={300}
                                                            contentFit="cover"
                                                            cachePolicy="memory-disk"
                                                        />
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                            <View style={styles.evidenceLabel}>
                                                <Ionicons name="images" size={12} color="rgba(255,255,255,0.4)" />
                                                <Text style={styles.evidenceTxt}>{incident.images.length} Evidence Attached</Text>
                                            </View>
                                        </View>
                                    )}

                                    {/* Action Footer */}
                                    <View style={styles.footerRow}>
                                        <Text style={styles.categoryLabel}>{incident.category?.toUpperCase() || 'GENERAL'}</Text>
                                        {!isResolved ? (
                                            <TouchableOpacity 
                                                style={[styles.resolveBtn, { backgroundColor: statusColor }]} 
                                                onPress={() => markResolved(incident._id)}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name="shield-checkmark" size={16} color="#000" />
                                                <Text style={styles.resolveTxt}>MARK AS SAFE</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <View style={styles.resolvedBadge}>
                                                <Ionicons name="checkmark-circle" size={14} color="#34C759" />
                                                <Text style={styles.resolvedBadgeTxt}>STABILIZED</Text>
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                    />
                )}

            {/* Full-Screen OLED Viewer */}
            <Modal
                visible={!!selectedImage}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedImage(null)}
            >
                <View style={styles.modalBg}>
                    <TouchableOpacity 
                        style={styles.modalClose} 
                        onPress={() => setSelectedImage(null)}
                    >
                        <Ionicons name="close" size={28} color="white" />
                    </TouchableOpacity>
                    
                    {selectedImage && (
                        <Image 
                            source={detail(selectedImage)} 
                            style={styles.fullImg} 
                            contentFit="contain" 
                            transition={300}
                        />
                    )}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#030303' },
    header: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    headerTextGroup: { flex: 1 },
    headerTitle: { color: '#FFF', fontSize: 24, fontWeight: '800' },
    headerSubtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4, fontWeight: '600' },
    
    liveIndicator: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 6 },
    liveDot: { width: 8, height: 8, borderRadius: 4 },
    liveTxt: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },

    scrollContent: { paddingHorizontal: SPACING.lg, paddingBottom: 100 },
    sectionTitle: { color: '#FFF', fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, marginTop: 10 },
    
    card: { backgroundColor: '#0A0A0A', borderRadius: BORDER_RADIUS.xl, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    cardResolved: { backgroundColor: 'transparent', opacity: 0.6 },
    cardPriority: { borderColor: '#FF3B30', borderWidth: 1, backgroundColor: 'rgba(255, 59, 48, 0.02)' },
    priorityBadge: { position: 'absolute', top: -12, left: 20, backgroundColor: '#FF3B30', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100, flexDirection: 'row', alignItems: 'center', gap: 4 },
    priorityTxt: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    
    reporterInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    userAv: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)' },
    cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    incTitle: { color: '#FFF', fontSize: 18, fontWeight: '800', lineHeight: 22 },
    incTime: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700' },
    incDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 22, marginVertical: 8 },
    txtDimmed: { color: 'rgba(255,255,255,0.3)' },

    galleryContainer: { marginTop: 12, marginBottom: 4 },
    galleryContent: { gap: 10 },
    evidenceThumb: { width: 80, height: 80, borderRadius: BORDER_RADIUS.default, backgroundColor: 'rgba(255,255,255,0.05)' },
    evidenceLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    evidenceTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700' },
    
    footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', marginTop: 12 },
    categoryLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
    incUser: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '600', marginTop: 2 },
    resolveBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, gap: 6 },
    resolveTxt: { color: '#000', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
    resolvedBadge: { backgroundColor: 'rgba(52, 199, 89, 0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100, flexDirection: 'row', alignItems: 'center', gap: 6 },
    resolvedBadgeTxt: { color: '#34C759', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },

    // Modal
    modalBg: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
    modalClose: { position: 'absolute', top: 60, right: 24, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    fullImg: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.8 }
});
