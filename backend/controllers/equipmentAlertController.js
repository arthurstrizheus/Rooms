const EquipmentAlert = require("../models/equipmentAlert");
const Equipment = require("../models/equipment");
const User = require("../models/user");
const { logErrorToFile } = require("../functions/logErrorToFile");

/**
 * Get all alerts for a specific equipment
 */
const GetAlertsByEquipment = async (req, res, next) => {
    try {
        const { equipmentId } = req.params;

        const alerts = await EquipmentAlert.findAll({
            where: { equipment_id: equipmentId },
            include: [
                {
                    model: User,
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "AlertCreatedBy",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "AlertUpdatedBy",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
            ],
            order: [["createdAt", "DESC"]],
        });

        res.status(200).json(alerts);
    } catch (error) {
        logErrorToFile(error);
        next(error);
    }
};

/**
 * Get all alerts for a specific user
 */
const GetAlertsByUser = async (req, res, next) => {
    try {
        const { userId } = req.params;

        const alerts = await EquipmentAlert.findAll({
            where: { user_id: userId },
            include: [
                {
                    model: Equipment,
                    attributes: ["id", "name", "serial_number", "location"],
                },
                {
                    model: User,
                    as: "AlertCreatedBy",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "AlertUpdatedBy",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
            ],
            order: [["createdAt", "DESC"]],
        });

        res.status(200).json(alerts);
    } catch (error) {
        logErrorToFile(error);
        next(error);
    }
};

/**
 * Get current user's alerts
 */
const GetMyAlerts = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const alerts = await EquipmentAlert.findAll({
            where: { user_id: userId, enabled: true },
            include: [
                {
                    model: Equipment,
                    attributes: [
                        "id",
                        "name",
                        "serial_number",
                        "location",
                        "status",
                    ],
                },
                {
                    model: User,
                    as: "AlertCreatedBy",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "AlertUpdatedBy",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
            ],
            order: [["createdAt", "DESC"]],
        });

        res.status(200).json(alerts);
    } catch (error) {
        logErrorToFile(error);
        next(error);
    }
};

/**
 * Subscribe to alerts for an equipment
 */
const Subscribe = async (req, res, next) => {
    try {
        const { equipment_id, alert_type, notification_days_before } = req.body;
        const user_id = req.user.id;

        // Validate equipment exists
        const equipment = await Equipment.findByPk(equipment_id);
        if (!equipment) {
            return res.status(404).json({ message: "Equipment not found" });
        }

        // Check if alert already exists
        const existingAlert = await EquipmentAlert.findOne({
            where: { equipment_id, user_id, alert_type },
        });

        if (existingAlert) {
            // Update existing alert
            existingAlert.enabled = true;
            if (notification_days_before !== undefined) {
                existingAlert.notification_days_before =
                    notification_days_before;
            }
            await existingAlert.save();
            return res.status(200).json(existingAlert);
        }

        // Create new alert
        const alert = await EquipmentAlert.create({
            equipment_id,
            user_id,
            alert_type,
            enabled: true,
            notification_days_before: notification_days_before || 7,
        });

        // Fetch complete alert with associations
        const completeAlert = await EquipmentAlert.findByPk(alert.id, {
            include: [
                {
                    model: User,
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "AlertCreatedBy",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "AlertUpdatedBy",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
            ],
        });

        res.status(201).json(completeAlert);

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            io.emit("message", {
                message: "alert_subscribed",
                data: { alert: completeAlert, equipment_id, user_id },
            });
        }
    } catch (error) {
        logErrorToFile(error);
        next(error);
    }
};

/**
 * Unsubscribe from alerts
 */
const Unsubscribe = async (req, res, next) => {
    try {
        const { alertId } = req.params;
        const user_id = req.user.id;

        const alert = await EquipmentAlert.findOne({
            where: { id: alertId, user_id },
        });

        if (!alert) {
            return res.status(404).json({ message: "Alert not found" });
        }

        // Soft delete by disabling
        alert.enabled = false;
        await alert.save();

        res.status(200).json({ message: "Alert disabled successfully" });

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            io.emit("message", {
                message: "alert_updated",
                data: { alert, equipment_id: alert.equipment_id, user_id },
            });
        }
    } catch (error) {
        logErrorToFile(error);
        next(error);
    }
};

/**
 * Delete alert subscription
 */
const DeleteAlert = async (req, res, next) => {
    try {
        const { alertId } = req.params;
        const user_id = req.user.id;

        const alert = await EquipmentAlert.findOne({
            where: { id: alertId, user_id },
        });

        if (!alert) {
            return res.status(404).json({ message: "Alert not found" });
        }

        await alert.destroy();
        res.status(200).json({ message: "Alert deleted successfully" });

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            io.emit("message", {
                message: "alert_deleted",
                data: { alertId, equipment_id: alert.equipment_id, user_id },
            });
        }
    } catch (error) {
        logErrorToFile(error);
        next(error);
    }
};

/**
 * Update alert settings
 */
const UpdateAlert = async (req, res, next) => {
    try {
        const { alertId } = req.params;
        const { enabled, notification_days_before } = req.body;
        const user_id = req.user.id;

        const alert = await EquipmentAlert.findOne({
            where: { id: alertId, user_id },
        });

        if (!alert) {
            return res.status(404).json({ message: "Alert not found" });
        }

        if (enabled !== undefined) {
            alert.enabled = enabled;
        }
        if (notification_days_before !== undefined) {
            alert.notification_days_before = notification_days_before;
        }

        await alert.save();

        // Fetch complete alert with associations
        const completeAlert = await EquipmentAlert.findByPk(alert.id, {
            include: [
                {
                    model: User,
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "AlertCreatedBy",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "AlertUpdatedBy",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
            ],
        });

        res.status(200).json(completeAlert);

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            io.emit("message", {
                message: "alert_updated",
                data: { alert, equipment_id: alert.equipment_id, user_id },
            });
        }
    } catch (error) {
        logErrorToFile(error);
        next(error);
    }
};

/**
 * Get subscribers for a specific equipment and alert type (internal use)
 */
const GetSubscribers = async (equipmentId, alertType) => {
    try {
        const alerts = await EquipmentAlert.findAll({
            where: {
                equipment_id: equipmentId,
                alert_type: [alertType, "all_alerts"],
                enabled: true,
            },
            include: [
                {
                    model: User,
                    attributes: ["id", "email", "first_name", "last_name"],
                },
            ],
        });

        return alerts
            .filter((alert) => alert.User && alert.User.email)
            .map((alert) => alert.User.email);
    } catch (error) {
        logErrorToFile(error);
        return [];
    }
};

module.exports = {
    GetAlertsByEquipment,
    GetAlertsByUser,
    GetMyAlerts,
    Subscribe,
    Unsubscribe,
    DeleteAlert,
    UpdateAlert,
    GetSubscribers,
};
