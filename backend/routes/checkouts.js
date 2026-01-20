const express = require("express");
const router = express.Router();
const checkoutController = require("../controllers/checkoutController");

// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

router.get("/", asyncHandler(checkoutController.GetAll));
router.get(
    "/pending-approvals",
    asyncHandler(checkoutController.GetPendingApprovals)
);
router.get(
    "/equipment/:equipmentId",
    asyncHandler(checkoutController.GetByEquipmentId)
);
router.get("/user/:userId", asyncHandler(checkoutController.GetByUserId));
router.post("/", asyncHandler(checkoutController.Post));
router.put("/:id", asyncHandler(checkoutController.Update));
router.put("/:id/approve", asyncHandler(checkoutController.Approve));
router.delete("/:id", asyncHandler(checkoutController.Delete));

module.exports = router;
