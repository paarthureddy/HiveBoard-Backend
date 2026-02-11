
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

// 1. Mock DB (standard)
vi.mock('../config/db.js', () => ({
    default: vi.fn(),
}));

// 2. Mock Passport (standard)
vi.mock('../config/passport.js', () => ({
    default: {
        initialize: vi.fn(() => (req, res, next) => next()),
        authenticate: vi.fn(() => (req, res, next) => next()),
    }
}));

// 3. Mock GoogleGenerativeAI (constructor only, since code uses fetch)
vi.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: vi.fn(),
}));

import { app } from '../index.js';

// Setup global fetch mock
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('AI Routes', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...originalEnv, GOOGLE_API_KEY: 'test_api_key' };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    // --- POST /api/ai/chat ---
    describe('POST /api/ai/chat', () => {
        it('should return 500 if API key is missing', async () => {
            delete process.env.GOOGLE_API_KEY;

            const res = await request(app)
                .post('/api/ai/chat')
                .send({ message: 'Hello' });

            expect(res.statusCode).toEqual(500);
            expect(res.body.message).toBe('Missing API Key');
        });

        it('should return 400 if message is missing', async () => {
            const res = await request(app)
                .post('/api/ai/chat')
                .send({});

            expect(res.statusCode).toEqual(400);
            expect(res.body.message).toBe('Message is required');
        });

        it('should return Gemini response if successful', async () => {
            // Mock successful Gemini response
            const mockGeminiResponse = {
                candidates: [{
                    content: {
                        parts: [{ text: 'Hello from Gemini!' }]
                    }
                }]
            };

            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => mockGeminiResponse,
            });

            const res = await request(app)
                .post('/api/ai/chat')
                .send({ message: 'Hi' });

            // Expect success
            expect(res.statusCode).toEqual(200);
            expect(res.body.response).toBe('Hello from Gemini!');
            // Check that fetch was called with correct URL structure
            expect(fetchMock).toHaveBeenCalledWith(
                expect.stringContaining('generativelanguage.googleapis.com'),
                expect.anything()
            );
        });

        it('should fallback to image generation if keyword present', async () => {
            // Simulate Gemini failing (or returning generic error) to force fallback?
            // Actually the code tries Gemini first for everything.
            // If the user asks "generate image", the system prompt tells Gemini to return an image URL.
            
            // Scenario 1: Gemini returns the markdown image tag as instructed by system prompt
            const mockGeminiImageResponse = {
                candidates: [{
                    content: {
                        parts: [{ text: '![IMAGE](https://pollinations.ai/p/art)' }]
                    }
                }]
            };

            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => mockGeminiImageResponse,
            });

            const res = await request(app)
                .post('/api/ai/chat')
                .send({ message: 'Generate an image of a cat' });

            expect(res.statusCode).toEqual(200);
            expect(res.body.image).toBe('https://pollinations.ai/p/art');
        });

        it('should trigger direct image fallback if Gemini fails fully', async () => {
            // Mock Gemini failure for all 3 attempts
            fetchMock
                .mockRejectedValueOnce(new Error('Gemini Fail 1'))
                .mockRejectedValueOnce(new Error('Gemini Fail 2'))
                .mockRejectedValueOnce(new Error('Gemini Fail 3'));

            const res = await request(app)
                .post('/api/ai/chat')
                .send({ message: 'Show me a dog' });

            // Logic fallbacks to Pollinations image construction
            expect(res.statusCode).toEqual(200);
            expect(res.body.response).toBe('Generating image...');
            expect(res.body.image).toContain('/api/ai/image-proxy?url=');
        });
    });

    // --- GET /api/ai/image-proxy ---
    describe('GET /api/ai/image-proxy', () => {
        it('should proxy image correctly', async () => {
            const mockImageBuffer = Buffer.from('fake_image_data');
            
            fetchMock.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: {
                    get: (header) => header.toLowerCase() === 'content-type' ? 'image/png' : null
                },
                arrayBuffer: async () => mockImageBuffer,
            });

            const res = await request(app).get('/api/ai/image-proxy?url=http://example.com/image.png');

            expect(res.statusCode).toEqual(200);
            expect(res.headers['content-type']).toBe('image/png');
            expect(res.body.toString()).toBe('fake_image_data');
        });

        it('should return 400 if url missing', async () => {
            const res = await request(app).get('/api/ai/image-proxy');
            expect(res.statusCode).toEqual(400);
        });

        it('should return 500 if upstream fetch fails', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                headers: { get: () => null }
            });

            const res = await request(app).get('/api/ai/image-proxy?url=http://bad.url');

            expect(res.statusCode).toEqual(404);
        });
    });
});
