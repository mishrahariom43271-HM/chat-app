import { Router } from "express";
import { protect } from "../middleware/auth.js";
import {
    createRoom,
    getMyRooms,
    getAllRooms,
    searchRooms,
    joinRoom,
    requestJoin,
    getJoinRequests,
    respondToRequest,
    getRoomMembers,
    deleteRoom,
    leaveRoom,
} from "../controllers/roomController.js";

const router = Router();

router.post("/", protect, createRoom);
router.get("/", protect, getMyRooms);
router.get("/all", protect, getAllRooms);
router.get("/search", protect, searchRooms);
router.post("/:id/join", protect, joinRoom);
router.post("/:id/request-join", protect, requestJoin);
router.get("/:id/requests", protect, getJoinRequests);
router.post("/:id/requests/:userId", protect, respondToRequest);
router.get("/:id/members", protect, getRoomMembers);
router.post("/:id/leave", protect, leaveRoom);
router.delete("/:id", protect, deleteRoom);

export default router;