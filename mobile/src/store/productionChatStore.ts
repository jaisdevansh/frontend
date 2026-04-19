/**
 * productionChatStore.ts
 * ──────────────────────
 * Zustand store wired to:
 *   REST  → /api/chat/*  (new production backend)
 *   WS    → socket events: message:new, message:seen, message:delivered, user:typing, user:online/offline
 *
 * Keeps the legacy chatStore untouched (radar chat still works).
 */
import { create }    from 'zustand';
import { io, Socket } from 'socket.io-client';
import apiClient, { ADMIN_API_BASE_URL } from '../services/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatUser {
    _id: string;
    name: string;
    username?: string;
    profileImage?: string;
}

export interface ChatMessage {
    _id: string;
    conversationId: string;
    senderId: string;
    text: string;
    type: 'text' | 'image' | 'video';
    mediaUrl?: string | null;
    createdAt: string;
    deliveredAt?: string | null;
    seenAt?: string | null;
    // optimistic UI
    tempId?: string;
    status?: 'sending' | 'sent' | 'delivered' | 'seen' | 'failed';
}

export interface Conversation {
    _id: string;
    otherUser: ChatUser;
    lastMessage: string;
    lastMessageAt: string | null;
    lastMessageSenderId?: string;
    unreadCount: number;
    updatedAt: string;
}

interface ProductionChatState {
    // ── Socket ────────────────────────────────────────────────────────────────
    socket: Socket | null;
    isConnected: boolean;

    // ── Data ──────────────────────────────────────────────────────────────────
    conversations: Conversation[];
    conversationsLoading: boolean;
    
    messagesByConv: Record<string, ChatMessage[]>;
    messagesLoading: Record<string, boolean>;
    hasMoreMessages: Record<string, boolean>;
    nextCursor: Record<string, string | null>;

    typingByConv: Record<string, boolean>;   // convId → isTyping
    onlineUsers: Set<string>;                // Set of userId strings

    // ── Actions ───────────────────────────────────────────────────────────────
    initSocket: (token: string) => void;
    disconnect: () => void;

    fetchConversations: () => Promise<void>;
    createConversation: (userId: string) => Promise<string | null>; // returns convId

    fetchMessages: (convId: string, loadMore?: boolean) => Promise<void>;
    sendMessage: (convId: string, text: string, senderId: string, tempId: string) => void;
    markRead: (convId: string, lastMessageId: string) => void;

    joinConversation: (convId: string) => void;
    leaveConversation: (convId: string) => void;
    sendTypingStart: (convId: string) => void;
    sendTypingStop: (convId: string) => void;

    searchUsers: (q: string) => Promise<ChatUser[]>;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useProductionChatStore = create<ProductionChatState>((set, get) => ({
    socket: null,
    isConnected: false,
    conversations: [],
    conversationsLoading: false,
    messagesByConv: {},
    messagesLoading: {},
    hasMoreMessages: {},
    nextCursor: {},
    typingByConv: {},
    onlineUsers: new Set(),

    // ─────────────────────────────────────────────────────────────────────────
    // SOCKET
    // ─────────────────────────────────────────────────────────────────────────
    initSocket: (token: string) => {
        if (get().socket?.connected) return;

        const socketUrl = ADMIN_API_BASE_URL || 'http://localhost:3002';
        const socket = io(socketUrl, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
        });

        socket.on('connect', () => {
            set({ isConnected: true });
        });

        socket.on('disconnect', () => {
            set({ isConnected: false });
        });

        // ── Incoming message ──────────────────────────────────────────────────
        socket.on('message:new', (msg: ChatMessage) => {
            set((state) => {
                const convId = msg.conversationId;
                const existing = state.messagesByConv[convId] || [];

                // Deduplicate by tempId or _id
                const isDupe = existing.some(
                    (m) => m._id === msg._id || (msg.tempId && m.tempId === msg.tempId)
                );
                if (isDupe) return state;

                // Replace optimistic message if tempId matches
                const replaced = existing.map((m) =>
                    m.tempId && m.tempId === msg.tempId
                        ? { ...msg, status: 'sent' as const }
                        : m
                );
                const isNew = !existing.some((m) => m.tempId === msg.tempId);
                const updated = isNew ? [...existing, { ...msg, status: 'sent' as const }] : replaced;

                // Update conversation last message + unread
                const convs = state.conversations.map((c) => {
                    if (c._id !== convId) return c;
                    return {
                        ...c,
                        lastMessage: msg.text || `[${msg.type}]`,
                        lastMessageAt: msg.createdAt,
                        lastMessageSenderId: msg.senderId,
                        unreadCount: c.unreadCount + 1,
                    };
                });

                return {
                    messagesByConv: { ...state.messagesByConv, [convId]: updated },
                    conversations: convs,
                };
            });
        });

        // ── Delivery status ───────────────────────────────────────────────────
        socket.on('message:delivered', ({ conversationId, deliveredAt }: { conversationId: string; deliveredAt: string }) => {
            set((state) => {
                const msgs = (state.messagesByConv[conversationId] || []).map((m) =>
                    !m.deliveredAt ? { ...m, deliveredAt, status: 'delivered' as const } : m
                );
                return { messagesByConv: { ...state.messagesByConv, [conversationId]: msgs } };
            });
        });

        // ── Seen ─────────────────────────────────────────────────────────────
        socket.on('message:seen', ({ conversationId, lastMessageId, seenAt }: { conversationId: string; lastMessageId: string; seenAt: string }) => {
            set((state) => {
                const msgs = (state.messagesByConv[conversationId] || []).map((m) => {
                    if (!m.seenAt && m._id <= lastMessageId) {
                        return { ...m, seenAt, status: 'seen' as const };
                    }
                    return m;
                });
                // Reset unread for own view
                const convs = state.conversations.map((c) =>
                    c._id === conversationId ? { ...c, unreadCount: 0 } : c
                );
                return {
                    messagesByConv: { ...state.messagesByConv, [conversationId]: msgs },
                    conversations: convs,
                };
            });
        });

        // ── Typing ───────────────────────────────────────────────────────────
        socket.on('user:typing', ({ conversationId, isTyping }: { conversationId: string; userId: string; isTyping: boolean }) => {
            set((state) => ({
                typingByConv: { ...state.typingByConv, [conversationId]: isTyping },
            }));
        });

        // ── Online/Offline ────────────────────────────────────────────────────
        socket.on('user:online', ({ userId }: { userId: string }) => {
            set((state) => {
                const s = new Set(state.onlineUsers);
                s.add(userId);
                return { onlineUsers: s };
            });
        });

        socket.on('user:offline', ({ userId }: { userId: string }) => {
            set((state) => {
                const s = new Set(state.onlineUsers);
                s.delete(userId);
                return { onlineUsers: s };
            });
        });

        set({ socket });
    },

    disconnect: () => {
        get().socket?.disconnect();
        set({ socket: null, isConnected: false });
    },

    // ─────────────────────────────────────────────────────────────────────────
    // REST — Conversations
    // ─────────────────────────────────────────────────────────────────────────
    fetchConversations: async () => {
        set({ conversationsLoading: true });
        try {
            const res = await apiClient.get('/api/chat/conversations');
            if (res.data.success) {
                set({ conversations: res.data.data.conversations || [] });
            }
        } catch (e) {
            // silent
        } finally {
            set({ conversationsLoading: false });
        }
    },

    createConversation: async (userId: string) => {
        try {
            const res = await apiClient.post('/api/chat/conversations', { userId });
            if (res.data.success) {
                await get().fetchConversations();
                return res.data.data.conversation._id;
            }
        } catch (e) {}
        return null;
    },

    // ─────────────────────────────────────────────────────────────────────────
    // REST — Messages
    // ─────────────────────────────────────────────────────────────────────────
    fetchMessages: async (convId: string, loadMore = false) => {
        set((s) => ({ messagesLoading: { ...s.messagesLoading, [convId]: true } }));
        try {
            const cursor = loadMore ? get().nextCursor[convId] : null;
            const params: any = { limit: 30 };
            if (cursor) params.cursor = cursor;

            const res = await apiClient.get(`/api/chat/messages/${convId}`, { params });
            if (res.data.success) {
                const { messages, nextCursor, hasMore } = res.data.data;
                set((state) => {
                    const existing = loadMore ? (state.messagesByConv[convId] || []) : [];
                    // Prepend older messages
                    const merged = [...messages, ...existing];
                    // Dedupe
                    const seen = new Set<string>();
                    const unique = merged.filter((m: ChatMessage) => {
                        if (seen.has(m._id)) return false;
                        seen.add(m._id);
                        return true;
                    });
                    return {
                        messagesByConv: { ...state.messagesByConv, [convId]: unique },
                        hasMoreMessages: { ...state.hasMoreMessages, [convId]: hasMore },
                        nextCursor: { ...state.nextCursor, [convId]: nextCursor },
                    };
                });
            }
        } catch (e) {
        } finally {
            set((s) => ({ messagesLoading: { ...s.messagesLoading, [convId]: false } }));
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // SEND (optimistic + socket)
    // ─────────────────────────────────────────────────────────────────────────
    sendMessage: (convId: string, text: string, senderId: string, tempId: string) => {
        const { socket } = get();
        if (!socket?.connected) return;

        const optimistic: ChatMessage = {
            _id: tempId,
            tempId,
            conversationId: convId,
            senderId,
            text,
            type: 'text',
            createdAt: new Date().toISOString(),
            status: 'sending',
        };

        // Optimistic update
        set((state) => {
            const existing = state.messagesByConv[convId] || [];
            return { messagesByConv: { ...state.messagesByConv, [convId]: [...existing, optimistic] } };
        });

        // Emit
        socket.emit('message:send', { conversationId: convId, text, tempId }, (ack: any) => {
            set((state) => {
                const msgs = (state.messagesByConv[convId] || []).map((m) => {
                    if (m.tempId !== tempId) return m;
                    if (ack?.success) {
                        return { ...ack.message, status: 'sent' as const };
                    }
                    return { ...m, status: 'failed' as const };
                });
                return { messagesByConv: { ...state.messagesByConv, [convId]: msgs } };
            });
        });
    },

    // ─────────────────────────────────────────────────────────────────────────
    // MARK READ
    // ─────────────────────────────────────────────────────────────────────────
    markRead: async (convId: string, lastMessageId: string) => {
        try {
            await apiClient.post('/api/chat/messages/read', {
                conversationId: convId,
                lastMessageId,
            });
            set((state) => ({
                conversations: state.conversations.map((c) =>
                    c._id === convId ? { ...c, unreadCount: 0 } : c
                ),
            }));
        } catch (e) {}
    },

    // ─────────────────────────────────────────────────────────────────────────
    // SOCKET ROOM MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────
    joinConversation: (convId: string) => {
        get().socket?.emit('chat:join_conversation', { conversationId: convId });
    },

    leaveConversation: (convId: string) => {
        get().socket?.emit('chat:leave_conversation', { conversationId: convId });
    },

    // ─────────────────────────────────────────────────────────────────────────
    // TYPING
    // ─────────────────────────────────────────────────────────────────────────
    sendTypingStart: (convId: string) => {
        get().socket?.emit('typing:start', { conversationId: convId });
    },

    sendTypingStop: (convId: string) => {
        get().socket?.emit('typing:stop', { conversationId: convId });
    },

    // ─────────────────────────────────────────────────────────────────────────
    // USER SEARCH
    // ─────────────────────────────────────────────────────────────────────────
    searchUsers: async (q: string) => {
        try {
            const res = await apiClient.get('/api/chat/users/search', { params: { q } });
            return res.data.data?.users || [];
        } catch (e) {
            return [];
        }
    },
}));
