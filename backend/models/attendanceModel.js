import pool from '../config/db.js';

export const createAttendance = async (userId, timestamp) => {
  const sql = "INSERT INTO attendance (user_id, timestamp, date) VALUES (?, ?, ?)";
  const date = timestamp.toISOString().split("T")[0];
  const [result] = await pool.execute(sql, [userId, timestamp, date]);
  return result;
};

export const findAttendanceByUserAndDate = async (userId, date) => {
  const sql = "SELECT * FROM attendance WHERE user_id = ? AND date = ?";
  const [rows] = await pool.execute(sql, [userId, date]);
  return rows[0];
};

export const getUserAttendanceHistory = async (userId) => {
  const sql = "SELECT * FROM attendance WHERE user_id = ? ORDER BY timestamp DESC";
  const [rows] = await pool.execute(sql, [userId]);
  return rows;
};

export const getAllAttendance = async () => {
  const sql = `
    SELECT a.*, u.name, u.email 
    FROM attendance a 
    JOIN users u ON a.user_id = u.id 
    ORDER BY a.timestamp DESC
  `;
  const [rows] = await pool.execute(sql);
  return rows;
};