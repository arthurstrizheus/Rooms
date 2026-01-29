const express = require("express");
const router = express.Router();
const depreciationReportController = require("../controllers/depreciationReportController");

// Depreciation report routes
router.get("/federal/report", depreciationReportController.GetFederalReport);
router.get(
    "/offices/:officeid/report",
    depreciationReportController.GetOfficeReport,
);
router.get(
    "/states/:stateCode/report",
    depreciationReportController.GetStateReport,
);

module.exports = router;
