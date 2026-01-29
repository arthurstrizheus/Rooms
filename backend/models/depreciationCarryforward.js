const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const DepreciationCarryforward = sequelize.define(
    "DepreciationCarryforward",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        asset_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "Equipment-Items",
                key: "id",
            },
            onDelete: "CASCADE",
        },
        jurisdiction: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        tax_type: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        originating_tax_year: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        schedule_json: {
            type: DataTypes.TEXT,
            allowNull: true,
            get() {
                const rawValue = this.getDataValue("schedule_json");
                return rawValue ? JSON.parse(rawValue) : null;
            },
            set(value) {
                this.setDataValue(
                    "schedule_json",
                    value ? JSON.stringify(value) : null,
                );
            },
        },
    },
    {
        tableName: "Equipment-DepreciationCarryforwards",
        timestamps: true,
        indexes: [
            {
                fields: ["asset_id", "jurisdiction", "tax_type"],
            },
        ],
    },
);

module.exports = DepreciationCarryforward;
