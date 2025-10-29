-- =========================================
-- Database: Combined Attendance System
-- =========================================
CREATE DATABASE IF NOT EXISTS attendance_db;
USE attendance_db;

-- =========================================
-- Users table (Enhanced with features from both)
-- =========================================
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','staff') DEFAULT 'staff',
  failed_login_attempts INT DEFAULT 0,
  lock_until DATETIME NULL,
  reset_token_hash VARCHAR(255),
  reset_expires DATETIME,
  reset_sms_code_hash VARCHAR(255),
  reset_sms_expires DATETIME,
  backup_email VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- Attendance table (From clock_it with enhancements)
-- =========================================
CREATE TABLE attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  timestamp DATETIME NOT NULL,
  date DATE NOT NULL,
  status ENUM('present', 'late', 'absent') DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =========================================
-- Notifications table (From attendance)
-- =========================================
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =========================================
-- Indexes for better performance
-- =========================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_reset_token_hash ON users(reset_token_hash);
CREATE INDEX idx_users_reset_sms_code_hash ON users(reset_sms_code_hash);
CREATE INDEX idx_users_backup_email ON users(backup_email);
CREATE INDEX idx_attendance_user_id ON attendance(user_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_user_date ON attendance(user_id, date);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- =========================================
-- Sample data (Optional - for testing)
-- =========================================
-- INSERT INTO users (email, name, password_hash, role) VALUES 
-- ('admin@company.com', 'System Admin', 'hashed_password', 'admin'),
-- ('staff@company.com', 'John Doe', 'hashed_password', 'staff');