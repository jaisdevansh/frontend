import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, Animated,
    ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import SafeFlashList from '../../../components/SafeFlashList';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';

import { useChatStore } from '../../../store/chatStore';
import { useAuth } from '../../../context/AuthContext';

// Define ChatMessage type for compatibility
interface ChatMessage {
    _id: string;
    text: string;
    senderId: string;
    createdAt: string;
    status?: string;
}

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
    bg:      '#000000',
    surface: '#0D0D0D',
    card:    '#111118',
    border:  'rgba(255,255,255,0.06)',
    text:    '#FFFFFF',
    sub:     'rgba(255,255,255,0.55)',
    muted:   'rgba(255,255,255,0.3)',
    accent:  '#2563EB',
    myBub:   '#2563EB',
    theirBub:'#19191F',
    online:  '#22C55E',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDateSep(dateStr: string): string {
    const d   = new Date(dateStr);
    const now  = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function avatarColor(name: string): string {
    const palette = ['#7C3AED', '#DB2777', '#D97706', '#059669', '#2563EB', '#DC2626'];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return palette[Math.abs(h) % palette.length];
}

function initials(name: string): string {
    return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('');
}

// ─── Status tick icon ─────────────────────────────────────────────────────────
const StatusIcon = ({ status }: { status?: string }) => {
    if (!status || status === 'sending') {
        return <ActivityIndicator size={10} color="rgba(255,255,255,0.4)" style={{ marginLeft: 4 }} />;
    }
    if (status === 'failed') {
        return <Ionicons name="alert-circle" size={12} color="#EF4444" style={{ marginLeft: 4 }} />;
    }
    if (status === 'seen') {
        return <Ionicons name="checkmark-done" size={13} color={C.online} style={{ marginLeft: 4 }} />;
    }
    if (status === 'delivered') {
        return <Ionicons name="checkmark-done" size={13} color="rgba(255,255,255,0.5)" style={{ marginLeft: 4 }} />;
    }
    // sent
    return <Ionicons name="checkmark" size={13} color="rgba(255,255,255,0.5)" style={{ marginLeft: 4 }} />;
};

// ─── Date separator ───────────────────────────────────────────────────────────
const DateSep = ({ label }: { label: string }) => (
    <View style={styles.dateSepRow}>
        <View style={styles.dateSepLine} />
        <BlurView intensity={40} tint="dark" style={styles.dateSepPill}>
            <Text style={styles.dateSepTxt}>{label}</Text>
        </BlurView>
        <View style={styles.dateSepLine} />
    </View>
);

// ─── Typing indicator ─────────────────────────────────────────────────────────
const TypingIndicator = ({ name, avatar }: { name: string; avatar?: string }) => {
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const bounce = (dot: Animated.Value, delay: number) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(dot, { toValue: -5, duration: 250, useNativeDriver: true }),
                    Animated.timing(dot, { toValue: 0,  duration: 250, useNativeDriver: true }),
                    Animated.delay(600),
                ])
            ).start();
        bounce(dot1, 0);
        bounce(dot2, 150);
        bounce(dot3, 300);
    }, []);

    return (
        <View style={styles.typingRow}>
            <View style={[styles.theirBubble, styles.typingBubble]}>
                {([dot1, dot2, dot3] as Animated.Value[]).map((dot, i) => (
                    <Animated.View
                        key={i}
                        style={[styles.typingDot, { transform: [{ translateY: dot }] }]}
                    />
                ))}
            </View>
            <Text style={styles.typingLabel}>{name} is typing…</Text>
        </View>
    );
};

// ─── Message bubble ───────────────────────────────────────────────────────────
const MessageBubble = React.memo(({
    msg, isMe, peerName, peerAvatar, showAvatar,
}: {
    msg: ChatMessage;
    isMe: boolean;
    peerName: string;
    peerAvatar?: string;
    showAvatar: boolean;
}) => {
    const scale = useRef(new Animated.Value(0.92)).current;

    useEffect(() => {
        Animated.spring(scale, {
            toValue: 1,
            damping: 14,
            stiffness: 200,
            useNativeDriver: true,
        }).start();
    }, []);

    const bgColor = avatarColor(peerName);

    return (
        <Animated.View style={[styles.msgRow, isMe ? styles.myRow : styles.theirRow, { transform: [{ scale }] }]}>
            {/* Their avatar */}
            {!isMe && (
                <View style={styles.theirAvatarSlot}>
                    {showAvatar ? (
                        peerAvatar ? (
                            <Image source={{ uri: peerAvatar }} style={styles.theirAvatar} contentFit="cover" />
                        ) : (
                            <View style={[styles.theirAvatar, { backgroundColor: bgColor, alignItems: 'center', justifyContent: 'center' }]}>
                                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{initials(peerName)}</Text>
                            </View>
                        )
                    ) : (
                        <View style={styles.theirAvatar} />
                    )}
                </View>
            )}

            {/* Bubble */}
            <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
                {isMe && (
                    <View style={[StyleSheet.absoluteFill, { borderRadius: 18, overflow: 'hidden' }]}>
                        <LinearGradient
                            colors={['#3B82F6', '#1D4ED8']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                    </View>
                )}
                <Text style={[styles.msgText, isMe ? styles.myText : styles.theirText]}>
                    {msg.text}
                </Text>
                <View style={styles.msgFooter}>
                    <Text style={[styles.timeText, isMe ? styles.myTime : styles.theirTime]}>
                        {fmtTime(msg.createdAt)}
                    </Text>
                    {isMe && <StatusIcon status={msg.status} />}
                </View>
            </View>
        </Animated.View>
    );
});

// ─── Main Chat Screen ─────────────────────────────────────────────────────────
export default function ChatScreen() {
    const router = useRouter();
    const { id: convId, name: peerName, avatar: peerAvatar, userId: peerId } =
        useLocalSearchParams<{ id: string; name?: string; avatar?: string; userId?: string }>();
    const { user: me, token } = useAuth();

    const myId = me?._id || me?.id || (me as any)?.userId;

    const {
        socket,
        messagesByPeer,
        isTyping,
        initSocket,
        fetchHistory,
        sendMessage,
        sendTyping,
        markRead,
    } = useChatStore();

    const messages = useMemo(() => {
        const msgs = messagesByPeer[peerId || convId] || [];
        return msgs;
    }, [messagesByPeer, peerId, convId]);
    
    // Get user info from messages if not provided in params
    const actualPeerName = useMemo(() => {
        if (peerName && peerName !== 'undefined') return peerName;
        
        // Try to get name from messages
        const lastMessage = messages[messages.length - 1];
        if (lastMessage) {
            const isMyMessage = lastMessage.sender === myId;
            return isMyMessage ? lastMessage.receiverName : lastMessage.senderName;
        }
        return 'User';
    }, [peerName, messages, myId]);
    
    const actualPeerAvatar = useMemo(() => {
        if (peerAvatar && peerAvatar !== 'undefined' && peerAvatar !== '') return peerAvatar;
        
        // Try to get avatar from messages
        const lastMessage = messages[messages.length - 1];
        if (lastMessage) {
            const isMyMessage = lastMessage.sender === myId;
            return isMyMessage ? lastMessage.receiverImage : lastMessage.senderImage;
        }
        return undefined;
    }, [peerAvatar, messages, myId]);
    const isUserTyping = isTyping[peerId || convId] || false;

    const [inputText, setInputText]   = useState('');
    const listRef                     = useRef<any>(null);
    const typingTimer                 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const isTypingLocal               = useRef(false);
    const headerScale                 = useRef(new Animated.Value(1)).current;

    // ── Init ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!token || !myId || !peerId) {
            return;
        }
        
        const userName = me?.name || me?.firstName || 'You';
        const userImage = me?.profileImage;
        initSocket(token, myId, userName, userImage);
        fetchHistory(peerId);
    }, [peerId, token, myId]);

    // ── Auto-scroll helpers ───────────────────────────────────────────────────
    const scrollToBottom = useCallback((animated = true) => {
        // FlashList: use scrollToOffset with huge value as reliable "scroll to end"
        listRef.current?.scrollToOffset?.({ offset: 999999, animated });
        // Fallback for FlatList/ScrollView
        listRef.current?.scrollToEnd?.({ animated });
    }, []);

    // ── Auto-scroll on new message ────────────────────────────────────────────
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => scrollToBottom(true), 150);
        }
    }, [messages.length]);

    // ── Mark read when messages load ─────────────────────────────────────────
    useEffect(() => {
        if (messages.length > 0 && peerId) {
            markRead(peerId);
        }
    }, [messages.length, peerId]);

    // ── Send ──────────────────────────────────────────────────────────────────
    const handleSend = useCallback(() => {
        if (!inputText.trim() || !peerId || !myId) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Get current user info
        const currentUserName = me?.name || me?.firstName || 'You';
        const currentUserImage = me?.profileImage;

        sendMessage(peerId, inputText.trim(), myId, currentUserName, currentUserImage);
        setInputText('');

        // Stop typing indicator
        handleTypingStop();
    }, [inputText, peerId, myId, sendMessage, me]);

    // ── Typing ────────────────────────────────────────────────────────────────
    const handleTypingStart = useCallback(() => {
        if (!isTypingLocal.current && peerId) {
            isTypingLocal.current = true;
            sendTyping(peerId);
        }
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(handleTypingStop, 3000);
    }, [peerId, sendTyping]);

    const handleTypingStop = useCallback(() => {
        if (isTypingLocal.current) {
            isTypingLocal.current = false;
            // Note: useChatStore doesn't have sendTypingStop, typing auto-expires
        }
        clearTimeout(typingTimer.current);
    }, []);

    const handleTextChange = useCallback((text: string) => {
        setInputText(text);
        if (text.trim()) handleTypingStart();
        else handleTypingStop();
    }, [handleTypingStart, handleTypingStop]);

    // ── Render message ────────────────────────────────────────────────────────
    const renderMessage = useCallback(({ item, index }: { item: any; index: number }) => {
        const isMe = item.sender === myId;
        const prev = messages[index - 1];
        const next = messages[index + 1];

        // Date separator
        const showDateSep = !prev ||
            new Date(prev.createdAt || '').toDateString() !== new Date(item.createdAt || '').toDateString();

        // Only show avatar for last message in a sequence from the same sender
        const showAvatar = !isMe && (!next || next.sender !== item.sender);

        const messageText = item.content || item.text || '';
        if (!messageText.trim() && item.type !== 'image' && item.type !== 'video') {
            return null; // Skip rendering empty non-media messages
        }

        return (
            <View>
                {showDateSep && <DateSep label={fmtDateSep(item.createdAt || '')} />}
                <MessageBubble
                    msg={{
                        ...item,
                        text:      messageText,
                        senderId:  item.sender,
                        createdAt: item.createdAt || new Date().toISOString()
                    }}
                    isMe={isMe}
                    peerName={actualPeerName || item.senderName || 'User'}
                    peerAvatar={actualPeerAvatar || item.senderImage}
                    showAvatar={showAvatar}
                />
            </View>
        );
    }, [messages, myId, peerName, peerAvatar]);

    return (
        <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
            {/* ─── Header ────────────────────────────────────────────────── */}
            <BlurView intensity={80} tint="dark" style={styles.header}>
                {/* Back */}
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
                    <Ionicons name="chevron-back" size={26} color={C.text} />
                </TouchableOpacity>

                {/* Avatar + name */}
                <TouchableOpacity style={styles.headerCenter} activeOpacity={0.8}>
                    <View style={styles.headerAvatarWrap}>
                        {actualPeerAvatar ? (
                            <Image source={{ uri: actualPeerAvatar }} style={styles.headerAvatar} contentFit="cover" />
                        ) : (
                            <View style={[styles.headerAvatar, {
                                backgroundColor: avatarColor(actualPeerName || 'U'),
                                alignItems: 'center', justifyContent: 'center',
                            }]}>
                                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
                                    {initials(actualPeerName || 'U')}
                                </Text>
                            </View>
                        )}
                    </View>
                    <View>
                        <Text style={styles.headerName} numberOfLines={1}>{actualPeerName || 'Chat'}</Text>
                        <Text style={[styles.headerStatus]}>
                            {isUserTyping ? 'typing…' : 'Online'}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* Actions */}
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.headerBtn}>
                        <Ionicons name="ellipsis-vertical" size={20} color={C.sub} />
                    </TouchableOpacity>
                </View>
            </BlurView>

            {/* ─── Messages ──────────────────────────────────────────────── */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                {messages.length === 0 ? (
                    <View style={styles.emptyChat}>
                        <View style={styles.emptyChatIcon}>
                            <Ionicons name="chatbubbles-outline" size={40} color={C.muted} />
                        </View>
                        <Text style={styles.emptyChatTxt}>Send a message to start chatting</Text>
                    </View>
                ) : (
                    <SafeFlashList
                        ref={listRef}
                        data={messages}
                        keyExtractor={(m: any) => m._id || m.tempId || `${m.sender}_${m.createdAt}`}
                        estimatedItemSize={72}
                        renderItem={({ item, index }: { item: any; index: number }) => renderMessage({ item, index })}
                        contentContainerStyle={styles.listInner}
                        showsVerticalScrollIndicator={false}
                        onContentSizeChange={() => scrollToBottom(false)}
                        ListFooterComponent={
                            isUserTyping ? (
                                <TypingIndicator name={actualPeerName || 'User'} avatar={actualPeerAvatar} />
                            ) : null
                        }
                    />
                )}

                {/* ─── Input Bar ─────────────────────────────────────────── */}
                <View style={styles.inputBar}>
                    {/* Attach */}
                    <TouchableOpacity style={styles.attachBtn}>
                        <Ionicons name="add-circle-outline" size={26} color={C.sub} />
                    </TouchableOpacity>

                    {/* Text input */}
                    <View style={styles.inputWrap}>
                        <TextInput
                            style={styles.input}
                            value={inputText}
                            onChangeText={handleTextChange}
                            placeholder="Message…"
                            placeholderTextColor={C.muted}
                            multiline
                            maxLength={2000}
                            returnKeyType="default"
                        />
                    </View>

                    {/* Send */}
                    <Animated.View style={{ transform: [{ scale: headerScale }] }}>
                        <TouchableOpacity
                            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
                            onPress={handleSend}
                            disabled={!inputText.trim()}
                            activeOpacity={0.8}
                        >
                            {inputText.trim() ? (
                                <View style={[StyleSheet.absoluteFill, { borderRadius: 22, overflow: 'hidden' }]}>
                                    <LinearGradient
                                        colors={['#3B82F6', '#1D4ED8']}
                                        style={StyleSheet.absoluteFill}
                                    />
                                </View>
                            ) : null}
                            <Ionicons
                                name={inputText.trim() ? 'send' : 'mic-outline'}
                                size={18}
                                color={inputText.trim() ? '#fff' : C.muted}
                            />
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.bg },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 8, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: C.border, zIndex: 10,
    },
    backBtn:       { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    headerCenter:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerAvatarWrap: { position: 'relative' },
    headerAvatar:  { width: 40, height: 40, borderRadius: 20 },
    headerOnlineDot: {
        position: 'absolute', bottom: 0, right: 0,
        width: 11, height: 11, borderRadius: 5.5,
        backgroundColor: C.online, borderWidth: 2, borderColor: C.bg,
    },
    headerName:    { color: C.text, fontSize: 15, fontWeight: '800' },
    headerStatus:  { color: C.muted, fontSize: 12, fontWeight: '600', marginTop: 1 },
    headerActions: { flexDirection: 'row' },
    headerBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

    // Messages list
    listInner:     { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 8 },
    loadingState:  { flex: 1, alignItems: 'center', justifyContent: 'center' },

    // Message rows
    msgRow:        { flexDirection: 'row', marginBottom: 3 },
    myRow:         { justifyContent: 'flex-end' },
    theirRow:      { justifyContent: 'flex-start', alignItems: 'flex-end' },

    // Their avatar
    theirAvatarSlot: { width: 32, marginRight: 6, alignItems: 'center', justifyContent: 'flex-end' },
    theirAvatar:   { width: 28, height: 28, borderRadius: 14 },

    // Bubbles
    bubble: {
        maxWidth: '76%', paddingHorizontal: 14, paddingVertical: 10,
        borderRadius: 18, overflow: 'hidden',
    },
    myBubble: {
        backgroundColor: C.myBub,
        borderBottomRightRadius: 4,
    },
    theirBubble: {
        backgroundColor: C.theirBub,
        borderBottomLeftRadius: 4,
        borderWidth: 1, borderColor: C.border,
    },
    msgText:   { fontSize: 15, lineHeight: 21 },
    myText:    { color: '#fff' },
    theirText: { color: 'rgba(255,255,255,0.92)' },
    msgFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 },
    timeText:  { fontSize: 10, fontWeight: '600' },
    myTime:    { color: 'rgba(255,255,255,0.55)' },
    theirTime: { color: 'rgba(255,255,255,0.28)' },

    // Date separator
    dateSepRow:  { flexDirection: 'row', alignItems: 'center', marginVertical: 16, paddingHorizontal: 8 },
    dateSepLine: { flex: 1, height: 1, backgroundColor: C.border },
    dateSepPill: {
        marginHorizontal: 10, paddingHorizontal: 12, paddingVertical: 4,
        borderRadius: 12, overflow: 'hidden',
        borderWidth: 1, borderColor: C.border,
    },
    dateSepTxt:  { color: C.muted, fontSize: 12, fontWeight: '600' },

    // Typing indicator
    typingRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
    typingBubble:{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', gap: 5 },
    typingDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: C.muted },
    typingLabel: { color: C.muted, fontSize: 12 },

    // Empty chat
    emptyChat:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyChatIcon: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.04)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    emptyChatTxt:  { color: C.muted, fontSize: 15 },

    // Input bar
    inputBar: {
        flexDirection: 'row', alignItems: 'flex-end',
        paddingHorizontal: 10, paddingVertical: 10,
        backgroundColor: C.bg,
        borderTopWidth: 1, borderTopColor: C.border,
        gap: 8,
    },
    attachBtn:    { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
    inputWrap: {
        flex: 1, backgroundColor: '#141414',
        borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
        borderWidth: 1, borderColor: C.border, minHeight: 44,
        justifyContent: 'center',
    },
    input: { color: C.text, fontSize: 15, maxHeight: 120 },
    sendBtn: {
        width: 44, height: 44, borderRadius: 22,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'transparent', overflow: 'hidden',
        marginBottom: 0,
    },
    sendBtnDisabled: { backgroundColor: '#141414' },
});
