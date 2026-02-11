
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSocket } from '../hooks/useSocket';
import * as socketLib from '../lib/socket.ts';

// Mock the socket library
vi.mock('../lib/socket.ts', () => ({
    getSocket: vi.fn(),
    connectSocket: vi.fn(),
    disconnectSocket: vi.fn(),
}));

describe('useSocket Hook', () => {
    let mockSocket: any;
    let eventHandlers: Record<string, Function> = {};

    beforeEach(() => {
        // Reset event handlers map
        eventHandlers = {};

        // create a mock socket object
        mockSocket = {
            on: vi.fn((event, handler) => {
                eventHandlers[event] = handler;
            }),
            off: vi.fn((event) => {
                delete eventHandlers[event];
            }),
            emit: vi.fn(),
            connected: true,
        };

        // Setup the mock implementation
        vi.spyOn(socketLib, 'getSocket').mockReturnValue(mockSocket);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should connect socket on mount', () => {
        renderHook(() => useSocket());
        
        expect(socketLib.getSocket).toHaveBeenCalled();
        expect(socketLib.connectSocket).toHaveBeenCalled();
    });

    it('should disconnect socket on unmount', () => {
        const { unmount } = renderHook(() => useSocket());
        
        unmount();
        
        expect(socketLib.disconnectSocket).toHaveBeenCalled();
    });

    it('should register event listeners', () => {
        renderHook(() => useSocket());

        // Check if critical events are registered
        expect(mockSocket.on).toHaveBeenCalledWith('room-joined', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('stroke-drawn', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('user-joined', expect.any(Function));
    });

    it('should cleanup event listeners on unmount', () => {
        const { unmount } = renderHook(() => useSocket());
        
        unmount();

        expect(mockSocket.off).toHaveBeenCalledWith('room-joined', expect.any(Function));
        expect(mockSocket.off).toHaveBeenCalledWith('stroke-drawn', expect.any(Function));
    });

    it('should trigger callback when event is received', () => {
        const mockOnStrokeDrawn = vi.fn();
        
        renderHook(() => useSocket({
            onStrokeDrawn: mockOnStrokeDrawn
        }));

        // Simulate incoming socket event
        const mockData = { stroke: { color: 'red' } };
        
        // Find the handler for 'stroke-drawn' and call it
        const handler = eventHandlers['stroke-drawn'];
        expect(handler).toBeDefined();
        
        act(() => {
            handler(mockData);
        });

        expect(mockOnStrokeDrawn).toHaveBeenCalledWith(mockData);
    });

    it('should update callbacks when options change (Ref Pattern)', () => {
        const callback1 = vi.fn();
        const callback2 = vi.fn();

        const { rerender } = renderHook((props) => useSocket(props), {
            initialProps: { onUserJoined: callback1 }
        });

        // Verify initial callback works
        const handler = eventHandlers['user-joined'];
        act(() => {
            handler({ name: 'User 1' });
        });
        expect(callback1).toHaveBeenCalled();

        // Rerender with new callback
        rerender({ onUserJoined: callback2 });

        // Verify new callback works without re-registering socket event
        act(() => {
            handler({ name: 'User 2' });
        });
        expect(callback2).toHaveBeenCalled();
        // callback1 should NOT be called for the second event
        expect(callback1).toHaveBeenCalledTimes(1);
    });
});
