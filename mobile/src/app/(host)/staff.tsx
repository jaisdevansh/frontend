import React, { useCallback, useState, useMemo, memo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
    TextInput, StatusBar, Modal, ScrollView, KeyboardAvoidingView,
    Platform, Switch, Pressable
} from 'react-native';
import SafeFlashList from '../../components/SafeFlashList';
const FlashList = SafeFlashList;
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/design-system';
import { hostService } from '../../services/hostService';
import { StaffCard } from '../../features/staff/components/StaffCard';
import { useToast } from '../../context/ToastContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Only waiter and security — per host requirement
type StaffRole = 'WAITER' | 'SECURITY';
type FilterType = 'ALL' | 'WAITER' | 'SECURITY';

const ROLE_CONFIG: Record<StaffRole, { label: string; icon: string; color: string; desc: string }> = {
    WAITER: {
        label: 'Waiter',
        icon: 'room-service-outline',
        color: '#F59E0B',
        desc: 'Handles food & drink orders across zones'
    },
    SECURITY: {
        label: 'Security',
        icon: 'shield-account-outline',
        color: '#EF4444',
        desc: 'Manages gate control & incident response'
    }
};

const EMPTY_FORM = {
    fullName: '',
    username: '',
    phone: '',
    email: '',
    staffType: 'WAITER' as StaffRole,
    isActive: true,
};

// Memoised role picker badge
const RolePicker = memo(({ value, onChange }: { value: StaffRole; onChange: (r: StaffRole) => void }) => (
    <View style={styles.roleRow}>
        {(Object.keys(ROLE_CONFIG) as StaffRole[]).map((role) => {
            const cfg = ROLE_CONFIG[role];
            const active = value === role;
            return (
                <TouchableOpacity
                    key={role}
                    style={[styles.roleBadge, active && { borderColor: cfg.color, backgroundColor: `${cfg.color}15` }]}
                    onPress={() => onChange(role)}
                    activeOpacity={0.8}
                >
                    <MaterialCommunityIcons name={cfg.icon as any} size={22} color={active ? cfg.color : 'rgba(255,255,255,0.3)'} />
                    <Text style={[styles.roleLabel, active && { color: cfg.color }]}>{cfg.label}</Text>
                    <Text style={styles.roleDesc}>{cfg.desc}</Text>
                </TouchableOpacity>
            );
        })}
    </View>
));

export default function StaffManagement() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { showToast } = useToast();
    const qc = useQueryClient();

    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<FilterType>('ALL');
    const [showAddModal, setShowAddModal] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    // Single shared delete sheet — lifted out of list items for performance
    const [pendingDelete, setPendingDelete] = useState<any | null>(null);

    // ── React Query ──────────────────────────────────────────────────────────
    const { data: staff = [], isLoading } = useQuery({
        queryKey: ['hostStaff'],
        queryFn: async () => {
            const res = await hostService.getStaff();
            return res.data as any[];
        },
        staleTime: 30_000,
    });

    const updateMutation = useMutation({
        mutationFn: ({ staffId, updates }: { staffId: string; updates: any }) =>
            hostService.updateStaff(staffId, updates),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['hostStaff'] }),
        onError: () => showToast('Update failed', 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (staffId: string) => hostService.removeStaff(staffId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['hostStaff'] });
            setTimeout(() => showToast('Staff member removed', 'success'), 200);
        },
        onError: () => showToast('Failed to remove staff', 'error'),
    });

    const handleUpdate = useCallback((staffId: string, updates: any) => {
        updateMutation.mutate({ staffId, updates });
    }, [updateMutation]);

    const handleDelete = useCallback((staffId: string) => {
        deleteMutation.mutate(staffId);
    }, [deleteMutation]);

    const handleLongPressDelete = useCallback((staff: any) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setPendingDelete(staff);
    }, []);

    const confirmDelete = useCallback(() => {
        if (!pendingDelete) return;
        setPendingDelete(null);
        // Small delay so sheet closes before mutation fires
        setTimeout(() => handleDelete(pendingDelete._id), 150);
    }, [pendingDelete, handleDelete]);

    // ── Add Staff ────────────────────────────────────────────────────────────
    const openModal = useCallback(() => {
        setForm({ ...EMPTY_FORM });
        setShowAddModal(true);
    }, []);

    const handleSave = useCallback(async () => {
        if (!form.fullName.trim() || !form.phone.trim()) {
            showToast('Full name and phone are required', 'error');
            return;
        }
        setSaving(true);
        try {
            const payload: any = {
                fullName: form.fullName.trim(),
                username: form.username.trim() || undefined,
                phone: form.phone.trim(),
                email: form.email.trim() || undefined,
                staffType: form.staffType,
                isActive: form.isActive,
            };

            const res = await hostService.addStaff(payload);
            if (res.success) {
                qc.invalidateQueries({ queryKey: ['hostStaff'] });
                setShowAddModal(false);
                // Small delay lets modal slide-down animation finish before toast mounts
                setTimeout(() => {
                    showToast(`${ROLE_CONFIG[form.staffType].label} added successfully! 🎉`, 'success');
                }, 350);
            } else {
                showToast(res.message || 'Failed to add staff', 'error');
            }
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to add staff', 'error');
        } finally {
            setSaving(false);
        }
    }, [form, qc, showToast]);

    const setField = useCallback(<K extends keyof typeof EMPTY_FORM>(key: K, value: typeof EMPTY_FORM[K]) => {
        setForm(prev => ({ ...prev, [key]: value }));
    }, []);

    // ── Filtered list ─────────────────────────────────────────────────────────
    const filteredStaff = useMemo(() =>
        staff.filter(s => {
            const matchSearch = s.fullName?.toLowerCase().includes(search.toLowerCase()) || s.username?.toLowerCase().includes(search.toLowerCase());
            const matchRole = filter === 'ALL' || s.staffType === filter;
            return matchSearch && matchRole;
        }), [staff, search, filter]);

    // ── Header inside FlashList (stable reference) ────────────────────────────
    const ListHeader = useMemo(() => (
        <View style={styles.listHeader}>
            <View style={styles.searchBar}>
                <Ionicons name="search" size={18} color="rgba(255,255,255,0.3)" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search staff..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={search}
                    onChangeText={setSearch}
                />
            </View>
            <View style={styles.filterRow}>
                {(['ALL', 'WAITER', 'SECURITY'] as FilterType[]).map(f => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.filterTab, filter === f && styles.filterTabActive]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                            {f === 'ALL' ? 'All' : ROLE_CONFIG[f as StaffRole].label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            <Text style={styles.countLabel}>{filteredStaff.length} member{filteredStaff.length !== 1 ? 's' : ''}</Text>
        </View>
    ), [search, filter, filteredStaff.length]);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" translucent />

            {/* Nav */}
            <View style={styles.nav}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.title}>Staff Team</Text>
                <TouchableOpacity onPress={openModal} style={styles.addBtn} activeOpacity={0.8}>
                    <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={COLORS.primary} size="large" />
                </View>
            ) : (
                <FlashList
                    data={filteredStaff}
                    renderItem={({ item }: { item: any }) => (
                        <StaffCard
                            staff={item}
                            onUpdate={handleUpdate}
                            onLongPressDelete={handleLongPressDelete}
                        />
                    )}
                    keyExtractor={(item: any) => item._id}
                    estimatedItemSize={100}
                    ListHeaderComponent={ListHeader}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={() => (
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="account-group-outline" size={56} color="rgba(255,255,255,0.1)" />
                            <Text style={styles.emptyTxt}>No staff found</Text>
                            <Text style={styles.emptySub}>Tap + to add a waiter or security guard</Text>
                        </View>
                    )}
                />
            )}

            {/* ─── Single Shared Delete Sheet ──────────────────────────── */}
            <Modal
                visible={!!pendingDelete}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => setPendingDelete(null)}
            >
                <Pressable style={styles.deleteOverlay} onPress={() => setPendingDelete(null)}>
                    <View style={styles.deleteSheet}>
                        <View style={styles.deleteIconRing}>
                            <View style={styles.deleteIconInner}>
                                <Ionicons name="person-remove-outline" size={28} color="#EF4444" />
                            </View>
                        </View>
                        <Text style={styles.deleteTitle}>Remove Staff Member?</Text>
                        <Text style={styles.deleteName}>"{pendingDelete?.fullName}"</Text>
                        <Text style={styles.deleteMessage}>
                            This will immediately revoke their access. You can re-add them at any time.
                        </Text>
                        <TouchableOpacity
                            style={styles.deleteConfirmBtn}
                            onPress={confirmDelete}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={['#EF4444', '#DC2626']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={styles.deleteGrad}
                            >
                                <Ionicons name="trash-outline" size={18} color="#FFF" />
                                <Text style={styles.deleteConfirmTxt}>Yes, Remove</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={() => setPendingDelete(null)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.cancelTxt}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>

            {/* Add Staff Modal */}
            <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowAddModal(false)} />
                    <View style={styles.sheet}>
                        {/* Sheet handle */}
                        <View style={styles.handle} />
                        <View style={styles.sheetHeader}>
                            <Text style={styles.sheetTitle}>Add Staff Member</Text>
                            <TouchableOpacity onPress={() => setShowAddModal(false)}>
                                <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                            {/* Role Picker */}
                            <Text style={styles.sectionLabel}>ASSIGN ROLE</Text>
                            <RolePicker value={form.staffType} onChange={(r) => setField('staffType', r)} />

                            {/* Basic Info */}
                            <Text style={styles.sectionLabel}>BASIC INFO</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Full Name *"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                value={form.fullName}
                                onChangeText={v => setField('fullName', v)}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Username (optional)"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                value={form.username}
                                onChangeText={v => setField('username', v)}
                                autoCapitalize="none"
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Phone Number *"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                value={form.phone}
                                onChangeText={v => setField('phone', v)}
                                keyboardType="phone-pad"
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Email (optional)"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                value={form.email}
                                onChangeText={v => setField('email', v)}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />

                            {/* Active Toggle */}
                            <View style={styles.switchRow}>
                                <Text style={styles.switchLabel}>Active / On Duty</Text>
                                <Switch
                                    value={form.isActive}
                                    onValueChange={v => setField('isActive', v)}
                                    trackColor={{ false: '#333', true: COLORS.primary }}
                                    thumbColor="white"
                                />
                            </View>

                            {/* Save Button */}
                            <TouchableOpacity
                                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                                onPress={handleSave}
                                disabled={saving}
                                activeOpacity={0.85}
                            >
                                {saving ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.saveBtnText}>Add {ROLE_CONFIG[form.staffType].label}</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050505' },
    nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
    title: { color: 'white', fontSize: 18, fontWeight: '800' },
    addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },

    listHeader: { marginBottom: 16, marginTop: 8 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 16, paddingHorizontal: 16, height: 50, marginBottom: 14 },
    searchInput: { flex: 1, color: 'white', fontSize: 14, marginLeft: 12, fontWeight: '600' },
    filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    filterTab: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: '#111' },
    filterTabActive: { backgroundColor: COLORS.primary },
    filterText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800' },
    filterTextActive: { color: 'white' },
    countLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '600', marginLeft: 4 },

    empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
    emptyTxt: { color: 'rgba(255,255,255,0.3)', fontSize: 16, fontWeight: '700', marginTop: 16 },
    emptySub: { color: 'rgba(255,255,255,0.15)', fontSize: 13, marginTop: 8, textAlign: 'center' },

    // Modal/Sheet
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
    sheet: { backgroundColor: '#0E0F1A', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '88%' },
    handle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    sheetTitle: { color: 'white', fontSize: 20, fontWeight: '800' },

    sectionLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 12, marginTop: 16 },

    // Role picker
    roleRow: { flexDirection: 'row', gap: 12 },
    roleBadge: { flex: 1, backgroundColor: '#161825', borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.05)', padding: 14, alignItems: 'center', gap: 8 },
    roleLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '800' },
    roleDesc: { color: 'rgba(255,255,255,0.25)', fontSize: 10, textAlign: 'center', lineHeight: 14 },

    // Form fields
    input: { backgroundColor: '#161825', color: 'white', borderRadius: 16, paddingHorizontal: 18, height: 54, fontSize: 15, fontWeight: '500', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161825', borderRadius: 16, paddingHorizontal: 18, height: 56, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
    switchLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600' },

    saveBtn: { backgroundColor: COLORS.primary, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
    saveBtnText: { color: 'white', fontSize: 16, fontWeight: '800' },

    // ─── Delete confirmation sheet ────────────────────────────────────────────
    deleteOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
    deleteSheet: { width: '100%', backgroundColor: '#0F1120', borderRadius: 28, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.18)' },
    deleteIconRing: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(239,68,68,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.2)' },
    deleteIconInner: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(239,68,68,0.15)', alignItems: 'center', justifyContent: 'center' },
    deleteTitle: { color: 'white', fontSize: 20, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
    deleteName: { color: '#EF4444', fontSize: 15, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
    deleteMessage: { color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 28 },
    deleteConfirmBtn: { width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
    deleteGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
    deleteConfirmTxt: { color: 'white', fontSize: 16, fontWeight: '800' },
    cancelBtn: { width: '100%', paddingVertical: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
    cancelTxt: { color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: '700' },
});
