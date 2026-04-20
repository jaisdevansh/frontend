import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    senderName?: string; // User name of sender
    senderImage?: string; // Profile image of sender
    receiverName?: string; // User name of receiver
    receiverImage?: string; // Profile image of receiver
}

interface ChatRequest {
    senderId: string;
    senderName: string;
    senderImage?: string;
    content: string;
    timestamp: string;
}

export interface ChatPeer {
    peerId: string;
    peerName: string;
    peerImage?: string;
    lastMessage: string;
    lastMessageAt: string | null;
    lastSenderId: string;
    unreadCount: number;
}

interface ChatState {
    socket: Socket | null;
    messagesByPeer: Record<string, Message[]>;
    isTyping: Record<string, boolean>;
    unreadCounts: Record<string, number>;
    chatRequests: Record<string, ChatRequest>; // Pending chat requests by senderId
    acceptedChats: Set<string>; // Set of accepted peer IDs
    chatPeers: ChatPeer[];          // ← Fetched from backend: always fresh on load
    peersLoading: boolean;
    currentUserId: string | null; // Current logged-in user ID
    currentUserName: string | null; // Current user name
    currentUserImage: string | null; // Current user image
    onMessageReceived?: (senderId: string, senderName: string, content: string) => void;
    onChatRequest?: (senderId: string, senderName: string, content: string, senderImage?: string) => void;
    
    // Actions
    initSocket: (token: string, userId: string, userName?: string, userImage?: string) => void;
    disconnect: () => void;
    fetchHistory: (peerId: string) => Promise<void>;
    sendMessage: (receiverId: string, content: string, currentUserId: string, currentUserName?: string, currentUserImage?: string) => void;
    sendTyping: (receiverId: string) => void;
    markRead: (peerId: string) => void;
    acceptChatRequest: (senderId: string) => void;
    rejectChatRequest: (senderId: string) => void;
    setMessageReceivedCallback: (callback: (senderId: string, senderName: string, content: string) => void) => void;
    setChatRequestCallback: (callback: (senderId: string, senderName: string, content: string, senderImage?: string) => void) => void;
    fetchPeers: () => Promise<void>; // ← NEW: fetch conversations list from DB
}

export const useChatStore = create<ChatState>()(
    persist(
        (set, get) => ({
    socket: null,
    messagesByPeer: {},
    isTyping: {},
    unreadCounts: {},
    chatRequests: {},
    acceptedChats: new Set(),
    chatPeers: [],
    peersLoading: false,
    currentUserId: null,
    currentUserName: null,
    currentUserImage: null,
    onMessageReceived: undefined,
    onChatRequest: undefined,

    initSocket: (token: string, userId: string, userName?: string, userImage?: string) => {
        if (get().socket) return;

        // Store current user ID and info
        set({ 
            currentUserId: userId,
            currentUserName: userName,
            currentUserImage: userImage
        });

        // Ensure we point to the correct backend host
        const socketUrl = apiClient.defaults.baseURL?.replace('/api/v1', '') || 'http://localhost:3000';
        
        const socket = io(socketUrl, {
            auth: { token },
            transports: ['websocket', 'polling'], // Allow fallback to polling if websocket fails
            reconnection: true,
            reconnectionAttempts: 3, // Reduced from 5 to prevent excessive reconnections
            reconnectionDelay: 2000, // Increased from 1000
            reconnectionDelayMax: 10000, // Increased from 5000
            timeout: 30000, // Increased from 20000
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
            
            set((state) => {
                
                // CRITICAL: Ignore messages sent by current user (echo prevention)
                if (msg.senderId === state.currentUserId) {
                    return state;
                }
                
                // For received messages, peerId is the sender
                const peerId = msg.senderId;
                const existingMsgs = state.messagesByPeer[peerId] || [];
                
                // Check if this is a chat request (first message from this user)
                const isChatAccepted = state.acceptedChats.has(peerId);
                
                // If chat request already exists, don't create another one
                if (state.chatRequests[peerId]) {
                    return state;
                }
                
                // Auto-accept if we already have messages with this peer (we initiated the chat)
                if (!isChatAccepted && existingMsgs.length > 0) {
                    const newAcceptedChats = new Set(state.acceptedChats);
                    newAcceptedChats.add(peerId);
                    
                    const newMsg: Message = {
                        _id: msg.tempId || `msg_${Date.now()}_${Math.random()}`,
                        sender: peerId,
                        receiver: msg.receiverId,
                        content: msg.content,
                        createdAt: msg.timestamp || new Date().toISOString(),
                        isRead: false,
                        status: 'sent',
                        senderName: msg.senderName,
                        senderImage: msg.senderImage
                    };
                    
                    return {
                        messagesByPeer: {
                            ...state.messagesByPeer,
                            [peerId]: [...existingMsgs, newMsg]
                        },
                        acceptedChats: newAcceptedChats,
                        unreadCounts: {
                            ...state.unreadCounts,
                            [peerId]: (state.unreadCounts[peerId] || 0) + 1
                        }
                    };
                }
                
                if (!isChatAccepted && existingMsgs.length === 0) {
                    // This is a NEW chat request
                    
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
                    _id: msg.tempId || `msg_${Date.now()}_${Math.random()}`,
                    sender: peerId,
                    receiver: msg.receiverId,
                    content: msg.content,
                    createdAt: msg.timestamp || new Date().toISOString(),
                    isRead: false,
                    status: 'sent',
                    senderName: msg.senderName,
                    senderImage: msg.senderImage
                };

                // Prevent duplicates - check by content and timestamp (not tempId)
                const isDuplicate = existingMsgs.find(m => 
                    m.content === newMsg.content && 
                    Math.abs(new Date(m.createdAt || '').getTime() - new Date(newMsg.createdAt || '').getTime()) < 2000
                );
                
                if (isDuplicate) {
                    return state; 
                }

                // Trigger notification callback for accepted chats
                if (state.onMessageReceived && isChatAccepted) {
                    state.onMessageReceived(peerId, msg.senderName || 'Someone', msg.content);
                }

                return {
                    messagesByPeer: {
                        ...state.messagesByPeer,
                        [peerId]: [...existingMsgs, newMsg] // Append to end (latest at bottom)
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
                const messages = res.data.data.messages || [];
                const peerInfo = res.data.data.peer || null;
                
                // Backend returns newest first, reverse to get oldest first (for bottom display)
                const sortedMessages = [...messages].reverse();
                
                // Add peer info to messages that don't have senderName
                const enrichedMessages = sortedMessages.map(msg => {
                    const enriched = { ...msg };
                    
                    // If message is from peer and missing senderName, add it
                    if (msg.sender === peerId && (!msg.senderName || msg.senderName === undefined)) {
                        enriched.senderName = peerInfo?.name || 'User';
                        enriched.senderImage = peerInfo?.profileImage;
                    }
                    
                    return enriched;
                });
                
                set((state) => ({
                    messagesByPeer: {
                        ...state.messagesByPeer,
                        [peerId]: enrichedMessages
                    }
                }));
                get().markRead(peerId);
            }
        } catch (error: any) {
            if (error.response?.status === 404) {
                set((state) => ({ messagesByPeer: { ...state.messagesByPeer, [peerId]: [] } }));
            } else {
                console.error('[ChatStore] fetchHistory Error:', error);
            }
        }
    },

    sendMessage: (receiverId: string, content: string, currentUserId: string, currentUserName?: string, currentUserImage?: string) => {
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
            status: 'sending',
            senderName: currentUserName,
            senderImage: currentUserImage
        };

        // Optimistic UI Update - append to the end of the array (latest at bottom)
        set((state) => {
            const existingMsgs = state.messagesByPeer[receiverId] || [];
            const newAcceptedChats = new Set(state.acceptedChats);
            
            // Auto-accept chat when sending first message
            if (!newAcceptedChats.has(receiverId)) {
                console.log('✅ [ChatStore] Auto-accepting chat with:', receiverId);
                newAcceptedChats.add(receiverId);
            }
            
            return {
                messagesByPeer: {
                    ...state.messagesByPeer,
                    [receiverId]: [...existingMsgs, optimisticMsg]
                },
                acceptedChats: newAcceptedChats
            };
        });

        // Fire to socket
        false && console.log('🚀 [ChatStore] Emitting send_message event');
        
        // Set timeout for acknowledgment
        const ackTimeout = setTimeout(() => {
            false && console.error('⏰ [ChatStore] Acknowledgment timeout - backend not responding');
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
            false && console.log('✅ [ChatStore] Received acknowledgment:', ack);
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
                false && console.error('❌ [ChatStore] Message send failed:', ack);
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
        set((state) => {
            const request = state.chatRequests[senderId];
            if (!request) {
                return state;
            }
            
            // Move request message to messagesByPeer (append to end)
            const firstMessage: Message = {
                _id: `req_${Date.now()}`,
                sender: senderId,
                receiver: state.currentUserId || '',
                content: request.content,
                createdAt: request.timestamp,
                isRead: false,
                status: 'sent',
                senderName: request.senderName,
                senderImage: request.senderImage
            };
            
            // Remove from requests, add to accepted chats
            const newRequests = { ...state.chatRequests };
            delete newRequests[senderId];
            
            const newAcceptedChats = new Set(state.acceptedChats);
            newAcceptedChats.add(senderId);
            
            // Get existing messages (if any) and append first message
            const existingMessages = state.messagesByPeer[senderId] || [];
            
            return {
                ...state,
                chatRequests: newRequests,
                acceptedChats: newAcceptedChats,
                messagesByPeer: {
                    ...state.messagesByPeer,
                    [senderId]: [...existingMessages, firstMessage]
                }
            };
        });
        
        // Notify sender that request was accepted
        const { socket } = get();
        if (socket) {
            socket.emit('chat_request_accepted', { senderId });
        }
    },

    rejectChatRequest: (senderId: string) => {
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
    },

    fetchPeers: async () => {
        set({ peersLoading: true });
        try {
            const res = await apiClient.get('/api/v1/chat/peers');
            if (res.data.success) {
                const peers: ChatPeer[] = res.data.data.conversations.map((c: any) => ({
                    peerId:        c.peerId || c._id,
                    peerName:      c.peerName || 'User',
                    peerImage:     c.peerImage,
                    lastMessage:   c.lastMessage || '',
                    lastMessageAt: c.lastMessageAt || null,
                    lastSenderId:  c.lastSenderId,
                    unreadCount:   c.unreadCount || 0,
                }));

                // Also mark all these peers as accepted so chat screen works
                set((state) => {
                    const newAccepted = new Set(state.acceptedChats);
                    peers.forEach(p => newAccepted.add(p.peerId));
                    return { chatPeers: peers, acceptedChats: newAccepted };
                });
            }
        } catch (e) {
            // silently fail — old data from persist still shows
        } finally {
            set({ peersLoading: false });
        }
    },
        }),
        {
            name: 'entry-club-chat-store',
            storage: createJSONStorage(() => AsyncStorage),
            // Only persist data fields, NOT socket/callbacks (they can't be serialized)
            partialize: (state) => ({
                messagesByPeer:  state.messagesByPeer,
                acceptedChats:   [...state.acceptedChats], // Set → Array for JSON
                unreadCounts:    state.unreadCounts,
                chatRequests:    state.chatRequests,
                currentUserId:   state.currentUserId,
                currentUserName: state.currentUserName,
                currentUserImage:state.currentUserImage,
            }),
            // Restore Set from Array after hydration
            onRehydrateStorage: () => (state) => {
                if (state && state.acceptedChats) {
                    // @ts-ignore — AsyncStorage stores it as array
                    state.acceptedChats = new Set(state.acceptedChats as unknown as string[]);
                }
            },
            version: 1,
        }
    )
);
