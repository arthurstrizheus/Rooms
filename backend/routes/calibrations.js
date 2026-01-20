const express = require("express");
const router = express.Router();
const calibrationController = require("../controllers/calibrationController");

// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

router.get(
    "/equipment/:equipmentId",
    asyncHandler(calibrationController.GetByEquipmentId)
);
router.post("/", asyncHandler(calibrationController.Post));
router.put("/:id", asyncHandler(calibrationController.Update));
router.delete("/:id", asyncHandler(calibrationController.Delete));

module.exports = router;
