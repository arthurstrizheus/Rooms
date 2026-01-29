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
        vehicle_class: {
            type: DataTypes.STRING(32),
            allowNull: false,
            defaultValue: "UNKNOWN",
            validate: {
                isIn: [
                    [
                        "UNKNOWN",
                        "PASSENGER_AUTO",
                        "SUV_LIMITED_179",
                        "HEAVY_TRUCK_NOT_LIMITED_179",
                    ],
                ],
            },
        },
        requires_manual_confirmation: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        validation_warnings_json: {
            type: DataTypes.TEXT,
            allowNull: true,
            get() {
                const raw = this.getDataValue("validation_warnings_json");
                return raw ? JSON.parse(raw) : null;
            },
            set(value) {
                this.setDataValue(
                    "validation_warnings_json",
                    value ? JSON.stringify(value) : null,
                );
            },
        },
        convention: {
            type: DataTypes.STRING(20),
            allowNull: true,
            defaultValue: "half-year",
            validate: {
                isIn: [["half-year", "mid-quarter", "mid-month"]],
            },
        },
        disposal_date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        sale_proceeds: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        disposal_method: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        property_type: {
            type: DataTypes.STRING(20),
            allowNull: true,
            defaultValue: "personal_property",
            validate: {
                isIn: [["personal_property", "real_property"]],
            },
        },
    },
    {
        tableName: "Equipment-AssetTaxMeta",
        timestamps: true,
    },
);

module.exports = AssetTaxMeta;
