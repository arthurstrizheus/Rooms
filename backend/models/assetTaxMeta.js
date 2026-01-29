const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const AssetTaxMeta = sequelize.define(
    "AssetTaxMeta",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        asset_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            references: {
                model: "Equipment-Items",
                key: "id",
            },
            onDelete: "CASCADE",
        },
        placed_in_service_date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        cost_basis: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        property_class: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        method: {
            type: DataTypes.ENUM("MACRS", "ADS"),
            allowNull: true,
            defaultValue: "MACRS",
        },
        bonus_eligible: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        section179_elected: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0,
        },
    },
    {
        tableName: "Equipment-AssetTaxMeta",
        timestamps: true,
    },
);

module.exports = AssetTaxMeta;
