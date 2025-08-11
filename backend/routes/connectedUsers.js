const express = require("express");
const {
    getAllConnectedUsers,
    getConnectedUsersByLocation,
    getConnectionStats,
    forceLogoutUserById,
} = require("../controllers/connectedUsersController");
const router = express.Router();

// Middleware to restrict access to dev users only
const adminOnlyMiddleware = (req, res, next) => {
    try {
        // Get user from auth middleware (assuming auth middleware sets req.user)
        const user = req.user;

        if (!user || !user.id) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }
        // Check if user is an admin
        if (!user.admin) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin access required.",
            });
        }

        next();
    } catch (error) {
        console.error("❌ Error in admin middleware:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during access check",
        });
    }
};

// Apply dev middleware to all routes
router.use(adminOnlyMiddleware);

// Get all connected users
router.get("/", getAllConnectedUsers);

// Get connected users by location
router.get("/location/:locationId", getConnectedUsersByLocation);

// Get connection statistics
router.get("/stats", getConnectionStats);

router.post("/force_logout", forceLogoutUserById);

module.exports = router;
