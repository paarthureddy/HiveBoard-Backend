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
    onCanvasState?: (data: { strokes: any[] }) => void;
    onError?: (data: { message: string }) => void;
}

export const useSocket = (options: UseSocketOptions = {}) => {
    const socketRef = useRef<Socket | null>(null);
    const {
        onRoomJoined,
        onUserJoined,
        onUserLeft,
        onParticipantsList,
        onCanvasUpdated,
        onCursorMoved,
        onStrokeDrawn,
        onPointDrawn,
        onCanvasCleared,
        onStrokeUndone,
        onCanvasState,
        onError,
    } = options;

    useEffect(() => {
        // Get socket instance
        socketRef.current = getSocket();
        const socket = socketRef.current;

        // Connect socket
        connectSocket();

        // Set up event listeners
        if (onRoomJoined) {
            socket.on('room-joined', onRoomJoined);
        }

        if (onUserJoined) {
            socket.on('user-joined', onUserJoined);
        }

        if (onUserLeft) {
            socket.on('user-left', onUserLeft);
        }

        if (onParticipantsList) {
            socket.on('participants-list', onParticipantsList);
        }

        if (onCanvasUpdated) {
            socket.on('canvas-updated', onCanvasUpdated);
        }

        if (onCursorMoved) {
            socket.on('cursor-moved', onCursorMoved);
        }

        if (onError) {
            socket.on('error', onError);
        }

        if (onStrokeDrawn) {
            socket.on('stroke-drawn', onStrokeDrawn);
        }

        if (onPointDrawn) {
            socket.on('point-drawn', onPointDrawn);
        }

        if (onCanvasCleared) {
            socket.on('canvas-cleared', onCanvasCleared);
        }

        if (onStrokeUndone) {
            socket.on('stroke-undone', onStrokeUndone);
        }

        if (onCanvasState) {
            socket.on('canvas-state', onCanvasState);
        }

        // Cleanup on unmount
        return () => {
            if (onRoomJoined) socket.off('room-joined', onRoomJoined);
            if (onUserJoined) socket.off('user-joined', onUserJoined);
            if (onUserLeft) socket.off('user-left', onUserLeft);
            if (onParticipantsList) socket.off('participants-list', onParticipantsList);
            if (onCanvasUpdated) socket.off('canvas-updated', onCanvasUpdated);
            if (onCursorMoved) socket.off('cursor-moved', onCursorMoved);
            if (onError) socket.off('error', onError);
            if (onStrokeDrawn) socket.off('stroke-drawn', onStrokeDrawn);
            if (onPointDrawn) socket.off('point-drawn', onPointDrawn);
            if (onCanvasCleared) socket.off('canvas-cleared', onCanvasCleared);
            if (onStrokeUndone) socket.off('stroke-undone', onStrokeUndone);
            if (onCanvasState) socket.off('canvas-state', onCanvasState);

            disconnectSocket();
        };
    }, [
        onRoomJoined,
        onUserJoined,
        onUserLeft,
        onParticipantsList,
        onCanvasUpdated,
        onCursorMoved,
        onError,
        onStrokeDrawn,
        onPointDrawn,
        onCanvasCleared,
        onStrokeUndone,
        onCanvasState
    ]);

    const getSocketInstance = useCallback(() => socketRef.current, []);

    return {
        socket: socketRef.current,
        getSocket: getSocketInstance,
    };
};
