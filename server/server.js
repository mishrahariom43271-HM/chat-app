import "dotenv/config";
import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import User from "./models/User.js";
import Message from "./models/Message.js";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL, credentials: true },
});

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => res.send("Server is running"));
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/upload", uploadRoutes);

function parseCookies(rawCookie) {
    if (!rawCookie) return {};
    return Object.fromEntries(
        rawCookie.split("; ").filter(Boolean).map((c) => {
            const idx = c.indexOf("=");
            return [c.slice(0, idx), decodeURIComponent(c.slice(idx + 1))];
        })
    );
}

io.use(async (socket, next) => {
    try {
        const cookies = parseCookies(socket.handshake.headers.cookie);
        const token = cookies.token;
        if (!token) return next(new Error("Not authenticated"));
        const { id } = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(id);
        if (!user) return next(new Error("User not found"));
        socket.user = user;
        next();
    } catch (err) {
        next(new Error("Authentication failed"));
    }
});

const onlineUsers = new Map();

function broadcastOnlineUsers() {
    const list = [...onlineUsers.values()].map((u) => u.username);
    io.emit("online_users", list);
}

io.on("connection", (socket) => {
    const userId = socket.user._id.toString();

    let messageCount = 0;
    const rateLimitInterval = setInterval(() => {
        messageCount = 0;
    }, 10000);

    if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, { username: socket.user.username, sockets: new Set() });
    }
    onlineUsers.get(userId).sockets.add(socket.id);
    broadcastOnlineUsers();

    socket.on("join_room", (roomId) => {
        socket.join(roomId);
    });

    socket.on("send_message", async (data) => {
        messageCount++;
        if (messageCount > 20) {
            return socket.emit("error_message", "You're sending messages too fast. Slow down.");
        }

        const message = await Message.create({
            sender: socket.user._id,
            text: data.text || "",
            room: data.roomId,
            fileUrl: data.fileUrl || null,
            fileType: data.fileType || null,
        });

        io.to(data.roomId).emit("receive_message", {
            _id: message._id,
            text: message.text,
            fileUrl: message.fileUrl,
            fileType: message.fileType,
            sender: { _id: socket.user._id, username: socket.user.username },
            room: data.roomId,
            createdAt: message.createdAt,
            readBy: [],
            reactions: [],
        });
    });

    socket.on("add_reaction", async ({ messageId, roomId, emoji }) => {
        const message = await Message.findById(messageId);
        if (!message) return;

        const idx = message.reactions.findIndex(
            (r) => r.user.toString() === socket.user._id.toString() && r.emoji === emoji
        );

        if (idx >= 0) {
            message.reactions.splice(idx, 1);
        } else {
            message.reactions.push({ user: socket.user._id, emoji: emoji });
        }

        await message.save();

        io.to(roomId).emit("reaction_updated", {
            messageId: message._id.toString(),
            reactions: message.reactions.map((r) => ({
                user: r.user.toString(),
                emoji: r.emoji,
            })),
        });
    });

    socket.on("typing", (roomId) => {
        socket.to(roomId).emit("user_typing", { username: socket.user.username });
    });

    socket.on("stop_typing", (roomId) => {
        socket.to(roomId).emit("user_stop_typing", { username: socket.user.username });
    });

    socket.on("mark_read", async ({ roomId, messageIds }) => {
        await Message.updateMany(
            { _id: { $in: messageIds }, room: roomId },
            { $addToSet: { readBy: socket.user._id } }
        );
        socket.to(roomId).emit("messages_read", {
            messageIds,
            readerId: socket.user._id,
        });
    });

    socket.on("disconnect", () => {
        clearInterval(rateLimitInterval);
        const entry = onlineUsers.get(userId);
        if (entry) {
            entry.sockets.delete(socket.id);
            if (entry.sockets.size === 0) {
                onlineUsers.delete(userId);
            }
        }
        broadcastOnlineUsers();
    });
});

const start = async () => {
    await connectDB();
    httpServer.listen(process.env.PORT, () => {
        console.log(`Server running on port ${process.env.PORT}`);
    });
};

start();