import Room from './models/Room.js';
import Meeting from './models/Meeting.js';
import Message from './models/Message.js';

export const setupSocketHandlers = (io) => {
    io.on('connection', (socket) => {
        console.log(`✅ Client connected: ${socket.id}`);

        // Join a room
        socket.on('join-room', async (data) => {
            try {
                const { roomId, meetingId, userId, guestId, name, role } = data;

                // Join the socket.io room
                socket.join(roomId);

                // Find or create room
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
                    // Clean up stale connections (zombies from server restarts)
                    if (io.sockets && io.sockets.sockets) {
                        const connectedSocketIds = io.sockets.sockets; // Map of socketId -> Socket
                        room.activeConnections = room.activeConnections.filter(conn =>
                            connectedSocketIds.has(conn.socketId)
                        );
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
                    socket.userId = userId;
                    socket.guestId = guestId;

                    // Get chat history
                    const messages = await Message.find({ roomId })
                        .sort({ timestamp: -1 })
                        .limit(50);

                    // Emit history reversed (oldest first)
                    socket.emit('chat-history', messages.reverse());

                    // Get all active participants
                    const participants = room.activeConnections.map(conn => ({
                        socketId: conn.socketId,
                        userId: conn.userId,
                        guestId: conn.guestId,
                        name: conn.name,
                        isOwner: conn.userId && conn.userId.toString() === room.owner.toString(),
                    }));

                    // Notify user they joined
                    socket.emit('room-joined', {
                        roomId,
                        participants,
                        role: userId && userId.toString() === room.owner.toString() ? 'owner' : role || 'guest',
                    });

                    // Notify others in the room
                    socket.to(roomId).emit('user-joined', {
                        socketId: socket.id,
                        userId,
                        guestId,
                        name,
                        participants,
                    });

                    console.log(`👤 User ${name} joined room ${roomId}`);
                }
            } catch (error) {
                console.error('Error joining room:', error);
                socket.emit('error', { message: 'Failed to join room' });
            }
        });

        // Leave room
        socket.on('leave-room', async () => {
            try {
                if (socket.roomId) {
                    const room = await Room.findOne({ roomId: socket.roomId });

                    if (room) {
                        // Remove connection
                        room.removeConnection(socket.id);
                        await room.save();

                        // Get updated participants
                        const participants = room.activeConnections.map(conn => ({
                            socketId: conn.socketId,
                            userId: conn.userId,
                            guestId: conn.guestId,
                            name: conn.name,
                            isOwner: conn.userId && conn.userId.toString() === room.owner.toString(),
                        }));

                        // Notify others
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

        // Get participants
        socket.on('get-participants', async () => {
            try {
                if (socket.roomId) {
                    const room = await Room.findOne({ roomId: socket.roomId });

                    if (room) {
                        // Clean up stale connections here too
                        if (io.sockets && io.sockets.sockets) {
                            const connectedSocketIds = io.sockets.sockets;
                            let changed = false;
                            const initialLen = room.activeConnections.length;
                            room.activeConnections = room.activeConnections.filter(conn =>
                                connectedSocketIds.has(conn.socketId)
                            );
                            if (room.activeConnections.length !== initialLen) {
                                await room.save();
                            }
                        }

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

        // Real-time drawing events

        // Draw stroke (completed stroke)
        socket.on('draw-stroke', async (data) => {
            try {
                if (socket.roomId) {
                    // Broadcast stroke to others in the room
                    socket.to(socket.roomId).emit('stroke-drawn', {
                        userId: socket.userId,
                        guestId: socket.guestId,
                        socketId: socket.id,
                        stroke: data.stroke,
                        timestamp: Date.now(),
                    });

                    // Save to database using atomic update
                    if (data.meetingId) {
                        await Meeting.updateOne(
                            { _id: data.meetingId },
                            { $push: { 'canvasData.strokes': data.stroke } }
                        );
                    }
                }
            } catch (error) {
                console.error('Error broadcasting stroke:', error);
            }
        });

        // Draw point (live drawing feedback)
        socket.on('draw-point', (data) => {
            try {
                if (socket.roomId) {
                    // Broadcast point to others for live preview
                    socket.to(socket.roomId).emit('point-drawn', {
                        userId: socket.userId,
                        guestId: socket.guestId,
                        socketId: socket.id,
                        point: data.point,
                        strokeId: data.strokeId,
                        color: data.color,
                        width: data.width,
                    });
                }
            } catch (error) {
                console.error('Error broadcasting point:', error);
            }
        });

        // Clear canvas
        socket.on('clear-canvas', async (data) => {
            try {
                if (socket.roomId) {
                    // Broadcast clear to others
                    socket.to(socket.roomId).emit('canvas-cleared', {
                        userId: socket.userId,
                        guestId: socket.guestId,
                        timestamp: Date.now(),
                    });

                    // Update database
                    if (data.meetingId) {
                        await Meeting.updateOne(
                            { _id: data.meetingId },
                            { $set: { 'canvasData.strokes': [] } }
                        );
                    }
                }
            } catch (error) {
                console.error('Error clearing canvas:', error);
            }
        });

        // Undo stroke
        socket.on('undo-stroke', async (data) => {
            try {
                if (socket.roomId) {
                    // Broadcast undo to others
                    socket.to(socket.roomId).emit('stroke-undone', {
                        userId: socket.userId,
                        guestId: socket.guestId,
                        timestamp: Date.now(),
                    });

                    // Update database
                    if (data.meetingId) {
                        await Meeting.updateOne(
                            { _id: data.meetingId },
                            { $pop: { 'canvasData.strokes': 1 } }
                        );
                    }
                }
            } catch (error) {
                console.error('Error undoing stroke:', error);
            }
        });

        // Request canvas state (for late joiners)
        socket.on('request-canvas-state', async (data) => {
            try {
                if (data.meetingId) {
                    const meeting = await Meeting.findById(data.meetingId);
                    if (meeting && meeting.canvasData) {
                        socket.emit('canvas-state', {
                            strokes: meeting.canvasData.strokes || [],
                        });
                    }
                }
            } catch (error) {
                console.error('Error fetching canvas state:', error);
            }
        });

        // Cursor move (optional - for showing other users' cursors)
        socket.on('cursor-move', (data) => {
            if (socket.roomId) {
                socket.to(socket.roomId).emit('cursor-moved', {
                    socketId: socket.id,
                    userId: socket.userId,
                    guestId: socket.guestId,
                    position: data.position,
                });
            }
        });

        // Handle disconnect
        socket.on('disconnect', async () => {
            try {
                if (socket.roomId) {
                    const room = await Room.findOne({ roomId: socket.roomId });

                    if (room) {
                        // Remove connection
                        room.removeConnection(socket.id);
                        await room.save();

                        // Get updated participants
                        const participants = room.activeConnections.map(conn => ({
                            socketId: conn.socketId,
                            userId: conn.userId,
                            guestId: conn.guestId,
                            name: conn.name,
                            isOwner: conn.userId && conn.userId.toString() === room.owner.toString(),
                        }));

                        // Notify others
                        socket.to(socket.roomId).emit('user-left', {
                            socketId: socket.id,
                            participants,
                        });
                    }
                }
                console.log(`❌ Client disconnected: ${socket.id}`);
            } catch (error) {
                console.error('Error handling disconnect:', error);
            }
        });

        // Chat Messages
        socket.on('send-message', async (data) => {
            try {
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

                    // Broadcast to everyone in room including sender (to confirm save)
                    io.to(socket.roomId).emit('receive-message', newMessage);
                }
            } catch (error) {
                console.error('Error sending message:', error);
            }
        });
    });
};
