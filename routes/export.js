import express from 'express';
import mongoose from 'mongoose';
import protect from '../middleware/auth.js';
import canExport from '../middleware/canExport.js';
import Message from '../models/Message.js';
import SessionActivity from '../models/SessionActivity.js';
import ActivityEvent from '../models/ActivityEvent.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSION MATRIX
// ─────────────────────────────────────────────────────────────────────────────
//  Route                              │ Owner │ Participant │ Guest
//  ────────────────────────────────── │───────│────────────│──────
//  GET /export/canvas/:id             │  ✅   │    ✅      │  ❌
//  GET /export/chat/:id               │  ✅   │    ✅      │  ❌
//  GET /export/analytics/:id          │  ✅   │    ❌      │  ❌
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/export/canvas/:id
 * @desc    Export the full canvas state (strokes, sticky notes, text items,
 *          croquis) of a meeting as structured JSON.
 * @access  Private — meeting owner OR participant
 *
 * Response:
 *   { meetingId, title, exportedAt, exportedBy, role, canvasData }
 */
router.get('/canvas/:id', protect, canExport(), async (req, res) => {
    try {
        const meeting = req.meeting; // set by canExport middleware

        // canvasData may be null/empty if no edits have been made yet
        const canvasData = meeting.canvasData || {
            strokes: [],
            stickyNotes: [],
            textItems: [],
            croquis: [],
        };

        return res.json({
            meetingId: meeting._id,
            title: meeting.title,
            exportedAt: new Date().toISOString(),
            exportedBy: {
                userId: req.user._id,
                name: req.user.name,
                email: req.user.email,
                role: req.exportRole,        // 'owner' | 'participant'
            },
            canvasData: {
                strokes: canvasData.strokes || [],
                stickyNotes: canvasData.stickyNotes || [],
                textItems: canvasData.textItems || [],
                croquis: canvasData.croquis || [],
                // summary counts for quick inspection
                summary: {
                    strokeCount: (canvasData.strokes || []).length,
                    stickyNoteCount: (canvasData.stickyNotes || []).length,
                    textItemCount: (canvasData.textItems || []).length,
                    croquisCount: (canvasData.croquis || []).length,
                },
            },
        });
    } catch (error) {
        console.error('[Export] canvas error:', error);
        return res.status(500).json({ message: 'Server error exporting canvas' });
    }
});

/**
 * @route   GET /api/export/chat/:id
 * @desc    Export the full chat history of a meeting as JSON.
 *          Supports an optional ?format=csv query param for CSV output.
 * @access  Private — meeting owner OR participant
 *
 * Query params:
 *   format  – "json" (default) | "csv"
 *   limit   – max messages to return (default 1000, max 5000)
 *
 * Response (JSON):
 *   { meetingId, title, exportedAt, exportedBy, messageCount, messages }
 */
router.get('/chat/:id', protect, canExport(), async (req, res) => {
    try {
        const meeting = req.meeting;
        const format = req.query.format === 'csv' ? 'csv' : 'json';
        const rawLimit = parseInt(req.query.limit, 10);
        const limit = isNaN(rawLimit) ? 1000 : Math.min(rawLimit, 5000);

        const messages = await Message.find({ meetingId: meeting._id })
            .sort({ timestamp: 1 })
            .limit(limit)
            .select('userName userId guestId content timestamp');

        if (format === 'csv') {
            // Build CSV in-memory — no temp file needed for typical chat sizes
            const header = 'timestamp,name,userId,guestId,content\n';
            const rows = messages.map((m) => {
                const ts = m.timestamp ? new Date(m.timestamp).toISOString() : '';
                const name = `"${(m.userName || '').replace(/"/g, '""')}"`;
                const uid = m.userId ? m.userId.toString() : '';
                const gid = m.guestId || '';
                const content = `"${(m.content || '').replace(/"/g, '""')}"`;
                return `${ts},${name},${uid},${gid},${content}`;
            });

            const csv = header + rows.join('\n');
            const filename = `hiveboard-chat-${meeting._id}-${Date.now()}.csv`;

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.send(csv);
        }

        // Default: JSON
        return res.json({
            meetingId: meeting._id,
            title: meeting.title,
            exportedAt: new Date().toISOString(),
            exportedBy: {
                userId: req.user._id,
                name: req.user.name,
                email: req.user.email,
                role: req.exportRole,
            },
            messageCount: messages.length,
            messages: messages.map((m) => ({
                timestamp: m.timestamp,
                sender: m.userName || 'Anonymous',
                userId: m.userId || null,
                guestId: m.guestId || null,
                content: m.content,
            })),
        });
    } catch (error) {
        console.error('[Export] chat error:', error);
        return res.status(500).json({ message: 'Server error exporting chat' });
    }
});

/**
 * @route   GET /api/export/analytics/:id
 * @desc    Export a full activity analytics report for the meeting.
 *          Returns session-level and event-level data with summary totals.
 *          Supports ?format=csv for a flat CSV of all sessions.
 * @access  Private — meeting OWNER only
 *
 * Query params:
 *   format  – "json" (default) | "csv"
 *
 * Response (JSON):
 *   { meetingId, title, exportedAt, exportedBy, overview, sessions, eventBreakdown }
 */
router.get('/analytics/:id', protect, canExport({ ownerOnly: true }), async (req, res) => {
    try {
        const meeting = req.meeting;
        const format = req.query.format === 'csv' ? 'csv' : 'json';

        // Fetch all sessions for this meeting
        const sessions = await SessionActivity.find({ meetingId: meeting._id })
            .sort({ joinedAt: 1 })
            .populate('userId', 'name email');

        // Aggregate totals
        let totalDuration = 0;
        let totalStrokes = 0;
        let totalStickies = 0;
        let totalMessages = 0;
        let totalTexts = 0;
        let totalCroquis = 0;
        const uniqueUsers = new Set();
        const uniqueGuests = new Set();

        for (const s of sessions) {
            totalDuration += s.durationSeconds || 0;
            totalStrokes += s.summary.strokeCount;
            totalStickies += s.summary.stickyNoteCount;
            totalMessages += s.summary.messageCount;
            totalTexts += s.summary.textItemCount;
            totalCroquis += s.summary.croquisCount;
            if (s.userId) uniqueUsers.add(s.userId._id?.toString() ?? s.userId.toString());
            if (s.guestId) uniqueGuests.add(s.guestId);
        }

        // Event breakdown via aggregation
        const eventBreakdown = await ActivityEvent.aggregate([
            { $match: { meetingId: new mongoose.Types.ObjectId(meeting._id) } },
            { $group: { _id: '$eventType', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);

        if (format === 'csv') {
            // One row per session — flat CSV for spreadsheet consumption
            const header = [
                'sessionId', 'participantName', 'type', 'userId', 'guestId',
                'role', 'joinedAt', 'leftAt', 'durationSeconds',
                'strokeCount', 'stickyNoteCount', 'messageCount',
                'textItemCount', 'croquisCount',
            ].join(',') + '\n';

            const rows = sessions.map((s) => {
                const type = s.userId ? 'user' : 'guest';
                const uid = s.userId ? (s.userId._id?.toString() ?? s.userId.toString()) : '';
                const name = `"${(s.participantName || '').replace(/"/g, '""')}"`;
                return [
                    s._id,
                    name,
                    type,
                    uid,
                    s.guestId || '',
                    s.role,
                    s.joinedAt ? new Date(s.joinedAt).toISOString() : '',
                    s.leftAt ? new Date(s.leftAt).toISOString() : '',
                    s.durationSeconds ?? '',
                    s.summary.strokeCount,
                    s.summary.stickyNoteCount,
                    s.summary.messageCount,
                    s.summary.textItemCount,
                    s.summary.croquisCount,
                ].join(',');
            });

            const csv = header + rows.join('\n');
            const filename = `hiveboard-analytics-${meeting._id}-${Date.now()}.csv`;

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.send(csv);
        }

        // Default: full JSON report
        return res.json({
            meetingId: meeting._id,
            title: meeting.title,
            createdAt: meeting.createdAt,
            exportedAt: new Date().toISOString(),
            exportedBy: {
                userId: req.user._id,
                name: req.user.name,
                email: req.user.email,
            },
            overview: {
                totalSessions: sessions.length,
                uniqueAuthenticatedUsers: uniqueUsers.size,
                uniqueGuests: uniqueGuests.size,
                totalDurationSeconds: totalDuration,
                totalDurationMinutes: parseFloat((totalDuration / 60).toFixed(2)),
                averageSessionDurationSeconds: sessions.length
                    ? Math.round(totalDuration / sessions.length)
                    : 0,
                totalStrokes,
                totalStickyNotes: totalStickies,
                totalMessages,
                totalTextItems: totalTexts,
                totalCroquis,
            },
            sessions: sessions.map((s) => ({
                sessionId: s._id,
                participant: s.userId
                    ? { type: 'user', id: s.userId._id, name: s.userId.name, email: s.userId.email }
                    : { type: 'guest', id: s.guestId, name: s.participantName },
                role: s.role,
                joinedAt: s.joinedAt,
                leftAt: s.leftAt,
                durationSeconds: s.durationSeconds,
                summary: s.summary,
            })),
            eventBreakdown: eventBreakdown.map((e) => ({
                eventType: e._id,
                count: e.count,
            })),
        });
    } catch (error) {
        console.error('[Export] analytics error:', error);
        return res.status(500).json({ message: 'Server error exporting analytics' });
    }
});

export default router;
