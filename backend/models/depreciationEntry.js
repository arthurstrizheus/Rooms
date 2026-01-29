const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const DepreciationEntry = sequelize.define(
    "DepreciationEntry",
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
        tax_year: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        tax_type: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        jurisdiction: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        detail_json: {
            type: DataTypes.TEXT,
            allowNull: true,
            get() {
                const rawValue = this.getDataValue("detail_json");
                return rawValue ? JSON.parse(rawValue) : null;
            },
            set(value) {
                this.setDataValue(
                    "detail_json",
                    value ? JSON.stringify(value) : null,
                );
            },
        },
    },
    {
        tableName: "Equipment-DepreciationEntries",
        timestamps: true,
        indexes: [
            {
                fields: ["asset_id", "tax_year", "tax_type", "jurisdiction"],
            },
        ],
    },
);

module.exports = DepreciationEntry;
