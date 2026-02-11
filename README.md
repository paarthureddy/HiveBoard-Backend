-# HiveBoard - Real-time Collaborative Whiteboard
+# HiveBoard Backend
  
-HiveBoard is a full-stack web application designed for real-time collaboration. It provides a shared canvas where users can draw, add sticky notes, and work together seamlessly.
+A Node.js backend server for HiveBoard, a real-time collaborative whiteboard application. Built with Express.js, Socket.io for real-time communication, MongoDB for data persistence, and integrated with Google Generative AI for AI-powered features.
  
-## Project Structure (Monorepo)
+## Features
  
-This project is structured as a **Monorepo** (Monolithic Repository), containing both the frontend and backend codebases in a single repository.
+- **Real-time Collaboration**: WebSocket-based drawing, chat, and live updates using Socket.io
+- **Authentication**: JWT-based auth with Google OAuth integration
+- **Meeting Management**: Create, update, and manage collaborative whiteboard sessions
+- **Invite System**: Generate shareable links for meeting invitations
+- **AI Integration**: Chat with AI assistant and generate images using Google Generative AI
+- **User Reports**: Activity tracking and usage statistics
+- **Guest Access**: Allow non-registered users to join meetings
  
-### Why Monorepo?
+## Tech Stack
  
-We chose a monorepo structure for the following reasons, which are beneficial for development and maintenance:
+- **Runtime**: Node.js with ES modules
+- **Framework**: Express.js
+- **Database**: MongoDB with Mongoose ODM
+- **Real-time**: Socket.io
+- **Authentication**: Passport.js with Google OAuth 2.0 and JWT
+- **AI**: Google Generative AI (Gemini models)
+- **Security**: bcryptjs for password hashing, CORS support
+- **Development**: Nodemon for hot reloading
  
-1.  **Unified Development Workflow**: Having both frontend and backend in one place simplifies the development process. Developers can run both servers, debug issues across the stack, and make full-stack changes in a single workflow.
-2.  **Atomic Commits**: Features often require changes in both the API (backend) and the UI (frontend). A monorepo allows us to commit these related changes together, ensuring that the codebase remains in a consistent state at every commit.
-3.  **Simplified Dependency Management**: Managing dependencies and scripts is centralized. We can easily orchestrate build and start commands for the entire application from the root.
-4.  **Code Sharing & Consistency**: While currently separate, a monorepo structure facilitates future sharing of types, interfaces, and utility functions between frontend and backend (e.g., using TypeScript interfaces for API responses).
-5.  **Easier Deployment Coordination**: Deploying full-stack features is streamlined as the source of truth is a single repository version.
+## Folder Structure
  
-## Architecture
+```
+HiveBoard-Backend-main/
+├── config/
+│   ├── db.js              # MongoDB connection configuration
+│   └── passport.js        # Passport.js Google OAuth strategy
+├── middleware/
+│   └── auth.js            # JWT authentication middleware
+├── models/
+│   ├── Meeting.js         # Meeting schema and model
+│   ├── Message.js         # Chat message schema
+│   ├── Room.js            # Socket room management schema
+│   └── User.js            # User authentication schema
+├── routes/
+│   ├── ai.js              # AI chat and image generation endpoints
+│   ├── auth.js            # Authentication routes (login, register, Google OAuth)
+│   ├── invites.js         # Meeting invitation and joining routes
+│   ├── meetings.js        # Meeting CRUD operations
+│   └── user.js            # User profile and reporting routes
+├── tests/                 # Unit and integration tests
+├── docker-compose.yml     # Docker Compose for local development
+├── exhaustive_test.js     # Comprehensive testing script
+├── index.js               # Main application entry point
+├── package.json           # Dependencies and scripts
+├── socketHandlers.js      # Socket.io event handlers
+└── test_genai.js          # AI functionality testing
+```
  
-*   **Frontend**: React (Vite) + TypeScript + Tailwind CSS
-    *   Hosted on [Vercel](https://vercel.com)
-    *   Provides the user interface for the whiteboard, dashboard, and authentication.
-*   **Backend**: Node.js + Express + Socket.io + MongoDB
-    *   Hosted on [Render](https://render.com)
-    *   Handles API requests, real-time WebSocket communication, and data persistence.
+## API Endpoints
  
-## Tech Stack
+### Authentication Routes (`/api/auth`)
  
-*   **Frontend**:
-    *   React 18
-    *   TypeScript
-    *   Vite
-    *   Tailwind CSS & Shadcn/ui
-    *   Framer Motion
-    *   Socket.io Client
-    *   Axios
-*   **Backend**:
-    *   Node.js
-    *   Express
-    *   Socket.io
-    *   Mongoose (MongoDB)
-    *   Passport.js (Google OAuth)
-    *   JsonWebToken (JWT)
+#### POST `/api/auth/register`
+Register a new user account.
+- **Body**: `{ "name": "string", "email": "string", "password": "string" }`
+- **Response**: User object with JWT token
+- **Access**: Public
  
-## Deployment Guide
+#### POST `/api/auth/login`
+Authenticate existing user.
+- **Body**: `{ "email": "string", "password": "string" }`
+- **Response**: User object with JWT token
+- **Access**: Public
  
-### Backend (Render)
+#### POST `/api/auth/google/verify`
+Verify Google OAuth token from client.
+- **Body**: `{ "credential": "google_id_token" }`
+- **Response**: User object with JWT token
+- **Access**: Public
  
-1.  **Root Directory**: `server`
-2.  **Build Command**: `npm install`
-3.  **Start Command**: `npm run start` (or `node index.js`)
-4.  **Environment Variables**:
-    *   `MONGODB_URI`: Connection string for MongoDB Atlas.
-    *   `JWT_SECRET`: Secret key for signing JWTs.
-    *   `GOOGLE_CLIENT_ID`: Google OAuth Client ID.
-    *   `GOOGLE_CLIENT_SECRET`: Google OAuth Client Secret.
-    *   `GOOGLE_CALLBACK_URL`: Production URL for OAuth callback (e.g., `https://your-backend.onrender.com/api/auth/google/callback`).
-    *   `FRONTEND_URL`: URL of the deployed frontend (e.g., `https://hiveboard.vercel.app`).
+#### GET `/api/auth/google`
+Initiate Google OAuth flow (redirects to Google).
+- **Access**: Public
  
-### Frontend (Vercel)
+#### GET `/api/auth/google/callback`
+Handle Google OAuth callback.
+- **Access**: Public
  
-1.  **Framework Preset**: Vite
-2.  **Build Command**: `npm run build`
-3.  **Output Directory**: `dist`
-4.  **Environment Variables**:
-    *   `VITE_API_URL`: URL of the deployed backend (e.g., `https://your-backend.onrender.com/api`).
-    *   `VITE_GOOGLE_CLIENT_ID`: Google OAuth Client ID.
+### Meeting Routes (`/api/meetings`)
  
-## Local Development
+#### GET `/api/meetings/public/:id`
+Get public meeting details for guests.
+- **Params**: `id` (meeting ID)
+- **Response**: Meeting info (title, canvas data for guests)
+- **Access**: Public (if meeting allows guests)
  
-1.  **Clone the repository**:
-    ```bash
-    git clone https://github.com/paarthureddy/HiveBoard.git
-    cd HiveBoard
-    ```
+#### GET `/api/meetings`
+Get all meetings created by authenticated user.
+- **Response**: Array of user's meetings (without canvas data)
+- **Access**: Private
  
-2.  **Install dependencies**:
-    *   Frontend: `npm install`
-    *   Backend: `cd server && npm install`
+#### GET `/api/meetings/:id`
+Get full details of a specific meeting.
+- **Params**: `id` (meeting ID)
+- **Response**: Complete meeting object
+- **Access**: Private (owner only)
  
-3.  **Setup Environment Variables**:
-    *   Create `.env` in root (frontend) and `server/.env` (backend) with keys from `.env.example` (if available) or the guide above.
+#### POST `/api/meetings`
+Create a new meeting.
+- **Body**: `{ "title": "string", "canvasData": {}, "thumbnail": "string" }`
+- **Response**: Created meeting object
+- **Access**: Private
  
-4.  **Run the application**:
-    *   Frontend: `npm run dev`
-    *   Backend: `cd server && npm run dev`
+#### PUT `/api/meetings/:id`
+Update an existing meeting.
+- **Params**: `id` (meeting ID)
+- **Body**: `{ "title": "string", "canvasData": {}, "thumbnail": "string" }`
+- **Response**: Updated meeting object
+- **Access**: Private (owner only)
+
+#### DELETE `/api/meetings/:id`
+Delete a meeting.
+- **Params**: `id` (meeting ID)
+- **Response**: Success message
+- **Access**: Private (owner only)
+
+### Invite Routes (`/api/invites`)
+
+#### POST `/api/invites/generate`
+Generate invite link for a meeting.
+- **Body**: `{ "meetingId": "string" }`
+- **Response**: `{ "inviteToken": "string", "inviteUrl": "string", "roomId": "string" }`
+- **Access**: Private (meeting owner)
+
+#### GET `/api/invites/:token`
+Validate invite token and get meeting details.
+- **Params**: `token` (invite token)
+- **Response**: Meeting and room info
+- **Access**: Public
+
+#### POST `/api/invites/:token/join`
+Join a meeting via invite token.
+- **Params**: `token` (invite token)
+- **Body**: `{ "guestName": "string" }` (optional for guests)
+- **Response**: Join details with guest ID
+- **Access**: Public
+
+#### PUT `/api/invites/:meetingId/toggle`
+Enable/disable invite link for a meeting.
+- **Params**: `meetingId`
+- **Body**: `{ "enabled": boolean }`
+- **Response**: Updated invite status
+- **Access**: Private (meeting owner)
+
+### AI Routes (`/api/ai`)
+
+#### POST `/api/ai/chat`
+Send message to AI assistant.
+- **Body**: `{ "message": "string", "context": { "stickyNotes": [], "textItems": [] } }`
+- **Response**: `{ "response": "string" }` or `{ "response": "string", "image": "url" }`
+- **Access**: Public
+
+#### GET `/api/ai/image-proxy`
+Proxy image requests to avoid CORS issues.
+- **Query**: `url` (image URL to proxy)
+- **Response**: Image data
+- **Access**: Public
+
+### User Routes (`/api/users`)
+
+#### GET `/api/users/report`
+Get user activity report.
+- **Response**: `{ "totalMeetings": number, "totalLinkShares": number, "totalStrokes": number, "estimatedTimeSpentMinutes": number, "memberSince": date }`
+- **Access**: Private
+
+### Health Check
+
+#### GET `/api/health`
+Check server status.
+- **Response**: `{ "status": "ok", "message": "Server is running" }`
+- **Access**: Public
+
+## Project Setup
+
+### Prerequisites
+
+- Node.js (v16 or higher)
+- MongoDB (local or Atlas)
+- npm or yarn
+
+### Installation
+
+1. **Clone the repository**:
+   ```bash
+   git clone <repository-url>
+   cd HiveBoard-Backend-main
+   ```
+
+2. **Install dependencies**:
+   ```bash
+   npm install
+   ```
+
+3. **Environment Setup**:
+   Create a `.env` file in the root directory with the required environment variables (see Credentials section below).
+
+4. **Database Setup**:
+   - For local MongoDB: Ensure MongoDB is running on default port (27017)
+   - For MongoDB Atlas: Use the connection string in `MONGODB_URI`
+
+## Starting the Application
+
+### Development Mode
+
+```bash
+npm run dev
+```
+
+This starts the server with hot reloading using nodemon. The server will run on `http://localhost:5000` by default.
+
+### Production Mode
+
+```bash
+npm start
+```
+
+This starts the server in production mode using node directly.
+
+### Docker Development
+
+Use Docker Compose for a complete development environment with MongoDB:
+
+```bash
+docker-compose up --build
+```
+
+This will start:
+- Backend server on port 3001
+- MongoDB on port 27017
+
+## Testing
+
+### Run Tests
+
+```bash
+npm test
+```
+
+### Exhaustive Testing
+
+Run comprehensive tests including AI functionality:
+
+```bash
+node exhaustive_test.js
+```
+
+### AI Testing
+
+Test AI features specifically:
+
+```bash
+node test_genai.js
+```
+
+## Deployment
+
+### Local Docker Deployment
+
+1. **Build and run with Docker Compose**:
+   ```bash
+   docker-compose up -d
+   ```
+
+2. **Access the application**:
+   - Backend API: `http://localhost:3001`
+   - MongoDB: `localhost:27017`
+
+### Production Deployment (Render)
+
+1. **Connect Repository**:
+   - Link your GitHub repository to Render
+   - Set the root directory to `HiveBoard-Backend-main` (or server folder if in monorepo)
+
+2. **Build Settings**:
+   - **Build Command**: `npm install`
+   - **Start Command**: `npm start`
+
+3. **Environment Variables**:
+   Set all required environment variables in Render's dashboard (see Credentials section).
+
+4. **Database**:
+   - Use MongoDB Atlas for production database
+   - Set `MONGODB_URI` to your Atlas connection string
+
+5. **Domain Configuration**:
+   - Update `FRONTEND_URL` and `CLIENT_URL` with your production frontend URL
+   - Configure Google OAuth redirect URIs with production domain
+
+## Credentials Required
+
+Create a `.env` file in the root directory with the following variables:
+
+### Database
+```env
+MONGODB_URI=mongodb://localhost:27017/hiveboard
+# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/hiveboard
+```
+
+### Authentication
+```env
+JWT_SECRET=your_super_secret_jwt_key_here
+```
+
+### Google OAuth
+```env
+GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
+GOOGLE_CLIENT_SECRET=your_google_client_secret
+GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
+```
+
+### AI Integration
+```env
+GOOGLE_API_KEY=your_google_generative_ai_api_key
+```
+
+### URLs
+```env
+FRONTEND_URL=http://localhost:8080
+CLIENT_URL=http://localhost:8080
+```
+
+### Server Configuration
+```env
+PORT=5000
+NODE_ENV=development
+```
+
+## Environment Variables Details
+
+- **MONGODB_URI**: MongoDB connection string
+- **JWT_SECRET**: Secret key for signing JWT tokens (use a strong, random string)
+- **GOOGLE_CLIENT_ID**: From Google Cloud Console OAuth 2.0 credentials
+- **GOOGLE_CLIENT_SECRET**: From Google Cloud Console OAuth 2.0 credentials
+- **GOOGLE_CALLBACK_URL**: OAuth callback URL (localhost for dev, production URL for prod)
+- **GOOGLE_API_KEY**: API key from Google AI Studio for Generative AI features
+- **FRONTEND_URL**: URL of the frontend application
+- **CLIENT_URL**: Base URL for client-side redirects
+- **PORT**: Server port (default: 5000)
+- **NODE_ENV**: Environment mode (development/production)
+
+## Socket.io Events
+
+The backend handles real-time communication through Socket.io with the following main events:
+
+- `join-room`: Join a meeting room
+- `leave-room`: Leave a meeting room
+- `drawing`: Real-time drawing updates
+- `chat-message`: Send chat messages
+- `canvas-update`: Canvas state synchronization
+- `user-joined`: Notify when users join
+- `user-left`: Notify when users leave

Link: https://hiveboard-ld89.onrender.com
