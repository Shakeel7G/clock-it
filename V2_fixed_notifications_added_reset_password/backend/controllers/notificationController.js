//   Handles fetching notifications for logged-in users.

import pool from "../config/db.js";
import { sendResponse } from "../utils/responseHandler.js";

// ============================================================
// Fetch all notifications for the logged-in user
// ============================================================
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      "SELECT id, title, message, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );

    if (rows.length === 0)
      return sendResponse(res, 200, true, "No notifications yet.", { notifications: [] });

    return sendResponse(res, 200, true, "Notifications fetched successfully.", {
      notifications: rows,
    });
  } catch (err) {
    console.error("Fetch notifications error:", err);
    return sendResponse(res, 500, false, "Failed to fetch notifications.");
  }
};
