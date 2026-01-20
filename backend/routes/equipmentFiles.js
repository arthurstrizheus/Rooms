const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const equipmentFileController = require("../controllers/equipmentFileController");

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "file-" + uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({ storage });

// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

router.get(
    "/equipment/:equipmentId",
    asyncHandler(equipmentFileController.GetByEquipmentId)
);
router.get("/download/:id", asyncHandler(equipmentFileController.Download));
router.post(
    "/",
    upload.single("file"),
    asyncHandler(equipmentFileController.Post)
);
router.put(
    "/:id",
    upload.single("file"),
    asyncHandler(equipmentFileController.Update)
);
router.delete("/:id", asyncHandler(equipmentFileController.Delete));

module.exports = router;
