const express = require("express");
const router = express.Router();
const {
    GetAlertsByEquipment,
    GetAlertsByUser,
    GetMyAlerts,
    Subscribe,
    Unsubscribe,
    DeleteAlert,
    UpdateAlert,
} = require("../controllers/equipmentAlertController");

// Get current user's alerts
router.get("/my-alerts", GetMyAlerts);

// Get alerts by equipment
router.get("/equipment/:equipmentId", GetAlertsByEquipment);

// Get alerts by user (admin only)
router.get("/user/:userId", GetAlertsByUser);

// Subscribe to alert
router.post("/subscribe", Subscribe);

// Unsubscribe (soft delete)
router.patch("/unsubscribe/:alertId", Unsubscribe);

// Update alert settings
router.patch("/:alertId", UpdateAlert);

// Delete alert permanently
router.delete("/:alertId", DeleteAlert);

module.exports = router;
