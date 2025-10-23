import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ msg: "No token provided" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(403).json({ msg: "Invalid or expired token" });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") return res.status(403).json({ msg: "Access denied" });
  next();
};
