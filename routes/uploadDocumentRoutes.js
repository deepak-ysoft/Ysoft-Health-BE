const express = require("express");
const { uploadDocumentsMiddleware } = require("../middleware/multer");
const {
  uploadUserDocuments,
  getUserDocuments,
} = require("../controllers/UploadDocumentController");
const authenticateToken = require("../middleware/authenticate");
const router = express.Router();

router.post("/upload", uploadDocumentsMiddleware, uploadUserDocuments);

router.get("/get", authenticateToken, getUserDocuments);

module.exports = router;
