const { Equipment, EquipmentFile, Checkout } = require("../models");
const path = require("path");
const fs = require("fs");

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
        if (equipmentData.calibration_due_date === "") {
            equipmentData.calibration_due_date = null;
        }
        if (equipmentData.last_calibration_date === "") {
            equipmentData.last_calibration_date = null;
        }

        // Convert calibration_interval_days to integer or null
        if (
            equipmentData.calibration_interval_days === "" ||
            equipmentData.calibration_interval_days === null
        ) {
            equipmentData.calibration_interval_days = null;
        } else if (equipmentData.calibration_interval_days) {
            equipmentData.calibration_interval_days = parseInt(
                equipmentData.calibration_interval_days,
                10
            );
        }

        // Handle image upload if provided
        if (req.file) {
            equipmentData.image = `/uploads/${req.file.filename}`;
        }

        const equipment = await Equipment.create(equipmentData);

        // Create uploads subdirectory for this equipment
        const equipmentDir = path.join(
            __dirname,
            "../../uploads",
            `equipment_${equipment.id}`
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
        if (updates.calibration_due_date === "") {
            updates.calibration_due_date = null;
        }
        if (updates.last_calibration_date === "") {
            updates.last_calibration_date = null;
        }

        // Convert calibration_interval_days to integer or null
        if (
            updates.calibration_interval_days === "" ||
            updates.calibration_interval_days === null
        ) {
            updates.calibration_interval_days = null;
        } else if (updates.calibration_interval_days) {
            updates.calibration_interval_days = parseInt(
                updates.calibration_interval_days,
                10
            );
        }

        // Handle image upload if provided
        if (req.file) {
            updates.image = `/uploads/${req.file.filename}`;
        }

        const equipment = await Equipment.findByPk(id);

        if (!equipment) {
            return res.status(404).json({ message: "Equipment not found" });
        }

        await equipment.update(updates);

        res.json(equipment);

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
            `equipment_${id}`
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
