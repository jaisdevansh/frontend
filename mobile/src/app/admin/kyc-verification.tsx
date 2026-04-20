import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput, Linking, ActivityIndicator, ScrollView, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../context/ToastContext';
import adminService, { PendingHost } from '../../services/adminService';

const COLORS = {
    primary: '#3b82f6',
    bg: '#000000',
    card: '#080808',
    textWhite: '#ffffff',
    textDim: '#a0a0a0',
    border: 'rgba(255,255,255,0.06)',
    success: '#10B981',
    danger: '#F43F5E',
};

export default function KYCVerification() {
    const insets = useSafeAreaInsets();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    
    const [selectedHost, setSelectedHost] = useState<PendingHost | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
 
    const { data: response, isLoading, refetch } = useQuery({
        queryKey: ['pending-hosts'],
        queryFn: () => adminService.getPendingHosts(1, 40),
        staleTime: 60000,
    });

    const hosts = response?.data || [];

    const verifyMutation = useMutation({
        mutationFn: ({ id, action, reason }: { id: string, action: 'approve' | 'reject', reason?: string }) => 
            adminService.verifyHost(id, action, reason),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['pending-hosts'] });
            setSelectedHost(null);
            setIsRejectModalVisible(false);
            setRejectReason('');
            showToast(`Host ${variables.action === 'approve' ? 'approved' : 'rejected'} successfully`, 'success');
        },
        onError: (error: any) => {
            showToast(error.response?.data?.message || 'Verification failed', 'error');
        }
    });

    const handleApprove = (hostId: string) => {
        if (verifyMutation.isPending) {
            showToast('Please wait, processing...', 'info');
            return;
        }
        verifyMutation.mutate({ id: hostId, action: 'approve' });
    };

    const handleReject = () => {
        if (!rejectReason.trim()) return showToast('Please provide a reason', 'error');
        if (selectedHost) verifyMutation.mutate({ id: selectedHost._id, action: 'reject', reason: rejectReason });
    };

    const renderHostCard = ({ item }: { item: PendingHost }) => (
        <TouchableOpacity style={styles.hostCard} onPress={() => setSelectedHost(item)}>
            <Image source={{ uri: item.profileImage || 'https://via.placeholder.com/150' }} style={styles.hostAvatar} />
            <View style={styles.hostInfo}>
                <Text style={styles.hostName}>{item.name}</Text>
                <Text style={styles.hostEmail}>{item.email || item.phone}</Text>
                <View style={styles.badgeLine}>
                    <View style={styles.pendingBadge}>
                        <Text style={styles.pendingText}>AWAITING REVIEW</Text>
                    </View>
                    <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.textDim} />
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" />
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Verifications</Text>
                    <Text style={styles.headerSubtitle}>{hosts.length} hosts awaiting review</Text>
                </View>
                <TouchableOpacity onPress={() => refetch()} style={styles.refreshBtn}>
                    <MaterialIcons name="refresh" size={20} color="#FFF" />
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={styles.centerBox}><ActivityIndicator size="large" color={COLORS.primary} /></View>
            ) : hosts.length === 0 ? (
                <View style={styles.centerBox}>
                    <MaterialIcons name="done-all" size={60} color={COLORS.success} />
                    <Text style={styles.emptyText}>All Clear</Text>
                    <Text style={styles.emptySubtext}>No pending KYC applications found.</Text>
                </View>
            ) : (
                <FlatList
                    data={hosts}
                    keyExtractor={(item) => item._id}
                    renderItem={renderHostCard}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={10}
                />
            )}

            <Modal visible={!!selectedHost && !isRejectModalVisible} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalContainer}>
                    <View style={[styles.modalHeader, { paddingTop: insets.top + 32 }]}>
                        <Text style={styles.modalTitle}>Examine Credentials</Text>
                        <TouchableOpacity onPress={() => setSelectedHost(null)}><Ionicons name="close" size={26} color="#FFF" /></TouchableOpacity>
                    </View>

                    {selectedHost && (
                        <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
                            <Image source={{ uri: selectedHost.profileImage }} style={styles.modalAvatar} />
                            <Text style={styles.modalName}>{selectedHost.name}</Text>
                            <Text style={styles.modalSub}>{selectedHost.email}</Text>

                            <View style={styles.divider} />
                            
                            <Text style={styles.sectionLabel}>KYC ATTACHMENTS</Text>
                            {(!selectedHost.kyc?.documents || selectedHost.kyc.documents.length === 0) ? (
                                <View style={styles.emptyKycBox}>
                                    <MaterialIcons name="hourglass-empty" size={30} color={COLORS.textDim} />
                                    <Text style={styles.emptyKycText}>Awaiting Document Upload</Text>
                                    <Text style={styles.emptyKycSub}>Host has not yet completed their onboarding flow.</Text>
                                </View>
                            ) : (
                                selectedHost.kyc?.documents.map((doc, idx) => (
                                    <TouchableOpacity key={idx} style={styles.docItem} onPress={() => Linking.openURL(doc.url)}>
                                        <View style={styles.docIconBox}><MaterialIcons name="description" size={20} color={COLORS.primary} /></View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.docType}>{doc.type}</Text>
                                            <Text style={styles.docStatus}>{doc.status}</Text>
                                        </View>
                                        <MaterialIcons name="open-in-new" size={18} color={COLORS.textDim} />
                                    </TouchableOpacity>
                                ))
                            )}

                            <View style={styles.modalFooter}>
                                <TouchableOpacity 
                                    style={[styles.approveBtn, (!selectedHost.kyc?.documents || selectedHost.kyc.documents.length === 0) && { opacity: 0.5 }]} 
                                    onPress={() => handleApprove(selectedHost._id)} 
                                    disabled={verifyMutation.isPending || (!selectedHost.kyc?.documents || selectedHost.kyc.documents.length === 0)}
                                >
                                    {verifyMutation.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Approve Host Account</Text>}
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={styles.rejectBtn} 
                                    onPress={() => setIsRejectModalVisible(true)}
                                    disabled={!selectedHost.kyc?.documents || selectedHost.kyc.documents.length === 0}
                                >
                                    <Text style={[styles.btnText, { color: COLORS.danger, opacity: (!selectedHost.kyc?.documents || selectedHost.kyc.documents.length === 0) ? 0.5 : 1 }]}>Reject Document</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    )}
                </View>
            </Modal>

            <Modal visible={isRejectModalVisible} animationType="fade" transparent={true}>
                <View style={styles.overlay}>
                    <View style={styles.dialogCard}>
                        <Text style={styles.dialogTitle}>Audit Rejection</Text>
                        <TextInput
                            style={styles.reasonInput}
                            value={rejectReason}
                            onChangeText={setRejectReason}
                            placeholder="Reason for flagging document..."
                            placeholderTextColor={COLORS.textDim}
                            multiline
                        />
                        <View style={styles.dialogActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsRejectModalVisible(false)}><Text style={styles.btnText}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.confirmBtn} onPress={handleReject} disabled={verifyMutation.isPending}><Text style={styles.btnText}>Confirm Rejection</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: { paddingHorizontal: 24, paddingVertical: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 28, fontWeight: '900', color: '#FFF' },
    headerSubtitle: { fontSize: 13, color: COLORS.textDim, marginTop: 4, fontWeight: '600' },
    refreshBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
    listContent: { padding: 24, paddingBottom: 100, gap: 16 },
    hostCard: { backgroundColor: COLORS.card, borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
    hostAvatar: { width: 60, height: 60, borderRadius: 18, backgroundColor: '#111' },
    hostInfo: { flex: 1, marginLeft: 16 },
    hostName: { color: '#FFF', fontSize: 17, fontWeight: '800' },
    hostEmail: { color: COLORS.textDim, fontSize: 13, marginTop: 2 },
    badgeLine: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
    pendingBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(245, 158, 11, 0.1)' },
    pendingText: { color: '#f59e0b', fontSize: 9, fontWeight: '900' },
    dateText: { color: COLORS.textDim, fontSize: 11, fontWeight: '600' },
    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { color: '#FFF', fontSize: 20, fontWeight: '900', marginTop: 16 },
    emptySubtext: { color: COLORS.textDim, fontSize: 14, marginTop: 8 },
    modalContainer: { flex: 1, backgroundColor: COLORS.bg },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    modalTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' },
    modalScroll: { flex: 1 },
    modalContent: { padding: 24, alignItems: 'center' },
    modalAvatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 20, borderWidth: 2, borderColor: COLORS.primary },
    modalName: { color: '#FFF', fontSize: 24, fontWeight: '900' },
    modalSub: { color: COLORS.textDim, fontSize: 14, marginTop: 4 },
    divider: { width: '100%', height: 1, backgroundColor: COLORS.border, marginVertical: 32 },
    sectionLabel: { alignSelf: 'flex-start', color: COLORS.textDim, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 16 },
    docItem: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
    docIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(59, 130, 246, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    docType: { color: '#FFF', fontSize: 15, fontWeight: '700' },
    docStatus: { color: COLORS.textDim, fontSize: 12, marginTop: 2 },
    modalFooter: { width: '100%', marginTop: 32, gap: 12 },
    approveBtn: { height: 56, borderRadius: 20, backgroundColor: COLORS.success, justifyContent: 'center', alignItems: 'center' },
    rejectBtn: { height: 56, borderRadius: 20, backgroundColor: 'rgba(244, 63, 94, 0.05)', borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.2)', justifyContent: 'center', alignItems: 'center' },
    btnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
    emptyKycBox: { padding: 40, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.border, width: '100%' },
    emptyKycText: { color: '#FFF', fontSize: 18, fontWeight: '800', marginTop: 12 },
    emptyKycSub: { color: COLORS.textDim, fontSize: 13, marginTop: 4, textAlign: 'center' },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 24 },
    dialogCard: { backgroundColor: COLORS.card, borderRadius: 28, padding: 24, borderWidth: 1, borderColor: COLORS.border },
    dialogTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', marginBottom: 20 },
    reasonInput: { backgroundColor: '#000', borderRadius: 20, padding: 16, color: '#FFF', height: 140, textAlignVertical: 'top', borderWidth: 1, borderColor: COLORS.border },
    dialogActions: { flexDirection: 'row', marginTop: 24, gap: 12 },
    cancelBtn: { flex: 1, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    confirmBtn: { flex: 1, height: 48, borderRadius: 24, backgroundColor: COLORS.danger, justifyContent: 'center', alignItems: 'center' }
});
