const express = require("express");
const {
    getAllConnectedUsers,
    getConnectedUsersByLocation,
    getConnectionStats,
    forceLogoutUserById,
} = require("../controllers/connectedUsersController");
const router = express.Router();

// Middleware to restrict access to dev users only
const devOnlyMiddleware = (req, res, next) => {
    try {
        // Get user from auth middleware (assuming auth middleware sets req.user)
        const user = req.user;

        if (!user || !user.id) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        // Get allowed dev IDs from environment variable
        const devIds = process.env.DEV_IDS
            ? process.env.DEV_IDS.split(",").map((id) => parseInt(id.trim()))
            : [];

        // Check if user ID is in the allowed dev IDs
        if (!devIds.includes(user.id)) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Developer access required.",
            });
        }

        next();
    } catch (error) {
        console.error("❌ Error in dev middleware:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during access check",
        });
    }
};

// Apply dev middleware to all routes
router.use(devOnlyMiddleware);

// Get all connected users
router.get("/", getAllConnectedUsers);

// Get connected users by location
router.get("/location/:locationId", getConnectedUsersByLocation);

// Get connection statistics
router.get("/stats", getConnectionStats);

router.post("/force_logout", forceLogoutUserById);

module.exports = router;
