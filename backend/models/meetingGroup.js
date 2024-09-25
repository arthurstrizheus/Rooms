const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MeetingGroup = sequelize.define('MeetingGroup', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    group_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Rooms-Groups', // Name of the referenced model
            key: 'id',       // Key in the referenced model
        },
        onDelete: 'CASCADE', // Enable cascade delete
    },
    meeting_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Rooms-Meetings', // Name of the referenced model
            key: 'id',       // Key in the referenced model
        },
        onDelete: 'CASCADE', // Enable cascade delete
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
    tableName: 'Rooms-MeetingGroups',
    timestamps: true
});

module.exports = MeetingGroup;