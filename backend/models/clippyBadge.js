const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

/**
 * A Clippy rage badge held by a user. One row per (user, badge) — the unique
 * index that enforces that is created by
 * `backend/migrations/add-clippy-badges-table.js`, NOT by sync (the app boots
 * with `alter: false`).
 *
 * `clicks` is the user's personal best for this tier, not the most recent count.
 */
const ClippyBadge = sequelize.define(
    "ClippyBadge",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "Rooms-Users",
                key: "id",
            },
            onDelete: "CASCADE",
        },
        badge_key: {
            type: DataTypes.STRING(40),
            allowNull: false,
        },
        clicks: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: DataTypes.NOW,
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        tableName: "Rooms-ClippyBadges",
        timestamps: true,
    }
);

module.exports = ClippyBadge;
