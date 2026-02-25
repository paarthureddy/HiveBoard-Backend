import express from 'express';
import ActivityLog from '../models/ActivityLog.js';
import Room from '../models/Room.js';
import { auth, guestAuth } from '../middleware/auth.js';

const router = express.Router();

// Get session analytics summary
router.get('/summary/:roomId', async (req, res) => {
    try {
        const { roomId } = req.params;

        const logs = await ActivityLog.find({ roomId }).sort({ timestamp: 1 });

        if (!logs) {
            return res.status(404).json({ message: 'No logs found for this room' });
        }

        const totalEdits = logs.filter(log => log.action === 'edit').length;
        const viewers = new Set(logs.filter(log => log.action === 'view').map(log => log.userId || log.guestId));
        const totalViewers = viewers.size;

        // Group actions over time for activity timeline
        const activityTimeline = logs.reduce((acc, log) => {
            const date = new Date(log.timestamp).toISOString().split('T')[0];
            if (!acc[date]) {
                acc[date] = { edits: 0, views: 0, joins: 0 };
            }
            if (log.action === 'edit') acc[date].edits++;
            if (log.action === 'view') acc[date].views++;
            if (log.action === 'join') acc[date].joins++;
            return acc;
        }, {});

        // Participation metrics
        const userContributions = logs.reduce((acc, log) => {
            const userKey = log.userName || log.guestId || log.userId || 'Unknown';
            if (!acc[userKey]) {
                acc[userKey] = { editCount: 0, viewCount: 0, joinCount: 0 };
            }
            if (log.action === 'edit') acc[userKey].editCount++;
            if (log.action === 'view') acc[userKey].viewCount++;
            if (log.action === 'join') acc[userKey].joinCount++;
            return acc;
        }, {});

        res.json({
            totalEdits,
            totalViewers,
            activityTimeline,
            userContributions
        });
    } catch (error) {
        console.error('Error fetching analytics summary:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user specific contribution report
router.get('/user/:roomId/:userId', async (req, res) => {
    try {
        const { roomId, userId } = req.params;

        const logs = await ActivityLog.find({
            roomId,
            $or: [{ userId }, { guestId: userId }]
        }).sort({ timestamp: 1 });

        const editCount = logs.filter(log => log.action === 'edit').length;

        // Calculate session time (naive approach: diff between first join and last leave/action)
        let sessionTimeMs = 0;
        if (logs.length > 0) {
            const firstAction = new Date(logs[0].timestamp).getTime();
            const lastAction = new Date(logs[logs.length - 1].timestamp).getTime();
            sessionTimeMs = lastAction - firstAction;
        }

        res.json({
            editCount,
            sessionTimeMinutes: Math.round(sessionTimeMs / 60000)
        });

    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get detailed edit history
router.get('/history/:roomId', async (req, res) => {
    try {
        const { roomId } = req.params;
        const edits = await ActivityLog.find({ roomId, action: 'edit' })
            .sort({ timestamp: -1 })
            .limit(100); // Last 100 edits

        res.json(edits);
    } catch (error) {
        console.error('Error fetching edit history:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
