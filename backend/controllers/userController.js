import { getAllUsers } from "../models/userModel.js";

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
