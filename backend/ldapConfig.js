// ldapConfig.js
const fs = require("fs");
const path = require("path");

// Helper: normalize env vars (trim whitespace and surrounding quotes)
const normalize = (v) => {
    if (v === undefined || v === null) return undefined;
    return String(v)
        .trim()
        .replace(/^['"]|['"]$/g, "");
};

// Allow override via environment variable for flexibility in scheduled tasks
const caPath =
    normalize(process.env.LDAP_CA_PATH) || path.join(__dirname, "ca.pem");

let caCert;
try {
    caCert = fs.readFileSync(caPath);
} catch (err) {
    // Emit a clear, actionable error so logs show what's missing
    const msg = `Failed to load LDAP CA file at "${caPath}". Ensure the file exists and the scheduled task user has read permission.`;
    // Print to stderr to ensure Task Scheduler logs capture it
    console.error(msg);
    throw new Error(msg + "\n" + err.message);
}

module.exports = {
    url: normalize(process.env.LDAP_URL),
    baseDN: normalize(process.env.LDAP_BASE_DN),
    username: normalize(process.env.LDAP_USER),
    password: normalize(process.env.LDAP_PASS),
    tlsOptions: {
        ca: [caCert],
        rejectUnauthorized: true, // Uncomment only if necessary
    },
};
