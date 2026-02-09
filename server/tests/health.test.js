
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index.js'; // Import the exported app

// Mock the database connection to prevent real connection attempts during tests
vi.mock('../config/db.js', () => ({
    default: vi.fn(),
}));

// Mock socket handlers to avoid socket initialization issues
vi.mock('../socketHandlers.js', () => ({
    setupSocketHandlers: vi.fn(),
}));

// Mock passport to avoid configuration issues
vi.mock('../config/passport.js', () => ({
    default: {
        initialize: vi.fn(() => (req, res, next) => next()),
    },
}));

// Mock all route modules to isolate the health check test
vi.mock('../routes/auth.js', () => ({ default: (req, res, next) => next() }));
vi.mock('../routes/meetings.js', () => ({ default: (req, res, next) => next() }));
vi.mock('../routes/invites.js', () => ({ default: (req, res, next) => next() }));
vi.mock('../routes/ai.js', () => ({ default: (req, res, next) => next() }));
vi.mock('../routes/user.js', () => ({ default: (req, res, next) => next() }));

describe('Health Check API', () => {
    it('GET /api/health should return 200 OK', async () => {
        const res = await request(app).get('/api/health');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('status', 'ok');
        expect(res.body).toHaveProperty('message', 'Server is running');
    });
});
