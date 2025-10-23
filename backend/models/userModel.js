export const createUser = async (name, email, passwordHash) => {
  const sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
  await global.db.execute(sql, [name, email, passwordHash]);
};

export const findUserByEmail = async (email) => {
  const [rows] = await global.db.execute("SELECT * FROM users WHERE email = ?", [email]);
  return rows[0];
};

export const findUserById = async (id) => {
  const [rows] = await global.db.execute("SELECT * FROM users WHERE id = ?", [id]);
  return rows[0];
};

export const getAllUsers = async () => {
  const [rows] = await global.db.execute("SELECT * FROM users", []);
  return rows;
};
