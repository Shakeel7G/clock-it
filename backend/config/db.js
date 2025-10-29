import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

// Create connection pool with comprehensive configuration
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "attendance_db",
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
});

export const connectDB = async () => {
  try {
    // Test the connection
    const connection = await pool.getConnection();
    console.log("✅ MySQL Connected via Connection Pool");
    
    // Test the connection with a simple query
    await connection.execute('SELECT 1');
    console.log("✅ Database connection test passed");
    
    // Release connection back to pool
    connection.release();
    
    // Set pool as global.db for backward compatibility
    global.db = pool;
    
    return pool;
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    console.log("🔄 Server will continue running without database");
    throw err; // Re-throw to allow handling in the main app
  }
};

// Export pool for direct use (both approaches)
export default pool;