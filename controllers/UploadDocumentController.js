const blobStorage = require("../middleware/blobStorage");
const validation = require("../common/validation");
const responseHandlers = require("../common/response");
const { connectToDatabase } = require("../config/config");
const sql = require("mssql");

const uploadUserDocuments = async (req, res) => {
  try {
    const { userId, category } = req.body;

    if (!userId || !category) {
      return responseHandlers.ValidationError(
        res,
        "UserId and category are required"
      );
    }

    if (!req.files || req.files.length === 0) {
      return responseHandlers.ValidationError(res, "No files uploaded");
    }

    const pool = await connectToDatabase();
    const savedDocuments = [];

    for (const file of req.files) {
      // Validate mime type
      const mimeError = validation.validateDocumentMimeType(file.mimetype);
      if (mimeError) {
        return responseHandlers.ValidationError(res, mimeError);
      }

      // Validate file size
      const sizeError = validation.validateFileSize(file.size, category);
      if (sizeError) {
        return responseHandlers.ValidationError(res, sizeError);
      }

      // Upload to blob
      const blobUrl = await blobStorage.uploadFile(
        file.originalname,
        file.buffer,
        file.mimetype
      );

      const blobName = blobUrl.split("/").pop();
      const fileSize = file.size; // 👈 FILE SIZE IN BYTES

      const result = await pool
        .request()
        .input("UserId", sql.UniqueIdentifier, userId)
        .input("Category", sql.NVarChar(50), category)
        .input("OriginalFileName", sql.NVarChar(255), file.originalname)
        .input("BlobName", sql.NVarChar(255), blobName)
        .input("BlobUrl", sql.NVarChar(sql.MAX), blobUrl)
        .input("FileSize", sql.BigInt, fileSize) // 👈 ADD THIS
        .execute("dbo.pwa_InsertUserDocument");

      savedDocuments.push({
        documentId: result.recordset[0].DocumentId,
        fileName: file.originalname,
        blobUrl,
        fileSize, // optional return
      });
    }

    return responseHandlers.SuccessResponseWithData(
      res,
      "Documents uploaded successfully",
      savedDocuments
    );
  } catch (err) {
    console.error("Document upload failed:", err);
    return responseHandlers.InternalServerError(res, err);
  }
};

const getUserDocuments = async (req, res) => {
  try {
    const { userId, documentId } = req.query;

    if (!userId) {
      return responseHandlers.ValidationError(res, "UserId is required");
    }

    const pool = await connectToDatabase();

    const request = pool
      .request()
      .input("UserId", sql.UniqueIdentifier, userId);

    if (documentId) {
      request.input("DocumentId", sql.Int, documentId);
    }

    const result = await request.execute("dbo.pwa_GetUserDocuments");

    return responseHandlers.SuccessResponseWithData(
      res,
      "Documents fetched successfully",
      result.recordset
    );
  } catch (err) {
    console.error("Get documents failed:", err);
    return responseHandlers.InternalServerError(res, err);
  }
};

module.exports = {
  uploadUserDocuments,
  getUserDocuments,
};
