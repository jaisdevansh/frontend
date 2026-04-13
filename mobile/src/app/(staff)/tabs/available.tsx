import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, BORDER_RADIUS } from '../../../constants/design-system';
import { staffService } from '../../../services/staffService';
import { useToast } from '../../../context/ToastContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../../context/AuthContext';
import { getSocket } from '../../../lib/socketClient';
import { useRouter } from 'expo-router';

export default function AvailableOrdersScreen() {
    const { showToast } = useToast();
    const { user } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [acceptingId, setAcceptingId] = useState<string | null>(null);

    const fetchAvailable = useCallback(async () => {
        try {
            const res = await staffService.getAvailableOrders();
            if (res.success) {
                setOrders(res.data);
            }
        } catch (error: any) {
            showToast('Failed to fetch open orders', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchAvailable();
    }, [fetchAvailable]);

    const handleAccept = async (orderId: string) => {
        // Optimistic UI Removal - Rocket speed!
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        const originalOrders = [...orders];
        setOrders(prev => prev.filter(o => o._id !== orderId));
        setAcceptingId(orderId);

        try {
            const res = await staffService.acceptOrder(orderId);
            if (res.success) {
                showToast('Action Success!', 'success');
            } else {
                setOrders(originalOrders); // Revert if already taken
            }
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Failed to accept order';
            showToast(msg, 'error');
            setOrders(originalOrders); // Fallback: put it back
            fetchAvailable(); // Force refresh to sync state
        } finally {
            setAcceptingId(null);
        }
    };

    // ── Real-time Socket.io Sync ───────────────────────────────────────────────────
    useEffect(() => {
        let socketInstance: any = null;

        const setupSocket = async () => {
            try {
                socketInstance = await getSocket();
                if (socketInstance) {
                    // Join room for waiters as seen in backend/socket.js
                    socketInstance.emit('join_room', 'waiter_room');

                    socketInstance.on('new_order', () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        fetchAvailable(); // Refresh the pool
                    });

                    socketInstance.on('order_updated', ({ orderId, status }: any) => {
                        if (['accepted', 'preparing', 'completed'].includes(status)) {
                            setOrders(prev => prev.filter(o => o._id !== orderId));
                        } else if (status === 'confirmed') {
                            fetchAvailable(); // In case of cancellation revert/re-pool
                        }
                    });

                    // Compatibility with staff controller event names
                    socketInstance.on('order_accepted', ({ orderId }: any) => {
                        setOrders(prev => prev.filter(o => o._id !== orderId));
                    });
                }
            } catch (error) {
                // Socket not available for staff - this is expected
                // Staff will use pull-to-refresh instead of real-time updates
            }
        };

        setupSocket();

        return () => {
            if (socketInstance) {
                socketInstance.off('new_order');
                socketInstance.off('order_updated');
                socketInstance.off('order_accepted');
            }
        };
    }, [fetchAvailable]);

    const renderOrderItem = ({ item }: { item: any }) => (
        <View style={styles.orderCard}>
            <View style={styles.orderHeader}>
                <View>
                    <Text style={styles.orderId}>Order #{item._id.slice(-6).toUpperCase()}</Text>
                    <Text style={styles.orderTime}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
                <View style={[styles.zoneBadge, { backgroundColor: item.zone === 'VIP' ? '#FFD700' : COLORS.primary }]}>
                    <Text style={styles.zoneText}>{item.zone}</Text>
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
                    <Ionicons name="person-outline" size={14} color="rgba(255,255,255,0.4)" />
                    <Text style={styles.userName}>{item.userId?.name || 'Club Member'}</Text>
                </View>
                <TouchableOpacity 
                    style={[styles.acceptBtn, acceptingId === item._id && styles.disabledBtn]} 
                    onPress={() => handleAccept(item._id)}
                    disabled={!!acceptingId}
                >
                    {acceptingId === item._id ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        <>
                            <Text style={styles.acceptBtnText}>ACCEPT</Text>
                            <Ionicons name="chevron-forward" size={16} color="white" />
                        </>
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
                <View>
                    <Text style={styles.welcomeText}>Welcome back,</Text>
                    <Text style={styles.waiterName}>{user?.name?.split(' ')[0] || 'Staff Member'}</Text>
                </View>
                <TouchableOpacity 
                    style={styles.headerScanBtn} 
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        router.push('/(staff)/tabs/scanner');
                    }}
                >
                    <Ionicons name="scan-outline" size={18} color="white" />
                    <Text style={styles.headerScanBtnText}>SCAN</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.subHeader}>
                <Text style={styles.headerTitle}>Open Order Pool</Text>
            </View>

            <FlatList
                data={orders}
                keyExtractor={(item) => item._id}
                renderItem={renderOrderItem}
                contentContainerStyle={styles.listContent}
                initialNumToRender={10}
                maxToRenderPerBatch={5}
                windowSize={3}
                removeClippedSubviews={Platform.OS === 'android'}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setRefreshing(true); 
                            fetchAvailable();
                        }} 
                        tintColor={COLORS.primary} 
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="restaurant-outline" size={80} color="rgba(255,255,255,0.05)" />
                        <Text style={styles.emptyText}>No orders waiting at the moment.</Text>
                        <Text style={styles.emptySubText}>New orders will appear here in real-time.</Text>
                    </View>
                }
            />

            {/* Floating Scan Button */}
            <TouchableOpacity 
                style={styles.fabScan} 
                activeOpacity={0.8}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    router.push('/(staff)/tabs/scanner');
                }}
            >
                <LinearGradient
                    colors={[COLORS.primary, '#9D7AFF']}
                    style={styles.fabGradient}
                >
                    <Ionicons name="scan-sharp" size={28} color="white" />
                </LinearGradient>
            </TouchableOpacity>
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
        paddingTop: SPACING.lg,
        paddingBottom: SPACING.sm,
    },
    welcomeText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    waiterName: {
        color: 'white',
        fontSize: 24,
        fontWeight: '900',
        marginTop: 2,
    },
    subHeader: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.primary,
        letterSpacing: 1,
        textTransform: 'uppercase',
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
    headerScanBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 6,
    },
    headerScanBtnText: {
        color: 'white',
        fontWeight: '900',
        fontSize: 12,
        letterSpacing: 0.5,
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
    zoneBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    zoneText: {
        color: 'white',
        fontSize: 11,
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
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontWeight: '600',
    },
    acceptBtn: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 6,
    },
    disabledBtn: {
        opacity: 0.6,
    },
    acceptBtnText: {
        color: 'white',
        fontSize: 13,
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
    },
    // Floating Security Button
    fabScan: {
        position: 'absolute',
        bottom: 100,
        right: 20,
        width: 64,
        height: 64,
        borderRadius: 32,
        elevation: 10,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        zIndex: 1000
    },
    fabGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center'
    }
});
