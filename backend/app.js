const express = require("express");
const path = require("path");
const fs = require("fs");
require("dotenv").config(); // Must be at the top of the file
const bodyParser = require("body-parser");
const http = require("http");
const socketIo = require("socket.io");
// const cors = require('cors');
const {
    sequelize,
    initModels,
    Office,
    BlockedDate,
    GroupUser,
    Group,
    Meeting,
    Resource,
    RoomGroup,
    RoomResource,
    Room,
    Type,
    User,
    MeetingRecurrence,
    SpecialPermission,
} = require("./models");
const { authenticateUser } = require("./middleware/auth");
const connectedUsersRoutes = require("./routes/connectedUsers");
const { handleSocketConnection } = require("./sockets/socketHandler");
const { setSocketInstance } = require("./utils/socketUtils");
const blockedDatesRouter = require("./routes/blockedDates");
const groupUsersRouter = require("./routes/groupUsers");
const groupsRouter = require("./routes/groups");
const meetingsRouter = require("./routes/meetings");
const resourcesRouter = require("./routes/resources");
const roomGroupsRouter = require("./routes/roomGroups");
const roomResourcesRouter = require("./routes/roomResources");
const roomsRouter = require("./routes/rooms");
const typesRouter = require("./routes/types");
const usersRouter = require("./routes/users");
const officeRouter = require("./routes/offices");
const specialPermissionsRouter = require("./routes/specialPermissions");
const recurrenceRouter = require("./routes/meetingrecurrences");
const matterManagerRoutes = require("./routes/matterManagerRoutes");
const zscalerRouter = require("./routes/zscaler");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: [
            "http://localhost:3000", // Development
            "https://rooms.sealimited.com", // Production
            "http://rooms.sealimited.com", // Production fallback
        ],
        methods: ["GET", "POST"],
        credentials: true,
    },
    transports: ["websocket", "polling"],
    allowEIO3: true,
});

// Make io available to routes and initialize socket utilities
app.set("io", io);
setSocketInstance(io);

// Ensure the uploads directory exists
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log("Uploads directory created.");
}

app.use(bodyParser.json());
app.use(express.json());

// Add authentication middleware globally
app.use(authenticateUser);

// Serve static files from the uploads directory
app.use("/uploads", express.static(uploadsDir));
app.use("/api/connected-users", connectedUsersRoutes);
app.use("/api/mattermanager", matterManagerRoutes);
app.use("/api/blockeddates", blockedDatesRouter);
app.use("/api/groupusers", groupUsersRouter);
app.use("/api/groups", groupsRouter);
app.use("/api/meetings", meetingsRouter);
app.use("/api/resources", resourcesRouter);
app.use("/api/roomgroups", roomGroupsRouter);
app.use("/api/roomresources", roomResourcesRouter);
app.use("/api/rooms", roomsRouter);
app.use("/api/types", typesRouter);
app.use("/api/users", usersRouter);
app.use("/api/locations", officeRouter);
app.use("/api/recurrences", recurrenceRouter);
app.use("/api/specialpermissions", specialPermissionsRouter);
app.use("/api/zscaler", zscalerRouter);

// Initialize WebSocket handlers
handleSocketConnection(io);

const startServer = async () => {
    try {
        await sequelize.authenticate();
        console.log("Database connecting...");
        app.use(express.json());

        initModels(); // Initialize models and associations
        const models = [
            "BlockedDate",
            "GroupUser",
            "Group",
            "Meeting",
            "Resource",
            "RoomGroup",
            "RoomResource",
            "Room",
            "Type",
            "User",
            "MeetingRecurrence",
            "SpecialPermission",
        ];
        // Debugging to identify undefined models
        const modelsToSync = [
            BlockedDate,
            GroupUser,
            Group,
            Meeting,
            Resource,
            RoomGroup,
            RoomResource,
            Room,
            Type,
            User,
            MeetingRecurrence,
            SpecialPermission,
            // Add more models if needed
        ];

        modelsToSync.forEach((model, index) => {
            if (!model) {
                console.error(`Model at index ${index} is undefined`);
            } else {
                console.log(`Synced Model ${models[index]}`);
            }
        });

        // Synchronize all models except Office
        await Promise.all(
            modelsToSync?.map((model) => model.sync({ alter: false }))
        );

        const port = process.env.PORT || 5000; // Default to 3000 if PORT is not set
        server.listen(port, () => {
            console.log(`Server running on port ${port}`);
            console.log(`WebSocket server initialized`);
        });
    } catch (err) {
        console.error("Unable to connect to the database:", err);
    }
};

// Error-handling middleware (must be the last middleware)
app.use(errorHandler);

startServer();
