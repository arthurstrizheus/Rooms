const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const CalibrationHistory = sequelize.define(
    "CalibrationHistory",
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
        calibration_date: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        next_due_date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        performed_by_user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: "Rooms-Users",
                key: "id",
            },
        },
        certificate_file_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: "Equipment-Files",
                key: "id",
            },
            onDelete: "NO ACTION",
            onUpdate: "NO ACTION",
        },
        result: {
            type: DataTypes.STRING,
            allowNull: true,
            // Allowed values: 'pass', 'fail', 'conditional'
            // Validation removed to avoid SQL Server CHECK constraint issues
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
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
        tableName: "Equipment-CalibrationHistory",
        timestamps: true,
    },
);

module.exports = CalibrationHistory;
