import pool from '../config/db.js';

export const createUser = async (userData) => {
  const { name, email, password_hash, phone, backup_email, role } = userData;
  const [result] = await pool.query(
    `INSERT INTO users (name, email, password_hash, phone, backup_email, role) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, email, password_hash, phone, backup_email, role || 'staff']
  );
  return { id: result.insertId, name, email, role: role || 'staff' };
};

export const findUserByEmail = async (email) => {
  const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
  return rows[0];
};

export const findUserById = async (id) => {
  if (!id) throw new Error("User ID is required");
  const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
  return rows[0];
};

export const getAllUsers = async () => {
  const [rows] = await pool.query("SELECT * FROM users", []);
  return rows;
};

export const updateUserPassword = async (userId, hashedPassword) => {
  await pool.query(
    'UPDATE users SET password_hash = ?, reset_token_hash = NULL, reset_expires = NULL WHERE id = ?',
    [hashedPassword, userId]
  );
};

export const updateUserLockStatus = async (userId, attempts, lockUntil) => {
  await pool.query(
    'UPDATE users SET failed_login_attempts = ?, lock_until = ? WHERE id = ?',
    [attempts, lockUntil, userId]
  );
};

export const updateResetToken = async (userId, tokenHash, expiry) => {
  await pool.query(
    'UPDATE users SET reset_token_hash = ?, reset_expires = ? WHERE id = ?',
    [tokenHash, expiry, userId]
  );
};

export const updateUserProfile = async (userId, profileData) => {
  const { name, phone, backup_email } = profileData;
  await pool.query(
    'UPDATE users SET name = ?, phone = ?, backup_email = ? WHERE id = ?',
    [name, phone, backup_email, userId]
  );
};

export const notifyUser = async (userId, title, message) => {
  await pool.query(
    'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
    [userId, title, message]
  );
};