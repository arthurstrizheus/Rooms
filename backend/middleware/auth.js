const jwt = require("jsonwebtoken");
const { User } = require("../models");

// Routes that don't require authentication
const publicRoutes = [
    "/api/users/login",
    "/api/users/loginAd",
    "/api/users/adhasuser",
    "/api/locations",
    "/uploads",
    // Add more public routes as needed
];

const authenticateUser = async (req, res, next) => {
    try {
        // A bare `startsWith` makes every route that merely SHARES A PREFIX
        // public too: `/api/locations` also exempted a hypothetical
        // `/api/locations-admin`, and `/uploads` exempted `/uploads-private`.
        // Require a path-segment boundary so only the route itself and things
        // genuinely beneath it match.
        const isPublicRoute = publicRoutes.some(
            (route) =>
                req.path === route || req.path.startsWith(`${route}/`),
        );

        console.log(
            `🔍 Auth middleware - Path: ${req.path}, Public: ${isPublicRoute}`,
        );

        if (isPublicRoute) {
            console.log("✅ Public route - skipping auth");
            req.user = null;
            return next();
        }

        const authHeader = req.header("Authorization");
        const token =
            authHeader?.replace("Bearer ", "") ||
            req.query.token ||
            req.body.token;

        if (!token) {
            console.log("⚠️ No token provided for protected route");
            return res.status(401).json({
                message: "Access denied. No token provided.",
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findByPk(decoded.id);

        if (!user) {
            console.log("❌ User not found in database");
            return res.status(401).json({
                message: "Invalid token. User not found.",
            });
        }

        // Deactivating a user had no effect until their token expired, which is
        // 7 days. `active` was read onto req.user below and then never checked
        // by anything, so an offboarded account kept full API access for a week.
        //
        // Tested against an explicit false/0 rather than falsiness: rows
        // predating the column have NULL here, and treating those as
        // deactivated would lock out everyone who hasn't been touched since.
        if (user.active === false || user.active === 0) {
            console.log(`⛔ Deactivated account rejected: ${user.username}`);
            return res.status(401).json({
                message: "This account has been deactivated.",
            });
        }

        // Merge user data into req.user
        req.user = {
            id: user.id,
            email: user.email,
            username: user.username,
            admin: user?.admin,
            first_name: user.first_name,
            last_name: user.last_name,
            location: user.location,
            active: user.active,
            last_login: user.last_login,
            equipment_office_admin: user?.equipment_office_admin,
            equipment_admin: user?.equipment_admin,
        };

        console.log(
            `✅ User authenticated: ${req.user.username} (ID: ${req.user.id}, Admin: ${req.user?.admin}, EquipmentAdmin: ${req.user?.equipment_admin}, EquipmentOfficeAdmin: ${req.user?.equipment_office_admin})`,
        );
        next();
    } catch (error) {
        console.error("❌ Auth middleware error:", error.message);
        if (error.name === "JsonWebTokenError") {
            console.error("🔴 Invalid JWT token");
            return res.status(401).json({ message: "Invalid token." });
        } else if (error.name === "TokenExpiredError") {
            console.error("🔴 JWT token expired");
            return res.status(401).json({ message: "Token expired." });
        }
        return res
            .status(500)
            .json({ message: "Server error during authentication." });
    }
};

module.exports = { authenticateUser };
