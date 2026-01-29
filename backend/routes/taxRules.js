const express = require("express");
const router = express.Router();
const taxRulesController = require("../controllers/taxRulesController");

// Get all tax rules
router.get("/", taxRulesController.GetAllRules);

// Get available rule types
router.get("/rule-types", taxRulesController.GetRuleTypes);

// Get rules for specific office
router.get("/offices/:officeid", taxRulesController.GetRulesByOffice);

// Update rules for office (add new year range)
router.post("/offices/:officeid", taxRulesController.UpdateOfficeRules);

// Close an existing year range
router.put("/offices/:officeid/close", taxRulesController.CloseYearRange);

module.exports = router;
