const { connectToDatabase } = require("../config/config");
const sql = require("mssql");

/**
 * Send a notification to a user
 */
exports.sendNotification = async (
  userId,
  type,
  title,
  message,
  priority = "medium",
  sendDateTime = null
) => {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const guidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!guidRegex.test(userId)) {
    throw new Error("Invalid User ID format");
  }

  let sendAt = null;
  if (sendDateTime) {
    sendAt = new Date(sendDateTime);
    if (isNaN(sendAt.getTime())) {
      throw new Error("Invalid sendDateTime format");
    }
  }

  const pool = await connectToDatabase();

  const result = await pool
    .request()
    .input("UserId", sql.UniqueIdentifier, userId)
    .input("Type", sql.NVarChar, type)
    .input("Title", sql.NVarChar, title)
    .input("Message", sql.NVarChar, message)
    .input("Priority", sql.NVarChar, priority)
    .input("SendDateTime", sql.DateTime2, sendAt)
    .execute("pwa_CreateNotification");

  return {
    notificationId: result.recordset?.[0]?.NotificationId,
  };
};
