import Room from './models/Room.js';
import Meeting from './models/Meeting.js';
import Message from './models/Message.js';

/**
 * Configure all Socket.io event listners for real-time functionality.
 * This handles room management, live drawing, chat, and participants.
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
         */
        socket.on('join-room', async (data) => {
            try {
                const { roomId, meetingId, userId, guestId, name, role } = data;

                // Join the socket.io room channel
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
                    // Add connection to active connections list in DB
                    room.addConnection({
                        socketId: socket.id,
                        userId: userId || null,
                        guestId: guestId || null,
                        name: name || 'Anonymous',
                    });

                    // Add participant to the persistent list if not already added
                    room.addParticipant({
                        userId: userId || null,
                        guestId: guestId || null,
                        name: name || 'Anonymous',
                        role: role || 'guest',
                    });

                    await room.save();

                    // Store room info in the socket object for easy access later
                    socket.roomId = roomId;
                    socket.userId = userId;
                    socket.guestId = guestId;

                    // Fetch and send recent chat history
                    const messages = await Message.find({ roomId })
                        .sort({ timestamp: -1 })
                        .limit(50);

                    // Emit history reversed (oldest first) so it displays correctly
                    socket.emit('chat-history', messages.reverse());

                    // Get updated list of all active participants
                    const participants = room.activeConnections.map(conn => ({
                        socketId: conn.socketId,
                        userId: conn.userId ? conn.userId.toString() : null,
                        guestId: conn.guestId,
                        name: conn.name,
                        isOwner: conn.userId && conn.userId.toString() === room.owner.toString(),
                    }));

                    console.log('📊 Active Connections in DB:', room.activeConnections.length);
                    console.log('📋 Generated Participants List:', participants);

                    // Notify the user that they have successfully joined
                    socket.emit('room-joined', {
                        roomId,
                        participants,
                        role: userId && userId.toString() === room.owner.toString() ? 'owner' : role || 'guest',
                    });

                    // Notify all other users in the room that someone joined
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

        /**
         * Event: leave-room
         * Handles explicit disconnections or user leaving the page.
         * - Removes the user from the active connections list
         * - Notifies others that the user left
         */
        socket.on('leave-room', async () => {
            try {
                if (socket.roomId) {
                    const room = await Room.findOne({ roomId: socket.roomId });

                    if (room) {
                        // Remove connection from DB
                        room.removeConnection(socket.id);
                        await room.save();

                        // Get updated participants list
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

        // Helper event to fetch current participants
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

        // --- Real-time Drawing Events ---

        /**
         * Event: draw-stroke
         * Broadcasts a completed drawing stroke to all other users.
         * Also saves the stroke to the database for persistence.
         */
        socket.on('draw-stroke', async (data) => {
            try {
                if (socket.roomId) {
                    // Broadcast stroke to others in the room (excluding sender)
                    socket.to(socket.roomId).emit('stroke-drawn', {
                        userId: socket.userId,
                        guestId: socket.guestId,
                        socketId: socket.id,
                        stroke: data.stroke,
                        timestamp: Date.now(),
                    });

                    // Save to database using atomic update ($push)
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

        /**
         * Event: draw-point
         * Broadcasts live cursor movement/drawing points for real-time feedback.
         * Note: These are transient and NOT saved to DB to reduce load.
         */
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

        /**
         * Event: clear-canvas
         * Clears all canvas content (strokes, stickies, text, images).
         * Affects both the live view and the database.
         */
        socket.on('clear-canvas', async (data) => {
            try {
                if (socket.roomId) {
                    // Broadcast clear command to others
                    socket.to(socket.roomId).emit('canvas-cleared', {
                        userId: socket.userId,
                        guestId: socket.guestId,
                        timestamp: Date.now(),
                    });

                    // Update database: Clear all arrays
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

        // Event: undo-stroke
        // Removes the last action from the canvas and database
        socket.on('undo-stroke', async (data) => {
            try {
                if (socket.roomId) {
                    // Broadcast undo to others
                    socket.to(socket.roomId).emit('stroke-undone', {
                        userId: socket.userId,
                        guestId: socket.guestId,
                        timestamp: Date.now(),
                    });

                    // Update database: Remove last element from strokes array
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

        // Event: update-stroke
        // Handles modifications to existing strokes (move, resize, rotate)
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
                            // Update specific fields of the matching stroke in the array
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

        // --- Image/Croquis Handling ---
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

        socket.on('update-croquis', async (data) => {
            try {
                if (socket.roomId) {
                    socket.to(socket.roomId).emit('croquis-updated', {
                        ...data,
                        timestamp: Date.now(),
                    });

                    if (data.meetingId) {
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

        /**
         * Event: request-canvas-state
         * Called by a user when they first join to get the current state of the canvas.
         * Fetches all objects (strokes, sticky notes, images, text) from DB and sends them.
         */
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

        // Handle client disconnect
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

        // --- Chat Messages ---
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

                    // Save message to database
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
