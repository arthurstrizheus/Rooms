/**
 * Creates `Equipment-Approvers` — who may approve reservations of a given
 * piece of equipment, as either a named person or an Active Directory group.
 *
 *   node backend/migrations/add-equipment-approvers-table.js
 *
 * The app syncs models with `{ alter: false }` (see app.js), which DOES create
 * a table that doesn't exist yet — so on a fresh environment this migration is
 * belt and braces. It exists because `alter: false` will never add a column to
 * a table that already exists, so the moment this table needs changing, the
 * change has to come from here. Running it against a database that already has
 * the table is a no-op.
 *
 * Every statement is guarded, so this is safe to run repeatedly.
 */
const { sequelize, connectToDatabase } = require("../config/database");

async function run() {
    await connectToDatabase();

    await sequelize.query(`
        IF OBJECT_ID('[Equipment-Approvers]', 'U') IS NULL
        CREATE TABLE [Equipment-Approvers] (
            [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
            [equipment_id] INT NOT NULL,
            [approver_type] NVARCHAR(16) NOT NULL,
            [user_id] INT NULL,
            [ad_group_name] NVARCHAR(255) NULL,
            [ad_group_dn] NVARCHAR(512) NULL,
            [created_by] INT NULL,
            [updated_by] INT NULL,
            [createdAt] DATETIMEOFFSET NOT NULL CONSTRAINT [DF_EquipmentApprovers_createdAt] DEFAULT SYSDATETIMEOFFSET(),
            [updatedAt] DATETIMEOFFSET NOT NULL CONSTRAINT [DF_EquipmentApprovers_updatedAt] DEFAULT SYSDATETIMEOFFSET(),
            CONSTRAINT [FK_EquipmentApprovers_Equipment] FOREIGN KEY ([equipment_id])
                REFERENCES [Equipment-Items]([id]) ON DELETE CASCADE,
            CONSTRAINT [FK_EquipmentApprovers_User] FOREIGN KEY ([user_id])
                REFERENCES [Rooms-Users]([id]),
            CONSTRAINT [FK_EquipmentApprovers_CreatedBy] FOREIGN KEY ([created_by])
                REFERENCES [Rooms-Users]([id]),
            CONSTRAINT [FK_EquipmentApprovers_UpdatedBy] FOREIGN KEY ([updated_by])
                REFERENCES [Rooms-Users]([id]),
            -- One or the other, never both and never neither. Enforced here
            -- rather than only in the controller, because a half-populated row
            -- silently drops that approver from every future lookup.
            CONSTRAINT [CK_EquipmentApprovers_Target] CHECK (
                ([approver_type] = 'user'     AND [user_id] IS NOT NULL AND [ad_group_dn] IS NULL)
             OR ([approver_type] = 'ad_group' AND [ad_group_dn] IS NOT NULL AND [user_id] IS NULL)
            )
        );
    `);
    console.log("Ensured table: Equipment-Approvers");

    // Lookups are always "the approvers for this equipment".
    await sequelize.query(`
        IF NOT EXISTS (
            SELECT 1 FROM sys.indexes
            WHERE name = 'IX_EquipmentApprovers_Equipment'
              AND object_id = OBJECT_ID('[Equipment-Approvers]')
        )
        CREATE NONCLUSTERED INDEX [IX_EquipmentApprovers_Equipment]
            ON [Equipment-Approvers]([equipment_id]);
    `);
    console.log("Ensured index: IX_EquipmentApprovers_Equipment");

    // Filtered uniques, so the same person or group can't be added twice to one
    // piece of equipment. Filtered because the unused column is NULL on every
    // row of the other kind, and NULLs would otherwise collide with each other.
    await sequelize.query(`
        IF NOT EXISTS (
            SELECT 1 FROM sys.indexes
            WHERE name = 'UX_EquipmentApprovers_User'
              AND object_id = OBJECT_ID('[Equipment-Approvers]')
        )
        CREATE UNIQUE NONCLUSTERED INDEX [UX_EquipmentApprovers_User]
            ON [Equipment-Approvers]([equipment_id], [user_id])
            WHERE [user_id] IS NOT NULL;
    `);
    console.log("Ensured index: UX_EquipmentApprovers_User");

    await sequelize.query(`
        IF NOT EXISTS (
            SELECT 1 FROM sys.indexes
            WHERE name = 'UX_EquipmentApprovers_Group'
              AND object_id = OBJECT_ID('[Equipment-Approvers]')
        )
        CREATE UNIQUE NONCLUSTERED INDEX [UX_EquipmentApprovers_Group]
            ON [Equipment-Approvers]([equipment_id], [ad_group_dn])
            WHERE [ad_group_dn] IS NOT NULL;
    `);
    console.log("Ensured index: UX_EquipmentApprovers_Group");

    await sequelize.close();
    console.log("Done.");
}

run().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});
