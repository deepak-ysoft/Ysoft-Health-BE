const response = require("../common/response");
const { getUserById } = require("../helpers/userHelper");
const { connectToDatabase } = require("../config/config");
const { logActivity } = require("../helpers/activityLogger");

exports.addLogMeal = async (req, res) => {
  const userId = req.user.userId;

  try {
    const user = await getUserById(userId);
    if (!user) {
      return response.NotFound(res, "User not found");
    }

    const {
      recipeId,
      classificationId,
      HowMuch,
      WhenEat,
      IsInUsualSchedule,
      Rate,
      YouMakeItAgain,
      AnySymptoms,
      WhatSymptoms,
      WhenSymptomsStart,
      Notes,
    } = req.body;

    const pool = await connectToDatabase();

    const result = await pool
      .request()
      .input("UserId", userId)
      .input("RecipeId", recipeId ?? null)
      .input("ClassificationId", classificationId ?? null)
      .input("HowMuch", HowMuch)
      .input("WhenEat", WhenEat)
      .input("IsInUsualSchedule", IsInUsualSchedule)
      .input("Rate", Rate)
      .input("YouMakeItAgain", YouMakeItAgain)
      .input("AnySymptoms", AnySymptoms)
      .input("WhatSymptoms", WhatSymptoms?.join(",") ?? null)
      .input("WhenSymptomsStart", WhenSymptomsStart)
      .input("Notes", Notes)
      .execute("pwa_InsertMealLog");
    const insertMeal = result.recordset[0];
    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    await logActivity({
      type: "MEAL_LOGGED",
      ip: ip,
      title: `User logged ${insertMeal.RecipeTitle} meal `,
      metadata: {
        userId: userId,
        howMuch: insertMeal.howMuch,
        whenEat: insertMeal.WhenEat,
        usualSchedule: insertMeal.IsInUsualSchedule,
        rate: insertMeal.Rate,
        makeItAgain: insertMeal.YouMakeItAgain,
        anySymptoms: insertMeal.AnySymptoms,
        symptoms: insertMeal.WhatSymptoms,
        whenSymptomsStart: insertMeal.whenSymptomsStart,
        notes: insertMeal.notes,
      },
    });

    return response.SuccessResponseWithData(res, "Meal logged successfully");
  } catch (error) {
    console.error("addLogMeal error:", error);
    return response.FailedResponseWithOutData(res);
  }
};

exports.getLoggedMealsByUserId = async (req, res) => {
  const userId = req.user.userId;
  const logId = parseInt(req.params.id, 10);

  try {
    const user = await getUserById(userId);
    if (!user) {
      return response.NotFound(res, "User not found");
    }

    const pool = await connectToDatabase();

    const result = await pool
      .request()
      .input("UserId", userId)
      .input("LogId", logId)
      .execute("pwa_GetMealLogsByUserId");
    return response.SuccessResponseWithData(
      res,
      "Meal logs fetched successfully",
      result.recordset
    );
  } catch (error) {
    console.error("getLoggedMealsByUserId error:", error);
    return response.FailedResponseWithOutData(res, error);
  }
};

exports.editLoggedMeal = async (req, res) => {
  const userId = req.user.userId;
  const logId = req.params.id;
  const { HowMuch, WhenEat, AnySymptoms, Notes } = req.body;
  if (!logId) {
    return response.BadRequest(res, "LogId is required");
  }
  try {
    const user = await getUserById(userId);
    if (!user) {
      return response.NotFound(res, "User not found");
    }
    const pool = await connectToDatabase();
    const result = await pool
      .request()
      .input("LogId", logId)
      .input("HowMuch", HowMuch ?? null)
      .input("WhenEat", WhenEat ?? null)
      .input("AnySymptoms", AnySymptoms ?? null)
      .input("Notes", Notes ?? null)
      .execute("pwa_UpdateMealLogBasicInfo");
    console.log("result Edit", result);
    const insertMeal = result.recordset[0];

    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    await logActivity({
      type: "MEAL_LOGGED",
      ip: ip,
      title: `User updated ${insertMeal.RecipeTitle} logged meal `,
      metadata: {
        userId: userId,
      },
    });
    return response.SuccessResponseWithOutData(
      res,
      "Meal log updated successfully"
    );
  } catch (error) {
    console.error("Edit Logged Meal Error:", error);
    return response.FailedResponseWithOutData(res);
  }
};

exports.getLoggedMealData = async (req, res) => {
  const userId = req.user.usedId;
  try {
    const user = await getUserById(userId);
    if (!user) {
      return response.NotFound(res, "User not found");
    }
    const pool = await connectToDatabase();
    const result = await pool
      .request()
      .input("UserId", userId)
      .execute("pwa_GetMealLogsByUserId");
    return response.SuccessResponseWithData(
      res,
      "Meal logs fetched successfully",
      result.recordset
    );
  } catch (error) {
    console.error("getLoggedMealsByUserId error:", error);
    return response.FailedResponseWithOutData(res, error);
  }
};

exports.deleteLoggedMeal = async (req, res) => {
  const userId = req.user.userId;
  const logId = req.params.id;
  try {
    const user = await getUserById(userId);
    if (!user) {
      return response.NotFound(res, "User not found");
    }
    const pool = await connectToDatabase();
    const result = await pool
      .request()
      .input("LogId", logId)
      .execute("pwa_DeleteMealLog");

    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    await logActivity({
      type: "MEAL_LOGGED",
      ip: ip,
      title: `user remove ${result.recordset[0].RecipeTitle} from loggged meal`,
      metadata: {
        userId: userId,
      },
    });

    return response.SuccessResponseWithData(
      res,
      "Meal log deleted successfully",
      result.recordset
    );
  } catch (error) {
    console.error("getLoggedMealsByUserId error:", error);
    return response.FailedResponseWithOutData(res, error);
  }
};
