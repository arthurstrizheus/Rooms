const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');


const Office = sequelize.define('Office', {
    officeid: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    City: {
        type: DataTypes.STRING,
        allowNull: false
    },
    Number: {
        type: DataTypes.STRING,
        allowNull: false
    },
    SAddress: {
        type: DataTypes.STRING,
        allowNull: false
    },
    state: {
        type: DataTypes.STRING,
        allowNull: false
    },
    Zip: {
        type: DataTypes.STRING,
        allowNull: false
    },
    Airport: {
        type: DataTypes.STRING,
        allowNull: false
    },
    Alias: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'Offices',
    timestamps: false,
    freezeTableName: true // Prevent sequelize from pluralizing table names
});

module.exports = Office;