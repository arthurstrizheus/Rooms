// Read-only diagnostic: inspect [Rooms-Users] columns and surface the real
// tedious RequestError messages hidden inside the AggregateError.
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "backend", ".env") });

const { sequelize } = require(path.join(__dirname, "..", "backend", "config", "database"));
const User = require(path.join(__dirname, "..", "backend", "models", "user"));

(async () => {
    try {
        await sequelize.authenticate();
        console.log("connected\n");

        const [cols] = await sequelize.query(`
            SELECT COLUMN_NAME, DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Rooms-Users'
            ORDER BY ORDINAL_POSITION
        `);
        console.log("Columns in [Rooms-Users]:");
        cols.forEach((c) => console.log(`  ${c.COLUMN_NAME} (${c.DATA_TYPE})`));

        const modelAttrs = Object.values(User.rawAttributes).map((a) => a.field);
        const dbCols = cols.map((c) => c.COLUMN_NAME);
        const missing = modelAttrs.filter((a) => !dbCols.includes(a));
        console.log("\nModel attributes missing from table:", missing.length ? missing : "(none)");

        console.log("\nRunning the failing findOne...");
        try {
            const u = await User.findOne({ where: { username: "astrizheus" } });
            console.log("findOne OK ->", u ? u.id : null);
        } catch (err) {
            console.log("findOne FAILED:", err.name);
            const agg = err.original || err.parent;
            const inner = agg && agg.errors ? agg.errors : [agg];
            inner.filter(Boolean).forEach((e, i) =>
                console.log(`  [${i}] ${e.code || ""} ${e.number || ""} ${e.message}`),
            );
        }
    } catch (err) {
        console.error("Fatal:", err.message);
        const agg = err.original || err.parent;
        if (agg && agg.errors) agg.errors.forEach((e, i) => console.log(`  [${i}] ${e.message}`));
    } finally {
        await sequelize.close();
    }
})();
