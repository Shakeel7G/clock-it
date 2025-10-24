export const createAttendance = async (userId, timestamp) => {
  const sql = "INSERT INTO attendance (user_id, timestamp, date) VALUES (?, ?, ?)";
  const date = timestamp.toISOString().split("T")[0]; // store only YYYY-MM-DD for easy lookup
  await global.db.execute(sql, [userId, timestamp, date]);
};

export const findAttendanceByUserAndDate = async (userId, date) => {
  const sql = "SELECT * FROM attendance WHERE user_id = ? AND date = ?";
  const [rows] = await global.db.execute(sql, [userId, date]);
  return rows[0];
};
