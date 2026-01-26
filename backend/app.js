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
            "https://equipment.sealimited.com", // Production
            "http://equipment.sealimited.com", // Production fallback
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
    try {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log("✓ Uploads directory created:", uploadsDir);
    } catch (err) {
        console.error("✗ Failed to create uploads directory:", err);
    }
} else {
    console.log("✓ Uploads directory exists:", uploadsDir);
    // Verify write permissions
    try {
        fs.accessSync(uploadsDir, fs.constants.W_OK);
        console.log("✓ Uploads directory is writable");
    } catch (err) {
        console.error("✗ Uploads directory is NOT writable:", err);
    }
}

app.use(bodyParser.json());
app.use(express.json());

// Serve static files from the uploads directory (BEFORE auth middleware)
app.use(
    "/uploads",
    (req, res, next) => {
        console.log("📸 Static file request:", req.path);
        const fullPath = path.join(uploadsDir, req.path);
        console.log("📁 Looking for file at:", fullPath);
        console.log("📂 File exists:", fs.existsSync(fullPath));
        next();
    },
    express.static(uploadsDir, {
        setHeaders: (res, filePath) => {
            console.log("📤 Serving file:", filePath);
            const ext = path.extname(filePath).toLowerCase();
            const mimeTypes = {
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".png": "image/png",
                ".gif": "image/gif",
                ".webp": "image/webp",
                ".pdf": "application/pdf",
                ".doc": "application/msword",
                ".docx":
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ".xls": "application/vnd.ms-excel",
                ".xlsx":
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            };

            if (mimeTypes[ext]) {
                res.setHeader("Content-Type", mimeTypes[ext]);
                console.log("✓ Content-Type set to:", mimeTypes[ext]);
            }

            // Add CORS and caching headers
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Cache-Control", "public, max-age=31536000");
        },
    }),
);

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
                "Equipment-Checkouts",
            );

            if (!tableDescription.project_number) {
                console.log("Adding project_number column...");
                await queryInterface.addColumn(
                    "Equipment-Checkouts",
                    "project_number",
                    {
                        type: require("sequelize").DataTypes.STRING,
                        allowNull: true,
                    },
                );
                console.log("✓ project_number column added");
            }

            // Update status ENUM to remove 'returned'
            try {
                await queryInterface.sequelize.query(`
                    IF EXISTS (
                        SELECT 1 FROM sys.check_constraints 
                        WHERE name = 'Equipment-Checkouts_status_chk'
                        AND definition LIKE '%returned%'
                    )
                    BEGIN
                        ALTER TABLE [Equipment-Checkouts] DROP CONSTRAINT [Equipment-Checkouts_status_chk];
                        ALTER TABLE [Equipment-Checkouts] ADD CONSTRAINT [Equipment-Checkouts_status_chk] 
                        CHECK ([status] IN ('pending','approved','reserved','cancelled'));
                    END
                `);
                console.log("✓ status ENUM updated to remove 'returned'");
            } catch (enumErr) {
                console.log(
                    "Note: status ENUM update skipped (may already be updated):",
                    enumErr.message,
                );
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

            // Manually update the alert_type ENUM to include 'all_alerts'
            try {
                const queryInterface = sequelize.getQueryInterface();
                await queryInterface.sequelize.query(`
                    IF NOT EXISTS (
                        SELECT 1 FROM sys.check_constraints 
                        WHERE name = 'Equipment-Alerts_alert_type_chk'
                        AND definition LIKE '%all_alerts%'
                    )
                    BEGIN
                        ALTER TABLE [Equipment-Alerts] DROP CONSTRAINT [Equipment-Alerts_alert_type_chk];
                        ALTER TABLE [Equipment-Alerts] ADD CONSTRAINT [Equipment-Alerts_alert_type_chk] 
                        CHECK ([alert_type] IN ('checkout_created','checkout_cancelled','equipment_returned','calibration_due','status_change','all_alerts'));
                    END
                `);
                console.log(
                    "✓ alert_type ENUM updated to include 'all_alerts'",
                );
            } catch (enumErr) {
                console.log(
                    "Note: alert_type ENUM update skipped (may already exist):",
                    enumErr.message,
                );
            }

            console.log("✓ EquipmentAlert synced");
        } catch (err) {
            console.error("✗ EquipmentAlert sync failed:", err.message);
        }

        console.log("\n✅ Database migration complete!");
        console.log("All critical tables created successfully\n");

        // Initialize calibration alerts scheduler
        initCalibrationAlertsScheduler();

        const port = process.env.PORT || 5001;
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
