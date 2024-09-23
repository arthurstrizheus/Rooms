const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_DATABASE, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_SERVER,
    dialect: 'mssql',
    port: parseInt(process.env.DB_PORT, 10),
    logging: false, // Disable SQL query logging in the console, you can enable it for debugging
    dialectOptions: {
        options: {
            encrypt: true,
            trustServerCertificate: true, // Necessary for self-signed certificates
        }
    }
});

async function connectToDatabase() {
    try {
        await sequelize.authenticate();
        console.log('Connected to SQL Server');
    } catch (err) {
        console.error('Database connection failed: ', err);
    }
}

module.exports = {
    sequelize,
    connectToDatabase,
};
