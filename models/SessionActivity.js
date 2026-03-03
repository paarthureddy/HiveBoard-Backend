import mongoose from 'mongoose';

/**
 * SessionActivity Model
 * -----------------------
 * Tracks a single user's participation in one meeting session.
 * Created when a user joins a room, updated/closed when they leave.
 * 
 * One document = one "seat" (join → leave arc).
 */
const sessionActivitySchema = new mongoose.Schema({
    // The meeting this session belongs to
    meetingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Meeting',
        required: true,
        index: true,
    },

    // Authenticated user (null for guests)
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true,
    },

    // Guest identifier (null for authenticated users)
    guestId: {
        type: String,
        default: null,
    },

    // Display name at time of session
    participantName: {
        type: String,
        default: 'Anonymous',
    },

    // Role within the meeting
    role: {
        type: String,
        enum: ['owner', 'editor', 'viewer', 'guest'],
        default: 'guest',
    },

    // Socket ID used during this session (helps correlate events)
    socketId: {
        type: String,
    },

    // Session timestamps
    joinedAt: {
        type: Date,
        default: Date.now,
    },
    leftAt: {
        type: Date,
        default: null,
    },

    // Duration in seconds — computed when session ends
    durationSeconds: {
        type: Number,
        default: null,
    },

    // Aggregated counters for quick analytics reads
    summary: {
        strokeCount: { type: Number, default: 0 },
        stickyNoteCount: { type: Number, default: 0 },
        messageCount: { type: Number, default: 0 },
        textItemCount: { type: Number, default: 0 },
        croquisCount: { type: Number, default: 0 },
    },
});

const SessionActivity = mongoose.model('SessionActivity', sessionActivitySchema);
export default SessionActivity;
