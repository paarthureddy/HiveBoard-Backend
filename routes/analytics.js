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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/metrics/:meetingId
// Processes raw activity logs into meaningful KPIs:
//   - edits (strokes + sticky notes + text + croquis)
//   - views (participants who never edited)
//   - participation rate, avg session duration, peak activity hour
// Access: Private — meeting owner only
// ─────────────────────────────────────────────────────────────────────────────
router.get('/metrics/:meetingId', protect, async (req, res) => {
    try {
        const { meetingId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(meetingId)) {
            return res.status(400).json({ message: 'Invalid meeting ID' });
        }

        // Ownership check
        const meeting = await Meeting.findById(meetingId);
        if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
        if (meeting.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const sessions = await SessionActivity.find({ meetingId });

        if (sessions.length === 0) {
            return res.json({ meetingId, message: 'No sessions recorded yet', metrics: null });
        }

        let totalEdits = 0;
        let viewerCount = 0;
        let editorCount = 0;
        let totalDuration = 0;

        const sessionMetrics = sessions.map(s => {
            const edits = s.summary.strokeCount + s.summary.stickyNoteCount +
                s.summary.textItemCount + s.summary.croquisCount;
            const isViewer = edits === 0;

            totalEdits += edits;
            totalDuration += s.durationSeconds || 0;
            if (isViewer) viewerCount++; else editorCount++;

            // Participation score: weighted combination of edits + messages + duration
            const durationMinutes = (s.durationSeconds || 0) / 60;
            const participationScore = parseFloat(
                ((edits * 2) + (s.summary.messageCount * 1.5) + (durationMinutes * 0.5)).toFixed(2)
            );

            return {
                sessionId: s._id,
                participantName: s.participantName,
                role: s.role,
                joinedAt: s.joinedAt,
                leftAt: s.leftAt,
                durationSeconds: s.durationSeconds,
                edits,
                messages: s.summary.messageCount,
                participationScore,
                isViewer,
            };
        });

        // Peak activity hour from ActivityEvent
        const peakHour = await ActivityEvent.aggregate([
            { $match: { meetingId: new mongoose.Types.ObjectId(meetingId) } },
            {
                $group: {
                    _id: { $hour: '$timestamp' },
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
            { $limit: 1 },
        ]);

        const totalParticipants = sessions.length;
        const participationRate = parseFloat(((editorCount / totalParticipants) * 100).toFixed(1));
        const avgSessionDurationSeconds = Math.round(totalDuration / totalParticipants);

        res.json({
            meetingId,
            title: meeting.title,
            metrics: {
                totalParticipants,
                editorCount,
                viewerCount,
                participationRate: `${participationRate}%`,
                totalEdits,
                avgSessionDurationSeconds,
                avgSessionDurationMinutes: parseFloat((avgSessionDurationSeconds / 60).toFixed(2)),
                peakActivityHour: peakHour[0]?._id ?? null,
            },
            sessionBreakdown: sessionMetrics.sort((a, b) => b.participationScore - a.participationScore),
        });
    } catch (error) {
        console.error('[Analytics] metrics error:', error);
        res.status(500).json({ message: 'Server error generating metrics' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/analytics/compare
// Compare two or more sessions side by side.
// Body: { sessionIds: ["id1", "id2", ...] }  (2–10 sessions)
// Access: Private
// ─────────────────────────────────────────────────────────────────────────────
router.post('/compare', protect, async (req, res) => {
    try {
        const { sessionIds } = req.body;

        if (!Array.isArray(sessionIds) || sessionIds.length < 2) {
            return res.status(400).json({ message: 'Provide at least 2 sessionIds to compare' });
        }

        if (sessionIds.length > 10) {
            return res.status(400).json({ message: 'Cannot compare more than 10 sessions at once' });
        }

        // Validate all IDs
        const invalid = sessionIds.find(id => !mongoose.Types.ObjectId.isValid(id));
        if (invalid) return res.status(400).json({ message: `Invalid session ID: ${invalid}` });

        const sessions = await SessionActivity.find({ _id: { $in: sessionIds } })
            .populate('meetingId', 'title createdAt createdBy')
            .populate('userId', 'name email');

        if (sessions.length === 0) {
            return res.status(404).json({ message: 'No sessions found for given IDs' });
        }

        // Ensure the user owns the meetings referenced by these sessions
        const unauthorised = sessions.find(
            s => s.meetingId?.createdBy?.toString() !== req.user._id.toString()
        );
        if (unauthorised) {
            return res.status(403).json({ message: 'Not authorized to compare one or more of these sessions' });
        }

        // Build per-session comparison object
        const comparison = sessions.map(s => {
            const edits = s.summary.strokeCount + s.summary.stickyNoteCount +
                s.summary.textItemCount + s.summary.croquisCount;
            const durationMinutes = parseFloat(((s.durationSeconds || 0) / 60).toFixed(2));
            const participationScore = parseFloat(
                ((edits * 2) + (s.summary.messageCount * 1.5) + (durationMinutes * 0.5)).toFixed(2)
            );

            return {
                sessionId: s._id,
                meeting: {
                    id: s.meetingId?._id,
                    title: s.meetingId?.title ?? 'Untitled',
                },
                participant: s.userId
                    ? { type: 'user', name: s.userId.name, email: s.userId.email }
                    : { type: 'guest', name: s.participantName },
                role: s.role,
                joinedAt: s.joinedAt,
                leftAt: s.leftAt,
                durationSeconds: s.durationSeconds,
                durationMinutes,
                metrics: {
                    edits,
                    strokes: s.summary.strokeCount,
                    stickyNotes: s.summary.stickyNoteCount,
                    textItems: s.summary.textItemCount,
                    croquis: s.summary.croquisCount,
                    messages: s.summary.messageCount,
                    participationScore,
                },
            };
        });

        // Summary diff — best vs worst across compared sessions
        const scores = comparison.map(c => c.metrics.participationScore);
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);

        res.json({
            comparedSessions: comparison.length,
            winner: comparison.find(c => c.metrics.participationScore === maxScore),
            summary: {
                highestParticipationScore: maxScore,
                lowestParticipationScore: minScore,
                scoreDifference: parseFloat((maxScore - minScore).toFixed(2)),
            },
            sessions: comparison,
        });
    } catch (error) {
        console.error('[Analytics] compare error:', error);
        res.status(500).json({ message: 'Server error comparing sessions' });
    }
});

export default router;

