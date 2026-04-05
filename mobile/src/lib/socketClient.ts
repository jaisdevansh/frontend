import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../services/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

let socket: Socket | null = null;

/**
 * Singleton socket client.
 * Call getSocket() from anywhere to reuse one connection across the app.
 */
export const getSocket = async (): Promise<Socket> => {
    if (socket?.connected) return socket;

    const token = await AsyncStorage.getItem('auth_token');

    socket = io(API_BASE_URL, {
        transports: ['websocket', 'polling'],
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 20000,
    });

    socket.on('connect', () => {});
    socket.on('disconnect', (reason) => {});
    socket.on('connect_error', (err) => console.warn('[Socket] Error:', err.message));

    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
