const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/auth");
const {
    GetAll,
    Post,
    Update,
    Delete,
} = require("../controllers/passengerAutoLimitsController");

// All routes require authentication
router.use(authenticateUser);

// GET all passenger auto limits
router.get("/", GetAll);

// POST new year's limits
router.post("/", Post);

// PUT update existing year's limits
router.put("/:year", Update);

// DELETE a year's limits
router.delete("/:year", Delete);

module.exports = router;
