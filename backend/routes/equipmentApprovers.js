const express = require("express");
const router = express.Router();
const equipmentApproverController = require("../controllers/equipmentApproverController");

// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Get the approvers configured for a piece of equipment
router.get(
    "/equipment/:equipmentId",
    asyncHandler(equipmentApproverController.GetByEquipmentId),
);

// Replace the approvers for a piece of equipment (admin only)
router.put(
    "/equipment/:equipmentId",
    asyncHandler(equipmentApproverController.SetForEquipment),
);

module.exports = router;
