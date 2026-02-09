import { renderHook, act } from '@testing-library/react';
import { useCanvas } from '@/hooks/useCanvas';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hook Test: Tests complex logic inside a React Hook without a UI component
describe('useCanvas Hook', () => {
    beforeEach(() => {
        // Mock getContext for canvas (hooks use canvas context internally)
        const mockContext = {
            clearRect: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            translate: vi.fn(),
            scale: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            stroke: vi.fn(),
            setTransform: vi.fn(),
        };
        
        // Mock canvas element behavior in jsdom
        const mockCanvas = {
            getContext: vi.fn(() => mockContext),
            getBoundingClientRect: vi.fn(() => ({
                left: 0, top: 0, width: 500, height: 500
            })),
            width: 500,
            height: 500,
            parentElement: {
                getBoundingClientRect: vi.fn(() => ({ width: 500, height: 500 }))
            }
        };

        // We can't easily inject the mock into the hook without modifying it, 
        // but we CAN test the *state updates* exposed by the hook.
    });

    it('should initialize with default values', () => {
        const { result } = renderHook(() => useCanvas());

        expect(result.current.isDrawing).toBe(false);
        expect(result.current.tool).toBe('brush');
        expect(result.current.brushColor).toBe('#1e1e1e');
        expect(result.current.brushWidth).toBe(3);
        expect(result.current.strokes).toEqual([]);
    });

    it('should update brush color', () => {
        const { result } = renderHook(() => useCanvas());

        act(() => {
            result.current.setBrushColor('#ff0000');
        });

        expect(result.current.brushColor).toBe('#ff0000');
    });

    it('should update tool to eraser', () => {
        const { result } = renderHook(() => useCanvas());

        act(() => {
            result.current.setTool('eraser');
        });

        expect(result.current.tool).toBe('eraser');
    });

    it('should update brush width', () => {
        const { result } = renderHook(() => useCanvas());

        act(() => {
            result.current.setBrushWidth(10);
        });

        expect(result.current.brushWidth).toBe(10);
    });

    it('should clear canvas strokes', () => {
        const { result } = renderHook(() => useCanvas());

        // Simulate having strokes
        act(() => {
            result.current.setStrokes([
                { id: '1', points: [], color: '#000', width: 2, userId: 'user1' }
            ]);
        });
        
        expect(result.current.strokes.length).toBe(1);

        act(() => {
            result.current.clearCanvas();
        });

        expect(result.current.strokes.length).toBe(0);
    });

    it('should undo last stroke from multiple strokes', () => {
        const { result } = renderHook(() => useCanvas());

        // Add 2 strokes
        act(() => {
            result.current.setStrokes([
                { id: '1', points: [], color: '#000', width: 2, userId: 'user1' },
                { id: '2', points: [], color: '#red', width: 5, userId: 'user1' }
            ]);
        });

        expect(result.current.strokes.length).toBe(2);

        // Undo once
        act(() => {
            result.current.undo();
        });

        expect(result.current.strokes.length).toBe(1);
        expect(result.current.strokes[0].id).toBe('1'); // Remaining one is the first one
    });
});
