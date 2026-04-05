import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../../constants/design-system';
import { staffService } from '../../../services/staffService';
import { useToast } from '../../../context/ToastContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function MyOrdersScreen() {
    const { showToast } = useToast();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const fetchMyOrders = useCallback(async () => {
        try {
            const res = await staffService.getMyOrders();
            if (res.success) {
                setOrders(res.data);
            }
        } catch (error: any) {
            showToast('Failed to fetch your orders', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchMyOrders();
    }, [fetchMyOrders]);

    const handleUpdateStatus = async (orderId: string, currentStatus: string) => {
        setUpdatingId(orderId);
        let nextStatus = '';
        if (currentStatus === 'accepted') nextStatus = 'preparing';
        else if (currentStatus === 'preparing') nextStatus = 'out_for_delivery';
        else if (currentStatus === 'out_for_delivery') nextStatus = 'completed';

        if (!nextStatus) return;

        try {
            const res = await staffService.updateOrderStatus(orderId, nextStatus);
            if (res.success) {
                showToast(`Order updated to ${nextStatus}`, 'success');
                if (nextStatus === 'completed') {
                    setOrders(prev => prev.filter(o => o._id !== orderId));
                } else {
                    setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: nextStatus } : o));
                }
            }
        } catch (error: any) {
            showToast('Failed to update status', 'error');
        } finally {
            setUpdatingId(null);
        }
    };

    const renderOrderItem = ({ item }: { item: any }) => (
        <View style={styles.orderCard}>
            <View style={styles.orderHeader}>
                <View>
                    <Text style={styles.orderId}>Order #{item._id.slice(-6).toUpperCase()}</Text>
                    <Text style={styles.orderTime}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
                <View style={[styles.statusBadge, { 
                    backgroundColor: 
                        item.status === 'accepted' ? 'rgba(124,77,255,0.2)' :
                        item.status === 'preparing' ? 'rgba(79,70,229,0.2)' :
                        item.status === 'out_for_delivery' ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)' 
                }]}>
                    <Text style={[styles.statusText, {
                        color:
                            item.status === 'accepted' ? '#7c4dff' :
                            item.status === 'preparing' ? '#4F46E5' :
                            item.status === 'out_for_delivery' ? '#f59e0b' : '#34C759'
                    }]}>{item.status.replace('_', ' ').toUpperCase()}</Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.itemsList}>
                {item.items.map((it: any, idx: number) => (
                    <View key={idx} style={styles.itemRow}>
                        <Text style={styles.itemQty}>{it.quantity}x</Text>
                        <Text style={styles.itemName}>{it.name}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.orderFooter}>
                <View style={styles.userInfo}>
                    <Ionicons name="location-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.userName}>{item.zone}</Text>
                </View>
                
                <TouchableOpacity 
                    style={[styles.actionBtn, updatingId === item._id && styles.disabledBtn, { backgroundColor: item.status === 'accepted' ? COLORS.primary : '#34C759' }]} 
                    onPress={() => handleUpdateStatus(item._id, item.status)}
                    disabled={!!updatingId}
                >
                    {updatingId === item._id ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        item.status === 'accepted' ? (
                            <>
                                <Ionicons name="flame-outline" size={16} color="white" />
                                <Text style={styles.actionBtnText}>START PREPARING</Text>
                            </>
                        ) : item.status === 'preparing' ? (
                            <>
                                <Ionicons name="bicycle-outline" size={16} color="white" />
                                <Text style={styles.actionBtnText}>SEND OUT</Text>
                            </>
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle-outline" size={16} color="white" />
                                <Text style={styles.actionBtnText}>MARK DELIVERED</Text>
                            </>
                        )
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading && !refreshing) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <LinearGradient
                colors={['#000000', '#1a1a2e']}
                style={StyleSheet.absoluteFill}
            />
            
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Handled Orders</Text>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{orders.length} In Progress</Text>
                </View>
            </View>

            <FlatList
                data={orders}
                keyExtractor={(item) => item._id}
                renderItem={renderOrderItem}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchMyOrders();}} tintColor={COLORS.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="checkmark-circle-outline" size={80} color="rgba(255,255,255,0.05)" />
                        <Text style={styles.emptyText}>You reach the finish line!</Text>
                        <Text style={styles.emptySubText}>All assigned orders are completed.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background.dark,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: COLORS.background.dark,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: 'white',
        letterSpacing: -0.5,
    },
    countBadge: {
        backgroundColor: 'rgba(126, 81, 251, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(126, 81, 251, 0.3)',
    },
    countText: {
        color: COLORS.primary,
        fontSize: 12,
        fontWeight: '700',
    },
    listContent: {
        padding: SPACING.md,
        paddingBottom: 100,
    },
    orderCard: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    orderId: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    orderTime: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '800',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginVertical: 12,
    },
    itemsList: {
        gap: 8,
        marginBottom: 16,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    itemQty: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '800',
        width: 30,
    },
    itemName: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        fontWeight: '500',
    },
    orderFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    userName: {
        color: 'white',
        fontSize: 12,
        fontWeight: '700',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 8,
    },
    disabledBtn: {
        opacity: 0.6,
    },
    actionBtnText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 100,
    },
    emptyText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
        marginTop: 20,
        textAlign: 'center',
    },
    emptySubText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    }
});
