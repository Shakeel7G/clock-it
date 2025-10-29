// controllers/userController.js
// ============================================================
// 👤 User Controller
// Purpose:
//   Manages non-auth user operations like user management for admins
// ============================================================

import { getAllUsers, findUserById, updateUserProfile } from "../models/userModel.js";
import pool from "../config/db.js";

// Response handler (from partner's responseHandler.js)
const sendResponse = (res, statusCode, success, message, data = null) => {
  const payload = { success, message };
  if (data && Object.keys(data).length > 0) {
    payload.data = data;
  }
  return res.status(statusCode).json(payload);
};

// ============================================================
// 📋 Get all users (admin only)
// ============================================================
export const getAllUsersController = async (req, res) => {
  try {
    const users = await getAllUsers();
    const safeUsers = users.map(({ password, password_hash, ...user }) => user);
    
    return sendResponse(res, 200, true, "Users fetched successfully.", {
      users: safeUsers
    });
  } catch (err) {
    console.error("Get all users error:", err);
    return sendResponse(res, 500, false, "Failed to fetch users.");
  }
};

// ============================================================
// 👤 Get user by ID (admin only)
// ============================================================
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await findUserById(id);
    
    if (!user) {
      return sendResponse(res, 404, false, "User not found.");
    }

    const { password, password_hash, ...safeUser } = user;
    
    return sendResponse(res, 200, true, "User fetched successfully.", {
      user: safeUser
    });
  } catch (err) {
    console.error("Get user by ID error:", err);
    return sendResponse(res, 500, false, "Failed to fetch user.");
  }
};

// ============================================================
// ✏️ Update user profile
// ============================================================
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, backup_email } = req.body;

    await updateUserProfile(userId, { name, phone, backup_email });
    
    return sendResponse(res, 200, true, "Profile updated successfully.");
  } catch (err) {
    console.error("Update profile error:", err);
    return sendResponse(res, 500, false, "Failed to update profile.");
  }
};

// ============================================================
// 🗑️ Delete user (admin only)
// ============================================================
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent admin from deleting themselves
    if (parseInt(id) === req.user.id) {
      return sendResponse(res, 400, false, "Cannot delete your own account.");
    }

    await pool.query("DELETE FROM users WHERE id = ?", [id]);
    
    return sendResponse(res, 200, true, "User deleted successfully.");
  } catch (err) {
    console.error("Delete user error:", err);
    return sendResponse(res, 500, false, "Failed to delete user.");
  }
};