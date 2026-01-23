const cron = require("node-cron");
const { Equipment, EquipmentAlert, User } = require("../models");
const { sendCalibrationDueEmail } = require("../controllers/mailController");
const { Op } = require("sequelize");

/**
 * Checks for equipment with upcoming calibration due dates and sends email notifications
 * to users who have subscribed to calibration_due alerts for that equipment
 */
const checkCalibrationAlerts = async () => {
    try {
        console.log(
            `[${new Date().toISOString()}] Running calibration alerts check...`,
        );

        // Get all active calibration_due alerts with their users and equipment
        const alerts = await EquipmentAlert.findAll({
            where: {
                alert_type: "calibration_due",
                enabled: true,
            },
            include: [
                {
                    model: Equipment,
                    required: true,
                    where: {
                        last_calibration_date: {
                            [Op.not]: null,
                        },
                        calibration_interval_value: {
                            [Op.not]: null,
                        },
                        calibration_interval_unit: {
                            [Op.not]: null,
                        },
                    },
                },
                {
                    model: User,
                    required: true,
                    attributes: ["id", "email", "first_name", "last_name"],
                },
            ],
        });

        if (alerts.length === 0) {
            console.log("No active calibration alerts found.");
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Group alerts by equipment to avoid sending multiple emails for the same equipment
        const equipmentAlertsMap = new Map();

        for (const alert of alerts) {
            const equipment = alert.Equipment;
            const user = alert.User;
            const notificationDays = alert.notification_days_before || 30;

            // Calculate the due date based on last_calibration_date + interval
            const lastCalibration = new Date(equipment.last_calibration_date);
            const dueDate = new Date(lastCalibration);

            const intervalValue = equipment.calibration_interval_value;
            const intervalUnit = equipment.calibration_interval_unit;

            // Add the interval to last calibration date
            switch (intervalUnit) {
                case "days":
                    dueDate.setDate(dueDate.getDate() + intervalValue);
                    break;
                case "months":
                    dueDate.setMonth(dueDate.getMonth() + intervalValue);
                    break;
                case "years":
                    dueDate.setFullYear(dueDate.getFullYear() + intervalValue);
                    break;
            }

            dueDate.setHours(0, 0, 0, 0);

            // Calculate the notification date (X days before due date)
            const notificationDate = new Date(dueDate);
            notificationDate.setDate(dueDate.getDate() - notificationDays);

            // Check if today is the notification date OR if we're past due
            const isPastDue = dueDate < today;
            const isNotificationDay =
                notificationDate.getTime() === today.getTime();
            const isBetweenNotificationAndDue =
                today >= notificationDate && today <= dueDate;

            if (isPastDue || isNotificationDay || isBetweenNotificationAndDue) {
                const daysUntilDue = Math.ceil(
                    (dueDate - today) / (1000 * 60 * 60 * 24),
                );

                if (!equipmentAlertsMap.has(equipment.id)) {
                    equipmentAlertsMap.set(equipment.id, {
                        equipment: equipment,
                        subscribers: [],
                        daysUntilDue: daysUntilDue,
                    });
                }

                equipmentAlertsMap
                    .get(equipment.id)
                    .subscribers.push(user.email);
            }
        }

        // Send emails for each equipment
        let emailsSent = 0;
        for (const [equipmentId, data] of equipmentAlertsMap) {
            try {
                await sendCalibrationDueEmail(
                    data.equipment,
                    data.subscribers,
                    data.daysUntilDue,
                );
                emailsSent++;
                console.log(
                    `Sent calibration alert for equipment ${equipmentId} to ${data.subscribers.length} subscribers (${data.daysUntilDue} days until due)`,
                );
            } catch (emailError) {
                console.error(
                    `Error sending calibration alert for equipment ${equipmentId}:`,
                    emailError,
                );
            }
        }

        console.log(
            `Calibration alerts check complete. Sent ${emailsSent} equipment alerts.`,
        );
    } catch (error) {
        console.error("Error in checkCalibrationAlerts:", error);
    }
};

/**
 * Initializes the calibration alerts scheduler
 * Runs daily at 8:00 AM
 */
const initCalibrationAlertsScheduler = () => {
    // Run at 8:00 AM every day
    cron.schedule("0 8 * * *", async () => {
        await checkCalibrationAlerts();
    });

    console.log(
        "Calibration alerts scheduler initialized (runs daily at 8:00 AM)",
    );

    // Optional: Run once on startup for testing
    // setTimeout(() => checkCalibrationAlerts(), 5000);
};

module.exports = {
    initCalibrationAlertsScheduler,
    checkCalibrationAlerts, // Export for manual testing
};
