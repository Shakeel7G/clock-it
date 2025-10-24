import express from "express";
import QRCode from "qrcode";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { findUserById } from "../models/userModel.js";
import { createAttendance, findAttendanceByUserAndDate } from "../models/attendanceModel.js";

const router = express.Router();

// Generate QR code for a user
router.get("/qr/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const qrData = `${process.env.BASE_URL}/api/attendance/scan?token=${token}`;
    const img = await QRCode.toDataURL(qrData);
    res.json({ qr: img });
  } catch (err) {
    console.error("QR generation error:", err);
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});

// Scan QR and record attendance
router.get("/attendance/scan", async (req, res) => {
  // Accept token either via query string or POST body
  const token = req.query.token || (req.body && req.body.token);
  if (!token) return res.status(400).send("No token provided");

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { userId } = payload;

    const user = await findUserById(userId);
    if (!user) return res.status(404).send("User not found");

    const today = new Date().toISOString().split("T")[0];
    const existing = await findAttendanceByUserAndDate(userId, today);
    if (existing) return res.status(400).send("Attendance already recorded for today");

    const timestamp = new Date();
    await createAttendance(userId, timestamp);

    // Send email
    const transporter = nodemailer.createTransport({
      host: "smtp.example.com", // replace with your SMTP host
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Attendance App" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Attendance Confirmed",
      html: `<p>Hi ${user.name}, you clocked in at <strong>${timestamp.toLocaleString()}</strong>.</p>`,
    });

    res.send("✅ Attendance recorded and email sent!");
  } catch (err) {
    console.error("QR scan error:", err);
    res.status(400).send("Invalid or expired token");
  }
});

export default router;
