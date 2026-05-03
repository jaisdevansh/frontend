import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, Dimensions, Modal, TextInput, Alert,
    RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStrictBack } from '../../hooks/useStrictBack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/design-system';
import { hostService } from '../../services/hostService';
import dayjs from 'dayjs';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface Transaction {
    _id: string;
    amount: number;
    type: 'CREDIT' | 'DEBIT';
    description: string;
    createdAt: string;
}

interface WalletData {
    balance: number;
    totalEarned: number;
    pendingWithdrawal: number;
}

interface BankDetails {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    upiId: string;
    bankName: string;
}

export default function HostWalletScreen() {
    const insets = useSafeAreaInsets();
    const goBack = useStrictBack('/(host)/profile');

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [wallet, setWallet] = useState<WalletData>({ balance: 0, totalEarned: 0, pendingWithdrawal: 0 });
    const [bankDetails, setBankDetails] = useState<BankDetails>({
        accountNumber: '', ifscCode: '', accountHolderName: '', upiId: '', bankName: ''
    });
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);

    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [showBankModal, setShowBankModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');

    const fetchWalletData = useCallback(async () => {
        try {
            const res = await hostService.getWalletDetails();
            if (res.success) {
                setWallet(res.data.wallet || { balance: 0, totalEarned: 0, pendingWithdrawal: 0 });
                setBankDetails(res.data.bankDetails || {
                    accountNumber: '', ifscCode: '', accountHolderName: '', upiId: '', bankName: ''
                });
                setTransactions(res.data.transactions || []);
                setPendingRequests(res.data.pendingWithdrawals || []);
            }
        } catch (error) {
            console.error('Wallet Fetch Error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchWalletData(); }, [fetchWalletData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchWalletData();
    };

    const handleWithdraw = async () => {
        const amount = parseFloat(withdrawAmount);
        if (!amount || amount <= 0) return Alert.alert('Invalid Amount', 'Please enter a valid amount to withdraw.');
        if (amount > wallet.balance) return Alert.alert('Insufficient Balance', 'You cannot withdraw more than your current balance.');
        
        if (!bankDetails.upiId && !bankDetails.accountNumber) {
            return Alert.alert('Bank Details Missing', 'Please add your Bank or UPI details before withdrawing.', [
                { text: 'Add Now', onPress: () => setShowBankModal(true) },
                { text: 'Cancel' }
            ]);
        }

        try {
            const res = await hostService.requestWithdrawal(amount);
            if (res.success) {
                Alert.alert('Success 🎉', 'Withdrawal request submitted! Admin will process it shortly.');
                setWithdrawAmount('');
                setShowWithdrawModal(false);
                fetchWalletData();
            }
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to submit request');
        }
    };

    const handleSaveBankDetails = async () => {
        try {
            const res = await hostService.updateBankDetails(bankDetails);
            if (res.success) {
                Alert.alert('Success', 'Bank details updated successfully.');
                setShowBankModal(false);
                fetchWalletData();
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update bank details');
        }
    };

    const fmt = (n: number) => `₹${Math.abs(n).toLocaleString()}`;

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: COLORS.background.dark }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={goBack}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Wallet</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            >
                {/* Main Balance Card */}
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
                    <Text style={styles.balanceValue}>{fmt(wallet.balance)}</Text>
                    
                    <View style={styles.balanceStats}>
                        <View style={styles.miniStat}>
                            <Text style={styles.miniLabel}>Total Earned</Text>
                            <Text style={styles.miniValue}>{fmt(wallet.totalEarned)}</Text>
                        </View>
                        <View style={styles.miniDivider} />
                        <View style={styles.miniStat}>
                            <Text style={styles.miniLabel}>Pending</Text>
                            <Text style={[styles.miniValue, { color: COLORS.gold }]}>{fmt(wallet.pendingWithdrawal)}</Text>
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={styles.withdrawBtn}
                        onPress={() => setShowWithdrawModal(true)}
                    >
                        <Text style={styles.withdrawBtnText}>Withdraw Money</Text>
                    </TouchableOpacity>
                </View>

                {/* Bank Details Shortcut */}
                <TouchableOpacity style={styles.bankShortcut} onPress={() => setShowBankModal(true)}>
                    <Ionicons name="card-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.bankShortcutText}>
                        {bankDetails.upiId || bankDetails.accountNumber ? 'Manage Payout Details' : 'Add Bank/UPI Details'}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
                </TouchableOpacity>

                {/* Transactions Ledger */}
                <Text style={styles.sectionTitle}>Recent History</Text>
                {transactions.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="receipt-outline" size={48} color="rgba(255,255,255,0.05)" />
                        <Text style={styles.emptyText}>No transactions yet</Text>
                    </View>
                ) : (
                    transactions.map((tx) => (
                        <View key={tx._id} style={styles.txItem}>
                            <View style={[styles.txIcon, { backgroundColor: tx.type === 'CREDIT' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }]}>
                                <Ionicons 
                                    name={tx.type === 'CREDIT' ? 'arrow-down' : 'arrow-up'} 
                                    size={18} 
                                    color={tx.type === 'CREDIT' ? COLORS.emerald : '#ef4444'} 
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                                <Text style={styles.txDate}>{dayjs(tx.createdAt).format('MMM DD, YYYY • hh:mm A')}</Text>
                            </View>
                            <Text style={[styles.txAmount, { color: tx.type === 'CREDIT' ? COLORS.emerald : '#ef4444' }]}>
                                {tx.type === 'CREDIT' ? '+' : '-'} {fmt(tx.amount)}
                            </Text>
                        </View>
                    ))
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* WITHDRAW MODAL */}
            <Modal visible={showWithdrawModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Request Withdrawal</Text>
                            <TouchableOpacity onPress={() => setShowWithdrawModal(false)}>
                                <Ionicons name="close" size={24} color="white" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Enter Amount (Max {fmt(wallet.balance)})</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="₹ 0.00"
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            keyboardType="numeric"
                            value={withdrawAmount}
                            onChangeText={setWithdrawAmount}
                            autoFocus
                        />

                        <TouchableOpacity style={styles.submitBtn} onPress={handleWithdraw}>
                            <Text style={styles.submitBtnText}>Confirm Withdrawal</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* BANK DETAILS MODAL */}
            <Modal visible={showBankModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <ScrollView contentContainerStyle={styles.modalContent} style={{ maxHeight: '80%' }}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Payout Details</Text>
                            <TouchableOpacity onPress={() => setShowBankModal(false)}>
                                <Ionicons name="close" size={24} color="white" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>UPI ID (Preferred)</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="example@okaxis"
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            value={bankDetails.upiId}
                            onChangeText={(t) => setBankDetails({...bankDetails, upiId: t})}
                        />

                        <View style={styles.modalDivider} />
                        <Text style={styles.modalOr}>OR BANK ACCOUNT</Text>

                        <Text style={styles.inputLabel}>Account Holder Name</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Legal Name"
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            value={bankDetails.accountHolderName}
                            onChangeText={(t) => setBankDetails({...bankDetails, accountHolderName: t})}
                        />

                        <Text style={styles.inputLabel}>Account Number</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="0000 0000 0000"
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            keyboardType="numeric"
                            value={bankDetails.accountNumber}
                            onChangeText={(t) => setBankDetails({...bankDetails, accountNumber: t})}
                        />

                        <Text style={styles.inputLabel}>IFSC Code</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="SBIN0001234"
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            autoCapitalize="characters"
                            value={bankDetails.ifscCode}
                            onChangeText={(t) => setBankDetails({...bankDetails, ifscCode: t})}
                        />

                        <TouchableOpacity style={styles.submitBtn} onPress={handleSaveBankDetails}>
                            <Text style={styles.submitBtnText}>Save Details</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background.dark },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    },
    backBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: '700' },
    scrollContent: { padding: 20 },

    // Balance Card
    balanceCard: {
        backgroundColor: COLORS.primary,
        borderRadius: 24, padding: 24,
        alignItems: 'center', marginBottom: 20,
        elevation: 8, shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20,
    },
    balanceLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 8 },
    balanceValue: { color: 'white', fontSize: 42, fontWeight: '900', marginBottom: 24 },
    balanceStats: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 24 },
    miniStat: { alignItems: 'center' },
    miniLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
    miniValue: { color: 'white', fontSize: 15, fontWeight: '800' },
    miniDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)' },
    withdrawBtn: {
        backgroundColor: 'white', paddingHorizontal: 32, paddingVertical: 14,
        borderRadius: 14, width: '100%', alignItems: 'center'
    },
    withdrawBtnText: { color: COLORS.primary, fontSize: 16, fontWeight: '800' },

    bankShortcut: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 16, borderRadius: 16, marginBottom: 32,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    },
    bankShortcutText: { flex: 1, color: 'white', fontSize: 14, fontWeight: '600' },

    // History
    sectionTitle: { color: 'white', fontSize: 18, fontWeight: '800', marginBottom: 16 },
    txItem: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.02)',
        padding: 12, borderRadius: 16,
    },
    txIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    txDesc: { color: 'white', fontSize: 14, fontWeight: '700', marginBottom: 2 },
    txDate: { color: 'rgba(255,255,255,0.3)', fontSize: 11 },
    txAmount: { fontSize: 15, fontWeight: '800' },
    emptyContainer: { alignItems: 'center', paddingVertical: 40, opacity: 0.5 },
    emptyText: { color: 'white', fontSize: 14, marginTop: 12 },

    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    modalContent: { 
        backgroundColor: '#1A1A1A', borderTopLeftRadius: 30, borderTopRightRadius: 30,
        padding: 24, paddingBottom: 40,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { color: 'white', fontSize: 20, fontWeight: '800' },
    inputLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700', marginBottom: 10, marginTop: 16 },
    modalInput: {
        backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14,
        padding: 16, color: 'white', fontSize: 16, fontWeight: '600',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    submitBtn: {
        backgroundColor: COLORS.primary, borderRadius: 14,
        padding: 18, alignItems: 'center', marginTop: 32,
    },
    submitBtnText: { color: 'white', fontSize: 16, fontWeight: '800' },
    modalDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 24 },
    modalOr: { 
        textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 10,
        fontWeight: '800', letterSpacing: 2, position: 'absolute',
        top: '47.5%', left: '40%', backgroundColor: '#1A1A1A', paddingHorizontal: 10
    }
});
