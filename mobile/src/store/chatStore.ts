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

interface ChatRequest {
    senderId: string;
    senderName: string;
    senderImage?: string;
    content: string;
    timestamp: string;
}

interface ChatState {
    socket: Socket | null;
    messagesByPeer: Record<string, Message[]>;
    isTyping: Record<string, boolean>;
    unreadCounts: Record<string, number>;
    chatRequests: Record<string, ChatRequest>; // Pending chat requests by senderId
    acceptedChats: Set<string>; // Set of accepted peer IDs
    currentUserId: string | null; // Current logged-in user ID
    onMessageReceived?: (senderId: string, senderName: string, content: string) => void;
    onChatRequest?: (senderId: string, senderName: string, content: string, senderImage?: string) => void;
    
    // Actions
    initSocket: (token: string, userId: string) => void;
    disconnect: () => void;
    fetchHistory: (peerId: string) => Promise<void>;
    sendMessage: (receiverId: string, content: string, currentUserId: string) => void;
    sendTyping: (receiverId: string) => void;
    markRead: (peerId: string) => void;
    acceptChatRequest: (senderId: string) => void;
    rejectChatRequest: (senderId: string) => void;
    setMessageReceivedCallback: (callback: (senderId: string, senderName: string, content: string) => void) => void;
    setChatRequestCallback: (callback: (senderId: string, senderName: string, content: string, senderImage?: string) => void) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
    socket: null,
    messagesByPeer: {},
    isTyping: {},
    unreadCounts: {},
    chatRequests: {},
    acceptedChats: new Set(),
    currentUserId: null,
    onMessageReceived: undefined,
    onChatRequest: undefined,

    initSocket: (token: string, userId: string) => {
        if (get().socket) return;

        // Store current user ID
        set({ currentUserId: userId });

        // Ensure we point to the correct backend host
        const socketUrl = apiClient.defaults.baseURL?.replace('/api/v1', '') || 'http://localhost:3000';
        
        const socket = io(socketUrl, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: Infinity,
        });

        socket.on('connect', () => {
            console.log('🔌 [ChatStore] Socket connected:', socket.id);
            console.log('🔌 [ChatStore] Socket URL:', socketUrl);
            console.log('🔌 [ChatStore] Socket transport:', socket.io.engine.transport.name);
        });

        socket.on('connect_error', (error) => {
            console.error('❌ [ChatStore] Socket connection error:', error.message);
        });

        socket.on('disconnect', (reason) => {
            console.warn('⚠️ [ChatStore] Socket disconnected:', reason);
        });

        socket.on('receive_message', (msg) => {
            console.log('📨 [ChatStore] receive_message event:', { 
                senderId: msg.senderId, 
                receiverId: msg.receiverId,
                content: msg.content?.substring(0, 50),
                tempId: msg.tempId 
            });
            
            set((state) => {
                console.log('🔍 [ChatStore] Echo check:', {
                    msgSenderId: msg.senderId,
                    currentUserId: state.currentUserId,
                    isMatch: msg.senderId === state.currentUserId
                });
                
                // CRITICAL: Ignore messages sent by current user (echo prevention)
                if (msg.senderId === state.currentUserId) {
                    console.log('⏭️ [ChatStore] Ignoring own message echo');
                    return state;
                }
                
                const peerId = msg.senderId;
                const existingMsgs = state.messagesByPeer[peerId] || [];
                
                // Check if this is a chat request (first message from this user)
                const isChatAccepted = state.acceptedChats.has(peerId);
                
                console.log('🔍 [ChatStore] Message check:', { 
                    peerId, 
                    isChatAccepted, 
                    existingMsgCount: existingMsgs.length,
                    hasPendingRequest: !!state.chatRequests[peerId]
                });
                
                // If chat request already exists, don't create another one
                if (state.chatRequests[peerId]) {
                    console.log('⏭️ [ChatStore] Chat request already pending, ignoring duplicate');
                    return state;
                }
                
                if (!isChatAccepted && existingMsgs.length === 0) {
                    // This is a NEW chat request
                    console.log('🔔 [ChatStore] New chat request from:', peerId);
                    
                    // Store as pending chat request
                    const newRequest: ChatRequest = {
                        senderId: peerId,
                        senderName: msg.senderName || 'Someone',
                        senderImage: msg.senderImage,
                        content: msg.content,
                        timestamp: msg.timestamp || new Date().toISOString()
                    };
                    
                    // Trigger chat request callback ONCE
                    if (state.onChatRequest) {
                        console.log('🔔 [ChatStore] Triggering chat request callback');
                        // Use setTimeout to prevent multiple rapid calls
                        setTimeout(() => {
                            const callback = get().onChatRequest;
                            if (callback) {
                                callback(peerId, msg.senderName || 'Someone', msg.content, msg.senderImage);
                            }
                        }, 0);
                    }
                    
                    return {
                        chatRequests: {
                            ...state.chatRequests,
                            [peerId]: newRequest
                        }
                    };
                }
                
                // Chat is already accepted, add message normally
                const newMsg: Message = {
                    _id: msg.tempId || Math.random().toString(),
                    sender: peerId,
                    receiver: msg.receiverId,
                    content: msg.content,
                    createdAt: msg.timestamp || new Date().toISOString(),
                    isRead: false,
                    status: 'sent'
                };

                // Prevent duplicates
                if (existingMsgs.find(m => m._id === newMsg._id || m.tempId === newMsg.tempId)) {
                    console.log('⚠️ [ChatStore] Duplicate message detected, skipping');
                    return state; 
                }

                console.log('✅ [ChatStore] Adding message to store:', { peerId, messageCount: existingMsgs.length + 1 });

                // Trigger notification callback for accepted chats
                if (state.onMessageReceived && isChatAccepted) {
                    console.log('🔔 [ChatStore] Triggering notification callback');
                    state.onMessageReceived(peerId, msg.senderName || 'Someone', msg.content);
                }

                return {
                    messagesByPeer: {
                        ...state.messagesByPeer,
                        [peerId]: [newMsg, ...existingMsgs]
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
        if (!socket) {
            console.error('❌ [ChatStore] Cannot send message: Socket not connected');
            return;
        }

        console.log('📤 [ChatStore] Sending message:', { receiverId, content: content.substring(0, 50), currentUserId });

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
        console.log('🚀 [ChatStore] Emitting send_message event');
        
        // Set timeout for acknowledgment
        const ackTimeout = setTimeout(() => {
            console.error('⏰ [ChatStore] Acknowledgment timeout - backend not responding');
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
        }, 10000); // 10 second timeout
        
        socket.emit('send_message', { receiverId, content, tempId }, (ack: any) => {
            clearTimeout(ackTimeout); // Clear timeout on successful ack
            console.log('✅ [ChatStore] Received acknowledgment:', ack);
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
                console.error('❌ [ChatStore] Message send failed:', ack);
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
    },

    acceptChatRequest: (senderId: string) => {
        console.log('✅ [ChatStore] Accepting chat request from:', senderId);
        set((state) => {
            const request = state.chatRequests[senderId];
            if (!request) {
                console.warn('⚠️ [ChatStore] No pending request found for:', senderId);
                return state;
            }
            
            console.log('📝 [ChatStore] Current acceptedChats before:', Array.from(state.acceptedChats));
            
            // Move request message to messagesByPeer
            const firstMessage: Message = {
                _id: `req_${Date.now()}`,
                sender: senderId,
                receiver: state.currentUserId || '',
                content: request.content,
                createdAt: request.timestamp,
                isRead: false,
                status: 'sent'
            };
            
            // Remove from requests, add to accepted chats
            const newRequests = { ...state.chatRequests };
            delete newRequests[senderId];
            
            const newAcceptedChats = new Set(state.acceptedChats);
            newAcceptedChats.add(senderId);
            
            console.log('📝 [ChatStore] New acceptedChats after:', Array.from(newAcceptedChats));
            
            return {
                ...state,
                chatRequests: newRequests,
                acceptedChats: newAcceptedChats,
                messagesByPeer: {
                    ...state.messagesByPeer,
                    [senderId]: [firstMessage]
                }
            };
        });
        
        // Notify sender that request was accepted
        const { socket } = get();
        if (socket) {
            socket.emit('chat_request_accepted', { senderId });
        }
        
        console.log('✅ [ChatStore] Chat request accepted successfully');
    },

    rejectChatRequest: (senderId: string) => {
        console.log('❌ [ChatStore] Rejecting chat request from:', senderId);
        set((state) => {
            const newRequests = { ...state.chatRequests };
            delete newRequests[senderId];
            return { chatRequests: newRequests };
        });
        
        // Notify sender that request was rejected
        const { socket } = get();
        if (socket) {
            socket.emit('chat_request_rejected', { senderId });
        }
    },

    setMessageReceivedCallback: (callback: (senderId: string, senderName: string, content: string) => void) => {
        set({ onMessageReceived: callback });
    },

    setChatRequestCallback: (callback: (senderId: string, senderName: string, content: string, senderImage?: string) => void) => {
        set({ onChatRequest: callback });
    }
}));
