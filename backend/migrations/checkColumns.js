const { sequelize } = require("../config/database");

async function checkColumns() {
    try {
        await sequelize.authenticate();
        console.log("✓ Connected to database\n");

        const [results] = await sequelize.query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Equipment-AssetTaxMeta'
            ORDER BY ORDINAL_POSITION
        `);

        console.log("Existing columns in Equipment-AssetTaxMeta:\n");
        results.forEach((col) => {
            console.log(
                `  ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.IS_NULLABLE === "YES" ? "NULL" : "NOT NULL"}`,
            );
        });

        await sequelize.close();
        process.exit(0);
    } catch (err) {
        console.error("Error:", err.message);
        await sequelize.close();
        process.exit(1);
    }
}

checkColumns();
