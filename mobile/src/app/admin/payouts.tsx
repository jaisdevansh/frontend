import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, Dimensions, Modal, TextInput, Alert,
    RefreshControl, FlatList, Linking
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import adminService from '../../services/adminService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
    primary: '#3b82f6',
    background: '#000000',
    card: '#080808',
    text: '#ffffff',
    textDim: '#a0a0a0',
    success: '#10B981',
    danger: '#F43F5E',
    warning: '#f59e0b',
    border: 'rgba(255,255,255,0.05)'
};

interface PayoutRequest {
    _id: string;
    hostId: {
        _id: string;
        name: string;
        email: string;
        profileImage: string;
    };
    amount: number;
    status: 'PENDING' | 'COMPLETED' | 'REJECTED';
    bankDetails: {
        accountNumber: string;
        ifscCode: string;
        accountHolderName: string;
        upiId: string;
        bankName: string;
    };
    createdAt: string;
}

export default function AdminPayoutsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [requests, setRequests] = useState<PayoutRequest[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<PayoutRequest | null>(null);
    const [processModal, setProcessModal] = useState(false);
    const [adminNote, setAdminNote] = useState('');
    const [payoutId, setPayoutId] = useState('');

    const fetchRequests = useCallback(async () => {
        try {
            const res = await adminService.getPayoutRequests('PENDING');
            setRequests(res as any);
        } catch (error) {
            console.error('Admin Payout Fetch Error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchRequests(); }, [fetchRequests]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchRequests();
    };

    const handleProcess = async (status: 'COMPLETED' | 'REJECTED') => {
        if (!selectedRequest) return;

        Alert.alert(
            `${status === 'COMPLETED' ? 'Confirm Payment' : 'Reject Request'}`,
            `Are you sure you want to mark this request as ${status.toLowerCase()}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        try {
                            const res = await adminService.processPayoutRequest(selectedRequest._id, {
                                status,
                                transactionId: payoutId,
                                note: adminNote,
                            });
                            if (res.success) {
                                Alert.alert('Success', `Request marked as ${status.toLowerCase()}`);
                                setProcessModal(false);
                                setSelectedRequest(null);
                                setAdminNote('');
                                setPayoutId('');
                                fetchRequests();
                            }
                        } catch (error) {
                            Alert.alert('Error', 'Failed to process request');
                        }
                    }
                }
            ]
        );
    };

    const handlePayViaUPI = async () => {
        if (!selectedRequest?.bankDetails?.upiId) {
            Alert.alert('No UPI ID', 'This host did not provide a UPI ID. You must use NEFT/IMPS.');
            return;
        }

        const upiId = selectedRequest.bankDetails.upiId;
        const name = encodeURIComponent(selectedRequest.bankDetails.accountHolderName || selectedRequest.hostId.name);
        const amount = selectedRequest.amount;
        const upiUrl = `upi://pay?pa=${upiId}&pn=${name}&am=${amount}&cu=INR`;

        try {
            const supported = await Linking.canOpenURL(upiUrl);
            if (supported) {
                await Linking.openURL(upiUrl);
            } else {
                Alert.alert('Error', 'No UPI app (GPay, PhonePe, Paytm, etc.) found on this device.');
            }
        } catch (error) {
            Alert.alert('Error', 'Could not open UPI app.');
        }
    };

    const renderRequest = ({ item }: { item: PayoutRequest }) => (
        <TouchableOpacity 
            style={styles.requestCard}
            onPress={() => {
                setSelectedRequest(item);
                setProcessModal(true);
            }}
        >
            <View style={styles.cardHeader}>
                <Image 
                    source={{ uri: item.hostId.profileImage || 'https://via.placeholder.com/100' }} 
                    style={styles.hostAvatar} 
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.hostName}>{item.hostId.name}</Text>
                    <Text style={styles.requestDate}>{new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
                <View style={styles.amountBadge}>
                    <Text style={styles.amountText}>₹{item.amount.toLocaleString()}</Text>
                </View>
            </View>

            <View style={styles.payoutDetails}>
                {item.bankDetails.upiId ? (
                    <View style={styles.detailRow}>
                        <Ionicons name="phone-portrait-outline" size={14} color={COLORS.textDim} />
                        <Text style={styles.detailText}>UPI: {item.bankDetails.upiId}</Text>
                    </View>
                ) : (
                    <View style={styles.detailRow}>
                        <Ionicons name="card-outline" size={14} color={COLORS.textDim} />
                        <Text style={styles.detailText}>A/C: {item.bankDetails.accountNumber} ({item.bankDetails.ifscCode})</Text>
                    </View>
                )}
            </View>

            <View style={[styles.statusLine, { backgroundColor: item.status === 'PENDING' ? COLORS.warning : COLORS.success }]} />
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: COLORS.background }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Payout Requests</Text>
                <View style={{ width: 44 }} />
            </View>

            <FlatList
                data={requests}
                renderItem={renderRequest}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="cash-outline" size={64} color="rgba(255,255,255,0.05)" />
                        <Text style={styles.emptyText}>No pending payout requests</Text>
                    </View>
                }
            />

            {/* PROCESS MODAL */}
            <Modal visible={processModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Process Payout</Text>
                            <TouchableOpacity onPress={() => setProcessModal(false)}>
                                <Ionicons name="close" size={24} color="white" />
                            </TouchableOpacity>
                        </View>

                        {selectedRequest && (
                            <View style={styles.summaryBox}>
                                <Text style={styles.summaryLabel}>PAYING TO</Text>
                                <Text style={styles.summaryName}>{selectedRequest.hostId.name}</Text>
                                <Text style={styles.summaryAmount}>₹{selectedRequest.amount.toLocaleString()}</Text>
                                
                                <View style={styles.detailsBox}>
                                    <Text style={styles.detailTitle}>BANK/UPI DETAILS</Text>
                                    <Text style={styles.detailVal}>Name: {selectedRequest.bankDetails.accountHolderName}</Text>
                                    {selectedRequest.bankDetails.upiId && <Text style={styles.detailVal}>UPI: {selectedRequest.bankDetails.upiId}</Text>}
                                    {selectedRequest.bankDetails.accountNumber && (
                                        <>
                                            <Text style={styles.detailVal}>A/C: {selectedRequest.bankDetails.accountNumber}</Text>
                                            <Text style={styles.detailVal}>Bank: {selectedRequest.bankDetails.bankName}</Text>
                                            <Text style={styles.detailVal}>IFSC: {selectedRequest.bankDetails.ifscCode}</Text>
                                        </>
                                    )}
                                </View>
                            </View>
                        )}

                        <TextInput 
                            style={styles.modalInput}
                            placeholder="Transaction ID / Reference (Optional)"
                            placeholderTextColor={COLORS.textDim}
                            value={payoutId}
                            onChangeText={setPayoutId}
                        />

                        <TextInput 
                            style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
                            placeholder="Add a note for the host..."
                            placeholderTextColor={COLORS.textDim}
                            multiline
                            value={adminNote}
                            onChangeText={setAdminNote}
                        />

                        <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: COLORS.primary, marginBottom: 12 }]}
                            onPress={handlePayViaUPI}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="phone-portrait-outline" size={20} color="white" />
                                <Text style={styles.actionBtnText}>Open UPI App (GPay/PhonePe)</Text>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.modalActions}>
                            <TouchableOpacity 
                                style={[styles.actionBtn, { backgroundColor: COLORS.danger }]}
                                onPress={() => handleProcess('REJECTED')}
                            >
                                <Text style={styles.actionBtnText}>Reject</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.actionBtn, { backgroundColor: COLORS.success, flex: 2 }]}
                                onPress={() => handleProcess('COMPLETED')}
                            >
                                <Text style={styles.actionBtnText}>Confirm Payment</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: '900' },
    listContent: { padding: 20 },
    
    requestCard: {
        backgroundColor: COLORS.card, borderRadius: 20, padding: 16,
        marginBottom: 16, borderWidth: 1, borderColor: COLORS.border,
        overflow: 'hidden'
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    hostAvatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#222' },
    hostName: { color: 'white', fontSize: 16, fontWeight: '800' },
    requestDate: { color: COLORS.textDim, fontSize: 11, marginTop: 2 },
    amountBadge: { backgroundColor: 'rgba(59,130,246,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    amountText: { color: COLORS.primary, fontSize: 16, fontWeight: '900' },
    
    payoutDetails: { marginTop: 16, gap: 6 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    detailText: { color: COLORS.textDim, fontSize: 13, fontWeight: '600' },
    statusLine: { height: 3, width: '100%', position: 'absolute', bottom: 0, left: 0 },

    emptyState: { alignItems: 'center', paddingVertical: 100, opacity: 0.5 },
    emptyText: { color: 'white', fontSize: 16, marginTop: 20, fontWeight: '700' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#111', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { color: 'white', fontSize: 22, fontWeight: '900' },
    
    summaryBox: { alignItems: 'center', marginBottom: 24 },
    summaryLabel: { color: COLORS.primary, fontSize: 11, fontWeight: '900', letterSpacing: 2 },
    summaryName: { color: 'white', fontSize: 24, fontWeight: '900', marginTop: 4 },
    summaryAmount: { color: COLORS.success, fontSize: 32, fontWeight: '900', marginTop: 4 },
    
    detailsBox: { 
        width: '100%', backgroundColor: 'rgba(255,255,255,0.03)', 
        borderRadius: 16, padding: 16, marginTop: 20,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
    },
    detailTitle: { color: COLORS.textDim, fontSize: 10, fontWeight: '800', marginBottom: 8, letterSpacing: 1 },
    detailVal: { color: 'white', fontSize: 13, fontWeight: '600', marginBottom: 4 },

    modalInput: {
        backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12,
        padding: 16, color: 'white', fontSize: 14, fontWeight: '600',
        marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
    },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
    actionBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', flex: 1 },
    actionBtnText: { color: 'white', fontSize: 16, fontWeight: '800' }
});
