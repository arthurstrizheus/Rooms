-- Adds the columns the User model (backend/models/user.js) declares but that
-- were never created on [Rooms-Users]. Missing them makes every User query
-- fail with: Invalid column name 'equipment_office_admin' / 'equipment_admin'
-- / 'tax_admin' / 'updated_by'.
-- Run with: node migrations/runMigration.js add-user-equipment-admin-columns.sql
GO

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Rooms-Users' AND COLUMN_NAME = 'equipment_office_admin'
)
BEGIN
    ALTER TABLE [Rooms-Users] ADD [equipment_office_admin] INT NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Rooms-Users' AND COLUMN_NAME = 'equipment_admin'
)
BEGIN
    ALTER TABLE [Rooms-Users] ADD [equipment_admin] BIT NULL CONSTRAINT [DF_Rooms-Users_equipment_admin] DEFAULT (0);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Rooms-Users' AND COLUMN_NAME = 'tax_admin'
)
BEGIN
    ALTER TABLE [Rooms-Users] ADD [tax_admin] BIT NULL CONSTRAINT [DF_Rooms-Users_tax_admin] DEFAULT (0);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Rooms-Users' AND COLUMN_NAME = 'updated_by'
)
BEGIN
    ALTER TABLE [Rooms-Users] ADD [updated_by] INT NULL;
END
GO
