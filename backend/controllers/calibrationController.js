const {
    CalibrationHistory,
    Equipment,
    User,
    EquipmentFile,
} = require("../models");

const GetByEquipmentId = async (req, res, next) => {
    try {
        const { equipmentId } = req.params;
        const history = await CalibrationHistory.findAll({
            where: { equipment_id: equipmentId },
            include: [
                {
                    model: User,
                    as: "PerformedBy",
                    attributes: ["id", "username", "first_name", "last_name"],
                },
                {
                    model: EquipmentFile,
                    as: "CertificateFile",
                    attributes: ["id", "file_name", "file_path"],
                },
            ],
            order: [["calibration_date", "DESC"]],
        });
        res.json(history);
    } catch (err) {
        next(err);
    }
};

const Post = async (req, res, next) => {
    try {
        const {
            equipment_id,
            calibration_date,
            next_due_date,
            performed_by_user_id,
            certificate_file_id,
            result,
            notes,
        } = req.body;

        const equipment = await Equipment.findByPk(equipment_id);
        if (!equipment) {
            return res.status(404).json({ message: "Equipment not found" });
        }

        const calibrationData = {
            equipment_id,
            calibration_date,
            next_due_date,
            performed_by_user_id,
            certificate_file_id,
            result,
            notes,
        };

        const calibration = await CalibrationHistory.create(calibrationData);

        // Update equipment last calibration date
        await equipment.update({
            last_calibration_date: calibration_date,
        });

        // Fetch complete calibration data
        const completeCalibration = await CalibrationHistory.findByPk(
            calibration.id,
            {
                include: [
                    {
                        model: User,
                        as: "PerformedBy",
                        attributes: [
                            "id",
                            "username",
                            "first_name",
                            "last_name",
                        ],
                    },
                    {
                        model: EquipmentFile,
                        as: "CertificateFile",
                        attributes: ["id", "file_name", "file_path"],
                    },
                ],
            },
        );

        res.status(201).json(completeCalibration);

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            io.emit("message", {
                message: "calibration_added",
                data: completeCalibration,
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

        const calibration = await CalibrationHistory.findByPk(id);

        if (!calibration) {
            return res
                .status(404)
                .json({ message: "Calibration record not found" });
        }

        await calibration.update(updates);

        // If calibration date changed, update equipment
        if (updates.calibration_date) {
            const equipment = await Equipment.findByPk(
                calibration.equipment_id,
            );
            if (equipment) {
                await equipment.update({
                    last_calibration_date:
                        updates.calibration_date ||
                        calibration.calibration_date,
                });
            }
        }

        // Fetch complete calibration data
        const completeCalibration = await CalibrationHistory.findByPk(id, {
            include: [
                {
                    model: User,
                    as: "PerformedBy",
                    attributes: ["id", "username", "first_name", "last_name"],
                },
                {
                    model: EquipmentFile,
                    as: "CertificateFile",
                    attributes: ["id", "file_name", "file_path"],
                },
            ],
        });

        res.json(completeCalibration);

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            io.emit("message", {
                message: "calibration_updated",
                data: completeCalibration,
            });
        }
    } catch (err) {
        next(err);
    }
};

const Delete = async (req, res, next) => {
    try {
        const { id } = req.params;
        const calibration = await CalibrationHistory.findByPk(id);

        if (!calibration) {
            return res
                .status(404)
                .json({ message: "Calibration record not found" });
        }

        await calibration.destroy();

        res.json({ message: "Calibration record deleted successfully" });

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            io.emit("message", {
                message: "calibration_deleted",
                data: { id },
            });
        }
    } catch (err) {
        next(err);
    }
};

module.exports = {
    GetByEquipmentId,
    Post,
    Update,
    Delete,
};
