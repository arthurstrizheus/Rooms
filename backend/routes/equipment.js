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
        // Ensure directory exists before upload
        if (!fs.existsSync(uploadsDir)) {
            try {
                fs.mkdirSync(uploadsDir, { recursive: true });
                console.log("Created uploads directory:", uploadsDir);
            } catch (err) {
                console.error("Failed to create uploads directory:", err);
                return cb(err);
            }
        }
        console.log("Saving file to:", uploadsDir);
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const filename =
            "equipment-" + uniqueSuffix + path.extname(file.originalname);
        console.log("Generated filename:", filename);
        cb(null, filename);
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        console.log("Multer receiving file:", file.originalname);
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(
            path.extname(file.originalname).toLowerCase(),
        );
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(
                new Error(
                    "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.",
                ),
            );
        }
    },
});

// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

router.get("/", asyncHandler(equipmentController.GetAll));
router.get("/export/excel", asyncHandler(equipmentController.ExportToExcel));
router.get("/:id", asyncHandler(equipmentController.GetById));
router.get(
    "/:equipmentId/files",
    asyncHandler(equipmentFileController.GetByEquipmentId),
);
router.post(
    "/",
    upload.single("image"),
    (err, req, res, next) => {
        if (err instanceof multer.MulterError) {
            console.error("Multer error:", err);
            return res.status(400).json({ message: err.message });
        } else if (err) {
            console.error("Upload error:", err);
            return res.status(400).json({ message: err.message });
        }
        next();
    },
    asyncHandler(equipmentController.Post),
);
router.put(
    "/:id",
    upload.single("image"),
    (err, req, res, next) => {
        if (err instanceof multer.MulterError) {
            console.error("Multer error:", err);
            return res.status(400).json({ message: err.message });
        } else if (err) {
            console.error("Upload error:", err);
            return res.status(400).json({ message: err.message });
        }
        next();
    },
    asyncHandler(equipmentController.Update),
);
router.delete("/:id", asyncHandler(equipmentController.Delete));

module.exports = router;
