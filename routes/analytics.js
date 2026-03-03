import express from 'express';
import mongoose from 'mongoose';
import SessionActivity from '../models/SessionActivity.js';
import ActivityEvent from '../models/ActivityEvent.js';
import Meeting from '../models/Meeting.js';
import protect from '../middleware/auth.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/user-report
// Returns an aggregated activity report for the authenticated user across all
// meetings they have participated in.
// Access: Private (authenticated users only)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/user-report', protect, async (req, res) => {
    try {
        const userId = req.user._id;

        // ── Aggregate all sessions for this user ──────────────────────────────
        const sessions = await SessionActivity.find({ userId })
            .populate('meetingId', 'title createdAt')
            .sort({ joinedAt: -1 });

        const totalSessions = sessions.length;
        let totalDurationSeconds = 0;
        let totalStrokes = 0;
        let totalStickyNotes = 0;
        let totalMessages = 0;
        let totalTextItems = 0;
        let totalCroquis = 0;

        const perMeetingMap = new Map();

        for (const s of sessions) {
            totalDurationSeconds += s.durationSeconds || 0;
            totalStrokes += s.summary.strokeCount;
            totalStickyNotes += s.summary.stickyNoteCount;
            totalMessages += s.summary.messageCount;
            totalTextItems += s.summary.textItemCount;
            totalCroquis += s.summary.croquisCount;

            const mid = s.meetingId?._id?.toString() ?? s.meetingId?.toString();
            if (!mid) continue;

            if (!perMeetingMap.has(mid)) {
                perMeetingMap.set(mid, {
                    meetingId: mid,
                    title: s.meetingId?.title ?? 'Untitled',
                    sessions: 0,
                    totalDurationSeconds: 0,
                    strokeCount: 0,
                    stickyNoteCount: 0,
                    messageCount: 0,
                    textItemCount: 0,
                    croquisCount: 0,
                    lastJoinedAt: null,
                });
            }

            const m = perMeetingMap.get(mid);
            m.sessions += 1;
            m.totalDurationSeconds += s.durationSeconds || 0;
            m.strokeCount += s.summary.strokeCount;
            m.stickyNoteCount += s.summary.stickyNoteCount;
            m.messageCount += s.summary.messageCount;
            m.textItemCount += s.summary.textItemCount;
            m.croquisCount += s.summary.croquisCount;
            if (!m.lastJoinedAt || s.joinedAt > m.lastJoinedAt) {
                m.lastJoinedAt = s.joinedAt;
            }
        }

        // ── Recent events (last 20) ───────────────────────────────────────────
        const recentEvents = await ActivityEvent.find({ userId })
            .sort({ timestamp: -1 })
            .limit(20)
            .select('eventType timestamp meetingId meta');

        res.json({
            userId,
            overview: {
                totalSessions,
                totalDurationSeconds,
                totalDurationMinutes: parseFloat((totalDurationSeconds / 60).toFixed(2)),
                totalStrokes,
                totalStickyNotes,
                totalMessages,
                totalTextItems,
                totalCroquis,
            },
            perMeeting: Array.from(perMeetingMap.values()),
            recentEvents,
        });
    } catch (error) {
        console.error('[Analytics] user-report error:', error);
        res.status(500).json({ message: 'Server error generating user report' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/meeting/:id
// Returns a full activity report for a specific meeting.
// Access: Private — only the meeting owner may view this.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/meeting/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid meeting ID' });
        }

        // Verify meeting ownership
        const meeting = await Meeting.findById(id).populate('createdBy', 'name email');
        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }
        if (meeting.createdBy._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to view analytics for this meeting' });
        }

        // ── All sessions for this meeting ─────────────────────────────────────
        const sessions = await SessionActivity.find({ meetingId: id })
            .sort({ joinedAt: -1 })
            .populate('userId', 'name email avatar');

        const totalSessions = sessions.length;
        const uniqueUserIds = new Set();
        const uniqueGuestIds = new Set();
        let totalDurationSeconds = 0;
        let totalStrokes = 0;
        let totalStickyNotes = 0;
        let totalMessages = 0;
        let totalTextItems = 0;
        let totalCroquis = 0;

        for (const s of sessions) {
            if (s.userId) uniqueUserIds.add(s.userId._id?.toString() ?? s.userId.toString());
            if (s.guestId) uniqueGuestIds.add(s.guestId);
            totalDurationSeconds += s.durationSeconds || 0;
            totalStrokes += s.summary.strokeCount;
            totalStickyNotes += s.summary.stickyNoteCount;
            totalMessages += s.summary.messageCount;
            totalTextItems += s.summary.textItemCount;
            totalCroquis += s.summary.croquisCount;
        }

        // ── Event volume over time (hourly buckets) ───────────────────────────
        const hourlyBuckets = await ActivityEvent.aggregate([
            {
                $match: { meetingId: new mongoose.Types.ObjectId(id) },
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$timestamp' },
                        month: { $month: '$timestamp' },
                        day: { $dayOfMonth: '$timestamp' },
                        hour: { $hour: '$timestamp' },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } },
        ]);

        // ── Event breakdown by type ───────────────────────────────────────────
        const eventBreakdown = await ActivityEvent.aggregate([
            { $match: { meetingId: new mongoose.Types.ObjectId(id) } },
            { $group: { _id: '$eventType', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);

        // ── Invite-used count ─────────────────────────────────────────────────
        const inviteUsedCount = await ActivityEvent.countDocuments({
            meetingId: new mongoose.Types.ObjectId(id),
            eventType: 'invite-used',
        });

        res.json({
            meeting: {
                _id: meeting._id,
                title: meeting.title,
                createdBy: meeting.createdBy,
                createdAt: meeting.createdAt,
            },
            overview: {
                totalSessions,
                uniqueAuthenticatedUsers: uniqueUserIds.size,
                uniqueGuests: uniqueGuestIds.size,
                totalDurationSeconds,
                averageSessionDurationSeconds: totalSessions > 0
                    ? Math.round(totalDurationSeconds / totalSessions)
                    : 0,
                totalStrokes,
                totalStickyNotes,
                totalMessages,
                totalTextItems,
                totalCroquis,
                inviteUsedCount,
            },
            sessions: sessions.map(s => ({
                _id: s._id,
                participant: s.userId
                    ? { type: 'user', id: s.userId._id, name: s.userId.name, email: s.userId.email, avatar: s.userId.avatar }
                    : { type: 'guest', id: s.guestId, name: s.participantName },
                role: s.role,
                joinedAt: s.joinedAt,
                leftAt: s.leftAt,
                durationSeconds: s.durationSeconds,
                summary: s.summary,
            })),
            activityTimeline: hourlyBuckets,
            eventBreakdown,
        });
    } catch (error) {
        console.error('[Analytics] meeting report error:', error);
        res.status(500).json({ message: 'Server error generating meeting report' });
    }
});

export default router;
