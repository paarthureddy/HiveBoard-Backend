import { useState, useCallback, useRef, useEffect } from 'react';

import { Stroke, Point } from '@/types/canvas';

export interface UseCanvasOptions {
  onDrawStroke?: (stroke: Stroke) => void;
  onDrawPoint?: (point: Point, strokeId: string, color: string, width: number) => void;
  onClear?: () => void;
  onUndo?: () => void;
  onViewUpdate?: (scale: number, offset: Point) => void;
}

export const useCanvas = (options: UseCanvasOptions = {}) => {
  const { onDrawStroke, onDrawPoint, onClear, onUndo, onViewUpdate } = options;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const currentStrokeIdRef = useRef<string>(crypto.randomUUID());

  // Track remote live strokes: strokeId -> { points, color, width }
  const [remoteLivedStrokes, setRemoteLiveStrokes] = useState<Map<string, { points: Point[], color: string, width: number }>>(new Map());
  const [brushColor, setBrushColor] = useState('#1e1e1e');
  const [brushWidth, setBrushWidth] = useState(3);
  const [tool, setTool] = useState<'brush' | 'eraser' | 'select' | 'sticky' | 'text'>('brush');

  // Viewport/Camera state (Refs for performance)
  // We keep refs for the render loop to avoid re-renders on every mouse move
  const scaleRef = useRef(0.55);
  const offsetRef = useRef<Point>({ x: 0, y: 0 });
  const [scaleUI, setScaleUI] = useState(0.55); // Read-only for UI display

  // Request Animation Frame control
  const requestRedrawRef = useRef<() => void>(() => { });

  // Handle Window Resize & Canvas Size with DPI Support
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const dpr = window.devicePixelRatio || 1;
        const rect = parent.getBoundingClientRect();

        // Physical Resolution
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        if (gridCanvasRef.current) {
          gridCanvasRef.current.width = rect.width * dpr;
          gridCanvasRef.current.height = rect.height * dpr;
        }

        // Logical Resolution (CSS) stays handled by CSS styles (w-full h-full)
        // But for context scaling, we need to know this.

        requestRedrawRef.current();
      }
    };

    handleResize(); // Initial size
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Convert Screen Coordinates (Event ClientXY) to World Coordinates
  const getCanvasPoint = useCallback((e: React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      const touch = e.touches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // CSS pixels relative to canvas
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    // View Transform: Screen = (World * Scale) + Offset
    // World = (Screen - Offset) / Scale

    // Note: We use offsetRef in CSS-pixel units for convenience
    const scale = scaleRef.current;
    const offset = offsetRef.current;

    return {
      x: (screenX - offset.x) / scale,
      y: (screenY - offset.y) / scale,
    };
  }, []); // Logic relies on refs, so dependencies are minimal

  // --- Drawing Handlers ---

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Only Draw if Left Click or Touch
    // (Caller usually verifies button, but we double check)
    if ('button' in e && (e.button === 1 || e.button === 2)) return;

    // If Sticky tool, Text tool, or Select tool is active, don't draw strokes.
    if (tool === 'sticky' || tool === 'text' || tool === 'select') return;

    const point = getCanvasPoint(e);
    if (!point) return;

    setIsDrawing(true);
    currentStrokeIdRef.current = crypto.randomUUID();
    setCurrentStroke([point]);

    if (onDrawPoint) {
      const color = tool === 'eraser' ? '#F8F6F3' : brushColor;
      const width = tool === 'eraser' ? brushWidth * 3 : brushWidth;
      onDrawPoint(point, currentStrokeIdRef.current, color, width);
    }
    requestRedrawRef.current();
  }, [getCanvasPoint, onDrawPoint, tool, brushColor, brushWidth]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    if (tool === 'sticky' || tool === 'text' || tool === 'select') return;

    const point = getCanvasPoint(e);
    if (!point) return;

    setCurrentStroke(prev => {
      // Small optimization: don't add duplicate points if very close?
      // For now, raw input is fine.
      return [...prev, point];
    });

    if (onDrawPoint) {
      const color = tool === 'eraser' ? '#F8F6F3' : brushColor;
      const width = tool === 'eraser' ? brushWidth * 3 : brushWidth;
      onDrawPoint(point, currentStrokeIdRef.current, color, width);
    }
    requestRedrawRef.current();
  }, [isDrawing, getCanvasPoint, onDrawPoint, tool, brushColor, brushWidth]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing || currentStroke.length === 0) return;
    // If Sticky tool, Text tool, or Select tool is active, don't draw strokes.
    if (tool === 'sticky' || tool === 'text' || tool === 'select') return;

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

    if (onDrawStroke) {
      onDrawStroke(newStroke);
    }
    requestRedrawRef.current();
  }, [isDrawing, currentStroke, brushColor, brushWidth, tool, onDrawStroke]);

  // --- Render Loop ---

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const scale = scaleRef.current;
    const offset = offsetRef.current;

    ctx.save();

    // Clear in Device Pixels
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Transparent for background texture


    // Apply Camera Transform
    // Canvas is W*DPR wide. 
    // We want to operate in logical CSS-pixel World Space.
    ctx.translate(offset.x * dpr, offset.y * dpr);
    ctx.scale(scale * dpr, scale * dpr);

    // Grid Optimization
    // Visible viewport in World Coordinates
    const canvasCssWidth = canvas.width / dpr;
    const canvasCssHeight = canvas.height / dpr;
    const viewportLeft = -offset.x / scale;
    const viewportTop = -offset.y / scale;
    const viewportRight = (canvasCssWidth - offset.x) / scale;
    const viewportBottom = (canvasCssHeight - offset.y) / scale;

    // Grid drawing disabled
    // const gridCanvas = gridCanvasRef.current;
    // if (gridCanvas) {
    //   const gCtx = gridCanvas.getContext('2d');
    //   if (gCtx) {
    //     gCtx.setTransform(1, 0, 0, 1, 0, 0);
    //     gCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);

    //     gCtx.translate(offset.x * dpr, offset.y * dpr);
    //     gCtx.scale(scale * dpr, scale * dpr);

    //     gCtx.strokeStyle = '#E8E4DF';
    //     gCtx.lineWidth = 0.5 / scale;
    //     const gridSize = 24;

    //     const startX = Math.floor(viewportLeft / gridSize) * gridSize;
    //     const startY = Math.floor(viewportTop / gridSize) * gridSize;

    //     gCtx.beginPath();
    //     for (let x = startX; x <= viewportRight; x += gridSize) {
    //       gCtx.moveTo(x, viewportTop);
    //       gCtx.lineTo(x, viewportBottom);
    //     }
    //     for (let y = startY; y <= viewportBottom; y += gridSize) {
    //       gCtx.moveTo(viewportLeft, y);
    //       gCtx.lineTo(viewportRight, y);
    //     }
    //     gCtx.stroke();
    //   }
    // }

    // Painting Helper
    const paintStroke = (stroke: Stroke) => {
      const { points, color, width, rotation, center } = stroke;
      if (points.length < 2) return;

      ctx.save();

      // Apply rotation if present
      if (rotation && center) {
        ctx.translate(center.x, center.y);
        ctx.rotate(rotation);
        ctx.translate(-center.x, -center.y);
      }

      ctx.beginPath();

      const isEraser = color === '#F8F6F3';
      if (isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
      }

      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      if (points.length > 1) {
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      }
      ctx.stroke();

      // Reset composite operation
      ctx.stroke();

      // Reset composite operation
      ctx.restore(); // Restore from rotation/style
    };

    // Draw Strokes
    strokes.forEach(s => paintStroke(s));
    remoteLivedStrokes.forEach(s => paintStroke({ ...s, id: 'remote', userId: 'remote' } as Stroke)); // Casting for now/handling remote structure

    // Logic for current stroke color
    const color = tool === 'eraser' ? '#F8F6F3' : brushColor;
    const width = tool === 'eraser' ? brushWidth * 5 : brushWidth;
    // Temporary stroke object for rendering
    paintStroke({
      id: 'current',
      userId: 'me',
      points: currentStroke,
      color,
      width
    });
    ctx.restore();


    // Sync View with HTML Layer
    if (onViewUpdate) {
      onViewUpdate(scale, offset);
    }

  }, [strokes, currentStroke, remoteLivedStrokes, tool, brushColor, brushWidth, onViewUpdate]);

  // Hook render into animation frame
  useEffect(() => {
    requestRedrawRef.current = () => window.requestAnimationFrame(render);
    // Trigger initial render
    requestRedrawRef.current();
  }, [render]);

  // --- View Control Methods ---

  const pan = useCallback((dx: number, dy: number) => {
    offsetRef.current.x += dx;
    offsetRef.current.y += dy;
    requestRedrawRef.current();
  }, []);

  const zoom = useCallback((delta: number, center?: { x: number, y: number }) => {
    const scale = scaleRef.current;
    let newScale = scale + delta;
    newScale = Math.min(Math.max(newScale, 0.05), 5); // Clamping

    if (center) {
      const offset = offsetRef.current;
      const worldX = (center.x - offset.x) / scale;
      const worldY = (center.y - offset.y) / scale;

      const newOffsetX = center.x - worldX * newScale;
      const newOffsetY = center.y - worldY * newScale;

      offsetRef.current = { x: newOffsetX, y: newOffsetY };
    }

    scaleRef.current = newScale;
    setScaleUI(newScale); // Sync UI state
    requestRedrawRef.current();
  }, []);

  const setZoomLevel = useCallback((newScale: number, center?: { x: number, y: number }) => {
    newScale = Math.min(Math.max(newScale, 0.05), 5); // Clamping

    if (center) {
      const scale = scaleRef.current;
      const offset = offsetRef.current;
      const worldX = (center.x - offset.x) / scale;
      const worldY = (center.y - offset.y) / scale;

      const newOffsetX = center.x - worldX * newScale;
      const newOffsetY = center.y - worldY * newScale;

      offsetRef.current = { x: newOffsetX, y: newOffsetY };
    }

    scaleRef.current = newScale;
    setScaleUI(newScale); // Sync UI state
    requestRedrawRef.current();
  }, []);

  // --- Standard Actions ---
  const clearCanvas = useCallback(() => {
    setStrokes([]);
    setCurrentStroke([]);
    setRemoteLiveStrokes(new Map());
    if (onClear) onClear();
    requestRedrawRef.current();
  }, [onClear]);

  const undo = useCallback(() => {
    setStrokes(prev => prev.slice(0, -1));
    if (onUndo) onUndo();
    requestRedrawRef.current();
  }, [onUndo]);

  const drawRemoteStroke = useCallback((stroke: Stroke) => {
    setStrokes(prev => [...prev, stroke]);
    setRemoteLiveStrokes(prev => {
      const newMap = new Map(prev);
      newMap.delete(stroke.id);
      return newMap;
    });
  }, []);

  const drawRemotePoint = useCallback((point: Point, strokeId: string, color: string, width: number) => {
    setRemoteLiveStrokes(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(strokeId);
      if (existing) {
        newMap.set(strokeId, { ...existing, points: [...existing.points, point] });
      } else {
        newMap.set(strokeId, { points: [point], color, width });
      }
      return newMap;
    });
  }, []);

  const clearCanvasRemote = useCallback(() => {
    setStrokes([]);
    setRemoteLiveStrokes(new Map());
    requestRedrawRef.current();
  }, []);

  const undoRemote = useCallback(() => {
    setStrokes(prev => prev.slice(0, -1));
    requestRedrawRef.current();
  }, []);

  const setInitialStrokes = useCallback((initialStrokes: Stroke[]) => {
    setStrokes(initialStrokes);
    requestRedrawRef.current();
  }, []);

  const updateStroke = useCallback((id: string, updates: Partial<Stroke>) => {
    setStrokes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    requestRedrawRef.current();
  }, []);

  return {
    canvasRef,
    gridCanvasRef,
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
    drawRemoteStroke,
    drawRemotePoint,
    clearCanvasRemote,
    undoRemote,

    setInitialStrokes,
    updateStroke,
    setStrokes,

    getCanvasPoint, // Exposed helper

    // View Controls
    scale: scaleUI, // Read-only state for UI
    pan,            // Direct Ref mutation
    zoom,           // Direct Ref mutation
    setZoomLevel,    // Direct Ref mutation

    // Low-level Ref access if truly needed by component
    scaleRef,
    offsetRef
  };
};
