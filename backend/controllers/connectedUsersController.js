const {
    getConnectedUsers,
    forceLogoutUser,
} = require("../sockets/socketHandler");
const User = require("../models/user");

// Get all currently connected users
const getAllConnectedUsers = async (req, res) => {
    try {
        console.log("📊 Fetching all connected users");

        const connectedUsers = getConnectedUsers();

        // Optionally, get additional user details from database
        const connectedUsersWithDetails = await Promise.all(
            connectedUsers.map(async (connectedUser) => {
                try {
                    const dbUser = await User.findByPk(connectedUser.id, {
                        attributes: [
                            "id",
                            "username",
                            "first_name",
                            "last_name",
                            "email",
                            "location",
                            "admin",
                            "equipment_office_admin",
                            "last_login",
                        ],
                    });

                    return {
                        ...connectedUser,
                        // Override with fresh DB data if available
                        ...(dbUser
                            ? {
                                  first_name: dbUser.first_name,
                                  last_name: dbUser.last_name,
                                  email: dbUser.email,
                                  location: dbUser.location,
                                  admin: dbUser.admin,
                                  equipment_office_admin:
                                      dbUser.equipment_office_admin,
                                  last_login: dbUser.last_login,
                              }
                            : {}),
                    };
                } catch (error) {
                    console.error(
                        `Error fetching user ${connectedUser.id} from DB:`,
                        error
                    );
                    return connectedUser; // Return socket data if DB fetch fails
                }
            })
        );

        console.log(
            `📊 Found ${connectedUsersWithDetails.length} connected users`
        );

        res.json({
            success: true,
            count: connectedUsersWithDetails.length,
            users: connectedUsersWithDetails,
        });
    } catch (error) {
        console.error("❌ Error fetching connected users:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching connected users",
            error: error.message,
        });
    }
};

// Get connected users by location
const getConnectedUsersByLocation = async (req, res) => {
    try {
        const { locationId } = req.params;
        console.log(`📊 Fetching connected users for location: ${locationId}`);

        const allConnectedUsers = getConnectedUsers();
        const locationUsers = allConnectedUsers.filter(
            (user) => user.location == locationId
        );

        console.log(
            `📊 Found ${locationUsers.length} connected users in location ${locationId}`
        );

        res.json({
            success: true,
            locationId: parseInt(locationId),
            count: locationUsers.length,
            users: locationUsers,
        });
    } catch (error) {
        console.error("❌ Error fetching connected users by location:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching connected users by location",
            error: error.message,
        });
    }
};

// Get connection statistics
const getConnectionStats = async (req, res) => {
    try {
        const connectedUsers = getConnectedUsers();

        // Group by location
        const locationStats = connectedUsers.reduce((acc, user) => {
            const location = user.location || "unknown";
            acc[location] = (acc[location] || 0) + 1;
            return acc;
        }, {});

        // Count different user types
        const adminCount = connectedUsers.filter((user) => user.admin).length;
        const officeAdminCount = connectedUsers.filter(
            (user) => user.equipment_office_admin
        ).length;
        const regularCount =
            connectedUsers.length - adminCount - officeAdminCount;

        console.log(
            `📊 Connection stats: Total: ${connectedUsers.length}, Admins: ${adminCount}, Office Admins: ${officeAdminCount}, Regular: ${regularCount}`
        );

        res.json({
            success: true,
            stats: {
                total: connectedUsers.length,
                byLocation: locationStats,
                admins: adminCount,
                officeAdmins: officeAdminCount,
                regular: regularCount,
                lastUpdated: new Date(),
            },
        });
    } catch (error) {
        console.error("❌ Error fetching connection stats:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching connection statistics",
            error: error.message,
        });
    }
};

const forceLogoutUserById = async (req, res) => {
    try {
        const { userId, reason } = req.body;

        const adminUser = req.user; // From auth middleware

        console.log(
            `🚪 Admin ${adminUser.username} (ID: ${adminUser.id}) requesting force logout for user ID: ${userId}`
        );

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required",
            });
        }

        // Convert userId to number
        const targetUserId = parseInt(userId);

        if (isNaN(targetUserId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID format",
            });
        }

        // Prevent self-logout (optional safety check)
        if (targetUserId === adminUser.id) {
            return res.status(400).json({
                success: false,
                message: "Cannot force logout yourself",
            });
        }

        const result = forceLogoutUser(
            targetUserId,
            reason || `Logged out by admin ${adminUser.username}`
        );

        if (result.success) {
            console.log(`✅ Force logout successful: ${result.message}`);
            return res.json({
                success: true,
                message: result.message,
                user: result.user,
                loggedOutBy: {
                    id: adminUser.id,
                    username: adminUser.username,
                },
            });
        } else {
            console.log(`❌ Force logout failed: ${result.message}`);
            return res.status(404).json({
                success: false,
                message: result.message,
            });
        }
    } catch (error) {
        console.error("❌ Error in force logout controller:", error);
        res.status(500).json({
            success: false,
            message: "Server error during force logout",
            error: error.message,
        });
    }
};

module.exports = {
    getAllConnectedUsers,
    getConnectedUsersByLocation,
    getConnectionStats,
    forceLogoutUserById,
};
