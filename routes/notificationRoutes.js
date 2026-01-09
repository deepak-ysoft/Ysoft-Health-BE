const express = require("express");
const router = express.Router();
const notificationsController = require("../controllers/NotificationController");
const authenticateToken = require("../middleware/authenticate"); // Add this line

router.get(
  "/get",
  authenticateToken,
  notificationsController.getNotificationsAsUser
);

router.patch(
  "/read/:id",
  authenticateToken,
  notificationsController.markNotificationAsReadAsUser
);

router.delete(
  "/delete/:id",
  authenticateToken,
  notificationsController.deleteNotificationAsUser
);

module.exports = router;
