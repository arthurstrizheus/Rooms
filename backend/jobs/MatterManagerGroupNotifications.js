const cron = require("node-cron");
const {
    getAllFullOUAssociates,
} = require("../controllers/matterManagerController");

/**
 * Sends monthly group membership notification emails to Matter Manager group owners
 * This runs on the first Monday of every month at 8:00 AM
 */
const sendMonthlyGroupNotifications = async () => {
    try {
        console.log(
            `[${new Date().toISOString()}] Running monthly Matter Manager group notifications...`,
        );

        // Create mock request and response objects for the controller function
        const mockReq = {};
        const mockRes = {
            status: (code) => ({
                json: (data) => {
                    console.log(`Response ${code}:`, data);
                    return mockRes;
                },
            }),
        };

        // Call the Matter Manager function
        await getAllFullOUAssociates(mockReq, mockRes);

        console.log(
            `Monthly group notifications process completed successfully.`,
        );
    } catch (error) {
        console.error("Error in sendMonthlyGroupNotifications:", error);
    }
};

/**
 * Initializes the Matter Manager group notifications scheduler
 * Runs on the first Monday of every month at 8:00 AM
 * Cron pattern: "0 8 1-7 * 1"
 * - 0 = minute 0
 * - 8 = 8:00 AM
 * - 1-7 = days 1-7 of the month
 * - * = every month
 * - 1 = Monday only
 */
const initMatterManagerScheduler = () => {
    // Run at 8:00 AM on the first Monday of every month
    cron.schedule("0 8 1-7 * 1", async () => {
        await sendMonthlyGroupNotifications();
    });

    console.log(
        "Matter Manager group notifications scheduler initialized (runs first Monday of every month at 8:00 AM)",
    );

    // Optional: Run once on startup for testing
    // setTimeout(() => sendMonthlyGroupNotifications(), 5000);
};

module.exports = {
    initMatterManagerScheduler,
    sendMonthlyGroupNotifications, // Export for manual testing
};
