import pool from '../config/db.js';

export const getUserNotifications = async (userId) => {
  const [rows] = await pool.query(
    "SELECT id, title, message, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
  return rows;
};

export const createNotification = async (userId, title, message) => {
  const [result] = await pool.query(
    "INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)",
    [userId, title, message]
  );
  return result;
};