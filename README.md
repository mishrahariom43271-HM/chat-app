# 💬 Chat App — Real-Time MERN Chat Application

A full-stack real-time chat application built with the **MERN stack** and **Socket.io**, featuring group and private rooms, typing indicators, read receipts, file sharing, emoji reactions, and role-based room administration.

**🔗 Live Demo:** [chat-app-rho-five-sa3r13pwl7.vercel.app](https://chat-app-rho-five-sa3r13pwl7.vercel.app)
**⚙️ Backend API:** [chat-app-i8sb.onrender.com](https://chat-app-i8sb.onrender.com)

> Note: The backend is hosted on Render's free tier, which spins down after periods of inactivity. The first request after idle time may take 30–50 seconds to respond while the server wakes up.

---

## ✨ Features

### Authentication
- Secure user registration and login with **JWT stored in httpOnly cookies**
- Passwords hashed with bcrypt before storage
- Protected routes and Socket.io connections (JWT verified on both REST and WebSocket layers)
- Rate limiting on login/register to prevent brute-force attempts

### Real-Time Messaging
- Instant message delivery using **Socket.io**
- Message persistence in MongoDB with **compound indexing** (`room + createdAt`) for fast paginated queries
- **"Load older messages"** pagination — messages load in batches of 20 instead of all at once
- Typing indicators (per room)
- Online presence tracking (live list of connected users)
- **Sent / Read** receipts, updated in real time as recipients view messages

### Rooms & Group Chat
- Create **public** rooms (anyone can join instantly) or **private** rooms (join by request)
- Room **search** with live suggestions as you type
- Admin role for room creators:
  - Approve or reject join requests
  - View member list with online status
  - Delete the room
- Regular members can **leave** a room at any time
- Room member list with live online indicators

### Rich Messaging
- **File & image sharing** via Cloudinary (images render inline, other files as download links)
- **Emoji reactions** on messages (toggle on/off, live count updates for all members)
- Sound notification on incoming messages
- Colored usernames (consistent per-user color) for easy scanning in group chats

### UI/UX
- Discord-inspired **dark theme** with a three-column layout (rooms · chat · members)
- Fully responsive design (collapses gracefully on smaller screens)
- Smooth micro-animations (message fade-in, hover states, button feedback)
- Empty states for rooms with no messages yet

---

## 🛠️ Tech Stack

**Frontend**
- React (Vite)
- React Router
- Tailwind CSS
- Axios
- Socket.io Client

**Backend**
- Node.js + Express
- Socket.io
- MongoDB + Mongoose
- JWT (jsonwebtoken) for authentication
- bcryptjs for password hashing
- Multer + Cloudinary for file uploads
- express-rate-limit for brute-force protection

**Infrastructure**
- MongoDB Atlas (database)
- Cloudinary (media storage)
- Render (backend hosting)
- Vercel (frontend hosting)

---

## 📁 Project Structure

```
chat-app/
├── client/                 # React frontend
│   └── src/
│       ├── pages/          # Login, Register, Chat
│       ├── api.js          # Axios instance
│       └── socket.js       # Socket.io client instance
└── server/                 # Express backend
    ├── config/             # DB and Cloudinary config
    ├── controllers/        # Route logic (auth, rooms)
    ├── middleware/          # JWT auth middleware
    ├── models/             # Mongoose schemas (User, Room, Message)
    ├── routes/             # Express route definitions
    └── server.js           # Entry point + Socket.io event handlers
```

---

## 🚀 Running Locally

### Prerequisites
- Node.js (v18+)
- A MongoDB Atlas connection string (or local MongoDB)
- A Cloudinary account (free tier works)

### 1. Clone the repository
```bash
git clone https://github.com/mishrahariom43271-HM/chat-app.git
cd chat-app
```

### 2. Set up the backend
```bash
cd server
npm install
```

Create a `.env` file in `server/`:
```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Start the backend:
```bash
npm run dev
```

### 3. Set up the frontend
```bash
cd ../client
npm install
```

Create a `.env` file in `client/`:
```
VITE_API_URL=http://localhost:5000
```

Start the frontend:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## 🔒 Key Engineering Decisions

- **httpOnly cookies over localStorage** for JWT storage, reducing XSS attack surface
- **Compound MongoDB index** on `{ room, createdAt }` to keep paginated message queries fast as chat history grows
- **Socket.io middleware** authenticates every WebSocket connection using the same JWT used for REST APIs, keeping a single source of truth for identity
- **Cross-domain cookie configuration** (`sameSite: "none"`, `secure: true` in production) to support the frontend and backend being hosted on separate domains
- **Rate limiting** at both the REST layer (login/register) and the Socket.io layer (message sending) to reduce abuse

---

## 🔮 Future Improvements

- Redis adapter for Socket.io to support horizontal scaling across multiple server instances
- Message search within a room
- Push notifications
- Voice/video calling
- Message editing and deletion

---

## 👤 Author

**Hariom Mishra**
GitHub: [@mishrahariom43271-HM](https://github.com/mishrahariom43271-HM)
