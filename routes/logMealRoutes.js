const express = require("express");
const authenticateToken = require("../middleware/authenticate");
const logMealController = require("../controllers/logMealController");
const router = express.Router();

router.post("/", authenticateToken, logMealController.addLogMeal);
router.get("/:id", authenticateToken, logMealController.getLoggedMealsByUserId);
router.post("/edit/:id", authenticateToken, logMealController.editLoggedMeal);
router.get("/details", authenticateToken, logMealController.getLoggedMealData);
router.delete("/:id", authenticateToken, logMealController.deleteLoggedMeal);

module.exports = router;
