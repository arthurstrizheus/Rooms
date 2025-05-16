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
    await fs.appendFile(absoluteLogPath, errorMessage, { encoding: "utf8" });

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
    await fs.appendFile(absoluteLogPath, errorMessage, { encoding: "utf8" });
  } catch (fileError) {
    // If logging to file fails, log to console as fallback
    console.error("Failed to write emailLog to log file:", fileError);
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

module.exports = { logErrorToFile, logMsgToFile };
