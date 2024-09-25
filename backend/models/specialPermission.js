const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SpecialPermission = sequelize.define('SpecialPermission', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Rooms-Users', // Name of the referenced model
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
    tableName: 'Rooms-SpecialPermissions',
    timestamps: true
});

module.exports = SpecialPermission;