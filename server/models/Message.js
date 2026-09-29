import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        text: { type: String, default: "", trim: true },
        fileUrl: { type: String, default: null },
        fileType: { type: String, default: null },
        room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
        readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        reactions: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                emoji: { type: String },
            },
        ],
    },
    { timestamps: true }
);

messageSchema.index({ room: 1, createdAt: -1 });

export default mongoose.model("Message", messageSchema);