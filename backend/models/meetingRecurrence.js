const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MeetingRecurrence = sequelize.define('MeetingRecurrence', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    meeting_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'Rooms-Meetings',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    frequency: {
        type: DataTypes.STRING,  // 'daily', 'weekly', 'monthly', etc.
        allowNull: false
    },
    repeat_until: {
        type: DataTypes.DATE,  // Null for infinite recurrences
        allowNull: true
    },
    active: {
        type: DataTypes.BOOLEAN,
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
    tableName: 'Rooms-MeetingRecurrences',
    timestamps: true
});

module.exports = MeetingRecurrence;