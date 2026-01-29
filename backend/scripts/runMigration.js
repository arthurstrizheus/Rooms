/**
 * Script to run SQL migrations manually
 * Usage: node backend/scripts/runMigration.js <migration-file-name>
 */

const fs = require("fs");
const path = require("path");

// Load environment variables from backend directory
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { sequelize } = require("../config/database");

async function runMigration(migrationFileName) {
    try {
        // Read the migration file
        const migrationPath = path.join(
            __dirname,
            "..",
            "migrations",
            migrationFileName,
        );

        if (!fs.existsSync(migrationPath)) {
            console.error(`❌ Migration file not found: ${migrationPath}`);
            process.exit(1);
        }

        const migrationSQL = fs.readFileSync(migrationPath, "utf8");

        console.log(`📋 Running migration: ${migrationFileName}`);
        console.log("─".repeat(60));

        // Split by GO statements (SQL Server batch separator)
        const batches = migrationSQL
            .split(/\r?\nGO\r?\n/gi)
            .map((batch) => batch.trim())
            .filter((batch) => batch.length > 0);

        console.log(`Found ${batches.length} batch(es) to execute\n`);

        // Execute each batch
        for (let i = 0; i < batches.length; i++) {
            console.log(`Executing batch ${i + 1}/${batches.length}...`);
            await sequelize.query(batches[i]);
            console.log(`✓ Batch ${i + 1} completed`);
        }

        console.log("\n" + "─".repeat(60));
        console.log("✅ Migration completed successfully!");
    } catch (error) {
        console.error("\n❌ Migration failed:");
        console.error("Error:", error);
        if (error.original) {
            console.error("Original error:", error.original);
        }
        if (error.sql) {
            console.error("SQL that failed:", error.sql);
        }
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

// Get migration file from command line
const migrationFile = process.argv[2];

if (!migrationFile) {
    console.error(
        "Usage: node backend/scripts/runMigration.js <migration-file-name>",
    );
    console.error(
        "Example: node backend/scripts/runMigration.js 20260129_add_vehicle_fields_to_asset_tax_meta.sql",
    );
    process.exit(1);
}

runMigration(migrationFile);
