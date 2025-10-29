// Handles registration, login (with lockout), forgot/reset password via email (primary or backup),
// and manual account unlock.


import pool from "../config/db.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { hashPassword, comparePassword } from "../utils/hashPassword.js";
import { sendResponse } from "../utils/responseHandler.js";
import { notifyUser } from "../utils/notifyUser.js";
import { sendEmail } from "../utils/sendEmail.js";

// =============================================
// SECURITY & SETTINGS
// =============================================
const MAX_FAILED_ATTEMPTS = 3;
const LOCK_DURATION_SECONDS = 30;

// Strong password validation (8+ chars, upper, lower, digit, special)
const isStrongPassword = (password) => {
  const re =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
  return re.test(password);
};

// JWT helper
const generateAccessToken = (user) =>
  jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "15d",
  });

// =============================================
// REGISTER USER
// (unchanged except allow optional backup_email if frontend sends it)
// =============================================
export const registerUser = async (req, res, next) => {
  try {
    const { email, password, name, phone, backup_email } = req.body;

    if (!email || !password)
      return sendResponse(res, 400, false, "Email and password are required.");

    if (!isStrongPassword(password))
      return sendResponse(
        res,
        400,
        false,
        "Password must include uppercase, lowercase, number, and special character."
      );

    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length) return sendResponse(res, 409, false, "User already exists.");

    const hashed = await hashPassword(password);
    await pool.query(
      "INSERT INTO users (email, name, password_hash, phone, backup_email) VALUES (?, ?, ?, ?, ?)",
      [email, name || null, hashed, phone || null, backup_email || null]
    );

    const [newUser] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);

    if (newUser && newUser.length) {
      await notifyUser(
        newUser[0].id,
        "Welcome!",
        "Your account has been created successfully."
      );
    }

    return sendResponse(res, 201, true, "User registered successfully.");
  } catch (err) {
    console.error("Signup Error:", err);
    next(err);
  }
};

// =============================================
// LOGIN USER (with lockout)
// =============================================
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return sendResponse(res, 400, false, "Email and password are required.");

    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (!rows.length) return sendResponse(res, 401, false, "Invalid credentials.");

    const user = rows[0];

    // Handle temporary lockout
    if (user.lock_until && new Date(user.lock_until) > new Date()) {
      const secondsLeft = Math.ceil((new Date(user.lock_until) - new Date()) / 1000);
      return sendResponse(
        res,
        423,
        false,
        `Account locked. Try again in ${secondsLeft}s.`
      );
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      let lockUntil = null;
      if (attempts >= MAX_FAILED_ATTEMPTS)
        lockUntil = new Date(Date.now() + LOCK_DURATION_SECONDS * 1000);

      await pool.query(
        "UPDATE users SET failed_login_attempts=?, lock_until=? WHERE id=?",
        [attempts, lockUntil, user.id]
      );

      return sendResponse(
        res,
        401,
        false,
        attempts >= MAX_FAILED_ATTEMPTS
          ? `Account locked for ${LOCK_DURATION_SECONDS}s after ${MAX_FAILED_ATTEMPTS} failed attempts.`
          : "Invalid email or password."
      );
    }

    await pool.query(
      "UPDATE users SET failed_login_attempts=0, lock_until=NULL WHERE id=?",
      [user.id]
    );

    await notifyUser(user.id, "Login Successful", "You logged in successfully.");
    const token = generateAccessToken(user);

    return sendResponse(res, 200, true, "Login successful.", { token });
  } catch (err) {
    console.error("Login Error:", err);
    next(err);
  }
};

// =============================================
// FORGOT PASSWORD (email only; support sending to backup email when provided)
// Endpoint: POST /api/auth/forgot
// Body: { "email": "primary@example.com" } -> send to primary email
// OR   { "email": "primary@example.com", "backupEmail": "backup@example.com" } -> send to backup email (must match stored backup_email)
// =============================================
export const forgotPassword = async (req, res, next) => {
  try {
    const { email, backupEmail } = req.body;
    if (!email) return sendResponse(res, 400, false, "Email is required.");

    const [rows] = await pool.query(
      "SELECT id, email, backup_email FROM users WHERE email = ?",
      [email]
    );

    if (!rows.length)
      return sendResponse(res, 200, true, "If that email exists, a reset link was sent."); // generic response

    const user = rows[0];

    // Generate token (send raw token in email, store only hash in DB)
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const tokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30m expiry

    // Save hash + expiry
    await pool.query(
      "UPDATE users SET reset_token_hash=?, reset_expires=? WHERE id=?",
      [tokenHash, tokenExpiry, user.id]
    );

    // Determine target email
    let targetEmail = user.email;
    if (backupEmail) {
      // security: only allow sending to backup if it matches user's stored backup_email
      if (!user.backup_email || user.backup_email.toLowerCase() !== backupEmail.toLowerCase()) {
        // don't reveal details — return generic success message
        console.warn("Attempt to use mismatched backup email for user id:", user.id);
        return sendResponse(res, 200, true, "If that email exists, a reset link was sent.");
      }
      targetEmail = user.backup_email;
    }

    // Build reset link (include token and the target email as query params)
    const resetLink = `${process.env.FRONTEND_ORIGIN}/reset-password?token=${token}&email=${encodeURIComponent(
      targetEmail
    )}`;

    // Log link server-side in dev for debugging (safe)
    if (process.env.NODE_ENV !== "production") console.log("Reset link:", resetLink);

    // Send email (best effort, but we still respond OK to avoid user enumeration)
    try {
      await sendEmail(
        targetEmail,
        "Password Reset Request",
        `Use this link to reset your password: ${resetLink}\n\nThis link expires in 30 minutes. If you didn't request this, ignore this message.`
      );
    } catch (e) {
      console.error("Email send failed:", e.message);
      // don't fail the request — we still give generic success message
    }

    await notifyUser(user.id, "Password Reset Requested", `Reset link sent to ${targetEmail}`);

    return sendResponse(res, 200, true, "If that email exists, a reset link was sent.");
  } catch (err) {
    console.error("Forgot Password Error:", err);
    next(err);
  }
};

// =============================================
// RESET PASSWORD (email token only)
// Endpoint: POST /api/auth/reset
// Body: { "email": "user@example.com", "token": "TOKEN_FROM_EMAIL", "newPassword": "NewStrongPass1!" }
// =============================================
export const resetPassword = async (req, res, next) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword)
      return sendResponse(res, 400, false, "Email, token and new password are required.");

    if (!isStrongPassword(newPassword))
      return sendResponse(
        res,
        400,
        false,
        "Password must include uppercase, lowercase, number, and special character."
      );

    const [rows] = await pool.query("SELECT * FROM users WHERE email = ? OR backup_email = ?", [
      email,
      email,
    ]);
    if (!rows.length) return sendResponse(res, 400, false, "Invalid or expired reset details.");

    const user = rows[0];

    // validate token
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    if (!user.reset_token_hash || user.reset_token_hash !== tokenHash || new Date(user.reset_expires) < new Date())
      return sendResponse(res, 400, false, "Invalid or expired token.");

    // update password
    const hashedNew = await hashPassword(newPassword);
    await pool.query(
      "UPDATE users SET password_hash=?, reset_token_hash=NULL, reset_expires=NULL WHERE id=?",
      [hashedNew, user.id]
    );

    await notifyUser(user.id, "Password Reset", "Password reset successfully via email.");
    return sendResponse(res, 200, true, "Password reset successful.");
  } catch (err) {
    console.error("Reset Password Error:", err);
    next(err);
  }
};

// =============================================
// UNLOCK ACCOUNT
// =============================================
export const unlockAccount = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return sendResponse(res, 400, false, "Email is required.");

    await pool.query(
      "UPDATE users SET failed_login_attempts=0, lock_until=NULL WHERE email=?",
      [email]
    );

    const [rows] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (rows.length) {
      await notifyUser(rows[0].id, "Account Unlocked", "Your account was manually unlocked.");
    }

    return sendResponse(res, 200, true, "Account unlocked successfully.");
  } catch (err) {
    console.error("Unlock Account Error:", err);
    next(err);
  }
};
