const { sequelize } = require("../config/database");

// Indexes that match each list query's WHERE + ORDER BY so SQL Server can
// stream rows in order straight off the index. Without these, every ORDER BY
// adds a Sort operator that must reserve workspace memory before running —
// on a memory-starved server those queries queue on RESOURCE_SEMAPHORE for
// ~25s and the API times out at 15s.
const INDEXES = [
    {
        table: "Equipment-Checkouts",
        name: "IX_EquipmentCheckouts_equipment_start",
        columns: ["equipment_id", "start_time"],
    },
    {
        table: "Equipment-Checkouts",
        name: "IX_EquipmentCheckouts_user_start",
        columns: ["user_id", "start_time"],
    },
    {
        table: "Equipment-Checkouts",
        name: "IX_EquipmentCheckouts_status_start",
        columns: ["status", "start_time"],
    },
    {
        table: "Equipment-Alerts",
        name: "IX_EquipmentAlerts_user_created",
        columns: ["user_id", "createdAt"],
    },
    {
        table: "Equipment-Alerts",
        name: "IX_EquipmentAlerts_equipment_created",
        columns: ["equipment_id", "createdAt"],
    },
    {
        table: "Equipment-CalibrationHistory",
        name: "IX_EquipmentCalibrationHistory_equipment_date",
        columns: ["equipment_id", "calibration_date"],
    },
    {
        table: "Equipment-Files",
        name: "IX_EquipmentFiles_equipment_upload",
        columns: ["equipment_id", "upload_date"],
    },
];

const ensureIndexes = async () => {
    for (const { table, name, columns } of INDEXES) {
        try {
            const cols = columns.map((c) => `[${c}]`).join(", ");
            await sequelize.query(`
                IF NOT EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = '${name}'
                      AND object_id = OBJECT_ID('[${table}]')
                )
                CREATE NONCLUSTERED INDEX [${name}] ON [${table}] (${cols});
            `);
            console.log(`✓ Index ${name} ensured`);
        } catch (err) {
            console.error(`✗ Failed to ensure index ${name}:`, err.message);
        }
    }
};

module.exports = { ensureIndexes };
