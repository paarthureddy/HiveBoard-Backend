import express from 'express';
import crypto from 'crypto';
import Meeting from '../models/Meeting.js';
import Room from '../models/Room.js';
import protect from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/invites/generate
// @desc    Generate invite link for a meeting
// @access  Private
router.post('/generate', protect, async (req, res) => {
    try {
        const { meetingId } = req.body;

        if (!meetingId) {
            return res.status(400).json({ message: 'Meeting ID is required' });
        }

        // Find meeting
        const meeting = await Meeting.findById(meetingId);

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        // Check if user owns this meeting
        if (meeting.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to generate invite for this meeting' });
        }

        // Generate or retrieve invite token
        if (!meeting.inviteToken) {
            meeting.inviteToken = crypto.randomBytes(32).toString('hex');
            meeting.inviteEnabled = true;
            await meeting.save();
        }

        // Create or find room
        let room = await Room.findOne({ meetingId: meeting._id });

        if (!room) {
            room = await Room.create({
                meetingId: meeting._id,
                owner: meeting.createdBy,
                inviteToken: meeting.inviteToken,
            });
        }

        res.json({
            inviteToken: meeting.inviteToken,
            inviteUrl: `${process.env.CLIENT_URL || 'http://localhost:8080'}/join/${meeting.inviteToken}`,
            roomId: room.roomId,
        });
    } catch (error) {
        console.error('Generate invite error:', error);
        res.status(500).json({ message: 'Server error generating invite' });
    }
});

// @route   GET /api/invites/:token
// @desc    Validate invite token and get meeting details
// @access  Public
router.get('/:token', async (req, res) => {
    try {
        const { token } = req.params;

        // Find meeting by invite token
        const meeting = await Meeting.findOne({ inviteToken: token })
            .populate('createdBy', 'name email')
            .select('-canvasData'); // Don't send canvas data yet

        if (!meeting) {
            return res.status(404).json({ message: 'Invalid or expired invite link' });
        }

        if (!meeting.inviteEnabled) {
            return res.status(403).json({ message: 'This invite link has been disabled' });
        }

        // Find room
        const room = await Room.findOne({ meetingId: meeting._id });

        res.json({
            meeting: {
                _id: meeting._id,
                title: meeting.title,
                createdBy: meeting.createdBy,
                thumbnail: meeting.thumbnail,
                allowGuests: meeting.allowGuests,
            },
            room: room ? {
                roomId: room.roomId,
                participantCount: room.activeConnections.length,
            } : null,
        });
    } catch (error) {
        console.error('Validate invite error:', error);
        res.status(500).json({ message: 'Server error validating invite' });
    }
});

// @route   POST /api/invites/:token/join
// @desc    Join a session via invite token
// @access  Public (guests) or Private (authenticated users)
router.post('/:token/join', async (req, res) => {
    try {
        const { token } = req.params;
        const { guestName } = req.body;

        // Find meeting
        const meeting = await Meeting.findOne({ inviteToken: token });

        if (!meeting) {
            return res.status(404).json({ message: 'Invalid invite link' });
        }

        if (!meeting.inviteEnabled) {
            return res.status(403).json({ message: 'This invite link has been disabled' });
        }

        // Find or create room
        let room = await Room.findOne({ meetingId: meeting._id });

        if (!room) {
            room = await Room.create({
                meetingId: meeting._id,
                owner: meeting.createdBy,
                inviteToken: token,
            });
        }

        // Generate guest ID if not authenticated
        const guestId = crypto.randomBytes(16).toString('hex');

        res.json({
            meetingId: meeting._id,
            roomId: room.roomId,
            guestId,
            guestName: guestName || 'Guest',
            role: 'guest',
        });
    } catch (error) {
        console.error('Join session error:', error);
        res.status(500).json({ message: 'Server error joining session' });
    }
});

// @route   PUT /api/invites/:meetingId/toggle
// @desc    Enable/disable invite link
// @access  Private
router.put('/:meetingId/toggle', protect, async (req, res) => {
    try {
        const { meetingId } = req.params;
        const { enabled } = req.body;

        const meeting = await Meeting.findById(meetingId);

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        // Check ownership
        if (meeting.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        meeting.inviteEnabled = enabled;
        await meeting.save();

        res.json({ inviteEnabled: meeting.inviteEnabled });
    } catch (error) {
        console.error('Toggle invite error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
