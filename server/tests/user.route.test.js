
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// 1. Mock DB
vi.mock('../config/db.js', () => ({
    default: vi.fn(),
}));

// 2. Mock Passport
vi.mock('../config/passport.js', () => ({
    default: {
        initialize: vi.fn(() => (req, res, next) => next()),
        authenticate: vi.fn(() => (req, res, next) => next()),
    }
}));

// 3. Mock Auth Middleware
vi.mock('../middleware/auth.js', () => {
    const mockProtect = vi.fn((req, res, next) => {
        req.user = { _id: 'user123', createdAt: new Date('2023-01-01') };
        next();
    });
    return {
        default: mockProtect,
        protect: mockProtect
    };
});

// 4. Mock Models
vi.mock('../models/User.js', () => ({
    default: {
        findById: vi.fn(),
    }
}));

vi.mock('../models/Meeting.js', () => ({
    default: {
        countDocuments: vi.fn(),
        find: vi.fn(),
    }
}));

import { app } from '../index.js';
import User from '../models/User.js';
import Meeting from '../models/Meeting.js';

describe('User Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // --- GET /api/users/report ---
    describe('GET /api/users/report', () => {
        it('should generate report and update user stats', async () => {
            // Mock Live Data: 2 meetings. 
            // Mtg1: 10 strokes, invite enabled. 
            // Mtg2: 5 strokes, invite disabled.
            Meeting.countDocuments.mockResolvedValue(2);

            const mockMeetings = [
                { canvasData: { strokes: Array(10).fill('s') }, inviteEnabled: true },
                { canvasData: { strokes: Array(5).fill('s') }, inviteEnabled: false },
            ];
            
            const mockFindQuery = {
                select: vi.fn().mockResolvedValue(mockMeetings)
            };
            Meeting.find.mockReturnValue(mockFindQuery);

            // Mock User History (lower than live to test update)
            const mockUserInstance = {
                _id: 'user123',
                reportData: { accumulatedStrokes: 0, accumulatedTimeMinutes: 0 },
                save: vi.fn(),
            };
            User.findById.mockResolvedValue(mockUserInstance);

            const res = await request(app).get('/api/users/report');

            expect(res.statusCode).toEqual(200);
            
            // Validate Live Counts
            // Total strokes: 10 + 5 = 15
            // Total meetings: 2
            // Total shares: 1
            expect(res.body.totalStrokes).toBe(15);
            expect(res.body.totalMeetings).toBe(2);
            expect(res.body.totalLinkShares).toBe(1);

            // Validate DB Update (High Water Mark)
            // It should have saved the new max values
            expect(mockUserInstance.save).toHaveBeenCalled();
            expect(mockUserInstance.reportData.accumulatedStrokes).toBe(15);
        });

        it('should handle zero activity gracefully', async () => {
            Meeting.countDocuments.mockResolvedValue(0);
            Meeting.find.mockReturnValue({ select: vi.fn().mockResolvedValue([]) });

            const mockUserInstance = {
                 _id: 'user123',
                // No reportData initialized yet
                save: vi.fn(),
            };
            User.findById.mockResolvedValue(mockUserInstance);

            const res = await request(app).get('/api/users/report');

            expect(res.statusCode).toEqual(200);
            expect(res.body.totalMeetings).toBe(0);
            expect(res.body.totalStrokes).toBe(0);
        });

        it('should return 500 on database error', async () => {
            Meeting.countDocuments.mockRejectedValue(new Error('DB Failure'));

            const res = await request(app).get('/api/users/report');

            expect(res.statusCode).toEqual(500);
        });
    });
});
