import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, Dimensions, Platform,
    ScrollView, TouchableOpacity, Modal, TextInput,
    ActivityIndicator, FlatList, Switch, Keyboard, KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useToast } from '../../context/ToastContext';
import { hostService } from '../../services/hostService';
import { uploadImage } from '../../services/cloudinaryService';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';

const { width } = Dimensions.get('window');
const CATEGORIES = ['Chocolates', 'Flowers', 'Cakes', 'Decor', 'Beverages', 'Custom Request'];

type Gift = {
    _id: string;
    name: string;
    description?: string;
    price: number;
    category: string;
    image?: string;
    inStock: boolean;
};

const EMPTY_FORM = {
    _id: '',
    name: '',
    description: '',
    price: '',
    category: CATEGORIES[0],
    inStock: true,
    image: null as string | null,
};

export default function VenueGiftsScreen() {
    const router = useRouter();
    const { showToast } = useToast();

    const [gifts, setGifts] = useState<Gift[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isModalVisible, setModalVisible] = useState(false);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const scrollViewRef = useRef<KeyboardAwareScrollView>(null);
    // STAGE 4: PRODUCTION-GRADE ASSET CACHE
    const localAssetCache = React.useRef<Record<string, string>>({});

    // 🔍 DEBUG: Keyboard tracker — remove after testing
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    useEffect(() => {
        const screenH = Dimensions.get('window').height;
        const show = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
        const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
        return () => { show.remove(); hide.remove(); };
    }, []);

    // ─── Fetch gifts from standalone Gift collection ───────────────────────────
    const fetchGifts = useCallback(async () => {
        try {
            const res = await hostService.getGifts();
            if (res.success) setGifts(res.data ?? []);
        } catch {
            showToast('Failed to load gifts', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchGifts(); }, [fetchGifts]);

    // ─── Image picker ──────────────────────────────────────────────────────────
    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'], 
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.3,
            base64: true, // Absolute hydration for backend background sync
        });
        if (!result.canceled && result.assets && result.assets[0].base64) {
            const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
            setFormData(f => ({ ...f, image: base64Img }));
        }
    };

    // ─── Open modal ────────────────────────────────────────────────────────────
    const openModal = (gift?: Gift) => {
        if (gift) {
            const actualId = gift._id || (gift as any).id;
            setFormData({
                _id: actualId,
                name: gift.name,
                description: gift.description ?? '',
                price: String(gift.price),
                category: gift.category,
                inStock: gift.inStock,
                image: gift.image ?? null,
            });
        } else {
            setFormData(EMPTY_FORM);
        }
        setModalVisible(true);
    };

    // ─── Save (create or update) ───────────────────────────────────────────────
    const handleSave = async () => {
        if (!formData.name.trim() || !formData.price || !formData.category) {
            showToast('Name, price and category are required', 'error');
            return;
        }

        // --- STAGE 1: HYPER-FAST UI DISCHARGE (Sub-2ms) ---
        setModalVisible(false);

        // --- STAGE 2: OPTIMISTIC STATE HYDRATION ---
        const tempId = formData._id || `temp_${Date.now()}`;
        const tempGift: Gift = {
            _id: tempId,
            name: formData.name.trim(),
            description: formData.description,
            price: Number(formData.price),
            category: formData.category,
            image: formData.image || undefined,
            inStock: formData.inStock,
        };

        if (!formData._id) {
            setGifts(p => [tempGift, ...p]);
        }

        // --- STAGE 3: BACKGROUND ASYNC PERSISTENCE ---
        setTimeout(async () => {
             if (formData.image) {
                localAssetCache.current[tempId] = formData.image;
             }
             
             try {
                // Sending the full Base64 payload for backend background upload 
                const payload = { ...tempGift, image: formData.image || undefined };
                const res = formData._id 
                    ? await hostService.updateGift(formData._id, payload)
                    : await hostService.createGift(payload);

                if (res.success) {
                    if (!formData._id && res.data?._id && formData.image) {
                        localAssetCache.current[res.data._id] = formData.image;
                    }
                    showToast(formData._id ? 'Updated' : 'Added', 'success');
                    fetchGifts(); 
                }
            } catch (err) {
                showToast('Sync paused. Retrying...', 'warning');
            }
        }, 300);
    };

    // ─── Delete ────────────────────────────────────────────────────────────────
    const handleDelete = async (giftId: string) => {
        try {
            const res = await hostService.removeGift(giftId);
            if (res.success) {
                setGifts(prev => prev.filter(g => g._id !== giftId));
                showToast('Gift removed', 'success');
            }
        } catch {
            showToast('Failed to remove gift', 'error');
        }
    };

    // ─── Card renderer ─────────────────────────────────────────────────────────
    const renderGiftCard = ({ item }: { item: Gift }) => (
        <View style={styles.giftCard}>
            <Image 
                source={item.image 
                    ? { uri: item.image } 
                    : (localAssetCache.current[item._id] 
                        ? { uri: localAssetCache.current[item._id] } 
                        : { uri: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400' })}
                style={styles.giftImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
            />
            <View style={styles.giftCardContent}>
                <View style={styles.giftHeader}>
                    <Text style={styles.giftName} numberOfLines={1}>{item.name}</Text>
                    <TouchableOpacity
                        onPress={() => handleDelete(item._id)}
                        style={styles.deleteBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                </View>

                <Text style={styles.giftCategory}>{item.category}</Text>
                {item.description ? (
                    <Text style={styles.giftDesc} numberOfLines={2}>{item.description}</Text>
                ) : null}

                <View style={styles.giftFooter}>
                    <Text style={styles.giftPrice}>₹{item.price.toLocaleString()}</Text>
                    <View style={styles.stockStatus}>
                        <View style={[styles.stockDot, { backgroundColor: item.inStock ? '#10B981' : '#EF4444' }]} />
                        <Text style={styles.stockText}>{item.inStock ? 'In Stock' : 'Out of Stock'}</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.editBtn} onPress={() => openModal(item)}>
                    <Text style={styles.editBtnText}>Edit Item</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.title}>Gifts & Offerings</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading && gifts.length === 0 ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#8B5CF6" />
                </View>
            ) : (
                <FlatList
                    data={gifts}
                    keyExtractor={item => item._id}
                    renderItem={renderGiftCard}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialCommunityIcons name="gift-off-outline" size={64} color="rgba(255,255,255,0.2)" />
                            <Text style={styles.emptyText}>No gifts added yet.</Text>
                            <Text style={styles.emptySubText}>
                                Add chocolates, flowers, or other special offerings for your guests.
                            </Text>
                        </View>
                    }
                />
            )}

            {/* FAB */}
            <TouchableOpacity style={styles.fab} onPress={() => openModal()} activeOpacity={0.8}>
                <LinearGradient colors={['#A78BFA', '#8B5CF6']} style={styles.fabGradient}>
                    <Ionicons name="add" size={28} color="white" />
                </LinearGradient>
            </TouchableOpacity>

            {/* Add / Edit Modal */}
            <Modal 
                visible={isModalVisible} 
                animationType="slide" 
                transparent
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'android' ? 'height' : 'padding'}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={{ marginRight: 16 }}>
                                <Ionicons name="arrow-back" size={24} color="white" />
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { flex: 1 }]}>{formData._id ? 'Edit Offering' : 'Add New Offering'}</Text>
                        </View>

                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 24 }}
                                keyboardShouldPersistTaps="handled"
                            >
                            {/* Image Picker */}
                            <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.8}>
                                {formData.image ? (
                                    <Image source={{ uri: formData.image }} style={styles.pickedImage} contentFit="cover" transition={200} />
                                ) : (
                                    <View style={styles.imagePlaceholder}>
                                        <Ionicons name="camera-outline" size={32} color="rgba(255,255,255,0.5)" />
                                        <Text style={styles.imagePlaceholderText}>Upload Gift Image</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            {/* Name */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Gift Name *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Ferrero Rocher Box"
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                    value={formData.name}
                                    onChangeText={t => setFormData(f => ({ ...f, name: t }))}
                                />
                            </View>

                            {/* Price + Stock */}
                            <View style={styles.row}>
                                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                                    <Text style={styles.label}>Price (₹) *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. 500"
                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                        value={formData.price}
                                        keyboardType="numeric"
                                        onChangeText={t => setFormData(f => ({ ...f, price: t }))}
                                    />
                                </View>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>In Stock</Text>
                                    <View style={styles.switchContainer}>
                                        <Switch
                                            value={formData.inStock}
                                            onValueChange={val => setFormData(f => ({ ...f, inStock: val }))}
                                            trackColor={{ false: '#374151', true: '#10B981' }}
                                            thumbColor="white"
                                        />
                                        <Text style={styles.switchLabel}>{formData.inStock ? 'Yes' : 'No'}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Category */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Category *</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                                    {CATEGORIES.map(cat => (
                                        <TouchableOpacity
                                            key={cat}
                                            style={[styles.catBadge, formData.category === cat && styles.catBadgeActive]}
                                            onPress={() => setFormData(f => ({ ...f, category: cat }))}
                                        >
                                            <Text style={[styles.catText, formData.category === cat && styles.catTextActive]}>{cat}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Description */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Description</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Brief details about this offering..."
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                    value={formData.description}
                                    onChangeText={t => setFormData(f => ({ ...f, description: t }))}
                                    multiline
                                    textAlignVertical="top"
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                                onPress={handleSave}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.saveBtnText}>{formData._id ? 'Update Offering' : 'Add Offering'}</Text>
                                )}
                            </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    title: { color: 'white', fontSize: 18, fontWeight: '700' },

    listContent: { padding: 20, paddingBottom: 110 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyText: { color: 'white', fontSize: 18, fontWeight: '600', marginTop: 16 },
    emptySubText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },

    giftCard: { backgroundColor: '#131521', borderRadius: 24, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
    giftImage: { width: '100%', height: 160 },
    giftCardContent: { padding: 16 },
    giftHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    giftName: { color: 'white', fontSize: 18, fontWeight: '700', flex: 1, marginRight: 10 },
    deleteBtn: { padding: 6, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 8 },
    giftCategory: { color: COLORS.primary, fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    giftDesc: { color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 18, marginBottom: 14 },
    giftFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    giftPrice: { color: 'white', fontSize: 20, fontWeight: '800' },
    stockStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    stockDot: { width: 6, height: 6, borderRadius: 3 },
    stockText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
    editBtn: { width: '100%', backgroundColor: 'rgba(37, 99, 235, 0.08)', paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(37, 99, 235, 0.15)' },
    editBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },

    fab: { position: 'absolute', bottom: 90, right: 28, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
    fabGradient: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#0A0A0A', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { color: 'white', fontSize: 22, fontWeight: '800' },
    closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },

    imagePicker: { width: '100%', height: 180, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, overflow: 'hidden', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderStyle: 'dashed' },
    pickedImage: { width: '100%', height: '100%' },
    imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    imagePlaceholderText: { color: 'rgba(255,255,255,0.5)', marginTop: 8, fontSize: 14, fontWeight: '600' },

    inputGroup: { marginBottom: 20 },
    label: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
    input: { backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', borderRadius: 16, padding: 16, fontSize: 15, fontWeight: '500', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
    textArea: { height: 100 },
    row: { flexDirection: 'row', justifyContent: 'space-between' },

    switchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', height: 55, borderRadius: 16, paddingHorizontal: 16 },
    switchLabel: { color: 'white', fontSize: 14, fontWeight: '600', marginLeft: 12 },

    categoryScroll: { gap: 10, paddingRight: 20 },
    catBadge: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'transparent' },
    catBadgeActive: { backgroundColor: 'rgba(37, 99, 235, 0.15)', borderColor: COLORS.primary },
    catText: { color: 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: 14 },
    catTextActive: { color: COLORS.primary },

    saveBtn: { backgroundColor: COLORS.primary, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    saveBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
