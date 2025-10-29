import express from "express";
import { getNotifications } from "../controllers/notificationController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protected route - get user's notifications
router.get("/", verifyToken, getNotifications);

export default router;
