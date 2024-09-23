const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const GroupUser = sequelize.define('GroupUser', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    group_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'MeetMate-Groups', // Name of the referenced model
            key: 'id',       // Key in the referenced model
        },
        onDelete: 'CASCADE', // Enable cascade delete
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'MeetMate-Users', // Name of the referenced model
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
    tableName: 'MeetMate-GroupUsers',
    timestamps: true
});

module.exports = GroupUser;