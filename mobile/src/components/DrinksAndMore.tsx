import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Modal, TextInput, ScrollView, Dimensions, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import SafeFlashList from './SafeFlashList';
const FlashList = SafeFlashList;
import { useToast } from '../context/ToastContext';
import { userService } from '../services/userService';
import { initiateFoodPayment } from '../services/razorpayService';
import apiClient, { API_BASE_URL } from '../services/apiClient';
import { io, Socket } from 'socket.io-client';

const { width } = Dimensions.get('window');

const SERVICE_FEE_RATE = 0.05; // 5%

const CATEGORIES = ['All', 'Cocktail', 'Mocktail', 'Soft Drink'];
const TIPS = [20, 50, 100, 150];

type CartItem = { _id: string; name: string; price: number; type: string; image: string; description: string; qty: number; };

export default function DrinksAndMore({ eventId, hostId, zone, tableId }: { eventId?: string; hostId?: string; zone?: string; tableId?: string }) {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { showToast } = useToast();

    const [drinks, setDrinks] = useState<any[]>([]);
    const [loadingMenu, setLoadingMenu] = useState(false);
    const [category, setCategory] = useState('All');
    const [cart, setCart] = useState<{ [key: string]: CartItem }>({});
    const [showCart, setShowCart] = useState(false);
    const [tipAmount, setTipAmount] = useState(0);
    const [customTip, setCustomTip] = useState('');
    const [processing, setProcessing] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const displayZone = zone || 'Standard';
    const displayTableId = tableId || 'Floor';
    const [activeOrders, setActiveOrders] = useState<any[]>([]);

    useEffect(() => {
        // Fetch profile
        userService.getProfile().then((r: any) => { if (r.success) setProfile(r.data); }).catch(() => {});

        const url = hostId
            ? `/user/host/${hostId}/menu`
            : eventId
                ? `/user/events/${eventId}/menu`
                : null;

        console.log('🍽️ DrinksAndMore:', { hostId, eventId, url });

        // ⚡ Parallel fetch — menu + orders at the same time
        const fetchAll = async () => {
            const promises: Promise<any>[] = [];

            if (url) {
                promises.push(
                    apiClient.get(url).then((res: any) => {
                        const data = res.data?.data;
                        console.log('✅ Menu response:', data?.length || 0, 'items');
                        if (data && data.length > 0) {
                            setDrinks(data.map((item: any) => ({
                                _id: item._id,
                                name: item.name,
                                type: item.type || item.category || 'Drink',
                                price: item.price,
                                description: item.description || item.desc || '',
                                image: item.image || 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400',
                            })));
                        }
                        // If API returns empty, MOCK_DRINKS stays as the UI data
                    }).catch(() => {})
                );
            }

            promises.push(
                userService.getMyFoodOrders().then((r: any) => {
                    if (r.success) setActiveOrders(r.data);
                }).catch(() => {})
            );

            await Promise.all(promises);
        };

        fetchAll();

        // REAL-TIME SYNC
        const socket = io(API_BASE_URL);
        socket.on('menu_updated', () => {
            if (url) apiClient.get(url).then((res: any) => {
                const data = res.data?.data;
                if (data && data.length > 0) setDrinks(data);
            }).catch(() => {});
        });
        socket.on('order_status_update', ({ orderId, status }) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setActiveOrders(prev => prev.map((o: any) => o._id === orderId ? { ...o, status } : o));
        });
        socket.on('notification', (payload) => {
            if (payload.type === 'order') userService.getMyFoodOrders().then((r: any) => { if (r.success) setActiveOrders(r.data); }).catch(() => {});
        });

        return () => { socket.disconnect(); };
    }, [hostId, eventId]);


    // ⚡ Memoized — only recalc when drinks or category changes
    const dynamicCategories = useMemo(() =>
        ['All', ...Array.from(new Set(drinks.map(d => d.type)))]
    , [drinks]);

    const filteredDrinks = useMemo(() =>
        category === 'All' ? drinks : drinks.filter(d => d.type === category)
    , [drinks, category]);

    const cartItems: CartItem[] = Object.values(cart).filter(i => i.qty > 0);
    const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);
    const subtotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
    const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE);
    const total = Number(subtotal + serviceFee + (Number(tipAmount) || 0));

    const addItem = (drink: any) => {
        Haptics.selectionAsync();
        setCart(prev => {
            const existing = prev[drink._id];
            return { ...prev, [drink._id]: { ...drink, qty: (existing?.qty || 0) + 1 } };
        });
    };

    const removeItem = (id: string) => {
        Haptics.selectionAsync();
        setCart(prev => {
            const updated = { ...prev };
            if (updated[id] && updated[id].qty > 0) {
                updated[id] = { ...updated[id], qty: updated[id].qty - 1 };
                if (updated[id].qty === 0) delete updated[id];
            }
            return updated;
        });
    };

    const handleTip = (amount: number) => {
        if (tipAmount === amount) {
            setTipAmount(0);
            setCustomTip('');
        } else {
            setTipAmount(amount);
            setCustomTip('');
        }
    };

    const handleCustomTip = (val: string) => {
        setCustomTip(val);
        const parsed = parseInt(val);
        setTipAmount(isNaN(parsed) ? 0 : parsed);
    };

    const handlePayAndConfirm = async () => {
        if (cartItems.length === 0) {
            showToast('Your cart is empty', 'error');
            return;
        }

        setProcessing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        const orderPayload = {
            eventId,
            hostId,
            tableId,
            items: cartItems.map(i => ({ _id: i._id, name: i.name, price: i.price, qty: i.qty })),
            subtotal,
            serviceFee,
            tipAmount,
        };

        console.log('[ORDER DEBUG] Payload:', JSON.stringify(orderPayload, null, 2));
        console.log('[ORDER DEBUG] Total Amount:', total);


        const result = await initiateFoodPayment(
            {
                amount: total,
                receipt: `food_${Date.now()}`.substring(0, 40),
                description: `Drink Order — ${cartItems.length} item(s)`,
                prefillName: profile?.name || '',
                prefillEmail: profile?.email || '',
                prefillContact: profile?.phone || '',
            },
            {
                ...orderPayload,
                zone: displayZone,
                tableId: displayTableId
            }
        );

        console.log('[ORDER DEBUG] Payment Result:', JSON.stringify(result, null, 2));


        setProcessing(false);

        if (result.success) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setCart({});
            setShowCart(false);
            showToast('🍹 Your order is confirmed!', 'success');
            
            // Auto navigate to the My Orders tab in My Bookings
            router.push({ pathname: '/(user)/my-bookings', params: { tab: 'orders' }});
        } else if (result.error !== 'Payment cancelled') {
            showToast(result.error || 'Payment failed. Please retry.', 'error');
        }
    };

    // ⚡ useCallback — prevents re-creation on every render
    const renderDrink = useCallback(({ item }: { item: any }) => {
        const inCart = cart[item._id]?.qty || 0;
        return (
            <View style={styles.drinkCard}>
                <Image source={{ uri: item.image }} style={styles.drinkImage} contentFit="cover" />
                <View style={styles.drinkBody}>
                    <View style={styles.drinkTypePill}>
                        <Text style={styles.drinkTypeText}>{item.type}</Text>
                    </View>
                    <Text style={styles.drinkName}>{item.name}</Text>
                    <Text style={styles.drinkDesc}>{item.description}</Text>
                    <View style={styles.drinkFooter}>
                        <Text style={styles.drinkPrice}>₹{item.price}</Text>
                        {inCart === 0 ? (
                            <TouchableOpacity style={styles.addBtn} onPress={() => addItem(item)}>
                                <Ionicons name="add" size={20} color="#fff" />
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.qtyControl}>
                                <TouchableOpacity style={styles.qtyBtn} onPress={() => removeItem(item._id)}>
                                    <Ionicons name="remove" size={16} color="#fff" />
                                </TouchableOpacity>
                                <Text style={styles.qtyText}>{inCart}</Text>
                                <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: '#7c4dff' }]} onPress={() => addItem(item)}>
                                    <Ionicons name="add" size={16} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        );
    }, [cart, addItem, removeItem]);

    return (
        <View style={styles.container}>
            {/* Header row */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Member-Only Mixology</Text>
                    <Text style={styles.headerSub}>REAL-TIME DIRECT SERVICE</Text>
                </View>
                <TouchableOpacity style={styles.cartBtn} onPress={() => { if (cartCount > 0) setShowCart(true); }}>
                    <Ionicons name="bag" size={22} color="#fff" />
                    {cartCount > 0 && (
                        <View style={styles.cartBadge}>
                            <Text style={styles.cartBadgeText}>{cartCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>


            {/* Category Filter — overflow visible so pills don't clip */}
            <View style={{ overflow: 'visible' }}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.catScroll}
                    overScrollMode="never"
                >
                    {dynamicCategories.map(cat => (
                        <TouchableOpacity
                            key={cat}
                            style={[styles.catPill, category === cat && styles.catPillActive]}
                            onPress={() => setCategory(cat)}
                        >
                            <Text style={[styles.catText, category === cat && styles.catTextActive]}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* ⚡ FlashList — 5x faster than FlatList for large lists */}
            <FlashList
                data={filteredDrinks}
                keyExtractor={(item: any) => item._id}
                renderItem={renderDrink}
                estimatedItemSize={120}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={loadingMenu ? null : (
                    <View style={{ alignItems: 'center', paddingTop: 60 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No items available</Text>
                    </View>
                )}
            />

            {/* Floating Cart Button */}
            {cartCount > 0 && !showCart && (
                <TouchableOpacity style={[styles.floatingCartBtn, { bottom: insets.bottom + 20 }]} onPress={() => setShowCart(true)}>
                    <LinearGradient colors={['#1D4ED8', '#3B82F6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.floatingGrad}>
                        <View style={styles.floatingLeft}>
                            <View style={styles.floatingBadge}>
                                <Text style={styles.floatingBadgeText}>{cartCount}</Text>
                            </View>
                            <Text style={styles.floatingLabel}>View Cart</Text>
                        </View>
                        <Text style={styles.floatingPrice}>₹{subtotal}</Text>
                    </LinearGradient>
                </TouchableOpacity>
            )}

            {/* Cart / Bill Modal */}
            <Modal visible={showCart} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCart(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHead}>
                        <Text style={styles.modalTitle}>Your Order</Text>
                        <TouchableOpacity onPress={() => setShowCart(false)}>
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>
                        {/* Item List */}
                        {cartItems.map(item => (
                            <View key={item._id} style={styles.cartItem}>
                                <Image source={{ uri: item.image }} style={styles.cartItemImg} contentFit="cover" />
                                <View style={{ flex: 1, marginLeft: 14 }}>
                                    <Text style={styles.cartItemName}>{item.name}</Text>
                                    <Text style={styles.cartItemPrice}>₹{item.price} × {item.qty}</Text>
                                </View>
                                <View style={styles.qtyControl}>
                                    <TouchableOpacity style={styles.qtyBtn} onPress={() => removeItem(item._id)}>
                                        <Ionicons name="remove" size={14} color="#fff" />
                                    </TouchableOpacity>
                                    <Text style={styles.qtyText}>{item.qty}</Text>
                                    <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: '#2563EB' }]} onPress={() => addItem(item)}>
                                        <Ionicons name="add" size={14} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}

                        {/* Tip Section */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Add a Tip for Staff</Text>
                            <View style={styles.tipRow}>
                                {TIPS.map(t => (
                                    <TouchableOpacity
                                        key={t}
                                        style={[styles.tipBtn, tipAmount === t && styles.tipBtnActive]}
                                        onPress={() => handleTip(t)}
                                    >
                                        <Text style={[styles.tipText, tipAmount === t && styles.tipTextActive]}>₹{t}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TextInput
                                style={styles.tipInput}
                                placeholder="Custom amount..."
                                placeholderTextColor="rgba(255,255,255,0.25)"
                                keyboardType="numeric"
                                value={customTip}
                                onChangeText={handleCustomTip}
                            />
                        </View>

                        {/* Bill Breakdown */}
                        <View style={styles.billBox}>
                            <Text style={styles.billHeader}>Bill Summary</Text>
                            <View style={styles.billRow}>
                                <Text style={styles.billLabel}>Item Total</Text>
                                <Text style={styles.billValue}>₹{subtotal}</Text>
                            </View>
                            <View style={styles.billRow}>
                                <Text style={styles.billLabel}>Service Fee (5%)</Text>
                                <Text style={styles.billValue}>₹{serviceFee}</Text>
                            </View>
                            {tipAmount > 0 && (
                                <View style={styles.billRow}>
                                    <Text style={styles.billLabel}>Tip 🙏</Text>
                                    <Text style={styles.billValue}>₹{tipAmount}</Text>
                                </View>
                            )}
                            <View style={[styles.billRow, styles.billTotal]}>
                                <Text style={styles.totalLabel}>Total Payable</Text>
                                <Text style={styles.totalValue}>₹{total}</Text>
                            </View>
                            <Text style={styles.noHiddenText}>✓ No hidden charges. What you see is what you pay.</Text>
                        </View>
                    </ScrollView>

                    {/* Pay & Confirm CTA */}
                    <View style={[styles.payFooter, { paddingBottom: insets.bottom + 16 }]}>
                        <TouchableOpacity
                            style={[styles.payBtn, processing && { opacity: 0.7 }]}
                            disabled={processing}
                            onPress={handlePayAndConfirm}
                        >
                            <LinearGradient
                                colors={['#1D4ED8', '#3B82F6']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={styles.payGrad}
                            >
                                {processing
                                    ? <ActivityIndicator color="#fff" />
                                    : <>
                                        <Ionicons name="lock-closed" size={16} color="rgba(255,255,255,0.7)" />
                                        <Text style={styles.payText}>Pay & Confirm — ₹{total}</Text>
                                    </>}
                            </LinearGradient>
                        </TouchableOpacity>
                        <Text style={styles.secureNote}>Powered by Razorpay · Signature Verified</Text>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#080810' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
    headerBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center' },
    headerSub: { color: 'rgba(37,99,235,0.9)', fontSize: 9, fontWeight: '800', letterSpacing: 2, textAlign: 'center', marginTop: 2 },
    cartBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
    cartBadge: { position: 'absolute', top: -2, right: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
    cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
    catScroll: { paddingHorizontal: 20, paddingBottom: 8, gap: 10 },
    catPill: { paddingHorizontal: 18, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
    catPillActive: { backgroundColor: '#2563EB', borderColor: '#2563EB', shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },
    catText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    catTextActive: { color: '#fff' },
    listContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 120, gap: 16 },

    // Drink Card
    drinkCard: { flexDirection: 'row', backgroundColor: '#111118', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
    drinkImage: { width: 110, height: 120 },
    drinkBody: { flex: 1, padding: 14 },
    drinkTypePill: { backgroundColor: 'rgba(37,99,235,0.12)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 6 },
    drinkTypeText: { color: '#60A5FA', fontSize: 9, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
    drinkName: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 2 },
    drinkDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 11, lineHeight: 15, marginBottom: 8 },
    drinkFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    drinkPrice: { color: '#fff', fontSize: 16, fontWeight: '900' },
    addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', shadowColor: '#2563EB', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 },
    qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, paddingHorizontal: 4, paddingVertical: 4 },
    qtyBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
    qtyText: { color: '#fff', fontSize: 13, fontWeight: '900', minWidth: 16, textAlign: 'center' },

    // Floating Cart
    floatingCartBtn: { position: 'absolute', left: 20, right: 20, borderRadius: 18, overflow: 'hidden', shadowColor: '#2563EB', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 10 },
    floatingGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 20 },
    floatingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    floatingBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    floatingBadgeText: { color: '#fff', fontSize: 12, fontWeight: '900' },
    floatingLabel: { color: '#fff', fontSize: 15, fontWeight: '800' },
    floatingPrice: { color: '#fff', fontSize: 16, fontWeight: '900' },

    // Modal
    modalContainer: { flex: 1, backgroundColor: '#0b0b14' },
    modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    modalTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
    cartItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
    cartItemImg: { width: 52, height: 52, borderRadius: 12 },
    cartItemName: { color: '#fff', fontSize: 15, fontWeight: '700' },
    cartItemPrice: { color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 4 },

    // Tips
    section: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 },
    sectionTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 },
    tipRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    tipBtn: { flex: 1, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    tipBtnActive: { backgroundColor: 'rgba(37,99,235,0.15)', borderColor: '#2563EB' },
    tipText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '700' },
    tipTextActive: { color: '#60A5FA' },
    tipInput: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, paddingHorizontal: 16, height: 44, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', fontSize: 14 },

    // Bill
    billBox: { marginHorizontal: 24, marginTop: 20, backgroundColor: '#111118', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', gap: 12 },
    billHeader: { color: '#fff', fontSize: 14, fontWeight: '800', marginBottom: 4 },
    billRow: { flexDirection: 'row', justifyContent: 'space-between' },
    billLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 13 },
    billValue: { color: '#fff', fontSize: 13, fontWeight: '700' },
    billTotal: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' },
    totalLabel: { color: '#fff', fontSize: 16, fontWeight: '800' },
    totalValue: { color: '#fff', fontSize: 20, fontWeight: '900' },
    noHiddenText: { color: 'rgba(74,222,128,0.7)', fontSize: 11, fontWeight: '600', marginTop: 4 },

    // Pay Footer
    payFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'rgba(11,11,20,0.98)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    payBtn: { borderRadius: 18, overflow: 'hidden' },
    payGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
    payText: { color: '#fff', fontSize: 16, fontWeight: '900' },
    secureNote: { color: 'rgba(255,255,255,0.2)', fontSize: 10, textAlign: 'center', marginTop: 10, fontWeight: '600', letterSpacing: 0.5 },
    
    // Active Orders UI
    activeOrdersSection: { paddingHorizontal: 20, marginBottom: 12 },
    sectionLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10 },
    activeOrdersScroll: { gap: 12, paddingRight: 20 },
    orderStatusCard: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 12, 
        backgroundColor: '#111118', 
        borderRadius: 16, 
        paddingVertical: 10, 
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: 'rgba(37,99,235,0.2)'
    },
    orderIconBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(37,99,235,0.1)', alignItems: 'center', justifyContent: 'center' },
    orderStatusTitle: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
    orderItemCount: { color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 1 },
});
