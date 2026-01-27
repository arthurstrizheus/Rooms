const { Equipment, EquipmentFile, Checkout, User } = require("../models");
const path = require("path");
const fs = require("fs");
const { GetSubscribers } = require("./equipmentAlertController");
const { sendEquipmentStatusChangeEmail } = require("./mailController");

const GetAll = async (req, res, next) => {
    try {
        const equipment = await Equipment.findAll({
            order: [["name", "ASC"]],
        });
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

        // Clean up empty string date fields (set to null)
        if (updates.last_calibration_date === "") {
            updates.last_calibration_date = null;
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

module.exports = {
    GetAll,
    GetById,
    Post,
    Update,
    Delete,
};
