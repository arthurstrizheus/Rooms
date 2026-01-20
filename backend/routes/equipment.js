const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const equipmentController = require("../controllers/equipmentController");
const equipmentFileController = require("../controllers/equipmentFileController");

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "equipment-" + uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({ storage });

// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

router.get("/", asyncHandler(equipmentController.GetAll));
router.get("/:id", asyncHandler(equipmentController.GetById));
router.get(
    "/:equipmentId/files",
    asyncHandler(equipmentFileController.GetByEquipmentId)
);
router.post(
    "/",
    upload.single("image"),
    asyncHandler(equipmentController.Post)
);
router.put(
    "/:id",
    upload.single("image"),
    asyncHandler(equipmentController.Update)
);
router.delete("/:id", asyncHandler(equipmentController.Delete));

module.exports = router;
