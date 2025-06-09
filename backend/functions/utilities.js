function isUserDev(userId) {
  return process.env.DEV_IDS.split(",").includes(userId);
}

function devMode() {
  return process.env.DEV_MODE;
}

module.exports = { isUserDev, devMode };
