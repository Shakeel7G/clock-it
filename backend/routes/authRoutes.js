import express from "express";
import {
  register,
  login,
  getProfile,
  forgotPassword,
  resetPassword,
  unlockAccount,
  changePassword
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Authentication routes
router.post("/register", register);
router.post("/login", login);

// Password management routes
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/unlock-account", unlockAccount);

// Protected routes
router.get("/profile", protect, getProfile);
router.put("/change-password", protect, changePassword);

export default router;