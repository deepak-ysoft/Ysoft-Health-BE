const allowedMimeTypes = [
  // Images
  "image/jpeg",
  "image/png",

  // PDFs
  "application/pdf",

  // Videos
  "video/mp4",
  "video/webm",
  "video/ogg",

  // CCDA (XML)
  "application/xml",
  "text/xml",

  // Docs (optional)
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const validateDocumentMimeType = (mimeType) => {
  if (!allowedMimeTypes.includes(mimeType)) {
    return "Unsupported file type";
  }
  return null;
};

// Function to validate the MIME type of the uploaded file
const validateMimeType = (mimeType) => {
  // Define allowed MIME types for images
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif"];

  // Check if the provided MIME type is in the allowed list
  if (!allowedMimeTypes.includes(mimeType)) {
    return "Invalid file type. Only JPEG, PNG, and GIF are allowed.";
  }

  return null;
};

// Function to validate the file size of the uploaded file
const validateFileSize = (size, type) => {
  // Define the maximum allowed file size (50MB)
  const maxSizeInBytes = type === "Videos" ? 50 * 1024 * 1024 : 5 * 1024 * 1024; // 50MB for videos, 5MB for others
  // Check if the file size exceeds the limit
  if (size > maxSizeInBytes) {
    return (
      "File size exceeds the maximum limit of " +
      (type === "Videos" ? "50MB" : "5MB") +
      "."
    );
  }

  return null;
};

module.exports = {
  validateMimeType,
  validateFileSize,
  validateDocumentMimeType,
};
