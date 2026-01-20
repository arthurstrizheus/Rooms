/**
 * Script to fix file paths in database - removes /uploads/ prefix
 * Run this once to update existing file paths
 */

require("dotenv").config();
const { sequelize, EquipmentFile } = require("../models");

async function fixFilePaths() {
    try {
        console.log("Connecting to database...");
        await sequelize.authenticate();
        console.log("✅ Connected to database");

        // Find all files with /uploads/ prefix in path
        const filesWithPrefix = await EquipmentFile.findAll({
            where: {
                file_path: {
                    [sequelize.Sequelize.Op.like]: "/uploads/%",
                },
            },
        });

        console.log(
            `Found ${filesWithPrefix.length} files with /uploads/ prefix`
        );

        if (filesWithPrefix.length === 0) {
            console.log("No files to update!");
            process.exit(0);
        }

        // Update each file to remove /uploads/ prefix
        for (const file of filesWithPrefix) {
            const oldPath = file.file_path;
            const newPath = oldPath.replace("/uploads/", "");

            await file.update({ file_path: newPath });
            console.log(`✅ Updated: ${oldPath} -> ${newPath}`);
        }

        console.log(
            `\n✅ Successfully updated ${filesWithPrefix.length} file paths`
        );
        process.exit(0);
    } catch (error) {
        console.error("❌ Error fixing file paths:", error);
        process.exit(1);
    }
}

fixFilePaths();
