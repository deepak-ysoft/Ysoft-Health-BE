const { connectToDatabase } = require("../config/config");
const sql = require("mssql");
const response = require("../common/response");
require("dotenv").config();

exports.getNotificationsAsUser = async (req, res) => {
  const userId = req.user.userId;
  if (!userId) {
    return response.ValidationError(res, "User ID is required");
  }

  try {
    const guidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!guidRegex.test(userId)) {
      return response.ValidationError(res, "Invalid User ID format");
    }

    const pool = await connectToDatabase();
    const request = pool
      .request()
      .input("UserId", sql.UniqueIdentifier, userId);

    const result = await request.execute("pwa_GetUserNotifications");

    return response.SuccessResponseWithData(
      res,
      "User notifications retrieved successfully",
      result.recordset || []
    );
  } catch (err) {
    console.error("Get notifications error:", err);
    return response.InternalServerError(
      res,
      "Failed to retrieve notifications"
    );
  }
};

exports.markNotificationAsReadAsUser = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  if (!id || !userId) {
    return response.ValidationError(
      res,
      "Notification ID and User ID are required"
    );
  }

  try {
    const pool = await connectToDatabase();
    const result = await pool
      .request()
      .input("NotificationId", sql.Int, id)
      .input("UserId", sql.UniqueIdentifier, userId)
      .execute("pwa_MarkNotificationRead");

    const dbResponse = result.recordset?.[0];

    if (!dbResponse || dbResponse.Success === false) {
      return response.NotFound(res, "Notification not found");
    }

    return response.SuccessResponseWithData(
      res,
      dbResponse.Action, // "Marked as read" OR "Marked as unread"
      {
        isRead: dbResponse.IsRead,
      }
    );
  } catch (err) {
    console.error("Mark read error:", err);
    return response.InternalServerError(
      res,
      "Failed to mark notification as read"
    );
  }
};

exports.deleteNotificationAsUser = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  if (!id || !userId) {
    return response.ValidationError(
      res,
      "Notification ID and User ID are required"
    );
  }

  try {
    const pool = await connectToDatabase();
    await pool
      .request()
      .input("NotificationId", sql.Int, id)
      .input("UserId", sql.UniqueIdentifier, userId)
      .execute("pwa_DeleteNotification");

    return response.SuccessResponseWithOutData(
      res,
      "Notification deleted successfully"
    );
  } catch (err) {
    console.error("Delete notification error:", err);
    return response.InternalServerError(res, "Failed to delete notification");
  }
};
