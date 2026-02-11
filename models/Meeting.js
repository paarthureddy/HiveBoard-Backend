import mongoose from 'mongoose';

// MongoDB Schema for storing Meeting/Canvas data
const meetingSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please provide a meeting title'],
        trim: true,
        default: 'Untitled Meeting',
    },
    // Reference to the user who created the meeting
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    // Stores all canvas elements (strokes, sticky notes, images, etc.)
    // Uses 'Mixed' type because the structure is complex and dynamic
    canvasData: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    thumbnail: {
        type: String,
        default: '',
    },
    // Token for invite links
    inviteToken: {
        type: String,
        unique: true,
        sparse: true,
    },
    inviteEnabled: {
        type: Boolean,
        default: false,
    },
    allowGuests: {
        type: Boolean,
        default: true,
    },
    // List of users who have access to this meeting
    participants: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        role: {
            type: String,
            enum: ['owner', 'editor', 'viewer'],
            default: 'viewer',
        },
        addedAt: {
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

// Middleware: Automatically update the 'updatedAt' timestamp before saving
meetingSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Meeting = mongoose.model('Meeting', meetingSchema);

export default Meeting;
