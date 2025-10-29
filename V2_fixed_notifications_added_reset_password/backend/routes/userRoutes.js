import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { getProfile, changePassword } from "../controllers/userController.js";

const router = express.Router();

// Get logged-in user's profile (with initials)
router.get("/profile", verifyToken, getProfile);

// Change password (protected route)
router.put("/change-password", verifyToken, changePassword);

export default router;
