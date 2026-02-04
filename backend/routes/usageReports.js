const express = require("express");
const router = express.Router();
const { GetUsageReport } = require("../controllers/usageReportController");

// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

router.get("/", asyncHandler(GetUsageReport));

module.exports = router;
