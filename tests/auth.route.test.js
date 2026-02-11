
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Mock DB connection to prevent actual connection attempts
vi.mock('../config/db.js', () => ({
    default: vi.fn(),
}));

// STUB: Mock Passport Config BEFORE importing app to prevent "Google Strategy requires clientID" error
vi.mock('../config/passport.js', () => ({
    default: {
        initialize: vi.fn(() => (req, res, next) => next()),
        authenticate: vi.fn(() => (req, res, next) => next()),
    }
}));

import { app } from '../index.js'; // Now import app after mocking dependencies

// Mock jsonwebtoken
vi.mock('jsonwebtoken');

// Mock User Model (The STUB)
vi.mock('../models/User.js', () => ({
    default: {
        findOne: vi.fn(),
        create: vi.fn(),
    }
}));

// Import the MOCKED User model so we can control its return values in tests
import User from '../models/User.js';

describe('Auth Routes (Integration)', () => {
    // Reset mocks before each test to clean state
    beforeEach(() => {
        vi.clearAllMocks();
        // Setup basic JWT behavior for all tests
        jwt.sign.mockReturnValue('mocktoken');
    });

    // 1. REGISTER TEST
    it('POST /api/auth/register - should create user and return token', async () => {
        const newUser = {
            name: 'New User',
            email: 'new@example.com',
            password: 'password123'
        };

        // STUB: User does not exist yet (findOne -> null)
        User.findOne.mockResolvedValue(null); 
        // STUB: Creating user returns the user object with an ID
        User.create.mockResolvedValue({
            _id: 'newuser123',
            ...newUser
        });

        const res = await request(app)
            .post('/api/auth/register')
            .send(newUser);

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('token', 'mocktoken');
        expect(User.create).toHaveBeenCalledWith(newUser);
    });

    // 2. REGISTER ERROR (User Exists)
    it('POST /api/auth/register - should fail if user already exists', async () => {
        const existingUser = {
            name: 'Existing User',
            email: 'existing@example.com',
            password: 'password123'
        };

        // STUB: User DOES exist (findOne -> user object)
        User.findOne.mockResolvedValue(existingUser);

        const res = await request(app)
            .post('/api/auth/register')
            .send(existingUser);

        expect(res.statusCode).toEqual(400);
        expect(res.body).toHaveProperty('message', 'User already exists with this email');
        expect(User.create).not.toHaveBeenCalled(); // Should NOT save to DB
    });

    // 3. LOGIN TEST
    it('POST /api/auth/login - should login and return token', async () => {
        // We mock the `comparePassword` method which exists on the User instance
        const mockUserInstance = {
            _id: 'user123',
            email: 'login@example.com',
            password: 'hashedpassword',
            comparePassword: vi.fn().mockResolvedValue(true) // STUB: Password matches!
        };

        // STUB: Find user by email returns our mock instance
        // Chain .select() because the controller uses it
        const mockQuery = Promise.resolve(mockUserInstance);
        mockQuery.select = vi.fn().mockReturnValue(mockQuery);
        User.findOne.mockReturnValue(mockQuery);

        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'login@example.com',
                password: 'password123'
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token', 'mocktoken');
        expect(mockUserInstance.comparePassword).toHaveBeenCalledWith('password123');
    });

    // 4. LOGIN FAILURE (Wrong Password)
    it('POST /api/auth/login - should fail with wrong password', async () => {
        const mockUserInstance = {
             _id: 'user123',
            email: 'login@example.com',
            password: 'hashedpassword',
            comparePassword: vi.fn().mockResolvedValue(false) // STUB: Password matches NO!
        };

        const mockQuery = Promise.resolve(mockUserInstance);
        mockQuery.select = vi.fn().mockReturnValue(mockQuery);
        User.findOne.mockReturnValue(mockQuery);

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'login@example.com', password: 'wrongpassword' });

        expect(res.statusCode).toEqual(401);
        expect(res.body).toHaveProperty('message', 'Invalid email or password');
    });
});
