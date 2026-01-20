const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const EquipmentAlert = sequelize.define(
    "EquipmentAlert",
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
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: "Rooms-Users",
                key: "id",
            },
        },
        alert_type: {
            type: DataTypes.ENUM(
                "equipment_returned",
                "equipment_available",
                "calibration_due",
                "status_change"
            ),
            allowNull: false,
        },
        enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        notification_days_before: {
            type: DataTypes.INTEGER,
            defaultValue: 7,
        },
    },
    {
        tableName: "Equipment-Alerts",
        timestamps: true,
    }
);

module.exports = EquipmentAlert;
