import { Router } from "express";
import multer from "multer";
import { protect } from "../middleware/auth.js";
import cloudinary from "../config/cloudinary.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

router.post("/", protect, upload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    const uploadFromBuffer = () =>
        new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { resource_type: "auto", folder: "chat-app" },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            stream.end(req.file.buffer);
        });

    try {
        const result = await uploadFromBuffer();
        res.json({ url: result.secure_url, type: req.file.mimetype });
    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ message: "Upload failed", detail: err.message });;
    }
});

export default router;