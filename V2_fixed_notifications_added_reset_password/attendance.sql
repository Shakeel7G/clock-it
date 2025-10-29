-- =========================================
-- Database
-- =========================================
CREATE DATABASE attendance;
USE attendance;

-- =========================================
-- Users table
-- =========================================
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  failed_login_attempts INT DEFAULT 0,
  lock_until DATETIME NULL,
  reset_token_hash VARCHAR(255),
  reset_expires DATETIME,
  reset_sms_code_hash VARCHAR(255),
  reset_sms_expires DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- Notifications table
-- =========================================
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE users ADD COLUMN backup_email VARCHAR(255) NULL;

-- =========================================
-- Indexes
-- =========================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_reset_token_hash ON users(reset_token_hash);
CREATE INDEX idx_users_reset_sms_code_hash ON users(reset_sms_code_hash);
CREATE INDEX idx_users_backup_email ON users(backup_email);

