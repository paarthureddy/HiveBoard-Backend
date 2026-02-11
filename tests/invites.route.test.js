
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// 1. Mock DB connection
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
        req.user = { _id: 'user123' };
        next();
    });
    return {
        default: mockProtect,
        protect: mockProtect
    };
});

const mockUser = { _id: 'user123' };

// 4. Mock Models
vi.mock('../models/Meeting.js', () => ({
    default: {
        findById: vi.fn(),
        findOne: vi.fn(),
        save: vi.fn(),
    }
}));

vi.mock('../models/Room.js', () => ({
    default: {
        findOne: vi.fn(),
        create: vi.fn(),
    }
}));

// Mock Crypto for deterministic tokens
vi.mock('crypto', () => ({
    default: {
        randomBytes: vi.fn(() => ({
            toString: () => 'mocked_token_123'
        }))
    }
}));

import { app } from '../index.js';
import Meeting from '../models/Meeting.js';
import Room from '../models/Room.js';

describe('Invite Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // --- POST /api/invites/generate ---
    describe('POST /api/invites/generate', () => {
        it('should generate invite link for meeting owner', async () => {
            const mockMeeting = {
                _id: 'meeting123',
                createdBy: 'user123',
                save: vi.fn(),
            };
            Meeting.findById.mockResolvedValue(mockMeeting);
            
            const mockRoom = { roomId: 'room123' };
            Room.findOne.mockResolvedValue(mockRoom);

            const res = await request(app)
                .post('/api/invites/generate')
                .send({ meetingId: 'meeting123' });

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('inviteToken', 'mocked_token_123');
            expect(res.body).toHaveProperty('roomId', 'room123');
            expect(mockMeeting.inviteEnabled).toBe(true);
            expect(mockMeeting.save).toHaveBeenCalled();
        });

        it('should return 403 if not owner', async () => {
            const mockMeeting = {
                _id: 'meeting123',
                createdBy: 'otherUser',
            };
            Meeting.findById.mockResolvedValue(mockMeeting);

            const res = await request(app)
                .post('/api/invites/generate')
                .send({ meetingId: 'meeting123' });

            expect(res.statusCode).toEqual(403);
            expect(res.body.message).toMatch(/Not authorized/);
        });

        it('should return 404 if meeting not found', async () => {
            Meeting.findById.mockResolvedValue(null);

            const res = await request(app)
                .post('/api/invites/generate')
                .send({ meetingId: 'missing123' });

            expect(res.statusCode).toEqual(404);
        });
    });

    // --- GET /api/invites/:token ---
    describe('GET /api/invites/:token', () => {
        it('should return meeting details for valid token', async () => {
            const mockMeeting = {
                _id: 'meeting123',
                title: 'Test Meeting',
                createdBy: { name: 'Owner', email: 'owner@example.com' },
                inviteEnabled: true,
                populate: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
            };
            // Simulate the chain: findOne -> populate -> select -> resolvedValue
            // Since we use mockReturnThis(), the final 'await' will look for a 'then' or strictly return the object if not promise-like enough.
            // Better: make populate/select return a Promise-like object that resolves to the meeting.
            
            const mockQuery = Promise.resolve(mockMeeting);
            mockQuery.populate = vi.fn().mockReturnValue(mockQuery);
            mockQuery.select = vi.fn().mockReturnValue(mockQuery);
            
            Meeting.findOne.mockReturnValue(mockQuery);

            const mockRoom = { roomId: 'room123', activeConnections: [] };
            Room.findOne.mockResolvedValue(mockRoom);

            const res = await request(app).get('/api/invites/valid_token');

            expect(res.statusCode).toEqual(200);
            expect(res.body.meeting.title).toBe('Test Meeting');
            expect(res.body.room.roomId).toBe('room123');
        });

        it('should return 403 if invite disabled', async () => {
             const mockMeeting = {
                inviteEnabled: false,
                populate: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
            };
            const mockQuery = Promise.resolve(mockMeeting);
            mockQuery.populate = vi.fn().mockReturnValue(mockQuery);
            mockQuery.select = vi.fn().mockReturnValue(mockQuery);
            
            Meeting.findOne.mockReturnValue(mockQuery);

            const res = await request(app).get('/api/invites/disabled_token');

            expect(res.statusCode).toEqual(403);
            expect(res.body.message).toMatch(/disabled/);
        });

        it('should return 404 if token invalid', async () => {
            // Mock findOne chain to return null
            const mockQuery = Promise.resolve(null);
            mockQuery.populate = vi.fn().mockReturnValue(mockQuery);
            mockQuery.select = vi.fn().mockReturnValue(mockQuery);
            Meeting.findOne.mockReturnValue(mockQuery);

            const res = await request(app).get('/api/invites/invalid_token');

            expect(res.statusCode).toEqual(404);
        });
    });

    // --- POST /api/invites/:token/join ---
    describe('POST /api/invites/:token/join', () => {
        it('should allow joining with valid token', async () => {
            const mockMeeting = {
                _id: 'meeting123',
                inviteEnabled: true,
                createdBy: 'owner123'
            };
            Meeting.findOne.mockResolvedValue(mockMeeting);

            const mockRoom = { roomId: 'room123' };
            Room.findOne.mockResolvedValue(mockRoom);

            const res = await request(app)
                .post('/api/invites/valid_token/join')
                .send({ guestName: 'Guest User' });

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('roomId', 'room123');
            expect(res.body).toHaveProperty('guestId');
            expect(res.body.role).toBe('guest');
        });

        it('should return 403 if invite disabled', async () => {
            const mockMeeting = { inviteEnabled: false };
            Meeting.findOne.mockResolvedValue(mockMeeting);

            const res = await request(app)
                .post('/api/invites/disabled_token/join')
                .send({ guestName: 'Guest' });

            expect(res.statusCode).toEqual(403);
        });
    });

    // --- PUT /api/invites/:meetingId/toggle ---
    describe('PUT /api/invites/:meetingId/toggle', () => {
        it('should toggle invite status if owner', async () => {
            const mockMeeting = {
                _id: 'meeting123',
                createdBy: 'user123',
                inviteEnabled: true,
                save: vi.fn(),
            };
            Meeting.findById.mockResolvedValue(mockMeeting);

            const res = await request(app)
                .put('/api/invites/meeting123/toggle')
                .send({ enabled: false });

            expect(res.statusCode).toEqual(200);
            expect(mockMeeting.inviteEnabled).toBe(false);
            expect(mockMeeting.save).toHaveBeenCalled();
        });

        it('should return 403 if not owner', async () => {
             const mockMeeting = {
                _id: 'meeting123',
                createdBy: 'otherUser',
            };
            Meeting.findById.mockResolvedValue(mockMeeting);

             const res = await request(app)
                .put('/api/invites/meeting123/toggle')
                .send({ enabled: false });

            expect(res.statusCode).toEqual(403);
        });
    });
});
