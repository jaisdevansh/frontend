import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Platform } from 'react-native';
import SafeFlashList from '../../components/SafeFlashList';
const FlashList = SafeFlashList;
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useStrictBack } from '../../hooks/useStrictBack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useToast } from '../../context/ToastContext';
import { hostService } from '../../services/hostService';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

interface Coupon {
    _id: string;
    title: string;
    code: string;
    discountValue: number;
    discountType: 'percentage' | 'flat';
    pointsCost: number;
    isActive: boolean;
    usedCount: number;
    usageLimit: number;
    expiryDate: string;
}

export default function HostCoupons() {
    const router = useRouter();
    const goBack = useStrictBack('/(host)/dashboard');
    const { showToast } = useToast();

    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [createLoading, setCreateLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'All' | 'Active' | 'Inactive'>('All');
    const [isCreateModalVisible, setCreateModalVisible] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [newCoupon, setNewCoupon] = useState({
        title: '',
        code: '',
        discountValue: '',
        discountType: 'percentage',
        usageLimit: '100',
        pointsCost: '0',
        expiryDate: '',
        expiryDisplay: ''
    });

    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        try {
            const res = await hostService.getCoupons();
            if (res.success) {
                setCoupons(res.data);
            }
        } catch (error) {
            showToast('Failed to load coupons', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCoupon = async () => {
        if (!newCoupon.code || !newCoupon.discountValue) {
            showToast('Please fill required fields', 'error');
            return;
        }
        setCreateLoading(true);
        try {
            const payload = {
                title: newCoupon.title || `PROMO: ${newCoupon.code.toUpperCase()}`,
                code: newCoupon.code,
                discountValue: parseFloat(newCoupon.discountValue),
                discountType: newCoupon.discountType as 'percentage' | 'flat',
                usageLimit: parseInt(newCoupon.usageLimit) || 100,
                pointsCost: parseInt(newCoupon.pointsCost) || 0,
                expiryDate: newCoupon.expiryDate || undefined
            };

            const res = await hostService.createCoupon(payload);
            if (res.success) {
                showToast('Coupon Created Successfully!', 'success');
                setCreateModalVisible(false);
                setNewCoupon({ title: '', code: '', discountValue: '', discountType: 'percentage', usageLimit: '100', pointsCost: '0', expiryDate: '', expiryDisplay: '' });
                fetchCoupons();
            }
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Failed to create coupon';
            showToast(msg, 'error');
        } finally {
            setCreateLoading(false);
        }
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setNewCoupon({
                ...newCoupon,
                expiryDate: selectedDate.toISOString(),
                expiryDisplay: dayjs(selectedDate).format('DD/MM/YYYY')
            });
        }
    };

    const handleDeleteCoupon = async () => {
        if (!deleteId) return;
        try {
            const res = await hostService.removeCoupon(deleteId);
            if (res.success) {
                showToast('Coupon Deleted Successfully', 'success');
                setDeleteId(null);
                fetchCoupons();
            }
        } catch (error) {
            showToast('Failed to delete coupon', 'error');
        }
    };

    const getStatusColor = (isActive: boolean, expiryDate: string) => {
        if (!isActive) return COLORS.gold;
        if (expiryDate && dayjs(expiryDate).isBefore(dayjs())) return COLORS.text.muted;
        return COLORS.emerald;
    };

    const filteredCoupons = coupons.filter(coupon => {
        const matchesSearch = coupon.code.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Categorize based on both explicit activity and temporal expiry
        const isExpired = coupon.expiryDate && dayjs(coupon.expiryDate).isBefore(dayjs());
        const isEffectivelyActive = coupon.isActive && !isExpired;
        
        const status = isEffectivelyActive ? 'Active' : 'Inactive';
        const matchesTab = activeTab === 'All' || status === activeTab;
        return matchesSearch && matchesTab;
    });

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerContainer}>
                <TouchableOpacity style={styles.backBtn} onPress={() => goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>

                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>Promo Codes</Text>
                        <Text style={styles.headerSubtitle}>Manage your offers & rewards</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.createIconButton}
                        onPress={() => setCreateModalVisible(true)}
                    >
                        <Ionicons name="add" size={28} color="white" />
                    </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="rgba(255,255,255,0.4)" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search codes..."
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                <View style={styles.tabs}>
                    {[
                        { name: 'All', color: COLORS.primary }, 
                        { name: 'Active', color: COLORS.emerald }, 
                        { name: 'Inactive', color: COLORS.error }
                    ].map((tab) => {
                        const isActive = activeTab === tab.name;
                        return (
                            <TouchableOpacity
                                key={tab.name}
                                style={[
                                    styles.tab, 
                                    isActive && { backgroundColor: `${tab.color}20`, borderColor: `${tab.color}40`, borderWidth: 1 }
                                ]}
                                onPress={() => setActiveTab(tab.name as any)}
                            >
                                <Text style={[
                                    styles.tabText, 
                                    isActive && { color: tab.color, fontWeight: '800' }
                                ]}>{tab.name}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <FlashList 
                data={filteredCoupons}
                keyExtractor={(item: Coupon) => item._id}
                estimatedItemSize={120}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                renderItem={({ item: coupon }: { item: Coupon }) => {
                    const isExpired = coupon.expiryDate && dayjs(coupon.expiryDate).isBefore(dayjs());
                    const isEffectivelyActive = coupon.isActive && !isExpired;
                    const statusColor = isEffectivelyActive ? COLORS.emerald : COLORS.error;
                    
                    return (
                        <TouchableOpacity
                            key={coupon._id}
                            style={[
                                styles.couponCard, 
                                { 
                                    borderColor: `${statusColor}40`,
                                    backgroundColor: `${statusColor}10` // 6% tint for that premium glow
                                }
                            ]}
                            activeOpacity={0.9}
                            onLongPress={() => setDeleteId(coupon._id)}
                        >
                            <View style={styles.cardLeft}>
                                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                                <Text style={[styles.codeText, { color: isEffectivelyActive ? COLORS.primary : COLORS.text.muted }]}>{coupon.code}</Text>
                                <Text style={styles.discountText}>
                                    {coupon.discountType === 'percentage' 
                                        ? `${coupon.discountValue}% OFF` 
                                        : `₹${coupon.discountValue} FLAT OFF`}
                                </Text>
                                {coupon.pointsCost > 0 && (
                                    <View style={styles.pointsBadge}>
                                        <Ionicons name="flash" size={10} color="#FFD700" />
                                        <Text style={styles.pointsBadgeText}>{coupon.pointsCost} pts</Text>
                                    </View>
                                )}
                            </View>

                        <View style={styles.divider} />

                        <View style={styles.cardRight}>
                            <View style={styles.usageContainer}>
                                <Text style={styles.usageLabel}>Usage</Text>
                                <Text style={styles.usageValue}>{coupon.usedCount}/{coupon.usageLimit}</Text>
                            </View>
                            <View style={styles.expiryContainer}>
                                <Text style={styles.usageLabel}>Expiry</Text>
                                <Text style={styles.expiryValue}>
                                    {coupon.expiryDate ? dayjs(coupon.expiryDate).format('MMM DD, YYYY') : 'Never'}
                                </Text>
                            </View>
                        </View>

                        <View style={[styles.notch, styles.notchTop]} />
                        <View style={[styles.notch, styles.notchBottom]} />
                    </TouchableOpacity>
                )}}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="ticket-percent-outline" size={64} color="rgba(255,255,255,0.1)" />
                        <Text style={styles.emptyText}>No coupons found</Text>
                    </View>
                }
            />

            {/* Create Coupon Modal */}
            <Modal
                visible={isCreateModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setCreateModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Create Coupon</Text>
                            <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                                <Ionicons name="close" size={24} color="white" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                            <Input
                                label="Coupon Title (Optional)"
                                placeholder="e.g. Weekend Drinks 50% Off"
                                value={newCoupon.title}
                                onChangeText={(text) => setNewCoupon({ ...newCoupon, title: text })}
                            />
                            <Input
                                label="Coupon Code *"
                                placeholder="e.g. ENTRY50"
                                value={newCoupon.code}
                                autoCapitalize="characters"
                                onChangeText={(text) => setNewCoupon({ ...newCoupon, code: text })}
                            />

                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ color: COLORS.text.muted, fontSize: 13, marginBottom: 8, fontWeight: '600', marginLeft: 4 }}>Discount Type</Text>
                                <View style={styles.typeSelector}>
                                    <TouchableOpacity
                                        style={[styles.typeButton, newCoupon.discountType === 'percentage' && styles.typeButtonActive]}
                                        onPress={() => setNewCoupon({ ...newCoupon, discountType: 'percentage' })}
                                    >
                                        <Text style={[styles.typeButtonText, newCoupon.discountType === 'percentage' && styles.typeButtonTextActive]}>Percentage (%)</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.typeButton, newCoupon.discountType === 'flat' && styles.typeButtonActive]}
                                        onPress={() => setNewCoupon({ ...newCoupon, discountType: 'flat' })}
                                    >
                                        <Text style={[styles.typeButtonText, newCoupon.discountType === 'flat' && styles.typeButtonTextActive]}>Flat Value</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <Input
                                label={newCoupon.discountType === 'percentage' ? "Discount Percentage (%)" : "Flat Discount Amount"}
                                placeholder={newCoupon.discountType === 'percentage' ? "e.g. 50" : "e.g. 500"}
                                value={newCoupon.discountValue}
                                onChangeText={(text) => setNewCoupon({ ...newCoupon, discountValue: text })}
                                keyboardType="numeric"
                            />

                            <Input
                                label="Max Usage Limit"
                                placeholder="e.g. 100"
                                value={newCoupon.usageLimit}
                                onChangeText={(text) => setNewCoupon({ ...newCoupon, usageLimit: text })}
                                keyboardType="numeric"
                            />

                            {/* Points Cost — Key Feature */}
                            <View style={styles.pointsInputWrapper}>
                                <View style={styles.pointsInputHeader}>
                                    <Ionicons name="flash" size={14} color="#FFD700" />
                                    <Text style={styles.pointsInputLabel}>Points to Redeem (Store Cost)</Text>
                                </View>
                                <Text style={styles.pointsInputHint}>User itne points kharch karke ye coupon store se redeem kar sakta hai</Text>
                                <TextInput
                                    style={styles.pointsInput}
                                    placeholder="e.g. 100"
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                    value={newCoupon.pointsCost}
                                    onChangeText={(text) => setNewCoupon({ ...newCoupon, pointsCost: text })}
                                    keyboardType="numeric"
                                />
                            </View>
                            <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
                                <Input
                                    label="Expiry Date"
                                    placeholder="Select Date"
                                    value={newCoupon.expiryDisplay}
                                    editable={false}
                                    pointerEvents="none"
                                />
                            </TouchableOpacity>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={newCoupon.expiryDate ? new Date(newCoupon.expiryDate) : new Date()}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={onDateChange}
                                    minimumDate={new Date()}
                                />
                            )}

                            <Button
                                title={createLoading ? "Creating..." : "Create Promo Code"}
                                onPress={handleCreateCoupon}
                                loading={createLoading}
                                style={{ marginTop: 24, marginBottom: 40 }}
                            />
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                visible={!!deleteId}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setDeleteId(null)}
            >
                <View style={styles.deleteModalOverlay}>
                    <View style={styles.deleteModalContent}>
                        <Ionicons name="trash-outline" size={48} color={COLORS.error} />
                        <Text style={styles.deleteTitle}>Delete Coupon?</Text>
                        <Text style={styles.deleteSubtitle}>This action cannot be undone. Are you sure you want to remove this promo code?</Text>

                        <View style={styles.deleteActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteId(null)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteCoupon}>
                                <Text style={styles.deleteBtnText}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background.dark,
    },
    headerContainer: {
        paddingHorizontal: SPACING.lg,
        paddingTop: 50,
        backgroundColor: COLORS.background.dark,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.card.glass,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        color: COLORS.text.secondary,
        fontSize: 14,
        marginTop: 4,
    },
    createIconButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card.glass,
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.md,
        height: 48,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.card.glassBorder,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        color: 'white',
        fontSize: 15,
    },
    tabs: {
        flexDirection: 'row',
        marginBottom: 20,
        gap: 8,
    },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    activeTab: {
        backgroundColor: 'rgba(37, 99, 235, 0.12)',
    },
    tabText: {
        color: COLORS.text.muted,
        fontSize: 13,
        fontWeight: '600',
    },
    activeTabText: {
        color: COLORS.primary,
    },
    scrollContent: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: 40,
    },
    couponCard: {
        backgroundColor: COLORS.card.dark,
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: COLORS.card.glassBorder,
        overflow: 'hidden',
    },
    cardLeft: {
        flex: 1.5,
        justifyContent: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        position: 'absolute',
        top: -4,
        left: -4,
    },
    codeText: {
        color: COLORS.primary,
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: 1,
    },
    discountText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '700',
        marginTop: 4,
    },
    divider: {
        width: 1,
        backgroundColor: COLORS.card.glassBorder,
        marginHorizontal: 20,
        height: '100%',
        borderStyle: 'dashed',
    },
    cardRight: {
        flex: 1,
        justifyContent: 'space-between',
    },
    usageContainer: {
        marginBottom: 8,
    },
    usageLabel: {
        color: COLORS.text.muted,
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    usageValue: {
        color: 'white',
        fontSize: 13,
        fontWeight: '600',
    },
    expiryContainer: {},
    expiryLabel: {
        color: COLORS.text.muted,
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    expiryValue: {
        color: COLORS.text.secondary,
        fontSize: 12,
        fontWeight: '500',
    },
    pointsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 8,
        backgroundColor: 'rgba(255, 215, 0, 0.12)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.25)',
    },
    pointsBadgeText: {
        color: '#FFD700',
        fontSize: 10,
        fontWeight: '800',
    },
    pointsInputWrapper: {
        marginBottom: 16,
        backgroundColor: 'rgba(255, 215, 0, 0.05)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.2)',
        padding: 16,
    },
    pointsInputHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    pointsInputLabel: {
        color: '#FFD700',
        fontSize: 13,
        fontWeight: '700',
    },
    pointsInputHint: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 11,
        marginBottom: 12,
        lineHeight: 16,
    },
    pointsInput: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.3)',
        color: '#FFD700',
        fontSize: 20,
        fontWeight: '900',
        paddingHorizontal: 16,
        paddingVertical: 12,
        textAlign: 'center',
        letterSpacing: 2,
    },
    notch: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: COLORS.background.dark,
        position: 'absolute',
        left: '52.5%',
    },
    notchTop: {
        top: -10,
    },
    notchBottom: {
        bottom: -10,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        gap: 16,
    },
    emptyText: {
        color: COLORS.text.muted,
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.card.dark,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: '85%',
        padding: SPACING.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    modalTitle: {
        color: 'white',
        fontSize: 22,
        fontWeight: '800',
    },
    modalForm: {
        flex: 1,
    },
    row: {
        flexDirection: 'row',
        gap: 16,
    },
    typeSelector: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: COLORS.card.glassBorder,
    },
    typeButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    typeButtonActive: {
        backgroundColor: COLORS.primary,
    },
    typeButtonText: {
        color: COLORS.text.muted,
        fontWeight: '600',
        fontSize: 14,
    },
    typeButtonTextActive: {
        color: 'white',
        fontWeight: '700',
    },
    deleteModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    deleteModalContent: {
        backgroundColor: COLORS.card.dark,
        borderRadius: 24,
        padding: 32,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    deleteTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: '800',
        marginTop: 16,
    },
    deleteSubtitle: {
        color: COLORS.text.muted,
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
    deleteActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 32,
        width: '100%',
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
    },
    cancelBtnText: {
        color: 'white',
        fontWeight: '600',
    },
    deleteBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: COLORS.error,
        alignItems: 'center',
    },
    deleteBtnText: {
        color: 'white',
        fontWeight: '700',
    },
});
