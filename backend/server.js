import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
connectDB();


app.use("/api/auth", authRoutes);
app.use("/api", userRoutes);

app.listen(process.env.PORT, () => console.log(`🚀 Server running on port ${process.env.PORT}`));
