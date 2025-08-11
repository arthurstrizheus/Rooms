const jwt = require("jsonwebtoken");
const { User } = require("../models");

const socketAuth = async (socket, next) => {
    try {
        const token =
            socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
            return next(new Error("Authentication error"));
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "secret-key"
        );
        const user = await User.findByPk(decoded.id);

        if (!user) {
            return next(new Error("User not found"));
        }

        socket.user = {
            id: user.id,
            email: user.email,
            username: user.username,
            admin: user?.admin,
            first_name: user.first_name,
            last_name: user.last_name,
            location: user.location,
            active: user.active,
        };
        console.log(
            "✅ Socket authentication successful with user",
            socket.user.username
        );
        next();
    } catch (error) {
        console.error("❌ Socket authentication failed:", error);
        next(new Error("Authentication error"));
    }
};

module.exports = { socketAuth };
