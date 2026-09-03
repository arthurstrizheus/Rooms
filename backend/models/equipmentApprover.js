const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

/**
 * Who may approve reservations of a given piece of equipment.
 *
 * Only consulted when `Equipment-Items.requires_approval` is set. An approver
 * is either a named person or an Active Directory group; a group is stored
 * rather than expanded so that changes to its membership in AD take effect
 * immediately, with nothing here to re-sync.
 *
 * A piece of equipment may have several rows — any one of them approving is
 * enough. Equipment with `requires_approval` set and no rows here falls back to
 * the administrators, so turning the flag on can never strand a reservation
 * with nobody able to act on it.
 */
const EquipmentApprover = sequelize.define(
    "EquipmentApprover",
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
        approver_type: {
            type: DataTypes.ENUM("user", "ad_group"),
            allowNull: false,
        },
        // Set when approver_type is "user".
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: "Rooms-Users",
                key: "id",
            },
        },
        // Set when approver_type is "ad_group". The name is what people read;
        // the DN is what AD is actually queried by, because a group can be
        // renamed without its distinguished name changing.
        ad_group_name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        ad_group_dn: {
            type: DataTypes.STRING(512),
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
        tableName: "Equipment-Approvers",
        timestamps: true,
        underscored: false, // Use camelCase for createdAt/updatedAt
    },
);

module.exports = EquipmentApprover;
