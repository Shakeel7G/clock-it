import express from "express";
import {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  unlockAccount,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/signup", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/unlock-account", unlockAccount);

export default router;
