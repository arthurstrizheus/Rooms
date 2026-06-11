/**
 * One-off, idempotent migration.
 *
 * The app syncs models with { alter: false } (see app.js), so new model columns
 * are NOT created automatically. Run this once after deploying the it_support
 * feature to add the supporting columns to the Rooms-Meetings table:
 *
 *     node backend/migrations/add-it-support-to-meetings.js
 *
 * Safe to run multiple times — each ALTER is guarded by COL_LENGTH().
 */
const { sequelize, connectToDatabase } = require("../config/database");

async function run() {
    await connectToDatabase();

    await sequelize.query(`
        IF COL_LENGTH('Rooms-Meetings', 'it_support') IS NULL
            ALTER TABLE [Rooms-Meetings]
            ADD [it_support] BIT NOT NULL
            CONSTRAINT [DF_RoomsMeetings_it_support] DEFAULT (0);
    `);
    console.log("Ensured column: it_support");

    await sequelize.query(`
        IF COL_LENGTH('Rooms-Meetings', 'it_support_details') IS NULL
            ALTER TABLE [Rooms-Meetings]
            ADD [it_support_details] NVARCHAR(2000) NULL;
    `);
    console.log("Ensured column: it_support_details");

    console.log("Migration complete.");
    await sequelize.close();
}

run().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});
