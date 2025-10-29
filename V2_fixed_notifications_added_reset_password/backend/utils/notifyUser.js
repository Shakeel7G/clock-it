//   Utility function to store notifications in the database.
//   Called whenever an event (e.g., login, password change) happens.

import pool from "../config/db.js";

/**
 * Save a notification for a user.
 * @param {number} userId - The user's ID.
 * @param {string} title - Short title of the notification.
 * @param {string} message - Detailed notification message.
 */
export const notifyUser = async (userId, title, message) => {
  try {
    await pool.query(
      "INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)",
      [userId, title, message]
    );
  } catch (err) {
    console.error("Error saving notification:", err);
  }
};
