import express from "express";
import { getAllUsersController } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();

router.get("/users", protect, getAllUsersController);

export default router;
