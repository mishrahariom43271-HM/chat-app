import Room from "../models/Room.js";

export const createRoom = async (req, res) => {
    const { name, isPrivate } = req.body;
    if (!name || name.trim() === "") {
        return res.status(400).json({ message: "Room name is required" });
    }
    const room = await Room.create({
        name,
        isPrivate: !!isPrivate,
        members: [req.user._id],
        createdBy: req.user._id,
    });
    res.status(201).json(room);
};

export const getMyRooms = async (req, res) => {
    const rooms = await Room.find({ members: req.user._id }).sort({ createdAt: -1 });
    res.json(rooms);
};

export const getAllRooms = async (req, res) => {
    const rooms = await Room.find().sort({ createdAt: -1 });
    res.json(rooms);
};

export const searchRooms = async (req, res) => {
    const q = (req.query.q || "").trim();
    if (q === "") return res.json([]);
    const rooms = await Room.find({ name: { $regex: q, $options: "i" } })
        .limit(10)
        .select("name isPrivate members pendingRequests createdBy");
    res.json(rooms);
};

export const joinRoom = async (req, res) => {
    const { id } = req.params;
    const room = await Room.findById(id);
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (room.isPrivate) {
        return res.status(403).json({ message: "This room is private. Send a join request instead." });
    }

    if (!room.members.includes(req.user._id)) {
        room.members.push(req.user._id);
        await room.save();
    }
    res.json(room);
};

export const requestJoin = async (req, res) => {
    const { id } = req.params;
    const room = await Room.findById(id);
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (room.members.includes(req.user._id)) {
        return res.status(400).json({ message: "Already a member" });
    }
    if (room.pendingRequests.includes(req.user._id)) {
        return res.status(400).json({ message: "Request already sent" });
    }

    room.pendingRequests.push(req.user._id);
    await room.save();
    res.json({ message: "Request sent" });
};

export const getJoinRequests = async (req, res) => {
    const { id } = req.params;
    const room = await Room.findById(id).populate("pendingRequests", "username");
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (room.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Only the admin can view requests" });
    }

    res.json(room.pendingRequests);
};

export const respondToRequest = async (req, res) => {
    const { id, userId } = req.params;
    const { action } = req.body;

    const room = await Room.findById(id);
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (room.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Only the admin can respond to requests" });
    }

    room.pendingRequests = room.pendingRequests.filter((u) => u.toString() !== userId);

    if (action === "accept") {
        if (!room.members.includes(userId)) {
            room.members.push(userId);
        }
    }

    await room.save();
    res.json({ message: "Done" });
};

export const getRoomMembers = async (req, res) => {
    const { id } = req.params;
    const room = await Room.findById(id).populate("members", "username");
    if (!room) return res.status(404).json({ message: "Room not found" });

    res.json({
        createdBy: room.createdBy,
        members: room.members,
    });
};

export const deleteRoom = async (req, res) => {
    const { id } = req.params;
    const room = await Room.findById(id);
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (room.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Only the creator can delete this room" });
    }

    await room.deleteOne();
    res.json({ message: "Room deleted" });
};
export const leaveRoom = async (req, res) => {
    const { id } = req.params;
    const room = await Room.findById(id);
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (room.createdBy.toString() === req.user._id.toString()) {
        return res.status(400).json({ message: "Admin cannot leave. Delete the room instead." });
    }

    room.members = room.members.filter((m) => m.toString() !== req.user._id.toString());
    await room.save();
    res.json({ message: "Left room" });
};