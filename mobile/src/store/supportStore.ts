import { create } from 'zustand';
import { supportService } from '../services/supportService';

interface Message {
    _id: string;
    content: string;
    role: 'user' | 'ai';
    createdAt?: string;
}

interface SupportState {
    messages: Message[];
    loading: boolean;
    setMessages: (messages: Message[]) => void;
    addMessage: (message: Message) => void;
    updateMessageId: (oldId: string, newId: string) => void;
    setLoading: (loading: boolean) => void;
    fetchHistory: () => Promise<void>;
    sendMessage: (content: string) => Promise<void>;
    clearChat: () => Promise<void>;
}

/**
 * Optimized AI Support store.
 * Manages chat history and real-time response states.
 */
export const useSupportStore = create<SupportState>((set, get) => ({
    messages: [],
    loading: false,
    setMessages: (messages) => set({ messages }),
    addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
    updateMessageId: (oldId, newId) => set((state) => ({
        messages: state.messages.map(m => m._id === oldId ? { ...m, _id: newId } : m)
    })),
    setLoading: (loading) => set({ loading }),
    
    fetchHistory: async () => {
        try {
            const res = await supportService.getChatHistory();
            if (res.success) set({ messages: res.data });
        } catch (e) { console.error('History fetch error', e); }
    },

    sendMessage: async (content: string) => {
        const tempId = `temp_${Date.now()}`;
        get().addMessage({ _id: tempId, content, role: 'user' });
        set({ loading: true });

        try {
            const res = await supportService.askSupport(content);
            if (res.success) {
                const { userMessageId, historyId, message: aiContent } = res.data;
                get().updateMessageId(tempId, userMessageId);
                get().addMessage({ _id: historyId, content: aiContent, role: 'ai' });
            }
        } catch (e) {
            throw e;
        } finally {
            set({ loading: false });
        }
    },

    clearChat: async () => {
        try {
            const res = await supportService.clearChat();
            if (res.success) set({ messages: [] });
        } catch (e) { throw e; }
    }
}));
