const express = require("express");
const router = express.Router();
const { checkCalibrationAlerts } = require("../jobs/calibrationAlerts");

/**
 * Manual trigger for calibration alerts check (admin only)
 * Useful for testing without waiting for the scheduled job
 */
router.post("/check-now", async (req, res, next) => {
    try {
        // Only allow admin users to manually trigger
        if (!req.user?.admin && !req.user?.equipment_admin) {
            return res.status(403).json({
                message: "Only administrators can manually trigger alerts",
            });
        }

        await checkCalibrationAlerts();
        res.json({
            message: "Calibration alerts check completed successfully",
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
