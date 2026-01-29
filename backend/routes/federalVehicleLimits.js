const express = require("express");
const router = express.Router();
const {
    GetLimits,
    AddLimit,
    UpdateLimit,
    DeleteLimit,
} = require("../controllers/federalVehicleLimitsController");

// Get all federal vehicle limits
router.get("/", GetLimits);

// Add a new limit for a tax year
router.post("/", AddLimit);

// Update an existing limit
router.put("/:year", UpdateLimit);

// Delete a limit
router.delete("/:year", DeleteLimit);

module.exports = router;
