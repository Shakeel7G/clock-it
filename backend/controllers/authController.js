import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { 
  createUser, 
  findUserByEmail, 
  findUserById, 
  updateUserPassword, 
  updateUserLockStatus, 
  updateResetToken, 
  notifyUser 
} from "../models/userModel.js";
import pool from "../config/db.js"; // ADDED THIS IMPORT

// =============================================
// UTILITY FUNCTIONS (Integrated from partner's utils)
// =============================================

// Email utility (from partner's sendEmail.js)
const sendEmail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Clock It" <${process.env.EMAIL_USER || 'noreply@companyname.com'}>`,
      to,
      subject,
      text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Email sending failed:", error.message);
    throw new Error("Email sending failed");
  }
};

// Password utilities (from partner's hashPassword.js)
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

const comparePassword = async (password, hashed) => {
  return await bcrypt.compare(password, hashed);
};

// Response handler (from partner's responseHandler.js)
const sendResponse = (res, statusCode, success, message, data = null) => {
  const payload = { success, message };
  if (data && Object.keys(data).length > 0) {
    payload.data = data;
  }
  return res.status(statusCode).json(payload);
};

// =============================================
// SECURITY & SETTINGS
// =============================================
const MAX_FAILED_ATTEMPTS = 3;
const LOCK_DURATION_SECONDS = 30 * 60; // 30 minutes

// Strong password validation (8+ chars, upper, lower, digit, special)
const isStrongPassword = (password) => {
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
  return re.test(password);
};

// JWT helper
const generateAccessToken = (user) => {
  return jwt.sign({ 
    id: user.id, 
    email: user.email,
    role: user.role 
  }, process.env.JWT_SECRET, {
    expiresIn: "15d",
  });
};

// =============================================
// REGISTER USER (combined)
// =============================================
export const register = async (req, res) => {
  try {
    const { name, email, password, phone, backup_email, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ msg: "Email and password are required" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ 
        msg: "Password must be at least 8 characters with uppercase, lowercase, number, and special character" 
      });
    }

    const existing = await findUserByEmail(email);
    if (existing) return res.status(400).json({ msg: "Email already registered" });

    const hashedPassword = await hashPassword(password);
    const user = await createUser({ 
      name, 
      email, 
      password_hash: hashedPassword, 
      phone, 
      backup_email, 
      role: role || 'staff' 
    });

    // Send welcome notification
    await notifyUser(
      user.id,
      "Welcome!",
      "Your account has been created successfully."
    );

    res.status(201).json({ 
      msg: "User registered successfully",
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ msg: err.message });
  }
};

// =============================================
// LOGIN USER (combined with security features)
// =============================================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ msg: "Email and password are required" });
    }

    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ msg: "Invalid credentials" });

    // Handle temporary lockout
    if (user.lock_until && new Date(user.lock_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.lock_until) - new Date()) / (1000 * 60));
      return res.status(423).json({ 
        msg: `Account locked. Try again in ${minutesLeft} minutes.` 
      });
    }

    const valid = await comparePassword(password, user.password_hash || user.password);
    if (!valid) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      let lockUntil = null;
      
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        lockUntil = new Date(Date.now() + LOCK_DURATION_SECONDS * 1000);
      }

      await updateUserLockStatus(user.id, attempts, lockUntil);

      return res.status(401).json({
        msg: attempts >= MAX_FAILED_ATTEMPTS
          ? `Account locked for ${LOCK_DURATION_SECONDS/60} minutes after ${MAX_FAILED_ATTEMPTS} failed attempts.`
          : "Invalid credentials"
      });
    }

    // Reset failed attempts on successful login
    await updateUserLockStatus(user.id, 0, null);

    // Send login notification
    await notifyUser(user.id, "Login Successful", "You logged in successfully.");

    const token = generateAccessToken(user);

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role 
      } 
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ msg: err.message });
  }
};

// =============================================
// GET PROFILE (combined)
// =============================================
export const getProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(400).json({ msg: "User ID not found in token" });
    }

    const dbUser = await findUserById(req.user.id);
    if (!dbUser) return res.status(404).json({ msg: "User not found" });
    
    // Generate initials for frontend
    const initials = dbUser.name
      ? dbUser.name
          .split(" ")
          .map((n) => n[0].toUpperCase())
          .join("")
      : dbUser.email.charAt(0).toUpperCase();

    const { password, password_hash, ...safeUser } = dbUser;
    
    res.json({ 
      user: {
        ...safeUser,
        initials
      } 
    });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ 
      msg: "Failed to fetch profile",
      error: err.message 
    });
  }
};

// =============================================
// FORGOT PASSWORD (from partner)
// =============================================
export const forgotPassword = async (req, res) => {
  try {
    const { email, backupEmail } = req.body;
    if (!email) return res.status(400).json({ msg: "Email is required" });

    const user = await findUserByEmail(email);
    if (!user) {
      // Generic response for security
      return res.status(200).json({ msg: "If that email exists, a reset link was sent." });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const tokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30m expiry

    // Save hash + expiry
    await updateResetToken(user.id, tokenHash, tokenExpiry);

    // Determine target email
    let targetEmail = user.email;
    if (backupEmail) {
      if (!user.backup_email || user.backup_email.toLowerCase() !== backupEmail.toLowerCase()) {
        console.warn("Attempt to use mismatched backup email for user id:", user.id);
        return res.status(200).json({ msg: "If that email exists, a reset link was sent." });
      }
      targetEmail = user.backup_email;
    }

    // Build reset link
    const resetLink = `${process.env.FRONTEND_ORIGIN}/reset-password?token=${token}&email=${encodeURIComponent(targetEmail)}`;

    // Log link in development
    if (process.env.NODE_ENV !== "production") console.log("Reset link:", resetLink);

    // Send email
    try {
      await sendEmail(
        targetEmail,
        "Password Reset Request",
        `Use this link to reset your password: ${resetLink}\n\nThis link expires in 30 minutes. If you didn't request this, ignore this message.`
      );
    } catch (e) {
      console.error("Email send failed:", e.message);
    }

    await notifyUser(user.id, "Password Reset Requested", `Reset link sent to ${targetEmail}`);

    return res.status(200).json({ msg: "If that email exists, a reset link was sent." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ msg: err.message });
  }
};

// =============================================
// RESET PASSWORD (from partner)
// =============================================
export const resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({ msg: "Email, token and new password are required" });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ 
        msg: "Password must include uppercase, lowercase, number, and special character" 
      });
    }

    const user = await findUserByEmail(email);
    if (!user) return res.status(400).json({ msg: "Invalid or expired reset details" });

    // Validate token
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    if (!user.reset_token_hash || user.reset_token_hash !== tokenHash || new Date(user.reset_expires) < new Date()) {
      return res.status(400).json({ msg: "Invalid or expired token" });
    }

    // Update password
    const hashedNew = await hashPassword(newPassword);
    await updateUserPassword(user.id, hashedNew);

    await notifyUser(user.id, "Password Reset", "Password reset successfully via email.");
    return res.status(200).json({ msg: "Password reset successful" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ msg: err.message });
  }
};

// =============================================
// CHANGE PASSWORD (from partner's userController)
// =============================================
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ msg: "Both current and new passwords are required" });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ 
        msg: "New password must include uppercase, lowercase, number, and special character" 
      });
    }

    const user = await findUserById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Compare passwords
    const match = await comparePassword(currentPassword, user.password_hash || user.password);
    if (!match) return res.status(401).json({ msg: "Current password is incorrect" });

    // Hash and update new password
    const hashed = await hashPassword(newPassword);
    await updateUserPassword(userId, hashed);

    await notifyUser(userId, "Password Changed", "Your password was changed successfully.");
    return res.status(200).json({ msg: "Password updated successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ msg: "Failed to update password" });
  }
};

// =============================================
// UNLOCK ACCOUNT (from partner)
// =============================================
export const unlockAccount = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ msg: "Email is required" });

    const user = await findUserByEmail(email);
    if (!user) return res.status(404).json({ msg: "User not found" });

    await updateUserLockStatus(user.id, 0, null);

    await notifyUser(user.id, "Account Unlocked", "Your account was manually unlocked.");
    return res.status(200).json({ msg: "Account unlocked successfully" });
  } catch (err) {
    console.error("Unlock account error:", err);
    res.status(500).json({ msg: err.message });
  }
};