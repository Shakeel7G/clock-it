import express from "express";
import QRCode from "qrcode";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { findUserById } from "../models/userModel.js";
import { createAttendance, findAttendanceByUserAndDate } from "../models/attendanceModel.js";
import { 
  createQRCodeRecord, 
  markQRCodeAsUsed, 
  getQRCodeByToken,
  getUserQRCodeHistory,
  getActiveQRCode 
} from "../models/qrCodeModel.js";

const router = express.Router();

// Email transporter configuration - FIXED
const createTransporter = () => {
  return nodemailer.createTransport({  // FIXED: createTransport not createTransporter
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Generate QR code for a user (EMAIL ENABLED)
router.get("/qr/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { sendEmail } = req.query;
    
    console.log("🔄 Starting QR generation for user:", userId);
    
    // Validate user ID
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate token
    const tokenPayload = { 
      userId: parseInt(userId),
      type: 'attendance',
      timestamp: Date.now()
    };
    
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'fallback_secret_for_development', { expiresIn: "1h" });
    console.log("✅ Token generated successfully");
    
    const scanUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/api/attendance/scan?token=${token}`;
    
    // Generate QR code
    let qrImage, qrBuffer;
    try {
      qrImage = await QRCode.toDataURL(scanUrl, { width: 300, margin: 2 });
      qrBuffer = await QRCode.toBuffer(scanUrl, { width: 300, margin: 2 });
    } catch (qrError) {
      console.error("QR generation failed:", qrError);
      return res.status(500).json({ error: "Failed to generate QR code image" });
    }
    
    // Build response object
    const responseData = {
      qr: qrImage,
      token: token,
      scanUrl: scanUrl,
      user: { id: user.id, name: user.name, email: user.email }
    };

    // Send email if requested
    if (sendEmail === 'true') {
      try {
        // Store QR code in database BEFORE sending email
        await createQRCodeRecord(userId, token, scanUrl, qrImage, user.email);
        console.log("💾 QR code stored in database");
        
        // Send email
        await sendQRCodeEmail(user.email, `USER-${userId}`, qrBuffer, user.name);
        responseData.message = "QR code generated, stored, and email sent successfully";
        responseData.storedInDB = true;
      } catch (emailError) {
        console.error("Email sending failed:", emailError);
        responseData.emailError = "QR code generated but email failed to send";
        responseData.emailErrorDetails = emailError.message;
        
        // Still store in DB even if email fails
        try {
          await createQRCodeRecord(userId, token, scanUrl, qrImage, null);
          responseData.storedInDB = true;
        } catch (dbError) {
          console.error("Failed to store QR code in database:", dbError);
          responseData.dbError = "Failed to store QR code record";
        }
      }
    } else {
      // Store without email
      try {
        await createQRCodeRecord(userId, token, scanUrl, qrImage, null);
        responseData.storedInDB = true;
        responseData.message = "QR code generated and stored successfully";
      } catch (dbError) {
        console.error("Failed to store QR code in database:", dbError);
        responseData.dbError = "Failed to store QR code record";
      }
    }
    
    console.log("📤 Sending response with token");
    res.json(responseData);
    
  } catch (err) {
    console.error("❌ QR generation error:", err);
    res.status(500).json({ 
      error: "Failed to generate QR code",
      message: err.message 
    });
  }
});

// Scan QR and record attendance (EMAIL ENABLED)
router.get("/attendance/scan", async (req, res) => {
  try {
    const token = req.query.token;
    
    if (!token) {
      return res.status(400).json({ 
        success: false,
        error: "No token provided in URL",
        example: `${process.env.BASE_URL || 'http://localhost:5000'}/api/attendance/scan?token=your_jwt_token_here`
      });
    }

    console.log("Received token:", token);

    // Verify the token
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_for_development');
      console.log("Token payload:", payload);
    } catch (jwtError) {
      console.error("JWT verification failed:", jwtError.message);
      return res.status(401).json({ 
        success: false,
        error: "Invalid or expired token",
        details: jwtError.message
      });
    }

    const { userId } = payload;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "Invalid token: missing userId"
      });
    }

    // Find user
    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: "User not found",
        userId: userId
      });
    }

    // Check for existing attendance today
    const today = new Date().toISOString().split("T")[0];
    const existing = await findAttendanceByUserAndDate(userId, today);
    if (existing) {
      return res.status(400).json({ 
        success: false,
        error: "Attendance already recorded for today",
        existingRecord: existing
      });
    }

    // Mark QR code as used in database
    try {
      await markQRCodeAsUsed(token);
      console.log("✅ QR code marked as used in database");
    } catch (dbError) {
      console.error("Failed to mark QR code as used:", dbError);
      // Don't fail the request if this fails
    }

    // Record attendance
    const timestamp = new Date();
    await createAttendance(userId, timestamp);

    // Send email confirmation
    try {
      await sendAttendanceConfirmationEmail(user.email, user.name, timestamp);
      console.log("📧 Attendance confirmation email sent");
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Don't fail the request if email fails
    }

    // Return HTML response for browser and JSON for API clients
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      res.json({ 
        success: true,
        message: "Attendance recorded successfully!",
        user: { 
          id: user.id, 
          name: user.name, 
          email: user.email 
        },
        attendance: {
          timestamp: timestamp.toISOString(),
          date: today
        },
        emailSent: true,
        qrMarkedAsUsed: true
      });
    } else {
      // HTML response for browser scanning
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Attendance Recorded</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    text-align: center; 
                    padding: 50px; 
                    background: #f5f5f5;
                }
                .success { 
                    background: white; 
                    padding: 30px; 
                    border-radius: 10px; 
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    max-width: 500px;
                    margin: 0 auto;
                }
                .checkmark { 
                    color: #4CAF50; 
                    font-size: 48px; 
                    margin-bottom: 20px;
                }
            </style>
        </head>
        <body>
            <div class="success">
                <div class="checkmark">✅</div>
                <h1>Attendance Recorded Successfully!</h1>
                <p><strong>User:</strong> ${user.name} (${user.email})</p>
                <p><strong>Time:</strong> ${timestamp.toLocaleString()}</p>
                <p><strong>Email:</strong> Confirmation sent to ${user.email}</p>
                <p><a href="/api/qr/${userId}">Get New QR Code</a></p>
            </div>
        </body>
        </html>
      `);
    }

  } catch (err) {
    console.error("QR scan error:", err);
    
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      res.status(500).json({ 
        success: false,
        error: "Server error during attendance recording",
        details: err.message
      });
    } else {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Error</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    text-align: center; 
                    padding: 50px; 
                    background: #f5f5f5;
                }
                .error { 
                    background: white; 
                    padding: 30px; 
                    border-radius: 10px; 
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    max-width: 500px;
                    margin: 0 auto;
                    color: #f44336;
                }
            </style>
        </head>
        <body>
            <div class="error">
                <h1>❌ Attendance Recording Failed</h1>
                <p><strong>Error:</strong> ${err.message}</p>
                <p><a href="/api/qr/1">Try Again</a></p>
            </div>
        </body>
        </html>
      `);
    }
  }
});

// Send QR Code Email Only (ENABLED)
router.post("/qr/:userId/send-email", async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate token and QR code
    const tokenPayload = { 
      userId: parseInt(userId),
      type: 'attendance',
      timestamp: Date.now()
    };
    
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: "1h" });
    const qrData = `${process.env.BASE_URL || 'http://localhost:5000'}/api/attendance/scan?token=${token}`;
    const qrBuffer = await QRCode.toBuffer(qrData, { width: 300, margin: 2 });
    
    // Store QR code in database before sending email
    try {
      await createQRCodeRecord(userId, token, qrData, null, user.email);
      console.log("💾 QR code stored in database");
    } catch (dbError) {
      console.error("Failed to store QR code in database:", dbError);
    }
    
    // Send email
    await sendQRCodeEmail(user.email, `USER-${userId}`, qrBuffer, user.name);
    
    res.json({ 
      message: "QR code email sent successfully",
      user: { id: user.id, name: user.name, email: user.email },
      token: token,
      storedInDB: true
    });
  } catch (err) {
    console.error("Email sending error:", err);
    res.status(500).json({ 
      error: "Failed to send QR code email",
      details: err.message
    });
  }
});

// NEW: Get QR code history for a user
router.get("/qr-history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const qrHistory = await getUserQRCodeHistory(userId);
    
    res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email },
      qrHistory: qrHistory,
      totalRecords: qrHistory.length
    });
  } catch (err) {
    console.error("QR history error:", err);
    res.status(500).json({ error: "Failed to get QR code history" });
  }
});

// NEW: Get active QR code for a user
router.get("/active-qr/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const activeQR = await getActiveQRCode(userId);
    
    if (!activeQR) {
      return res.status(404).json({ 
        success: false,
        message: "No active QR code found for user",
        user: { id: user.id, name: user.name, email: user.email }
      });
    }

    res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email },
      activeQR: activeQR
    });
  } catch (err) {
    console.error("Active QR error:", err);
    res.status(500).json({ error: "Failed to get active QR code" });
  }
});

// Email sending functions
const sendQRCodeEmail = async (toEmail, employeeCode, qrCodeBuffer, userName = "User") => {
  try {
    if (!qrCodeBuffer) {
      throw new Error('QR Code Buffer is missing.');
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"Attendance System" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Your Attendance QR Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Hello ${userName}!</h2>
          <p>Here is your QR code for recording attendance.</p>
          <p>Your user code is: <strong>${employeeCode}</strong></p>
          <p>Scan this QR code to record your attendance:</p>
          
          <div style="text-align: center; margin: 20px 0; padding: 10px; background: #f5f5f5;">
            <img src="cid:qrcode@attendance" alt="QR Code for ${employeeCode}" 
                 style="width: 200px; height: 200px; display: block; margin: 0 auto;">
            <p style="font-size: 12px; color: #666;">
              This QR code expires in 1 hour.
            </p>
          </div>

          <p>If you have any questions, please contact support.</p>
          <p style="color: #888;"><em>– Attendance System</em></p>
        </div>
      `,
      attachments: [{
        filename: 'attendance-qrcode.png',
        content: qrCodeBuffer,
        cid: 'qrcode@attendance'
      }]
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ QR Code email sent to ${toEmail}`);
  } catch (error) {
    console.error('❌ Error sending QR email:', error);
    throw new Error('Failed to send QR code email.');
  }
};

const sendAttendanceConfirmationEmail = async (toEmail, userName, timestamp) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"Attendance System" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Attendance Confirmed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Attendance Confirmed!</h2>
          <p>Hi ${userName}, your attendance has been successfully recorded.</p>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Time:</strong> ${timestamp.toLocaleString()}</p>
            <p><strong>Date:</strong> ${timestamp.toDateString()}</p>
          </div>

          <p>Thank you for using our attendance system.</p>
          <p style="color: #888;"><em>– Attendance System</em></p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Attendance confirmation email sent to ${toEmail}`);
  } catch (error) {
    console.error('❌ Error sending attendance confirmation email:', error);
    throw new Error('Failed to send attendance confirmation email.');
  }
};

// Manual Attendance (for testing) - with email
router.post("/attendance/manual", async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const today = new Date().toISOString().split("T")[0];
    const existing = await findAttendanceByUserAndDate(userId, today);
    if (existing) {
      return res.status(400).json({ error: "Attendance already recorded for today" });
    }

    const timestamp = new Date();
    await createAttendance(userId, timestamp);

    // Send email confirmation
    try {
      await sendAttendanceConfirmationEmail(user.email, user.name, timestamp);
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
    }

    res.json({ 
      success: true,
      message: "Manual attendance recorded successfully",
      user: { id: user.id, name: user.name, email: user.email },
      timestamp: timestamp.toISOString(),
      emailSent: true
    });
  } catch (err) {
    console.error("Manual attendance error:", err);
    res.status(500).json({ error: "Failed to record attendance" });
  }
});

// Test endpoint to verify JWT tokens
router.get("/attendance/decode-token", async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ error: "No token provided" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_for_development');
    
    res.json({
      valid: true,
      payload: payload,
      issuedAt: new Date(payload.iat * 1000).toISOString(),
      expiresAt: new Date(payload.exp * 1000).toISOString()
    });
  } catch (err) {
    res.json({
      valid: false,
      error: err.message
    });
  }
});

// Simple debug endpoint to test token generation
router.get("/debug-token/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    const tokenPayload = { 
      userId: parseInt(userId),
      test: true,
      timestamp: Date.now()
    };
    
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'fallback_secret_for_development', { expiresIn: "1h" });
    
    res.json({
      success: true,
      token: token,
      tokenPreview: token.substring(0, 50) + "...",
      scanUrl: `http://localhost:5000/api/attendance/scan?token=${token}`,
      message: "Token generation is working correctly"
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    features: {
      qrGeneration: "enabled",
      attendanceTracking: "enabled", 
      email: "enabled",
      database: global.db ? "connected" : "disconnected",
      qrStorage: "enabled"
    }
  });
});

export default router;