const express = require("express");
const router = express.Router();
const checkoutRecurrenceController = require("../controllers/checkoutRecurrenceController");

// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

router.get(
    "/checkout/:checkoutId",
    asyncHandler(checkoutRecurrenceController.GetByCheckoutId)
);
router.post("/", asyncHandler(checkoutRecurrenceController.Post));
router.put("/:id", asyncHandler(checkoutRecurrenceController.Update));
router.delete("/:id", asyncHandler(checkoutRecurrenceController.Delete));

module.exports = router;
