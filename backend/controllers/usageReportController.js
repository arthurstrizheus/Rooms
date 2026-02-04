const { Checkout, Equipment, User } = require("../models");
const { Sequelize, Op } = require("sequelize");
const {
    startOfYear,
    endOfYear,
    startOfMonth,
    endOfMonth,
    format,
    parseISO,
} = require("date-fns");

/**
 * Get usage report based on filters
 * Query params:
 * - period: 'ytd', 'month', 'year', 'custom'
 * - year: year to report on (required for 'year' and 'ytd')
 * - month: month number 1-12 (required for 'month')
 * - startDate: ISO date string (required for 'custom')
 * - endDate: ISO date string (required for 'custom')
 * - equipment_id: filter by specific equipment (optional)
 * - office_id: filter by office/location (optional)
 * - groupBy: 'equipment', 'user', 'month', 'week', 'day' (default: 'equipment')
 */
const GetUsageReport = async (req, res, next) => {
    try {
        const {
            period,
            year,
            month,
            startDate,
            endDate,
            equipment_id,
            office_id,
            groupBy = "equipment",
        } = req.query;

        let dateFilter = {};
        let reportPeriodLabel = "";

        // Determine date range based on period
        switch (period) {
            case "ytd": {
                if (!year) {
                    return res.status(400).json({
                        error: "Year is required for YTD reports",
                    });
                }
                const yearNum = parseInt(year);
                const start = startOfYear(new Date(yearNum, 0, 1));
                const now = new Date();
                const end =
                    now.getFullYear() === yearNum ? now : endOfYear(start);
                dateFilter = {
                    start_time: {
                        [Op.gte]: start,
                        [Op.lte]: end,
                    },
                };
                reportPeriodLabel = `Year-to-Date ${yearNum}`;
                break;
            }
            case "month": {
                if (!year || !month) {
                    return res.status(400).json({
                        error: "Year and month are required for monthly reports",
                    });
                }
                const monthNum = parseInt(month);
                const yearNum = parseInt(year);
                const start = startOfMonth(new Date(yearNum, monthNum - 1, 1));
                const end = endOfMonth(start);
                dateFilter = {
                    start_time: {
                        [Op.gte]: start,
                        [Op.lte]: end,
                    },
                };
                reportPeriodLabel = format(start, "MMMM yyyy");
                break;
            }
            case "year": {
                if (!year) {
                    return res.status(400).json({
                        error: "Year is required for yearly reports",
                    });
                }
                const yearNum = parseInt(year);
                const start = startOfYear(new Date(yearNum, 0, 1));
                const end = endOfYear(start);
                dateFilter = {
                    start_time: {
                        [Op.gte]: start,
                        [Op.lte]: end,
                    },
                };
                reportPeriodLabel = `${yearNum}`;
                break;
            }
            case "custom": {
                if (!startDate || !endDate) {
                    return res.status(400).json({
                        error: "Start and end dates are required for custom reports",
                    });
                }
                const start = parseISO(startDate);
                const end = parseISO(endDate);
                dateFilter = {
                    start_time: {
                        [Op.gte]: start,
                        [Op.lte]: end,
                    },
                };
                reportPeriodLabel = `${format(start, "MMM d, yyyy")} - ${format(end, "MMM d, yyyy")}`;
                break;
            }
            default:
                return res.status(400).json({
                    error: "Invalid period. Use 'ytd', 'month', 'year', or 'custom'",
                });
        }

        // Build additional filters
        // Include: approved, auto-approved, checked_out, returned
        // Exclude: pending, cancelled
        const whereClause = {
            ...dateFilter,
            status: {
                [Op.in]: [
                    "approved",
                    "auto-approved",
                    "checked_out",
                    "returned",
                ],
            },
        };

        if (equipment_id) {
            whereClause.equipment_id = equipment_id;
        }

        // Fetch all checkouts with equipment and user info
        const checkouts = await Checkout.findAll({
            where: whereClause,
            include: [
                {
                    model: Equipment,
                    attributes: [
                        "id",
                        "name",
                        "serial_number",
                        "image",
                        "location",
                    ],
                    required: true,
                },
                {
                    model: User,
                    as: "User",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: true,
                },
            ],
            order: [["start_time", "ASC"]],
        });

        // Filter by office if specified (equipment.location matches office alias)
        let filteredCheckouts = checkouts;
        if (office_id) {
            // Need to get office alias from office_id
            const { Office } = require("../models");
            const office = await Office.findByPk(parseInt(office_id));
            if (office) {
                filteredCheckouts = checkouts.filter(
                    (c) => c.Equipment?.location === office.Alias,
                );
            }
        }

        // Calculate summary statistics
        const totalCheckouts = filteredCheckouts.length;
        const uniqueEquipment = new Set(
            filteredCheckouts.map((c) => c.equipment_id),
        ).size;
        const uniqueUsers = new Set(filteredCheckouts.map((c) => c.user_id))
            .size;

        // Calculate total hours
        const totalHours = filteredCheckouts.reduce((sum, checkout) => {
            const start = new Date(checkout.start_time);
            const end = new Date(checkout.end_time);
            const hours = (end - start) / (1000 * 60 * 60);
            return sum + hours;
        }, 0);

        // Group data based on groupBy parameter
        let groupedData = [];

        switch (groupBy) {
            case "equipment":
                const equipmentMap = new Map();
                filteredCheckouts.forEach((checkout) => {
                    const eqId = checkout.equipment_id;
                    if (!equipmentMap.has(eqId)) {
                        equipmentMap.set(eqId, {
                            equipment_id: eqId,
                            equipment_name: checkout.Equipment?.name,
                            equipment_serial: checkout.Equipment?.serial_number,
                            equipment_image: checkout.Equipment?.image,
                            checkout_count: 0,
                            total_hours: 0,
                            unique_users: new Set(),
                        });
                    }
                    const entry = equipmentMap.get(eqId);
                    entry.checkout_count++;
                    const start = new Date(checkout.start_time);
                    const end = new Date(checkout.end_time);
                    entry.total_hours += (end - start) / (1000 * 60 * 60);
                    entry.unique_users.add(checkout.user_id);
                });
                groupedData = Array.from(equipmentMap.values()).map(
                    (entry) => ({
                        ...entry,
                        unique_users: entry.unique_users.size,
                    }),
                );
                break;

            case "user":
                const userMap = new Map();
                filteredCheckouts.forEach((checkout) => {
                    const userId = checkout.user_id;
                    if (!userMap.has(userId)) {
                        userMap.set(userId, {
                            user_id: userId,
                            user_name: `${checkout.User?.first_name} ${checkout.User?.last_name}`,
                            user_email: checkout.User?.email,
                            checkout_count: 0,
                            total_hours: 0,
                            unique_equipment: new Set(),
                        });
                    }
                    const entry = userMap.get(userId);
                    entry.checkout_count++;
                    const start = new Date(checkout.start_time);
                    const end = new Date(checkout.end_time);
                    entry.total_hours += (end - start) / (1000 * 60 * 60);
                    entry.unique_equipment.add(checkout.equipment_id);
                });
                groupedData = Array.from(userMap.values()).map((entry) => ({
                    ...entry,
                    unique_equipment: entry.unique_equipment.size,
                }));
                break;

            case "month":
                const monthMap = new Map();
                filteredCheckouts.forEach((checkout) => {
                    const monthKey = format(
                        new Date(checkout.start_time),
                        "yyyy-MM",
                    );
                    if (!monthMap.has(monthKey)) {
                        monthMap.set(monthKey, {
                            period: format(
                                new Date(checkout.start_time),
                                "MMMM yyyy",
                            ),
                            period_key: monthKey,
                            checkout_count: 0,
                            total_hours: 0,
                            unique_equipment: new Set(),
                            unique_users: new Set(),
                        });
                    }
                    const entry = monthMap.get(monthKey);
                    entry.checkout_count++;
                    const start = new Date(checkout.start_time);
                    const end = new Date(checkout.end_time);
                    entry.total_hours += (end - start) / (1000 * 60 * 60);
                    entry.unique_equipment.add(checkout.equipment_id);
                    entry.unique_users.add(checkout.user_id);
                });
                groupedData = Array.from(monthMap.values())
                    .map((entry) => ({
                        ...entry,
                        unique_equipment: entry.unique_equipment.size,
                        unique_users: entry.unique_users.size,
                    }))
                    .sort((a, b) => a.period_key.localeCompare(b.period_key));
                break;

            case "day":
                const dayMap = new Map();
                filteredCheckouts.forEach((checkout) => {
                    const dayKey = format(
                        new Date(checkout.start_time),
                        "yyyy-MM-dd",
                    );
                    if (!dayMap.has(dayKey)) {
                        dayMap.set(dayKey, {
                            period: format(
                                new Date(checkout.start_time),
                                "MMM d, yyyy",
                            ),
                            period_key: dayKey,
                            checkout_count: 0,
                            total_hours: 0,
                            unique_equipment: new Set(),
                            unique_users: new Set(),
                        });
                    }
                    const entry = dayMap.get(dayKey);
                    entry.checkout_count++;
                    const start = new Date(checkout.start_time);
                    const end = new Date(checkout.end_time);
                    entry.total_hours += (end - start) / (1000 * 60 * 60);
                    entry.unique_equipment.add(checkout.equipment_id);
                    entry.unique_users.add(checkout.user_id);
                });
                groupedData = Array.from(dayMap.values())
                    .map((entry) => ({
                        ...entry,
                        unique_equipment: entry.unique_equipment.size,
                        unique_users: entry.unique_users.size,
                    }))
                    .sort((a, b) => a.period_key.localeCompare(b.period_key));
                break;

            default:
                return res.status(400).json({
                    error: "Invalid groupBy parameter",
                });
        }

        // Return the report
        res.json({
            period: reportPeriodLabel,
            periodType: period,
            summary: {
                totalCheckouts,
                uniqueEquipment,
                uniqueUsers,
                totalHours: Math.round(totalHours * 10) / 10,
            },
            groupBy,
            data: groupedData,
        });
    } catch (error) {
        console.error("Error generating usage report:", error);
        next(error);
    }
};

module.exports = {
    GetUsageReport,
};
