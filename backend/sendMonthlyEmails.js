const {
    getAllFullOUAssociates,
} = require("./controllers/matterManagerController");

// Early diagnostics so scheduled-task logs show Node started
console.log("sendMonthlyEmails START", new Date().toISOString());
console.log("sendMonthlyEmails CWD=", process.cwd());
console.log("sendMonthlyEmails LDAP_URL is set?", !!process.env.LDAP_URL);

// Call the function
getAllFullOUAssociates()
    .then(() => {
        console.log("Monthly email task completed successfully.");
        process.exit(0);
    })
    .catch((err) => {
        console.error("Error executing monthly email task:", err);
        process.exit(1);
    });
