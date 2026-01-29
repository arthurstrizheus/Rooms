const { sequelize } = require("../config/database");
const fs = require("fs");
const path = require("path");

async function runMigration() {
    const migrationFile = process.argv[2];

    if (!migrationFile) {
        console.error("Usage: node runMigration.js <migration-file.sql>");
        process.exit(1);
    }

    const sqlPath = path.join(__dirname, migrationFile);

    if (!fs.existsSync(sqlPath)) {
        console.error(`Migration file not found: ${sqlPath}`);
        process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, "utf-8");

    // Split by GO statements for SQL Server batch processing
    const statements = sql
        .split(/^\s*GO\s*$/im)
        .map((stmt) => stmt.trim())
        .filter((stmt) => stmt && !stmt.startsWith("--"));

    try {
        await sequelize.authenticate();
        console.log("✓ Connected to database:", process.env.DB_DATABASE);
        console.log(
            `\nExecuting ${statements.length} SQL batches from ${migrationFile}...\n`,
        );

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            console.log(
                `[${i + 1}/${statements.length}] ${stmt.substring(0, 80).replace(/\n/g, " ")}...`,
            );
            await sequelize.query(stmt);
        }

        console.log("\n✓ Migration completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("\n✗ Migration failed:", err.message);
        console.error("\nFull error:", err);
        process.exit(1);
    }
}

runMigration();
