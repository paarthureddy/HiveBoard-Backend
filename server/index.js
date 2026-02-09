import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import passportConfig from './config/passport.js';
import authRoutes from './routes/auth.js';
import meetingRoutes from './routes/meetings.js';
import inviteRoutes from './routes/invites.js';
import aiRoutes from './routes/ai.js';
import userRoutes from './routes/user.js';
import { setupSocketHandlers } from './socketHandlers.js';

// Load environment variables from .env file
dotenv.config();

// Connect to MongoDB database
connectDB();

// Initialize Express app
const app = express();

// Create HTTP server instance (needed for Socket.io)
const httpServer = createServer(app);

// Initialize Socket.io server with CORS configuration
/* 
   Socket.io enables real-time, bidirectional communication between web clients and servers.
   We configure CORS (Cross-Origin Resource Sharing) to allow connections from any origin 
   and support credentials (cookies/headers).
*/
const io = new Server(httpServer, {
    cors: {
        origin: true,
        methods: ['GET', 'POST'],
        credentials: true,
    },
    maxHttpBufferSize: 1e8, // Increase buffer size to 100 MB for large image uploads
});

// Setup Socket.io event handlers (drawing, chat, etc.)
setupSocketHandlers(io);

// Middleware Configuration
/* 
   - cors: Allows cross-origin requests
   - express.json: Parses incoming JSON payloads
   - express.urlencoded: Parses URL-encoded data
   - cookieParser: Parses cookies attached to the client request object
*/
app.use(cors({
    origin: true, // Allow any origin
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Initialize Passport for authentication strategies (like Google OAuth)
app.use(passportConfig.initialize());

// API Routes
/* 
   Mounting route handlers to specific paths.
   - /api/auth: Authentication (Login, Register, Google OAuth)
   - /api/meetings: Meeting management (Create, collaborative tools)
   - /api/invites: Handling meeting invitations
   - /api/ai: AI-powered features
   - /api/users: User profile and data
*/
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/users', userRoutes);

// Health check route to verify server status
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// 404 Handler: Catches requests to undefined routes
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Global Error Handler: Catches and logs server errors
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ message: 'Internal server error' });
});

// Start the server and listen on the specified port
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
    httpServer.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📡 API available at http://localhost:${PORT}/api`);
        console.log(`🔌 WebSocket server ready`);
    });
}

export { app, httpServer };
