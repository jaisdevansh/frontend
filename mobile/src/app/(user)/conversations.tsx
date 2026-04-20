import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    Animated, Pressable, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SafeFlashList from '../../components/SafeFlashList';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';

import { useChatStore } from '../../store/chatStore';
import { useAuth } from '../../context/AuthContext';

// Local interfaces
interface Conversation {
    _id: string;
    otherUser: {
        _id: string;
        name: string;
        username?: string;
        profileImage?: string;
    };
    lastMessage: string;
    lastMessageAt: string | null;
    unreadCount: number;
}

interface ChatUser {
    _id: string;
    name: string;
    username?: string;
    profileImage?: string;
}


const C = {
    bg:         '#000000',
    surface:    '#0D0D0D',
    card:       '#111118',
    border:     'rgba(255,255,255,0.07)',
    text:       '#FFFFFF',
    sub:        'rgba(255,255,255,0.55)',
    muted:      'rgba(255,255,255,0.3)',
    accent:     '#2563EB',
    accentGlow: 'rgba(37,99,235,0.2)',
    online:     '#22C55E',
    unread:     '#2563EB',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string | null): string {
    if (!dateStr) return '';
    const d   = new Date(dateStr);
    const now  = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60)     return 'now';
    if (diff < 3600)   return `${Math.floor(diff / 60)}m`;
    if (diff < 86400)  return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function initials(name: string): string {
    return name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() || '')
        .join('');
}

// Avatar colour palette (seeded by name)
const AVATAR_COLORS = ['#7C3AED', '#DB2777', '#D97706', '#059669', '#2563EB', '#DC2626'];
function avatarColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── ConvCard ─────────────────────────────────────────────────────────────────

const ConvCard = React.memo(({
    item, isOnline, onPress,
}: { item: Conversation; isOnline: boolean; onPress: () => void }) => {
    const scale = useRef(new Animated.Value(1)).current;

    const onPressIn  = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 60 }).start();
    const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 30 }).start();

    const ua = item.otherUser;
    const hasUnread = item.unreadCount > 0;
    const bgColor   = avatarColor(ua.name);

    return (
        <Animated.View style={{ transform: [{ scale }] }}>
            <Pressable
                onPress={onPress}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                style={styles.card}
            >
                {/* Avatar */}
                <View style={styles.avatarWrapper}>
                    {ua.profileImage ? (
                        <Image
                            source={{ uri: ua.profileImage }}
                            style={styles.avatarImg}
                            contentFit="cover"
                            transition={200}
                        />
                    ) : (
                        <View style={[styles.avatarImg, { backgroundColor: bgColor, alignItems: 'center', justifyContent: 'center' }]}>
                            <Text style={styles.avatarInitials}>{initials(ua.name)}</Text>
                        </View>
                    )}
                    {isOnline && <View style={styles.onlineDot} />}
                </View>

                {/* Content */}
                <View style={styles.cardContent}>
                    <View style={styles.cardTopRow}>
                        <Text style={[styles.cardName, hasUnread && styles.cardNameBold]} numberOfLines={1}>
                            {ua.name}
                        </Text>
                        <Text style={[styles.cardTime, hasUnread && { color: C.accent }]}>
                            {timeAgo(item.lastMessageAt)}
                        </Text>
                    </View>
                    <View style={styles.cardBotRow}>
                        <Text
                            style={[styles.cardPreview, hasUnread && styles.cardPreviewBold]}
                            numberOfLines={1}
                        >
                            {item.lastMessage || 'Start a conversation'}
                        </Text>
                        {hasUnread && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeTxt}>
                                    {item.unreadCount > 99 ? '99+' : item.unreadCount}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
});

// ─── UserSearchResult ─────────────────────────────────────────────────────────

const UserResult = React.memo(({ user, onPress }: { user: ChatUser; onPress: () => void }) => {
    const bgColor = avatarColor(user.name);
    return (
        <TouchableOpacity style={styles.userResult} onPress={onPress} activeOpacity={0.7}>
            {user.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={styles.userResultAvatar} contentFit="cover" />
            ) : (
                <View style={[styles.userResultAvatar, { backgroundColor: bgColor, alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={styles.avatarInitials}>{initials(user.name)}</Text>
                </View>
            )}
            <View style={{ flex: 1, paddingLeft: 12 }}>
                <Text style={styles.userResultName}>{user.name}</Text>
                {user.username && <Text style={styles.userResultSub}>@{user.username}</Text>}
            </View>
            <Ionicons name="chatbubble-outline" size={18} color={C.accent} />
        </TouchableOpacity>
    );
});

// ─── EmptyState ───────────────────────────────────────────────────────────────

const EmptyState = ({ isSearch = false }: { isSearch?: boolean }) => (
    <View style={styles.empty}>
        <View style={styles.emptyIconWrapper}>
            <View style={styles.emptyGlow} />
            <LinearGradient
                colors={['rgba(37,99,235,0.08)', 'rgba(37,99,235,0.02)']}
                style={styles.emptyIcon}
            >
                <Ionicons name={isSearch ? "search-outline" : "chatbubbles"} size={44} color={C.accent} />
            </LinearGradient>
        </View>
        <Text style={styles.emptyTitle}>{isSearch ? 'No chats found' : 'No conversations yet'}</Text>
        <Text style={styles.emptySub}>
            {isSearch 
                ? 'Try a different name' 
                : 'Inbox is currently empty. Head over to Discovery to connect with people!'}
        </Text>
    </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ConversationsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, token } = useAuth();

    const {
        socket,
        chatPeers,
        peersLoading,
        initSocket,
        fetchPeers,
    } = useChatStore();

    const isConnected = socket?.connected || false;
    const onlineUsers = new Set<string>(); // socket-based online tracking placeholder

    // Map chatPeers (from backend) to Conversation format
    const conversations = React.useMemo(() => chatPeers.map(p => ({
        _id:       p.peerId,
        otherUser: {
            _id:          p.peerId,
            name:         p.peerName,
            profileImage: p.peerImage,
        },
        lastMessage:   p.lastMessage,
        lastMessageAt: p.lastMessageAt,
        unreadCount:   p.unreadCount,
    })), [chatPeers]);

    const conversationsLoading = peersLoading;
    const [searchQuery, setSearchQuery]   = useState('');
    const [refreshing, setRefreshing]     = useState(false);

    // ── Init ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!token || !user?.id) return;
        const userName = user?.name || user?.firstName || 'You';
        const userImage = user?.profileImage;
        initSocket(token, user.id, userName, userImage);
        fetchPeers(); // ← Always fetch fresh list from backend on mount
    }, [token, user?.id]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchPeers();
        setRefreshing(false);
    }, [fetchPeers]);

    // ── Local Search ──────────────────────────────────────────────────────────
    const displayData = React.useMemo(() => {
        if (!searchQuery.trim()) return conversations;
        const q = searchQuery.toLowerCase();
        return conversations.filter(c => c.otherUser.name.toLowerCase().includes(q));
    }, [conversations, searchQuery]);




    const openConversation = useCallback((conv: Conversation) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({
            pathname: '/(user)/chat/[id]',
            params: {
                id:     conv._id,
                name:   conv.otherUser.name,
                avatar: conv.otherUser.profileImage || '',
                userId: conv.otherUser._id,
            },
        });
    }, []);

    // ── Render ────────────────────────────────────────────────────────────────
    const showSearch = searchQuery.length >= 2;

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            {/* ── Header ─────────────────────────────────────────────────── */}
            <BlurView intensity={60} tint="dark" style={[styles.header, { marginTop: 10 }]}>
                <View style={styles.headerTop}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => router.push('/(user)/discover')} style={{ marginRight: 12, padding: 4 }}>
                            <Ionicons name="chevron-back" size={26} color={C.text} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Messages</Text>
                    </View>
                    <View style={[styles.connDot, { backgroundColor: isConnected ? C.online : 'rgba(255,255,255,0.2)' }]} />
                </View>

                {/* Search Bar */}
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={18} color={C.muted} style={{ marginRight: 8 }} />
                    <TextInput
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search your previous chats..."
                        placeholderTextColor={C.muted}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color={C.muted} />
                        </TouchableOpacity>
                    )}
                </View>
            </BlurView>

            {/* ── Body ───────────────────────────────────────────────────── */}
            <SafeFlashList
                data={displayData}
                    keyExtractor={(c: Conversation) => c._id}
                    estimatedItemSize={76}
                    renderItem={({ item }: { item: Conversation }) => (
                        <ConvCard
                            item={item}
                            isOnline={onlineUsers.has(item.otherUser._id)}
                            onPress={() => openConversation(item)}
                        />
                    )}
                ListEmptyComponent={conversationsLoading ? (
                    <View style={styles.loader}>
                        <ActivityIndicator size="large" color={C.accent} />
                    </View>
                ) : <EmptyState isSearch={displayData.length === 0 && searchQuery.length > 0} />}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={C.accent}
                        />
                    }
                ItemSeparatorComponent={() => <View style={styles.sep} />}
            />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.bg },

    // Header
    header: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
        zIndex: 10,
    },
    headerTop: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 14,
    },
    headerTitle: {
        color: C.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5,
    },
    connDot: { width: 8, height: 8, borderRadius: 4 },

    // Search
    searchBar: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#141414',
        borderRadius: 14, paddingHorizontal: 14, height: 44,
        borderWidth: 1, borderColor: C.border,
    },
    searchInput: { flex: 1, color: C.text, fontSize: 15 },

    // List
    listContent: { paddingTop: 6, paddingBottom: 100 },
    sep:         { height: 1, backgroundColor: C.border, marginLeft: 82 },

    // Card
    card: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 14,
        backgroundColor: C.bg,
    },
    avatarWrapper: { position: 'relative', marginRight: 14 },
    avatarImg: { width: 54, height: 54, borderRadius: 27 },
    avatarInitials: { color: '#fff', fontSize: 18, fontWeight: '800' },
    onlineDot: {
        position: 'absolute', bottom: 1, right: 1,
        width: 13, height: 13, borderRadius: 6.5,
        backgroundColor: C.online, borderWidth: 2, borderColor: C.bg,
    },

    cardContent:  { flex: 1 },
    cardTopRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    cardBotRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardName:     { color: C.sub, fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
    cardNameBold: { color: C.text, fontWeight: '800' },
    cardTime:     { color: C.muted, fontSize: 12, fontWeight: '600' },
    cardPreview:  { color: C.muted, fontSize: 14, flex: 1, marginRight: 8 },
    cardPreviewBold: { color: 'rgba(255,255,255,0.7)', fontWeight: '600' },

    badge: {
        backgroundColor: C.unread, borderRadius: 12,
        minWidth: 22, height: 22, paddingHorizontal: 6,
        alignItems: 'center', justifyContent: 'center',
    },
    badgeTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },

    // Search results
    userResult: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: C.border,
    },
    userResultAvatar: { width: 46, height: 46, borderRadius: 23 },
    userResultName:   { color: C.text, fontSize: 15, fontWeight: '700' },
    userResultSub:    { color: C.muted, fontSize: 13, marginTop: 2 },

    // Empty / Loader
    loader:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    empty:      { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
    emptyIconWrapper: { position: 'relative', width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    emptyGlow:  { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: C.accent, opacity: 0.15, transform: [{ scale: 1.5 }] },
    emptyIcon:  {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(37,99,235,0.05)',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(37,99,235,0.1)'
    },
    emptyTitle: { color: C.text,  fontSize: 20, fontWeight: '800', marginBottom: 8, letterSpacing: -0.3 },
    emptySub:   { color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 22, fontWeight: '500' },
});
