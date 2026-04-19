import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../constants/design-system';
import { usePOSStore } from '../../../store/posStore';

/**
 * CartSidebar: Hyper-optimized cart sidebar for POS terminal.
 * Uses selective state subscriptions to minimize re-renders.
 */
export const CartSidebar = () => {
    // Selectors for minimal re-renders
    const products = usePOSStore(state => state.products);
    const cartIds = usePOSStore(state => state.cartIds);
    const cartById = usePOSStore(state => state.cartById);
    const isProcessing = usePOSStore(state => state.isProcessing);
    
    const updateQty = usePOSStore(state => state.updateQty);
    const clearCart = usePOSStore(state => state.clearCart);

    const cartItems = useMemo(() => {
        return cartIds.map(id => {
            const product = products.find(p => p._id === id);
            return {
                ...product,
                qty: cartById[id] || 0
            };
        }).filter(item => item._id);
    }, [cartIds, cartById, products]);

    const total = useMemo(() => {
        return cartItems.reduce((sum, item) => sum + ((item.price || 0) * item.qty), 0);
    }, [cartItems]);

    const handleComplete = useCallback(() => {
        Alert.alert(
            'Process Checkout',
            'How would you like to deliver the bill?',
            [
                { text: 'Print Physical Bill', onPress: () => { 
                    Alert.alert('Printing Active', 'Receipt sent to thermal printer.'); 
                    clearCart(); 
                }},
                { text: 'Send to User', onPress: () => { 
                    Alert.alert('Sent Digitally', 'The bill has been sent to the user\'s application.'); 
                    clearCart(); 
                }},
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    }, [clearCart]);

    if (cartIds.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIconBg}>
                    <Ionicons name="cart-outline" size={40} color="rgba(255, 255, 255, 0.2)" />
                </View>
                <Text style={styles.emptyText}>Terminal Ready</Text>
                <Text style={styles.emptySubtext}>Add items to begin billing</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Order Summary</Text>
                    <Text style={styles.itemCount}>{cartIds.length} Unique Items</Text>
                </View>
                <TouchableOpacity onPress={clearCart} style={styles.clearBtnWrap}>
                    <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                </TouchableOpacity>
            </View>

            <ScrollView 
                style={styles.itemList} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {cartItems.map((item) => (
                    <View key={item._id} style={styles.cartItem}>
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                            <Text style={styles.itemPrice}>₹{(item.price || 0) * item.qty}</Text>
                        </View>
                        <View style={styles.qtyControls}>
                            <TouchableOpacity 
                                style={styles.qtyBtn} 
                                onPress={() => updateQty(item._id as string, -1)}
                            >
                                <Ionicons name="remove" size={14} color="white" />
                            </TouchableOpacity>
                            <Text style={styles.qtyText}>{item.qty}</Text>
                            <TouchableOpacity 
                                style={styles.qtyBtn} 
                                onPress={() => updateQty(item._id as string, 1)}
                            >
                                <Ionicons name="add" size={14} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.totalBox}>
                    <Text style={styles.totalLabel}>Grand Total</Text>
                    <Text style={styles.totalValue}>₹{total.toLocaleString()}</Text>
                </View>
                <TouchableOpacity 
                    style={[styles.checkoutBtn, isProcessing && { opacity: 0.6 }]} 
                    disabled={isProcessing}
                    onPress={handleComplete}
                    activeOpacity={0.8}
                >
                    <Text style={styles.checkoutText}>
                        {isProcessing ? 'PROCESSING...' : 'COMPLETE BILLING'}
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="white" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A',
        padding: 16,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    title: {
        color: 'white',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    itemCount: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 11,
        fontWeight: '700',
        marginTop: 2,
    },
    clearBtnWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 28,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    emptyIconBg: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '800',
    },
    emptySubtext: {
        color: 'rgba(255, 255, 255, 0.3)',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
    },
    itemList: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    cartItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        padding: 14,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.04)',
    },
    itemInfo: {
        flex: 1,
        marginRight: 10,
    },
    itemName: {
        color: 'white',
        fontSize: 14,
        fontWeight: '700',
    },
    itemPrice: {
        color: COLORS.primary,
        fontSize: 13,
        fontWeight: '900',
        marginTop: 4,
    },
    qtyControls: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 14,
        padding: 4,
    },
    qtyBtn: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '900',
        width: 28,
        textAlign: 'center',
    },
    footer: {
        marginTop: 10,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.08)',
    },
    totalBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    totalLabel: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    totalValue: {
        color: 'white',
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -1,
    },
    checkoutBtn: {
        backgroundColor: COLORS.primary,
        height: 60,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
    },
    checkoutText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 1,
    }
});
