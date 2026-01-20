const express = require("express");
const path = require("path");
const fs = require("fs");
require("dotenv").config(); // Must be at the top of the file
const bodyParser = require("body-parser");
const http = require("http");
const socketIo = require("socket.io");
const {
    sequelize,
    initModels,
    User,
    Equipment,
    Checkout,
    EquipmentFile,
    EquipmentAlert,
    CalibrationHistory,
    CheckoutRecurrence,
} = require("./models");
const { authenticateUser } = require("./middleware/auth");
const connectedUsersRoutes = require("./routes/connectedUsers");
const { handleSocketConnection } = require("./sockets/socketHandler");
const { setSocketInstance } = require("./utils/socketUtils");
const equipmentRouter = require("./routes/equipment");
const checkoutsRouter = require("./routes/checkouts");
const equipmentFilesRouter = require("./routes/equipmentFiles");
const calibrationsRouter = require("./routes/calibrations");
const checkoutRecurrencesRouter = require("./routes/checkoutRecurrences");
const equipmentAlertsRouter = require("./routes/equipmentAlerts");
const calibrationAlertsRouter = require("./routes/calibrationAlerts");
const usersRouter = require("./routes/users");
const officeRouter = require("./routes/offices");
const errorHandler = require("./middleware/errorHandler");
const { initCalibrationAlertsScheduler } = require("./jobs/calibrationAlerts");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: [
            "http://localhost:3000", // Development
            "https://equiptment.sealimited.com", // Production
            "http://equiptment.sealimited.com", // Production fallback
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

// Serve static files from the uploads directory (BEFORE auth middleware)
app.use("/uploads", express.static(uploadsDir));

// Add authentication middleware globally
app.use(authenticateUser);
app.use("/api/connected-users", connectedUsersRoutes);
app.use("/api/equipment", equipmentRouter);
app.use("/api/checkouts", checkoutsRouter);
app.use("/api/equipment-files", equipmentFilesRouter);
app.use("/api/calibrations", calibrationsRouter);
app.use("/api/checkout-recurrences", checkoutRecurrencesRouter);
app.use("/api/equipment-alerts", equipmentAlertsRouter);
app.use("/api/calibration-alerts", calibrationAlertsRouter);
app.use("/api/users", usersRouter);
app.use("/api/locations", officeRouter);

// Initialize WebSocket handlers
handleSocketConnection(io);

const startServer = async () => {
    try {
        await sequelize.authenticate();
        console.log("Database connecting...");
        app.use(express.json());

        initModels(); // Initialize models and associations

        // Synchronize models in dependency order
        // Using { alter: false } to avoid CHECK constraint issues on existing tables
        try {
            console.log("Syncing User (Rooms-Users) - already exists");
            await User.sync({ alter: false });
            console.log("✓ User synced");
        } catch (err) {
            console.error("✗ User sync failed:", err.message);
        }

        try {
            console.log("Syncing Equipment");
            await Equipment.sync({ alter: false });
            console.log("✓ Equipment synced");
        } catch (err) {
            console.error("✗ Equipment sync failed:", err.message);
        }

        try {
            console.log("Syncing CheckoutRecurrence");
            await CheckoutRecurrence.sync({ alter: false });
            console.log("✓ CheckoutRecurrence synced");
        } catch (err) {
            console.error("✗ CheckoutRecurrence sync failed:", err.message);
        }

        try {
            console.log("Syncing Checkout");
            // First try without alter to see if table exists
            await Checkout.sync({ alter: false });

            // Then manually add the project_number column if it doesn't exist
            const queryInterface = sequelize.getQueryInterface();
            const tableDescription = await queryInterface.describeTable(
                "Equipment-Checkouts"
            );

            if (!tableDescription.project_number) {
                console.log("Adding project_number column...");
                await queryInterface.addColumn(
                    "Equipment-Checkouts",
                    "project_number",
                    {
                        type: require("sequelize").DataTypes.STRING,
                        allowNull: true,
                    }
                );
                console.log("✓ project_number column added");
            }

            console.log("✓ Checkout synced");
        } catch (err) {
            console.error("✗ Checkout sync failed:", err.message);
        }

        try {
            console.log("Syncing CalibrationHistory");
            await CalibrationHistory.sync({ alter: false });
            console.log("✓ CalibrationHistory synced");
        } catch (err) {
            console.error("✗ CalibrationHistory sync failed:", err.message);
        }

        try {
            console.log("Syncing EquipmentFile");
            await EquipmentFile.sync({ alter: false });
            console.log("✓ EquipmentFile synced");
        } catch (err) {
            console.error("✗ EquipmentFile sync failed:", err.message);
        }

        try {
            console.log("Syncing EquipmentAlert");
            // Use alter: false to avoid CHECK constraint issues
            await EquipmentAlert.sync({ alter: false });
            console.log("✓ EquipmentAlert synced");
        } catch (err) {
            console.error("✗ EquipmentAlert sync failed:", err.message);
        }

        console.log("\n✅ Database migration complete!");
        console.log("All critical tables created successfully\n");

        // Initialize calibration alerts scheduler
        initCalibrationAlertsScheduler();

        const port = process.env.PORT || 5000;
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
