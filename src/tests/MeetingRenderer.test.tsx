
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MeetingRenderer from '../components/MeetingRenderer';
import React from 'react';

// Mock Canvas API since jsdom doesn't support it fully
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    quadraticCurveTo: vi.fn(),
    set strokeStyle(val) {},
    set lineWidth(val) {},
    set lineCap(val) {},
    set lineJoin(val) {},
} as any));

describe('MeetingRenderer Component', () => {
    const mockOnReady = vi.fn();
    const mockData = {
        strokes: [],
        stickyNotes: [
            { id: '1', x: 100, y: 100, text: 'Hello Sticky', color: 'yellow', width: 200, height: 200 }
        ],
        textItems: [
            { id: '2', x: 300, y: 300, text: 'Hello Text', color: 'black' }
        ],
        croquis: []
    };

    it('should render sticky notes', () => {
        render(<MeetingRenderer data={mockData} onReady={mockOnReady} />);
        expect(screen.getByText('Hello Sticky')).toBeInTheDocument();
    });

    it('should render text items', () => {
        render(<MeetingRenderer data={mockData} onReady={mockOnReady} />);
        expect(screen.getByText('Hello Text')).toBeInTheDocument();
    });

    it('should render canvas element', () => {
        const { container } = render(<MeetingRenderer data={mockData} onReady={mockOnReady} />);
        const canvas = container.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
    });

    it('should call onReady callback', async () => {
        render(<MeetingRenderer data={mockData} onReady={mockOnReady} />);
        
        // Wait for the persistent useEffect timeout
        await waitFor(() => {
            expect(mockOnReady).toHaveBeenCalled();
        }, { timeout: 1000 });
    });

    it('should handle missing data gracefully', () => {
        const emptyData = { strokes: [] };
        // @ts-ignore - testing runtime safety for partial data
        render(<MeetingRenderer data={emptyData} onReady={mockOnReady} />);
        
        // Should not crash
        const canvas = document.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
    });
});
