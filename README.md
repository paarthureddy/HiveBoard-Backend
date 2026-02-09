# HiveBoard - Real-time Collaborative Whiteboard

HiveBoard is a full-stack web application designed for real-time collaboration. It provides a shared canvas where users can draw, add sticky notes, and work together seamlessly.

## Project Structure (Monorepo)

This project is structured as a **Monorepo** (Monolithic Repository), containing both the frontend and backend codebases in a single repository.

### Why Monorepo?

We chose a monorepo structure for the following reasons, which are beneficial for development and maintenance:

1.  **Unified Development Workflow**: Having both frontend and backend in one place simplifies the development process. Developers can run both servers, debug issues across the stack, and make full-stack changes in a single workflow.
2.  **Atomic Commits**: Features often require changes in both the API (backend) and the UI (frontend). A monorepo allows us to commit these related changes together, ensuring that the codebase remains in a consistent state at every commit.
3.  **Simplified Dependency Management**: Managing dependencies and scripts is centralized. We can easily orchestrate build and start commands for the entire application from the root.
4.  **Code Sharing & Consistency**: While currently separate, a monorepo structure facilitates future sharing of types, interfaces, and utility functions between frontend and backend (e.g., using TypeScript interfaces for API responses).
5.  **Easier Deployment Coordination**: Deploying full-stack features is streamlined as the source of truth is a single repository version.

## Architecture

*   **Frontend**: React (Vite) + TypeScript + Tailwind CSS
    *   Hosted on [Vercel](https://vercel.com)
    *   Provides the user interface for the whiteboard, dashboard, and authentication.
*   **Backend**: Node.js + Express + Socket.io + MongoDB
    *   Hosted on [Render](https://render.com)
    *   Handles API requests, real-time WebSocket communication, and data persistence.

## Tech Stack

*   **Frontend**:
    *   React 18
    *   TypeScript
    *   Vite
    *   Tailwind CSS & Shadcn/ui
    *   Framer Motion
    *   Socket.io Client
    *   Axios
*   **Backend**:
    *   Node.js
    *   Express
    *   Socket.io
    *   Mongoose (MongoDB)
    *   Passport.js (Google OAuth)
    *   JsonWebToken (JWT)

## Deployment Guide

### Backend (Render)

1.  **Root Directory**: `server`
2.  **Build Command**: `npm install`
3.  **Start Command**: `npm run start` (or `node index.js`)
4.  **Environment Variables**:
    *   `MONGODB_URI`: Connection string for MongoDB Atlas.
    *   `JWT_SECRET`: Secret key for signing JWTs.
    *   `GOOGLE_CLIENT_ID`: Google OAuth Client ID.
    *   `GOOGLE_CLIENT_SECRET`: Google OAuth Client Secret.
    *   `GOOGLE_CALLBACK_URL`: Production URL for OAuth callback (e.g., `https://your-backend.onrender.com/api/auth/google/callback`).
    *   `FRONTEND_URL`: URL of the deployed frontend (e.g., `https://hiveboard.vercel.app`).

### Frontend (Vercel)

1.  **Framework Preset**: Vite
2.  **Build Command**: `npm run build`
3.  **Output Directory**: `dist`
4.  **Environment Variables**:
    *   `VITE_API_URL`: URL of the deployed backend (e.g., `https://your-backend.onrender.com/api`).
    *   `VITE_GOOGLE_CLIENT_ID`: Google OAuth Client ID.

## Local Development

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/paarthureddy/HiveBoard.git
    cd HiveBoard
    ```

2.  **Install dependencies**:
    *   Frontend: `npm install`
    *   Backend: `cd server && npm install`

3.  **Setup Environment Variables**:
    *   Create `.env` in root (frontend) and `server/.env` (backend) with keys from `.env.example` (if available) or the guide above.

4.  **Run the application**:
    *   Frontend: `npm run dev`
    *   Backend: `cd server && npm run dev`
