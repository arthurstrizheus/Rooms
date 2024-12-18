// ldapConfig.js
const fs = require("fs");
const caCert = fs.readFileSync("./ca.pem");
module.exports = {
  url: process.env.LDAP_URL,
  baseDN: process.env.LDAP_BASE_DN,
  username: process.env.LDAP_USER,
  password: process.env.LDAP_PASS,
  tlsOptions: {
    ca: [caCert],
    rejectUnauthorized: true, // Uncomment only if necessary
  },
};
