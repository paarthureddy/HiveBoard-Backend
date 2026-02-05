import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            autoConnect: false,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
        });

        // Connection event listeners
        socket.on('connect', () => {
            console.log('✅ Socket connected:', socket?.id);
        });

        socket.on('disconnect', (reason) => {
            console.log('❌ Socket disconnected:', reason);
        });

        socket.on('connect_error', (error) => {
            console.error('🔴 Socket connection error:', error);
        });

        socket.on('reconnect', (attemptNumber) => {
            console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
        });

        socket.on('reconnect_attempt', (attemptNumber) => {
            console.log(`🔄 Socket reconnection attempt ${attemptNumber}`);
        });

        socket.on('reconnect_failed', () => {
            console.error('🔴 Socket reconnection failed');
        });
    }

    return socket;
};

export const connectSocket = (): void => {
    const socket = getSocket();
    if (!socket.connected) {
        socket.connect();
    }
};

export const disconnectSocket = (): void => {
    if (socket && socket.connected) {
        socket.disconnect();
    }
};

export const joinRoom = (data: {
    roomId: string;
    meetingId?: string;
    userId?: string;
    guestId?: string;
    name: string;
    role?: 'owner' | 'editor' | 'guest';
}): void => {
    const socket = getSocket();
    socket.emit('join-room', data);
};

export const leaveRoom = (): void => {
    const socket = getSocket();
    socket.emit('leave-room');
};

export const getParticipants = (): void => {
    const socket = getSocket();
    socket.emit('get-participants');
};

export const sendCanvasUpdate = (data: {
    meetingId?: string;
    canvasData?: any;
}): void => {
    const socket = getSocket();
    socket.emit('canvas-update', data);
};

export const sendCursorMove = (position: { x: number; y: number }): void => {
    const socket = getSocket();
    socket.emit('cursor-move', { position });
};

export const sendStroke = (data: {
    meetingId?: string;
    stroke: any;
}): void => {
    const socket = getSocket();
    socket.emit('draw-stroke', data);
};

export const sendPoint = (data: {
    meetingId?: string;
    point: { x: number; y: number };
    strokeId: string;
    color: string;
    width: number;
}): void => {
    const socket = getSocket();
    socket.emit('draw-point', data);
};

export const sendClearCanvas = (data: { meetingId?: string }): void => {
    const socket = getSocket();
    socket.emit('clear-canvas', data);
};

export const sendUndo = (data: { meetingId?: string }): void => {
    const socket = getSocket();
    socket.emit('undo-stroke', data);
};

export const sendAddCroquis = (data: { meetingId?: string; item: any; }): void => {
    const socket = getSocket();
    socket.emit('add-croquis', data);
};

export const sendUpdateCroquis = (data: { meetingId?: string; id: string; updates: any; }): void => {
    const socket = getSocket();
    socket.emit('update-croquis', data);
};

export const sendMessage = (data: {
    meetingId?: string;
    userId?: string;
    guestId?: string;
    name: string;
    content: string;
}): void => {
    const socket = getSocket();
    socket.emit('send-message', data);
};


export const sendAddSticky = (data: { meetingId?: string; note: any; }): void => {
    const socket = getSocket();
    socket.emit('add-sticky', data);
};

export const sendUpdateSticky = (data: { meetingId?: string; id: string; updates: any; }): void => {
    const socket = getSocket();
    socket.emit('update-sticky', data);
};

export const sendDeleteSticky = (data: { meetingId?: string; id: string; }): void => {
    const socket = getSocket();
    socket.emit('delete-sticky', data);
};

export const sendAddText = (data: { meetingId?: string; item: any; }): void => {
    const socket = getSocket();
    socket.emit('add-text', data);
};

export const sendUpdateText = (data: { meetingId?: string; id: string; updates: any; }): void => {
    const socket = getSocket();
    socket.emit('update-text', data);
};

export const sendDeleteText = (data: { meetingId?: string; id: string; }): void => {
    const socket = getSocket();
    socket.emit('delete-text', data);
};

export const requestCanvasState = (data: { meetingId: string }): void => {
    const socket = getSocket();
    socket.emit('request-canvas-state', data);
};

export default {
    getSocket,
    connectSocket,
    disconnectSocket,
    joinRoom,
    leaveRoom,
    getParticipants,
    sendCanvasUpdate,
    sendCursorMove,
    sendStroke,
    sendPoint,
    sendClearCanvas,
    sendUndo,
    sendAddCroquis,
    sendUpdateCroquis,
    sendMessage,
    requestCanvasState,
    sendAddSticky,
    sendUpdateSticky,
    sendDeleteSticky,
    sendAddText,
    sendUpdateText,
    sendDeleteText,
};

