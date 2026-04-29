import { io, Socket } from 'socket.io-client';
import { API_BASE_URL, SOCKET_ORIGIN, SOCKET_PATH } from '../services/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

let socket: Socket | null = null;
let isAuthFailed = false; // Track if auth failed to prevent infinite reconnection

/**
 * Singleton socket client.
 * Call getSocket() from anywhere to reuse one connection across the app.
 */
export const getSocket = async (): Promise<Socket> => {
    if (socket?.connected) {
        console.log('[Socket] Reusing existing connection');
        return socket;
    }

    // If auth previously failed, don't try again until reset
    if (isAuthFailed) {
        // Silent fail - socket not available
        throw new Error('Socket authentication failed');
    }

    // Get token from auth storage (matches AuthContext storage key)
    const authData = await AsyncStorage.getItem('auth');
    let token = null;
    let userRole = null;
    
    if (authData) {
        try {
            const parsed = JSON.parse(authData);
            token = parsed.token;
            userRole = parsed.role;
            // Only log for non-staff roles
            if (userRole !== 'staff') {
                console.log('[Socket] Token found for role:', userRole);
            }
        } catch (e) {
            console.warn('[Socket] Failed to parse auth data:', e);
        }
    }

    if (!token) {
        console.error('[Socket] No token found, connection will fail');
        isAuthFailed = true;
        throw new Error('No authentication token available');
    }

    // Skip socket connection for staff (they use admin backend, socket is on user backend)
    if (userRole === 'staff') {
        // Silent skip - staff doesn't need socket
        isAuthFailed = true;
        throw new Error('Socket not available for staff role');
    }

    const socketOrigin = SOCKET_ORIGIN;
    const socketPath = SOCKET_PATH;

    console.log('[Socket] Connecting to:', socketOrigin, 'with path:', socketPath);

    socket = io(socketOrigin, {
        path: socketPath,
        transports: ['websocket', 'polling'],
        auth: { token },
        reconnection: false, // DISABLED: Prevent automatic reconnection
        timeout: 20000,
        autoConnect: true,
    });

    socket.on('connect', () => {
        console.log('[Socket] ✅ Connected successfully, ID:', socket?.id);
        isAuthFailed = false; // Reset auth failed flag on successful connection
    });
    
    socket.on('disconnect', (reason) => {
        console.log('[Socket] ❌ Disconnected:', reason);
        isAuthFailed = true; // Mark auth as failed on any disconnect
        socket = null; // Clear socket instance
        console.log('[Socket] Socket instance cleared, will not reconnect');
    });
    
    socket.on('connect_error', (err) => {
        console.error('[Socket] Connection error:', err.message);
        if (err.message.includes('Authentication') || err.message.includes('Invalid token')) {
            isAuthFailed = true;
            socket?.disconnect();
        }
    });

    socket.on('error', (err) => {
        console.error('[Socket] Socket error:', err);
    });

    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        console.log('[Socket] Manually disconnecting');
        socket.disconnect();
        socket = null;
    }
};

export const resetSocketAuth = () => {
    console.log('[Socket] Resetting auth failed flag');
    isAuthFailed = false;
};
