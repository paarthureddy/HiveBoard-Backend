import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCanvas } from "@/hooks/useCanvas";
import { useAuth } from "@/contexts/AuthContext";
import { useGuest } from "@/contexts/GuestContext";
import { useSocket } from "@/hooks/useSocket";
import { joinRoom, leaveRoom, sendStroke, sendPoint, sendClearCanvas, sendUndo, requestCanvasState, sendMessage } from "@/lib/socket";
import { meetingsAPI } from "@/lib/api";
import Toolbar from "@/components/canvas/Toolbar";
import ChatPanel from "@/components/canvas/ChatPanel";
import AiChatPanel from "@/components/canvas/AiChatPanel";
import UserPresence from "@/components/canvas/UserPresence";
import ParticipantsList from "@/components/ParticipantsList";
import ShareModal from "@/components/ShareModal";
import LoginPromptModal from "@/components/LoginPromptModal";
import { User, ChatMessage, PRESENCE_COLORS, StickyNote, TextItem, CroquisItem } from "@/types/canvas";
import type { Participant } from "@/types/room";
import logo from "@/assets/hive-logo.jpg";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import {
  Share2,
  Download,
  MoreHorizontal,
  Lock,
  LogIn,
  Loader2,
  Eye,
  Trash2,
  LockOpen,
  Copy,
  FlipHorizontal,
  Maximize2,
  AlignCenter,
} from "lucide-react";


const MOCK_MESSAGES: ChatMessage[] = [];

const Canvas = () => {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { guestUser, isGuest } = useGuest();
  const isReadOnly = !isAuthenticated;

  // Get meeting ID from URL
  const searchParams = new URLSearchParams(location.search);
  const meetingId = searchParams.get('meetingId');
  const roomIdParam = searchParams.get('roomId');

  // Sticky Note & Text & Croquis State
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);
  const [textItems, setTextItems] = useState<TextItem[]>([]);
  const [croquisItems, setCroquisItems] = useState<CroquisItem[]>([]);
  const [selectedCroquisId, setSelectedCroquisId] = useState<string | null>(null);

  const [stickyColor, setStickyColor] = useState('#fef3c7'); // Default yellow
  const overlayRef = useRef<HTMLDivElement>(null);
  const croquisLayerRef = useRef<HTMLDivElement>(null);

  // Destructure new view controls
  const {
    canvasRef,
    gridCanvasRef,
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
    scale, // Read-only state for display
    pan,   // Direct ref manipulation
    zoom,   // Direct ref manipulation
    getCanvasPoint,
    offsetRef,
    scaleRef // Exposed for math
  } = useCanvas({
    onDrawStroke: (stroke) => {
      // Broadcast stroke
      sendStroke({ meetingId: meetingId || undefined, stroke });
    },
    onDrawPoint: (point, strokeId, color, width) => {
      // Broadcast point
      sendPoint({ meetingId: meetingId || undefined, point, strokeId, color, width });
    },
    onClear: () => {
      sendClearCanvas({ meetingId: meetingId || undefined });
    },
    onUndo: () => {
      sendUndo({ meetingId: meetingId || undefined });
    },
    onViewUpdate: (scale, offset) => {
      const transform = `translate(${offset.x}px, ${offset.y}px) scale(${scale})`;
      if (overlayRef.current) {
        overlayRef.current.style.transform = transform;
        overlayRef.current.style.transformOrigin = '0 0';
      }
      if (croquisLayerRef.current) {
        croquisLayerRef.current.style.transform = transform;
        croquisLayerRef.current.style.transformOrigin = '0 0';
      }
    }
  });

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  const [sessionName, setSessionName] = useState("Loading...");
  const [isLocked] = useState(false);
  const [isLoadingMeeting, setIsLoadingMeeting] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [roomId, setRoomId] = useState<string>('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Pan/Zoom State
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Handle Spacebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false); // Stop panning if space released
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Mouse Handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // If clicking on UI, ignore (usually handled by stopProp, but just in case)
    // Middle mouse or Spacebar -> Pan
    if (e.button === 1 || isSpacePressed) {
      setIsPanning(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (e.button !== 0) return;

    // Sticky Note Tool
    if (tool === 'sticky') {
      const point = getCanvasPoint(e);
      if (point) {
        const newNote: StickyNote = {
          id: crypto.randomUUID(),
          x: point.x - 100, // Center
          y: point.y - 100,
          text: '',
          color: stickyColor,
          width: 200,
          height: 200
        };
        setStickyNotes(prev => [...prev, newNote]);
      }
      return;
    }

    // Text Tool
    if (tool === 'text') {
      const point = getCanvasPoint(e);
      if (point) {
        const newText: TextItem = {
          id: crypto.randomUUID(),
          x: point.x,
          y: point.y - 12,
          text: '',
          color: brushColor,
          fontSize: 24
        };
        setTextItems(prev => [...prev, newText]);
        setTool('select');
      }
      return;
    }

    // Select Tool handled by falling through to elements or Pan?
    if (tool === 'select') {
      // If we clicked empty space (canvas), treat as Pan?
      // Or deselect?
      setSelectedCroquisId(null);
      setIsPanning(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Left click -> Draw
    handleStartDrawing(e);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      pan(dx, dy);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      return;
    }
    handleDraw(e);
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    stopDrawing();
  };

  // Sticky Note Actions
  const handleNoteChange = (id: string, text: string) => {
    setStickyNotes(prev => prev.map(n => n.id === id ? { ...n, text } : n));
  };

  const handleNoteDelete = (id: string) => {
    setStickyNotes(prev => prev.filter(n => n.id !== id));
  };

  // Text Actions
  const handleTextChange = (id: string, text: string) => {
    setTextItems(prev => prev.map(t => t.id === id ? { ...t, text } : t));
  };

  const handleTextDelete = (id: string) => {
    setTextItems(prev => prev.filter(t => t.id !== id));
  };

  // Croquis Actions
  const handleAddCroquis = (src: string) => {
    const dpr = window.devicePixelRatio || 1;
    // Calculate center of view
    const canvasWidth = canvasRef.current ? canvasRef.current.width / dpr : window.innerWidth;
    const canvasHeight = canvasRef.current ? canvasRef.current.height / dpr : window.innerHeight;

    if (!offsetRef.current) return;

    const viewCenterX = -offsetRef.current.x / scale + (canvasWidth / scale / 2);
    const viewCenterY = -offsetRef.current.y / scale + (canvasHeight / scale / 2);

    const newItem: CroquisItem = {
      id: crypto.randomUUID(),
      src,
      x: viewCenterX - 150,
      y: viewCenterY - 300,
      width: 300,
      height: 600,
      opacity: 0.9,
      isLocked: false,
      isFlipped: false
    };

    setCroquisItems(prev => [...prev, newItem]);
    setSelectedCroquisId(newItem.id);
    setTool('select');
  };

  const updateCroquis = (id: string, updates: Partial<CroquisItem>) => {
    setCroquisItems(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  // Native Event Listeners for Non-Passive behavior
  const lastTouchPos = useRef<{ x: number, y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const zoomSensitivity = -0.001;
        const delta = e.deltaY * zoomSensitivity;
        const rect = canvas.getBoundingClientRect();
        const centerX = e.clientX - rect.left;
        const centerY = e.clientY - rect.top;
        zoom(delta, { x: centerX, y: centerY });
      } else {
        pan(-e.deltaX, -e.deltaY);
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        lastTouchPos.current = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2
        };
        return;
      }
      lastTouchPos.current = null;
      if (isReadOnly) {
        setShowLoginPrompt(true);
        return;
      }
      startDrawing(e as unknown as React.TouchEvent);
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2) {
        if (!lastTouchPos.current) return;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const centerX = (t1.clientX + t2.clientX) / 2;
        const centerY = (t1.clientY + t2.clientY) / 2;
        const dx = centerX - lastTouchPos.current.x;
        const dy = centerY - lastTouchPos.current.y;
        pan(dx, dy);
        lastTouchPos.current = { x: centerX, y: centerY };
        return;
      }
      if (isReadOnly) return;
      draw(e as unknown as React.TouchEvent);
    };

    const onTouchEnd = (e: TouchEvent) => {
      stopDrawing();
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [pan, zoom, startDrawing, draw, stopDrawing, isReadOnly]);


  // Setup Socket.io
  useSocket({
    onRoomJoined: (data) => setParticipants(data.participants),
    onUserJoined: (data) => setParticipants(data.participants),
    onUserLeft: (data) => setParticipants(data.participants),
    onCanvasUpdated: (data) => { console.log('Canvas updated', data); },
    onStrokeDrawn: (data) => drawRemoteStroke(data.stroke),
    onPointDrawn: (data) => drawRemotePoint(data.point, data.strokeId, data.color, data.width),
    onCanvasCleared: () => clearCanvasRemote(),
    onStrokeUndone: () => undoRemote(),
    onCanvasState: (data) => setInitialStrokes(data.strokes),
    onChatHistory: (history) => {
      setMessages(history.map((msg: any) => ({
        id: msg._id,
        userId: msg.userId || msg.guestId,
        userName: msg.userName,
        content: msg.content,
        timestamp: new Date(msg.timestamp)
      })));
    },
    onReceiveMessage: (msg: any) => {
      setMessages(prev => {
        // Dedup based on ID if necessary, mostly unlikely with randomUUID but DB has _id
        if (prev.some(m => m.id === msg._id)) return prev;
        return [...prev, {
          id: msg._id,
          userId: msg.userId || msg.guestId,
          userName: msg.userName,
          content: msg.content,
          timestamp: new Date(msg.timestamp)
        }];
      });
    },
  });

  // Fetch meeting data
  useEffect(() => {
    const fetchMeeting = async () => {
      if (!meetingId) {
        setSessionName("Untitled Session");
        setIsLoadingMeeting(false);
        return;
      }
      try {
        let meeting;
        if (isAuthenticated) {
          meeting = await meetingsAPI.getById(meetingId);
        } else {
          meeting = await meetingsAPI.getPublicById(meetingId);
        }
        setSessionName(meeting.title);
      } catch (error) {
        console.error('Error fetching meeting:', error);
        setSessionName("Untitled Session");
      } finally {
        setIsLoadingMeeting(false);
      }
    };
    fetchMeeting();
  }, [meetingId]);

  // Join Room
  useEffect(() => {
    if (!meetingId) return;
    const roomIdToJoin = roomIdParam || `room-${meetingId}`;
    setRoomId(roomIdToJoin);
    joinRoom({
      roomId: roomIdToJoin,
      meetingId,
      userId: user?._id,
      guestId: guestUser?.guestId,
      name: user?.name || guestUser?.guestName || 'Anonymous',
      role: user ? 'owner' : 'guest',
    });
    if (meetingId) requestCanvasState({ meetingId });
    return () => leaveRoom();
  }, [meetingId, roomIdParam, user, guestUser]);

  const handleEditAttempt = () => {
    if (isReadOnly) {
      setShowLoginPrompt(true);
      return false;
    }
    return true;
  };

  const handleStartDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!handleEditAttempt()) return;
    startDrawing(e);
  };
  const handleDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (isReadOnly) return;
    draw(e);
  };
  const handleClearCanvas = () => {
    if (!handleEditAttempt()) return;
    clearCanvas();
    setStickyNotes([]);
    setTextItems([]);
    setCroquisItems([]);
  };
  const handleUndo = () => {
    if (!handleEditAttempt()) return;
    undo();
  };

  const handleSendMessage = (content: string) => {
    sendMessage({
      meetingId: meetingId || undefined,
      userId: user?._id,
      guestId: guestUser?.guestId,
      name: user?.name || guestUser?.guestName || 'Anonymous',
      content
    });
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${sessionName.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleShare = () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }
    setShowShareModal(true);
  };

  return (
    <div className="h-screen flex flex-col bg-canvas-bg overflow-hidden">
      {isReadOnly && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500/90 text-yellow-950 px-4 py-2 text-center text-sm font-medium">
          <Eye className="w-4 h-4 inline mr-2" />
          You're viewing in read-only mode.
          <button onClick={() => setShowLoginPrompt(true)} className="ml-2 underline font-semibold">Login to edit</button>
        </div>
      )}

      <motion.header className={`h-14 px-4 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-sm z-20 ${isReadOnly ? 'mt-10' : ''}`}>
        <div className="flex items-center gap-4">
          <Link to={isAuthenticated ? "/home" : "/"} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden">
              <img src={logo} alt="HiveBoard Logo" className="w-full h-full object-cover" />
            </div>
          </Link>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            {isLoadingMeeting ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="font-display font-semibold text-lg text-muted-foreground">Loading...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2"><h1 className="font-display font-semibold text-lg">{sessionName}</h1>{isLocked && <Lock className="w-4 h-4 text-muted-foreground" />}</div>
            )}
          </div>
        </div>
        <UserPresence users={participants.map((p, i) => ({ id: p.userId || p.guestId || p.socketId, name: p.name, role: p.isOwner ? 'owner' : (p.userId ? 'editor' : 'viewer'), color: PRESENCE_COLORS[i % PRESENCE_COLORS.length], isOnline: true }))} currentUserId={user?._id || guestUser?.guestId || ''} />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-2" onClick={handleShare}><Share2 className="w-4 h-4" /> Share</Button>
          <Button variant="ghost" size="icon-sm" onClick={handleExport}><Download className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon-sm"><MoreHorizontal className="w-4 h-4" /></Button>
          {!isAuthenticated && <Button variant="elegant" size="sm" asChild><Link to="/auth"><LogIn className="w-4 h-4" /> Sign In</Link></Button>}
        </div>
      </motion.header>

      <div className="flex-1 relative overflow-hidden bg-canvas-bg"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
      >
        {/* HTML Overlay (Stickies/Text) - Z-20 */}
        <div ref={overlayRef} className="absolute inset-0 pointer-events-none z-20" style={{ transformOrigin: '0 0' }}>
          {stickyNotes.map(note => (
            <div key={note.id} className="absolute pointer-events-auto p-4 shadow-lg rounded-lg flex flex-col group" style={{ left: note.x, top: note.y, width: note.width || 200, height: note.height || 200, backgroundColor: note.color }}>
              <textarea className="w-full h-full bg-transparent resize-none outline-none font-handwriting text-lg text-gray-800 placeholder-gray-500/50" placeholder="Type here..." value={note.text} onChange={(e) => handleNoteChange(note.id, e.target.value)} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} />
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleNoteDelete(note.id)} className="p-1 hover:bg-black/10 rounded-full text-gray-600"><Trash2 className="w-4 h-4" /></button></div>
            </div>
          ))}
          {textItems.map(item => (
            <div key={item.id} className="absolute pointer-events-auto group min-w-[200px]" style={{ left: item.x, top: item.y }}>
              <textarea className="w-full bg-transparent resize-none outline-none font-sans text-2xl font-medium leading-tight text-foreground bg-background/50 backdrop-blur-[1px] rounded-lg px-2 py-1 border border-transparent hover:border-border/50 focus:border-primary/50 transition-colors" placeholder="Type text..." value={item.text} onChange={(e) => { handleTextChange(item.id, e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} style={{ color: item.color, height: 'auto', overflow: 'hidden' }} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} autoFocus />
              <button onClick={() => handleTextDelete(item.id)} className="absolute -top-3 -right-3 p-1.5 bg-background border border-border rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive text-muted-foreground"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
        </div>

        {/* Croquis Layer - Z-1 */}
        <div ref={croquisLayerRef} className="absolute inset-0 pointer-events-none z-1" style={{ transformOrigin: '0 0' }}>
          {croquisItems.map(item => (
            <div key={item.id} className={`absolute group pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`} style={{ left: item.x, top: item.y, width: item.width, height: item.height, opacity: item.opacity, transform: `scaleX(${item.isFlipped ? -1 : 1})` }}
              onMouseDown={(e) => {
                if (tool !== 'select' || item.isLocked) return;
                if (e.button !== 0) return;
                e.stopPropagation();
                setSelectedCroquisId(item.id);
                const startX = e.clientX;
                const startY = e.clientY;
                const startItemX = item.x;
                const startItemY = item.y;
                const onMove = (moveEvent: MouseEvent) => {
                  const scale = scaleRef.current || 1;
                  const dx = (moveEvent.clientX - startX) / scale;
                  const dy = (moveEvent.clientY - startY) / scale;
                  updateCroquis(item.id, { x: startItemX + dx, y: startItemY + dy });
                };
                const onUp = () => {
                  window.removeEventListener('mousemove', onMove);
                  window.removeEventListener('mouseup', onUp);
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
              }}
            >
              <img src={item.src} className={`w-full h-full object-contain ${selectedCroquisId === item.id ? 'ring-2 ring-primary ring-offset-2 rounded-lg' : ''}`} draggable={false} alt="Croquis" />
              {selectedCroquisId === item.id && (
                <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-popover/95 backdrop-blur border border-border rounded-xl shadow-xl flex items-center p-1.5 gap-2 z-50 pointer-events-auto min-w-[300px]" style={{ transform: `scaleX(${item.isFlipped ? -1 : 1})` }} onMouseDown={e => e.stopPropagation()}>
                  <div className="w-24 px-2 flex items-center gap-2"><Eye className="w-3 h-3 text-muted-foreground" /><Slider value={[item.opacity]} min={0.1} max={1} step={0.1} onValueChange={([v]) => updateCroquis(item.id, { opacity: v })} className="flex-1" /></div>
                  <div className="h-4 w-px bg-border" />
                  <button onClick={() => updateCroquis(item.id, { isLocked: !item.isLocked })} className={cn("p-1.5 hover:bg-muted rounded-lg transition-colors", item.isLocked && "text-destructive bg-destructive/10")} title="Lock">{item.isLocked ? <Lock className="w-4 h-4" /> : <LockOpen className="w-4 h-4" />}</button>
                  <button onClick={() => updateCroquis(item.id, { isFlipped: !item.isFlipped })} className={cn("p-1.5 hover:bg-muted rounded-lg transition-colors", item.isFlipped && "bg-muted text-primary")} title="Flip Horizontal"><FlipHorizontal className="w-4 h-4" /></button>
                  <button onClick={() => { const newItem = { ...item, id: crypto.randomUUID(), x: item.x + 30, y: item.y + 30 }; setCroquisItems(prev => [...prev, newItem]); setSelectedCroquisId(newItem.id); }} className="p-1.5 hover:bg-muted rounded-lg transition-colors" title="Duplicate"><Copy className="w-4 h-4" /></button>
                  <div className="h-4 w-px bg-border" />
                  <button onClick={() => {
                    const dpr = window.devicePixelRatio || 1;
                    const canvasWidth = canvasRef.current ? canvasRef.current.width / dpr : window.innerWidth;
                    const canvasHeight = canvasRef.current ? canvasRef.current.height / dpr : window.innerHeight;
                    if (!offsetRef.current) return;
                    const viewCenterX = -offsetRef.current.x / scale + (canvasWidth / scale / 2);
                    const viewCenterY = -offsetRef.current.y / scale + (canvasHeight / scale / 2);
                    updateCroquis(item.id, { x: viewCenterX - item.width / 2, y: viewCenterY - item.height / 2 });
                  }} className="p-1.5 hover:bg-muted rounded-lg transition-colors" title="Snap to Center"><AlignCenter className="w-4 h-4" /></button>
                  <button onClick={() => updateCroquis(item.id, { width: 300, height: 600 })} className="p-1.5 hover:bg-muted rounded-lg transition-colors" title="Reset Scale"><Maximize2 className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          ))}
        </div>

        <motion.div className="absolute inset-0 pointer-events-none">
          {/* Grid Canvas - Z-0 */}
          <canvas ref={gridCanvasRef} className="absolute inset-0 pointer-events-none z-0" />
          {/* Main Drawing Canvas - Z-10 */}
          <canvas ref={canvasRef} className={`w-full h-full touch-none ${tool === 'select' ? 'pointer-events-none' : (isPanning || isSpacePressed ? 'cursor-grab active:cursor-grabbing' : isReadOnly ? 'cursor-not-allowed' : 'cursor-crosshair')}`} />
        </motion.div>

        <div className="absolute top-4 right-4 bg-card/80 backdrop-blur-sm border border-border rounded-full px-3 py-1.5 text-xs font-mono text-muted-foreground select-none pointer-events-none z-30">{(scale * 100).toFixed(0)}%</div>

        <Toolbar tool={tool} setTool={(newTool) => { if (!handleEditAttempt()) return; setTool(newTool); }} brushColor={brushColor} setBrushColor={(color) => { if (!handleEditAttempt()) return; setBrushColor(color); }} brushWidth={brushWidth} setBrushWidth={(width) => { if (!handleEditAttempt()) return; setBrushWidth(width); }} stickyColor={stickyColor} setStickyColor={setStickyColor} onUndo={handleUndo} onClear={handleClearCanvas} onAddCroquis={handleAddCroquis} />
        {participants.length > 0 && <ParticipantsList participants={participants} currentUserId={user?._id} currentGuestId={guestUser?.guestId} />}
        <ChatPanel messages={messages} users={participants.map((p, i) => ({ id: p.userId || p.guestId || p.socketId, name: p.name, role: p.isOwner ? 'owner' : (p.userId ? 'editor' : 'viewer'), color: PRESENCE_COLORS[i % PRESENCE_COLORS.length], isOnline: true }))} currentUserId={user?._id || guestUser?.guestId || ''} onSendMessage={handleSendMessage} isOpen={isChatOpen} onToggle={() => { setIsChatOpen(!isChatOpen); if (!isChatOpen) setIsAiChatOpen(false); }} />
        <AiChatPanel isOpen={isAiChatOpen} onToggle={() => { setIsAiChatOpen(!isAiChatOpen); if (!isAiChatOpen) setIsChatOpen(false); }} />
      </div>

      <LoginPromptModal isOpen={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} onSuccess={() => { setShowLoginPrompt(false); window.location.reload(); }} />
      {meetingId && <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} meetingId={meetingId} meetingTitle={sessionName} />}
    </div>
  );
};

export default Canvas;
