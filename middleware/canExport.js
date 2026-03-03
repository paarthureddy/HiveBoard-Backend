import mongoose from 'mongoose';
import Meeting from '../models/Meeting.js';

/**
 * canExport middleware
 * --------------------
 * Verifies that the authenticated (JWT) user has the right to export
 * content from a specific meeting.
 *
 * Permission tiers
 * ─────────────────
 *  owner      → can export everything (canvas, chat, analytics)
 *  participant → can export canvas + chat only  (NOT analytics)
 *  stranger   → 403
 *
 * Attaches to req:
 *   req.meeting        – the Meeting document
 *   req.exportRole     – 'owner' | 'participant'
 *
 * Usage:
 *   router.get('/canvas/:id', protect, canExport(), handler)
 *   router.get('/analytics/:id', protect, canExport({ ownerOnly: true }), handler)
 */
export const canExport = ({ ownerOnly = false } = {}) => {
    return async (req, res, next) => {
        try {
            const { id } = req.params;

            // Validate ObjectId format early
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ message: 'Invalid meeting ID' });
            }

            const meeting = await Meeting.findById(id);

            if (!meeting) {
                return res.status(404).json({ message: 'Meeting not found' });
            }

            const userId = req.user._id.toString();
            const isOwner = meeting.createdBy.toString() === userId;

            // Check owner first
            if (isOwner) {
                req.meeting = meeting;
                req.exportRole = 'owner';
                return next();
            }

            // If owner-only route, reject non-owners immediately
            if (ownerOnly) {
                return res.status(403).json({
                    message: 'Only the meeting owner can export this content',
                });
            }

            // Check if the user is an invited participant on the meeting
            const isParticipant = meeting.participants?.some(
                (p) => p.userId && p.userId.toString() === userId
            );

            if (!isParticipant) {
                return res.status(403).json({
                    message: 'You do not have permission to export content from this meeting',
                });
            }

            req.meeting = meeting;
            req.exportRole = 'participant';
            return next();
        } catch (err) {
            console.error('[canExport] middleware error:', err);
            return res.status(500).json({ message: 'Server error checking export permissions' });
        }
    };
};

export default canExport;
