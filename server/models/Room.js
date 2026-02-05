import mongoose from 'mongoose';
import crypto from 'crypto';

const roomSchema = new mongoose.Schema({
    meetingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Meeting',
        required: true,
    },
    roomId: {
        type: String,
        required: true,
        unique: true,
        default: () => crypto.randomBytes(16).toString('hex'),
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    inviteToken: {
        type: String,
        unique: true,
        default: () => crypto.randomBytes(32).toString('hex'),
    },
    inviteEnabled: {
        type: Boolean,
        default: true,
    },
    allowGuests: {
        type: Boolean,
        default: true,
    },
    participants: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        guestId: String,
        name: String,
        role: {
            type: String,
            enum: ['owner', 'editor', 'guest'],
            default: 'guest',
        },
        joinedAt: {
            type: Date,
            default: Date.now,
        },
    }],
    activeConnections: [{
        socketId: String,
        userId: mongoose.Schema.Types.ObjectId,
        guestId: String,
        name: String,
        connectedAt: {
            type: Date,
            default: Date.now,
        },
    }],
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Update the updatedAt timestamp before saving
roomSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Method to add participant
roomSchema.methods.addParticipant = function (participant) {
    const exists = this.participants.find(p =>
        (p.userId && p.userId.toString() === participant.userId?.toString()) ||
        (p.guestId && p.guestId === participant.guestId)
    );

    if (!exists) {
        this.participants.push(participant);
    }
};

// Method to add active connection
roomSchema.methods.addConnection = function (connection) {
    const existingIndex = this.activeConnections.findIndex(conn => conn.socketId === connection.socketId);
    if (existingIndex !== -1) {
        // Update existing connection
        this.activeConnections[existingIndex] = connection;
    } else {
        // Add new connection
        this.activeConnections.push(connection);
    }
};

// Method to remove connection
roomSchema.methods.removeConnection = function (socketId) {
    this.activeConnections = this.activeConnections.filter(
        conn => conn.socketId !== socketId
    );
};

const Room = mongoose.model('Room', roomSchema);

export default Room;
