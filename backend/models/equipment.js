const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Equipment = sequelize.define(
    "Equipment",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        serial_number: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        barcode: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        image: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        location: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        contact_person: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        contact_person_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM(
                "available",
                "reserved",
                "maintenance",
                "retired",
            ),
            defaultValue: "available",
            allowNull: false,
        },
        requires_approval: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        calibration_interval_value: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        calibration_interval_unit: {
            type: DataTypes.ENUM("days", "months", "years"),
            allowNull: true,
        },
        last_calibration_date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        tableName: "Equipment-Items",
        timestamps: true,
    },
);

module.exports = Equipment;
