const { connectToDatabase } = require("../config/config");
const sql = require("mssql");
const response = require("../common/response");
const { getUserById } = require("../helpers/userHelper"); // Add this line
const { logActivity } = require("../helpers/activityLogger");

// Retrieves card information for a user
exports.getCardsByUserId = async (req, res) => {
  const userId = req.user.userId; // Get userId from decoded token

  if (!userId) {
    return response.ValidationError(res, "User ID is required");
  }

  // Check if user exists
  const user = await getUserById(userId);
  if (!user) {
    return response.NotFound(res, "User not found");
  }

  try {
    const pool = await connectToDatabase();
    const result = await pool
      .request()
      .input("UserId", sql.NVarChar, userId)
      .execute("pwa_GetCardsbyUserId");

    if (result.recordset.length === 0) {
      return response.NotFound(res, "No cards found for the given user");
    }

    response.SuccessResponseWithData(
      res,
      "Cards retrieved successfully",
      result.recordset
    );
  } catch (err) {
    console.error("Error retrieving cards by user ID:", err);
    response.InternalServerError(res, "Failed to retrieve cards");
  }
};

// Updates the card status
exports.updateCardStatus = async (req, res) => {
  const userId = req.user.userId; // Get userId from decoded token
  const { cardId } = req.params;
  const { status, userComment } = req.body;

  // Validate userId and cardId
  if (!userId) {
    return response.ValidationError(res, "User ID is required");
  }
  if (!cardId) {
    return response.ValidationError(res, "Card ID is required");
  }

  // Check if user exists
  const user = await getUserById(userId);
  if (!user) {
    return response.NotFound(res, "User not found");
  }

  // Validate status
  if (!["Completed", "Dismissed"].includes(status)) {
    return response.ValidationError(
      res,
      'Status must be either "Completed" or "Dismissed"'
    );
  }

  try {
    const pool = await connectToDatabase();
    await pool
      .request()
      .input("UserId", sql.NVarChar(450), userId)
      .input("CardId", sql.Int, cardId)
      .input("Status", sql.NVarChar(255), status)
      .input("UserComment", sql.NVarChar(1000), userComment || null)
      .execute("pwa_UpdateCardStatus");

    response.SuccessResponseWithOutData(
      res,
      "Card status updated successfully"
    );
  } catch (err) {
    console.error("Error updating card status:", err);
    response.InternalServerError(res, "Failed to update card status");
  }
};

// Get a random challenge for the user
exports.getRandomChallengeForUser = async (req, res) => {
  const userId = req.user && req.user.userId;
  if (!userId) {
    return response.ValidationError(res, "User ID is required");
  }

  try {
    const pool = await connectToDatabase();
    const result = await pool
      .request()
      .input("UserId", sql.UniqueIdentifier, userId)
      .execute("GetRandomChallengeForUser");

    if (!result.recordset || result.recordset.length === 0) {
      return response.NotFound(res, "No challenge found");
    }

    response.SuccessResponseWithData(
      res,
      "Random challenge retrieved successfully",
      result.recordset[0]
    );
  } catch (err) {
    console.error("Error retrieving random challenge:", err);
    response.InternalServerError(res, "Failed to retrieve random challenge");
  }
};

// Update the user's challenge status (complete/incomplete)
exports.updateUserChallengeStatus = async (req, res) => {
  const userId = req.user && req.user.userId;
  const { challengeId, isCompleted } = req.body;

  if (!userId) {
    return response.ValidationError(res, "User ID is required");
  }
  if (!challengeId) {
    return response.ValidationError(res, "Challenge ID is required");
  }
  if (typeof isCompleted !== "boolean") {
    return response.ValidationError(res, "isCompleted must be a boolean");
  }

  try {
    const pool = await connectToDatabase();
    const result = await pool
      .request()
      .input("ChallengeId", sql.UniqueIdentifier, challengeId)
      .input("UserId", sql.UniqueIdentifier, userId)
      .input("IsCompleted", sql.Bit, isCompleted)
      .execute("UpdateUserChallengeStatus");

    if (
      result.recordset &&
      result.recordset[0] &&
      result.recordset[0].Success === 1
    ) {
      // Log successful challenge status update
      const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
      logActivity({
        type: "CHALLENGE",
        ip: ip,
        title: "User Completed daily challenges",
        metadata: {
          userId: userId,
          challengeId: challengeId,
          isCompleted: isCompleted,
        },
      });

      return response.SuccessResponseWithOutData(
        res,
        "Challenge status updated successfully"
      );
    } else {
      return response.InternalServerError(
        res,
        "Failed to update challenge status"
      );
    }
  } catch (err) {
    // Handle foreign key constraint error (challenge does not exist)
    if (
      err.code === "EREQUEST" &&
      err.originalError &&
      err.originalError.info &&
      err.originalError.info.number === 547
    ) {
      return response.ValidationError(
        res,
        "The specified challenge does not exist. Please provide a valid challengeId."
      );
    }
    console.error("Error updating challenge status:", err);
    response.InternalServerError(res, "Failed to update challenge status");
  }
};

// Get today's learning video for the user (or fallback)
exports.getLearningVideoForUser = async (req, res) => {
  const userId = req.user && req.user.userId;
  if (!userId) {
    return response.ValidationError(res, "User ID is required");
  }

  try {
    const pool = await connectToDatabase();
    const result = await pool
      .request()
      .input("UserId", sql.UniqueIdentifier, userId)
      .execute("GetLearningVideoForUser");

    if (!result.recordset || result.recordset.length === 0) {
      console.log("No records found in recordset");
      return response.NotFound(res, "No learning video found");
    }

    response.SuccessResponseWithData(
      res,
      "Learning video retrieved successfully",
      result.recordset[0]
    );
  } catch (err) {
    console.error("Error retrieving learning video:", err);
    response.InternalServerError(res, "Failed to retrieve learning video");
  }
};

exports.getUserStreak = async (req, res) => {
  const userId = req.user.userId;
  if (!userId) {
    return response.ValidationError(res, "User ID is required");
  }
  try {
    const pool = await connectToDatabase();
    const request = await pool.request();
    request.input("UserId", sql.UniqueIdentifier, userId);
    const result = await request.execute("pwa_UpdateAndGetLoginStreak");
    return response.SuccessResponseWithData(
      res,
      "Streak updated & fetched successfully",
      result.recordset[0]
    );
  } catch (error) {
    return response.FailedResponseWithOutData(res, error.message);
  }
};
