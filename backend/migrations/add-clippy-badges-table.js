/**
 * One-off, idempotent migration.
 *
 * The app syncs models with { alter: false } (see app.js), so a NEW TABLE is not
 * created for you either — `sync` on a model whose table is missing will create
 * it, but nothing creates the unique index the award logic relies on. Run this
 * once after deploying the Clippy badge feature:
 *
 *     node backend/migrations/add-clippy-badges-table.js
 *
 * Safe to run repeatedly — the table and the index are each guarded.
 *
 * The unique index on (user_id, badge_key) is the real point of this file: it is
 * what makes the award path in controllers/clippyBadges.js correct under two
 * simultaneous requests rather than merely usually correct.
 *
 * TIMESTAMPS MUST BE DATETIMEOFFSET, NOT DATETIME. Sequelize's mssql dialect
 * sends a date as `2026-07-31 10:48:06.123 +00:00` — with the offset — and
 * SQL Server cannot convert that string to `DATETIME`. Every insert fails with
 * "Conversion failed when converting date and/or time from character string",
 * and because `findOrCreate` wraps its insert in a transaction the server aborts
 * the transaction and the NEXT error you see is a misleading "COMMIT TRANSACTION
 * request has no corresponding BEGIN TRANSACTION" that hides the real cause.
 * Every other Rooms-* table already uses `datetimeoffset`; this one matches them.
 *
 * The first version of this file shipped `DATETIME`, so the ALTER block below
 * repairs a table that already exists. Both halves are guarded — run it as often
 * as you like.
 */
const { sequelize, connectToDatabase } = require("../config/database");

async function run() {
    await connectToDatabase();

    await sequelize.query(`
        IF OBJECT_ID('[Rooms-ClippyBadges]', 'U') IS NULL
        CREATE TABLE [Rooms-ClippyBadges] (
            [id]         INT IDENTITY(1,1) NOT NULL,
            [user_id]    INT NOT NULL,
            [badge_key]  NVARCHAR(40) NOT NULL,
            [clicks]     INT NOT NULL CONSTRAINT [DF_RoomsClippyBadges_clicks] DEFAULT (0),
            [createdAt]  DATETIMEOFFSET NULL,
            [updatedAt]  DATETIMEOFFSET NULL,
            CONSTRAINT [PK_RoomsClippyBadges] PRIMARY KEY CLUSTERED ([id]),
            CONSTRAINT [FK_RoomsClippyBadges_User] FOREIGN KEY ([user_id])
                REFERENCES [Rooms-Users]([id]) ON DELETE CASCADE
        );
    `);
    console.log("Ensured table: Rooms-ClippyBadges");

    await sequelize.query(`
        IF NOT EXISTS (
            SELECT 1 FROM sys.indexes
            WHERE name = 'UX_RoomsClippyBadges_user_badge'
              AND object_id = OBJECT_ID('[Rooms-ClippyBadges]')
        )
        CREATE UNIQUE INDEX [UX_RoomsClippyBadges_user_badge]
            ON [Rooms-ClippyBadges] ([user_id], [badge_key]);
    `);
    console.log("Ensured index: UX_RoomsClippyBadges_user_badge");

    // Repair for tables created by the first version of this file, which used
    // DATETIME and made every insert fail. No-op once the type is right.
    for (const column of ["createdAt", "updatedAt"]) {
        const [[current]] = await sequelize.query(`
            SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Rooms-ClippyBadges' AND COLUMN_NAME = '${column}';
        `);
        if (current && current.DATA_TYPE !== "datetimeoffset") {
            await sequelize.query(`
                ALTER TABLE [Rooms-ClippyBadges]
                ALTER COLUMN [${column}] DATETIMEOFFSET NULL;
            `);
            console.log(
                `Converted ${column}: ${current.DATA_TYPE} -> datetimeoffset`
            );
        } else {
            console.log(`Ensured ${column} is datetimeoffset`);
        }
    }

    console.log("Migration complete.");
    await sequelize.close();
}

run().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});
