import express from 'express';
import crypto from 'crypto';
import Meeting from '../models/Meeting.js';
import Room from '../models/Room.js';
import protect from '../middleware/auth.js';
import ActivityService from '../services/ActivityService.js';

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

        // Block unauthenticated guests when external sharing is disabled
        if (!meeting.allowGuests) {
            return res.status(403).json({ message: 'External sharing has been disabled for this session. Only registered users can join.' });
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

        // ── Activity Tracking: log invite-used ──────────────────────────────
        ActivityService.logInviteUsed({
            meetingId: meeting._id,
            guestId,
            inviteToken: token,
            participantName: guestName || 'Guest',
        }).catch(() => { }); // non-blocking, errors silenced
        // ────────────────────────────────────────────────────────────────────

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

// @route   DELETE /api/invites/:meetingId/revoke
// @desc    Revoke (permanently delete) the shared invite link
// @access  Private (owner only)
router.delete('/:meetingId/revoke', protect, async (req, res) => {
    try {
        const { meetingId } = req.params;

        const meeting = await Meeting.findById(meetingId);

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        // Only the owner can revoke
        if (meeting.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to revoke this invite link' });
        }

        // Clear the token and disable the invite
        meeting.inviteToken = undefined;
        meeting.inviteEnabled = false;
        await meeting.save();

        // Also clear token from the associated room
        await Room.findOneAndUpdate(
            { meetingId: meeting._id },
            { inviteToken: null, inviteEnabled: false }
        );

        res.json({ message: 'Invite link revoked successfully', inviteEnabled: false });
    } catch (error) {
        console.error('Revoke invite error:', error);
        res.status(500).json({ message: 'Server error revoking invite link' });
    }
});

// @route   POST /api/invites/:meetingId/regenerate
// @desc    Regenerate a new invite link (invalidates the old one)
// @access  Private (owner only)
router.post('/:meetingId/regenerate', protect, async (req, res) => {
    try {
        const { meetingId } = req.params;

        const meeting = await Meeting.findById(meetingId);

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        // Only the owner can regenerate
        if (meeting.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to regenerate this invite link' });
        }

        // Issue a fresh token — old link is immediately invalidated
        const newToken = crypto.randomBytes(32).toString('hex');
        meeting.inviteToken = newToken;
        meeting.inviteEnabled = true;
        await meeting.save();

        // Sync new token to the room
        await Room.findOneAndUpdate(
            { meetingId: meeting._id },
            { inviteToken: newToken, inviteEnabled: true }
        );

        res.json({
            message: 'Invite link regenerated successfully',
            inviteToken: newToken,
            inviteUrl: `${process.env.CLIENT_URL || 'http://localhost:8080'}/join/${newToken}`,
        });
    } catch (error) {
        console.error('Regenerate invite error:', error);
        res.status(500).json({ message: 'Server error regenerating invite link' });
    }
});

// @route   PUT /api/invites/:meetingId/external-sharing
// @desc    Enable or disable external (guest) sharing for a session
// @access  Private (owner only)
router.put('/:meetingId/external-sharing', protect, async (req, res) => {
    try {
        const { meetingId } = req.params;
        const { allowGuests } = req.body;

        if (typeof allowGuests !== 'boolean') {
            return res.status(400).json({ message: '"allowGuests" must be a boolean value' });
        }

        const meeting = await Meeting.findById(meetingId);

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        // Only the owner can change this setting
        if (meeting.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to change sharing settings for this meeting' });
        }

        meeting.allowGuests = allowGuests;
        await meeting.save();

        // Keep the Room in sync
        await Room.findOneAndUpdate(
            { meetingId: meeting._id },
            { allowGuests }
        );

        res.json({
            message: `External sharing ${allowGuests ? 'enabled' : 'disabled'} successfully`,
            allowGuests: meeting.allowGuests,
        });
    } catch (error) {
        console.error('External sharing toggle error:', error);
        res.status(500).json({ message: 'Server error updating sharing settings' });
    }
});

export default router;
