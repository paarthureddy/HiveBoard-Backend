import Room from './models/Room.js';
import Meeting from './models/Meeting.js';
import Message from './models/Message.js';

export const setupSocketHandlers = (io) => {
    io.on('connection', (socket) => {
        console.log(` Client connected: ${socket.id}`);

        // Join a room
        socket.on('join-room', async (data) => {
            try {
                const { roomId, meetingId, userId, guestId, name, role } = data;

                // Check if socket is already in a different room and leave it
                if (socket.roomId && socket.roomId !== roomId) {
                    console.log(`🔌 Socket ${socket.id} switching from room ${socket.roomId} to ${roomId}`);
                    socket.leave(socket.roomId);

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
                    // DISABLED FOR DEBUGGING - This was removing valid connections
                    /* if (io.sockets.sockets) {
                        const connectedSocketIds = io.sockets.sockets; // Map of socketId -> Socket
                        const initialCount = room.activeConnections.length;
                        room.activeConnections = room.activeConnections.filter(conn =>
                            connectedSocketIds.has(conn.socketId)
                        );
                        const finalCount = room.activeConnections.length;
                        if (initialCount !== finalCount) {
                            console.log(`🧹 Creating room: Removed ${initialCount - finalCount} stale connections`);
                        }
                    } */
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
                        userId: conn.userId ? conn.userId.toString() : null,
                        guestId: conn.guestId,
                        name: conn.name,
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
                        /* if (io.sockets && io.sockets.sockets) {
                            const connectedSocketIds = io.sockets.sockets;
                            let changed = false;
                            const initialLen = room.activeConnections.length;
                            room.activeConnections = room.activeConnections.filter(conn =>
                                connectedSocketIds.has(conn.socketId)
                            );
                            if (room.activeConnections.length !== initialLen) {
                                await room.save();
                            }
                        } */

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
                            {
                                $set: {
                                    'canvasData.strokes': [],
                                    'canvasData.stickyNotes': [],
                                    'canvasData.textItems': [],
                                    'canvasData.croquis': []
                                }
                            }
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

        // Update stroke
        socket.on('update-stroke', async (data) => {
            try {
                if (socket.roomId) {
                    socket.to(socket.roomId).emit('stroke-updated', {
                        ...data,
                        timestamp: Date.now(),
                    });

                    if (data.meetingId && data.updates) {
                        const updateFields = {};
                        for (const [key, value] of Object.entries(data.updates)) {
                            // Careful with nested object updates in Mongo arrays
                            // For simplicity with stroke points/transforms, we might need to be smart
                            updateFields[`canvasData.strokes.$.${key}`] = value;
                        }

                        await Meeting.updateOne(
                            { _id: data.meetingId, 'canvasData.strokes.id': data.id },
                            { $set: updateFields }
                        );
                    }
                }
            } catch (error) {
                console.error('Error updating stroke:', error);
            }
        });

        // Add croquis
        socket.on('add-croquis', async (data) => {
            try {
                if (socket.roomId) {
                    socket.to(socket.roomId).emit('croquis-added', {
                        ...data,
                        timestamp: Date.now(),
                    });

                    if (data.meetingId) {
                        await Meeting.updateOne(
                            { _id: data.meetingId },
                            { $push: { 'canvasData.croquis': data.item } }
                        );
                    }
                }
            } catch (error) {
                console.error('Error adding croquis:', error);
            }
        });

        // Update croquis
        socket.on('update-croquis', async (data) => {
            try {
                if (socket.roomId) {
                    socket.to(socket.roomId).emit('croquis-updated', {
                        ...data,
                        timestamp: Date.now(),
                    });

                    if (data.meetingId) {
                        // We construct a dynamic update object to only update changed fields
                        // But since it's an array of objects, we need to match by ID
                        // Mongoose Mixed type might be tricky with positional operator if not defined in schema
                        // But let's try standard Mongo syntax.
                        // Actually, replacing the whole object or using broad set might be safer for Mixed.
                        // Let's try to update specific fields using arrayFilters or just pull/push if simple.
                        // Better: Read, update, save? No, race conditions.
                        // Let's assume standard positional operator works for Mixed arrays in Mongo.
                        // However, to be safe with Mixed, let's just use $set with a loop or simplistic approach.
                        // Actually, `activeConnections` is defined. `canvasData` is Mixed.
                        // Mongo driver supports 'canvasData.croquis.$.x' if we match 'canvasData.croquis.id'.

                        const updateFields = {};
                        for (const [key, value] of Object.entries(data.updates)) {
                            updateFields[`canvasData.croquis.$.${key}`] = value;
                        }

                        await Meeting.updateOne(
                            { _id: data.meetingId, 'canvasData.croquis.id': data.id },
                            { $set: updateFields }
                        );
                    }
                }
            } catch (error) {
                console.error('Error updating croquis:', error);
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
                            croquis: meeting.canvasData.croquis || [],
                            stickyNotes: meeting.canvasData.stickyNotes || [],
                            textItems: meeting.canvasData.textItems || [],
                        });
                    }
                }
            } catch (error) {
                console.error('Error fetching canvas state:', error);
            }
        });

        // --- Sticky Notes ---

        socket.on('add-sticky', async (data) => {
            try {
                if (socket.roomId) {
                    socket.to(socket.roomId).emit('sticky-added', {
                        ...data,
                        timestamp: Date.now(),
                    });

                    if (data.meetingId) {
                        await Meeting.updateOne(
                            { _id: data.meetingId },
                            { $push: { 'canvasData.stickyNotes': data.note } }
                        );
                    }
                }
            } catch (error) {
                console.error('Error adding sticky:', error);
            }
        });

        socket.on('update-sticky', async (data) => {
            try {
                if (socket.roomId) {
                    socket.to(socket.roomId).emit('sticky-updated', {
                        ...data,
                        timestamp: Date.now(),
                    });

                    if (data.meetingId) {
                        const updateFields = {};
                        for (const [key, value] of Object.entries(data.updates)) {
                            updateFields[`canvasData.stickyNotes.$.${key}`] = value;
                        }
                        await Meeting.updateOne(
                            { _id: data.meetingId, 'canvasData.stickyNotes.id': data.id },
                            { $set: updateFields }
                        );
                    }
                }
            } catch (error) {
                console.error('Error updating sticky:', error);
            }
        });

        socket.on('delete-sticky', async (data) => {
            try {
                if (socket.roomId) {
                    socket.to(socket.roomId).emit('sticky-deleted', {
                        id: data.id,
                        timestamp: Date.now(),
                    });

                    if (data.meetingId) {
                        await Meeting.updateOne(
                            { _id: data.meetingId },
                            { $pull: { 'canvasData.stickyNotes': { id: data.id } } }
                        );
                    }
                }
            } catch (error) {
                console.error('Error deleting sticky:', error);
            }
        });

        // --- Text Items ---

        socket.on('add-text', async (data) => {
            try {
                if (socket.roomId) {
                    socket.to(socket.roomId).emit('text-added', {
                        ...data,
                        timestamp: Date.now(),
                    });

                    if (data.meetingId) {
                        await Meeting.updateOne(
                            { _id: data.meetingId },
                            { $push: { 'canvasData.textItems': data.item } }
                        );
                    }
                }
            } catch (error) {
                console.error('Error adding text:', error);
            }
        });

        socket.on('update-text', async (data) => {
            try {
                if (socket.roomId) {
                    socket.to(socket.roomId).emit('text-updated', {
                        ...data,
                        timestamp: Date.now(),
                    });

                    if (data.meetingId) {
                        const updateFields = {};
                        for (const [key, value] of Object.entries(data.updates)) {
                            updateFields[`canvasData.textItems.$.${key}`] = value;
                        }
                        await Meeting.updateOne(
                            { _id: data.meetingId, 'canvasData.textItems.id': data.id },
                            { $set: updateFields }
                        );
                    }
                }
            } catch (error) {
                console.error('Error updating text:', error);
            }
        });

        socket.on('delete-text', async (data) => {
            try {
                if (socket.roomId) {
                    socket.to(socket.roomId).emit('text-deleted', {
                        id: data.id,
                        timestamp: Date.now(),
                    });

                    if (data.meetingId) {
                        await Meeting.updateOne(
                            { _id: data.meetingId },
                            { $pull: { 'canvasData.textItems': { id: data.id } } }
                        );
                    }
                }
            } catch (error) {
                console.error('Error deleting text:', error);
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

                    // Broadcast to everyone in room including sender (to confirm save)
                    io.to(socket.roomId).emit('receive-message', newMessage);

                    console.log('✅ Message broadcast complete');
                } else {
                    console.error('❌ No roomId found for socket:', socket.id);
                }
            } catch (error) {
                console.error('Error sending message:', error);
            }
        });
    });
};
