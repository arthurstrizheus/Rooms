const express = require("express");
const router = express.Router();
const calendarController = require("../controllers/calendarController");

// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Mounted before the global auth middleware; the controller authorizes each
// request with either a signed link (emails) or a JWT (in-app downloads).
router.get("/checkout/:id", asyncHandler(calendarController.GetCheckoutIcs));

module.exports = router;
