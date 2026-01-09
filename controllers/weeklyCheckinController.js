const sql = require("mssql");
const { getUserById } = require("../helpers/userHelper");
const response = require("../common/response");
const { connectToDatabase } = require("../config/config");
const { logActivity } = require("../helpers/activityLogger");

exports.saveWeeklyCheckin = async (req, res) => {
  const { formType, date, scores, totalScore } = req.body;
  const userId = req.user.userId;

  const user = await getUserById(userId);
  if (!user) {
    return response.NotFound(res, "User not found");
  }

  const jsonData = JSON.stringify({
    Forms: [
      {
        FormType: formType,
        Entries:
          formType === "IBS-QOL"
            ? Object.values(scores).map((item) => ({
                Category: item.section,
                Question: item.question,
                Answer: item.answerLabel,
                NumericValue: item.answerValue,
              }))
            : scores,
      },
    ],
  });

  try {
    const pool = await connectToDatabase();

    const request = await pool
      .request()
      .input("YSoftUserId", sql.VarChar(50), userId)
      .input("WeekStartDate", sql.Date, date)
      .input("JsonData", sql.NVarChar(sql.MAX), jsonData)
      .input("FormScore", sql.Decimal(5, 2), totalScore);

    const result = await request.execute("pwa_CreateWeeklyCheckIn");

    // Log successful weekly check-in
    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    logActivity({
      type: "WEEKLY_CHECKIN",
      ip: ip,
      title: `User saved ${formType} weekly check-in form`,
      metadata: {
        userId: userId,
        formType: formType,
        date: date,
        totalScore: totalScore,
      },
    });

    // Success response
    response.SuccessResponseWithData(res, "Weekly check-in saved successfully");
  } catch (error) {
    response.FailedResponseWithOutData(
      res,
      error.response?.data || error.message
    );
    console.error("something went wrong");
  }
};

exports.getWeeklycheckIn = async (req, res) => {
  const { date } = await req.query;
  const userId = req.user.userId;
  const user = await getUserById(userId);
  if (!user) {
    return response.NotFound(res, "User not found");
  }
  if (!date) {
    return response.ValidationError(res, "date is required");
  }
  try {
    const pool = await connectToDatabase();
    const request = await pool.request();
    request.input("YSoftUserId", sql.VarChar(50), userId);
    request.input("WeekStartDate", sql.Date, date);
    const result = await request.execute("pwa_GetWeeklyCheckIn");
    const data = result.recordsets[0][0].ResponseJson;
    const parsedResponse = JSON.parse(data);

    response.SuccessResponseWithData(
      res,
      "Weekly check in  retrieved successfully",
      parsedResponse
    );
  } catch (error) {
    response.FailedResponseWithOutData(
      res,
      error.response?.data || error.message
    );
  }
};
