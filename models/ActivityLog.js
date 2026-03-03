import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    guestId: {
        type: String,
        required: false
    },
    userName: {
        type: String,
        required: false
    },
    action: {
        type: String,
        enum: ['join', 'leave', 'edit', 'view', 'clear'],
        required: true
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
});

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

export default ActivityLog;
