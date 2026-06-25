import React, { useState, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, FlatList,
    Modal, TextInput, ActivityIndicator, ScrollView,
    StatusBar, Linking, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useToast } from '../../context/ToastContext';
import adminService, { PayoutRequestItem } from '../../services/adminService';

const C = {
    bg: '#000000',
    card: '#0A0A0A',
    card2: '#111111',
    border: 'rgba(255,255,255,0.07)',
    text: '#FFFFFF',
    dim: '#6B7280',
    dim2: '#9CA3AF',
    emerald: '#10B981',
    amber: '#F59E0B',
    rose: '#F43F5E',
    violet: '#7C3AED',
    blue: '#3B82F6',
    cyan: '#06B6D4',
};

const UPI_APPS = [
    { id: 'gpay', label: 'GPay', icon: 'google', color: '#4285F4', scheme: 'gpay://upi/pay' },
    { id: 'phonepe', label: 'PhonePe', icon: 'cellphone', color: '#5F259F', scheme: 'phonepe://pay' },
    { id: 'paytm', label: 'Paytm', icon: 'wallet', color: '#00BAF2', scheme: 'paytmmp://pay' },
];

const openUPIApp = (app: typeof UPI_APPS[0], upiId: string, amount: number, name: string) => {
    // Universal UPI intent URL (works across Android UPI apps)
    const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent('Host Payout - EntryClub')}`;

    // Try app-specific deep link first, fallback to universal UPI
    const appSpecificUrl = app.id === 'gpay'
        ? `tez://upi/pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent('Host Payout - EntryClub')}`
        : app.id === 'phonepe'
            ? `phonepe://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent('Host Payout - EntryClub')}`
            : `paytmmp://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent('Host Payout - EntryClub')}`;

    Linking.canOpenURL(appSpecificUrl)
        .then((supported) => {
            if (supported) {
                return Linking.openURL(appSpecificUrl);
            } else {
                // Fallback to universal UPI
                return Linking.openURL(upiUrl);
            }
        })
        .catch(() => {
            Linking.openURL(upiUrl).catch(() => {
                Alert.alert('App Not Found', `${app.label} is not installed. You can pay using any UPI app with ID: ${upiId}`);
            });
        });
};

type TabType = 'PENDING' | 'COMPLETED' | 'REJECTED';

export default function PayoutRequestsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<TabType>('PENDING');
    const [selectedRequest, setSelectedRequest] = useState<PayoutRequestItem | null>(null);
    const [txnId, setTxnId] = useState('');
    const [note, setNote] = useState('');
    const [showUpiPicker, setShowUpiPicker] = useState(false);
    const [upiPaid, setUpiPaid] = useState(false);
    const [pendingAction, setPendingAction] = useState<'COMPLETED' | 'REJECTED' | null>(null);

    const { data: requests = [], isLoading, refetch } = useQuery({
        queryKey: ['admin-payout-requests', activeTab],
        queryFn: () => adminService.getPayoutRequests(activeTab),
        staleTime: 30000,
    });

    const processMutation = useMutation({
        mutationFn: ({ id, status, transactionId, note }: { id: string, status: 'COMPLETED' | 'REJECTED', transactionId?: string, note?: string }) =>
            adminService.processPayoutRequest(id, { status, transactionId, note }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin-payout-requests'] });
            setSelectedRequest(null);
            setUpiPaid(false);
            setTxnId('');
            setNote('');
            setPendingAction(null);
            showToast(
                variables.status === 'COMPLETED' ? 'Payout marked as completed!' : 'Payout request rejected',
                variables.status === 'COMPLETED' ? 'success' : 'error'
            );
        },
        onError: (err: any) => {
            showToast(err?.response?.data?.message || 'Failed to process payout', 'error');
        }
    });

    const handleConfirmProcess = useCallback((action?: 'COMPLETED' | 'REJECTED') => {
        if (!selectedRequest) return;
        const status = action || pendingAction;
        if (!status) return;
        processMutation.mutate({
            id: selectedRequest._id,
            status,
            transactionId: txnId.trim(),
            note: note.trim(),
        });
    }, [selectedRequest, pendingAction, txnId, note, processMutation]);

    const handleUpiAppPress = useCallback((app: typeof UPI_APPS[0]) => {
        const bank = selectedRequest?.bankDetails || selectedRequest?.hostId?.bankDetails;
        if (!bank?.upiId || !selectedRequest) return;
        openUPIApp(app, bank.upiId, selectedRequest.amount, bank.name || selectedRequest.hostId?.name || 'Host');
        setShowUpiPicker(false);
        setUpiPaid(true);
    }, [selectedRequest]);

    const bankDetails = useMemo(
        () => selectedRequest?.bankDetails || selectedRequest?.hostId?.bankDetails,
        [selectedRequest]
    );
    const hasUPI = !!(bankDetails?.upiId);

    const renderCard = useCallback(({ item }: { item: PayoutRequestItem }) => {
        const bank = item.bankDetails || item.hostId?.bankDetails;
        const statusColor = item.status === 'COMPLETED' ? C.emerald : item.status === 'REJECTED' ? C.rose : C.amber;
        const statusLabel = item.status === 'COMPLETED' ? 'PAID' : item.status === 'REJECTED' ? 'REJECTED' : 'PENDING';

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => { setSelectedRequest(item); setUpiPaid(false); setTxnId(''); setNote(''); }}
                activeOpacity={0.75}
            >
                <View style={styles.cardTop}>
                    <View style={styles.cardLeft}>
                        <Image
                            source={{ uri: item.hostId?.profileImage || 'https://via.placeholder.com/80' }}
                            style={styles.avatar}
                        />
                        <View style={{ flex: 1, marginLeft: 14 }}>
                            <Text style={styles.hostName}>{item.hostId?.name || 'Unknown Host'}</Text>
                            <Text style={styles.hostContact}>{item.hostId?.email || item.hostId?.phone || '—'}</Text>
                            {bank?.upiId ? (
                                <Text style={styles.upiChip}>UPI: {bank.upiId}</Text>
                            ) : (
                                <Text style={[styles.upiChip, { color: C.rose, borderColor: 'rgba(244,63,94,0.25)' }]}>No UPI on file</Text>
                            )}
                        </View>
                    </View>
                    <View style={styles.amountBadge}>
                        <Text style={styles.amountText}>₹{item.amount.toLocaleString()}</Text>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
                    </View>
                </View>
                <View style={styles.cardFooter}>
                    <Text style={styles.cardDate}>{new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                    {item.status === 'PENDING' && (
                        <View style={styles.pendingArrow}>
                            <Text style={styles.pendingArrowText}>Process →</Text>
                        </View>
                    )}
                    {item.transactionId ? (
                        <Text style={styles.txnText}>Txn: {item.transactionId}</Text>
                    ) : null}
                </View>
            </TouchableOpacity>
        );
    }, []);

    const TABS = useMemo<{ key: TabType, label: string, color: string }[]>(() => [
        { key: 'PENDING', label: 'Pending', color: C.amber },
        { key: 'COMPLETED', label: 'Completed', color: C.emerald },
        { key: 'REJECTED', label: 'Rejected', color: C.rose },
    ], []);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#FFF" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Payout Requests</Text>
                    <Text style={styles.headerSub}>{requests.length} {activeTab.toLowerCase()} requests</Text>
                </View>
                <TouchableOpacity onPress={() => refetch()} style={styles.refreshBtn}>
                    <MaterialIcons name="refresh" size={20} color="#FFF" />
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabBar}>
                {TABS.map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        onPress={() => setActiveTab(tab.key)}
                        style={[styles.tab, activeTab === tab.key && { borderBottomColor: tab.color, borderBottomWidth: 2 }]}
                    >
                        <Text style={[styles.tabText, activeTab === tab.key && { color: tab.color }]}>{tab.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* List */}
            {isLoading ? (
                <View style={styles.centerBox}><ActivityIndicator size="large" color={C.violet} /></View>
            ) : requests.length === 0 ? (
                <View style={styles.centerBox}>
                    <MaterialCommunityIcons name="cash-check" size={64} color={C.dim} />
                    <Text style={styles.emptyTitle}>All Clear</Text>
                    <Text style={styles.emptySub}>No {activeTab.toLowerCase()} payout requests.</Text>
                </View>
            ) : (
                <FlatList
                    data={requests}
                    keyExtractor={(item) => item._id}
                    renderItem={renderCard}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    initialNumToRender={8}
                    removeClippedSubviews
                />
            )}

            {/* Process Payout Modal */}
            <Modal
                visible={!!selectedRequest}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setSelectedRequest(null)}
            >
                {selectedRequest && (
                    <View style={styles.modalBg}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Modal Header */}
                            <View style={[styles.modalHeader, { paddingTop: 28 }]}>
                                <View>
                                    <Text style={styles.modalTitle}>Process Payout</Text>
                                    <Text style={styles.payingTo}>PAYING TO</Text>
                                    <Text style={styles.modalHostName}>{selectedRequest.hostId?.name}</Text>
                                    <Text style={styles.modalAmount}>₹{selectedRequest.amount.toLocaleString()}</Text>
                                </View>
                                <TouchableOpacity onPress={() => setSelectedRequest(null)} style={styles.closeBtn}>
                                    <Ionicons name="close" size={22} color="#FFF" />
                                </TouchableOpacity>
                            </View>

                            {/* Bank Details */}
                            <View style={styles.section}>
                                <Text style={styles.sectionLabel}>BANK / UPI DETAILS</Text>
                                <View style={styles.bankCard}>
                                    {bankDetails?.name ? <Text style={styles.bankRow}>Name: {bankDetails.name}</Text> : null}
                                    {bankDetails?.upiId ? <Text style={styles.bankRow}>UPI: <Text style={styles.bankHighlight}>{bankDetails.upiId}</Text></Text> : null}
                                    {bankDetails?.accountNumber ? <Text style={styles.bankRow}>A/C: {bankDetails.accountNumber}</Text> : null}
                                    {bankDetails?.bankName ? <Text style={styles.bankRow}>Bank: {bankDetails.bankName}</Text> : null}
                                    {bankDetails?.ifsc ? <Text style={styles.bankRow}>IFSC: {bankDetails.ifsc}</Text> : null}
                                    {!bankDetails?.upiId && !bankDetails?.accountNumber && (
                                        <Text style={[styles.bankRow, { color: C.rose }]}>No bank/UPI details saved by host</Text>
                                    )}
                                </View>
                            </View>

                            {/* UPI already paid — show Mark as Paid banner */}
                            {upiPaid && selectedRequest.status === 'PENDING' && (
                                <View style={[styles.section]}>
                                    <LinearGradient colors={['#10B98120', '#10B98108']} style={styles.paidBanner}>
                                        <MaterialCommunityIcons name="check-circle" size={22} color="#10B981" />
                                        <Text style={styles.paidBannerText}>Payment sent! Now confirm below.</Text>
                                    </LinearGradient>
                                </View>
                            )}

                            {/* Transaction ID & Note */}
                            {selectedRequest.status === 'PENDING' && (
                                <View style={styles.section}>
                                    <TextInput
                                        style={styles.input}
                                        value={txnId}
                                        onChangeText={setTxnId}
                                        placeholder="Transaction ID / Reference (Optional)"
                                        placeholderTextColor={C.dim}
                                    />
                                    <TextInput
                                        style={[styles.input, { marginTop: 10, height: 80, textAlignVertical: 'top' }]}
                                        value={note}
                                        onChangeText={setNote}
                                        placeholder="Add a note for the host..."
                                        placeholderTextColor={C.dim}
                                        multiline
                                    />
                                </View>
                            )}

                            {/* Existing txn info for processed requests */}
                            {selectedRequest.status !== 'PENDING' && (
                                <View style={styles.section}>
                                    <View style={[styles.bankCard, { borderColor: selectedRequest.status === 'COMPLETED' ? C.emerald + '40' : C.rose + '40' }]}>
                                        <Text style={styles.bankRow}>Status: <Text style={{ color: selectedRequest.status === 'COMPLETED' ? C.emerald : C.rose }}>{selectedRequest.status}</Text></Text>
                                        {selectedRequest.transactionId ? <Text style={styles.bankRow}>Txn ID: {selectedRequest.transactionId}</Text> : null}
                                        {selectedRequest.note ? <Text style={styles.bankRow}>Note: {selectedRequest.note}</Text> : null}
                                        {selectedRequest.processedAt ? <Text style={styles.bankRow}>Processed: {new Date(selectedRequest.processedAt).toLocaleDateString('en-IN')}</Text> : null}
                                    </View>
                                </View>
                            )}

                            {/* Action Buttons */}
                            {selectedRequest.status === 'PENDING' && (
                                <View style={styles.actionRow}>
                                    <TouchableOpacity
                                        style={styles.rejectBtn}
                                        onPress={() => {
                                            Alert.alert('Reject Payout?', 'This will notify the host. Are you sure?', [
                                                { text: 'Cancel', style: 'cancel' },
                                                { text: 'Reject', style: 'destructive', onPress: () => handleConfirmProcess('REJECTED') }
                                            ]);
                                        }}
                                        disabled={processMutation.isPending}
                                    >
                                        <Text style={styles.rejectText}>Reject</Text>
                                    </TouchableOpacity>

                                    {upiPaid ? (
                                        // After UPI app opened — show Mark as Paid
                                        <TouchableOpacity
                                            style={styles.confirmBtn}
                                            onPress={() => handleConfirmProcess('COMPLETED')}
                                            disabled={processMutation.isPending}
                                        >
                                            <LinearGradient colors={['#10B981', '#059669']} style={styles.confirmGrad}>
                                                {processMutation.isPending
                                                    ? <ActivityIndicator color="#FFF" />
                                                    : <Text style={styles.confirmText}>Mark as Paid</Text>
                                                }
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    ) : (
                                        // First tap — show UPI picker
                                        <TouchableOpacity
                                            style={styles.confirmBtn}
                                            onPress={() => setShowUpiPicker(true)}
                                            disabled={processMutation.isPending}
                                        >
                                            <LinearGradient colors={['#7C3AED', '#5B21B6']} style={styles.confirmGrad}>
                                                <Text style={styles.confirmText}>Confirm Payment</Text>
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}

                            <View style={{ height: 60 }} />
                        </ScrollView>
                    </View>
                )}
            </Modal>

            {/* UPI Picker Bottom Sheet */}
            <Modal
                visible={showUpiPicker}
                animationType="slide"
                transparent
                onRequestClose={() => setShowUpiPicker(false)}
            >
                <TouchableOpacity
                    style={styles.upiPickerOverlay}
                    activeOpacity={1}
                    onPress={() => setShowUpiPicker(false)}
                >
                    <View style={styles.upiPickerSheet}>
                        <View style={styles.upiPickerHandle} />
                        <Text style={styles.upiPickerTitle}>Pay with UPI</Text>
                        {selectedRequest && (
                            <Text style={styles.upiPickerAmount}>
                                ₹{selectedRequest.amount.toLocaleString()} → {(selectedRequest.bankDetails || selectedRequest.hostId?.bankDetails)?.upiId || 'No UPI'}
                            </Text>
                        )}
                        <View style={styles.upiPickerApps}>
                            {UPI_APPS.map(app => (
                                <TouchableOpacity
                                    key={app.id}
                                    style={[styles.upiPickerAppBtn, { borderColor: app.color + '55' }]}
                                    onPress={() => handleUpiAppPress(app)}
                                    activeOpacity={0.75}
                                >
                                    <LinearGradient
                                        colors={[app.color + '33', app.color + '11']}
                                        style={styles.upiPickerAppGrad}
                                    >
                                        <MaterialCommunityIcons name={app.icon as any} size={36} color={app.color} />
                                        <Text style={[styles.upiPickerAppLabel, { color: app.color }]}>{app.label}</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={styles.upiPickerHint}>Select the app installed on your phone</Text>
                        <TouchableOpacity style={styles.upiPickerCancel} onPress={() => setShowUpiPicker(false)}>
                            <Text style={styles.upiPickerCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 20,
    },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },
    headerTitle: { color: C.text, fontSize: 22, fontWeight: '900' },
    headerSub: { color: C.dim, fontSize: 12, marginTop: 2 },
    refreshBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },
    tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border, marginHorizontal: 20 },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabText: { color: C.dim, fontSize: 13, fontWeight: '700' },
    list: { padding: 20, gap: 14, paddingBottom: 100 },
    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    emptyTitle: { color: C.text, fontSize: 20, fontWeight: '900' },
    emptySub: { color: C.dim, fontSize: 14 },

    // Card
    card: { backgroundColor: C.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: C.border },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatar: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#111' },
    hostName: { color: C.text, fontSize: 16, fontWeight: '800' },
    hostContact: { color: C.dim, fontSize: 12, marginTop: 2 },
    upiChip: { marginTop: 6, fontSize: 11, color: C.cyan, fontWeight: '700', borderWidth: 1, borderColor: 'rgba(6,182,212,0.25)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
    amountBadge: { alignItems: 'flex-end', gap: 4 },
    amountText: { color: C.text, fontSize: 20, fontWeight: '900' },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
    cardDate: { color: C.dim, fontSize: 12 },
    pendingArrow: { backgroundColor: 'rgba(124,58,237,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    pendingArrowText: { color: C.violet, fontSize: 12, fontWeight: '700' },
    txnText: { color: C.dim, fontSize: 11 },

    // Modal
    modalBg: { flex: 1, backgroundColor: C.bg },
    modalHeader: { paddingHorizontal: 24, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    modalTitle: { color: C.text, fontSize: 22, fontWeight: '900', marginBottom: 8 },
    payingTo: { color: C.cyan, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
    modalHostName: { color: C.text, fontSize: 28, fontWeight: '900', marginTop: 4 },
    modalAmount: { color: C.emerald, fontSize: 32, fontWeight: '900', marginTop: 4 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.card2, justifyContent: 'center', alignItems: 'center' },

    section: { paddingHorizontal: 24, paddingTop: 24 },
    sectionLabel: { color: C.dim, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 },

    bankCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
    bankRow: { color: C.dim2, fontSize: 14, marginBottom: 6 },
    bankHighlight: { color: C.text, fontWeight: '700' },



    input: {
        backgroundColor: C.card, borderRadius: 14, padding: 14,
        color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.border,
    },

    actionRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingTop: 28 },
    rejectBtn: {
        flex: 1, height: 56, borderRadius: 18,
        backgroundColor: 'rgba(244,63,94,0.08)', borderWidth: 1,
        borderColor: 'rgba(244,63,94,0.25)', justifyContent: 'center', alignItems: 'center',
    },
    rejectText: { color: C.rose, fontSize: 15, fontWeight: '800' },
    confirmBtn: { flex: 1.5, height: 56, borderRadius: 18, overflow: 'hidden' },
    confirmGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    confirmText: { color: '#FFF', fontSize: 15, fontWeight: '800' },

    // Paid banner
    paidBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#10B98130' },
    paidBannerText: { color: '#10B981', fontSize: 14, fontWeight: '700', flex: 1 },

    // UPI Picker Sheet
    upiPickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    upiPickerSheet: { backgroundColor: '#111', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
    upiPickerHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    upiPickerTitle: { color: C.text, fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
    upiPickerAmount: { color: C.dim, fontSize: 13, textAlign: 'center', marginBottom: 24 },
    upiPickerApps: { flexDirection: 'row', gap: 14, marginBottom: 16 },
    upiPickerAppBtn: { flex: 1, borderRadius: 20, overflow: 'hidden', borderWidth: 1 },
    upiPickerAppGrad: { paddingVertical: 22, alignItems: 'center', gap: 10 },
    upiPickerAppLabel: { fontSize: 14, fontWeight: '900' },
    upiPickerHint: { color: C.dim, fontSize: 12, textAlign: 'center', marginBottom: 20 },
    upiPickerCancel: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    upiPickerCancelText: { color: C.dim, fontSize: 15, fontWeight: '700' },
});
