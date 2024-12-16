// ldapConfig.js
module.exports = {
  url: process.env.LDAP_URL,
  baseDN: process.env.LDAP_BASE_DN,
  username: process.env.LDAP_USER,
  password: process.env.LDAP_PASS,
  tlsOptions: {
    //ca: [caCert],
    rejectUnauthorized: false, // Uncomment only if necessary
  },
};
