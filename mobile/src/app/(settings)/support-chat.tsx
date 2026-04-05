import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, TouchableWithoutFeedback, Keyboard, Dimensions, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStrictBack } from '../../hooks/useStrictBack';
import { Ionicons } from '@expo/vector-icons';
import SafeFlashList from '../../components/SafeFlashList';

// Safe Alias for optimization
const FlashList = SafeFlashList;
import { COLORS } from '../../constants/design-system';
import { useSupportStore } from '../../store/supportStore';
import { useToast } from '../../context/ToastContext';
import { useAlert } from '../../context/AlertProvider';

const { width } = Dimensions.get('window');

export default function SupportChat() {
    const router = useRouter();
    const goBack = useStrictBack('/');
    const insets = useSafeAreaInsets();
    const { showToast } = useToast();
    const { showAlert } = useAlert();
    const [input, setInput] = useState('');
    const flatListRef = useRef<any>(null);

    const { 
        messages, loading, 
        fetchHistory, sendMessage, clearChat 
    } = useSupportStore();

    useEffect(() => {
        fetchHistory();
    }, []);

    const handleSend = async () => {
        if (!input.trim() || loading) return;
        const currentInput = input;
        setInput('');
        try {
            await sendMessage(currentInput);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        } catch (e: any) {
            showToast(e.response?.data?.message || 'Failed to get response', 'error');
            setInput(currentInput); // Restore on failure
        }
    };

    const handleClearChat = () => {
        showAlert(
            "Clear Chat",
            "Are you sure you want to delete the entire chat history?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear All",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await clearChat();
                            showToast("Chat history cleared", "success");
                        } catch (error) {
                            showToast("Failed to clear chat", "error");
                        }
                    }
                }
            ]
        );
    };

    const renderItem = useCallback(({ item: msg }: any) => (
        <View style={[styles.messageRow, msg.role === 'user' ? styles.userRow : styles.aiRow]}>
            {msg.role === 'ai' && (
                <View style={styles.aiAvatar}>
                    <Ionicons name="sparkles" size={14} color="white" />
                </View>
            )}
            <TouchableOpacity activeOpacity={0.8} style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                <Text style={[styles.messageText, msg.role === 'ai' && styles.aiMessageText]}>{msg.content}</Text>
            </TouchableOpacity>
        </View>
    ), []);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" />
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={{ flex: 1 }}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={goBack} style={styles.backBtn}><Ionicons name="chevron-back" size={28} color="#FFFFFF" /></TouchableOpacity>
                        <View style={styles.headerInfo}>
                            <Text style={styles.headerTitle}>AI Concierge</Text>
                            <View style={styles.onlineBadge}><View style={styles.onlineDot} /><Text style={styles.onlineText}>Elite Support Online</Text></View>
                        </View>
                        <TouchableOpacity onPress={handleClearChat} style={styles.clearBtn}><Ionicons name="trash-outline" size={22} color="rgba(255,255,255,0.4)" /></TouchableOpacity>
                    </View>

                    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
                        <FlashList
                            ref={flatListRef}
                            data={messages}
                            keyExtractor={(item: any) => item._id}
                            renderItem={renderItem}
                            estimatedItemSize={80}
                            contentContainerStyle={styles.chatContent}
                            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                            ListHeaderComponent={() => (
                                <View style={styles.welcomeInfo}>
                                    <View style={styles.iconBox}><Ionicons name="sparkles" size={40} color="white" /></View>
                                    <Text style={styles.welcomeTitle}>Elite AI Assistant</Text>
                                    <Text style={styles.welcomeSubtitle}>How can I elevate your experience? Ask about bookings, events, or venue details.</Text>
                                </View>
                            )}
                            ListFooterComponent={() => loading ? (
                                <View style={styles.aiRow}>
                                    <View style={styles.aiAvatar}><ActivityIndicator size="small" color="white" /></View>
                                    <View style={[styles.bubble, styles.aiBubble, { minWidth: 60 }]}><Text style={styles.typingText}>Thinking...</Text></View>
                                </View>
                            ) : null}
                        />

                        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                            <View style={styles.inputWrapper}>
                                <TextInput style={styles.input} placeholder="Type your question..." placeholderTextColor="rgba(255,255,255,0.3)" value={input} onChangeText={setInput} multiline />
                                <TouchableOpacity style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]} onPress={handleSend} disabled={!input.trim() || loading}><Ionicons name="arrow-up" size={24} color="#000000" /></TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background.dark },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 20, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    headerInfo: { flex: 1, marginLeft: 12 },
    headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
    onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.emerald, borderWidth: 2, borderColor: 'rgba(16, 185, 129, 0.2)' },
    onlineText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' },
    clearBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    chatContent: { padding: 16, paddingTop: 20, paddingBottom: 40 },
    welcomeInfo: { alignItems: 'center', marginVertical: 40, paddingHorizontal: 20 },
    iconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 20, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
    welcomeTitle: { color: 'white', fontSize: 24, fontWeight: '900', textAlign: 'center' },
    welcomeSubtitle: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 12, lineHeight: 22, fontSize: 14 },
    messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 20 },
    userRow: { justifyContent: 'flex-end' },
    aiRow: { justifyContent: 'flex-start' },
    aiAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    bubble: { maxWidth: '80%', padding: 16, borderRadius: 24 },
    userBubble: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
    aiBubble: { backgroundColor: 'rgba(255,255,255,0.06)', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    messageText: { color: '#FFFFFF', fontSize: 16, lineHeight: 24, fontWeight: '500' },
    aiMessageText: { color: 'rgba(255,255,255,0.9)' },
    typingText: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontStyle: 'italic' },
    inputContainer: { paddingHorizontal: 16, paddingTop: 16, backgroundColor: COLORS.background.dark },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 30, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    input: { flex: 1, color: '#FFFFFF', fontSize: 16, maxHeight: 120, paddingTop: 0, paddingBottom: 0 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
    sendBtnDisabled: { opacity: 0.3, backgroundColor: 'rgba(255,255,255,0.1)' }
});
