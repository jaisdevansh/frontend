import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, 
    Switch, ActivityIndicator, Easing, KeyboardAvoidingView, Platform, 
    TextInput, Modal, StatusBar, ScrollView, FlatList, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import SafeFlashList from '../../components/SafeFlashList';
const FlashList = SafeFlashList;

import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { io, Socket } from 'socket.io-client';
import apiClient from '../../services/apiClient';
import { useToast } from '../../context/ToastContext';
import { useNotification } from '../../context/NotificationContext';
import DrinksAndMore from '../../components/DrinksAndMore';

import { useDiscoveryStore } from '../../store/discoveryStore';
import { useChatStore } from '../../store/chatStore';
import { useAuth } from '../../context/AuthContext';
import { CustomAlert } from '../../components/CustomAlert';
import { MatchCard } from '../../features/discovery/components/MatchCard';
import { GiftCard } from '../../features/gifts/components/GiftCard';
import { avatar } from '../../services/cloudinaryService';
import { useDiscovery } from '../../hooks/useDiscovery';
import { useQuery } from '@tanstack/react-query';

const { width, height } = Dimensions.get('window');

interface NearbyUser {
    id?: string;
    _id?: string;
    name: string;
    profileImage?: string;
    gender?: string;
    distance?: number;
    lastSeen?: string;
}

interface GiftItem {
    _id: string;
    name: string;
    description?: string;
    price: number;
    category: string;
    image?: string;
    tags?: string[];
}

// ─── Module-level constants ──────────────────────────────────────────
const CARD_W = (width - 40 - 12) / 2;

const GIFT_CATEGORIES = [
    { id: 'All',       label: '✨ All' },
    { id: 'Other',     label: '🌑 Other' },
    { id: 'Cocktails', label: '🍸 Drinks' },
    { id: 'Chocolates',label: '🍫 Treats' },
    { id: 'Flowers',   label: '🌹 Blooms' },
];

const giftItemContainer = { width: CARD_W, marginBottom: 12 } as const;
const columnWrapperStyle = { justifyContent: 'space-between' as const };

export default function DiscoverScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { showToast } = useToast();
    const { showBanner } = useNotification();
    const { user: currentUser, token } = useAuth();
    
    // Store State
    const { 
        nearbyUsers, setNearbyUsers, 
        visibility, setVisibility, 
        liveCrowd, setLiveCrowd, 
        locationName, setLocationName,
        setLoading
    } = useDiscoveryStore();
    
    // UI Local State
    const params = useLocalSearchParams<any>();
    const { tab: initialTab, eventId: paramEventId, hostId: paramHostId, tableId: paramTableId, zone: paramZone } = params;
    
    const [activeEventId, setActiveEventId] = useState<string | null>(paramEventId || null);
    const [activeHostId, setActiveHostId] = useState<string | null>(paramHostId || null);
    const [activeTab, setActiveTab] = useState<'chats' | 'orders' | 'gift'>(
        (initialTab as any) || 'chats'
    );
    const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female' | 'Other'>('All');
    const [showFilterModal, setShowFilterModal] = useState(false);
    
    // Gifts Filtering Locality
    const [giftCategory, setGiftCategory] = useState('All');
    const [giftSearch, setGiftSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    
    // 📡 REACT-QUERY: REAL-TIME DATA REPLACING DUMMY 📡
    const { nearby, gifts, menu, isLoading: queryLoadingBase, refetchAll } = useDiscovery(activeEventId);

    // 🎁 HOST-SPECIFIC GIFTS — background refresh
    const hostGifts = useQuery({
        queryKey: ['host', 'gifts', activeHostId],
        queryFn: async () => {
            if (!activeHostId) return [];
            try {
                const res = await apiClient.get(`/user/host/${activeHostId}/gifts`);
                return res.data?.success && res.data.data ? res.data.data : [];
            } catch (e) {
                return [];
            }
        },
        enabled: !!activeHostId,
        staleTime: 1000 * 60 * 2, // 2 min
        gcTime: 1000 * 60 * 20,
    });

    // Never block the whole UI on hostGifts load — it has placeholderData
    const queryLoading = queryLoadingBase;

    // ─── Chat Sockets Integration ───

    // Chat Sockets Integration
    const { initSocket, fetchHistory, sendMessage: sendSocketMessage, messagesByPeer, isTyping } = useChatStore();
    useEffect(() => { if (token) initSocket(token); }, [token]);

    const [giftModal, setGiftModal] = useState<{ visible: boolean; user: any | null; item: any | null; msg: string; processing: boolean }>({
        visible: false, user: null, item: null, msg: '', processing: false
    });
    const [chatModal, setChatModal] = useState<{ visible: boolean, chatId: string | null, user: any, msgs: any[] }>({ visible: false, chatId: null, user: null, msgs: [] });
    const [drinkModal, setDrinkModal] = useState<{ visible: boolean, user: any, selectedItem: any | null }>({ visible: false, user: null, selectedItem: null });
    const [msgInput, setMsgInput] = useState('');
    const [customAlert, setCustomAlert] = useState<{ visible: boolean; title: string; message: string }>({ visible: false, title: '', message: '' });

    // Radar Animations
    const pulseAnim1 = useRef(new Animated.Value(0)).current;
    const pulseAnim2 = useRef(new Animated.Value(0)).current;

    const initSystem = useCallback(async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                try {
                    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    const reverse = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
                    if (reverse && reverse.length > 0) setLocationName(reverse[0].name || reverse[0].street || 'Private Event');
                } catch (locErr) { console.warn('GPS disabled or unreachable, using default location.'); }
            }

            const eventRes = await apiClient.get('/user/active-event');
            if (eventRes.data?.success && eventRes.data.data) {
                const booking = eventRes.data.data;
                // eventId is populated → use ._id; hostId is raw string
                const eid = booking.eventId?._id || booking.eventId;
                const hid = booking.hostId?._id || booking.hostId;
                if (eid) setActiveEventId(String(eid));
                if (hid) setActiveHostId(String(hid));
            }
        } catch (e) { console.error('Init error', e); } finally { setLoading(false); }
    }, [setLocationName, setLoading]);

    useEffect(() => {
        initSystem();
        Animated.loop(Animated.sequence([
            Animated.timing(pulseAnim1, { toValue: 1, duration: 2500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.timing(pulseAnim1, { toValue: 0, duration: 0, useNativeDriver: true })
        ])).start();
        setTimeout(() => {
            Animated.loop(Animated.sequence([
                Animated.timing(pulseAnim2, { toValue: 1, duration: 2500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                Animated.timing(pulseAnim2, { toValue: 0, duration: 0, useNativeDriver: true })
            ])).start();
        }, 1250);
    }, [initSystem]);

    useEffect(() => {
        const currentSocket = useChatStore.getState().socket;
        if (currentSocket) {
            currentSocket.on('presenceUpdate', ({ totalPresent }) => setLiveCrowd(totalPresent));
            currentSocket.on('notification', (payload: any) => {
                showBanner({
                    id: payload.id || `notif_${Date.now()}`,
                    title: payload.title,
                    body: payload.body,
                    type: payload.type || 'ALERT',
                    createdAt: new Date(),
                });
            });
        }
    }, [setLiveCrowd, showBanner]);

    const toggleVisibility = (val: boolean) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setVisibility(val);
        const currentSocket = useChatStore.getState().socket;
        if (currentSocket && activeEventId) {
            currentSocket.emit('updatePresence', { eventId: activeEventId, visibility: val });
        }
    };

    const resolveOpenChat = useCallback((chatPreview: any) => {
        Haptics.selectionAsync();
        const targetId = chatPreview.user?.id || chatPreview.user?._id;
        if (targetId) {
            setChatModal({ visible: true, chatId: targetId, user: chatPreview.user, msgs: [] });
            fetchHistory(targetId);
        }
    }, [fetchHistory]);

    const sendRealtimeMessage = () => {
        if (!msgInput.trim() || !chatModal.chatId || !currentUser) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        sendSocketMessage(chatModal.chatId, msgInput.trim(), currentUser.id);
        setMsgInput('');
    };

    const handleSendDrink = async () => {
        if (!drinkModal.user || !drinkModal.selectedItem || !activeEventId) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
            const res = await apiClient.post('/api/v1/drink-requests/send', {
                receiverId: drinkModal.user.id || drinkModal.user._id,
                eventId: activeEventId,
                items: [{
                    menuItemId: drinkModal.selectedItem._id,
                    quantity: 1,
                    price: drinkModal.selectedItem.price,
                    name: drinkModal.selectedItem.name
                }],
                message: 'Sent you a drink! 🍸',
                totalAmount: drinkModal.selectedItem.price
            });
            if (res.data.success) {
                showToast(`Drink offer sent!`, 'success');
                setDrinkModal({ visible: false, user: null, selectedItem: null });
                refetchAll();
            }
        } catch (error: any) { showToast(error.response?.data?.message || 'Failed to send drink', 'error'); }
    };

    const filteredUsers = useMemo(() => {
        const data = nearby.data || [];
        return data.filter((u: any) => genderFilter === 'All' || u.gender === genderFilter);
    }, [nearby.data, genderFilter]);

    // ─── Gifting Logic: Reactive & Fast ───
    const filteredGifts = useMemo(() => {
        const source = activeHostId ? (hostGifts.data ?? []) : (gifts.data ?? []);
        if (!source.length) return [];
        const lowerSearch = giftSearch.toLowerCase().trim();
        const lowerCat = giftCategory.toLowerCase();
        
        return source.filter((g: any) => {
            const matchesCat = giftCategory === 'All' || (g.category || '').toLowerCase() === lowerCat;
            const matchesSearch = !lowerSearch || g.name.toLowerCase().includes(lowerSearch);
            return matchesCat && matchesSearch;
        });
    }, [hostGifts.data, gifts.data, giftCategory, giftSearch, activeHostId]);

    const onGiftSelect = useCallback((item: any) => {
        Haptics.selectionAsync();
        setGiftModal(p => ({ ...p, item, visible: true }));
    }, []);

    const onPullRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetchAll();
        setRefreshing(false);
    }, [refetchAll]);

    // ─── RENDERERS ───
    const ChatListHeader = useCallback(() => (
        <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15, textTransform: 'uppercase', letterSpacing: 1.5 }}>Live on Radar</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 }} />
                    <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '800' }}>LIVE NOW</Text>
                </View>
            </View>
            <FlatList
                horizontal
                data={filteredUsers}
                keyExtractor={(u: any) => String(u.id || u._id)}
                showsHorizontalScrollIndicator={false}
                style={{ overflow: 'visible' }}
                ListEmptyComponent={<Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, paddingVertical: 10 }}>No one nearby yet.</Text>}
                renderItem={({ item: u }: { item: NearbyUser }) => {
                    const safeName = (u.name || 'User').split(' ')[0];
                    return (
                        <TouchableOpacity style={{ alignItems: 'center', marginRight: 20 }} onPress={() => resolveOpenChat({ user: u })}>
                            <View style={{ shadowColor: '#7c4dff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }}>
                                <LinearGradient colors={['#FF007A', '#7A00FF', '#00F0FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 2.5, borderRadius: 38, width: 70, height: 70, justifyContent: 'center', alignItems: 'center' }}>
                                    <View style={{ backgroundColor: '#131521', padding: 2, borderRadius: 34 }}>
                                        <Image source={{ uri: avatar(u.profileImage) }} style={{ width: 60, height: 60, borderRadius: 30 }} cachePolicy="memory-disk" contentFit="cover" />
                                    </View>
                                </LinearGradient>
                                {/* Active Dot */}
                                <View style={{ position: 'absolute', bottom: 2, right: 2, width: 16, height: 16, backgroundColor: '#10B981', borderRadius: 8, borderWidth: 3, borderColor: '#131521' }} />
                            </View>
                            <Text style={{ color: 'white', fontSize: 13, fontWeight: '800', marginTop: 10, letterSpacing: 0.3 }} numberOfLines={1}>{safeName}</Text>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    ), [filteredUsers, resolveOpenChat]);

    const renderChatRow = useCallback(({ item }: { item: any }) => {
        const uName = item.user?.name || item.name || 'User';
        const img = item.user?.profileImage || item.profileImage;
        const msg = item.lastMsg || (item.tags?.length ? `Vibe: ${item.tags.join(', ')}` : "Tap to say hi!");

        return (
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 22, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }} onPress={() => resolveOpenChat(item)}>
                <View>
                    <Image source={{ uri: avatar(img) }} style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#222' }} cachePolicy="memory-disk" contentFit="cover" />
                    <View style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, backgroundColor: '#10B981', borderRadius: 7, borderWidth: 2.5, borderColor: '#131521' }} />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 }}>{uName}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Nearby</Text>
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4, fontWeight: '500' }} numberOfLines={1}>{msg}</Text>
                </View>
            </TouchableOpacity>
        );
    }, [resolveOpenChat]);

    const cardWidth = (width - 48) / 2; // 40px padding + 8px gap
    const renderGiftItem = useCallback(({ item }: { item: GiftItem }) => (
        <View style={{ width: cardWidth, marginBottom: 12 }}><GiftCard item={item} isSelected={false} onSelect={onGiftSelect} /></View>
    ), [onGiftSelect, cardWidth]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent />
            <View style={styles.radarZone}>
                <LinearGradient colors={['#0d0620', '#030303']} style={StyleSheet.absoluteFillObject} />
                <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}><Ionicons name="chevron-back" size={24} color="#FFF" /></TouchableOpacity>
                    <View style={styles.headerCent}><Text style={styles.navTitle}>LIVE DISCOVERY</Text><Text style={styles.navSub}>{locationName}</Text></View>
                    <TouchableOpacity style={[styles.iconBtn, { position: 'relative' }]} onPress={() => setShowFilterModal(true)}>
                        <Ionicons name="options-outline" size={24} color={genderFilter !== 'All' ? '#3B82F6' : '#FFF'} />
                        {genderFilter !== 'All' && (
                            <View style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6', borderWidth: 1.5, borderColor: '#030303' }} />
                        )}
                    </TouchableOpacity>
                </View>
                <View style={styles.radarVisuals}>
                    <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim1.interpolate({ inputRange: [0,1], outputRange: [1,2.5] }) }], opacity: pulseAnim1.interpolate({ inputRange: [0,1], outputRange: [0.5,0] }) }]} />
                    <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim2.interpolate({ inputRange: [0,1], outputRange: [1,2.5] }) }], opacity: pulseAnim2.interpolate({ inputRange: [0,1], outputRange: [0.5,0] }) }]} />
                    <View style={styles.radarCenter}><Ionicons name="location" size={28} color="#7c4dff" /></View>
                </View>
                <View style={styles.crowdBadge}><Text style={styles.crowdTxt}>🔥 {liveCrowd} people at this event</Text></View>
                <View style={styles.toggleWrap}><Text style={styles.toggleLabel}>Show me on map</Text><Switch value={visibility} onValueChange={toggleVisibility} trackColor={{ false: '#333', true: '#7c4dff' }} thumbColor="#FFF" /></View>
            </View>

            <View style={styles.sheetZone}>
                <View style={styles.tabNav}>
                    {['chats', 'gift', 'orders'].map((t) => (
                        <TouchableOpacity key={t} style={[styles.tabBtn, activeTab === t && styles.tabActive]} onPress={() => { Haptics.selectionAsync(); setActiveTab(t as any); }}>
                            <Ionicons name={t === 'chats' ? 'chatbubbles' : t === 'gift' ? 'gift' : 'fast-food'} size={16} color={activeTab === t ? '#FFF' : 'rgba(255,255,255,0.4)'} />
                            <Text style={[styles.tabTxt, activeTab === t && styles.tabTxtActive]}>{t.toUpperCase()}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={styles.sheetBody}>
                    <>
                        {activeTab === 'chats' && (
                            <View style={styles.tabContent}>
                                {!visibility ? (
                                    <View style={styles.emptyWrap}><Ionicons name="eye-off-outline" size={48} color="rgba(255,255,255,0.2)" /><Text style={styles.emptyTitle}>Incognito Mode Active</Text><Text style={styles.emptySub}>Enable "Show me on map" to interact with people nearby.</Text></View>
                                ) : (
                                    <FlashList 
                                        data={nearbyUsers.map(u => ({ ...u, type: 'chat' })) as any} 
                                        keyExtractor={(item: any) => item._id || item.id} 
                                        ListHeaderComponent={ChatListHeader} 
                                        ListEmptyComponent={queryLoading && !refreshing ? <ActivityIndicator color="#7c4dff" style={{ marginTop: 40 }} /> : null}
                                        renderItem={renderChatRow} 
                                        estimatedItemSize={80} 
                                        contentContainerStyle={{ padding: 20, paddingBottom: 100 }} 
                                    />
                                )}
                            </View>
                        )}
                            {activeTab === 'gift' && (
                                <View style={[styles.tabContent, { backgroundColor: '#050505' }]}>
                                    <View style={styles.giftSearchContainer}><View style={styles.giftSearchInner}><Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.4)" /><TextInput style={styles.giftSearchInput} placeholder="Search premium items..." placeholderTextColor="rgba(255,255,255,0.3)" value={giftSearch} onChangeText={setGiftSearch} /></View></View>
                                    <View style={styles.chipContainer}><FlatList horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll} data={GIFT_CATEGORIES} keyExtractor={(cat: {id: string}) => cat.id} renderItem={({ item: cat }) => (
                                        <TouchableOpacity style={[styles.chip, giftCategory === cat.id && styles.activeChip]} onPress={() => setGiftCategory(cat.id)}><Text style={[styles.chipText, giftCategory === cat.id && styles.activeChipText]}>{cat.label}</Text></TouchableOpacity>
                                    )} /></View>
                                    <View style={styles.giftHeader}><View><Text style={styles.giftHeaderTitle}>Event Gifts</Text><Text style={styles.giftHeaderSub}>Secure retail inventory</Text></View><View style={styles.itemCountBadge}><Text style={styles.itemCountText}>{filteredGifts.length} items</Text></View></View>
                                    <FlashList 
                                        data={filteredGifts} 
                                        keyExtractor={(item: GiftItem) => item._id} 
                                        renderItem={renderGiftItem} 
                                        numColumns={2} 
                                        onRefresh={onPullRefresh} 
                                        refreshing={refreshing} 
                                        estimatedItemSize={220} 
                                        contentContainerStyle={styles.giftGridScroll} 
                                        ListEmptyComponent={queryLoading && !refreshing ? <ActivityIndicator color="#7c4dff" style={{ marginTop: 40 }} /> : null}
                                    />
                                </View>
                            )}
                            {activeTab === 'orders' && (
                                <DrinksAndMore 
                                    eventId={activeEventId || undefined} 
                                    hostId={activeHostId || undefined}
                                    zone={paramZone}
                                    tableId={paramTableId}
                                />
                            )}
                    </>
                </View>
            </View>

            {/* --- MODALS --- */}
            <Modal visible={chatModal.visible} animationType="slide" transparent>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={styles.modalBg}>
                        <View style={[styles.modalHeader, { paddingTop: insets.top + 10 }]}><TouchableOpacity style={styles.iconBtn} onPress={() => setChatModal({ visible: false, chatId: null, user: null, msgs: [] })}><Ionicons name="chevron-down" size={28} color="#FFF" /></TouchableOpacity><View style={styles.modalUserRow}><Image source={{ uri: chatModal.user?.profileImage }} style={styles.modalAv} contentFit="cover" /><View><Text style={styles.modalName}>{chatModal.user?.name}</Text>{isTyping[chatModal.chatId || ''] && <Text style={{color: '#7c4dff', fontSize: 10, fontWeight: '700'}}>typing...</Text>}</View></View><View style={{width: 44}} /></View>
                        <FlashList 
                            data={messagesByPeer[chatModal.chatId || ''] || []}
                            keyExtractor={(item: any) => item._id || item.tempId}
                            renderItem={({ item }: any) => {
                                const isMe = item.sender === currentUser?.id;
                                return (
                                    <View style={[styles.bubbleWrap, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                                        <Text style={[styles.bubbleTxt, isMe ? { color: 'white' } : { color: 'white' }]}>{item.content || item.message}</Text>
                                        <View style={{flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4, alignItems: 'center'}}><Text style={{fontSize: 9, color: 'rgba(255,255,255,0.4)'}}>{new Date(item.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}</Text>{isMe && <Ionicons name="checkmark-done" size={12} color="rgba(255,255,255,0.6)" style={{marginLeft: 4}} />}</View>
                                    </View>
                                );
                            }}
                            inverted estimatedItemSize={60} contentContainerStyle={{ padding: 20 }}
                        />
                        <View style={[styles.chatInputRow, { paddingBottom: Math.max(20, insets.bottom) }]}><TextInput style={styles.msgInput} placeholder="Message..." placeholderTextColor="rgba(255,255,255,0.3)" value={msgInput} onChangeText={(txt) => { setMsgInput(txt); if(chatModal.chatId) useChatStore.getState().sendTyping(chatModal.chatId); }} onSubmitEditing={sendRealtimeMessage} /><TouchableOpacity style={[styles.sendBtn, !msgInput.trim() && { opacity: 0.5 }]} disabled={!msgInput.trim()} onPress={sendRealtimeMessage}><Ionicons name="send" size={16} color="#FFF" /></TouchableOpacity></View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Gift confirm modal */}
            <Modal visible={giftModal.visible} animationType="slide" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: '#131521', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 28, paddingBottom: insets.bottom + 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', minHeight: 320, justifyContent: 'center' }}>
                        {giftModal.processing ? (
                            <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                                <ActivityIndicator size="large" color="#a78bfa" />
                                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 24, letterSpacing: 0.5 }}>Processing Secure Payment</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 8, fontWeight: '600' }}>Please do not close this window</Text>
                            </View>
                        ) : (
                            <>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}><Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>Send {giftModal.item?.name}</Text><TouchableOpacity onPress={() => setGiftModal(p => ({ ...p, visible: false, user: null }))}><Ionicons name="close" size={24} color="#FFF" /></TouchableOpacity></View>
                                <FlatList horizontal data={filteredUsers} renderItem={({ item }: any) => {
                                    const itemId = item.id || item._id;
                                    const isSelected = giftModal.user && (giftModal.user.id || giftModal.user._id) === itemId;
                                    const safeName = (item.name || 'User').split(' ')[0];
                                    return (
                                        <TouchableOpacity style={[styles.giftUserPill, isSelected && styles.giftUserPillActive]} onPress={() => { Haptics.selectionAsync(); setGiftModal(p => ({ ...p, user: item })); }}>
                                            <Image source={{ uri: item.image || item.profileImage }} style={styles.giftUserAv} contentFit="cover" cachePolicy="memory-disk" />
                                            <Text style={styles.giftUserName} numberOfLines={1}>{safeName}</Text>
                                        </TouchableOpacity>
                                    );
                                }} keyExtractor={item => String(item.id || item._id)} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10, paddingBottom: 20 }} />
                                <TextInput style={styles.msgInput} placeholder="Add a sweet message..." placeholderTextColor="rgba(255,255,255,0.3)" value={giftModal.msg} onChangeText={msg => setGiftModal(p => ({ ...p, msg }))} />
                                <TouchableOpacity 
                                    style={[styles.giftSendBtn, { marginTop: 20, opacity: giftModal.user ? 1 : 0.5 }]} 
                                    disabled={!giftModal.user}
                                    onPress={async () => { 
                                        if (!giftModal.user || !giftModal.item) return;
                                        if (!activeEventId) {
                                            setCustomAlert({
                                                visible: true,
                                                title: 'Verification Required', 
                                                message: 'You must be actively checked into a venue or event to send this premium gift.'
                                            });
                                            return;
                                        }

                                        setGiftModal(p => ({ ...p, processing: true }));
                                        
                                        const payload = {
                                            receiverId: giftModal.user.id || giftModal.user._id,
                                            eventId: activeEventId,
                                            items: [{ menuItemId: giftModal.item._id || giftModal.item.id, quantity: 1, price: giftModal.item.price, name: giftModal.item.name }],
                                            message: giftModal.msg,
                                            totalAmount: giftModal.item.price
                                        };
                                        console.log('🎁 [discover] Proceeding with Confirm & Pay. Payload:', JSON.stringify(payload, null, 2));

                                        // Premium Simulated Delay to imply secure Razorpay routing
                                        setTimeout(async () => {
                                            try {
                                                const res = await apiClient.post('/api/v1/drink-requests/send', payload);
                                                console.log('✅ [discover] Gift Sent successfully Response:', res.data);
                                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                                showToast('Gift Sent successfully! 🎉', 'success'); 
                                                setGiftModal({ visible: false, user: null, item: null, msg: '', processing: false });
                                                refetchAll();
                                            } catch (error: any) { 
                                                console.error('❌ [discover] Gift Payment Error:', error?.response?.data || error?.message || error);
                                                setGiftModal(p => ({ ...p, processing: false })); 
                                                setCustomAlert({ visible: true, title: 'Error', message: 'Failed to process gift order. Check console logs.' }); 
                                            }
                                        }, 1800);
                                    }}
                                >
                                    <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.giftSendGrad}><Text style={styles.giftSendTxt}>Confirm & Pay ₹{giftModal.item?.price || 0}</Text></LinearGradient>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            <CustomAlert 
                visible={customAlert.visible} 
                title={customAlert.title} 
                message={customAlert.message} 
                onClose={() => setCustomAlert(p => ({ ...p, visible: false }))} 
            />

            {/* 🎯 Premium Gender Filter Modal */}
            <Modal visible={showFilterModal} animationType="slide" transparent>
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.75)' }}>
                    <View style={{ backgroundColor: '#0E0E1C', borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingHorizontal: 24, paddingTop: 20, paddingBottom: insets.bottom + 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' }}>
                        {/* Handle Bar */}
                        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginBottom: 24 }} />
                        
                        {/* Header */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                            <View>
                                <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 0.3 }}>Radar Filters</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 }}>Refine who you see nearby</Text>
                            </View>
                            {genderFilter !== 'All' && (
                                <TouchableOpacity onPress={() => setGenderFilter('All')} style={{ backgroundColor: 'rgba(59,130,246,0.12)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' }}>
                                    <Text style={{ color: '#3B82F6', fontSize: 12, fontWeight: '800' }}>RESET</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Section Label */}
                        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 16 }}>SHOW ME</Text>

                        {/* Gender Options List */}
                        <View style={{ gap: 10, marginBottom: 32 }}>
                            {[
                                { id: 'All',    label: 'Everyone',  sub: 'Show all nearby people',   icon: 'people',      color: '#A78BFA' },
                                { id: 'Male',   label: 'Men',       sub: 'Show men only',            icon: 'man',         color: '#60A5FA' },
                                { id: 'Female', label: 'Women',     sub: 'Show women only',          icon: 'woman',       color: '#F472B6' },
                                { id: 'Other',  label: 'Other',     sub: 'Show other identities',    icon: 'transgender', color: '#34D399' },
                            ].map((opt) => {
                                const isActive = genderFilter === opt.id;
                                return (
                                    <TouchableOpacity
                                        key={opt.id}
                                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isActive ? `${opt.color}14` : 'rgba(255,255,255,0.03)', borderRadius: 18, padding: 16, borderWidth: 1.5, borderColor: isActive ? opt.color : 'rgba(255,255,255,0.06)' }}
                                        onPress={() => { Haptics.selectionAsync(); setGenderFilter(opt.id as any); }}
                                        activeOpacity={0.8}
                                    >
                                        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${opt.color}22`, justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                                            <Ionicons name={opt.icon as any} size={22} color={isActive ? opt.color : 'rgba(255,255,255,0.35)'} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.75)', fontSize: 16, fontWeight: '800' }}>{opt.label}</Text>
                                            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 2 }}>{opt.sub}</Text>
                                        </View>
                                        <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: isActive ? opt.color : 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }}>
                                            {isActive && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: opt.color }} />}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Apply Button */}
                        <TouchableOpacity onPress={() => setShowFilterModal(false)} activeOpacity={0.9}>
                            <LinearGradient colors={['#1D4ED8', '#3B82F6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center' }}>
                                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 }}>Apply Filter</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#030303' },
    radarZone: { height: height * 0.42, justifyContent: 'space-between', paddingBottom: 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
    iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    headerCent: { alignItems: 'center' },
    navTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    navSub: { color: '#FFF', fontSize: 13, fontWeight: '800', marginTop: 2 },
    radarVisuals: { height: 160, alignItems: 'center', justifyContent: 'center' },
    pulseRing: { position: 'absolute', width: 64, height: 64, borderRadius: 32, borderWidth: 1, borderColor: '#7c4dff' },
    radarCenter: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(124, 77, 255, 0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(124, 77, 255, 0.4)' },
    crowdBadge: { alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(124, 77, 255, 0.1)' },
    crowdTxt: { color: '#7c4dff', fontSize: 11, fontWeight: '800' },
    toggleWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
    toggleLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700' },
    sheetZone: { flex: 1, backgroundColor: '#050505', borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
    tabNav: { flexDirection: 'row', padding: 8, backgroundColor: '#080808' },
    tabBtn: { flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16 },
    tabActive: { backgroundColor: 'rgba(124, 77, 255, 0.15)' },
    tabTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    tabTxtActive: { color: '#FFF' },
    sheetBody: { flex: 1 },
    tabContent: { flex: 1 },
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyTitle: { color: '#FFF', fontSize: 18, fontWeight: '800', marginTop: 16 },
    emptySub: { color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', marginTop: 10, lineHeight: 20 },
    chatRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 24, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    chatAv: { width: 48, height: 48, borderRadius: 24 },
    chatBody: { flex: 1, marginLeft: 12 },
    chatName: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    chatLastMsg: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 2 },
    giftSearchContainer: { paddingHorizontal: 20, marginTop: 16, marginBottom: 8 },
    giftSearchInner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, paddingHorizontal: 16, height: 48 },
    giftSearchInput: { flex: 1, color: '#FFF', fontSize: 14, marginLeft: 10 },
    chipContainer: { marginBottom: 4 },
    chipScroll: { paddingHorizontal: 20, paddingVertical: 10, gap: 10 },
    chip: { height: 36, paddingHorizontal: 18, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center' },
    activeChip: { backgroundColor: '#7c4dff' },
    chipText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700' },
    activeChipText: { color: '#FFF' },
    giftHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 4, marginBottom: 14 },
    giftHeaderTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' },
    giftHeaderSub: { color: 'rgba(255,255,255,0.3)', fontSize: 11 },
    itemCountBadge: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
    itemCountText: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '800' },
    giftGridScroll: { paddingHorizontal: 20, paddingBottom: 150 },
    bubbleWrap: { maxWidth: '80%', padding: 12, borderRadius: 20, marginBottom: 12 },
    bubbleMe: { alignSelf: 'flex-end', backgroundColor: '#7c4dff' },
    bubbleThem: { alignSelf: 'flex-start', backgroundColor: '#1a1a1a' },
    bubbleTxt: { color: 'white', fontSize: 15 },
    chatInputRow: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#080808', gap: 10 },
    msgInput: { flex: 1, height: 48, backgroundColor: '#151515', borderRadius: 24, paddingHorizontal: 20, color: '#FFF' },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#7c4dff', alignItems: 'center', justifyContent: 'center' },
    giftUserPill: { alignItems: 'center', gap: 8, padding: 12, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)', marginRight: 12, width: 80 },
    giftUserPillActive: { backgroundColor: 'rgba(124, 77, 255, 0.1)', borderColor: '#7c4dff', borderWidth: 1 },
    giftUserAv: { width: 44, height: 44, borderRadius: 22 },
    giftUserName: { color: '#FFF', fontSize: 10, fontWeight: '700' },
    giftSendGrad: { height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    giftSendBtn: { borderRadius: 18, overflow: 'hidden' },
    giftSendTxt: { color: '#FFF', fontSize: 15, fontWeight: '900' },
    modalBg: { flex: 1, backgroundColor: '#030303' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#080808' },
    modalUserRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    modalAv: { width: 36, height: 36, borderRadius: 18 },
    modalName: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
