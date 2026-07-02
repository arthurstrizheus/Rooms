const {
    Equipment,
    EquipmentFile,
    Checkout,
    User,
    AssetTaxMeta,
} = require("../models");
const path = require("path");
const fs = require("fs");
const { GetSubscribers } = require("./equipmentAlertController");
const { sendEquipmentStatusChangeEmail } = require("./mailController");
const {
    validateSection179,
} = require("../depreciation/validators/section179Validator");
const {
    validatePassengerAuto,
} = require("../depreciation/validators/passengerAutoValidator");

const GetAll = async (req, res, next) => {
    try {
        const equipment = await Equipment.findAll({
            include: [
                {
                    model: AssetTaxMeta,
                    as: "AssetTaxMeta",
                },
            ],
        });
        // Sort in JS: an unfiltered ORDER BY forces a SQL Sort operator that
        // needs a workspace memory grant and queues on a memory-starved server
        equipment.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        res.json(equipment);
    } catch (err) {
        next(err);
    }
};

const GetById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const equipment = await Equipment.findByPk(id, {
            include: [
                {
                    model: EquipmentFile,
                    as: "EquipmentFiles",
                },
                {
                    model: User,
                    as: "CreatedBy",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "UpdatedBy",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: AssetTaxMeta,
                    as: "AssetTaxMeta",
                },
            ],
        });

        if (!equipment) {
            return res.status(404).json({ message: "Equipment not found" });
        }

        res.json(equipment);
    } catch (err) {
        next(err);
    }
};

const Post = async (req, res, next) => {
    try {
        const equipmentData = req.body;

        // Clean up empty string date fields (set to null)
        if (equipmentData.last_calibration_date === "") {
            equipmentData.last_calibration_date = null;
        }
        if (equipmentData.date_of_purchase === "") {
            equipmentData.date_of_purchase = null;
        }

        // Clean up empty string fields
        if (equipmentData.asset_number === "") {
            equipmentData.asset_number = null;
        }
        if (equipmentData.serial_number === "") {
            equipmentData.serial_number = null;
        }

        // Convert cost to float or null
        if (
            equipmentData.cost === "" ||
            equipmentData.cost === null ||
            equipmentData.cost === undefined
        ) {
            equipmentData.cost = null;
        } else if (equipmentData.cost) {
            equipmentData.cost = parseFloat(equipmentData.cost);
        }

        // Convert calibration_interval_value to integer or null
        if (
            equipmentData.calibration_interval_value === "" ||
            equipmentData.calibration_interval_value === null
        ) {
            equipmentData.calibration_interval_value = null;
            equipmentData.calibration_interval_unit = null;
        } else if (equipmentData.calibration_interval_value) {
            equipmentData.calibration_interval_value = parseInt(
                equipmentData.calibration_interval_value,
                10,
            );
        }

        // Handle image upload if provided
        if (req.file) {
            console.log("File uploaded:", req.file);
            console.log("File path:", req.file.path);
            console.log("File destination:", req.file.destination);
            console.log("File filename:", req.file.filename);
            equipmentData.image = `/uploads/${req.file.filename}`;
        } else {
            console.log("No file in request");
        }

        const equipment = await Equipment.create(equipmentData);

        // Create AssetTaxMeta if depreciation fields provided
        const taxMetaFields = {
            placed_in_service_date: equipmentData.placed_in_service_date
                ? equipmentData.placed_in_service_date <
                  equipmentData.date_of_purchase
                    ? equipmentData.date_of_purchase
                    : equipmentData.placed_in_service_date
                : equipmentData.date_of_purchase
                  ? equipmentData.date_of_purchase
                  : null,
            cost_basis: equipmentData.cost_basis || equipmentData.cost,
            property_class: equipmentData.property_class,
            method: equipmentData.method,
            bonus_eligible: equipmentData.bonus_eligible,
            section179_elected: equipmentData.section179_elected,
            vehicle_class: equipmentData.vehicle_class || "UNKNOWN",
        };

        // Check if any tax meta fields are provided
        const hasTaxMetaData = Object.values(taxMetaFields).some(
            (val) => val !== undefined && val !== null && val !== "",
        );

        if (hasTaxMetaData) {
            // Validate Section 179 before saving
            const validationResult = validateSection179(
                equipment,
                taxMetaFields,
            );

            // Additionally validate passenger auto 280F limits
            const passengerAutoResult = validatePassengerAuto(
                equipment,
                taxMetaFields,
                1, // Year 1 depreciation
            );

            // Combine validation results
            const allErrors = [
                ...validationResult.errors,
                ...passengerAutoResult.errors,
            ];
            const allWarnings = [
                ...validationResult.warnings,
                ...passengerAutoResult.warnings,
            ];

            if (allErrors.length > 0) {
                // Delete the equipment we just created since validation failed
                await equipment.destroy();
                return res.status(400).json({
                    message: "Tax depreciation validation failed",
                    errors: allErrors,
                    warnings: allWarnings,
                });
            }

            // Save with validation results
            await AssetTaxMeta.create({
                asset_id: equipment.id,
                ...taxMetaFields,
                requires_manual_confirmation:
                    validationResult.requiresManualConfirmation,
                validation_warnings_json:
                    allWarnings.length > 0 ? allWarnings : null,
            });
        }

        // Create uploads subdirectory for this equipment
        const equipmentDir = path.join(
            __dirname,
            "../../uploads",
            `equipment_${equipment.id}`,
        );
        if (!fs.existsSync(equipmentDir)) {
            fs.mkdirSync(equipmentDir, { recursive: true });
        }

        res.status(201).json(equipment);

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            io.emit("message", { message: "equipment_added", data: equipment });
        }
    } catch (err) {
        next(err);
    }
};

const Update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Clean up empty string fields (set to null)
        const stringFieldsToClean = [
            "description",
            "serial_number",
            "asset_number",
            "brand_name",
            "billing_code",
            "location",
            "contact_person",
            "last_calibration_date",
            "date_of_purchase",
            "calibration_interval_unit",
            "image",
        ];

        stringFieldsToClean.forEach((field) => {
            if (updates[field] === "") {
                updates[field] = null;
            }
        });

        // Clean up numeric fields
        if (
            updates.contact_person_id === "" ||
            updates.contact_person_id === null ||
            updates.contact_person_id === undefined
        ) {
            updates.contact_person_id = null;
        }

        // Convert cost to float or null
        if (
            updates.cost === "" ||
            updates.cost === null ||
            updates.cost === undefined
        ) {
            updates.cost = null;
        } else if (updates.cost) {
            updates.cost = parseFloat(updates.cost);
        }

        // Convert calibration_interval_value to integer or null
        if (
            updates.calibration_interval_value === "" ||
            updates.calibration_interval_value === null
        ) {
            updates.calibration_interval_value = null;
            updates.calibration_interval_unit = null;
        } else if (updates.calibration_interval_value) {
            updates.calibration_interval_value = parseInt(
                updates.calibration_interval_value,
                10,
            );
        }

        // Handle image upload if provided
        if (req.file) {
            console.log("File uploaded for update:", req.file);
            console.log("File path:", req.file.path);
            updates.image = `/uploads/${req.file.filename}`;
        } else {
            console.log("No file in update request");
        }

        const equipment = await Equipment.findByPk(id);

        if (!equipment) {
            return res.status(404).json({ message: "Equipment not found" });
        }

        // Track old status for comparison
        const oldStatus = equipment.status;

        await equipment.update(updates);

        // Update or create AssetTaxMeta if depreciation fields provided
        const taxMetaFields = {
            placed_in_service_date: updates.placed_in_service_date
                ? updates.placed_in_service_date < updates.date_of_purchase
                    ? updates.date_of_purchase
                    : updates.placed_in_service_date
                : updates.date_of_purchase
                  ? updates.date_of_purchase
                  : null,
            cost_basis: updates.cost_basis || updates.cost,
            property_class: updates.property_class,
            method: updates.method,
            bonus_eligible: updates.bonus_eligible,
            section179_elected: updates.section179_elected,
            vehicle_class: updates.vehicle_class || "UNKNOWN",
        };

        // Clean up empty strings - convert to null for all fields
        if (taxMetaFields.placed_in_service_date === "") {
            taxMetaFields.placed_in_service_date = null;
        }
        if (
            taxMetaFields.cost_basis === "" ||
            taxMetaFields.cost_basis === undefined
        ) {
            taxMetaFields.cost_basis = null;
        }
        if (
            taxMetaFields.section179_elected === "" ||
            taxMetaFields.section179_elected === undefined
        ) {
            taxMetaFields.section179_elected = null;
        }
        if (taxMetaFields.property_class === "") {
            taxMetaFields.property_class = null;
        }
        if (taxMetaFields.method === "") {
            taxMetaFields.method = null;
        }

        // Handle boolean field - convert empty string or undefined to null/false
        if (
            taxMetaFields.bonus_eligible === "" ||
            taxMetaFields.bonus_eligible === undefined
        ) {
            taxMetaFields.bonus_eligible = false;
        } else if (typeof taxMetaFields.bonus_eligible === "string") {
            taxMetaFields.bonus_eligible =
                taxMetaFields.bonus_eligible === "true";
        }

        // Check if any tax meta fields are provided (excluding nulls and empty strings)
        const hasTaxMetaData = Object.entries(taxMetaFields).some(
            ([key, val]) =>
                val !== undefined &&
                val !== null &&
                val !== "" &&
                key !== "vehicle_class", // Don't count default vehicle_class
        );

        if (hasTaxMetaData) {
            // Validate Section 179 before saving
            const validationResult = validateSection179(
                equipment,
                taxMetaFields,
            );

            // Additionally validate passenger auto 280F limits
            const passengerAutoResult = validatePassengerAuto(
                equipment,
                taxMetaFields,
                1, // Year 1 depreciation
            );

            // Combine validation results
            const allErrors = [
                ...validationResult.errors,
                ...passengerAutoResult.errors,
            ];
            const allWarnings = [
                ...validationResult.warnings,
                ...passengerAutoResult.warnings,
            ];

            if (allErrors.length > 0) {
                return res.status(400).json({
                    message: "Tax depreciation validation failed",
                    errors: allErrors,
                    warnings: allWarnings,
                });
            }

            const existingTaxMeta = await AssetTaxMeta.findOne({
                where: { asset_id: id },
            });

            const taxMetaWithValidation = {
                ...taxMetaFields,
                requires_manual_confirmation:
                    validationResult.requiresManualConfirmation,
                validation_warnings_json:
                    allWarnings.length > 0 ? allWarnings : null,
            };

            if (existingTaxMeta) {
                await existingTaxMeta.update(taxMetaWithValidation);
            } else {
                await AssetTaxMeta.create({
                    asset_id: id,
                    ...taxMetaWithValidation,
                });
            }
        }

        // Auto-trigger disposal if status changed to 'retired'
        if (updates.status === "retired" && oldStatus !== "retired") {
            const taxMeta = await AssetTaxMeta.findOne({
                where: { asset_id: id },
            });

            if (taxMeta) {
                // Only set disposal_date if not already set
                if (!taxMeta.disposal_date) {
                    await taxMeta.update({
                        disposal_date: new Date(),
                        disposal_method: taxMeta.disposal_method || "Retired",
                    });
                }
            } else {
                // Create AssetTaxMeta with disposal info if it doesn't exist
                await AssetTaxMeta.create({
                    asset_id: id,
                    disposal_date: new Date(),
                    disposal_method: "Retired",
                    vehicle_class: "UNKNOWN",
                });
            }
        }

        res.json(equipment);

        // Send status change notifications if status changed
        if (updates.status && oldStatus !== updates.status) {
            (async () => {
                try {
                    const subscribers = await GetSubscribers(
                        id,
                        "status_change",
                    );
                    if (subscribers && subscribers.length > 0) {
                        await sendEquipmentStatusChangeEmail(
                            equipment,
                            oldStatus,
                            updates.status,
                            subscribers,
                        );
                    }
                } catch (emailError) {
                    console.error(
                        "Error sending status change emails:",
                        emailError,
                    );
                }
            })();
        }

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            io.emit("message", {
                message: "equipment_updated",
                data: equipment,
            });
        }
    } catch (err) {
        next(err);
    }
};

const Delete = async (req, res, next) => {
    try {
        const { id } = req.params;
        const equipment = await Equipment.findByPk(id);

        if (!equipment) {
            return res.status(404).json({ message: "Equipment not found" });
        }

        // Auto-trigger disposal before deletion
        const taxMeta = await AssetTaxMeta.findOne({
            where: { asset_id: id },
        });

        if (taxMeta && !taxMeta.disposal_date) {
            // Set disposal date if not already set
            await taxMeta.update({
                disposal_date: new Date(),
                disposal_method: taxMeta.disposal_method || "Deleted",
            });
        } else if (!taxMeta) {
            // Create AssetTaxMeta with disposal info if it doesn't exist
            // This ensures disposal is tracked even if no tax info was entered
            await AssetTaxMeta.create({
                asset_id: id,
                disposal_date: new Date(),
                disposal_method: "Deleted",
                vehicle_class: "UNKNOWN",
            });
        }

        // Delete equipment directory if exists
        const equipmentDir = path.join(
            __dirname,
            "../../uploads",
            `equipment_${id}`,
        );
        if (fs.existsSync(equipmentDir)) {
            fs.rmSync(equipmentDir, { recursive: true, force: true });
        }

        await equipment.destroy();

        res.json({ message: "Equipment deleted successfully" });

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            io.emit("message", { message: "equipment_deleted", data: { id } });
        }
    } catch (err) {
        next(err);
    }
};

const ExportToExcel = async (req, res, next) => {
    try {
        const ExcelJS = require("exceljs");

        // Fetch all equipment with related data
        const equipment = await Equipment.findAll({
            order: [["name", "ASC"]],
            include: [
                {
                    model: User,
                    as: "CreatedBy",
                    attributes: ["first_name", "last_name"],
                },
                {
                    model: User,
                    as: "UpdatedBy",
                    attributes: ["first_name", "last_name"],
                },
                {
                    model: AssetTaxMeta,
                    as: "AssetTaxMeta",
                },
            ],
        });

        // Create a new workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Equipment List");

        // Define columns
        worksheet.columns = [
            { header: "ID", key: "id", width: 10 },
            { header: "Name", key: "name", width: 30 },
            { header: "Description", key: "description", width: 40 },
            { header: "Serial Number", key: "serial_number", width: 20 },
            { header: "Asset Number", key: "asset_number", width: 20 },
            { header: "Brand Name", key: "brand_name", width: 20 },
            { header: "Date of Purchase", key: "date_of_purchase", width: 18 },
            { header: "Cost", key: "cost", width: 15 },
            { header: "Billing Rate", key: "billing_rate", width: 15 },
            { header: "Billing Code", key: "billing_code", width: 15 },
            { header: "Location", key: "location", width: 20 },
            { header: "Contact Person", key: "contact_person", width: 25 },
            { header: "Status", key: "status", width: 15 },
            {
                header: "Requires Approval",
                key: "requires_approval",
                width: 18,
            },
            { header: "Can Book", key: "can_book", width: 12 },
            {
                header: "Last Calibration Date",
                key: "last_calibration_date",
                width: 20,
            },
            {
                header: "Calibration Interval",
                key: "calibration_interval",
                width: 20,
            },
            {
                header: "Calibration Due Date",
                key: "calibration_due_date",
                width: 20,
            },
            { header: "Created By", key: "created_by", width: 25 },
            { header: "Updated By", key: "updated_by", width: 25 },
            { header: "Created At", key: "createdAt", width: 20 },
            { header: "Updated At", key: "updatedAt", width: 20 },
        ];

        // Style the header row
        worksheet.getRow(1).font = { bold: true, size: 12 };
        worksheet.getRow(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF4472C4" },
        };
        worksheet.getRow(1).alignment = {
            vertical: "middle",
            horizontal: "center",
        };

        // Helper function to calculate calibration due date
        const calculateDueDate = (lastCalDate, intervalValue, intervalUnit) => {
            if (!lastCalDate || !intervalValue || !intervalUnit) return null;
            const date = new Date(lastCalDate);
            switch (intervalUnit) {
                case "days":
                    date.setDate(date.getDate() + intervalValue);
                    break;
                case "months":
                    date.setMonth(date.getMonth() + intervalValue);
                    break;
                case "years":
                    date.setFullYear(date.getFullYear() + intervalValue);
                    break;
            }
            return date;
        };

        // Add data rows
        equipment.forEach((item) => {
            const dueDate = calculateDueDate(
                item.last_calibration_date,
                item.calibration_interval_value,
                item.calibration_interval_unit,
            );

            worksheet.addRow({
                id: item.id,
                name: item.name,
                description: item.description || "",
                serial_number: item.serial_number || "",
                asset_number: item.asset_number || "",
                brand_name: item.brand_name || "",
                date_of_purchase: item.date_of_purchase
                    ? new Date(item.date_of_purchase).toLocaleDateString()
                    : "",
                cost: item.cost ? `$${parseFloat(item.cost).toFixed(2)}` : "",
                billing_rate: item.billing_rate ? item.billing_rate : "",
                billing_code: item.billing_code || "",
                location: item.location || "",
                contact_person: item.contact_person || "",
                status: item.status,
                requires_approval:
                    item.requires_approval === true
                        ? "Yes"
                        : item.requires_approval === false
                          ? "No"
                          : "No",
                can_book:
                    item.can_book === true
                        ? "Yes"
                        : item.can_book === false
                          ? "No"
                          : "Yes",
                last_calibration_date: item.last_calibration_date
                    ? new Date(item.last_calibration_date).toLocaleDateString()
                    : "",
                calibration_interval: item.calibration_interval_value
                    ? `${item.calibration_interval_value} ${item.calibration_interval_unit}`
                    : "",
                calibration_due_date: dueDate
                    ? dueDate.toLocaleDateString()
                    : "",
                created_by: item.CreatedBy
                    ? `${item.CreatedBy.first_name} ${item.CreatedBy.last_name}`
                    : "",
                updated_by: item.UpdatedBy
                    ? `${item.UpdatedBy.first_name} ${item.UpdatedBy.last_name}`
                    : "",
                createdAt: item.createdAt
                    ? new Date(item.createdAt).toLocaleDateString()
                    : "",
                updatedAt: item.updatedAt
                    ? new Date(item.updatedAt).toLocaleDateString()
                    : "",
            });
        });

        // Auto-fit columns (optional enhancement)
        worksheet.columns.forEach((column) => {
            column.alignment = { vertical: "middle", wrapText: true };
        });

        // Set response headers for file download
        const filename = `Equipment_List_${new Date().toISOString().split("T")[0]}.xlsx`;
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${filename}"`,
        );

        // Write to response
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error("Error exporting equipment to Excel:", err);
        next(err);
    }
};

module.exports = {
    GetAll,
    GetById,
    Post,
    Update,
    Delete,
    ExportToExcel,
};
