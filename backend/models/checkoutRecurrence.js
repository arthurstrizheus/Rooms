const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const CheckoutRecurrence = sequelize.define(
    "CheckoutRecurrence",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        recurrence_pattern: {
            type: DataTypes.STRING,
            allowNull: false,
            // e.g., "daily", "weekly", "monthly"
        },
        separation_count: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            // e.g., every 2 weeks = 2
        },
        max_occurrences: {
            type: DataTypes.INTEGER,
            allowNull: true,
            // null means no limit
        },
        day_of_week: {
            type: DataTypes.INTEGER,
            allowNull: true,
            // 0 = Sunday, 1 = Monday, etc.
        },
        day_of_month: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        month_of_year: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        end_date: {
            type: DataTypes.DATE,
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
        tableName: "Equipment-CheckoutRecurrences",
        timestamps: true,
    },
);

module.exports = CheckoutRecurrence;
