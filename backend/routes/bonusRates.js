const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/auth");
const {
    GetAll,
    Post,
    Update,
    Delete,
} = require("../controllers/bonusRatesController");

// All routes require authentication
router.use(authenticateUser);

// GET all bonus rates
router.get("/", GetAll);

// POST new year's bonus rate
router.post("/", Post);

// PUT update existing year's bonus rate
router.put("/:year", Update);

// DELETE a year's bonus rate
router.delete("/:year", Delete);

module.exports = router;
