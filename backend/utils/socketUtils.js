let ioInstance = null;

// Initialize the io instance
const setSocketInstance = (io) => {
    ioInstance = io;
};

// Send message to users based on location or to all users
const SendMessage = (messagePayload, location = null) => {
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
            // Send to specific location
            ioInstance.to(`location_${location}`).emit("message", payload);
            console.log(`Message sent to location ${location}:`, message);
        } else {
            // Send to all connected users
            ioInstance.emit("message", payload);
            console.log("Message sent to all users:", message);
        }

        return true;
    } catch (error) {
        console.error("Error sending message:", error);
        return false;
    }
};

module.exports = {
    setSocketInstance,
    SendMessage,
};
