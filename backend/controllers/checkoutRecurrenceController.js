const { CheckoutRecurrence, Checkout, Equipment, User } = require("../models");
const { addDays, addWeeks, addMonths, isBefore, isAfter } = require("date-fns");

const GetByCheckoutId = async (req, res, next) => {
    try {
        const { checkoutId } = req.params;
        const recurrences = await CheckoutRecurrence.findAll({
            where: { checkout_id: checkoutId },
        });
        res.json(recurrences);
    } catch (err) {
        next(err);
    }
};

const Post = async (req, res, next) => {
    try {
        const {
            checkout_id,
            recurrence_pattern,
            separation_count,
            max_occurrences,
            day_of_week,
            day_of_month,
            month_of_year,
            end_date,
        } = req.body;

        const recurrence = await CheckoutRecurrence.create({
            checkout_id,
            recurrence_pattern,
            separation_count: separation_count || 1,
            max_occurrences,
            day_of_week,
            day_of_month,
            month_of_year,
            end_date,
        });

        res.status(201).json(recurrence);

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            io.emit("message", {
                message: "recurrence_created",
                data: recurrence,
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

        const recurrence = await CheckoutRecurrence.findByPk(id);

        if (!recurrence) {
            return res.status(404).json({ message: "Recurrence not found" });
        }

        await recurrence.update(updates);

        res.json(recurrence);

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            io.emit("message", {
                message: "recurrence_updated",
                data: recurrence,
            });
        }
    } catch (err) {
        next(err);
    }
};

const Delete = async (req, res, next) => {
    try {
        const { id } = req.params;
        const recurrence = await CheckoutRecurrence.findByPk(id);

        if (!recurrence) {
            return res.status(404).json({ message: "Recurrence not found" });
        }

        await recurrence.destroy();

        res.json({ message: "Recurrence deleted successfully" });

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            io.emit("message", { message: "recurrence_deleted", data: { id } });
        }
    } catch (err) {
        next(err);
    }
};

// Generate recurring occurrences for a checkout
const generateRecurringCheckouts = (
    baseCheckout,
    recurrence,
    startDate,
    endDate
) => {
    const occurrences = [];
    const checkoutDuration =
        new Date(baseCheckout.end_time) - new Date(baseCheckout.start_time);

    let currentDate = new Date(baseCheckout.start_time);
    let count = 0;
    const maxCount = recurrence.max_occurrences || 365; // Default max for ~1 year of daily events

    // If no date range specified, generate from base checkout for next year
    const rangeStart = startDate
        ? new Date(startDate)
        : new Date(baseCheckout.start_time);
    const rangeEnd = endDate ? new Date(endDate) : addDays(new Date(), 365);

    while (count < maxCount) {
        // Check if we've passed the recurrence end date
        if (
            recurrence.end_date &&
            isAfter(currentDate, new Date(recurrence.end_date))
        ) {
            break;
        }

        const occurrenceEnd = new Date(
            currentDate.getTime() + checkoutDuration
        );

        // Include occurrence if it overlaps with requested range
        const occurrenceStartsBeforeRangeEnd =
            isBefore(currentDate, rangeEnd) ||
            currentDate.getTime() === rangeEnd.getTime();
        const occurrenceEndsAfterRangeStart =
            isAfter(occurrenceEnd, rangeStart) ||
            occurrenceEnd.getTime() === rangeStart.getTime();

        if (occurrenceStartsBeforeRangeEnd && occurrenceEndsAfterRangeStart) {
            occurrences.push({
                ...baseCheckout.toJSON(),
                id: `${baseCheckout.id}_${count}`,
                start_time: currentDate.toISOString(),
                end_time: occurrenceEnd.toISOString(),
                isRecurring: true,
                recurrence_id: recurrence.id,
            });
        }

        // Calculate next occurrence based on pattern
        switch (recurrence.recurrence_pattern.toLowerCase()) {
            case "daily":
                currentDate = addDays(currentDate, recurrence.separation_count);
                break;
            case "weekly":
                currentDate = addWeeks(
                    currentDate,
                    recurrence.separation_count
                );
                break;
            case "monthly":
                currentDate = addMonths(
                    currentDate,
                    recurrence.separation_count
                );
                break;
            default:
                return occurrences; // Unknown pattern
        }

        count++;

        // Safety check for date range
        if (endDate && isAfter(currentDate, new Date(endDate))) {
            break;
        }
    }

    return occurrences;
};

module.exports = {
    GetByCheckoutId,
    Post,
    Update,
    Delete,
    generateRecurringCheckouts,
};
