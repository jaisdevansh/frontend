import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ActivityIndicator, TouchableWithoutFeedback,
    Keyboard, Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStrictBack } from '../../hooks/useStrictBack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/design-system';
import { hostService } from '../../services/hostService';
import { useToast } from '../../context/ToastContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { ADMIN_API_BASE_URL } from '../../services/apiClient';
import { io, Socket } from 'socket.io-client';

const { width } = Dimensions.get('window');

export default function HostAdminChat() {
    const goBack = useStrictBack('/(host)/support');
    const insets = useSafeAreaInsets();
    const { showToast } = useToast();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const flatListRef = useRef<FlatList<any>>(null);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        loadChat();
        connectSocket();
        return () => {
            socketRef.current?.disconnect();
        };
    }, []);

    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages]);

    const loadChat = async () => {
        try {
            const res = await hostService.getAdminChat();
            if (res.success) {
                setMessages(res.data.messages || []);
            }
        } catch {
            showToast('Could not load chat history', 'error');
        } finally {
            setLoading(false);
        }
    };

    const connectSocket = async () => {
        const token = await AsyncStorage.getItem('auth_token');
        const wsUrl = ADMIN_API_BASE_URL;
        const isProd = wsUrl.includes('/api2');
        const socketOrigin = isProd ? wsUrl.replace('/api2', '') : wsUrl;
        const socketPath = isProd ? '/api2/socket.io' : '/socket.io';

        const socket = io(socketOrigin, { path: socketPath, auth: { token } });
        socketRef.current = socket;

        socket.on('adminReply', ({ message: newMsg }: any) => {
            setMessages(prev => [...prev, newMsg]);
        });
    };

    const handleSend = async () => {
        if (!message.trim() || sending) return;
        const content = message.trim();
        setMessage('');
        setSending(true);

        // Optimistic update
        const tempMsg = {
            _id: `temp_${Date.now()}`,
            sender: 'host',
            content,
            createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempMsg]);

        try {
            const res = await hostService.sendAdminMessage(content);
            if (res.success) {
                // Replace temp with server msg
                setMessages(prev => prev.map(m => m._id === tempMsg._id ? res.data : m));
            }
        } catch {
            showToast('Failed to send message', 'error');
            setMessages(prev => prev.filter(m => m._id !== tempMsg._id));
        } finally {
            setSending(false);
        }
    };

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const renderMessage = ({ item: msg }: any) => {
        const isHost = msg.sender === 'host';
        return (
            <View style={[styles.messageRow, isHost ? styles.hostRow : styles.adminRow]}>
                {!isHost && (
                    <View style={styles.adminAvatar}>
                        <Ionicons name="shield-checkmark" size={14} color="white" />
                    </View>
                )}
                <View style={[styles.bubble, isHost ? styles.hostBubble : styles.adminBubble]}>
                    {!isHost && (
                        <Text style={styles.senderLabel}>Support Admin</Text>
                    )}
                    <Text style={styles.messageText}>{msg.content}</Text>
                    <Text style={styles.timeText}>
                        {msg.createdAt ? formatTime(msg.createdAt) : ''}
                        {isHost && (
                            <Text style={styles.sentTick}>  ✓</Text>
                        )}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={{ flex: 1 }}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => goBack()} style={styles.backBtn}>
                            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
                        </TouchableOpacity>
                        <View style={styles.adminAvatarLarge}>
                            <Ionicons name="shield-checkmark" size={22} color="white" />
                        </View>
                        <View style={styles.headerInfo}>
                            <Text style={styles.headerTitle}>Support Admin</Text>
                            <View style={styles.onlineBadge}>
                                <View style={styles.onlineDot} />
                                <Text style={styles.onlineText}>Entry Club Support</Text>
                            </View>
                        </View>
                    </View>

                    <KeyboardAvoidingView
                        style={{ flex: 1 }}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 100}
                    >
                        {loading ? (
                            <View style={styles.loadingWrap}>
                                <ActivityIndicator size="large" color={COLORS.primary} />
                            </View>
                        ) : (
                            <FlatList
                                ref={flatListRef}
                                data={messages}
                                keyExtractor={(item, i) => item._id?.toString() || i.toString()}
                                style={styles.chatArea}
                                contentContainerStyle={[styles.chatContent, { paddingBottom: 40 }]}
                                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                                renderItem={renderMessage}
                                ListHeaderComponent={() => messages.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <View style={styles.emptyIconBox}>
                                            <Ionicons name="headset" size={40} color="white" />
                                        </View>
                                        <Text style={styles.emptyTitle}>Chat with Admin</Text>
                                        <Text style={styles.emptySubtitle}>
                                            Send a message to the Entry Club support team. We typically reply within a few hours.
                                        </Text>
                                    </View>
                                ) : null}
                            />
                        )}

                        {/* Input Bar */}
                        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Type a message..."
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                    value={message}
                                    onChangeText={setMessage}
                                    onFocus={() => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 300)}
                                    multiline
                                    maxLength={1000}
                                />
                                <TouchableOpacity
                                    style={[styles.sendBtn, (!message.trim() || sending) && styles.sendBtnDisabled]}
                                    onPress={handleSend}
                                    disabled={!message.trim() || sending}
                                >
                                    {sending
                                        ? <ActivityIndicator size="small" color="#000" />
                                        : <Ionicons name="arrow-up" size={22} color="#000000" />
                                    }
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#080810' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
        gap: 12,
    },
    backBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.06)',
        justifyContent: 'center', alignItems: 'center',
    },
    adminAvatarLarge: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: COLORS.primary,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
    },
    headerInfo: { flex: 1 },
    headerTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
    onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.emerald, borderWidth: 2, borderColor: 'rgba(16,185,129,0.2)' },
    onlineText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' },
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    chatArea: { flex: 1 },
    chatContent: { padding: 16, gap: 12 },

    // Empty State
    emptyState: { alignItems: 'center', marginVertical: 60, paddingHorizontal: 24 },
    emptyIconBox: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: COLORS.primary,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
        shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
    },
    emptyTitle: { color: 'white', fontSize: 22, fontWeight: '900', textAlign: 'center' },
    emptySubtitle: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 12, lineHeight: 22, fontSize: 14 },

    // Messages
    messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginVertical: 4 },
    hostRow: { justifyContent: 'flex-end' },
    adminRow: { justifyContent: 'flex-start' },
    adminAvatar: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: COLORS.primary,
        alignItems: 'center', justifyContent: 'center', marginBottom: 4,
    },
    bubble: { maxWidth: '78%', padding: 14, borderRadius: 20 },
    hostBubble: {
        backgroundColor: COLORS.primary,
        borderBottomRightRadius: 4,
    },
    adminBubble: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    senderLabel: { color: COLORS.primary, fontSize: 11, fontWeight: '800', marginBottom: 4, letterSpacing: 0.5 },
    messageText: { color: '#FFFFFF', fontSize: 15, lineHeight: 22, fontWeight: '500' },
    timeText: { color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 6, textAlign: 'right' },
    sentTick: { color: 'rgba(255,255,255,0.5)' },

    // Input
    inputContainer: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#080810', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 30,
        paddingHorizontal: 16, paddingVertical: 10,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    input: { flex: 1, color: '#FFFFFF', fontSize: 16, maxHeight: 120, paddingTop: 0, paddingBottom: 0 },
    sendBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#FFFFFF',
        alignItems: 'center', justifyContent: 'center', marginLeft: 8,
    },
    sendBtnDisabled: { opacity: 0.3, backgroundColor: 'rgba(255,255,255,0.1)' },
});
