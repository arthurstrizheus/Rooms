const { socketAuth } = require("../middleware/socketAuth");

// Store connected users with their socket references
const connectedUsers = new Map();

const handleSocketConnection = (io) => {
    console.log(
        "🚀 Socket.IO server initialized and listening for connections"
    );

    // Apply authentication middleware
    io.use((socket, next) => {
        console.log("🔌 New socket connection attempt");
        socketAuth(socket, next);
    });

    // Handle connection errors
    io.engine.on("connection_error", (err) => {
        console.error("🔥 Socket.IO ENGINE connection error:", err);
        console.error("🔥 Error code:", err.code);
        console.error("🔥 Error message:", err.message);
        console.error("🔥 Error context:", err.context);
    });

    io.on("connection", (socket) => {
        console.log(
            `✅ User ${socket.user.username} connected with socket ID: ${socket.id}`
        );

        // Add user to connected users map with socket reference
        connectedUsers.set(socket.user.id, {
            id: socket.user.id,
            username: socket.user.username,
            firstName: socket.user.firstName,
            lastName: socket.user.lastName,
            email: socket.user.email,
            location: socket.user.location,
            socketId: socket.id,
            socket: socket, // Store socket reference for forced logout
            connectedAt: new Date(),
            admin: socket.user.admin,
            office_admin: socket.user.office_admin,
        });

        // Join room based on user location
        if (socket.user.location) {
            socket.join(`location_${socket.user.location}`);
            console.log(
                `🏠 User ${socket.user.username} joined location room: location_${socket.user.location}`
            );
        }

        // Handle user disconnect
        socket.on("disconnect", (reason) => {
            console.log(
                `👋 User ${socket.user.username} disconnected. Reason: ${reason}`
            );
            // Remove user from connected users map
            connectedUsers.delete(socket.user.id);
        });

        // Handle errors
        socket.on("error", (error) => {
            console.error("🔥 Socket error:", error);
        });
    });
};

// Export function to get connected users (without socket references for security)
const getConnectedUsers = () => {
    return Array.from(connectedUsers.values()).map((user) => ({
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        location: user.location,
        socketId: user.socketId,
        connectedAt: user.connectedAt,
        admin: user.admin,
        office_admin: user.office_admin,
    }));
};

// Function to force logout a specific user
const forceLogoutUser = (userId, reason = "Admin action") => {
    const connectedUser = connectedUsers.get(userId);

    if (!connectedUser) {
        return { success: false, message: "User not connected" };
    }

    try {
        console.log(
            `🚪 Force logging out user ${connectedUser.username} (ID: ${userId}). Reason: ${reason}`
        );

        // Send force logout message to the client
        connectedUser.socket.emit("force_logout", {
            reason: reason,
            timestamp: new Date(),
            by: "admin",
        });

        // Disconnect the socket after a brief delay to ensure message is sent
        setTimeout(() => {
            if (connectedUser.socket.connected) {
                connectedUser.socket.disconnect(true);
            }
        }, 500);

        // Remove from connected users
        connectedUsers.delete(userId);

        return {
            success: true,
            message: `User ${connectedUser.username} has been logged out`,
            user: {
                id: connectedUser.id,
                username: connectedUser.username,
                socketId: connectedUser.socketId,
            },
        };
    } catch (error) {
        console.error("❌ Error forcing logout:", error);
        return {
            success: false,
            message: "Error during forced logout",
            error: error.message,
        };
    }
};

module.exports = { handleSocketConnection, getConnectedUsers, forceLogoutUser };
