const { CheckoutRecurrence, Checkout, Equipment, User } = require("../models");
const { addDays, addWeeks, addMonths, isBefore, isAfter } = require("date-fns");

const GetByCheckoutId = async (req, res, next) => {
    try {
        const { checkoutId } = req.params;
        const recurrences = await CheckoutRecurrence.findAll({
            where: { checkout_id: checkoutId },
            include: [
                {
                    model: User,
                    as: "RecurrenceCreatedBy",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "RecurrenceUpdatedBy",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
            ],
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

        // Fetch complete recurrence with associations
        const completeRecurrence = await CheckoutRecurrence.findByPk(
            recurrence.id,
            {
                include: [
                    {
                        model: User,
                        as: "RecurrenceCreatedBy",
                        attributes: ["id", "first_name", "last_name", "email"],
                    },
                    {
                        model: User,
                        as: "RecurrenceUpdatedBy",
                        attributes: ["id", "first_name", "last_name", "email"],
                    },
                ],
            },
        );

        res.status(201).json(completeRecurrence);

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            io.emit("message", {
                message: "recurrence_created",
                data: completeRecurrence,
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

        // Fetch complete recurrence with associations
        const completeRecurrence = await CheckoutRecurrence.findByPk(id, {
            include: [
                {
                    model: User,
                    as: "RecurrenceCreatedBy",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "RecurrenceUpdatedBy",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
            ],
        });

        res.json(completeRecurrence);

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            io.emit("message", {
                message: "recurrence_updated",
                data: completeRecurrence,
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
    endDate,
) => {
    const occurrences = [];

    // Both ends are stepped by the same calendar arithmetic rather than the
    // start being stepped and the end derived from a fixed millisecond
    // duration. date-fns keeps the local wall-clock time, so a 9:00-17:00
    // booking stays 9:00-17:00 across a DST boundary instead of drifting to
    // 9:00-16:00 for half the year.
    let currentStart = new Date(baseCheckout.start_time);
    let currentEnd = new Date(baseCheckout.end_time);

    // `count` is the occurrence's index within the series, and it is also what
    // names the virtual id below, so it must keep counting from the series
    // start no matter which window is being asked for.
    let count = 0;

    // `max_occurrences` is the series' own budget -- what the user booked.
    // A loop guard is a different thing, and conflating the two was a bug: the
    // old `max_occurrences || 365` bound the loop by the STEP count, which
    // increments even for steps that fall before the requested window. Any
    // daily series older than a year exhausted it before reaching today and
    // silently vanished from the calendar.
    const seriesLimit = recurrence.max_occurrences || Number.POSITIVE_INFINITY;
    const MAX_STEPS = 5000;

    // If no date range specified, generate from base checkout for next year
    const rangeStart = startDate
        ? new Date(startDate)
        : new Date(baseCheckout.start_time);
    const rangeEnd = endDate ? new Date(endDate) : addDays(new Date(), 365);

    // `recurrence_pattern` is an unconstrained STRING with no validation, so
    // an empty or null one is storable. Reading `.toLowerCase()` off it threw
    // inside the calendar fetch and took down the whole equipment view.
    const pattern = recurrence.recurrence_pattern?.toLowerCase();
    const separation = recurrence.separation_count || 1;

    const step = {
        daily: addDays,
        weekly: addWeeks,
        monthly: addMonths,
    }[pattern];

    if (!step) return occurrences; // unknown, empty or null pattern

    while (count < seriesLimit && count < MAX_STEPS) {
        // Check if we've passed the recurrence end date
        if (
            recurrence.end_date &&
            isAfter(currentStart, new Date(recurrence.end_date))
        ) {
            break;
        }

        // Nothing further can fall inside the window.
        if (isAfter(currentStart, rangeEnd)) break;

        // Include occurrence if it overlaps with requested range
        const occurrenceStartsBeforeRangeEnd =
            isBefore(currentStart, rangeEnd) ||
            currentStart.getTime() === rangeEnd.getTime();
        const occurrenceEndsAfterRangeStart =
            isAfter(currentEnd, rangeStart) ||
            currentEnd.getTime() === rangeStart.getTime();

        if (occurrenceStartsBeforeRangeEnd && occurrenceEndsAfterRangeStart) {
            occurrences.push({
                ...baseCheckout.toJSON(),
                id: `${baseCheckout.id}_${count}`,
                start_time: currentStart.toISOString(),
                end_time: currentEnd.toISOString(),
                isRecurring: true,
                recurrence_id: recurrence.id,
            });
        }

        currentStart = step(currentStart, separation);
        currentEnd = step(currentEnd, separation);
        count++;
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
