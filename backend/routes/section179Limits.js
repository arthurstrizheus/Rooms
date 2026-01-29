const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/auth");
const {
    GetAll,
    Post,
    Update,
    Delete,
} = require("../controllers/section179LimitsController");

// All routes require authentication
router.use(authenticateUser);

// GET all section 179 limits
router.get("/", GetAll);

// POST new year's limits
router.post("/", Post);

// PUT update existing year's limits
router.put("/:year", Update);

// DELETE a year's limits
router.delete("/:year", Delete);

module.exports = router;
