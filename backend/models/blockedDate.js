const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');


const BlockedDate = sequelize.define('BlockedDate', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    room_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    start_time: {
        type: DataTypes.DATE,
        allowNull: false
    },
    end_time: {
        type: DataTypes.DATE,
        allowNull: false
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    repeats: {
        type: DataTypes.STRING,
        allowNull: true
    },
    created_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW // Set default value
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW // Set default value
    }
}, {
    tableName: 'MeetMate-BlockedDates',
    timestamps: true
});

module.exports = BlockedDate;