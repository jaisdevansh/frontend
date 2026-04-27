import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Modal, Dimensions, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter } from 'expo-router';
import { useStrictBack } from '../../hooks/useStrictBack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { useToast } from '../../context/ToastContext';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { hostService } from '../../services/hostService';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '../../services/cloudinaryService';

const { width } = Dimensions.get('window');

interface MenuItem {
    _id?: string;
    name: string;
    category: string;
    desc: string;
    price: number;
    image: string;
    inStock: boolean;
}

export default function HostVenueMenu() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const goBack = useStrictBack('/(host)/venue-profile');
    const { showToast } = useToast();
    const scrollViewRef = useRef<KeyboardAwareScrollView>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [modalVisible, setModalVisible] = useState(false);

    // New/Edit Item Form
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [itemName, setItemName] = useState('');
    const [itemType, setItemType] = useState('Cocktail');
    const [itemDescription, setItemDescription] = useState('');
    const [itemPrice, setItemPrice] = useState('');
    const [itemImage, setItemImage] = useState('');

    const [keyboardHeight, setKeyboardHeight] = useState(0);
    useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
        const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
        return () => { show.remove(); hide.remove(); };
    }, []);

    useEffect(() => { fetchVenueMenu(); }, []);

    const fetchVenueMenu = async () => {
        try {
            const res = await hostService.getMenuItems();
            if (res.success) {
                setMenuItems(res.data || []);
            }
        } catch (error) {
            showToast('Failed to load menu', 'error');
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.3,
            base64: true, // Absolute hydration for faster transfers
        });

        if (!result.canceled) {
            const asset = result.assets[0];
            const imgUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
            setItemImage(imgUri);
        }
    };

    const handleAddItem = () => {
        setEditIndex(null);
        setItemName('');
        setItemType('Cocktail');
        setItemDescription('');
        setItemPrice('');
        setItemImage('');
        setModalVisible(true);
    };

    const handleEditItem = (index: number) => {
        const item = menuItems[index];
        setEditIndex(index);
        setItemName(item.name);
        setItemType(item.category);
        setItemDescription(item.desc);
        setItemPrice(item.price ? String(item.price) : '');
        setItemImage(item.image);
        setModalVisible(true);
    };

    const handleSaveItem = async () => {
        if (!itemName || !itemType) {
            showToast('Name and Type are required', 'error');
            return;
        }
        setSaving(true);
        try {
            let imageUrl = itemImage;
            if (itemImage && (itemImage.startsWith('file://') || itemImage.startsWith('data:image'))) {
                try { imageUrl = await uploadImage(itemImage); } catch (_) {}
            }

            const payload = {
                name: itemName,
                category: itemType,
                desc: itemDescription,
                price: parseFloat(itemPrice) || 0,
                image: imageUrl,
                inStock: true
            };

            let res;
            if (editIndex !== null && menuItems[editIndex]?._id) {
                res = await hostService.updateMenuItem(menuItems[editIndex]._id!, payload);
            } else {
                res = await hostService.addMenuItem(payload);
            }

            if (res.success) {
                showToast(editIndex !== null ? 'Item updated!' : 'Item added!', 'success');
                setModalVisible(false);
                fetchVenueMenu(); // Refresh from DB
            } else {
                showToast(res.message || 'Failed to save item', 'error');
            }
        } catch (error: any) {
            showToast(error?.response?.data?.message || 'Failed to save item', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteItem = async (index: number) => {
        const item = menuItems[index];
        if (!item._id) {
            setMenuItems(prev => prev.filter((_, i) => i !== index));
            return;
        }
        try {
            await hostService.removeMenuItem(item._id);
            showToast('Item removed', 'success');
            setMenuItems(prev => prev.filter((_, i) => i !== index));
        } catch (error) {
            showToast('Failed to remove item', 'error');
        }
    };


    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <TouchableOpacity style={styles.backBtn} onPress={() => goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>

                <View style={styles.header}>
                    <View style={styles.titleRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title}>Menu Offerings</Text>
                            <Text style={styles.subtitle}>Curate your drinks and food items</Text>
                        </View>
                        {menuItems.length > 0 && (
                            <TouchableOpacity style={styles.addPill} onPress={handleAddItem}>
                                <Ionicons name="add" size={18} color={COLORS.background.dark} />
                                <Text style={styles.addPillText}>New</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
                {menuItems.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconContainer}>
                            <Ionicons name="wine-outline" size={56} color="rgba(255,255,255,0.1)" />
                        </View>
                        <Text style={styles.emptyText}>Your menu is empty</Text>
                        <TouchableOpacity style={styles.emptyAddBtn} onPress={handleAddItem}>
                            <Text style={styles.emptyAddText}>+ Create Item</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.menuGrid}>
                        {menuItems.map((item, index) => (
                            <View key={index} style={styles.menuCard}>
                                {item.image ? (
                                    <Image source={{ uri: item.image }} style={styles.cardImg} />
                                ) : (
                                    <View style={styles.cardImgPlaceholder}>
                                        <Ionicons name="wine-outline" size={32} color="rgba(255,255,255,0.1)" />
                                    </View>
                                )}
                                <View style={styles.cardContent}>
                                    <View style={styles.typeBadge}>
                                        <Text style={styles.typeText}>{item.category}</Text>
                                    </View>
                                    <Text style={styles.itemName}>{item.name}</Text>
                                    <Text style={styles.itemPrice}>₹{item.price}</Text>
                                    <Text style={styles.itemDesc} numberOfLines={1}>{item.desc}</Text>

                                    <View style={styles.cardActions}>
                                        <TouchableOpacity onPress={() => handleEditItem(index)}>
                                            <Ionicons name="pencil" size={18} color="rgba(255,255,255,0.5)" />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleDeleteItem(index)}>
                                            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <Button
                    title="Done"
                    onPress={() => goBack()}
                />
            </View>

            {/* Add/Edit Modal */}
            <Modal 
                visible={modalVisible} 
                transparent 
                animationType="slide"
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
                            <Text style={[styles.modalTitle, { flex: 1 }]}>{editIndex !== null ? 'Edit Item' : 'New Offering'}</Text>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 40 }}
                            keyboardShouldPersistTaps="handled"
                        >
                            <TouchableOpacity style={styles.modalImagePicker} onPress={pickImage}>
                                {itemImage ? (
                                    <Image source={{ uri: itemImage }} style={styles.modalPreviewImg} />
                                ) : (
                                    <View style={styles.imagePlaceholder}>
                                        <Ionicons name="camera" size={32} color={COLORS.primary} />
                                        <Text style={styles.uploadText}>Add Product Photo</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            <Input
                                label="Item Name"
                                value={itemName}
                                onChangeText={setItemName}
                                placeholder="e.g. Signature Margarita"
                            />

                            <Input
                                label="Price (INR)"
                                value={itemPrice}
                                onChangeText={setItemPrice}
                                placeholder="e.g. 1500"
                                keyboardType="numeric"
                            />

                            <View style={styles.typeSelector}>
                                <Text style={styles.label}>Category</Text>
                                <View style={styles.typeRow}>
                                    {['Cocktail', 'Mocktail', 'Beer', 'Dish', 'Appetizer'].map((type) => (
                                        <TouchableOpacity
                                            key={type}
                                            style={[styles.typeChip, itemType === type && styles.activeChip]}
                                            onPress={() => setItemType(type)}
                                        >
                                            <Text style={[styles.chipText, itemType === type && styles.activeChipText]}>{type}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <Input
                                label="Description"
                                value={itemDescription}
                                onChangeText={setItemDescription}
                                placeholder="Tell us what makes it special..."
                                multiline
                            />

                            <Button title="Save Item to List" onPress={handleSaveItem} style={{ marginTop: 12 }} />
                            </ScrollView>
                    </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background.dark,
    },
    header: {
        marginBottom: 32,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    title: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 14,
        marginTop: 6,
    },
    addPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 4,
    },
    addPillText: {
        color: COLORS.background.dark,
        fontWeight: '800',
        fontSize: 14,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        marginBottom: 20,
    },
    scrollContent: {
        padding: SPACING.lg,
        paddingBottom: 140,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
    },
    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.02)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    emptyText: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
    },
    emptyAddBtn: {
        marginTop: 20,
        backgroundColor: 'rgba(115, 148, 10, 0.1)',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    emptyAddText: {
        color: COLORS.primary,
        fontWeight: '800',
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    menuGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    menuCard: {
        width: (width - SPACING.lg * 2 - 16) / 2,
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    cardImg: {
        width: '100%',
        height: 160,
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    cardImgPlaceholder: {
        width: '100%',
        height: 160,
        backgroundColor: 'rgba(255,255,255,0.01)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardContent: {
        padding: 16,
    },
    typeBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    typeText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    itemName: {
        color: 'white',
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 2,
    },
    itemPrice: {
        color: COLORS.primary,
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 6,
    },
    itemDesc: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        lineHeight: 18,
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 16,
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    footer: {
        padding: SPACING.lg,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(11, 15, 26, 0.95)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.background.dark,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        padding: 24,
        paddingTop: 32,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    modalTitle: {
        color: 'white',
        fontSize: 24,
        fontWeight: '800',
    },
    modalImagePicker: {
        width: 120,
        height: 120,
        borderRadius: BORDER_RADIUS.xl,
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.1)',
        borderStyle: 'dashed',
        marginBottom: 32,
        alignSelf: 'center',
        overflow: 'hidden',
    },
    modalPreviewImg: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadText: {
        color: COLORS.primary,
        fontSize: 12,
        fontWeight: '700',
        marginTop: 8,
        textAlign: 'center',
        paddingHorizontal: 8,
    },
    label: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 12,
        marginLeft: 4,
    },
    typeSelector: {
        marginBottom: 28,
    },
    typeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    typeChip: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    activeChip: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    chipText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 14,
        fontWeight: '600',
    },
    activeChipText: {
        color: COLORS.background.dark,
        fontWeight: '700',
    }
});
