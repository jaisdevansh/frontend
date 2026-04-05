import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import apiClient from '../services/apiClient';

interface Message {
    _id: string;
    sender: string;
    receiver: string;
    content: string;
    timestamp?: string; // or createdAt
    createdAt?: string;
    isRead: boolean;
    tempId?: string; // for optimistic UI
    status?: 'sending' | 'sent' | 'failed';
}

interface ChatState {
    socket: Socket | null;
    messagesByPeer: Record<string, Message[]>;
    isTyping: Record<string, boolean>;
    unreadCounts: Record<string, number>;
    
    // Actions
    initSocket: (token: string) => void;
    disconnect: () => void;
    fetchHistory: (peerId: string) => Promise<void>;
    sendMessage: (receiverId: string, content: string, currentUserId: string) => void;
    sendTyping: (receiverId: string) => void;
    markRead: (peerId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
    socket: null,
    messagesByPeer: {},
    isTyping: {},
    unreadCounts: {},

    initSocket: (token: string) => {
        if (get().socket) return;

        // Ensure we point to the correct backend host
        const socketUrl = apiClient.defaults.baseURL?.replace('/api/v1', '') || 'http://localhost:3000';
        
        const socket = io(socketUrl, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: Infinity,
        });

        socket.on('connect', () => {
            // Socket connected silently
        });

        socket.on('receive_message', (msg) => {
            set((state) => {
                const peerId = msg.senderId;
                const existingMsgs = state.messagesByPeer[peerId] || [];
                
                const newMsg: Message = {
                    _id: msg.tempId || Math.random().toString(), // fallback if no tempId
                    sender: peerId,
                    receiver: msg.receiverId,
                    content: msg.content,
                    createdAt: msg.timestamp || new Date().toISOString(),
                    isRead: false,
                    status: 'sent'
                };

                // Prevent duplicates if sender echoes back
                if (existingMsgs.find(m => m._id === newMsg._id || m.tempId === newMsg.tempId)) {
                    return state; 
                }

                return {
                    messagesByPeer: {
                        ...state.messagesByPeer,
                        [peerId]: [newMsg, ...existingMsgs] // Prepend for inverted list
                    },
                    unreadCounts: {
                        ...state.unreadCounts,
                        [peerId]: (state.unreadCounts[peerId] || 0) + 1
                    }
                };
            });
        });

        socket.on('typing', ({ senderId }) => {
            set((state) => ({
                isTyping: { ...state.isTyping, [senderId]: true }
            }));
            // Clear typing indicator after 2s
            setTimeout(() => {
                set((state) => ({
                    isTyping: { ...state.isTyping, [senderId]: false }
                }));
            }, 2000);
        });

        socket.on('messages_read', ({ byUserId }) => {
            set((state) => {
                const existingMsgs = state.messagesByPeer[byUserId] || [];
                const updatedMsgs = existingMsgs.map(m => ({ ...m, isRead: true }));
                return {
                    messagesByPeer: {
                        ...state.messagesByPeer,
                        [byUserId]: updatedMsgs
                    }
                };
            });
        });

        set({ socket });
    },

    disconnect: () => {
        const { socket } = get();
        if (socket) {
            socket.disconnect();
            set({ socket: null });
        }
    },

    fetchHistory: async (peerId: string) => {
        try {
            const res = await apiClient.get(`/api/v1/chat/history/${peerId}`);
            if (res.data.success) {
                set((state) => ({
                    messagesByPeer: {
                        ...state.messagesByPeer,
                        // Assumes backend returns sorted newest first
                        [peerId]: res.data.data.messages
                    }
                }));
                get().markRead(peerId);
            }
        } catch (error: any) {
            if (error.response?.status === 404) {
                console.warn('[ChatStore] No history found (404) for peer:', peerId);
                set((state) => ({ messagesByPeer: { ...state.messagesByPeer, [peerId]: [] } }));
            } else {
                console.error('[ChatStore] fetchHistory Error:', error);
            }
        }
    },

    sendMessage: (receiverId: string, content: string, currentUserId: string) => {
        const { socket } = get();
        if (!socket) return;

        const tempId = `temp_${Date.now()}`;
        const optimisticMsg: Message = {
            _id: tempId,
            tempId,
            sender: currentUserId,
            receiver: receiverId,
            content,
            createdAt: new Date().toISOString(),
            isRead: false,
            status: 'sending'
        };

        // Optimistic UI Update - prepend to the top of the array
        set((state) => {
            const existingMsgs = state.messagesByPeer[receiverId] || [];
            return {
                messagesByPeer: {
                    ...state.messagesByPeer,
                    [receiverId]: [optimisticMsg, ...existingMsgs]
                }
            };
        });

        // Fire to socket
        socket.emit('send_message', { receiverId, content, tempId }, (ack: any) => {
            if (ack && ack.success) {
                set((state) => {
                    const msgs = state.messagesByPeer[receiverId] || [];
                    const updated: Message[] = msgs.map((m: Message) => {
                        if (m.tempId === tempId || m._id === tempId) {
                            return { ...m, status: 'sent' as const, createdAt: ack.timestamp };
                        }
                        return m;
                    });
                    return {
                        messagesByPeer: { ...state.messagesByPeer, [receiverId]: updated }
                    };
                });
            } else {
                set((state) => {
                    const msgs = state.messagesByPeer[receiverId] || [];
                    const updated: Message[] = msgs.map(m => {
                        if (m.tempId === tempId || m._id === tempId) {
                            return { ...m, status: 'failed' as const };
                        }
                        return m;
                    });
                    return {
                        messagesByPeer: { ...state.messagesByPeer, [receiverId]: updated }
                    };
                });
            }
        });
    },

    sendTyping: (receiverId: string) => {
        const { socket } = get();
        if (socket) {
            socket.emit('typing', { receiverId });
        }
    },

    markRead: (peerId: string) => {
        const { socket } = get();
        if (socket) {
            socket.emit('mark_read', { senderId: peerId });
        }
        set((state) => ({
            unreadCounts: { ...state.unreadCounts, [peerId]: 0 }
        }));
    }
}));
