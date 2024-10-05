const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize("Rooms", "sa", "F+gzzc6Pks&m", {
  host: "192.168.1.200",
  dialect: "mssql",
  port: 7867,
  logging: false, // Disable SQL query logging in the console, you can enable it for debugging
  dialectOptions: {
    options: {
      encrypt: false,
      trustServerCertificate: true, // Necessary for self-signed certificates
    },
  },
});

async function connectToDatabase() {
  await sequelize.authenticate();
  console.log("Connected to SQL Server");
}

module.exports = {
  sequelize,
  connectToDatabase,
};
