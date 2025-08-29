let ioInstance = null;

// Initialize the io instance
const setSocketInstance = (io) => {
    ioInstance = io;
};

// Flexible message sender.
// Usage patterns:
//   SendMessage({ message, data }, 12)                       -> send to location 12
//   SendMessage({ message, data }, { location: 12 })         -> same
//   SendMessage({ message, data }, { userIds: [1,2] })       -> direct to users if connected
//   SendMessage({ message, data }, { userId: 5 })            -> direct single user
//   SendMessage({ message, data }, { emails: ["a@b.com"] }) -> direct by email match if connected
//   SendMessage({ message, data }, { userIds: [1], location: 3 }) -> both
const SendMessage = (messagePayload, target) => {
    if (!ioInstance) {
        console.error("Socket.IO instance not initialized");
        return false;
    }
    try {
        const { data = {}, message } = messagePayload || {};
        if (!message) {
            console.error("Message is required in messagePayload");
            return false;
        }

        // Normalize target options
        let opts = {};
        if (target == null) {
            opts = {};
        } else if (typeof target === "number" || typeof target === "string") {
            // Treat pure number as location; string could be user email if contains '@'
            if (typeof target === "number" || /^\d+$/.test(target)) {
                opts.location = Number(target);
            } else if (typeof target === "string" && target.includes("@")) {
                opts.emails = [target.toLowerCase()];
            }
        } else if (Array.isArray(target)) {
            // Assume array of userIds
            opts.userIds = target;
        } else if (typeof target === "object") {
            opts = { ...target };
        }

        const { location, userId, userIds, emails } = opts;
        const directIds = new Set();

        // Gather connected users (import lazily to avoid circular refs)
        const { getConnectedUsers } = require("../sockets/socketHandler");
        const connected = getConnectedUsers(); // sanitized list includes socketId

        if (userId != null) directIds.add(Number(userId));
        if (Array.isArray(userIds))
            userIds.forEach((id) => directIds.add(Number(id)));
        if (Array.isArray(emails) && emails.length) {
            const lowerEmails = emails.map((e) => e.toLowerCase());
            connected
                .filter((u) =>
                    lowerEmails.includes((u.email || "").toLowerCase())
                )
                .forEach((u) => directIds.add(u.id));
        }

        const payload = {
            message,
            data,
            timestamp: new Date().toISOString(),
        };

        let delivered = 0;

        // Location room
        if (location != null) {
            ioInstance.to(`location_${location}`).emit("message", payload);
            delivered++;
            console.log(`Message '${message}' sent to location ${location}`);
        }

        // Direct sockets
        if (directIds.size) {
            const directSockets = connected.filter((u) => directIds.has(u.id));
            directSockets.forEach((u) => {
                ioInstance.to(u.socketId).emit("message", payload);
                delivered++;
            });
            if (directSockets.length) {
                console.log(
                    `Message '${message}' sent directly to userIds: ${directSockets
                        .map((u) => u.id)
                        .join(",")}`
                );
            }
        }

        if (!delivered) {
            console.warn(
                `SendMessage: no delivery targets resolved for message '${message}'`
            );
            return false;
        }
        return true;
    } catch (error) {
        console.error("Error sending message:", error);
        return false;
    }
};

// Target office (location) plus all admin users regardless of location
const SendOfficeAndAdmins = (messagePayload, location, adminSocketIds = []) => {
    if (!ioInstance) {
        console.error("Socket.IO instance not initialized");
        return false;
    }
    try {
        const { data = {}, message } = messagePayload;
        if (!message) {
            console.error("Message is required in messagePayload");
            return false;
        }
        const payload = {
            message,
            data,
            timestamp: new Date().toISOString(),
        };
        if (location) {
            ioInstance.to(`location_${location}`).emit("message", payload);
            console.log(
                `Message sent to office location ${location}:`,
                message
            );
        }
        adminSocketIds.forEach((sid) => {
            ioInstance.to(sid).emit("message", payload);
        });
        return true;
    } catch (error) {
        console.error("Error sending office/admin message:", error);
        return false;
    }
};

module.exports = {
    setSocketInstance,
    SendMessage,
    SendOfficeAndAdmins,
};
