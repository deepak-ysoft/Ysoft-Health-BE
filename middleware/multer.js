const multer = require("multer");

const uploadDocumentsMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
}).array("files");
module.exports = {
  uploadDocumentsMiddleware,
};
