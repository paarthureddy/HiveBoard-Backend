import { useState, useCallback, useRef, useEffect } from 'react';

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  userId: string;
}

export interface UseCanvasOptions {
  onDrawStroke?: (stroke: Stroke) => void;
  onDrawPoint?: (point: Point, strokeId: string, color: string, width: number) => void;
  onClear?: () => void;
  onUndo?: () => void;
}

export const useCanvas = (options: UseCanvasOptions = {}) => {
  const { onDrawStroke, onDrawPoint, onClear, onUndo } = options;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const currentStrokeIdRef = useRef<string>(crypto.randomUUID());

  // Track remote live strokes: strokeId -> { points, color, width }
  const [remoteLivedStrokes, setRemoteLiveStrokes] = useState<Map<string, { points: Point[], color: string, width: number }>>(new Map());
  const [brushColor, setBrushColor] = useState('#2D2926');
  const [brushWidth, setBrushWidth] = useState(3);
  const [tool, setTool] = useState<'brush' | 'eraser' | 'select'>('brush');

  const getCanvasPoint = useCallback((e: React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX: number, clientY: number;

    if ('touches' in e) {
      const touch = e.touches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const point = getCanvasPoint(e);
    if (!point) return;

    setIsDrawing(true);
    // Generate new ID for this stroke
    currentStrokeIdRef.current = crypto.randomUUID();
    setCurrentStroke([point]);

    // Notify start (optional, treated as first point)
    if (onDrawPoint) {
      const color = tool === 'eraser' ? '#F8F6F3' : brushColor;
      const width = tool === 'eraser' ? brushWidth * 3 : brushWidth;
      onDrawPoint(point, currentStrokeIdRef.current, color, width);
    }
  }, [getCanvasPoint, onDrawPoint, tool, brushColor, brushWidth]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;

    const point = getCanvasPoint(e);
    if (!point) return;

    setCurrentStroke(prev => [...prev, point]);

    // Broadcast point
    if (onDrawPoint) {
      const color = tool === 'eraser' ? '#F8F6F3' : brushColor;
      const width = tool === 'eraser' ? brushWidth * 3 : brushWidth;
      onDrawPoint(point, currentStrokeIdRef.current, color, width);
    }
  }, [isDrawing, getCanvasPoint, onDrawPoint, tool, brushColor, brushWidth]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing || currentStroke.length === 0) return;

    const newStroke: Stroke = {
      id: currentStrokeIdRef.current,
      points: currentStroke,
      color: tool === 'eraser' ? '#F8F6F3' : brushColor,
      width: tool === 'eraser' ? brushWidth * 3 : brushWidth,
      userId: 'current-user',
    };

    setStrokes(prev => [...prev, newStroke]);
    setCurrentStroke([]);
    setIsDrawing(false);

    // Broadcast full stroke
    if (onDrawStroke) {
      onDrawStroke(newStroke);
    }
  }, [isDrawing, currentStroke, brushColor, brushWidth, tool, onDrawStroke]);

  const clearCanvas = useCallback(() => {
    setStrokes([]);
    setCurrentStroke([]);
    setRemoteLiveStrokes(new Map());

    if (onClear) {
      onClear();
    }
  }, [onClear]);

  const undo = useCallback(() => {
    setStrokes(prev => prev.slice(0, -1));

    if (onUndo) {
      onUndo();
    }
  }, [onUndo]);

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, points: Point[], color: string, width: number) => {
    if (points.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.moveTo(points[0].x, points[0].y);

    // Smooth the line using quadratic curves
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }

    // Last point
    if (points.length > 1) {
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    }

    ctx.stroke();
  }, []);

  // Redraw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#F8F6F3';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#E8E4DF';
    ctx.lineWidth = 0.5;
    const gridSize = 24;

    for (let x = 0; x <= canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (let y = 0; y <= canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw all strokes
    strokes.forEach(stroke => {
      drawStroke(ctx, stroke.points, stroke.color, stroke.width);
    });

    // Draw remote live strokes
    remoteLivedStrokes.forEach(stroke => {
      drawStroke(ctx, stroke.points, stroke.color, stroke.width);
    });

    // Draw current stroke
    if (currentStroke.length > 0) {
      const color = tool === 'eraser' ? '#F8F6F3' : brushColor;
      const width = tool === 'eraser' ? brushWidth * 3 : brushWidth;
      drawStroke(ctx, currentStroke, color, width);
    }
  }, [strokes, currentStroke, remoteLivedStrokes, brushColor, brushWidth, tool, drawStroke]);

  // Methods for handling remote updates
  const drawRemoteStroke = useCallback((stroke: Stroke) => {
    setStrokes(prev => [...prev, stroke]);
    // Remove from live strokes if it was there
    setRemoteLiveStrokes(prev => {
      const newMap = new Map(prev);
      newMap.delete(stroke.id);
      // Also try to delete if key might be missing (not robust but okay)
      return newMap;
    });
  }, []);

  const drawRemotePoint = useCallback((point: Point, strokeId: string, color: string, width: number) => {
    setRemoteLiveStrokes(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(strokeId);

      if (existing) {
        newMap.set(strokeId, {
          ...existing,
          points: [...existing.points, point]
        });
      } else {
        newMap.set(strokeId, {
          points: [point],
          color,
          width
        });
      }
      return newMap;
    });
  }, []);

  const clearCanvasRemote = useCallback(() => {
    setStrokes([]);
    setRemoteLiveStrokes(new Map());
  }, []);

  const undoRemote = useCallback(() => {
    setStrokes(prev => prev.slice(0, -1));
  }, []);

  const setInitialStrokes = useCallback((initialStrokes: Stroke[]) => {
    setStrokes(initialStrokes);
  }, []);

  return {
    canvasRef,
    isDrawing,
    strokes,
    brushColor,
    setBrushColor,
    brushWidth,
    setBrushWidth,
    tool,
    setTool,
    startDrawing,
    draw,
    stopDrawing,
    clearCanvas,
    undo,
    // Export remote handlers
    drawRemoteStroke,
    drawRemotePoint,
    clearCanvasRemote,
    undoRemote,
    setInitialStrokes,
  };
};
