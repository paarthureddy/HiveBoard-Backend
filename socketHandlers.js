import Room from './models/Room.js';
import Meeting from './models/Meeting.js';
import Message from './models/Message.js';
import ActivityService from './services/ActivityService.js';

/**
 * Configure all Socket.io event listeners for real-time functionality.
 * This handles room management, live drawing, chat, participants,
 * and session activity tracking.
 */
export const setupSocketHandlers = (io) => {
    // Listen for new client connections
    io.on('connection', (socket) => {
        console.log(` Client connected: ${socket.id}`);

        /**
         * Event: join-room
         * Handles a user joining a specific meeting room.
         * - Creates the room in DB if it doesn't exist
         * - Adds the user to the participant list
         * - Emits current chat history and participant list to the user
         * - Notifies other users in the room
         * - Starts a SessionActivity record for analytics
         */
        socket.on('join-room', async (data) => {
            try {
                const { roomId, meetingId, userId, guestId, name, role } = data;

                // Check if socket is already in a different room and leave it
                if (socket.roomId && socket.roomId !== roomId) {
                    console.log(`🔌 Socket ${socket.id} switching from room ${socket.roomId} to ${roomId}`);
                    socket.leave(socket.roomId);

                    // Close the previous session (if any)
                    if (socket.activitySessionId) {
                        await ActivityService.endSession(socket.activitySessionId);
                        socket.activitySessionId = null;
                    }

                    // Remove from previous room's active connections in DB
                    try {
                        const previousRoom = await Room.findOne({ roomId: socket.roomId });
                        if (previousRoom) {
                            previousRoom.removeConnection(socket.id);
                            await previousRoom.save();

                            // Notify previous room
                            const prevParticipants = previousRoom.activeConnections.map(conn => ({
                                socketId: conn.socketId,
                                userId: conn.userId,
                                guestId: conn.guestId,
                                name: conn.name,
                                isOwner: conn.userId && conn.userId.toString() === previousRoom.owner.toString(),
                            }));

                            socket.to(socket.roomId).emit('user-left', {
                                socketId: socket.id,
                                participants: prevParticipants,
                            });
                        }
                    } catch (err) {
                        console.error('Error leaving previous room:', err);
                    }
                }

                // Join the socket.io room
                socket.join(roomId);

                // Find or create room in MongoDB for tracking participants
                let room = await Room.findOne({ roomId });

                if (!room && meetingId) {
                    // Create new room if it doesn't exist
                    const meeting = await Meeting.findById(meetingId);
                    if (meeting) {
                        room = await Room.create({
                            meetingId,
                            roomId,
                            owner: meeting.createdBy,
                        });
                    }
                }

                if (room) {
                    // Clean up duplicate connections and remove dead sockets
                    const ioRoom = io.sockets.adapter.rooms.get(roomId);
                    const initialCount = room.activeConnections.length;
                    room.activeConnections = room.activeConnections.filter(conn => {
                        // Check if the socket is actually in the room adapter
                        if (!ioRoom || !ioRoom.has(conn.socketId)) return false;
                        if (conn.socketId === socket.id) return false;
                        if (userId && conn.userId && conn.userId.toString() === userId.toString()) return false;
                        if (guestId && conn.guestId === guestId) return false;
                        return true;
                    });

                    if (room.activeConnections.length !== initialCount) {
                        console.log(`🧹 Creating room: Removed ${initialCount - room.activeConnections.length} duplicate connections`);
                    }

                    // Add connection to active connections
                    room.addConnection({
                        socketId: socket.id,
                        userId: userId || null,
                        guestId: guestId || null,
                        name: name || 'Anonymous',
                    });

                    // Add participant if not already added
                    room.addParticipant({
                        userId: userId || null,
                        guestId: guestId || null,
                        name: name || 'Anonymous',
                        role: role || 'guest',
                    });

                    await room.save();

                    // Store room info in socket
                    socket.roomId = roomId;
                    socket.meetingId = meetingId;
                    socket.userId = userId;
                    socket.guestId = guestId;
                    socket.userName = name;

                    // ── Activity Tracking: Start session ──────────────────────────
                    const effectiveRole = userId && userId.toString() === room.owner.toString()
                        ? 'owner'
                        : role || 'guest';

                    const activitySession = await ActivityService.startSession({
                        meetingId,
                        userId,
                        guestId,
                        participantName: name || 'Anonymous',
                        role: effectiveRole,
                        socketId: socket.id,
                    });
                    socket.activitySessionId = activitySession?._id ?? null;
                    // ─────────────────────────────────────────────────────────────

                    // Get chat history
                    const messages = await Message.find({ roomId })
                        .sort({ timestamp: -1 })
                        .limit(50);

                    // Emit history reversed (oldest first)
                    socket.emit('chat-history', messages.reverse());

                    // Get all active participants
                    const participants = room.activeConnections.map(conn => ({
                        socketId: conn.socketId,
                        userId: conn.userId ? conn.userId.toString() : null,
                        guestId: conn.guestId,
                        name: conn.name || 'Anonymous',
                        isOwner: conn.userId && conn.userId.toString() === room.owner.toString(),
                    }));

                    console.log('📊 Active Connections in DB:', room.activeConnections.length);
                    console.log('📋 Generated Participants List:', participants);

                    // Notify user they joined
                    socket.emit('room-joined', {
                        roomId,
                        participants,
                        role: userId && userId.toString() === room.owner.toString() ? 'owner' : role || 'guest',
                    });

                    // Load Data from Meeting (Canvas State)
                    const meeting = await Meeting.findById(meetingId);
                    if (meeting && meeting.canvasData) {
                        // Send existing canvas state to the user who joined
                        socket.emit('canvas-state', {
                            strokes: meeting.canvasData.strokes || [],
                            stickyNotes: meeting.canvasData.stickyNotes || [],
                            textItems: meeting.canvasData.textItems || [],
                            croquis: meeting.canvasData.croquis || [],
                            backgroundColor: meeting.canvasData.backgroundColor || null,
                        });
                    }

                    // Notify others in the room
                    socket.to(roomId).emit('user-joined', {
                        socketId: socket.id,
                        userId,
                        guestId,
                        name,
                        participants,
                    });


                }
            } catch (error) {
                console.error('Error joining room:', error);
            }
        });

        // Handle canvas updates (strokes, shapes, etc.)
        socket.on('canvas-update', (data) => {
            // Broadcast to everyone else in the room
            socket.to(socket.roomId).emit('canvas-update', data);
        });

        // ── Canvas Background Color ───────────────────────────────────────────
        const ALLOWED_BG_COLORS = [
            '#FFF3DC', // Light Cream
            '#FFF0F3', // Blush Pink
            '#FAEEF1', // Light Burgundy
            '#F0FAF4', // Pale Emerald
            '#F0F3FF', // Very Light Navy
            null,      // default (no background / white)
        ];

        socket.on('set-canvas-background', async (data) => {
            try {
                const { color, meetingId } = data;

                // Validate against allowed palette
                if (!ALLOWED_BG_COLORS.includes(color)) {
                    return socket.emit('error', { message: 'Invalid background color.' });
                }

                // Broadcast immediately to all OTHER users so their canvas updates in real-time
                socket.to(socket.roomId).emit('canvas-background-changed', { color });

                // Persist to DB
                const targetMeetingId = meetingId || socket.meetingId;
                if (targetMeetingId) {
                    const meeting = await Meeting.findById(targetMeetingId);
                    if (meeting) {
                        meeting.canvasData = {
                            ...meeting.canvasData,
                            backgroundColor: color,
                        };
                        meeting.markModified('canvasData');
                        await meeting.save();
                        console.log(`🎨 Canvas background updated to ${color} for meeting ${targetMeetingId}`);
                    }
                }
            } catch (error) {
                console.error('Error setting canvas background:', error);
            }
        });
        // ─────────────────────────────────────────────────────────────────────

        // Handle cursor movement
        socket.on('cursor-move', (data) => {
            socket.to(socket.roomId).emit('cursor-move', {
                userId: socket.userId,
                guestId: socket.guestId,
                socketId: socket.id,
                position: data.position,
                color: socket.color,
            });
        });

        // Handle drawing events
        socket.on('draw-stroke', async (data) => {
            if (!socket.roomId) {
                console.warn(`⚠️ Socket ${socket.id} tried to draw without a room!`);
                return;
            }
            // Broadcast to others
            console.log(`🖌️ draw-stroke in room ${socket.roomId} from ${socket.id}`);
            socket.to(socket.roomId).emit('draw-stroke', data);

            // ── Activity Tracking ─────────────────────────────────────────────
            if (socket.activitySessionId) {
                await ActivityService.logEvent(socket.activitySessionId, {
                    meetingId: data.meetingId || socket.meetingId,
                    userId: socket.userId,
                    guestId: socket.guestId,
                    eventType: 'draw-stroke',
                    meta: { color: data.stroke?.color, tool: data.stroke?.tool },
                });
            }
            // ─────────────────────────────────────────────────────────────────

            // Save to Database
            if (data.meetingId) {
                try {
                    const meeting = await Meeting.findById(data.meetingId);
                    if (meeting) {
                        if (!meeting.canvasData) meeting.canvasData = {};
                        if (!meeting.canvasData.strokes) meeting.canvasData.strokes = [];

                        const currentStrokes = meeting.canvasData.strokes || [];
                        currentStrokes.push(data.stroke);

                        meeting.canvasData = {
                            ...meeting.canvasData,
                            strokes: currentStrokes
                        };
                        meeting.markModified('canvasData');

                        await meeting.save();
                    }
                } catch (error) {
                    console.error('Error saving stroke:', error);
                }
            }
        });

        socket.on('update-stroke', async (data) => {
            console.log(`🖌️ update-stroke in room ${socket.roomId}`);
            socket.to(socket.roomId).emit('update-stroke', data);

            if (data.meetingId) {
                try {
                    const meeting = await Meeting.findById(data.meetingId);
                    if (meeting && meeting.canvasData && meeting.canvasData.strokes) {
                        const currentStrokes = meeting.canvasData.strokes;
                        const updatedStrokes = currentStrokes.map(s => s.id === data.id ? { ...s, ...data.updates } : s);

                        meeting.canvasData = {
                            ...meeting.canvasData,
                            strokes: updatedStrokes
                        };
                        meeting.markModified('canvasData');
                        await meeting.save();
                    }
                } catch (err) {
                    console.error('Error updating stroke:', err);
                }
            }
        });

        socket.on('delete-stroke', async (data) => {
            console.log(`🖌️ delete-stroke in room ${socket.roomId}`);
            socket.to(socket.roomId).emit('delete-stroke', data);

            if (data.meetingId) {
                try {
                    const meeting = await Meeting.findById(data.meetingId);
                    if (meeting && meeting.canvasData && meeting.canvasData.strokes) {
                        const currentStrokes = meeting.canvasData.strokes;
                        const updatedStrokes = currentStrokes.filter(s => s.id !== data.id);

                        meeting.canvasData = {
                            ...meeting.canvasData,
                            strokes: updatedStrokes
                        };
                        meeting.markModified('canvasData');
                        await meeting.save();
                    }
                } catch (err) {
                    console.error('Error deleting stroke:', err);
                }
            }
        });

        socket.on('draw-point', (data) => {
            socket.to(socket.roomId).emit('draw-point', data);
        });

        socket.on('clear-canvas', async (data) => {
            // Broadcast to others
            socket.to(socket.roomId).emit('clear-canvas', data);


            // ── Activity Tracking ─────────────────────────────────────────────
            if (socket.activitySessionId) {
                await ActivityService.logEvent(socket.activitySessionId, {
                    meetingId: data.meetingId || socket.meetingId,
                    userId: socket.userId,
                    guestId: socket.guestId,
                    eventType: 'clear-canvas',
                });
            }
            // ─────────────────────────────────────────────────────────────────

            // Delete from Database
            if (data.meetingId) {
                try {
                    const meeting = await Meeting.findById(data.meetingId);
                    if (meeting) {
                        meeting.set('canvasData', { strokes: [], stickyNotes: [], textItems: [], croquis: [] });
                        meeting.markModified('canvasData');
                        await meeting.save();
                        console.log(`🧹 Canvas cleared for meeting ${data.meetingId}`);
                    }
                } catch (error) {
                    console.error('Error clearing canvas in DB:', error);
                }
            }
        });

        socket.on('undo-stroke', async (data) => {
            socket.to(socket.roomId).emit('undo-stroke', data);

            // ── Activity Tracking ─────────────────────────────────────────────
            if (socket.activitySessionId) {
                await ActivityService.logEvent(socket.activitySessionId, {
                    meetingId: data.meetingId || socket.meetingId,
                    userId: socket.userId,
                    guestId: socket.guestId,
                    eventType: 'undo-stroke',
                });
            }
            // ─────────────────────────────────────────────────────────────────
        });

        // ── Croquis Events ────────────────────────────────────────────────────

        socket.on('add-croquis', async (data) => {
            socket.to(socket.roomId).emit('add-croquis', data);

            // ── Activity Tracking ─────────────────────────────────────────────
            if (socket.activitySessionId) {
                await ActivityService.logEvent(socket.activitySessionId, {
                    meetingId: data.meetingId || socket.meetingId,
                    userId: socket.userId,
                    guestId: socket.guestId,
                    eventType: 'add-croquis',
                });
            }
            // ─────────────────────────────────────────────────────────────────

            if (data.meetingId) {
                const meeting = await Meeting.findById(data.meetingId);
                if (meeting) {
                    const current = meeting.canvasData.croquis || [];
                    meeting.canvasData = { ...meeting.canvasData, croquis: [...current, data.item] };
                    meeting.markModified('canvasData');
                    await meeting.save();
                }
            }
        });

        socket.on('update-croquis', async (data) => {
            socket.to(socket.roomId).emit('update-croquis', data);

            // ── Activity Tracking ─────────────────────────────────────────────
            if (socket.activitySessionId) {
                await ActivityService.logEvent(socket.activitySessionId, {
                    meetingId: data.meetingId || socket.meetingId,
                    userId: socket.userId,
                    guestId: socket.guestId,
                    eventType: 'update-croquis',
                });
            }
            // ─────────────────────────────────────────────────────────────────

            if (data.meetingId) {
                const meeting = await Meeting.findById(data.meetingId);
                if (meeting) {
                    const current = meeting.canvasData.croquis || [];
                    const updated = current.map(c => c.id === data.id ? { ...c, ...data.updates } : c);
                    meeting.canvasData = { ...meeting.canvasData, croquis: updated };
                    meeting.markModified('canvasData');
                    await meeting.save();
                }
            }
        });

        socket.on('delete-croquis', async (data) => {
            socket.to(socket.roomId).emit('delete-croquis', data);

            // ── Activity Tracking ─────────────────────────────────────────────
            if (socket.activitySessionId) {
                await ActivityService.logEvent(socket.activitySessionId, {
                    meetingId: data.meetingId || socket.meetingId,
                    userId: socket.userId,
                    guestId: socket.guestId,
                    eventType: 'delete-croquis',
                });
            }
            // ─────────────────────────────────────────────────────────────────

            if (data.meetingId) {
                const meeting = await Meeting.findById(data.meetingId);
                if (meeting) {
                    const current = meeting.canvasData.croquis || [];
                    const updated = current.filter(c => c.id !== data.id);
                    meeting.canvasData = { ...meeting.canvasData, croquis: updated };
                    meeting.markModified('canvasData');
                    await meeting.save();
                }
            }
        });

        // ── Chat Messages ─────────────────────────────────────────────────────

        socket.on('send-message', async (data) => {
            try {
                console.log('📨 Received send-message event:', {
                    roomId: socket.roomId,
                    userId: data.userId,
                    guestId: data.guestId,
                    name: data.name,
                    content: data.content
                });

                if (socket.roomId) {
                    const { content, meetingId, userId, guestId, name } = data;

                    const newMessage = await Message.create({
                        roomId: socket.roomId,
                        meetingId,
                        userId,
                        guestId,
                        userName: name,
                        content
                    });

                    console.log('💾 Message saved to DB:', newMessage._id);
                    console.log('📡 Broadcasting to room:', socket.roomId);

                    // Broadcast to everyone ELSE in the room (not the sender)
                    socket.to(socket.roomId).emit('receive-message', newMessage);

                    // Confirm save back to the sender with a flag so the frontend
                    // can replace the optimistic message instead of adding a duplicate
                    socket.emit('message-confirmed', newMessage);

                    console.log('✅ Message broadcast complete');

                    // ── Activity Tracking ─────────────────────────────────────
                    if (socket.activitySessionId) {
                        await ActivityService.logEvent(socket.activitySessionId, {
                            meetingId: meetingId || socket.meetingId,
                            userId: userId || socket.userId,
                            guestId: guestId || socket.guestId,
                            eventType: 'send-message',
                            meta: { contentLength: content?.length },
                        });
                    }
                    // ─────────────────────────────────────────────────────────
                } else {
                    console.error('❌ No roomId found for socket:', socket.id);
                }
            } catch (error) {
                console.error('Error sending message:', error);
            }
        });

        // ── Sticky Notes ──────────────────────────────────────────────────────

        socket.on('add-sticky', async (data) => {
            socket.to(socket.roomId).emit('add-sticky', data);

            // ── Activity Tracking ─────────────────────────────────────────────
            if (socket.activitySessionId) {
                await ActivityService.logEvent(socket.activitySessionId, {
                    meetingId: data.meetingId || socket.meetingId,
                    userId: socket.userId,
                    guestId: socket.guestId,
                    eventType: 'add-sticky',
                });
            }
            // ─────────────────────────────────────────────────────────────────

            if (data.meetingId) {
                const meeting = await Meeting.findById(data.meetingId);
                if (meeting) {
                    const current = meeting.canvasData.stickyNotes || [];
                    meeting.canvasData = { ...meeting.canvasData, stickyNotes: [...current, data.note] };
                    meeting.markModified('canvasData');
                    await meeting.save();
                }
            }
        });

        socket.on('update-sticky', async (data) => {
            socket.to(socket.roomId).emit('update-sticky', data);

            // ── Activity Tracking ─────────────────────────────────────────────
            if (socket.activitySessionId) {
                await ActivityService.logEvent(socket.activitySessionId, {
                    meetingId: data.meetingId || socket.meetingId,
                    userId: socket.userId,
                    guestId: socket.guestId,
                    eventType: 'update-sticky',
                });
            }
            // ─────────────────────────────────────────────────────────────────

            if (data.meetingId) {
                const meeting = await Meeting.findById(data.meetingId);
                if (meeting) {
                    const current = meeting.canvasData.stickyNotes || [];
                    const updated = current.map(n => n.id === data.id ? { ...n, ...data.updates } : n);
                    meeting.canvasData = { ...meeting.canvasData, stickyNotes: updated };
                    meeting.markModified('canvasData');
                    await meeting.save();
                }
            }
        });

        socket.on('delete-sticky', async (data) => {
            socket.to(socket.roomId).emit('delete-sticky', data);

            // ── Activity Tracking ─────────────────────────────────────────────
            if (socket.activitySessionId) {
                await ActivityService.logEvent(socket.activitySessionId, {
                    meetingId: data.meetingId || socket.meetingId,
                    userId: socket.userId,
                    guestId: socket.guestId,
                    eventType: 'delete-sticky',
                });
            }
            // ─────────────────────────────────────────────────────────────────

            if (data.meetingId) {
                const meeting = await Meeting.findById(data.meetingId);
                if (meeting) {
                    const current = meeting.canvasData.stickyNotes || [];
                    const updated = current.filter(n => n.id !== data.id);
                    meeting.canvasData = { ...meeting.canvasData, stickyNotes: updated };
                    meeting.markModified('canvasData');
                    await meeting.save();
                }
            }
        });

        // ── Text Items ────────────────────────────────────────────────────────

        socket.on('add-text', async (data) => {
            socket.to(socket.roomId).emit('add-text', data);

            // ── Activity Tracking ─────────────────────────────────────────────
            if (socket.activitySessionId) {
                await ActivityService.logEvent(socket.activitySessionId, {
                    meetingId: data.meetingId || socket.meetingId,
                    userId: socket.userId,
                    guestId: socket.guestId,
                    eventType: 'add-text',
                });
            }
            // ─────────────────────────────────────────────────────────────────

            if (data.meetingId) {
                const meeting = await Meeting.findById(data.meetingId);
                if (meeting) {
                    const current = meeting.canvasData.textItems || [];
                    meeting.canvasData = { ...meeting.canvasData, textItems: [...current, data.item] };
                    meeting.markModified('canvasData');
                    await meeting.save();
                }
            }
        });

        socket.on('update-text', async (data) => {
            socket.to(socket.roomId).emit('update-text', data);

            // ── Activity Tracking ─────────────────────────────────────────────
            if (socket.activitySessionId) {
                await ActivityService.logEvent(socket.activitySessionId, {
                    meetingId: data.meetingId || socket.meetingId,
                    userId: socket.userId,
                    guestId: socket.guestId,
                    eventType: 'update-text',
                });
            }
            // ─────────────────────────────────────────────────────────────────

            if (data.meetingId) {
                const meeting = await Meeting.findById(data.meetingId);
                if (meeting) {
                    const current = meeting.canvasData.textItems || [];
                    const updated = current.map(t => t.id === data.id ? { ...t, ...data.updates } : t);
                    meeting.canvasData = { ...meeting.canvasData, textItems: updated };
                    meeting.markModified('canvasData');
                    await meeting.save();
                }
            }
        });

        socket.on('delete-text', async (data) => {
            socket.to(socket.roomId).emit('delete-text', data);

            // ── Activity Tracking ─────────────────────────────────────────────
            if (socket.activitySessionId) {
                await ActivityService.logEvent(socket.activitySessionId, {
                    meetingId: data.meetingId || socket.meetingId,
                    userId: socket.userId,
                    guestId: socket.guestId,
                    eventType: 'delete-text',
                });
            }
            // ─────────────────────────────────────────────────────────────────

            if (data.meetingId) {
                const meeting = await Meeting.findById(data.meetingId);
                if (meeting) {
                    const current = meeting.canvasData.textItems || [];
                    const updated = current.filter(t => t.id !== data.id);
                    meeting.canvasData = { ...meeting.canvasData, textItems: updated };
                    meeting.markModified('canvasData');
                    await meeting.save();
                }
            }
        });

        // ── Disconnect / Leave ────────────────────────────────────────────────

        socket.on('disconnect', async () => {
            console.log(` Client disconnected: ${socket.id}`);
            try {
                // ── Activity Tracking: Close session ──────────────────────────
                if (socket.activitySessionId) {
                    await ActivityService.endSession(socket.activitySessionId);
                    socket.activitySessionId = null;
                }
                // ─────────────────────────────────────────────────────────────

                if (socket.roomId) {
                    const room = await Room.findOne({ roomId: socket.roomId });
                    if (room) {
                        room.removeConnection(socket.id);
                        await room.save();

                        // Notify room
                        const participants = room.activeConnections.map(conn => ({
                            socketId: conn.socketId,
                            userId: conn.userId,
                            guestId: conn.guestId,
                            name: conn.name,
                            isOwner: conn.userId && conn.userId.toString() === room.owner.toString(),
                        }));

                        socket.to(socket.roomId).emit('user-left', {
                            socketId: socket.id,
                            participants,
                        });

                        socket.leave(socket.roomId);
                        console.log(`👋 User left room ${socket.roomId}`);

                    }
                }
            } catch (error) {
                console.error('Error leaving room:', error);
            }
        });

        // ── Get Participants ──────────────────────────────────────────────────

        socket.on('get-participants', async () => {
            try {
                if (socket.roomId) {
                    const room = await Room.findOne({ roomId: socket.roomId });

                    if (room) {
                        const participants = room.activeConnections.map(conn => ({
                            socketId: conn.socketId,
                            userId: conn.userId,
                            guestId: conn.guestId,
                            name: conn.name,
                            isOwner: conn.userId && conn.userId.toString() === room.owner.toString(),
                        }));

                        socket.emit('participants-list', participants);
                    }
                }
            } catch (error) {
                console.error('Error getting participants:', error);
            }
        });
    });
};
