const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const EquipmentFile = sequelize.define(
    "EquipmentFile",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        equipment_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "Equipment-Items",
                key: "id",
            },
        },
        file_path: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        file_name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        file_type: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        category: {
            type: DataTypes.STRING,
            defaultValue: "other",
            allowNull: false,
            // Allowed values: 'manual', 'calibration_cert', 'photo', 'other'
            // Changed from ENUM to STRING to avoid SQL Server issues
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        uploaded_by_user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: "Rooms-Users",
                key: "id",
            },
        },
        calibration_date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        upload_date: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        created_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: "Rooms-Users",
                key: "id",
            },
        },
        updated_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: "Rooms-Users",
                key: "id",
            },
        },
    },
    {
        tableName: "Equipment-Files",
        timestamps: true,
    },
);

module.exports = EquipmentFile;
