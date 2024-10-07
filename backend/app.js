const express = require("express");
const cors = require("cors"); // Import the cors middleware
require("dotenv").config({ path: "/src/.env" });
// const cors = require('cors');
const { sequelize, initModels } = require("./models");
const blockedDatesRouter = require("./routes/blockedDates");
const groupUsersRouter = require("./routes/groupUsers");
const groupsRouter = require("./routes/groups");
const meetingGroupsRouter = require("./routes/meetingGroups");
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

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "https://roomsync-badb9.web.app",
  "https://room-sync.arthurstrizheus.com",
  "https://rooms-sync-4f68d.web.app",
  "http://room-sync.arthurstrizheus.com",
  // Add more origins as needed
];

const corsOptions = {
  origin: function (origin, callback) {
    console.log("Origin:", origin);
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  // Other options...
};
// Use the cors middleware with the specified options
app.use(cors(corsOptions));

// Add this line to ensure preflight requests (OPTIONS) are handled:
app.options("*", cors(corsOptions));

app.use(express.json());
app.use("/api/blockeddates", blockedDatesRouter);
app.use("/api/groupusers", groupUsersRouter);
app.use("/api/groups", groupsRouter);
app.use("/api/meetinggroups", meetingGroupsRouter);
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
app.use("/api/offices", officeRouter);

// TODO require authentication
// const retryOptions = { maxRetries: 3, delay: 100 }; // Customize retry options as needed

const retryOptions = { maxRetries: 5, retryDelay: 1000 }; // Retry 5 times, 1 second delay between attempts

const retryTransaction = async (operation) => {
  let attempt = 0;
  while (attempt < retryOptions.maxRetries) {
    try {
      await operation();
      break; // If it succeeds, break out of loop
    } catch (error) {
      if (error.parent && error.parent.number === 1205) {
        // Deadlock error
        attempt++;
        console.log(`Retrying transaction... Attempt ${attempt}`);
        await new Promise((resolve) =>
          setTimeout(resolve, retryOptions.retryDelay)
        );
      } else {
        throw error; // If it's not a deadlock, rethrow the error
      }
    }
  }
};

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected...");

    initModels(); // Initialize models and associations

    // Sync all models in the database
    await sequelize.sync({ alter: true }); // Use 'force: true' if you want to drop and recreate tables

    const port = 5321; // Default to 5321
    // Add this route to handle GET requests to '/'
    app.get("/", (req, res) => {
      res.send("Hello from Rooms API!");
    });
    app.listen(port, "0.0.0.0", () =>
      console.log(`Server running on port ${port}`)
    );
  } catch (err) {
    console.error("Unable to connect to the database:", err);
  }
};

startServer();
