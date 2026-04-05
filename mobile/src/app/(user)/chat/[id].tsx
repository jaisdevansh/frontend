import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import SafeFlashList from '../../../components/SafeFlashList';
const FlashList = SafeFlashList;

import { useChatStore } from '../../../store/chatStore';
import { useAuth } from '../../../context/AuthContext';
import { COLORS } from '../../../constants/design-system';
import * as Haptics from 'expo-haptics';

export default function ChatScreen() {
    const router = useRouter();
    const { id: peerId, name: peerName } = useLocalSearchParams<{ id: string, name?: string }>();
    const { user: currentUser, token } = useAuth();
    
    const { 
        initSocket, 
        fetchHistory, 
        sendMessage, 
        sendTyping, 
        messagesByPeer, 
        isTyping 
    } = useChatStore();

    const [inputText, setInputText] = useState('');
    const listRef = useRef<any>(null);

    // Initial setup
    useEffect(() => {
        if (!peerId || !currentUser || !token) return;
        initSocket(token);
        fetchHistory(peerId);
        
        return () => {
            // Unmount cleanup if needed (e.g. mark read)
            useChatStore.getState().markRead(peerId);
        };
    }, [peerId, currentUser, token]);

    const messages = messagesByPeer[peerId as string] || [];
    const peerTyping = isTyping[peerId as string] || false;

    const handleSend = useCallback(() => {
        if (!inputText.trim() || !peerId || !currentUser) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        sendMessage(peerId, inputText.trim(), currentUser.id);
        setInputText('');
    }, [inputText, peerId, currentUser, sendMessage]);

    const handleTextChange = useCallback((text: string) => {
        setInputText(text);
        if (peerId) sendTyping(peerId);
    }, [peerId, sendTyping]);

    const renderMessage = useCallback(({ item }: { item: any }) => {
        const isMe = item.sender === currentUser?.id;
        return (
            <View style={[styles.msgWrapper, isMe ? styles.myMsgWrapper : styles.theirMsgWrapper]}>
                {!isMe && (
                    <View style={styles.theirAvatar}>
                        <Text style={styles.theirAvatarTxt}>{(peerName || 'U')[0]}</Text>
                    </View>
                )}
                <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
                    <Text style={[styles.msgText, isMe ? styles.myMsgText : styles.theirMsgText]}>
                        {item.content}
                    </Text>
                    <View style={styles.msgFooter}>
                        <Text style={[styles.timeTxt, isMe ? styles.myTime : styles.theirTime]}>
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        {isMe && item.status === 'sending' && <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" style={{marginLeft: 4}} />}
                        {isMe && item.status === 'sent' && <Ionicons name="checkmark-done" size={12} color="rgba(255,255,255,0.6)" style={styles.readIcon} />}
                    </View>
                </View>
            </View>
        );
    }, [currentUser?.id, peerName]);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header */}
            <BlurView intensity={80} tint="dark" style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="white" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerName}>{peerName || 'Peer'}</Text>
                    {peerTyping ? (
                        <Text style={styles.typingTxt}>typing...</Text>
                    ) : (
                        <Text style={styles.onlineTxt}>Online on Radar</Text>
                    )}
                </View>
                <TouchableOpacity style={styles.headerAction}>
                    <Ionicons name="ellipsis-vertical" size={20} color="white" />
                </TouchableOpacity>
            </BlurView>

            {/* Chat List */}
            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <View style={styles.listContainer}>
                    <FlashList
                        ref={listRef}
                        data={messages}
                        keyExtractor={(item: any) => item._id || item.tempId}
                        renderItem={renderMessage}
                        inverted // extremely scalable rendering from bottom up
                        estimatedItemSize={70}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />
                </View>

                {/* Input Area */}
                <View style={styles.inputArea}>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            value={inputText}
                            onChangeText={handleTextChange}
                            placeholder="Type a message..."
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            multiline
                            maxLength={500}
                        />
                        <TouchableOpacity 
                            style={[styles.sendBtn, !inputText.trim() && { opacity: 0.4 }]} 
                            onPress={handleSend}
                            disabled={!inputText.trim()}
                        >
                            <Ionicons name="send" size={18} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background.dark },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
        zIndex: 10
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerInfo: { flex: 1, paddingHorizontal: 12 },
    headerName: { color: 'white', fontSize: 16, fontWeight: '800' },
    typingTxt: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
    onlineTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' },
    headerAction: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

    listContainer: { flex: 1 },
    listContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 },

    msgWrapper: { flexDirection: 'row', marginBottom: 12, width: '100%' },
    myMsgWrapper: { justifyContent: 'flex-end' },
    theirMsgWrapper: { justifyContent: 'flex-start', alignItems: 'flex-end' },

    theirAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(124, 77, 255, 0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 8, marginBottom: 4 },
    theirAvatarTxt: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },

    bubble: { maxWidth: '75%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
    myBubble: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
    theirBubble: { backgroundColor: '#1A1D29', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },

    msgText: { fontSize: 15, lineHeight: 20 },
    myMsgText: { color: 'white' },
    theirMsgText: { color: 'rgba(255,255,255,0.9)' },

    msgFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 },
    timeTxt: { fontSize: 10, fontWeight: '600' },
    myTime: { color: 'rgba(255,255,255,0.6)' },
    theirTime: { color: 'rgba(255,255,255,0.3)' },
    readIcon: { marginLeft: 4 },

    inputArea: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.background.dark, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    inputContainer: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#161825', borderRadius: 24, paddingLeft: 16, paddingRight: 6, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    input: { flex: 1, color: 'white', fontSize: 15, maxHeight: 100, paddingTop: 10, paddingBottom: 10 },
    sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});
