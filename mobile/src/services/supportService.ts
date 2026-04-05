import apiClient from './apiClient';

export const supportService = {
    askSupport: async (message: string) => {
        const response = await apiClient.post('/support/ask', { message });
        return response.data;
    },
    getChatHistory: async () => {
        const response = await apiClient.get('/support/chat');
        return response.data;
    },
    clearChat: async () => {
        const response = await apiClient.delete('/support/chat');
        return response.data;
    },
    deleteMessage: async (id: string) => {
        const response = await apiClient.delete(`/support/message/${id}`);
        return response.data;
    }
};
