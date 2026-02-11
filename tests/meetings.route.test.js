
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// 1. Mock DB connection
vi.mock('../config/db.js', () => ({
    default: vi.fn(),
}));

// 2. Mock Passport (dependencies of app)
vi.mock('../config/passport.js', () => ({
    default: {
        initialize: vi.fn(() => (req, res, next) => next()),
        authenticate: vi.fn(() => (req, res, next) => next()),
    }
}));

// 3. Mock Auth Middleware to simulate logged-in user
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

const mockUser = { _id: 'user123' }; // Re-declare for test assertions

// 4. Mock Meeting Model
// We need to handle method chaining for .find().sort().select()
const mockFindQuery = {
    sort: vi.fn().mockReturnThis(),
    select: vi.fn(), // Will be configured in tests
};

vi.mock('../models/Meeting.js', () => ({
    default: {
        findById: vi.fn(),
        find: vi.fn(() => mockFindQuery),
        create: vi.fn(),
        deleteOne: vi.fn(),
    }
}));

import { app } from '../index.js';
import Meeting from '../models/Meeting.js';

describe('Meeting Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default behavior for find chain: return empty array
        mockFindQuery.select.mockResolvedValue([]);
    });

    // --- GET /api/meetings (List) ---
    it('GET /api/meetings - should return list of user meetings', async () => {
        const mockMeetings = [{ title: 'Meeting 1' }, { title: 'Meeting 2' }];
        
        // Setup chain mock
        mockFindQuery.select.mockResolvedValue(mockMeetings);

        const res = await request(app).get('/api/meetings');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual(mockMeetings);
        expect(Meeting.find).toHaveBeenCalledWith({ createdBy: mockUser._id });
        expect(mockFindQuery.sort).toHaveBeenCalledWith({ updatedAt: -1 });
        expect(mockFindQuery.select).toHaveBeenCalledWith('-canvasData');
    });

    // --- GET /api/meetings/:id (Single) ---
    it('GET /api/meetings/:id - should return single meeting if authorized', async () => {
        const mockMeeting = {
            _id: 'meeting123',
            title: 'My Meeting',
            createdBy: 'user123', // Matches mockUser._id
            canvasData: {}
        };
        Meeting.findById.mockResolvedValue(mockMeeting);

        const res = await request(app).get('/api/meetings/meeting123');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual(mockMeeting);
    });

    it('GET /api/meetings/:id - should return 403 if not owner', async () => {
        const mockMeeting = {
            _id: 'meeting123',
            title: 'Someone Else Meeting',
            createdBy: 'otheruser', // Does NOT match mockUser._id
        };
        Meeting.findById.mockResolvedValue(mockMeeting);

        const res = await request(app).get('/api/meetings/meeting123');

        expect(res.statusCode).toEqual(403);
    });

    it('GET /api/meetings/:id - should return 404 if not found', async () => {
        Meeting.findById.mockResolvedValue(null);

        const res = await request(app).get('/api/meetings/nonexistent');

        expect(res.statusCode).toEqual(404);
    });

    // --- POST /api/meetings (Create) ---
    it('POST /api/meetings - should create a new meeting', async () => {
        const newMeetingData = {
            title: 'Brainstorming',
            canvasData: { some: 'data' }
        };
        const createdMeeting = {
            _id: 'new123',
            ...newMeetingData,
            createdBy: mockUser._id
        };

        Meeting.create.mockResolvedValue(createdMeeting);

        const res = await request(app)
            .post('/api/meetings')
            .send(newMeetingData);

        expect(res.statusCode).toEqual(201);
        expect(res.body).toEqual(createdMeeting);
        expect(Meeting.create).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Brainstorming',
            createdBy: 'user123'
        }));
    });

    // --- PUT /api/meetings/:id (Update) ---
    it('PUT /api/meetings/:id - should update meeting if owner', async () => {
        const mockSave = vi.fn().mockResolvedValue({ 
            _id: 'meeting123', 
            title: 'Updated Title',
            createdBy: 'user123'
        });

        const mockMeeting = {
            _id: 'meeting123',
            title: 'Old Title',
            createdBy: 'user123',
            save: mockSave
        };

        Meeting.findById.mockResolvedValue(mockMeeting);

        const res = await request(app)
            .put('/api/meetings/meeting123')
            .send({ title: 'Updated Title' });

        expect(res.statusCode).toEqual(200);
        expect(mockMeeting.title).toBe('Updated Title'); // Verify direct mutation
        expect(mockSave).toHaveBeenCalled();
    });

    // --- DELETE /api/meetings/:id (Delete) ---
    it('DELETE /api/meetings/:id - should delete meeting if owner', async () => {
        const mockDeleteOne = vi.fn().mockResolvedValue({});
        
        const mockMeeting = {
            _id: 'meeting123',
            createdBy: 'user123',
            deleteOne: mockDeleteOne
        };

        Meeting.findById.mockResolvedValue(mockMeeting);

        const res = await request(app).delete('/api/meetings/meeting123');

        expect(res.statusCode).toEqual(200);
        expect(mockDeleteOne).toHaveBeenCalled();
    });
});
