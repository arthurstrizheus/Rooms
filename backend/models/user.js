const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const User = sequelize.define(
    "User",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        username: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        password: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        admin: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        office_admin: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        equipment_office_admin: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        equipment_admin: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
        },
        first_name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        last_name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        location: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        last_login: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        active: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        created_user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        updated_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: DataTypes.NOW, // Set default value
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: DataTypes.NOW, // Set default value
        },
    },
    {
        tableName: "Rooms-Users",
        timestamps: true,
    },
);

module.exports = User;
