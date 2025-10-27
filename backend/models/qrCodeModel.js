// models/qrCodeModel.js

export const createQRCodeRecord = async (userId, token, scanUrl, qrImage = null, emailRecipient = null) => {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
  
  const sql = `
    INSERT INTO qr_codes (user_id, token, scan_url, qr_image_data, email_sent, email_recipient, expires_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  const emailSent = emailRecipient ? true : false;
  
  await global.db.execute(sql, [
    userId, 
    token, 
    scanUrl, 
    qrImage, 
    emailSent, 
    emailRecipient, 
    expiresAt
  ]);
};

export const markQRCodeAsUsed = async (token) => {
  const sql = "UPDATE qr_codes SET used = TRUE, used_at = CURRENT_TIMESTAMP WHERE token = ?";
  await global.db.execute(sql, [token]);
};

export const getQRCodeByToken = async (token) => {
  const sql = "SELECT * FROM qr_codes WHERE token = ?";
  const [rows] = await global.db.execute(sql, [token]);
  return rows[0];
};

export const getUserQRCodeHistory = async (userId) => {
  const sql = `
    SELECT qc.*, u.name as user_name, u.email as user_email 
    FROM qr_codes qc 
    JOIN users u ON qc.user_id = u.id 
    WHERE qc.user_id = ? 
    ORDER BY qc.created_at DESC
  `;
  const [rows] = await global.db.execute(sql, [userId]);
  return rows;
};

export const getActiveQRCode = async (userId) => {
  const sql = "SELECT * FROM qr_codes WHERE user_id = ? AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1";
  const [rows] = await global.db.execute(sql, [userId]);
  return rows[0];
};