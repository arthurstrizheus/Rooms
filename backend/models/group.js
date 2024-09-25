const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');


const Group = sequelize.define('Group', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    group_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    access: {
        type: DataTypes.STRING,
        allowNull: false
    },
    location: {
        type: DataTypes.INTEGER,
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
    tableName: 'Rooms-Groups',
    timestamps: true
});

module.exports = Group;