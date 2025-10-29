import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import { 
  getAllUsersController, 
  getUserById, 
  updateProfile, 
  deleteUser 
} from "../controllers/userController.js";

const router = express.Router();

// All routes are protected
router.use(protect);

// User management routes (admin only)
router.get("/", adminOnly, getAllUsersController);
router.get("/:id", adminOnly, getUserById);
router.delete("/:id", adminOnly, deleteUser);

// User profile routes (user-specific)
router.put("/profile", updateProfile);

export default router;