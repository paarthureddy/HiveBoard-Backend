import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCanvas } from "@/hooks/useCanvas";
import { useAuth } from "@/contexts/AuthContext";
import { useGuest } from "@/contexts/GuestContext";
import { useSocket } from "@/hooks/useSocket";
import { joinRoom, leaveRoom, sendStroke, sendPoint, sendClearCanvas, sendUndo, requestCanvasState } from "@/lib/socket";
import { meetingsAPI } from "@/lib/api";
import Toolbar from "@/components/canvas/Toolbar";
import ChatPanel from "@/components/canvas/ChatPanel";
import AiChatPanel from "@/components/canvas/AiChatPanel";
import UserPresence from "@/components/canvas/UserPresence";
import ParticipantsList from "@/components/ParticipantsList";
import ShareModal from "@/components/ShareModal";
import LoginPromptModal from "@/components/LoginPromptModal";
import { User, ChatMessage, PRESENCE_COLORS } from "@/types/canvas";
import type { Participant } from "@/types/room";
import {
  Palette,
  Share2,
  Download,
  MoreHorizontal,
  Lock,
  LogIn,
  Loader2,
  Eye,
} from "lucide-react";



const MOCK_MESSAGES: ChatMessage[] = [
  { id: '1', userId: '2', userName: 'Emma Chen', content: 'Love the new silhouette direction! 🎨', timestamp: new Date(Date.now() - 300000) },
  { id: '2', userId: '1', userName: 'You', content: 'Thanks! Working on the sleeve details now.', timestamp: new Date(Date.now() - 240000) },
  { id: '3', userId: '3', userName: 'Lucas M.', content: 'The fabric drape looks perfect', timestamp: new Date(Date.now() - 60000) },
];

const Canvas = () => {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { guestUser, isGuest } = useGuest();
  const isReadOnly = !isAuthenticated;

  const {
    canvasRef,
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

  // Get meeting ID from URL
  const searchParams = new URLSearchParams(location.search);
  const meetingId = searchParams.get('meetingId');
  const roomIdParam = searchParams.get('roomId');

  // Setup Socket.io
  useSocket({
    onRoomJoined: (data) => {
      console.log('✅ Room joined:', data);
      setParticipants(data.participants);
    },
    onUserJoined: (data) => {
      console.log('👤 User joined:', data);
      setParticipants(data.participants);
    },
    onUserLeft: (data) => {
      console.log('👋 User left:', data);
      setParticipants(data.participants);
    },
    onCanvasUpdated: (data) => {
      console.log('🎨 Canvas updated by another user:', data);
      // TODO: Apply canvas updates from other users
    },
    onStrokeDrawn: (data) => {
      drawRemoteStroke(data.stroke);
    },
    onPointDrawn: (data) => {
      drawRemotePoint(data.point, data.strokeId, data.color, data.width);
    },
    onCanvasCleared: () => {
      clearCanvasRemote();
    },
    onStrokeUndone: () => {
      undoRemote();
    },
    onCanvasState: (data) => {
      setInitialStrokes(data.strokes);
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
          // Guests fetch from public endpoint
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

  // Join Socket.io room
  useEffect(() => {
    if (!meetingId) return;

    const roomIdToJoin = roomIdParam || `room-${meetingId}`;
    setRoomId(roomIdToJoin);

    console.log('🔌 Joining room:', roomIdToJoin);

    // Join room with user or guest info
    joinRoom({
      roomId: roomIdToJoin,
      meetingId,
      userId: user?._id,
      guestId: guestUser?.guestId,
      name: user?.name || guestUser?.guestName || 'Anonymous',
      role: user ? 'owner' : 'guest',
    });

    // Request initial canvas state
    if (meetingId) {
      requestCanvasState({ meetingId });
    }

    // Leave room on unmount
    return () => {
      console.log('👋 Leaving room:', roomIdToJoin);
      leaveRoom();
    };
  }, [meetingId, roomIdParam, user, guestUser]);

  // Resize canvas to fill container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [canvasRef]);

  // Handle edit attempts for guests
  const handleEditAttempt = () => {
    if (isReadOnly) {
      setShowLoginPrompt(true);
      return false;
    }
    return true;
  };

  // Wrap drawing functions to check permissions
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
  };

  const handleUndo = () => {
    if (!handleEditAttempt()) return;
    undo();
  };

  const handleSendMessage = (content: string) => {
    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      userId: '1',
      userName: user?.name || guestUser?.guestName || 'You',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
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
      {/* Read-only banner for guests */}
      {isReadOnly && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500/90 text-yellow-950 px-4 py-2 text-center text-sm font-medium">
          <Eye className="w-4 h-4 inline mr-2" />
          You're viewing in read-only mode.
          <button
            onClick={() => setShowLoginPrompt(true)}
            className="ml-2 underline font-semibold hover:text-yellow-900"
          >
            Login to edit
          </button>
        </div>
      )}

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`h-14 px-4 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-sm z-20 ${isReadOnly ? 'mt-10' : ''}`}
      >
        {/* Left side */}
        <div className="flex items-center gap-4">
          <Link to={isAuthenticated ? "/home" : "/"} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-gradient-rose flex items-center justify-center">
              <Palette className="w-4 h-4 text-primary-foreground" />
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
              <>
                <h1 className="font-display font-semibold text-lg">{sessionName}</h1>
                {isLocked && (
                  <Lock className="w-4 h-4 text-muted-foreground" />
                )}
              </>
            )}
          </div>
        </div>

        {/* Center - User Presence */}
        <UserPresence
          users={participants.map((p, i) => ({
            id: p.userId || p.guestId || p.socketId,
            name: p.name,
            role: p.isOwner ? 'owner' : (p.userId ? 'editor' : 'viewer'),
            color: PRESENCE_COLORS[i % PRESENCE_COLORS.length],
            isOnline: true,
          }))}
          currentUserId={user?._id || guestUser?.guestId || ''}
        />

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-2" onClick={handleShare}>
            <Share2 className="w-4 h-4" />
            Share
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={handleExport}>
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon-sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
          {!isAuthenticated && (
            <>
              <div className="h-6 w-px bg-border mx-1" />
              <Button variant="elegant" size="sm" asChild>
                <Link to="/auth">
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Link>
              </Button>
            </>
          )}
        </div>
      </motion.header>

      {/* Canvas Area */}
      <div className="flex-1 relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="absolute inset-0"
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleStartDrawing}
            onMouseMove={handleDraw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={handleStartDrawing}
            onTouchMove={handleDraw}
            onTouchEnd={stopDrawing}
            className={`w-full h-full touch-none ${isReadOnly ? 'cursor-not-allowed' : 'cursor-crosshair'}`}
          />
        </motion.div>

        {/* Toolbar */}
        <Toolbar
          tool={tool}
          setTool={(newTool) => {
            if (!handleEditAttempt()) return;
            setTool(newTool);
          }}
          brushColor={brushColor}
          setBrushColor={(color) => {
            if (!handleEditAttempt()) return;
            setBrushColor(color);
          }}
          brushWidth={brushWidth}
          setBrushWidth={(width) => {
            if (!handleEditAttempt()) return;
            setBrushWidth(width);
          }}
          onUndo={handleUndo}
          onClear={handleClearCanvas}
        />

        {/* Participants List */}
        {participants.length > 0 && (
          <ParticipantsList
            participants={participants}
            currentUserId={user?._id}
            currentGuestId={guestUser?.guestId}
          />
        )}

        <ChatPanel
          messages={messages}
          users={participants.map((p, i) => ({
            id: p.userId || p.guestId || p.socketId,
            name: p.name,
            role: p.isOwner ? 'owner' : (p.userId ? 'editor' : 'viewer'),
            color: PRESENCE_COLORS[i % PRESENCE_COLORS.length],
            isOnline: true,
          }))}
          currentUserId={user?._id || guestUser?.guestId || ''}
          onSendMessage={handleSendMessage}
          isOpen={isChatOpen}
          onToggle={() => {
            setIsChatOpen(!isChatOpen);
            if (!isChatOpen) setIsAiChatOpen(false);
          }}
        />

        {/* AI Chat Panel */}
        <AiChatPanel
          isOpen={isAiChatOpen}
          onToggle={() => {
            setIsAiChatOpen(!isAiChatOpen);
            if (!isAiChatOpen) setIsChatOpen(false);
          }}
        />
      </div>

      {/* Login Prompt Modal */}
      <LoginPromptModal
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        onSuccess={() => {
          setShowLoginPrompt(false);
          // Refresh the page to update auth state
          window.location.reload();
        }}
      />

      {/* Share Modal */}
      {meetingId && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          meetingId={meetingId}
          meetingTitle={sessionName}
        />
      )}
    </div>
  );
};

export default Canvas;
