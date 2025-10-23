import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createUser, findUserByEmail, findUserById, getAllUsers } from "../models/userModel.js";
export const getAllUsersController = async (req, res) => {
  try {
    const users = await getAllUsers();
    // Remove password from each user
    const safeUsers = users.map(({ password, ...u }) => u);
    res.json({ users: safeUsers });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

export const register = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existing = await findUserByEmail(email);
    if (existing) return res.status(400).json({ msg: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    await createUser(name, email, hashed);
    res.status(201).json({ msg: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await findUserByEmail(email);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ msg: "Invalid password" });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    // fetch the latest user data from DB (avoid trusting token payload for full profile)
    const dbUser = await findUserById(req.user.id);
    if (!dbUser) return res.status(404).json({ msg: "User not found" });
    const { password, ...safe } = dbUser;
    res.json({ user: safe });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
