import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, Modal, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { hostService } from '../../services/hostService';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useToast } from '../../context/ToastContext';
import { useAlert } from '../../context/AlertProvider';
import { API_BASE_URL } from '../../services/apiClient';
import { io, Socket } from 'socket.io-client';

const FLOOR_ICONS = ['star', 'wine', 'cafe', 'flame', 'diamond', 'accessibility', 'sparkles'];
const FLOOR_COLORS = ['#7C4DFF', '#FF4D4D', '#4DFF88', '#FFD700', '#00D1FF', '#FF00FF', '#FFFFFF'];

interface Floor {
    _id: string;
    name: string;
    price: number;
    capacity: number;
    bookedCount: number;
    perks: string[];
    color: string;
    icon: string;
    isActive: boolean;
    visibility: 'public' | 'private';
}

export default function FloorManager() {
    const { eventId } = useLocalSearchParams<{ eventId: string }>();
    const router = useRouter();
    const { showToast } = useToast();
    const { showAlert } = useAlert();
    const [floors, setFloors] = useState<Floor[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingFloor, setEditingFloor] = useState<Partial<Floor> | null>(null);
    
    // Form State
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [capacity, setCapacity] = useState('');
    const [perks, setPerks] = useState<string[]>([]);
    const [newPerk, setNewPerk] = useState('');
    const [selectedColor, setSelectedColor] = useState(FLOOR_COLORS[0]);
    const [selectedIcon, setSelectedIcon] = useState(FLOOR_ICONS[0]);
    const [visibility, setVisibility] = useState<'public' | 'private'>('public');
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        if (eventId) {
            fetchFloors();

            const newSocket = io(API_BASE_URL);
            setSocket(newSocket);

            newSocket.on('floor_update', (data: { eventId: string, floors: Floor[] }) => {
                if (data.eventId === eventId) {
                    setFloors(data.floors);
                }
            });

            return () => {
                newSocket.disconnect();
            };
        }
    }, [eventId]);

    const fetchFloors = async () => {
        try {
            setLoading(true);
            const res = await hostService.getFloors(eventId);
            if (res.success) {
                setFloors(res.data);
            }
        } catch (error) {
            showToast('Failed to fetch floors', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAddOrUpdate = async () => {
        if (!name || !price || !capacity) {
            showToast('Please fill all required fields', 'error');
            return;
        }

        const payload = {
            name,
            price: Number(price),
            capacity: Number(capacity),
            perks,
            color: selectedColor,
            icon: selectedIcon,
            visibility,
            isActive: true
        };

        try {
            setLoading(true);
            let res;
            if (editingFloor?._id) {
                res = await hostService.updateFloor(eventId, editingFloor._id, payload);
            } else {
                res = await hostService.addFloor(eventId, payload);
            }

            if (res.success) {
                showToast(editingFloor ? 'Floor updated' : 'Floor added', 'success');
                setModalVisible(false);
                fetchFloors();
                resetForm();
            }
        } catch (error: any) {
            showToast(error?.response?.data?.message || 'Action failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (floorId: string) => {
        showAlert(
            "Delete Floor Section",
            "Are you sure you want to delete this section? This action will permanently remove it from the event map and cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive", 
                    onPress: async () => {
                        try {
                            const res = await hostService.deleteFloor(eventId, floorId);
                            if (res.success) {
                                showToast('Floor deleted successfully', 'success');
                                fetchFloors();
                            }
                        } catch (error) {
                            showToast('Failed to delete floor', 'error');
                        }
                    } 
                }
            ]
        );
    };

    const resetForm = () => {
        setName('');
        setPrice('');
        setCapacity('');
        setPerks([]);
        setNewPerk('');
        setSelectedColor(FLOOR_COLORS[0]);
        setSelectedIcon(FLOOR_ICONS[0]);
        setVisibility('public');
        setEditingFloor(null);
    };

    const openEditModal = (floor: Floor) => {
        setEditingFloor(floor);
        setName(floor.name);
        setPrice(floor.price.toString());
        setCapacity(floor.capacity.toString());
        setPerks(floor.perks);
        setSelectedColor(floor.color);
        setSelectedIcon(floor.icon);
        setVisibility(floor.visibility);
        setModalVisible(true);
    };

    const addPerk = () => {
        if (newPerk.trim()) {
            setPerks([...perks, newPerk.trim()]);
            setNewPerk('');
        }
    };

    const removePerk = (index: number) => {
        setPerks(perks.filter((_, i) => i !== index));
    };

    const renderFloorCard = ({ item }: { item: Floor }) => (
        <View style={[styles.floorCard, { borderColor: item.color }]}>
            <View style={styles.floorHeader}>
                <View style={styles.iconContainer}>
                    <Ionicons name={item.icon as any} size={24} color={item.color} />
                    <View>
                        <Text style={styles.floorTitle}>{item.name}</Text>
                        <Text style={styles.floorSubtitle}>{item.visibility.toUpperCase()} SECTION</Text>
                    </View>
                </View>
                <View style={styles.floorActions}>
                    <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionBtn}>
                        <Ionicons name="pencil" size={18} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.actionBtn}>
                        <Ionicons name="trash-outline" size={18} color="#FF4D4D" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.stat}>
                    <Text style={styles.statLabel}>PRICE</Text>
                    <Text style={styles.statValue}>₹{item.price}</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={styles.statLabel}>CAPACITY</Text>
                    <Text style={styles.statValue}>{item.capacity}</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={styles.statLabel}>BOOKED</Text>
                    <Text style={styles.statValue}>{item.bookedCount}</Text>
                </View>
            </View>

            {item.perks.length > 0 && (
                <View style={styles.perksContainer}>
                    {item.perks.slice(0, 3).map((perk, i) => (
                        <View key={i} style={styles.perkBadge}>
                            <Text style={styles.perkText}>{perk}</Text>
                        </View>
                    ))}
                    {item.perks.length > 3 && (
                        <Text style={styles.morePerks}>+{item.perks.length - 3} more</Text>
                    )}
                </View>
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.title}>Event Floors</Text>
                <TouchableOpacity 
                    onPress={() => { resetForm(); setModalVisible(true); }}
                    style={styles.addBtn}
                >
                    <Ionicons name="add" size={24} color={COLORS.primary} />
                </TouchableOpacity>
            </View>

            {loading && !modalVisible ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={floors}
                    renderItem={renderFloorCard}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="layers-outline" size={64} color="rgba(255,255,255,0.1)" />
                            <Text style={styles.emptyText}>No floors created yet</Text>
                            <Text style={styles.emptySubtext}>Add sections like VIP, VVIP, or Standard</Text>
                        </View>
                    }
                />
            )}

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingFloor ? 'Edit Floor' : 'Create New Floor'}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Input
                                label="SECTION NAME"
                                placeholder="e.g. VIP Lounge, General Access"
                                value={name}
                                onChangeText={setName}
                            />

                            <View style={styles.formRow}>
                                <View style={{ flex: 1 }}>
                                    <Input
                                        label="PRICE (₹)"
                                        placeholder="0"
                                        value={price}
                                        onChangeText={setPrice}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={{ width: 16 }} />
                                <View style={{ flex: 1 }}>
                                    <Input
                                        label="CAPACITY"
                                        placeholder="0"
                                        value={capacity}
                                        onChangeText={setCapacity}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>

                            <Text style={styles.label}>SECTION COLOR</Text>
                            <View style={styles.colorRow}>
                                {FLOOR_COLORS.map((c) => (
                                    <TouchableOpacity
                                        key={c}
                                        style={[
                                            styles.colorCircle,
                                            { backgroundColor: c },
                                            selectedColor === c && styles.selectedCircle
                                        ]}
                                        onPress={() => setSelectedColor(c)}
                                    />
                                ))}
                            </View>

                            <Text style={styles.label}>SECTION ICON</Text>
                            <View style={styles.iconRow}>
                                {FLOOR_ICONS.map((i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={[
                                            styles.iconBox,
                                            selectedIcon === i && { backgroundColor: 'rgba(124, 77, 255, 0.2)', borderColor: COLORS.primary }
                                        ]}
                                        onPress={() => setSelectedIcon(i)}
                                    >
                                        <Ionicons name={i as any} size={20} color={selectedIcon === i ? COLORS.primary : '#AAA'} />
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>VISIBILITY</Text>
                            <View style={styles.visibilityRow}>
                                <TouchableOpacity 
                                    style={[styles.visibilityBtn, visibility === 'public' && styles.visibilityBtnActive]}
                                    onPress={() => setVisibility('public')}
                                >
                                    <Text style={[styles.visibilityText, visibility === 'public' && styles.visibilityTextActive]}>PUBLIC</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.visibilityBtn, visibility === 'private' && styles.visibilityBtnActive]}
                                    onPress={() => setVisibility('private')}
                                >
                                    <Text style={[styles.visibilityText, visibility === 'private' && styles.visibilityTextActive]}>PRIVATE</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.label}>PERKS (OPTIONAL)</Text>
                            <View style={styles.perkInputRow}>
                                <View style={{ flex: 1 }}>
                                    <Input
                                        placeholder="Add a perk (e.g. Free Welcome Drink)"
                                        value={newPerk}
                                        onChangeText={setNewPerk}
                                        containerStyle={{ marginBottom: 0 }}
                                    />
                                </View>
                                <TouchableOpacity onPress={addPerk} style={styles.addPerkBtn}>
                                    <Ionicons name="add" size={20} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                            
                            <View style={styles.perksList}>
                                {perks.map((p, index) => (
                                    <View key={index} style={styles.perkItem}>
                                        <Text style={styles.perkItemText}>{p}</Text>
                                        <TouchableOpacity onPress={() => removePerk(index)}>
                                            <Ionicons name="close-circle" size={16} color="#FF4D4D" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>

                            <Button
                                title={editingFloor ? "Update Section" : "Create Section"}
                                onPress={handleAddOrUpdate}
                                loading={loading}
                                style={{ marginTop: 20, marginBottom: 40 }}
                            />
                        </ScrollView>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    backBtn: {
        padding: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFF',
    },
    addBtn: {
        padding: 8,
    },
    listContent: {
        padding: SPACING.md,
    },
    floorCard: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderLeftWidth: 4,
    },
    floorHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.md,
    },
    iconContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    floorTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFF',
    },
    floorSubtitle: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: 1,
        marginTop: 2,
    },
    floorActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    stat: {
        alignItems: 'flex-start',
    },
    statLabel: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.4)',
        marginBottom: 2,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
    },
    perksContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: SPACING.md,
    },
    perkBadge: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    perkText: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.6)',
    },
    morePerks: {
        fontSize: 11,
        color: COLORS.primary,
        alignSelf: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1A1A1A',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: SPACING.xl,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#FFF',
    },
    formRow: {
        flexDirection: 'row',
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.4)',
        marginTop: SPACING.md,
        marginBottom: SPACING.sm,
    },
    colorRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: SPACING.md,
    },
    colorCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    selectedCircle: {
        borderWidth: 3,
        borderColor: '#FFF',
    },
    iconRow: {
        flexDirection: 'row',
        gap: 12,
        flexWrap: 'wrap',
        marginBottom: SPACING.md,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    visibilityRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: SPACING.md,
    },
    visibilityBtn: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    visibilityBtnActive: {
        backgroundColor: COLORS.primary,
    },
    visibilityText: {
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '700',
        fontSize: 12,
    },
    visibilityTextActive: {
        color: '#FFF',
    },
    perkInputRow: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
    },
    addPerkBtn: {
        backgroundColor: COLORS.primary,
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    perksList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: SPACING.sm,
    },
    perkItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 6,
    },
    perkItemText: {
        color: '#FFF',
        fontSize: 12,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
    },
    emptyText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
        marginTop: 16,
    },
    emptySubtext: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 14,
        marginTop: 4,
    }
});
