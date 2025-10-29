import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import { 
  getUserAttendanceHistory,
  getAllAttendance 
} from "../models/attendanceModel.js";

const router = express.Router();

// All routes are protected
router.use(protect);

// Get user's own attendance history
router.get("/my-attendance", async (req, res) => {
  try {
    const userId = req.user.id;
    const attendance = await getUserAttendanceHistory(userId);
    
    res.json({
      success: true,
      attendance: attendance,
      totalRecords: attendance.length
    });
  } catch (err) {
    console.error("Get user attendance error:", err);
    res.status(500).json({ error: "Failed to get attendance history" });
  }
});

// Get all attendance records (admin only)
router.get("/", adminOnly, async (req, res) => {
  try {
    const attendance = await getAllAttendance();
    
    res.json({
      success: true,
      attendance: attendance,
      totalRecords: attendance.length
    });
  } catch (err) {
    console.error("Get all attendance error:", err);
    res.status(500).json({ error: "Failed to get attendance records" });
  }
});

export default router;