const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Checkout = sequelize.define(
    "Checkout",
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
            allowNull: false,
            references: {
                model: "Rooms-Users",
                key: "id",
            },
        },
        start_time: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        end_time: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM(
                "pending",
                "approved",
                "reserved",
                "cancelled",
            ),
            defaultValue: "approved",
            allowNull: false,
        },
        approved_by_user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: "Rooms-Users",
                key: "id",
            },
        },
        approval_notes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        approved_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        recurrence_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: "Equipment-CheckoutRecurrences",
                key: "id",
            },
        },
        repeats: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        project_number: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        scheduled_on_behalf_of: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    },
    {
        tableName: "Equipment-Checkouts",
        timestamps: true,
    },
);

module.exports = Checkout;
