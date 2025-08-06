const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();
const roomController = require("../controllers/roomController");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../uploads")); // Save files in the 'uploads' directory
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // Use a timestamp to avoid filename conflicts
  },
});

// Add file type and size validation
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Error-handling wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.get("/", asyncHandler(roomController.GetAll));
router.get("/:userId", asyncHandler(roomController.GetRoomsUserCanSee));
router.post(
  "/",
  upload.single("room_image"),
  asyncHandler(roomController.Post)
);
router.put(
  "/:id",
  upload.single("room_image"),
  asyncHandler(roomController.Update)
);
router.delete("/:id", asyncHandler(roomController.Delete));

// Serve images from the uploads directory
router.get("/image/:filename", (req, res) => {
  const filePath = path.join(__dirname, "../../uploads", req.params.filename);
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error("Error serving file:", err);
      res.status(404).json({ message: "Image not found" });
    }
  });
});

module.exports = router;
