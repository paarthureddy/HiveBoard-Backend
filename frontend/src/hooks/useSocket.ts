import { useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket, connectSocket, disconnectSocket } from '@/lib/socket';
import type { Participant } from '@/types/room';

interface UseSocketOptions {
    onRoomJoined?: (data: { roomId: string; participants: Participant[]; role: string }) => void;
    onUserJoined?: (data: { socketId: string; userId?: string; guestId?: string; name: string; participants: Participant[] }) => void;
    onUserLeft?: (data: { socketId: string; participants: Participant[] }) => void;
    onParticipantsList?: (participants: Participant[]) => void;
    onCanvasUpdated?: (data: { userId?: string; guestId?: string; data: any }) => void;
    onCursorMoved?: (data: { socketId: string; userId?: string; guestId?: string; position: { x: number; y: number } }) => void;
    onStrokeDrawn?: (data: { userId?: string; guestId?: string; stroke: any }) => void;
    onPointDrawn?: (data: { userId?: string; guestId?: string; point: { x: number; y: number }; strokeId: string; color: string; width: number }) => void;
    onCanvasCleared?: (data: { userId?: string; guestId?: string }) => void;
    onStrokeUndone?: (data: { userId?: string; guestId?: string }) => void;
    onCanvasState?: (data: { strokes: any[]; croquis: any[]; stickyNotes?: any[]; textItems?: any[]; }) => void;
    onError?: (data: { message: string }) => void;
    onChatHistory?: (messages: any[]) => void;
    onReceiveMessage?: (message: any) => void;
    onCroquisAdded?: (data: { item: any }) => void;
    onCroquisUpdated?: (data: { id: string; updates: any }) => void;
    onStickyAdded?: (data: { note: any }) => void;
    onStickyUpdated?: (data: { id: string; updates: any }) => void;
    onStickyDeleted?: (data: { id: string }) => void;
    onTextAdded?: (data: { item: any }) => void;
    onTextUpdated?: (data: { id: string; updates: any }) => void;
    onTextDeleted?: (data: { id: string }) => void;
    onStrokeUpdated?: (data: { id: string; updates: any }) => void;
}

/**
 * useSocket Hook
 * 
 * This hook manages the WebSocket connection for real-time collaboration.
 * It serves as a bridge between the React application and the Socket.io client.
 * 
 * Features:
 * - Connects to the backend socket server.
 * - Proxies socket events to the provided callback functions (options).
 * - Handles user joining/leaving, drawing updates, chat messages, and object manipulation events.
 */
export const useSocket = (options: UseSocketOptions = {}) => {
    const socketRef = useRef<Socket | null>(null);
    const optionsRef = useRef(options);

    // Keep options ref updated
    useEffect(() => {
        optionsRef.current = options;
    });

    useEffect(() => {
        // Get socket instance
        socketRef.current = getSocket();
        const socket = socketRef.current;

        // Connect socket
        connectSocket();

        // Create stable listeners that call the latest options from ref
        const handleRoomJoined = (data: any) => optionsRef.current.onRoomJoined?.(data);
        const handleUserJoined = (data: any) => optionsRef.current.onUserJoined?.(data);
        const handleUserLeft = (data: any) => optionsRef.current.onUserLeft?.(data);
        const handleParticipantsList = (data: any) => optionsRef.current.onParticipantsList?.(data);
        const handleCanvasUpdated = (data: any) => optionsRef.current.onCanvasUpdated?.(data);
        const handleCursorMoved = (data: any) => optionsRef.current.onCursorMoved?.(data);
        const handleStrokeDrawn = (data: any) => optionsRef.current.onStrokeDrawn?.(data);
        const handlePointDrawn = (data: any) => optionsRef.current.onPointDrawn?.(data);
        const handleCanvasCleared = (data: any) => optionsRef.current.onCanvasCleared?.(data);
        const handleStrokeUndone = (data: any) => optionsRef.current.onStrokeUndone?.(data);
        const handleCanvasState = (data: any) => optionsRef.current.onCanvasState?.(data);
        const handleError = (data: any) => optionsRef.current.onError?.(data);
        const handleChatHistory = (data: any) => optionsRef.current.onChatHistory?.(data);
        const handleReceiveMessage = (data: any) => optionsRef.current.onReceiveMessage?.(data);
        const handleCroquisAdded = (data: any) => optionsRef.current.onCroquisAdded?.(data);
        const handleCroquisUpdated = (data: any) => optionsRef.current.onCroquisUpdated?.(data);
        const handleStickyAdded = (data: any) => optionsRef.current.onStickyAdded?.(data);
        const handleStickyUpdated = (data: any) => optionsRef.current.onStickyUpdated?.(data);
        const handleStickyDeleted = (data: any) => optionsRef.current.onStickyDeleted?.(data);
        const handleTextAdded = (data: any) => optionsRef.current.onTextAdded?.(data);
        const handleTextUpdated = (data: any) => optionsRef.current.onTextUpdated?.(data);
        const handleTextDeleted = (data: any) => optionsRef.current.onTextDeleted?.(data);
        const handleStrokeUpdated = (data: any) => optionsRef.current.onStrokeUpdated?.(data);

        // Set up event listeners
        socket.on('room-joined', handleRoomJoined);
        socket.on('user-joined', handleUserJoined);
        socket.on('user-left', handleUserLeft);
        socket.on('participants-list', handleParticipantsList);
        socket.on('canvas-updated', handleCanvasUpdated);
        socket.on('cursor-moved', handleCursorMoved);
        socket.on('stroke-drawn', handleStrokeDrawn);
        socket.on('point-drawn', handlePointDrawn);
        socket.on('canvas-cleared', handleCanvasCleared);
        socket.on('stroke-undone', handleStrokeUndone);
        socket.on('canvas-state', handleCanvasState);
        socket.on('chat-history', handleChatHistory);
        socket.on('receive-message', handleReceiveMessage);
        socket.on('croquis-added', handleCroquisAdded);
        socket.on('croquis-updated', handleCroquisUpdated);
        socket.on('sticky-added', handleStickyAdded);
        socket.on('sticky-updated', handleStickyUpdated);
        socket.on('sticky-deleted', handleStickyDeleted);
        socket.on('text-added', handleTextAdded);
        socket.on('text-updated', handleTextUpdated);
        socket.on('text-deleted', handleTextDeleted);
        socket.on('stroke-updated', handleStrokeUpdated);
        socket.on('error', handleError);

        // Cleanup on unmount
        return () => {
            socket.off('room-joined', handleRoomJoined);
            socket.off('user-joined', handleUserJoined);
            socket.off('user-left', handleUserLeft);
            socket.off('participants-list', handleParticipantsList);
            socket.off('canvas-updated', handleCanvasUpdated);
            socket.off('cursor-moved', handleCursorMoved);
            socket.off('error', handleError);
            socket.off('stroke-drawn', handleStrokeDrawn);
            socket.off('point-drawn', handlePointDrawn);
            socket.off('canvas-cleared', handleCanvasCleared);
            socket.off('stroke-undone', handleStrokeUndone);
            socket.off('canvas-state', handleCanvasState);
            socket.off('chat-history', handleChatHistory);
            socket.off('receive-message', handleReceiveMessage);
            socket.off('croquis-added', handleCroquisAdded);
            socket.off('croquis-updated', handleCroquisUpdated);
            socket.off('sticky-added', handleStickyAdded);
            socket.off('sticky-updated', handleStickyUpdated);
            socket.off('sticky-deleted', handleStickyDeleted);
            socket.off('text-added', handleTextAdded);
            socket.off('text-updated', handleTextUpdated);
            socket.off('text-deleted', handleTextDeleted);
            socket.off('stroke-updated', handleStrokeUpdated);

            disconnectSocket();
        };
    }, []);

    const getSocketInstance = useCallback(() => socketRef.current, []);

    return {
        socket: socketRef.current,
        getSocket: getSocketInstance,
    };
};
