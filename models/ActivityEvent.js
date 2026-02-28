import mongoose from 'mongoose';

/**
 * ActivityEvent Model
 * --------------------
 * Fine-grained log of every tracked action that occurs within a session.
 * Each document represents one discrete user action.
 * 
 * Intentionally kept lightweight — heavy analytics are derived from
 * aggregating these documents or reading SessionActivity.summary.
 */
const activityEventSchema = new mongoose.Schema({
    // Link back to the parent session document
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SessionActivity',
        required: true,
        index: true,
    },

    // Denormalized for query convenience (avoids joins in analytics)
    meetingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Meeting',
        required: true,
        index: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true,
    },
    guestId: {
        type: String,
        default: null,
    },

    /**
     * Event type — maps 1:1 with socket event names where applicable.
     * Allowed values:
     *   join           – user joined the room
     *   leave          – user left the room
     *   draw-stroke    – a stroke was added to the canvas
     *   clear-canvas   – the canvas was cleared
     *   undo-stroke    – a stroke was undone
     *   add-sticky     – sticky note added
     *   update-sticky  – sticky note updated
     *   delete-sticky  – sticky note deleted
     *   add-text       – text item added
     *   update-text    – text item updated
     *   delete-text    – text item deleted
     *   add-croquis    – croquis element added
     *   update-croquis – croquis element updated
     *   delete-croquis – croquis element deleted
     *   send-message   – chat message sent
     *   invite-used    – invite link was used to enter the meeting
     */
    eventType: {
        type: String,
        required: true,
        enum: [
            'join', 'leave',
            'draw-stroke', 'clear-canvas', 'undo-stroke',
            'add-sticky', 'update-sticky', 'delete-sticky',
            'add-text', 'update-text', 'delete-text',
            'add-croquis', 'update-croquis', 'delete-croquis',
            'send-message',
            'invite-used',
        ],
        index: true,
    },

    // ISO timestamp of the action
    timestamp: {
        type: Date,
        default: Date.now,
        index: true,
    },

    // Optional bag for event-specific metadata (e.g. message length, stroke color)
    meta: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
});

const ActivityEvent = mongoose.model('ActivityEvent', activityEventSchema);
export default ActivityEvent;
