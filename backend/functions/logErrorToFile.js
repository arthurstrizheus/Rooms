const fs = require("fs").promises; // Using promises version for async/await
const path = require("path");

/**
 * Logs an error to a specified log file with timestamp and error details
 * @param {Error|string} error - The error object or error message to log
 * @param {string} [logFilePath] - Optional custom path for the log file
 * @returns {Promise<void>} - Resolves when the error is logged successfully
 */
async function logErrorToFile(error, logFilePath = "error.log") {
    try {
        // Ensure the log file path is absolute
        const absoluteLogPath = path.resolve(__dirname, logFilePath);

        // Format the current timestamp
        const timestamp = new Date().toISOString();

        // Prepare the error message
        let errorMessage;
        if (error instanceof Error) {
            // If it's an Error object, include stack trace and details
            errorMessage = `
[${timestamp}] ERROR:
  Message: ${error.message}
  Stack: ${error.stack}
  Code: ${error.code || "N/A"}
----------------------------------------`;
        } else {
            // If it's a string or other type, log it directly
            errorMessage = `
[${timestamp}] ERROR:
  Message: ${String(error)}
----------------------------------------`;
        }

        // Append the error to the log file
        await fs.appendFile(absoluteLogPath, errorMessage, {
            encoding: "utf8",
        });

        // Optional: Log to console as well for immediate visibility
        console.error(`Error logged to ${absoluteLogPath}:`, error);
    } catch (fileError) {
        // If logging to file fails, log to console as fallback
        console.error("Failed to write error to log file:", fileError);
        console.error("Original error:", error);
    }
}

/**
 * Logs when the proccess for emails is ran
 * @param {Error|string} msg - The error object or error message to log
 * @param {string} [logFilePath] - Optional custom path for the log file
 * @returns {Promise<void>} - Resolves when the error is logged successfully
 */
async function logMsgToFile(msg, logFilePath = "EmailLog.log") {
    try {
        // Ensure the log file path is absolute
        const absoluteLogPath = path.resolve(__dirname, logFilePath);

        // Format the current timestamp
        const timestamp = new Date().toISOString();

        // If it's a string or other type, log it directly
        errorMessage = `
[${timestamp}] Monthly Email Process:
  Message: ${String(msg)}
----------------------------------------`;

        // Append the error to the log file
        await fs.appendFile(absoluteLogPath, errorMessage, {
            encoding: "utf8",
        });
    } catch (fileError) {
        // If logging to file fails, log to console as fallback
        console.error("Failed to write emailLog to log file:", fileError);
    }
}

/**
 * Logs email sending attempts (success and failure)
 * @param {object} params - Logging parameters
 * @param {string} params.to - Recipient email address(es)
 * @param {string} params.subject - Email subject
 * @param {string} params.status - 'SUCCESS' or 'FAILED'
 * @param {string} [params.error] - Error message if failed
 * @param {object} [params.info] - Additional info from nodemailer
 * @param {string} [logFilePath] - Optional custom path for the log file
 * @returns {Promise<void>}
 */
async function logEmailToFile(
    { to, subject, status, error, info },
    logFilePath = "email.log",
) {
    try {
        const absoluteLogPath = path.resolve(__dirname, logFilePath);
        const timestamp = new Date().toISOString();

        let logMessage = `
[${timestamp}] ${status}
  To: ${to}
  Subject: ${subject}`;

        if (status === "SUCCESS" && info) {
            logMessage += `
  MessageId: ${info.messageId || "N/A"}
  Response: ${info.response || "N/A"}`;
        } else if (status === "FAILED" && error) {
            logMessage += `
  Error: ${error}`;
        }

        logMessage += `
----------------------------------------`;

        await fs.appendFile(absoluteLogPath, logMessage, { encoding: "utf8" });
        console.log(`Email ${status}: ${to} - ${subject}`);
    } catch (fileError) {
        console.error("Failed to write email log to file:", fileError);
    }
}

// Example usage:
/*
async function example() {
  try {
    // Simulate an error
    throw new Error('Something went wrong!');
  } catch (error) {
    await logErrorToFile(error);
  }

  // Log a string error
  await logErrorToFile('Custom error message');

  // Log to a custom file path
  await logErrorToFile(new Error('Critical error'), 'logs/critical.log');
}

// Run the example
example().catch(console.error);
*/

module.exports = { logErrorToFile, logMsgToFile, logEmailToFile };
