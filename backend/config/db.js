import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

export const connectDB = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "shakeel2003",
      database: process.env.DB_NAME || "attendance_db",
    });
    global.db = connection;
    console.log("✅ MySQL Connected");
    
    // Test the connection
    await connection.execute('SELECT 1');
    console.log("✅ Database connection test passed");
    
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    console.log("🔄 Server will continue running without database");
    // Don't exit the process, just log the error
  }
};