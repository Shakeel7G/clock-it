import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const protect = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ msg: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Debug logging in development
    if (process.env.NODE_ENV !== 'production') {
      console.log("🔍 Decoded token:", decoded);
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    console.log("❌ JWT Error:", error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ msg: "Token expired" });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ msg: "Invalid token" });
    } else {
      return res.status(403).json({ msg: "Token verification failed" });
    }
  }
};

// Alias for compatibility (partner's function name)
export const verifyToken = protect;

export const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ msg: "Authentication required" });
  }
  
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied. Admin privileges required." });
  }
  next();
};