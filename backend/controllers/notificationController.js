import { getUserNotifications } from "../models/notificationModel.js";

// Response handler (from partner's responseHandler.js)
const sendResponse = (res, statusCode, success, message, data = null) => {
  const payload = { success, message };
  if (data && Object.keys(data).length > 0) {
    payload.data = data;
  }
  return res.status(statusCode).json(payload);
};

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await getUserNotifications(userId);

    if (notifications.length === 0) {
      return sendResponse(res, 200, true, "No notifications yet.", { notifications: [] });
    }

    return sendResponse(res, 200, true, "Notifications fetched successfully.", {
      notifications: notifications,
    });
  } catch (err) {
    console.error("Fetch notifications error:", err);
    return sendResponse(res, 500, false, "Failed to fetch notifications.");
  }
};