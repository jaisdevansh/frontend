import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SafeFlashList from '../../components/SafeFlashList';
import apiClient from '../../services/apiClient';
import dayjs from 'dayjs';

const FlashList = SafeFlashList;

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
    pending:    { color: '#FBBF24', bg: 'rgba(251,191,36,0.12)',   label: 'PENDING'    },
    confirmed:  { color: '#34D399', bg: 'rgba(52,211,153,0.12)',   label: 'CONFIRMED'  },
    preparing:  { color: '#FB923C', bg: 'rgba(251,146,60,0.12)',   label: 'PREPARING'  },
    ready:      { color: '#818CF8', bg: 'rgba(129,140,248,0.12)',  label: 'READY'      },
    delivered:  { color: '#34D399', bg: 'rgba(52,211,153,0.10)',   label: 'DELIVERED'  },
    cancelled:  { color: '#FF4D4F', bg: 'rgba(255,77,79,0.10)',    label: 'CANCELLED'  },
};

export default function MyOrders() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            let active = true;
            const fetch = async () => {
                try {
                    setLoading(true);
                    const res = await apiClient.get('/user/orders/my');
                    if (res.data?.success && active) setOrders(res.data.data || []);
                } catch { /* silent */ }
                finally { if (active) setLoading(false); }
            };
            fetch();
            return () => { active = false; };
        }, [])
    );

    const renderOrder = useCallback(({ item }: { item: any }) => {
        const status = item.status?.toLowerCase() || 'pending';
        const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
        const items: any[] = item.items || [];
        const total = item.totalAmount ?? items.reduce((s: number, i: any) => s + (i.price * i.quantity), 0);
        
        // Check if this is a gift (has senderId or receiverId)
        const isGiftReceived = item.receiverId && item.receiverId._id !== item.userId;
        const isGiftSent = item.senderId && item.senderId._id === item.userId;
        const giftLabel = isGiftReceived 
            ? `🎁 Gift from ${item.senderId?.name || 'Someone'}` 
            : isGiftSent 
            ? `🎁 Gift to ${item.receiverId?.name || 'Someone'}` 
            : null;

        return (
            <View style={styles.card}>
                {/* Gift Badge */}
                {giftLabel && (
                    <View style={{ backgroundColor: 'rgba(139,92,246,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(139,92,246,0.2)' }}>
                        <Text style={{ color: '#8B5CF6', fontSize: 11, fontWeight: '800', textAlign: 'center' }}>
                            {giftLabel}
                        </Text>
                    </View>
                )}
                
                {/* Header row */}
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.orderId}>#{String(item._id).slice(-8).toUpperCase()}</Text>
                        <Text style={styles.orderTime}>{dayjs(item.createdAt).format('ddd, DD MMM • hh:mm A')}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
                        <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
                        <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                </View>

                {/* Items list */}
                <View style={styles.itemsList}>
                    {items.slice(0, 3).map((i: any, idx: number) => (
                        <View key={idx} style={styles.itemRow}>
                            <View style={styles.itemQtyBox}>
                                <Text style={styles.itemQty}>{i.quantity}×</Text>
                            </View>
                            <Text style={styles.itemName} numberOfLines={1}>{i.name || i.menuItemId?.name || 'Item'}</Text>
                            <Text style={styles.itemPrice}>₹{(i.price * i.quantity).toLocaleString()}</Text>
                        </View>
                    ))}
                    {items.length > 3 && (
                        <Text style={styles.moreItems}>+{items.length - 3} more items</Text>
                    )}
                </View>

                {/* Footer */}
                <View style={styles.cardFooter}>
                    <View>
                        <Text style={styles.eventName} numberOfLines={1}>
                            {item.eventId?.title || item.eventId || 'In-Event Order'}
                        </Text>
                    </View>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalAmount}>₹{total.toLocaleString()}</Text>
                    </View>
                </View>
            </View>
        );
    }, []);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={22} color="#FFF" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>My Orders</Text>
                    <Text style={styles.headerSub}>{orders.length} order{orders.length !== 1 ? 's' : ''} placed</Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#818CF8" />
                    <Text style={styles.loadingText}>Fetching your orders...</Text>
                </View>
            ) : orders.length === 0 ? (
                <View style={styles.center}>
                    <View style={styles.emptyIconBox}>
                        <Ionicons name="fast-food-outline" size={40} color="rgba(255,255,255,0.2)" />
                    </View>
                    <Text style={styles.emptyTitle}>No orders yet</Text>
                    <Text style={styles.emptySub}>Your food & drink orders from events will appear here.</Text>
                </View>
            ) : (
                <FlashList
                    data={orders}
                    keyExtractor={(item: any) => item._id}
                    renderItem={renderOrder}
                    estimatedItemSize={180}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#030303' },

    header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '800' },
    headerSub: { color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '600', marginTop: 1 },

    listContent: { padding: 16, paddingBottom: 100 },

    card: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        marginBottom: 12,
        overflow: 'hidden',
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, paddingBottom: 12 },
    orderId: { color: '#FFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.4 },
    orderTime: { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

    itemsList: { paddingHorizontal: 16, paddingBottom: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)', paddingTop: 12, gap: 8 },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    itemQtyBox: { width: 28, height: 22, borderRadius: 6, backgroundColor: 'rgba(129,140,248,0.12)', alignItems: 'center', justifyContent: 'center' },
    itemQty: { color: '#818CF8', fontSize: 11, fontWeight: '800' },
    itemName: { flex: 1, color: '#FFF', fontSize: 13, fontWeight: '600' },
    itemPrice: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },
    moreItems: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontStyle: 'italic', marginTop: 2 },

    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
    eventName: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600', maxWidth: 180 },
    totalRow: { alignItems: 'flex-end' },
    totalLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    totalAmount: { color: '#818CF8', fontSize: 16, fontWeight: '900' },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    loadingText: { color: 'rgba(255,255,255,0.3)', marginTop: 12, fontSize: 14 },
    emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    emptyTitle: { color: '#FFF', fontSize: 20, fontWeight: '800', marginBottom: 8 },
    emptySub: { color: 'rgba(255,255,255,0.35)', fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
