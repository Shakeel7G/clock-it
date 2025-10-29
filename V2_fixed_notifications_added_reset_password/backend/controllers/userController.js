// controllers/userController.js
// ============================================================
// 👤 User Controller
// Purpose:
//   Manages profile fetching and password changing for logged-in users.
//   Uses the same standardized response format as authController.js
//   so frontend can easily show toast notifications.
// ============================================================

import pool from "../config/db.js";
import bcrypt from "bcrypt";
import { sendResponse } from "../utils/responseHandler.js"; // ✅ Toast helper

// ============================================================
// 📄 Fetch logged-in user's profile
// ============================================================
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Query current user's info
    const [rows] = await pool.query(
      "SELECT id, email, name FROM users WHERE id = ?",
      [userId]
    );

    // Handle user not found
    if (rows.length === 0)
      return sendResponse(res, 404, false, "User not found.");

    const user = rows[0];

    // 🧠 Generate initials (for frontend)
    const initials = user.name
      ? user.name
          .split(" ")
          .map((n) => n[0].toUpperCase())
          .join("")
      : user.email.charAt(0).toUpperCase();

    // ✅ Send structured response for frontend toast + data display
    return sendResponse(res, 200, true, "Profile fetched successfully.", {
      id: user.id,
      email: user.email,
      name: user.name,
      initials,
    });
  } catch (err) {
    console.error("Profile fetch error:", err);
    return sendResponse(res, 500, false, "Failed to fetch profile.");
  }
};

// ============================================================
// 🔒 Change password (only for logged-in users)
// ============================================================
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword)
      return sendResponse(
        res,
        400,
        false,
        "Both current and new passwords are required."
      );

    // Fetch current password hash
    const [rows] = await pool.query(
      "SELECT password_hash FROM users WHERE id = ?",
      [userId]
    );
    if (rows.length === 0)
      return sendResponse(res, 404, false, "User not found.");

    const user = rows[0];

    // Compare passwords
    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match)
      return sendResponse(res, 401, false, "Current password is incorrect.");

    // Hash and update new password
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [
      hashed,
      userId,
    ]);

    return sendResponse(res, 200, true, "Password updated successfully.");
  } catch (err) {
    console.error("Change password error:", err);
    return sendResponse(res, 500, false, "Failed to update password.");
  }
};
