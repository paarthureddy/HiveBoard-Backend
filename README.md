# 🐝 HiveBoard Backend

Backend API for HiveBoard – collaborative whiteboard and meeting platform.

Hosted on Render.

---

# 🚀 Tech Stack

- Node.js
- Express.js
- MongoDB (Mongoose)
- Passport.js (Google OAuth)
- JWT Authentication
- Docker Support

---

# 📁 Project Structure

```
HiveBoard-Backend/
├── controllers/
├── routes/
├── models/
├── middleware/
├── config/
├── utils/
├── server.js / index.js
├── package.json
└── docker-compose.yml
```

---

# 🔧 Environment Variables

Create a `server/.env` or `.env` file in the root:

```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_key
GOOGLE_CLIENT_ID=767957186138-4t7th40ckqjplcs5gabf7gre42r7vhf3.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
FRONTEND_URL=http://localhost:5173
PORT=5000
```

### Variable Explanation

- `MONGODB_URI` → MongoDB Atlas connection string
- `JWT_SECRET` → Secret for signing JWT tokens
- `GOOGLE_CLIENT_ID` → Same client ID used in frontend
- `GOOGLE_CLIENT_SECRET` → Google OAuth secret
- `GOOGLE_CALLBACK_URL` → OAuth redirect URL
- `FRONTEND_URL` → Allowed frontend origin
- `PORT` → Backend server port

---

# 🔗 API Base URL

Local:
```
http://localhost:5000/api
```

Production:
```
https://your-backend.onrender.com/api
```

---

# 📡 API Endpoints

## 🔐 Authentication
- POST `/auth/login`
- POST `/auth/register`
- POST `/auth/google/verify`
- GET `/auth/me`

## 📅 Meetings
- GET `/meetings`
- GET `/meetings/:id`
- GET `/meetings/public/:id`
- POST `/meetings`
- PUT `/meetings/:id`
- DELETE `/meetings/:id`

## 📩 Invites
- POST `/invites/generate`
- GET `/invites/:token`
- POST `/invites/:token/join`
- PUT `/invites/:meetingId/toggle`

## 👤 Users
- GET `/users/report`

---

# 💻 Local Setup

### 1️⃣ Clone Repository

```bash
git clone https://github.com/paarthureddy/HiveBoard-Backend.git
cd HiveBoard-Backend
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Run Server

```bash
npm run dev
```

Server runs on:

```
http://localhost:5000
```

---

# 🚀 Deployment

Hosted on **Render**.

Steps:
1. Connect GitHub repository
2. Add environment variables
3. Deploy

---

# 🔗 Frontend Repository

Frontend code:

👉 https://github.com/paarthureddy/-HiveBoard-Frontend

---

# 📄 License

Educational Project
