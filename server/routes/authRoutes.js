import { Router } from "express";
import rateLimit from "express-rate-limit";
import { register, login, logout } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
});

router.post("/register", limiter, register);
router.post("/login", limiter, login);
router.post("/logout", logout);

router.get("/me", protect, (req, res) => {
    res.json(req.user);
});

export default router;