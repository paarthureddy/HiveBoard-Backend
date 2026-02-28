import mongoose from 'mongoose';
import SessionActivity from '../models/SessionActivity.js';
import ActivityEvent from '../models/ActivityEvent.js';

/**
 * ActivityService
 * ----------------
 * Central service for all session-activity tracking.
 * 
 * Usage pattern (from socketHandlers.js):
 *   const session = await ActivityService.startSession({ meetingId, userId, ... });
 *   await ActivityService.logEvent(session._id, { meetingId, eventType: 'draw-stroke', ... });
 *   await ActivityService.endSession(session._id);
 * 
 * All methods swallow errors internally so that a tracking failure
 * NEVER crashes the real-time socket layer.
 */
class ActivityService {
    /**
     * Create a new SessionActivity document when a user joins a room.
     * Returns the created document, or null on failure.
     *
     * @param {Object} opts
     * @param {string}  opts.meetingId
     * @param {string}  [opts.userId]       – ObjectId string (authenticated users)
     * @param {string}  [opts.guestId]      – random hex string (guests)
     * @param {string}  [opts.participantName]
     * @param {string}  [opts.role]
     * @param {string}  [opts.socketId]
     */
    static async startSession({ meetingId, userId, guestId, participantName, role, socketId }) {
        try {
            const session = await SessionActivity.create({
                meetingId,
                userId: userId || null,
                guestId: guestId || null,
                participantName: participantName || 'Anonymous',
                role: role || 'guest',
                socketId,
                joinedAt: new Date(),
            });

            // Log the join event
            await ActivityService.logEvent(session._id, {
                meetingId,
                userId: userId || null,
                guestId: guestId || null,
                eventType: 'join',
                meta: { socketId },
            });

            return session;
        } catch (err) {
            console.error('[ActivityService] startSession error:', err.message);
            return null;
        }
    }

    /**
     * Close an open session when the user disconnects or leaves the room.
     * Computes duration and sets leftAt.
     *
     * @param {string} sessionId – _id of the SessionActivity document
     */
    static async endSession(sessionId) {
        if (!sessionId) return;
        try {
            const session = await SessionActivity.findById(sessionId);
            if (!session || session.leftAt) return; // already closed

            const now = new Date();
            session.leftAt = now;
            session.durationSeconds = Math.round((now - session.joinedAt) / 1000);
            await session.save();

            // Log the leave event
            await ActivityService.logEvent(sessionId, {
                meetingId: session.meetingId,
                userId: session.userId,
                guestId: session.guestId,
                eventType: 'leave',
                meta: { durationSeconds: session.durationSeconds },
            });
        } catch (err) {
            console.error('[ActivityService] endSession error:', err.message);
        }
    }

    /**
     * Append an ActivityEvent and bump the relevant summary counter
     * on the parent SessionActivity document.
     *
     * @param {string} sessionId
     * @param {Object} opts
     * @param {string}  opts.meetingId
     * @param {string}  [opts.userId]
     * @param {string}  [opts.guestId]
     * @param {string}  opts.eventType
     * @param {Object}  [opts.meta]
     */
    static async logEvent(sessionId, { meetingId, userId, guestId, eventType, meta = {} }) {
        if (!sessionId || !meetingId || !eventType) return;
        try {
            await ActivityEvent.create({
                sessionId,
                meetingId,
                userId: userId || null,
                guestId: guestId || null,
                eventType,
                timestamp: new Date(),
                meta,
            });

            // Map event types to summary counter fields
            const incrementMap = {
                'draw-stroke': 'summary.strokeCount',
                'add-sticky': 'summary.stickyNoteCount',
                'send-message': 'summary.messageCount',
                'add-text': 'summary.textItemCount',
                'add-croquis': 'summary.croquisCount',
            };

            const field = incrementMap[eventType];
            if (field) {
                await SessionActivity.findByIdAndUpdate(sessionId, {
                    $inc: { [field]: 1 },
                });
            }
        } catch (err) {
            console.error(`[ActivityService] logEvent(${eventType}) error:`, err.message);
        }
    }

    /**
     * Log that an invite link was used to enter a meeting.
     * Useful for tracking invite-driven growth and session attribution.
     *
     * @param {Object} opts
     * @param {string} opts.meetingId
     * @param {string} [opts.userId]
     * @param {string} [opts.guestId]
     * @param {string} [opts.inviteToken]
     * @param {string} [opts.participantName]
     */
    static async logInviteUsed({ meetingId, userId, guestId, inviteToken, participantName }) {
        try {
            await ActivityEvent.create({
                sessionId: new mongoose.Types.ObjectId(), // synthetic session id for attribution-only events
                meetingId,
                userId: userId || null,
                guestId: guestId || null,
                eventType: 'invite-used',
                meta: { inviteToken, participantName },
            });
        } catch (err) {
            console.error('[ActivityService] logInviteUsed error:', err.message);
        }
    }
}

export default ActivityService;
