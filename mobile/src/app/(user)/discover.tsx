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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { prefetchMenuAndGifts } from '../../services/prefetchService';

const { width, height } = Dimensions.get('window');

interface NearbyUser {
    id?: string;
    _id?: string;
    name: string;
    username?: string;
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

// 🚀 HIGH PERFORMANCE MEMOIZED ITEMS 🚀
const ChatRowItem = React.memo(({ item, onPress }: { item: any; onPress: (item: any) => void }) => {
    const uName = item.user?.name || item.name || 'User';
    const img = item.user?.profileImage || item.profileImage;
    const msg = item.lastMsg || (item.tags?.length ? `Vibe: ${item.tags.join(', ')}` : "Tap to say hi!");

    return (
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 22, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }} onPress={() => onPress(item)}>
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
}, (prev, next) => prev.item.id === next.item.id && prev.item._id === next.item._id && prev.item.lastMsg === next.item.lastMsg);

const GiftGridItem = React.memo(({ item, cardWidth, onSelect }: { item: GiftItem; cardWidth: number; onSelect: (item: any) => void }) => (
    <View style={{ width: cardWidth, marginBottom: 12 }}><GiftCard item={item} isSelected={false} onSelect={onSelect} /></View>
), (prev, next) => prev.item._id === next.item._id);


export default function DiscoverScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { showToast } = useToast();
    const { showBanner } = useNotification();
    const { user: currentUser, token } = useAuth();
    const queryClient = useQueryClient();
    
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

    // Sync nearby users with store when data changes
    useEffect(() => {
        if (nearby.data && Array.isArray(nearby.data)) {
            console.log('🔄 [Discover] Syncing nearby users to store:', nearby.data.length);
            setNearbyUsers(nearby.data);
        }
    }, [nearby.data]); // Removed setNearbyUsers to prevent infinite loop

    // 🎁 HOST-SPECIFIC GIFTS — background refresh
    const hostGifts = useQuery({
        queryKey: ['host', 'gifts', activeHostId],
        queryFn: async () => {
            if (!activeHostId) {
                console.log('🎁 [hostGifts] No activeHostId, skipping fetch');
                return [];
            }
            if (!token) {
                console.log('🎁 [hostGifts] No token, user logged out');
                return [];
            }
            console.log('🎁 [hostGifts] Fetching for hostId:', activeHostId);
            try {
                const res = await apiClient.get(`/user/host/${activeHostId}/gifts`);
                console.log('🎁 [hostGifts] Response:', res.data?.success, 'Count:', res.data?.data?.length || 0);
                return res.data?.success && res.data.data ? res.data.data : [];
            } catch (e: any) {
                console.error('🎁 [hostGifts] Error:', e.message);
                return [];
            }
        },
        enabled: !!activeHostId && !!token, // Only fetch if authenticated
        staleTime: 1000 * 60 * 2, // 2 min
        gcTime: 1000 * 60 * 20,
        placeholderData: [], // Show empty array while loading
    });

    // 🍽️ HOST-SPECIFIC MENU — background refresh
    const hostMenu = useQuery({
        queryKey: ['host', 'menu', activeHostId],
        queryFn: async () => {
            if (!activeHostId) return [];
            if (!token) {
                console.log('🍽️ [hostMenu] No token, user logged out');
                return [];
            }
            try {
                const res = await apiClient.get(`/user/host/${activeHostId}/menu`);
                return res.data?.success && res.data.data ? res.data.data : [];
            } catch (e) {
                return [];
            }
        },
        enabled: !!activeHostId && !!token, // Only fetch if authenticated
        staleTime: 1000 * 60 * 2, // 2 min
        gcTime: 1000 * 60 * 20,
    });

    // Never block the whole UI on hostGifts load — it has placeholderData
    const queryLoading = queryLoadingBase || hostGifts.isLoading || gifts.isLoading;

    // ─── Chat Sockets Integration ───

    // Chat Sockets Integration
    const { 
        initSocket, 
        fetchHistory, 
        sendMessage: sendSocketMessage, 
        messagesByPeer, 
        isTyping, 
        setMessageReceivedCallback,
        setChatRequestCallback,
        acceptChatRequest,
        rejectChatRequest,
        chatRequests,
        acceptedChats
    } = useChatStore();
    useEffect(() => { 
        if (token && currentUser?.id) {
            initSocket(token, currentUser.id);
        }
    }, [token, currentUser?.id, initSocket]);

    // Setup notification callback for incoming messages
    useEffect(() => {
        setMessageReceivedCallback((senderId: string, senderName: string, content: string) => {
            console.log('🔔 [Discover] Message received notification:', { senderId, senderName, content });
            showBanner({
                id: `chat_${senderId}_${Date.now()}`,
                title: `${senderName}`,
                body: content.substring(0, 100),
                type: 'CHAT',
                createdAt: new Date(),
            });
        });
    }, [setMessageReceivedCallback, showBanner]);

    // Setup chat request callback
    useEffect(() => {
        setChatRequestCallback((senderId: string, senderName: string, content: string, senderImage?: string) => {
            console.log('🔔 [Discover] Chat request received:', { senderId, senderName, content });
            
            // Show chat request modal
            setChatRequestModal({
                visible: true,
                request: {
                    senderId,
                    senderName,
                    senderImage,
                    content
                }
            });
            
            showBanner({
                id: `chat_request_${senderId}_${Date.now()}`,
                title: `💬 Chat Request from ${senderName}`,
                body: `"${content.substring(0, 80)}"`,
                type: 'ALERT',
                createdAt: new Date(),
            });
        });
    }, [setChatRequestCallback, showBanner]);

    // Setup gift request callback
    const { setGiftRequestCallback, giftRequests, addGiftRequest, removeGiftRequest } = useDiscoveryStore();
    
    useEffect(() => {
        setGiftRequestCallback((request) => {
            console.log('🎁 [Discover] Gift request received:', request);
            
            // Show gift request modal
            setGiftRequestModal({
                visible: true,
                request
            });
            
            showBanner({
                id: `gift_request_${request.requestId}_${Date.now()}`,
                title: `🎁 Gift from ${request.senderName}`,
                body: `${request.item.name} - ${request.message || 'Someone wants to send you a gift!'}`,
                type: 'ALERT',
                createdAt: new Date(),
            });
        });
    }, [setGiftRequestCallback, showBanner]);

    const [giftModal, setGiftModal] = useState<{ visible: boolean; user: any | null; item: any | null; msg: string; processing: boolean }>({
        visible: false, user: null, item: null, msg: '', processing: false
    });
    const [giftRequestModal, setGiftRequestModal] = useState<{ visible: boolean, request: any | null }>({ visible: false, request: null });
    const [chatModal, setChatModal] = useState<{ visible: boolean, chatId: string | null, user: any, msgs: any[] }>({ visible: false, chatId: null, user: null, msgs: [] });
    const [chatRequestModal, setChatRequestModal] = useState<{ visible: boolean, request: any | null }>({ visible: false, request: null });
    const [drinkModal, setDrinkModal] = useState<{ visible: boolean, user: any, selectedItem: any | null }>({ visible: false, user: null, selectedItem: null });
    const chatListRef = useRef<any>(null);
    const [userDetailModal, setUserDetailModal] = useState<{ visible: boolean, user: any | null }>({ visible: false, user: null });
    const [msgInput, setMsgInput] = useState('');
    const [customAlert, setCustomAlert] = useState<{ visible: boolean; title: string; message: string }>({ visible: false, title: '', message: '' });

    // Radar Animations
    const pulseAnim1 = useRef(new Animated.Value(0)).current;
    const pulseAnim2 = useRef(new Animated.Value(0)).current;

    // Helper function for retrying API calls with exponential backoff
    const retryApiCall = async <T,>(
        apiCall: () => Promise<T>,
        maxRetries = 3,
        initialDelay = 1000
    ): Promise<T> => {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await apiCall();
            } catch (error: any) {
                const status = error.response?.status;
                const isColdStart = status === 502 || status === 503;
                const isLastAttempt = attempt === maxRetries;
                
                if (isColdStart && !isLastAttempt) {
                    const delay = initialDelay * Math.pow(2, attempt);
await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                
                throw error;
            }
        }
        throw new Error('Max retries exceeded');
    };

    const [userLoc, setUserLoc] = useState<{lat: number, lng: number} | null>(null);
    const hasInitializedRef = useRef(false);

    const initSystem = useCallback(async () => {
        // Prevent multiple initializations
        if (hasInitializedRef.current) {
            console.log('⏭️ [initSystem] Already initialized, skipping...');
            return;
        }
        
        try {
            let capturedLocation: {lat: number, lng: number} | null = null;
            
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                try {
                    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    const reverse = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
                    if (reverse && reverse.length > 0) setLocationName(reverse[0].name || reverse[0].street || 'Private Event');
                    
                    // Store user location for presence updates
                    capturedLocation = { lat: loc.coords.latitude, lng: loc.coords.longitude };
                    setUserLoc(capturedLocation);
                    console.log('📍 [initSystem] User location captured:', capturedLocation);
                } catch (locErr) { 
                    console.warn('⚠️ [initSystem] Location error:', locErr);
                }
            }

            // Retry active-event API call with exponential backoff
            const eventRes = await retryApiCall(
                () => apiClient.get('/user/active-event?refresh=true'),
                3,
                2000
            );
            
            if (eventRes.data?.success && eventRes.data.data) {
                const booking = eventRes.data.data;
                const eid = booking.eventId?._id || booking.eventId;
                const hid = booking.hostId;
                const crowd = booking.liveCrowd || 0;
                
                console.log('📍 [initSystem] Booking data:', { eid, hid, crowd, booking });
                
                if (eid) {
                    setActiveEventId(String(eid));
                    
                    // Auto-seed EventPresence for testing (will be removed in production)
                    try {
                        console.log('🌱 [initSystem] Auto-seeding EventPresence...');
                        await apiClient.post(`/test/seed-presence/${eid}`);
                        console.log('✅ [initSystem] EventPresence seeded successfully');
                        
                        // After seeding, immediately update current user's presence with location
                        const currentSocket = useChatStore.getState().socket;
                        console.log('🔌 [initSystem] Socket status:', { 
                            hasSocket: !!currentSocket, 
                            isConnected: currentSocket?.connected,
                            hasLocation: !!capturedLocation 
                        });
                        
                        if (currentSocket && capturedLocation) {
                            if (currentSocket.connected) {
                                console.log('📡 [initSystem] Auto-updating my presence with location:', capturedLocation);
                                currentSocket.emit('updatePresence', {
                                    eventId: eid,
                                    lat: capturedLocation.lat,
                                    lng: capturedLocation.lng,
                                    visibility: true // Auto-enable visibility for testing
                                });
                                setVisibility(true);
                            } else {
                                console.warn('⚠️ [initSystem] Socket not connected yet, will update presence when connected');
                                // Wait for socket to connect, then update
                                currentSocket.once('connect', () => {
                                    console.log('📡 [initSystem] Socket connected, now updating presence');
                                    currentSocket.emit('updatePresence', {
                                        eventId: eid,
                                        lat: capturedLocation.lat,
                                        lng: capturedLocation.lng,
                                        visibility: true
                                    });
                                    setVisibility(true);
                                });
                            }
                        } else {
                            console.warn('⚠️ [initSystem] Cannot update presence:', {
                                hasSocket: !!currentSocket,
                                hasLocation: !!capturedLocation
                            });
                        }
                    } catch (seedErr: any) {
                        console.warn('⚠️ [initSystem] Seed failed (might already exist):', seedErr.message);
                    }
                }
                if (hid) {
                    console.log('📍 [initSystem] Setting activeHostId:', String(hid));
                    setActiveHostId(String(hid));
                }
                if (crowd) {
                    console.log('👥 [initSystem] Setting live crowd:', crowd);
                    setLiveCrowd(crowd);
                }
            } else {
                console.log('📍 [initSystem] No active booking found');
            }
            
            hasInitializedRef.current = true;
        } catch (e: any) { 
            // Silent fail for 502/503 - these are expected during cold starts
            const status = e.response?.status;
            if (status === 502 || status === 503) {
} else {
}
        } finally { setLoading(false); }
    }, [setLocationName, setLoading, setLiveCrowd, setVisibility]);

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

    // ⚡ INSTAGRAM/ZEPTO STYLE: Prefetch menu & gifts when hostId is set
    useEffect(() => {
        if (activeHostId) {
            console.log('🚀 [Prefetch] Starting instant load for hostId:', activeHostId);
            prefetchMenuAndGifts(queryClient, activeHostId);
        }
    }, [activeHostId, queryClient]);

    // Track if we've joined the event room to prevent duplicate joins
    const hasJoinedEventRef = useRef<string | null>(null);

    useEffect(() => {
        const currentSocket = useChatStore.getState().socket;
        if (currentSocket && activeEventId) {
            // Only join if we haven't joined this event yet
            if (hasJoinedEventRef.current !== activeEventId) {
                console.log('🚪 [Discover] Joining event room:', activeEventId);
                currentSocket.emit('joinEvent', { eventId: activeEventId });
                hasJoinedEventRef.current = activeEventId;
            }
            
            // Setup event listeners
            const handlePresenceUpdate = ({ totalPresent }: any) => setLiveCrowd(totalPresent);
            const handleNotification = (payload: any) => {
                showBanner({
                    id: payload.id || `notif_${Date.now()}`,
                    title: payload.title,
                    body: payload.body,
                    type: payload.type || 'ALERT',
                    createdAt: new Date(),
                });
            };
            const handleUserVisible = ({ userId }: any) => {
                console.log('👁️ [Discover] User became visible:', userId);
                nearby.refetch();
            };
            const handleGiftRequest = (request: any) => {
                console.log('🎁 [Discover] Received gift request:', request);
                addGiftRequest(request);
            };
            const handleGiftAccepted = ({ requestId }: any) => {
                console.log('✅ [Discover] Gift request accepted:', requestId);
                showToast('Your gift was accepted! 🎉', 'success');
                removeGiftRequest(requestId);
            };
            const handleGiftRejected = ({ requestId }: any) => {
                console.log('❌ [Discover] Gift request declined:', requestId);
                showToast('Gift request was declined', 'info');
                removeGiftRequest(requestId);
            };
            
            currentSocket.on('presenceUpdate', handlePresenceUpdate);
            currentSocket.on('notification', handleNotification);
            currentSocket.on('userVisible', handleUserVisible);
            currentSocket.on('receive_gift_request', handleGiftRequest);
            currentSocket.on('gift_request_accepted', handleGiftAccepted);
            currentSocket.on('gift_request_rejected', handleGiftRejected);
            
            // Cleanup listeners on unmount or when activeEventId changes
            return () => {
                currentSocket.off('presenceUpdate', handlePresenceUpdate);
                currentSocket.off('notification', handleNotification);
                currentSocket.off('userVisible', handleUserVisible);
                currentSocket.off('receive_gift_request', handleGiftRequest);
                currentSocket.off('gift_request_accepted', handleGiftAccepted);
                currentSocket.off('gift_request_rejected', handleGiftRejected);
            };
        }
    }, [activeEventId, setLiveCrowd, showBanner, nearby, addGiftRequest, removeGiftRequest, showToast]);
    
    // Separate effect for leaving event room on unmount
    useEffect(() => {
        return () => {
            const socket = useChatStore.getState().socket;
            if (socket && hasJoinedEventRef.current) {
                console.log('🚪 [Discover] Leaving event room on unmount:', hasJoinedEventRef.current);
                socket.emit('leaveEvent', { eventId: hasJoinedEventRef.current });
                hasJoinedEventRef.current = null;
            }
        };
    }, []);

    const toggleVisibility = (val: boolean) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setVisibility(val);
        const currentSocket = useChatStore.getState().socket;
        if (currentSocket && activeEventId) {
            // Send location with visibility update
            const payload: any = { 
                eventId: activeEventId, 
                visibility: val 
            };
            
            // Include location if available
            if (userLoc) {
                payload.lat = userLoc.lat;
                payload.lng = userLoc.lng;
                console.log('📡 [toggleVisibility] Sending presence with location:', payload);
            } else {
                console.warn('⚠️ [toggleVisibility] No location available, sending without coordinates');
            }
            
            currentSocket.emit('updatePresence', payload);
            
            // Refetch nearby users after visibility change
            if (val) {
                setTimeout(() => {
                    nearby.refetch();
                }, 1000);
            }
        }
    };

    const resolveOpenChat = useCallback((chatPreview: any) => {
        Haptics.selectionAsync();
        const targetId = chatPreview.user?.id || chatPreview.user?._id;
        const targetUser = chatPreview.user;
        
        if (targetId) {
            // Check if chat already exists (accepted)
            const existingMessages = messagesByPeer[targetId];
            
            if (existingMessages && existingMessages.length > 0) {
                // Chat already exists, open it
                setChatModal({ visible: true, chatId: targetId, user: targetUser, msgs: [] });
                fetchHistory(targetId);
            } else {
                // No chat exists, show chat request modal
                setChatModal({ visible: true, chatId: targetId, user: targetUser, msgs: [] });
            }
        }
    }, [fetchHistory, messagesByPeer]);

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
        <View style={{ marginBottom: 12 }}>
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
                    const displayName = u.username ? `@${u.username}` : safeName;
                    
                    return (
                        <View style={{ alignItems: 'center', marginRight: 20 }}>
                            <TouchableOpacity 
                                style={{ alignItems: 'center' }} 
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    setUserDetailModal({ visible: true, user: u });
                                }}
                                onLongPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    setGiftModal(p => ({ ...p, visible: true, user: u }));
                                }}
                            >
                                <View style={{ shadowColor: '#7c4dff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }}>
                                    <LinearGradient colors={['#FF007A', '#7A00FF', '#00F0FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 2.5, borderRadius: 38, width: 70, height: 70, justifyContent: 'center', alignItems: 'center' }}>
                                        <View style={{ backgroundColor: '#131521', padding: 2, borderRadius: 34 }}>
                                            <Image source={{ uri: avatar(u.profileImage) }} style={{ width: 60, height: 60, borderRadius: 30 }} cachePolicy="memory-disk" contentFit="cover" />
                                        </View>
                                    </LinearGradient>
                                    {/* Active Dot */}
                                    <View style={{ position: 'absolute', bottom: 2, right: 2, width: 16, height: 16, backgroundColor: '#10B981', borderRadius: 8, borderWidth: 3, borderColor: '#131521' }} />
                                </View>
                                <Text style={{ color: 'white', fontSize: 13, fontWeight: '800', marginTop: 10, letterSpacing: 0.3 }} numberOfLines={1}>{displayName}</Text>
                            </TouchableOpacity>
                            
                            {/* Quick Action Buttons */}
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                                <TouchableOpacity 
                                    style={{ backgroundColor: 'rgba(124,77,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#7c4dff' }}
                                    onPress={() => resolveOpenChat({ user: u })}
                                >
                                    <Ionicons name="chatbubble" size={14} color="#7c4dff" />
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={{ backgroundColor: 'rgba(139,92,246,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#8B5CF6' }}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setGiftModal(p => ({ ...p, visible: true, user: u }));
                                    }}
                                >
                                    <Ionicons name="gift" size={14} color="#8B5CF6" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                }}
            />
        </View>
    ), [filteredUsers, resolveOpenChat]);

    const renderChatRow = useCallback(({ item }: { item: any }) => {
        return <ChatRowItem 
            item={item} 
            onPress={(chatPreview: any) => {
                Haptics.selectionAsync();
                const user = chatPreview.user || chatPreview;
                setUserDetailModal({ visible: true, user });
            }} 
        />;
    }, []);

    const cardWidth = (width - 48) / 2; // 40px padding + 8px gap
    const renderGiftItem = useCallback(({ item }: { item: GiftItem }) => (
        <GiftGridItem item={item} cardWidth={cardWidth} onSelect={onGiftSelect} />
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
                    {/* Radar Grid Lines */}
                    <View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 1, borderColor: 'rgba(124,77,255,0.15)' }} />
                    <View style={{ position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 1, borderColor: 'rgba(124,77,255,0.2)' }} />
                    <View style={{ position: 'absolute', width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(124,77,255,0.3)' }} />
                    
                    {/* Horizontal & Vertical Lines */}
                    <View style={{ position: 'absolute', width: 120, height: 1, backgroundColor: 'rgba(124,77,255,0.1)' }} />
                    <View style={{ position: 'absolute', width: 1, height: 120, backgroundColor: 'rgba(124,77,255,0.1)' }} />
                    
                    {/* Animated Radar Sweep */}
                    <Animated.View 
                        style={[
                            styles.pulseRing, 
                            { 
                                transform: [
                                    { scale: pulseAnim1.interpolate({ inputRange: [0,1], outputRange: [1,2.5] }) },
                                    { rotate: pulseAnim1.interpolate({ inputRange: [0,1], outputRange: ['0deg', '360deg'] }) }
                                ], 
                                opacity: pulseAnim1.interpolate({ inputRange: [0,1], outputRange: [0.5,0] }),
                                borderColor: '#7c4dff',
                                borderTopWidth: 2,
                                borderRightWidth: 0,
                                borderBottomWidth: 0,
                                borderLeftWidth: 0
                            }
                        ]} 
                    />
                    
                    {/* Center Point (Current User) */}
                    <View style={styles.radarCenter}>
                        <Ionicons name="radio" size={24} color="#7c4dff" />
                    </View>
                    
                    {/* Live User Avatars Positioned on Radar */}
                    {filteredUsers.slice(0, 6).map((user, index) => {
                        // Random position around center within radar range
                        const angle = (index * 60 + Math.random() * 30) * (Math.PI / 180);
                        const distance = 30 + Math.random() * 40; // Random distance from center
                        const x = Math.cos(angle) * distance;
                        const y = Math.sin(angle) * distance;
                        
                        return (
                            <Animated.View
                                key={user.id || user._id}
                                style={{
                                    position: 'absolute',
                                    left: '50%',
                                    top: '50%',
                                    marginLeft: x - 18,
                                    marginTop: y - 18,
                                    opacity: pulseAnim2.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 1, 0.6] })
                                }}
                            >
                                <TouchableOpacity
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setUserDetailModal({ visible: true, user });
                                    }}
                                    style={{ alignItems: 'center' }}
                                >
                                    <View style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#10B981', overflow: 'hidden', backgroundColor: '#0d0620' }}>
                                        <Image 
                                            source={{ uri: avatar(user.profileImage || user.image) }} 
                                            style={{ width: '100%', height: '100%' }}
                                            cachePolicy="memory-disk"
                                            contentFit="cover"
                                        />
                                    </View>
                                    {/* Active Pulse Dot */}
                                    <View style={{ position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#0d0620' }} />
                                    
                                    {/* Distance Label */}
                                    <View style={{ marginTop: 4, backgroundColor: 'rgba(124,77,255,0.8)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                                        <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800' }}>
                                            {user.distance || Math.floor(Math.random() * 50)}m
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    })}
                    
                    {/* Radar Scan Line */}
                    <Animated.View
                        style={{
                            position: 'absolute',
                            width: 60,
                            height: 2,
                            backgroundColor: '#7c4dff',
                            opacity: 0.6,
                            transform: [
                                { rotate: pulseAnim1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }
                            ]
                        }}
                    />
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
                                ) : queryLoading ? (
                                    // Radar Loading Animation
                                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
                                        <View style={{ position: 'relative', width: 200, height: 200, alignItems: 'center', justifyContent: 'center' }}>
                                            {/* Animated Radar Rings */}
                                            <Animated.View 
                                                style={[
                                                    { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: '#7c4dff', opacity: 0.3 },
                                                    { transform: [{ scale: pulseAnim1.interpolate({ inputRange: [0,1], outputRange: [1, 2.5] }) }], opacity: pulseAnim1.interpolate({ inputRange: [0,1], outputRange: [0.6, 0] }) }
                                                ]} 
                                            />
                                            <Animated.View 
                                                style={[
                                                    { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: '#7c4dff', opacity: 0.3 },
                                                    { transform: [{ scale: pulseAnim2.interpolate({ inputRange: [0,1], outputRange: [1, 2.5] }) }], opacity: pulseAnim2.interpolate({ inputRange: [0,1], outputRange: [0.6, 0] }) }
                                                ]} 
                                            />
                                            
                                            {/* Center Icon */}
                                            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(124,77,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(124,77,255,0.4)' }}>
                                                <Ionicons name="radio" size={40} color="#7c4dff" />
                                            </View>
                                        </View>
                                        
                                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 30, letterSpacing: 0.5 }}>
                                            Scanning for nearby users...
                                        </Text>
                                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
                                            Detecting people at this event
                                        </Text>
                                        
                                        {/* Loading Dots */}
                                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
                                            {[0, 1, 2].map((i) => (
                                                <Animated.View 
                                                    key={i}
                                                    style={{
                                                        width: 8,
                                                        height: 8,
                                                        borderRadius: 4,
                                                        backgroundColor: '#7c4dff',
                                                        opacity: pulseAnim1.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [0.3, 1]
                                                        })
                                                    }}
                                                />
                                            ))}
                                        </View>
                                    </View>
                                ) : (
                                    <FlashList 
                                        data={nearbyUsers.map(u => ({ ...u, type: 'chat' })) as any} 
                                        keyExtractor={(item: any) => item._id || item.id} 
                                        ListHeaderComponent={ChatListHeader} 
                                        ListEmptyComponent={<View style={styles.emptyWrap}><Ionicons name="people-outline" size={48} color="rgba(255,255,255,0.2)" /><Text style={styles.emptyTitle}>No one nearby yet</Text><Text style={styles.emptySub}>Be the first to show up on the radar!</Text></View>}
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
                                        ListEmptyComponent={queryLoading && !refreshing ? (
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20, paddingTop: 20 }}>
                                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                                    <View key={i} style={{ width: (width - 48) / 2, backgroundColor: '#111118', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
                                                        <View style={{ width: '100%', height: 140, backgroundColor: 'rgba(255,255,255,0.05)' }} />
                                                        <View style={{ padding: 12 }}>
                                                            <View style={{ width: 60, height: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 8 }} />
                                                            <View style={{ width: '80%', height: 16, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, marginBottom: 6 }} />
                                                            <View style={{ width: '100%', height: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 4, marginBottom: 12 }} />
                                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <View style={{ width: 50, height: 18, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4 }} />
                                                                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(124,77,255,0.2)' }} />
                                                            </View>
                                                        </View>
                                                    </View>
                                                ))}
                                            </View>
                                        ) : null}
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
                        <View style={[styles.modalHeader, { paddingTop: insets.top + 10 }]}>
                            <TouchableOpacity style={styles.iconBtn} onPress={() => setChatModal({ visible: false, chatId: null, user: null, msgs: [] })}>
                                <Ionicons name="chevron-down" size={28} color="#FFF" />
                            </TouchableOpacity>
                            <View style={styles.modalUserRow}>
                                <Image source={{ uri: avatar(chatModal.user?.profileImage) }} style={styles.modalAv} contentFit="cover" cachePolicy="memory-disk" />
                                <View>
                                    <Text style={styles.modalName}>{chatModal.user?.name}</Text>
                                    {isTyping[chatModal.chatId || ''] && <Text style={{color: '#7c4dff', fontSize: 10, fontWeight: '700'}}>typing...</Text>}
                                </View>
                            </View>
                            <View style={{width: 44}} />
                        </View>
                        
                        {/* Check if chat exists */}
                        {(!messagesByPeer[chatModal.chatId || ''] || messagesByPeer[chatModal.chatId || ''].length === 0) ? (
                            // Chat Request UI - No messages yet
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                                <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(124,77,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                                    <Ionicons name="chatbubble-ellipses" size={50} color="#7c4dff" />
                                </View>
                                
                                <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 12 }}>
                                    Start a Conversation
                                </Text>
                                
                                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
                                    Send a friendly message to {chatModal.user?.name?.split(' ')[0]}. They'll see your request and can choose to accept.
                                </Text>
                                
                                {/* Quick Message Suggestions */}
                                <View style={{ width: '100%', gap: 12, marginBottom: 24 }}>
                                    {['Hey! 👋', 'Hi there!', 'Hello! How\'s it going?'].map((suggestion) => (
                                        <TouchableOpacity
                                            key={suggestion}
                                            style={{ backgroundColor: 'rgba(124,77,255,0.1)', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(124,77,255,0.3)' }}
                                            onPress={() => setMsgInput(suggestion)}
                                        >
                                            <Text style={{ color: '#7c4dff', fontSize: 15, fontWeight: '700', textAlign: 'center' }}>
                                                {suggestion}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        ) : (
                            // Existing Chat - Show messages
                            <FlashList 
                                ref={chatListRef}
                                data={messagesByPeer[chatModal.chatId || ''] || []}
                                keyExtractor={(item: any) => item._id || item.tempId}
                                renderItem={({ item }: any) => {
                                    const isMe = item.sender === currentUser?.id;
                                    return (
                                        <View style={[styles.bubbleWrap, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                                            <Text style={[styles.bubbleTxt, isMe ? { color: 'white' } : { color: 'white' }]}>{item.content || item.message}</Text>
                                            <View style={{flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4, alignItems: 'center'}}>
                                                <Text style={{fontSize: 9, color: 'rgba(255,255,255,0.4)'}}>
                                                    {new Date(item.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}
                                                </Text>
                                                {isMe && <Ionicons name="checkmark-done" size={12} color="rgba(255,255,255,0.6)" style={{marginLeft: 4}} />}
                                            </View>
                                        </View>
                                    );
                                }}
                                estimatedItemSize={60} 
                                contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                                onContentSizeChange={() => {
                                    // Auto-scroll to bottom when new message arrives
                                    setTimeout(() => {
                                        chatListRef.current?.scrollToEnd({ animated: true });
                                    }, 100);
                                }}
                                onLayout={() => {
                                    // Scroll to bottom on initial load
                                    setTimeout(() => {
                                        chatListRef.current?.scrollToEnd({ animated: false });
                                    }, 100);
                                }}
                            />
                        )}
                        
                        <View style={[styles.chatInputRow, { paddingBottom: Math.max(20, insets.bottom) }]}>
                            <TextInput 
                                style={styles.msgInput} 
                                placeholder={(!messagesByPeer[chatModal.chatId || ''] || messagesByPeer[chatModal.chatId || ''].length === 0) ? "Send a chat request..." : "Message..."} 
                                placeholderTextColor="rgba(255,255,255,0.3)" 
                                value={msgInput} 
                                onChangeText={(txt) => { 
                                    setMsgInput(txt); 
                                    if(chatModal.chatId) useChatStore.getState().sendTyping(chatModal.chatId); 
                                }} 
                                onSubmitEditing={sendRealtimeMessage} 
                            />
                            <TouchableOpacity 
                                style={[styles.sendBtn, !msgInput.trim() && { opacity: 0.5 }]} 
                                disabled={!msgInput.trim()} 
                                onPress={sendRealtimeMessage}
                            >
                                <Ionicons name="send" size={16} color="#FFF" />
                            </TouchableOpacity>
                        </View>
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

                                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                        
                                        // Create gift request (not direct payment)
                                        const requestId = `gift_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                                        const giftRequest = {
                                            requestId,
                                            senderId: currentUser?.id || '',
                                            senderName: currentUser?.name || 'Someone',
                                            senderImage: currentUser?.profileImage,
                                            receiverId: giftModal.user.id || giftModal.user._id,
                                            item: {
                                                _id: giftModal.item._id || giftModal.item.id,
                                                name: giftModal.item.name,
                                                price: giftModal.item.price,
                                                image: giftModal.item.image
                                            },
                                            message: giftModal.msg || `${currentUser?.name} wants to send you a gift!`,
                                            timestamp: new Date().toISOString(),
                                            eventId: activeEventId
                                        };
                                        
                                        // Send gift request via socket
                                        const currentSocket = useChatStore.getState().socket;
                                        if (currentSocket) {
                                            console.log('🎁 [Discover] Sending gift request:', giftRequest);
                                            currentSocket.emit('send_gift_request', giftRequest);
                                            
                                            showToast('Gift request sent! 🎁', 'success');
                                            setGiftModal({ visible: false, user: null, item: null, msg: '', processing: false });
                                        } else {
                                            setCustomAlert({ 
                                                visible: true, 
                                                title: 'Connection Error', 
                                                message: 'Unable to send gift request. Please check your connection.' 
                                            });
                                        }
                                    }}
                                >
                                    <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.giftSendGrad}><Text style={styles.giftSendTxt}>Send Gift Request</Text></LinearGradient>
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

            {/* User Detail Modal */}
            <Modal visible={userDetailModal.visible} animationType="slide" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: '#0E0E1C', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: insets.bottom + 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                        {/* Header */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 10 }}>
                            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>User Profile</Text>
                            <TouchableOpacity onPress={() => setUserDetailModal({ visible: false, user: null })}>
                                <Ionicons name="close" size={28} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        {/* User Info */}
                        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                            <LinearGradient 
                                colors={['#FF007A', '#7A00FF', '#00F0FF']} 
                                start={{ x: 0, y: 0 }} 
                                end={{ x: 1, y: 1 }} 
                                style={{ padding: 3, borderRadius: 60, marginBottom: 16 }}
                            >
                                <View style={{ backgroundColor: '#0E0E1C', padding: 3, borderRadius: 57 }}>
                                    <Image 
                                        source={{ uri: avatar(userDetailModal.user?.profileImage || userDetailModal.user?.image) }} 
                                        style={{ width: 100, height: 100, borderRadius: 50 }} 
                                        cachePolicy="memory-disk" 
                                        contentFit="cover" 
                                    />
                                </View>
                            </LinearGradient>
                            
                            <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 4 }}>
                                {userDetailModal.user?.name || 'User'}
                            </Text>
                            
                            {userDetailModal.user?.username && (
                                <Text style={{ color: '#7c4dff', fontSize: 16, fontWeight: '700', marginBottom: 8 }}>
                                    @{userDetailModal.user.username}
                                </Text>
                            )}
                            
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 6 }} />
                                    <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '800' }}>ONLINE</Text>
                                </View>
                                
                                {userDetailModal.user?.distance && (
                                    <View style={{ backgroundColor: 'rgba(124,77,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                                        <Text style={{ color: '#7c4dff', fontSize: 12, fontWeight: '800' }}>
                                            {userDetailModal.user.distance}m away
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Action Buttons */}
                        <View style={{ paddingHorizontal: 20, gap: 12, marginTop: 10 }}>
                            <TouchableOpacity 
                                style={{ backgroundColor: '#7c4dff', paddingVertical: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}
                                onPress={() => {
                                    setUserDetailModal({ visible: false, user: null });
                                    resolveOpenChat({ user: userDetailModal.user });
                                }}
                            >
                                <Ionicons name="chatbubble" size={20} color="#fff" />
                                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>Start Chat</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={{ backgroundColor: 'rgba(139,92,246,0.2)', paddingVertical: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1.5, borderColor: '#8B5CF6' }}
                                onPress={() => {
                                    setUserDetailModal({ visible: false, user: null });
                                    setGiftModal(p => ({ ...p, visible: true, user: userDetailModal.user }));
                                }}
                            >
                                <Ionicons name="gift" size={20} color="#8B5CF6" />
                                <Text style={{ color: '#8B5CF6', fontSize: 16, fontWeight: '900' }}>Send Gift</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* 💬 Chat Request Modal */}
            <Modal visible={chatRequestModal.visible} animationType="slide" transparent>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.9)', padding: 20 }}>
                    <View style={{ backgroundColor: '#131521', borderRadius: 32, padding: 32, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: 'rgba(124,77,255,0.3)' }}>
                        {/* Profile Image */}
                        <View style={{ alignItems: 'center', marginBottom: 24 }}>
                            <View style={{ position: 'relative' }}>
                                <Image 
                                    source={{ uri: avatar(chatRequestModal.request?.senderImage) }} 
                                    style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#7c4dff' }}
                                    contentFit="cover"
                                    cachePolicy="memory-disk"
                                />
                                <View style={{ position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: '#7c4dff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#131521' }}>
                                    <Ionicons name="chatbubble" size={16} color="#fff" />
                                </View>
                            </View>
                        </View>

                        {/* Title */}
                        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 8 }}>
                            Chat Request
                        </Text>
                        
                        {/* Sender Name */}
                        <Text style={{ color: '#7c4dff', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 20 }}>
                            from {chatRequestModal.request?.senderName}
                        </Text>

                        {/* Message Preview */}
                        <View style={{ backgroundColor: 'rgba(124,77,255,0.1)', borderRadius: 16, padding: 16, marginBottom: 32, borderWidth: 1, borderColor: 'rgba(124,77,255,0.2)' }}>
                            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8 }}>
                                FIRST MESSAGE
                            </Text>
                            <Text style={{ color: '#fff', fontSize: 15, lineHeight: 22 }}>
                                "{chatRequestModal.request?.content}"
                            </Text>
                        </View>

                        {/* Action Buttons */}
                        <View style={{ gap: 12 }}>
                            {/* Accept Button */}
                            <TouchableOpacity
                                style={{ backgroundColor: '#7c4dff', borderRadius: 18, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                                onPress={() => {
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                    if (chatRequestModal.request?.senderId) {
                                        acceptChatRequest(chatRequestModal.request.senderId);
                                        showToast('Chat request accepted! 💬', 'success');
                                        
                                        // Open chat with this user
                                        const user = nearbyUsers.find(u => (u.id || u._id) === chatRequestModal.request.senderId);
                                        if (user) {
                                            setChatModal({ 
                                                visible: true, 
                                                chatId: chatRequestModal.request.senderId, 
                                                user, 
                                                msgs: [] 
                                            });
                                        }
                                    }
                                    setChatRequestModal({ visible: false, request: null });
                                }}
                            >
                                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '900' }}>Accept & Chat</Text>
                            </TouchableOpacity>

                            {/* Reject Button */}
                            <TouchableOpacity
                                style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 18, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    if (chatRequestModal.request?.senderId) {
                                        rejectChatRequest(chatRequestModal.request.senderId);
                                        showToast('Chat request declined', 'info');
                                    }
                                    setChatRequestModal({ visible: false, request: null });
                                }}
                            >
                                <Ionicons name="close-circle" size={24} color="rgba(255,255,255,0.5)" />
                                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 17, fontWeight: '900' }}>Decline</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Close Button */}
                        <TouchableOpacity
                            style={{ position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}
                            onPress={() => setChatRequestModal({ visible: false, request: null })}
                        >
                            <Ionicons name="close" size={20} color="rgba(255,255,255,0.5)" />
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* 🎁 Gift Request Modal */}
            <Modal visible={giftRequestModal.visible} animationType="slide" transparent>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.9)', padding: 20 }}>
                    <View style={{ backgroundColor: '#131521', borderRadius: 32, padding: 32, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' }}>
                        {/* Gift Item Image */}
                        <View style={{ alignItems: 'center', marginBottom: 24 }}>
                            <View style={{ position: 'relative' }}>
                                {giftRequestModal.request?.item?.image ? (
                                    <Image 
                                        source={{ uri: giftRequestModal.request.item.image }} 
                                        style={{ width: 120, height: 120, borderRadius: 20, borderWidth: 3, borderColor: '#8B5CF6' }}
                                        contentFit="cover"
                                        cachePolicy="memory-disk"
                                    />
                                ) : (
                                    <View style={{ width: 120, height: 120, borderRadius: 20, backgroundColor: 'rgba(139,92,246,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#8B5CF6' }}>
                                        <Ionicons name="gift" size={60} color="#8B5CF6" />
                                    </View>
                                )}
                                <View style={{ position: 'absolute', bottom: -10, right: -10, width: 40, height: 40, borderRadius: 20, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#131521' }}>
                                    <Ionicons name="gift" size={20} color="#fff" />
                                </View>
                            </View>
                        </View>

                        {/* Title */}
                        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 8 }}>
                            Gift Request
                        </Text>
                        
                        {/* Sender Info */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, gap: 8 }}>
                            {giftRequestModal.request?.senderImage && (
                                <Image 
                                    source={{ uri: avatar(giftRequestModal.request.senderImage) }} 
                                    style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#8B5CF6' }}
                                    contentFit="cover"
                                    cachePolicy="memory-disk"
                                />
                            )}
                            <Text style={{ color: '#8B5CF6', fontSize: 18, fontWeight: '800' }}>
                                {giftRequestModal.request?.senderName}
                            </Text>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>
                                wants to send you
                            </Text>
                        </View>

                        {/* Gift Details */}
                        <View style={{ backgroundColor: 'rgba(139,92,246,0.1)', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)' }}>
                            <Text style={{ color: '#8B5CF6', fontSize: 16, fontWeight: '900', marginBottom: 8, textAlign: 'center' }}>
                                {giftRequestModal.request?.item?.name}
                            </Text>
                            <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 12 }}>
                                ₹{giftRequestModal.request?.item?.price}
                            </Text>
                            {giftRequestModal.request?.message && (
                                <>
                                    <View style={{ height: 1, backgroundColor: 'rgba(139,92,246,0.2)', marginBottom: 12 }} />
                                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 6 }}>
                                        MESSAGE
                                    </Text>
                                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 20 }}>
                                        "{giftRequestModal.request.message}"
                                    </Text>
                                </>
                            )}
                        </View>

                        {/* Info Text */}
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', marginBottom: 24, lineHeight: 18 }}>
                            If you accept, {giftRequestModal.request?.senderName?.split(' ')[0]} will be charged ₹{giftRequestModal.request?.item?.price} and the gift will be delivered to you.
                        </Text>

                        {/* Action Buttons */}
                        <View style={{ gap: 12 }}>
                            {/* Accept Button */}
                            <TouchableOpacity
                                style={{ backgroundColor: '#8B5CF6', borderRadius: 18, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                                onPress={async () => {
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                    
                                    if (!giftRequestModal.request) return;
                                    
                                    try {
                                        // Process payment and create order
                                        const payload = {
                                            senderId: giftRequestModal.request.senderId,
                                            receiverId: currentUser?.id,
                                            eventId: giftRequestModal.request.eventId || activeEventId,
                                            items: [{
                                                menuItemId: giftRequestModal.request.item._id,
                                                quantity: 1,
                                                price: giftRequestModal.request.item.price,
                                                name: giftRequestModal.request.item.name
                                            }],
                                            message: giftRequestModal.request.message,
                                            totalAmount: giftRequestModal.request.item.price,
                                            requestId: giftRequestModal.request.requestId
                                        };
                                        
                                        const res = await apiClient.post('/api/v1/drink-requests/send', payload);
                                        
                                        if (res.data.success) {
                                            showToast('Gift accepted! 🎉 Payment processed.', 'success');
                                            
                                            // Notify sender via socket
                                            const currentSocket = useChatStore.getState().socket;
                                            if (currentSocket) {
                                                currentSocket.emit('gift_request_accepted', {
                                                    requestId: giftRequestModal.request.requestId,
                                                    senderId: giftRequestModal.request.senderId,
                                                    receiverId: currentUser?.id
                                                });
                                            }
                                            
                                            removeGiftRequest(giftRequestModal.request.requestId);
                                            setGiftRequestModal({ visible: false, request: null });
                                            refetchAll();
                                        }
                                    } catch (error: any) {
                                        console.error('Gift accept error:', error);
                                        setCustomAlert({ 
                                            visible: true, 
                                            title: 'Payment Failed', 
                                            message: error.response?.data?.message || 'Failed to process payment. Please try again.' 
                                        });
                                    }
                                }}
                            >
                                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '900' }}>Accept Gift</Text>
                            </TouchableOpacity>

                            {/* Decline Button */}
                            <TouchableOpacity
                                style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 18, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    
                                    if (giftRequestModal.request) {
                                        // Notify sender via socket
                                        const currentSocket = useChatStore.getState().socket;
                                        if (currentSocket) {
                                            currentSocket.emit('gift_request_rejected', {
                                                requestId: giftRequestModal.request.requestId,
                                                senderId: giftRequestModal.request.senderId,
                                                receiverId: currentUser?.id
                                            });
                                        }
                                        
                                        removeGiftRequest(giftRequestModal.request.requestId);
                                        showToast('Gift declined', 'info');
                                    }
                                    
                                    setGiftRequestModal({ visible: false, request: null });
                                }}
                            >
                                <Ionicons name="close-circle" size={24} color="rgba(255,255,255,0.5)" />
                                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 17, fontWeight: '900' }}>Decline</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Close Button */}
                        <TouchableOpacity
                            style={{ position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}
                            onPress={() => setGiftRequestModal({ visible: false, request: null })}
                        >
                            <Ionicons name="close" size={20} color="rgba(255,255,255,0.5)" />
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

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
    radarZone: { paddingBottom: 10, paddingTop: 6 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 4 },
    iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    headerCent: { alignItems: 'center' },
    navTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    navSub: { color: '#FFF', fontSize: 13, fontWeight: '800', marginTop: 2 },
    radarVisuals: { height: 110, alignItems: 'center', justifyContent: 'center' },
    pulseRing: { position: 'absolute', width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: '#7c4dff' },
    radarCenter: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(124, 77, 255, 0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(124, 77, 255, 0.4)' },
    crowdBadge: { alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(124, 77, 255, 0.1)', marginBottom: 6 },
    crowdTxt: { color: '#7c4dff', fontSize: 10, fontWeight: '800' },
    toggleWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 },
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
