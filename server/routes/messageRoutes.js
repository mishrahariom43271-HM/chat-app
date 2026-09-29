import { Router } from "express";
import { protect } from "../middleware/auth.js";
import Message from "../models/Message.js";

const router = Router();

router.get("/:roomId", protect, async (req, res) => {
    const { roomId } = req.params;
    const { before } = req.query;

    const filter = { room: roomId };
    if (before) {
        filter.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(filter)
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("sender", "username")
        .lean();

    res.json(messages.reverse());
});

export default router;