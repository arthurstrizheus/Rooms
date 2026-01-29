const { EquipmentFile, Equipment, User } = require("../models");
const path = require("path");
const fs = require("fs");

const GetByEquipmentId = async (req, res, next) => {
    try {
        const { equipmentId } = req.params;
        const files = await EquipmentFile.findAll({
            where: { equipment_id: equipmentId },
            include: [
                {
                    model: User,
                    as: "UploadedBy",
                    attributes: ["id", "username", "first_name", "last_name"],
                },
                {
                    model: User,
                    as: "FileCreatedBy",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "FileUpdatedBy",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
            ],
            order: [["upload_date", "DESC"]],
        });
        res.json(files);
    } catch (err) {
        next(err);
    }
};

const Download = async (req, res, next) => {
    try {
        console.log("🔽 Download request received for file ID:", req.params.id);
        const { id } = req.params;
        const file = await EquipmentFile.findByPk(id);

        if (!file) {
            console.log("❌ File not found in database");
            return res.status(404).json({ error: "File not found" });
        }

        const filePath = path.join(__dirname, "../../uploads", file.file_path);
        console.log("📁 Looking for file at:", filePath);

        if (!fs.existsSync(filePath)) {
            console.log("❌ File not found on filesystem");
            return res.status(404).json({ error: "File not found on server" });
        }

        console.log("✅ Sending file:", file.file_name);
        res.download(filePath, file.file_name);
    } catch (err) {
        console.error("❌ Download error:", err);
        next(err);
    }
};

const Post = async (req, res, next) => {
    try {
        const {
            equipment_id,
            category,
            description,
            calibration_date,
            uploaded_by_user_id,
        } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const equipment = await Equipment.findByPk(equipment_id);
        if (!equipment) {
            return res.status(404).json({ message: "Equipment not found" });
        }

        // Create equipment directory if it doesn't exist
        const equipmentDir = path.join(
            __dirname,
            "../../uploads",
            `equipment_${equipment_id}`,
        );
        if (!fs.existsSync(equipmentDir)) {
            fs.mkdirSync(equipmentDir, { recursive: true });
        }

        // Move file to equipment directory
        const oldPath = req.file.path;
        const newPath = path.join(equipmentDir, req.file.filename);
        fs.renameSync(oldPath, newPath);

        const fileData = {
            equipment_id,
            file_path: `equipment_${equipment_id}/${req.file.filename}`,
            file_name: req.file.originalname,
            file_type: req.file.mimetype,
            category: category || "other",
            description,
            uploaded_by_user_id,
            calibration_date: calibration_date || null,
        };

        const equipmentFile = await EquipmentFile.create(fileData);

        // Update equipment's last_calibration_date if this is a calibration cert with a newer date
        if (category === "calibration_cert" && calibration_date) {
            const calibrationDateObj = new Date(calibration_date);
            const currentLastCalibration = equipment.last_calibration_date
                ? new Date(equipment.last_calibration_date)
                : null;

            // Update if last_calibration_date is null or the new date is newer
            if (
                !currentLastCalibration ||
                calibrationDateObj > currentLastCalibration
            ) {
                await equipment.update({
                    last_calibration_date: calibration_date,
                });
            }
        }

        // Fetch complete file data with associations
        const completeFile = await EquipmentFile.findByPk(equipmentFile.id, {
            include: [
                {
                    model: User,
                    as: "UploadedBy",
                    attributes: ["id", "username", "first_name", "last_name"],
                },
                {
                    model: User,
                    as: "FileCreatedBy",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "FileUpdatedBy",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
            ],
        });

        res.status(201).json(completeFile);

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            io.emit("message", {
                message: "file_uploaded",
                data: completeFile,
            });
        }
    } catch (err) {
        next(err);
    }
};

const Update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const file = await EquipmentFile.findByPk(id);

        if (!file) {
            return res.status(404).json({ message: "File not found" });
        }

        // If a new file is uploaded, handle file replacement
        if (req.file) {
            const equipment = await Equipment.findByPk(file.equipment_id);
            if (!equipment) {
                return res.status(404).json({ message: "Equipment not found" });
            }

            // Create equipment directory if it doesn't exist
            const equipmentDir = path.join(
                __dirname,
                "../../uploads",
                `equipment_${file.equipment_id}`,
            );
            if (!fs.existsSync(equipmentDir)) {
                fs.mkdirSync(equipmentDir, { recursive: true });
            }

            // Delete old physical file
            const oldFilePath = path.join(
                __dirname,
                "../../uploads",
                file.file_path,
            );
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }

            // Move new file to equipment directory
            const oldPath = req.file.path;
            const newPath = path.join(equipmentDir, req.file.filename);
            fs.renameSync(oldPath, newPath);

            // Update file data
            updates.file_path = `equipment_${file.equipment_id}/${req.file.filename}`;
            updates.file_name = req.file.originalname;
            updates.file_type = req.file.mimetype;
        }

        await file.update(updates);

        // Update equipment's last_calibration_date if this is a calibration cert with a newer date
        if (
            (updates.category === "calibration_cert" ||
                file.category === "calibration_cert") &&
            updates.calibration_date
        ) {
            const equipment = await Equipment.findByPk(file.equipment_id);
            if (equipment) {
                const calibrationDateObj = new Date(updates.calibration_date);
                const currentLastCalibration = equipment.last_calibration_date
                    ? new Date(equipment.last_calibration_date)
                    : null;

                // Update if last_calibration_date is null or the new date is newer
                if (
                    !currentLastCalibration ||
                    calibrationDateObj > currentLastCalibration
                ) {
                    await equipment.update({
                        last_calibration_date: updates.calibration_date,
                    });
                }
            }
        }

        // Fetch complete file data
        const completeFile = await EquipmentFile.findByPk(id, {
            include: [
                {
                    model: User,
                    as: "UploadedBy",
                    attributes: ["id", "username", "first_name", "last_name"],
                },
                {
                    model: User,
                    as: "FileCreatedBy",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "FileUpdatedBy",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
            ],
        });

        res.json(completeFile);

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            io.emit("message", { message: "file_updated", data: completeFile });
        }
    } catch (err) {
        next(err);
    }
};

const Delete = async (req, res, next) => {
    try {
        const { id } = req.params;
        const file = await EquipmentFile.findByPk(id);

        if (!file) {
            return res.status(404).json({ message: "File not found" });
        }

        // Delete physical file
        const filePath = path.join(__dirname, "../..", file.file_path);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await file.destroy();

        res.json({ message: "File deleted successfully" });

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            io.emit("message", { message: "file_deleted", data: { id } });
        }
    } catch (err) {
        next(err);
    }
};

module.exports = {
    GetByEquipmentId,
    Download,
    Post,
    Update,
    Delete,
};
