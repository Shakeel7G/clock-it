import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

export const connectDB = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    global.db = connection;
    console.log("✅ MySQL Connected");
  } catch (err) {
    console.error("❌ Database connection failed:", err);
  }
};
