import { Server } from 'socket.io';

let io = null;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: { origin: '*' },
        transports: ['websocket', 'polling']
    });

    io.on('connection', (socket) => {
        console.log(`[Socket] Client connected: ${socket.id}`);
        socket.on('join_room', (roomId) => { socket.join(roomId); });
        socket.on('disconnect', () => {
            console.log(`[Socket] Client disconnected: ${socket.id}`);
        });
    });

    console.log('[Socket] Socket.io Layer initialized');
    return io;
};

export const getIO = () => io;
