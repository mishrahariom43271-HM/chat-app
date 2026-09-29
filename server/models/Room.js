import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        isPrivate: { type: Boolean, default: false },
        members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        pendingRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: true }
);

export default mongoose.model("Room", roomSchema);