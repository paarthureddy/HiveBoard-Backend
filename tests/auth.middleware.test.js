
import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { protect } from '../middleware/auth.js';

// Mock Modules
vi.mock('jsonwebtoken');

// Mock User Model
// Since tests run in a different module scope, we must ensure mocks are setup correctly relative to imports
// We will mock the module import of '../models/User.js'
vi.mock('../models/User.js', () => ({
    default: {
        findById: vi.fn()
    }
}));

// Import User after mocking to get the mocked version
import User from '../models/User.js';

describe('Auth Middleware', () => {
    let req, res, next;

    // Reset mocks before each test
    beforeEach(() => {
        req = { headers: {} };
        // Setup simple res mock that allows chaining status().json()
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        next = vi.fn();
        vi.clearAllMocks();
        
        // Setup User mock behavior
        User.findById.mockReturnValue({
            select: vi.fn().mockResolvedValue({ _id: 'user123', name: 'Test User' })
        });
    });

    it('should call next() if token is valid', async () => {
        req.headers.authorization = 'Bearer valid-token';
        jwt.verify.mockReturnValue({ id: 'user123' }); // Mock successful verify

        await protect(req, res, next);

        expect(jwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
        expect(User.findById).toHaveBeenCalledWith('user123');
        expect(next).toHaveBeenCalledTimes(1); // Success!
    });

    it('should return 401 if no token provided', async () => {
        // No header
        await protect(req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Not authorized, no token' }));
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', async () => {
        req.headers.authorization = 'Bearer invalid-token';
        jwt.verify.mockImplementation(() => { throw new Error('Invalid token'); }); // Mock failure

        await protect(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Not authorized, token failed' }));
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token format is wrong (no Bearer)', async () => {
        req.headers.authorization = 'Basic token123';
        
        await protect(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });
});
