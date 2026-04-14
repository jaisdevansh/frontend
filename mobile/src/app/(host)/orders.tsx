import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStrictBack } from '../../hooks/useStrictBack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { useToast } from '../../context/ToastContext';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

import { hostService } from '../../services/hostService';

export default function MobilePOSOrders() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const goBack = useStrictBack('/(host)/dashboard');
    const { showToast } = useToast();

    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchOrders = async () => {
        try {
            const res = await hostService.getOrders();
            if (res.success) {
                // RULE: Only show orders that have been paid (confirmed/accepted/preparing/out_for_delivery)
                const paid = (res.data || []).filter((o: any) => 
                    o.paymentStatus === 'paid' && 
                    ['confirmed', 'accepted', 'preparing', 'out_for_delivery'].includes(o.status)
                );
                setOrders(paid);
            }
        } catch (error) {
            // Silent error
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const updateStatus = async (id: string, newStatus: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        // Optimistic UI Update
        setOrders(prev => prev.map(o => o._id === id ? { ...o, status: newStatus } : o));
        showToast(`Order marked as ${newStatus.toUpperCase()}`, 'success');
        
        if (newStatus === 'completed') {
            setTimeout(() => {
                setOrders(prev => prev.filter(o => o._id !== id));
            }, 1000);
        }

        try {
            await hostService.updateOrderStatus(id, newStatus);
        } catch (error) {
            showToast('Failed to sync. Please retry.', 'error');
            fetchOrders(); // Rollback
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        let bg = 'rgba(255,255,255,0.1)';
        let color = '#FFF';
        if (status === 'confirmed')       { bg = 'rgba(255,215,0,0.1)';    color = '#FFD700'; }
        if (status === 'accepted')        { bg = 'rgba(124, 77, 255, 0.1)'; color = '#7c4dff'; }
        if (status === 'preparing')       { bg = 'rgba(79, 70, 229, 0.1)';  color = '#4F46E5'; }
        if (status === 'out_for_delivery') { bg = 'rgba(245, 158, 11, 0.1)'; color = '#f59e0b'; }
        if (status === 'completed')        { bg = 'rgba(34, 197, 94, 0.1)';  color = '#22c55e'; }

        return (
            <View style={[styles.badge, { backgroundColor: bg }]}>
                <Text style={[styles.badgeTxt, { color }]}>{status.toUpperCase()}</Text>
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <View style={styles.headerTextGroup}>
                    <Text style={styles.headerTitle}>Live Orders POS</Text>
                    <Text style={styles.headerSubtitle}>Discovery Radar Service</Text>
                </View>
                <View style={styles.liveIndicator}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveTxt}>SYNCED</Text>
                </View>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#7c4dff" />
                </View>
            ) : (
                    <FlatList
                        data={orders}
                        keyExtractor={(item) => item._id}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyWrap}>
                                <Ionicons name="restaurant-outline" size={64} color="rgba(255,255,255,0.1)" />
                                <Text style={styles.emptyTxt}>No active orders</Text>
                            </View>
                        )}
                        initialNumToRender={5}
                        maxToRenderPerBatch={10}
                        windowSize={5}
                        removeClippedSubviews={true}
                        renderItem={({ item: order }) => (
                            <View style={styles.orderCard}>
                                <View style={styles.cardHeader}>
                                    <View>
                                        <Text style={styles.guestName}>{order.userId?.name || 'Guest'}</Text>
                                        <Text style={styles.orderTime}>{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • ₹{order.totalAmount}</Text>
                                        {order.tipAmount > 0 && <Text style={{ color: '#f59e0b', fontSize: 11, fontWeight: '700', marginTop: 2 }}>Tip: ₹{order.tipAmount} 🙏</Text>}
                                    </View>
                                    <StatusBadge status={order.status} />
                                </View>
                                
                                <View style={styles.itemsWrap}>
                                    {order.items.map((it: any, idx: number) => (
                                        <View key={idx} style={styles.itemRow}>
                                            <View style={styles.qtyBox}><Text style={styles.qtyTxt}>{it.qty || it.quantity}x</Text></View>
                                            <Text style={styles.itemName}>{it.name}</Text>
                                            <Text style={{ color: 'rgba(255,255,255,0.4)', marginLeft: 'auto', fontSize: 13 }}>₹{(it.price * (it.qty || it.quantity))}</Text>
                                        </View>
                                    ))}
                                </View>

                                <View style={styles.actionsBox}>
                                    {order.status === 'confirmed' && (
                                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#7c4dff' }]} onPress={() => updateStatus(order._id, 'preparing')}>
                                            <Text style={styles.actionBtnTxt}>Accept & Prepare</Text>
                                        </TouchableOpacity>
                                    )}
                                    {order.status === 'preparing' && (
                                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#f59e0b' }]} onPress={() => updateStatus(order._id, 'out_for_delivery')}>
                                            <Text style={[styles.actionBtnTxt, { color: '#000' }]}>Send Out</Text>
                                        </TouchableOpacity>
                                    )}
                                    {order.status === 'out_for_delivery' && (
                                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.emerald }]} onPress={() => updateStatus(order._id, 'completed')}>
                                            <Text style={[styles.actionBtnTxt, { color: '#000', fontWeight: '900' }]}>Mark Delivered</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        )}
                    />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#030303' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 16 },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    headerTextGroup: { flex: 1 },
    headerTitle: { color: '#FFF', fontSize: 24, fontWeight: '800' },
    headerSubtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4, fontWeight: '600' },
    
    liveIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(34, 197, 94, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 6 },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.emerald },
    liveTxt: { color: COLORS.emerald, fontSize: 10, fontWeight: '900', letterSpacing: 1 },

    scrollContent: { paddingHorizontal: SPACING.lg, paddingBottom: 100 },
    emptyWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 16, marginTop: 16, fontWeight: '600' },

    orderCard: { backgroundColor: '#0d0620', borderRadius: BORDER_RADIUS.xl, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(124, 77, 255, 0.2)' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    guestName: { color: '#FFF', fontSize: 18, fontWeight: '800' },
    orderTime: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4, fontWeight: '600' },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    badgeTxt: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },

    itemsWrap: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingVertical: 16, marginBottom: 16, gap: 12 },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    qtyBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    qtyTxt: { color: '#FFF', fontSize: 14, fontWeight: '800' },
    itemName: { color: '#FFF', fontSize: 16, fontWeight: '500' },

    actionsBox: { flexDirection: 'row' },
    actionBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    actionBtnTxt: { color: '#FFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 }
});
