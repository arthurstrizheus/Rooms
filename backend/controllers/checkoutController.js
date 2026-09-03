const { Checkout, Equipment, User, CheckoutRecurrence } = require("../models");
const { sequelize } = require("../config/database");
const { Sequelize } = require("sequelize");
const {
    startOfDay,
    endOfDay,
    differenceInDays,
    addDays,
    addWeeks,
    addMonths,
    isBefore,
    isAfter,
} = require("date-fns");
const {
    generateRecurringCheckouts,
} = require("./checkoutRecurrenceController");
const { GetSubscribers } = require("./equipmentAlertController");
const {
    GetApproverEmails,
    CanUserApprove,
    FilterApprovableEquipmentIds,
} = require("./equipmentApproverController");
const {
    sendCheckoutCreatedEmail,
    sendEquipmentCheckedOutEmail,
    sendEquipmentReturnedEmail,
    sendEquipmentAvailableEmail,
    sendCheckoutCancelledEmail,
    sendScheduledOnBehalfEmail,
    sendCheckoutApprovalRequestEmail,
    sendCheckoutApprovedEmail,
    sendCheckoutDeclinedEmail,
} = require("./mailController");

// Helper function to check if two time ranges overlap
const timeRangesOverlap = (start1, end1, start2, end2) => {
    return start1 < end2 && start2 < end1;
};

// Helper function to get GCD (Greatest Common Divisor)
const gcd = (a, b) => {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b !== 0) {
        const temp = b;
        b = a % b;
        a = temp;
    }
    return a;
};

// Convert recurrence pattern to days
const getIntervalDays = (pattern, separation) => {
    switch (pattern.toLowerCase()) {
        case "daily":
            return separation;
        case "weekly":
            return separation * 7;
        case "monthly":
            return separation * 30; // Approximate for conflict detection
        default:
            return separation;
    }
};

// The calendar arithmetic a recurrence pattern actually advances by. This is
// the same table `generateRecurringCheckouts` expands a series with, so
// anything that has to land ON the series' own phase has to use it too.
const RECURRENCE_STEPS = {
    daily: addDays,
    weekly: addWeeks,
    monthly: addMonths,
};

// Advance a series' base time by whole recurrence intervals.
// date-fns keeps the LOCAL wall-clock time, so a 9:00 booking is still a 9:00
// booking on the far side of a DST boundary; adding a fixed number of
// milliseconds would slide it by an hour for half the year.
const stepOccurrence = (date, pattern, separation, intervals) => {
    // recurrence_pattern is an unvalidated STRING, so an empty or unknown one
    // is storable. A series with such a pattern expands to nothing, so we can
    // never legitimately be splitting one -- fall back to days rather than
    // returning an Invalid Date into a NOT NULL column.
    const step =
        RECURRENCE_STEPS[String(pattern || "").toLowerCase()] || addDays;
    return step(new Date(date), (separation || 1) * intervals);
};

// Mathematical check if two recurring patterns will ever overlap
const recurringPatternsConflict = (
    checkout1,
    recurrence1,
    checkout2,
    recurrence2,
) => {
    const start1 = new Date(checkout1.start_time);
    const end1 = new Date(checkout1.end_time);
    const start2 = new Date(checkout2.start_time);
    const end2 = new Date(checkout2.end_time);

    // First check: do the time windows overlap (time of day)?
    const timeOfDay1Start = start1.getHours() * 60 + start1.getMinutes();
    const timeOfDay1End = end1.getHours() * 60 + end1.getMinutes();
    const timeOfDay2Start = start2.getHours() * 60 + start2.getMinutes();
    const timeOfDay2End = end2.getHours() * 60 + end2.getMinutes();

    // If time windows don't overlap, no conflict possible
    if (!(timeOfDay1Start < timeOfDay2End && timeOfDay2Start < timeOfDay1End)) {
        return false;
    }

    // Get recurrence intervals in days
    const interval1 = getIntervalDays(
        recurrence1.recurrence_pattern,
        recurrence1.separation_count,
    );
    const interval2 = getIntervalDays(
        recurrence2.recurrence_pattern,
        recurrence2.separation_count,
    );

    // Calculate day difference between start dates
    const dayDiff = Math.abs(differenceInDays(start1, start2));

    // Mathematical check: Two recurring patterns align if GCD(interval1, interval2) divides dayDiff
    // This means: if there exist integers i, j such that start1 + i*interval1 = start2 + j*interval2
    const g = gcd(interval1, interval2);

    if (dayDiff % g !== 0) {
        // Patterns never align on the same day
        return false;
    }

    // Patterns do align - check if within valid date ranges
    // Check if the date ranges of the two recurrences overlap
    const end1Date = recurrence1.end_date
        ? new Date(recurrence1.end_date)
        : null;
    const end2Date = recurrence2.end_date
        ? new Date(recurrence2.end_date)
        : null;

    // If recurrence1 ends before recurrence2 starts, no conflict
    if (end1Date && end1Date < start2) {
        return false;
    }

    // If recurrence2 ends before recurrence1 starts, no conflict
    if (end2Date && end2Date < start1) {
        return false;
    }

    return true;
};

// Check if a single checkout conflicts with a recurring pattern
const singleConflictsWithRecurring = (
    singleStart,
    singleEnd,
    recurringCheckout,
    recurrence,
) => {
    const recurStart = new Date(recurringCheckout.start_time);
    const recurEnd = new Date(recurringCheckout.end_time);

    // Check if time windows overlap
    if (!timeRangesOverlap(singleStart, singleEnd, recurStart, recurEnd)) {
        return false;
    }

    // Calculate day difference
    const dayDiff = differenceInDays(singleStart, recurStart);
    const interval = getIntervalDays(
        recurrence.recurrence_pattern,
        recurrence.separation_count,
    );

    // Check if single checkout falls on a recurring occurrence day
    if (dayDiff % interval !== 0) {
        return false;
    }

    // If dayDiff is negative, check if it's a valid past occurrence (shouldn't happen for future bookings)
    if (dayDiff < 0) {
        return false;
    }

    // Check if within recurrence end date
    if (recurrence.end_date && singleStart > new Date(recurrence.end_date)) {
        return false;
    }

    return true;
};

// Occurrences of a recurring reservation exist only in memory: there is one
// head row, and generateRecurringCheckouts hands every expanded occurrence a
// virtual id of the form "{headId}_{index}". Handing one of those straight to
// findByPk produced `WHERE id = '4_3'` against an INTEGER primary key, which
// MSSQL rejects with a conversion error, so anything reached by a virtual id
// has to resolve it to the head first.
const parseCheckoutId = (id) => {
    const isVirtualOccurrence = typeof id === "string" && id.includes("_");

    if (!isVirtualOccurrence) {
        return {
            isVirtualOccurrence,
            baseCheckoutId: Number(id),
            occurrenceIndex: null,
        };
    }

    const [rawBaseId, rawOccurrenceIndex] = id.split("_");

    return {
        isVirtualOccurrence,
        // Numbers, not strings: these ids end up in an Op.ne against an
        // INTEGER column as well as in findByPk.
        baseCheckoutId: Number(rawBaseId),
        occurrenceIndex: Number(rawOccurrenceIndex),
    };
};

// A 409 goes back to whoever is trying to book, who usually has nothing to do
// with the booking they collided with. We used to hand back the whole Checkout
// row -- notes, project_number, scheduled_on_behalf_of and the booker -- which
// leaked one team's reservation details to anyone who happened to pick an
// overlapping time. All the caller can act on is WHEN the equipment is taken.
const toConflictWindow = (existing) => ({
    start_time: existing.start_time,
    end_time: existing.end_time,
});

/**
 * Was this reservation booked on behalf of the given user?
 *
 * `scheduled_on_behalf_of` is a free-text name rather than a user id, so the
 * only way to answer is to match the name back to a row. Extracted because the
 * cancel path in Delete and the status path in Update both need exactly this
 * question and had drifted to only one of them asking it.
 */
const isScheduledOnBehalfOfUser = async (checkout, userId) => {
    if (!checkout?.scheduled_on_behalf_of || !userId) return false;

    const nameParts = checkout.scheduled_on_behalf_of.split(" ");
    if (nameParts.length < 2) return false;

    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ");

    // Op.iLike is PostgreSQL-only and threw against this MSSQL connection.
    // MSSQL collations are case-insensitive by default, so Op.like already
    // gives the intended match.
    const scheduledForUser = await User.findOne({
        where: {
            first_name: { [Sequelize.Op.like]: firstName },
            last_name: { [Sequelize.Op.like]: lastName },
        },
    });

    return Boolean(scheduledForUser && scheduledForUser.id === userId);
};

/**
 * Approval notifications.
 *
 * Deliberately fire-and-forget, matching how the rest of this controller sends
 * mail after responding: a slow mail server must not hold the HTTP response,
 * and a dead one must not fail a decision that has already been written.
 *
 * All three of these emails were written, exported and then never called from
 * anywhere. Until now a reservation could sit pending with nobody told it
 * existed, and be approved or declined with nobody told the outcome.
 */
const notifyApprovalRequested = (checkout, equipment) => {
    (async () => {
        try {
            const recipients = await GetApproverEmails(equipment);
            if (!recipients?.length) {
                // Worth a log rather than silence: it means a reservation is
                // sitting in a queue that nobody is looking at.
                console.warn(
                    `No approvers resolved for equipment ${equipment?.id} — approval request not sent`,
                );
                return;
            }
            // One email addressed to all of them, as the subscriber emails
            // already do. They are colleagues on the same equipment.
            await sendCheckoutApprovalRequestEmail(
                checkout,
                equipment,
                recipients,
            );
        } catch (err) {
            console.error(
                "Error sending approval request email:",
                err?.message || err,
            );
        }
    })();
};

const notifyApprovalDecision = (checkout, equipment, decision, reason) => {
    (async () => {
        try {
            let requesterEmail = checkout?.User?.email;
            if (!requesterEmail && checkout?.user_id) {
                const requester = await User.findByPk(checkout.user_id);
                requesterEmail = requester?.email;
            }
            if (!requesterEmail) return;

            if (decision === "approved") {
                await sendCheckoutApprovedEmail(
                    checkout,
                    equipment,
                    requesterEmail,
                );
            } else {
                await sendCheckoutDeclinedEmail(
                    checkout,
                    equipment,
                    requesterEmail,
                    reason,
                );
            }
        } catch (err) {
            console.error(
                `Error sending checkout ${decision} email:`,
                err?.message || err,
            );
        }
    })();
};

// Helper function to check for conflicts - reusable for both Post and Update
const checkConflicts = async (
    equipmentId,
    newStart,
    newEnd,
    recurrencePattern = null,
    separationCount = null,
    recurrenceEndDate = null,
    excludeCheckoutId = null,
) => {
    // Fetch all checkouts for this equipment (excluding the one being updated)
    const whereClause = {
        equipment_id: equipmentId,
        status: {
            [Sequelize.Op.notIn]: ["cancelled", "returned"],
        },
    };

    if (excludeCheckoutId) {
        whereClause.id = { [Sequelize.Op.ne]: excludeCheckoutId };
    }

    const existingCheckouts = await Checkout.findAll({
        where: whereClause,
        include: [
            {
                model: CheckoutRecurrence,
                as: "Recurrence",
                required: false,
            },
        ],
    });

    // Check for conflicts
    const conflicts = [];

    for (const existing of existingCheckouts) {
        if (existing.Recurrence && recurrencePattern) {
            // Both are recurring - use mathematical pattern analysis
            const newRecurrence = {
                recurrence_pattern: recurrencePattern,
                separation_count: separationCount || 1,
                end_date: recurrenceEndDate,
            };
            const newCheckout = { start_time: newStart, end_time: newEnd };

            if (
                recurringPatternsConflict(
                    newCheckout,
                    newRecurrence,
                    existing,
                    existing.Recurrence,
                )
            ) {
                conflicts.push(existing);
            }
        } else if (existing.Recurrence && !recurrencePattern) {
            // Existing is recurring, new is single - mathematical check
            if (
                singleConflictsWithRecurring(
                    newStart,
                    newEnd,
                    existing,
                    existing.Recurrence,
                )
            ) {
                conflicts.push(existing);
            }
        } else if (!existing.Recurrence && recurrencePattern) {
            // New is recurring, existing is single - mathematical check
            const existingStart = new Date(existing.start_time);
            const existingEnd = new Date(existing.end_time);

            const newRecurrence = {
                recurrence_pattern: recurrencePattern,
                separation_count: separationCount || 1,
                end_date: recurrenceEndDate,
            };

            if (
                singleConflictsWithRecurring(
                    existingStart,
                    existingEnd,
                    { start_time: newStart, end_time: newEnd },
                    newRecurrence,
                )
            ) {
                conflicts.push(existing);
            }
        } else {
            // Both are single checkouts - simple overlap check
            const existingStart = new Date(existing.start_time);
            const existingEnd = new Date(existing.end_time);
            if (
                timeRangesOverlap(newStart, newEnd, existingStart, existingEnd)
            ) {
                conflicts.push(existing);
            }
        }
    }

    if (conflicts.length > 0) {
        throw {
            status: 409,
            message:
                "Time conflict: Equipment is already booked for this time period",
            conflicts: conflicts.map(toConflictWindow),
        };
    }
};

const GetAll = async (req, res, next) => {
    try {
        const checkouts = await Checkout.findAll({
            include: [
                {
                    model: Equipment,
                    attributes: ["id", "name", "serial_number", "asset_number"],
                },
                {
                    model: User,
                    as: "User",
                    attributes: [
                        "id",
                        "username",
                        "first_name",
                        "last_name",
                        "email",
                    ],
                },
                {
                    model: User,
                    as: "ApprovedBy",
                    attributes: ["id", "username", "first_name", "last_name"],
                },
            ],
        });
        // Sort in JS: an unfiltered ORDER BY forces a SQL Sort operator that
        // needs a workspace memory grant and queues on a memory-starved server
        checkouts.sort(
            (a, b) => new Date(b.start_time) - new Date(a.start_time),
        );
        res.json(checkouts);
    } catch (err) {
        next(err);
    }
};

const GetByEquipmentId = async (req, res, next) => {
    try {
        const { equipmentId } = req.params;
        const { start, end } = req.query; // Optional date range for calendar view

        const whereClause = { equipment_id: equipmentId };

        // For calendar view, exclude cancelled and returned checkouts
        if (start && end) {
            whereClause.status = {
                [Sequelize.Op.notIn]: ["cancelled", "returned"],
            };
        }

        const checkouts = await Checkout.findAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: "User",
                    attributes: [
                        "id",
                        "username",
                        "first_name",
                        "last_name",
                        "email",
                    ],
                },
                {
                    model: User,
                    as: "ApprovedBy",
                    attributes: ["id", "username", "first_name", "last_name"],
                },
                {
                    model: User,
                    as: "CheckoutCreatedBy",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "CheckoutUpdatedBy",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: CheckoutRecurrence,
                    as: "Recurrence",
                    required: false,
                },
            ],
            order: [["start_time", "ASC"]],
        });

        // Expand recurring checkouts ONLY if start/end date range is provided (calendar view)
        // For history view, return base checkouts without expansion
        if (start && end) {
            let allCheckouts = [];
            for (const checkout of checkouts) {
                if (checkout.Recurrence) {
                    // This is a recurring checkout, generate occurrences
                    const occurrences = generateRecurringCheckouts(
                        checkout,
                        checkout.Recurrence,
                        start,
                        end,
                    );
                    allCheckouts = allCheckouts.concat(occurrences);
                } else {
                    // Regular single checkout
                    allCheckouts.push(checkout);
                }
            }
            res.json(allCheckouts);
        } else {
            // History view - return base checkouts without expanding
            res.json(checkouts);
        }
    } catch (err) {
        next(err);
    }
};

/**
 * The reservations this user can actually act on.
 *
 * This used to return every pending reservation in the system to anyone who
 * asked -- no role check, no scoping, no reference to `req.user` at all. It
 * also drives the sidebar badge and the nav guard, so every user saw a badge
 * counting everyone else's requests and a queue full of decisions that were
 * not theirs to make.
 *
 * Scoping here fixes all three at once, because the badge and the nav item are
 * both derived from this one response.
 */
const GetPendingApprovals = async (req, res, next) => {
    try {
        const checkouts = await Checkout.findAll({
            where: {
                status: "pending",
            },
            include: [
                {
                    model: Equipment,
                    attributes: [
                        "id",
                        "name",
                        "serial_number",
                        "asset_number",
                        "requires_approval",
                        "location",
                    ],
                },
                {
                    model: User,
                    as: "User",
                    attributes: [
                        "id",
                        "username",
                        "first_name",
                        "last_name",
                        "email",
                    ],
                },
            ],
            order: [["start_time", "ASC"]],
        });

        // One pass over the distinct equipment ids rather than a check per
        // reservation -- a directory round trip per row would be slow and
        // mostly repeated, since a queue is usually a handful of items spread
        // over fewer pieces of equipment.
        const equipmentIds = [
            ...new Set(checkouts.map((c) => c.equipment_id).filter(Boolean)),
        ];
        const approvable = await FilterApprovableEquipmentIds(
            req.user,
            equipmentIds,
        );

        res.json(
            checkouts.filter((c) => approvable.has(Number(c.equipment_id))),
        );
    } catch (err) {
        next(err);
    }
};

const GetByUserId = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const checkouts = await Checkout.findAll({
            where: { user_id: userId },
            include: [
                {
                    model: Equipment,
                },
                {
                    model: User,
                    as: "ApprovedBy",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
                {
                    model: CheckoutRecurrence,
                    as: "Recurrence",
                    required: false,
                },
            ],
            order: [["start_time", "DESC"]],
        });
        res.json(checkouts);
    } catch (err) {
        next(err);
    }
};

const Post = async (req, res, next) => {
    try {
        const {
            equipment_id,
            user_id,
            start_time,
            end_time,
            notes,
            project_number,
            scheduled_on_behalf_of,
            recurrence_pattern,
            separation_count,
            max_occurrences,
            recurrence_end_date,
        } = req.body;

        // Fetch all checkouts for this equipment
        const existingCheckouts = await Checkout.findAll({
            where: {
                equipment_id,
                status: {
                    [Sequelize.Op.notIn]: ["cancelled", "returned"],
                },
            },
            include: [
                {
                    model: CheckoutRecurrence,
                    as: "Recurrence",
                    required: false,
                },
            ],
        });

        // Check for conflicts
        const newStart = new Date(start_time);
        const newEnd = new Date(end_time);
        const conflicts = [];

        for (const existing of existingCheckouts) {
            if (existing.Recurrence && recurrence_pattern) {
                // Both are recurring - use mathematical pattern analysis
                const newRecurrence = {
                    recurrence_pattern,
                    separation_count: separation_count || 1,
                    end_date: recurrence_end_date,
                };
                const newCheckout = { start_time, end_time };

                if (
                    recurringPatternsConflict(
                        newCheckout,
                        newRecurrence,
                        existing,
                        existing.Recurrence,
                    )
                ) {
                    conflicts.push(existing);
                }
            } else if (existing.Recurrence && !recurrence_pattern) {
                // Existing is recurring, new is single - mathematical check
                if (
                    singleConflictsWithRecurring(
                        newStart,
                        newEnd,
                        existing,
                        existing.Recurrence,
                    )
                ) {
                    conflicts.push(existing);
                }
            } else if (!existing.Recurrence && recurrence_pattern) {
                // New is recurring, existing is single - mathematical check
                const existingStart = new Date(existing.start_time);
                const existingEnd = new Date(existing.end_time);

                const newRecurrence = {
                    recurrence_pattern,
                    separation_count: separation_count || 1,
                    end_date: recurrence_end_date,
                };

                if (
                    singleConflictsWithRecurring(
                        existingStart,
                        existingEnd,
                        { start_time, end_time },
                        newRecurrence,
                    )
                ) {
                    conflicts.push(existing);
                }
            } else {
                // Both are single checkouts - simple overlap check
                const existingStart = new Date(existing.start_time);
                const existingEnd = new Date(existing.end_time);
                if (
                    timeRangesOverlap(
                        newStart,
                        newEnd,
                        existingStart,
                        existingEnd,
                    )
                ) {
                    conflicts.push(existing);
                }
            }
        }

        if (conflicts.length > 0) {
            return res.status(409).json({
                message:
                    "Time conflict: Equipment is already booked for this time period",
                conflicts: conflicts.map(toConflictWindow),
            });
        }

        // Check if equipment requires approval
        const equipment = await Equipment.findByPk(equipment_id);
        if (!equipment) {
            return res.status(404).json({ message: "Equipment not found" });
        }

        // Check if equipment can be booked
        if (equipment.can_book === false) {
            return res.status(403).json({
                message: "This equipment is not available for booking",
            });
        }

        const checkoutData = {
            equipment_id,
            user_id,
            start_time,
            end_time,
            project_number,
            notes,
            scheduled_on_behalf_of,
            status: equipment.requires_approval ? "pending" : "auto-approved",
            repeats: recurrence_pattern || null,
        };

        if (!equipment.requires_approval) {
            checkoutData.approved_at = new Date();
        }

        const checkout = await Checkout.create(checkoutData);

        // If this is a recurring checkout, create the recurrence record
        if (recurrence_pattern) {
            const recurrence = await CheckoutRecurrence.create({
                recurrence_pattern,
                separation_count: separation_count || 1,
                max_occurrences: max_occurrences || null,
                end_date: recurrence_end_date || null,
            });

            // Update checkout with recurrence_id
            await checkout.update({ recurrence_id: recurrence.id });
        }

        // Fetch complete checkout data with associations
        const completeCheckout = await Checkout.findByPk(checkout.id, {
            include: [
                {
                    model: Equipment,
                    attributes: ["id", "name", "serial_number", "asset_number"],
                },
                {
                    model: User,
                    as: "User",
                    attributes: [
                        "id",
                        "username",
                        "first_name",
                        "last_name",
                        "email",
                    ],
                },
                {
                    model: CheckoutRecurrence,
                    as: "Recurrence",
                    required: false,
                },
                {
                    model: User,
                    as: "CheckoutCreatedBy",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "CheckoutUpdatedBy",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
            ],
        });

        res.status(201).json(completeCheckout);

        // A reservation that needs approval is useless until somebody knows it
        // is waiting, so this goes to the equipment's own approvers -- not to
        // every administrator, and not to the alert subscribers below, who are
        // watching the equipment rather than gatekeeping it.
        if (equipment.requires_approval) {
            notifyApprovalRequested(completeCheckout, equipment);
        }

        // Send email notifications to subscribers
        (async () => {
            try {
                const subscribers = await GetSubscribers(
                    equipment_id,
                    "checkout_created",
                );
                if (subscribers && subscribers.length > 0) {
                    await sendCheckoutCreatedEmail(
                        completeCheckout,
                        equipment,
                        subscribers,
                    );
                }
            } catch (emailError) {
                console.error(
                    "Error sending checkout created emails:",
                    emailError,
                );
            }
        })();

        // Send email to person scheduled on behalf of (if applicable)
        if (completeCheckout.scheduled_on_behalf_of) {
            (async () => {
                try {
                    // Get the user who created the reservation
                    const schedulingUser = await User.findByPk(user_id);
                    const schedulingUserName = schedulingUser
                        ? `${schedulingUser.first_name || ""} ${
                              schedulingUser.last_name || ""
                          }`.trim() || schedulingUser.username
                        : "A user";

                    // Try to find the user by name to get their email
                    const nameParts =
                        completeCheckout.scheduled_on_behalf_of.split(" ");
                    let scheduledForEmail = null;

                    if (nameParts.length >= 2) {
                        const firstName = nameParts[0];
                        const lastName = nameParts.slice(1).join(" ");

                        // Op.iLike is PostgreSQL-only; against this MSSQL
                        // connection it threw, so the on-behalf-of recipient
                        // was never looked up and the email never went out.
                        // MSSQL collations are case-insensitive by default,
                        // so a plain Op.like is already the case-insensitive
                        // match this was reaching for.
                        const scheduledForUser = await User.findOne({
                            where: {
                                first_name: {
                                    [Sequelize.Op.like]: firstName,
                                },
                                last_name: { [Sequelize.Op.like]: lastName },
                            },
                        });

                        if (scheduledForUser?.email) {
                            scheduledForEmail = scheduledForUser.email;
                        }
                    }

                    // If we found an email, send the notification
                    if (scheduledForEmail) {
                        await sendScheduledOnBehalfEmail(
                            completeCheckout,
                            equipment,
                            schedulingUserName,
                            scheduledForEmail,
                        );
                    } else {
                        console.log(
                            `Could not find email for scheduled_on_behalf_of: ${completeCheckout.scheduled_on_behalf_of}`,
                        );
                    }
                } catch (emailError) {
                    console.error(
                        "Error sending scheduled on behalf email:",
                        emailError,
                    );
                }
            })();
        }

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            io.emit("message", {
                message: "checkout_created",
                data: completeCheckout,
            });
        }
    } catch (err) {
        next(err);
    }
};

const Update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { updateMode, ...updates } = req.body; // updateMode: 'this', 'following', 'all'

        // Get the authenticated user from request (set by auth middleware)
        const userId = req.user?.id;
        const isAdmin = req.user?.admin;

        // Check if this is a virtual occurrence ID (e.g., "4_3").
        // `occurrenceIndex` is the occurrence's position in the series, and it
        // is the only thing that tells a split where the series' own phase is.
        const { isVirtualOccurrence, baseCheckoutId, occurrenceIndex } =
            parseCheckoutId(id);
        let occurrenceDate = null;

        if (isVirtualOccurrence) {
            if (
                !Number.isInteger(baseCheckoutId) ||
                !Number.isInteger(occurrenceIndex) ||
                occurrenceIndex < 0
            ) {
                return res.status(400).json({
                    message: "Malformed recurring occurrence id",
                });
            }

            // The updates should contain the occurrence start_time for this specific occurrence
            if (!updates.occurrence_start_time) {
                return res.status(400).json({
                    message:
                        "occurrence_start_time is required when editing a recurring occurrence",
                });
            }
            occurrenceDate = new Date(updates.occurrence_start_time);
        }

        const checkout = await Checkout.findByPk(baseCheckoutId, {
            include: [
                {
                    model: CheckoutRecurrence,
                    as: "Recurrence",
                    required: false,
                },
            ],
        });

        if (!checkout) {
            return res.status(404).json({ message: "Checkout not found" });
        }

        // Captured before any write, because whether a cancellation is a
        // decline depends on what the reservation was before it changed.
        const statusBeforeUpdate = checkout.status;

        // ---- Status changes are the approval decision -------------------
        //
        // This is the route the approval queue actually uses, and its old rule
        // was "non-admins may only set cancelled". Declining IS setting
        // cancelled, so that let any signed-in user decline anyone else's
        // reservation. It also silently deleted a disallowed status instead of
        // refusing, so the queue reported "approved" for requests where
        // nothing had happened.
        //
        // Approving is now the equipment's own approver test. Cancelling stays
        // open to the people who could always cancel -- the booker and whoever
        // it was booked on behalf of -- plus its approvers.
        if (updates.status) {
            const equipment = await Equipment.findByPk(checkout.equipment_id);
            const canApprove = await CanUserApprove(req.user, equipment);
            const isCancelling = updates.status === "cancelled";

            let permitted = canApprove;

            if (isCancelling && !permitted) {
                permitted =
                    checkout.user_id === userId ||
                    (await isScheduledOnBehalfOfUser(checkout, userId));
            }

            if (!permitted) {
                return res.status(403).json({
                    message: isCancelling
                        ? "You cannot cancel this reservation."
                        : "You are not an approver for this equipment.",
                });
            }

            // The decider is whoever holds the session. It used to be read
            // from the body, so the queue could attribute a decision to anyone.
            if (!isCancelling) {
                updates.approved_by_user_id = userId;
                updates.approved_at = new Date();
            } else {
                delete updates.approved_by_user_id;
            }
        }

        // Handle recurring checkout edits
        if (checkout.Recurrence && isVirtualOccurrence) {
            const recurrence = checkout.Recurrence;

            if (updateMode === "this" || updateMode === "current") {
                // Edit single occurrence:
                // 1. End current recurrence the day before this occurrence
                // 2. Create new single checkout for this edited occurrence
                // 3. Continue the series from the NEXT occurrence with the
                //    original pattern
                const dayBefore = addDays(occurrenceDate, -1);

                // Store original end_date before modifying
                const originalEndDate = recurrence.end_date;

                // This occurrence's own end time. The expander steps both ends
                // of the head row by the same calendar arithmetic, so that is
                // how we rebuild it here. The old fallback --
                // addDays(occurrenceDate, durationInMilliseconds / oneDay) --
                // handed addDays a fraction, which date-fns truncates to 0, so
                // any booking shorter than a day that did not send an explicit
                // end_time was saved with end_time === start_time.
                const occurrenceEnd = stepOccurrence(
                    checkout.end_time,
                    recurrence.recurrence_pattern,
                    recurrence.separation_count,
                    occurrenceIndex,
                );

                // Check for conflicts with the new single checkout
                const newStart = new Date(updates.start_time || occurrenceDate);
                const newEnd = new Date(updates.end_time || occurrenceEnd);

                // Cancelling can never create a conflict, so skip the check
                // for it exactly as the "all" branch does. And the head row
                // has to be excluded: without it the series collided with
                // itself and every "this" edit 409'd against the occurrence it
                // was editing.
                if (updates.status !== "cancelled") {
                    await checkConflicts(
                        checkout.equipment_id,
                        newStart,
                        newEnd,
                        null,
                        null,
                        null,
                        baseCheckoutId,
                    );
                }

                // One transaction for the whole split. The old recurrence is
                // truncated first, so a create failing afterwards (a conflict,
                // a validation or FK error) used to leave the series cut short
                // with no replacement -- every future reservation gone for good
                // and a 500 for the user.
                const completeNewCheckout = await sequelize.transaction(
                    async (t) => {
                        // End the original recurrence before this occurrence
                        await recurrence.update(
                            { end_date: dayBefore },
                            { transaction: t },
                        );

                        // Create new single checkout for this specific occurrence with edited times
                        const newCheckout = await Checkout.create(
                            {
                                equipment_id: checkout.equipment_id,
                                user_id: checkout.user_id,
                                start_time: newStart,
                                end_time: newEnd,
                                // `!== undefined` rather than `||` so clearing
                                // a field actually clears it instead of having
                                // the previous value quietly restored.
                                notes:
                                    updates.notes !== undefined
                                        ? updates.notes
                                        : checkout.notes,
                                project_number:
                                    updates.project_number !== undefined
                                        ? updates.project_number
                                        : checkout.project_number,
                                scheduled_on_behalf_of:
                                    updates.scheduled_on_behalf_of !== undefined
                                        ? updates.scheduled_on_behalf_of
                                        : checkout.scheduled_on_behalf_of,
                                status: updates.status || checkout.status,
                                approved_by_user_id:
                                    checkout.approved_by_user_id,
                                approved_at: checkout.approved_at,
                                // Split OUT of the series, so this row carries
                                // no recurrence_id and does not repeat.
                                repeats: null,
                                // user_id stays the original booker -- they
                                // still own the reservation. The audit columns
                                // are the editor, the same source
                                // auditMiddleware uses. Leaving them unset gave
                                // every row born from an edit a blank
                                // "created by" in the detail dialog.
                                created_by: userId,
                                updated_by: userId,
                            },
                            { transaction: t },
                        );

                        // Continue the series with the ORIGINAL pattern and times
                        if (
                            !originalEndDate ||
                            new Date(originalEndDate) > occurrenceDate
                        ) {
                            const newRecurrence =
                                await CheckoutRecurrence.create(
                                    {
                                        recurrence_pattern:
                                            recurrence.recurrence_pattern,
                                        separation_count:
                                            recurrence.separation_count,
                                        max_occurrences:
                                            recurrence.max_occurrences,
                                        day_of_week: recurrence.day_of_week,
                                        day_of_month: recurrence.day_of_month,
                                        month_of_year: recurrence.month_of_year,
                                        end_date: originalEndDate,
                                    },
                                    { transaction: t },
                                );

                            // The continuation has to resume on the series' own
                            // phase. This used to be addDays(occurrenceDate, 1)
                            // -- one CALENDAR day later whatever the pattern --
                            // so editing a single occurrence of a weekly Monday
                            // series moved every remaining occurrence to
                            // Tuesday, and a monthly series slipped a day per
                            // edit.
                            const nextIndex = occurrenceIndex + 1;
                            const newStartTime = stepOccurrence(
                                checkout.start_time,
                                recurrence.recurrence_pattern,
                                recurrence.separation_count,
                                nextIndex,
                            );
                            const newEndTime = stepOccurrence(
                                checkout.end_time,
                                recurrence.recurrence_pattern,
                                recurrence.separation_count,
                                nextIndex,
                            );

                            await Checkout.create(
                                {
                                    equipment_id: checkout.equipment_id,
                                    user_id: checkout.user_id,
                                    start_time: newStartTime,
                                    end_time: newEndTime,
                                    notes: checkout.notes,
                                    project_number: checkout.project_number,
                                    scheduled_on_behalf_of:
                                        checkout.scheduled_on_behalf_of,
                                    status: checkout.status,
                                    approved_by_user_id:
                                        checkout.approved_by_user_id,
                                    approved_at: checkout.approved_at,
                                    recurrence_id: newRecurrence.id,
                                    repeats: recurrence.recurrence_pattern,
                                    created_by: userId,
                                    updated_by: userId,
                                },
                                { transaction: t },
                            );
                        }

                        // Fetch complete checkout with audit fields
                        return Checkout.findByPk(newCheckout.id, {
                            include: [
                                {
                                    model: User,
                                    as: "User",
                                    attributes: [
                                        "id",
                                        "username",
                                        "first_name",
                                        "last_name",
                                        "email",
                                    ],
                                },
                                {
                                    model: User,
                                    as: "ApprovedBy",
                                    attributes: [
                                        "id",
                                        "username",
                                        "first_name",
                                        "last_name",
                                    ],
                                },
                                {
                                    model: User,
                                    as: "CheckoutCreatedBy",
                                    attributes: [
                                        "id",
                                        "first_name",
                                        "last_name",
                                        "email",
                                    ],
                                },
                                {
                                    model: User,
                                    as: "CheckoutUpdatedBy",
                                    attributes: [
                                        "id",
                                        "first_name",
                                        "last_name",
                                        "email",
                                    ],
                                },
                            ],
                            transaction: t,
                        });
                    },
                );

                // Emit socket event
                const io = req.app.get("io");
                if (io) {
                    io.emit("message", {
                        message: "checkout_updated",
                        data: completeNewCheckout,
                    });
                }

                return res.json(completeNewCheckout);
            } else if (updateMode === "following" || updateMode === "next") {
                // Edit this and following: End current recurrence before this date,
                // create new checkout with new recurrence from this date
                const dayBefore = addDays(occurrenceDate, -1);

                // Store original end_date before modifying
                const originalEndDate = recurrence.end_date;

                // This occurrence's own end time, rebuilt from the head row the
                // way the expander built it. The old fallback fed addDays a
                // fractional day count, which date-fns truncates to 0, so a
                // sub-day booking with no explicit end_time was saved with
                // end_time === start_time. The new head starts AT this
                // occurrence, so unlike the "this" branch it is already on the
                // series' phase and needs no stepping.
                const occurrenceEnd = stepOccurrence(
                    checkout.end_time,
                    recurrence.recurrence_pattern,
                    recurrence.separation_count,
                    occurrenceIndex,
                );

                // Check for conflicts with the new recurring checkout
                const newStart = new Date(updates.start_time || occurrenceDate);
                const newEnd = new Date(updates.end_time || occurrenceEnd);
                const newPattern =
                    updates.recurrence_pattern || recurrence.recurrence_pattern;
                const newSeparation =
                    updates.separation_count || recurrence.separation_count;
                const newEndDate =
                    updates.recurrence_end_date || recurrence.end_date;

                // Same two fixes as the "this" branch: a cancellation cannot
                // conflict, and without excluding the head row the series
                // conflicted with itself and every "following" edit 409'd.
                if (updates.status !== "cancelled") {
                    await checkConflicts(
                        checkout.equipment_id,
                        newStart,
                        newEnd,
                        newPattern,
                        newSeparation,
                        newEndDate,
                        baseCheckoutId,
                    );
                }

                // One transaction: the old recurrence is truncated first, so a
                // failure in any later create used to leave the series cut
                // short with nothing to replace it.
                const completeNewCheckout = await sequelize.transaction(
                    async (t) => {
                        await recurrence.update(
                            { end_date: dayBefore },
                            { transaction: t },
                        );

                        // Create new recurrence with updated settings
                        const newRecurrence = await CheckoutRecurrence.create(
                            {
                                recurrence_pattern: newPattern,
                                separation_count: newSeparation,
                                max_occurrences:
                                    updates.max_occurrences ||
                                    recurrence.max_occurrences,
                                day_of_week:
                                    updates.day_of_week ||
                                    recurrence.day_of_week,
                                day_of_month:
                                    updates.day_of_month ||
                                    recurrence.day_of_month,
                                month_of_year:
                                    updates.month_of_year ||
                                    recurrence.month_of_year,
                                end_date:
                                    updates.recurrence_end_date ||
                                    originalEndDate,
                            },
                            { transaction: t },
                        );

                        const newCheckout = await Checkout.create(
                            {
                                equipment_id: checkout.equipment_id,
                                user_id: checkout.user_id,
                                start_time: newStart,
                                end_time: newEnd,
                                // `!== undefined` rather than `||` so clearing
                                // a field actually clears it instead of having
                                // the previous value quietly restored.
                                notes:
                                    updates.notes !== undefined
                                        ? updates.notes
                                        : checkout.notes,
                                project_number:
                                    updates.project_number !== undefined
                                        ? updates.project_number
                                        : checkout.project_number,
                                scheduled_on_behalf_of:
                                    updates.scheduled_on_behalf_of !== undefined
                                        ? updates.scheduled_on_behalf_of
                                        : checkout.scheduled_on_behalf_of,
                                status: updates.status || checkout.status,
                                approved_by_user_id:
                                    checkout.approved_by_user_id,
                                approved_at: checkout.approved_at,
                                recurrence_id: newRecurrence.id,
                                repeats: newRecurrence.recurrence_pattern,
                                // user_id stays the original booker; the audit
                                // columns are the editor, matching what
                                // auditMiddleware would have written. Without
                                // them the detail dialog showed a blank
                                // "created by".
                                created_by: userId,
                                updated_by: userId,
                            },
                            { transaction: t },
                        );

                        // Fetch complete checkout with audit fields
                        return Checkout.findByPk(newCheckout.id, {
                            include: [
                                {
                                    model: User,
                                    as: "User",
                                    attributes: [
                                        "id",
                                        "username",
                                        "first_name",
                                        "last_name",
                                        "email",
                                    ],
                                },
                                {
                                    model: User,
                                    as: "ApprovedBy",
                                    attributes: [
                                        "id",
                                        "username",
                                        "first_name",
                                        "last_name",
                                    ],
                                },
                                { model: CheckoutRecurrence, as: "Recurrence" },
                                {
                                    model: User,
                                    as: "CheckoutCreatedBy",
                                    attributes: [
                                        "id",
                                        "first_name",
                                        "last_name",
                                        "email",
                                    ],
                                },
                                {
                                    model: User,
                                    as: "CheckoutUpdatedBy",
                                    attributes: [
                                        "id",
                                        "first_name",
                                        "last_name",
                                        "email",
                                    ],
                                },
                            ],
                            transaction: t,
                        });
                    },
                );

                // Emit socket event
                const io = req.app.get("io");
                if (io) {
                    io.emit("message", {
                        message: "checkout_updated",
                        data: completeNewCheckout,
                    });
                }

                return res.json(completeNewCheckout);
            } else if (updateMode === "all") {
                // Edit all occurrences: Update base checkout and recurrence
                // For "edit all", preserve the original START DATE but update the TIME OF DAY
                let newStartTime = new Date(checkout.start_time);
                let newEndTime = new Date(checkout.end_time);

                if (updates.start_time) {
                    const updatedTime = new Date(updates.start_time);
                    newStartTime.setHours(
                        updatedTime.getHours(),
                        updatedTime.getMinutes(),
                        updatedTime.getSeconds(),
                    );
                }

                if (updates.end_time) {
                    const updatedTime = new Date(updates.end_time);
                    newEndTime.setHours(
                        updatedTime.getHours(),
                        updatedTime.getMinutes(),
                        updatedTime.getSeconds(),
                    );
                }

                const newPattern =
                    updates.recurrence_pattern || recurrence.recurrence_pattern;
                const newSeparation =
                    updates.separation_count || recurrence.separation_count;
                const newEndDate =
                    updates.recurrence_end_date !== undefined
                        ? updates.recurrence_end_date
                        : recurrence.end_date;

                // Skip conflict check if status is being changed to cancelled
                if (updates.status !== "cancelled") {
                    await checkConflicts(
                        checkout.equipment_id,
                        newStartTime,
                        newEndTime,
                        newPattern,
                        newSeparation,
                        newEndDate,
                        baseCheckoutId,
                    );
                }

                await checkout.update({
                    start_time: newStartTime,
                    end_time: newEndTime,
                    // `notes` was listed twice here, once as `||` and once as
                    // `!== undefined`; the second silently won, so the
                    // behaviour depended on key order. Keep the
                    // `!== undefined` form -- it lets a user clear the field.
                    notes:
                        updates.notes !== undefined
                            ? updates.notes
                            : checkout.notes,
                    project_number:
                        updates.project_number !== undefined
                            ? updates.project_number
                            : checkout.project_number,
                    scheduled_on_behalf_of:
                        updates.scheduled_on_behalf_of !== undefined
                            ? updates.scheduled_on_behalf_of
                            : checkout.scheduled_on_behalf_of,
                    status: updates.status || checkout.status,
                });

                if (
                    updates.recurrence_pattern ||
                    updates.separation_count ||
                    updates.recurrence_end_date !== undefined
                ) {
                    await recurrence.update({
                        recurrence_pattern:
                            updates.recurrence_pattern ||
                            recurrence.recurrence_pattern,
                        separation_count:
                            updates.separation_count ||
                            recurrence.separation_count,
                        end_date:
                            updates.recurrence_end_date !== undefined
                                ? updates.recurrence_end_date
                                : recurrence.end_date,
                    });
                }

                const completeCheckout = await Checkout.findByPk(checkout.id, {
                    include: [
                        {
                            model: Equipment,
                            attributes: [
                                "id",
                                "name",
                                "serial_number",
                                "asset_number",
                            ],
                        },
                        {
                            model: User,
                            as: "User",
                            attributes: [
                                "id",
                                "username",
                                "first_name",
                                "last_name",
                                "email",
                            ],
                        },
                        {
                            model: User,
                            as: "ApprovedBy",
                            attributes: [
                                "id",
                                "username",
                                "first_name",
                                "last_name",
                            ],
                        },
                        { model: CheckoutRecurrence, as: "Recurrence" },
                        {
                            model: User,
                            as: "CheckoutCreatedBy",
                            attributes: [
                                "id",
                                "first_name",
                                "last_name",
                                "email",
                            ],
                        },
                        {
                            model: User,
                            as: "CheckoutUpdatedBy",
                            attributes: [
                                "id",
                                "first_name",
                                "last_name",
                                "email",
                            ],
                        },
                    ],
                });

                // Emit socket event
                const io = req.app.get("io");
                if (io) {
                    io.emit("message", {
                        message: "checkout_updated",
                        data: completeCheckout,
                    });
                }

                return res.json(completeCheckout);
            }
        }

        // Non-recurring checkout or editing base recurring checkout directly
        // If updating time, check for conflicts (unless status is being set to cancelled)
        if (
            (updates.start_time || updates.end_time) &&
            updates.status !== "cancelled"
        ) {
            const start = new Date(updates.start_time || checkout.start_time);
            const end = new Date(updates.end_time || checkout.end_time);

            await checkConflicts(
                checkout.equipment_id,
                start,
                end,
                null,
                null,
                null,
                baseCheckoutId,
            );
        }

        await checkout.update(updates);

        // Fetch complete checkout data
        const completeCheckout = await Checkout.findByPk(baseCheckoutId, {
            include: [
                {
                    model: Equipment,
                    attributes: ["id", "name", "serial_number", "asset_number"],
                },
                {
                    model: User,
                    as: "User",
                    attributes: [
                        "id",
                        "username",
                        "first_name",
                        "last_name",
                        "email",
                    ],
                },
                {
                    model: User,
                    as: "ApprovedBy",
                    attributes: ["id", "username", "first_name", "last_name"],
                },
                {
                    model: User,
                    as: "CheckoutCreatedBy",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "CheckoutUpdatedBy",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
            ],
        });

        res.json(completeCheckout);

        // Cancelling something that was still PENDING, by someone other than
        // the person who asked for it, is a decline -- and a decline needs its
        // own wording, because "your reservation was cancelled" reads as an
        // administrative accident rather than a decision. The generic cancelled
        // mail below still covers every other case.
        const wasDeclined =
            updates.status === "cancelled" &&
            statusBeforeUpdate === "pending" &&
            checkout.user_id !== userId;

        // The approval queue decides through this route rather than through
        // PUT /:id/approve, so the requester has to be told from here too --
        // otherwise approving from the queue notifies nobody.
        const wasApproved =
            statusBeforeUpdate === "pending" &&
            (updates.status === "auto-approved" ||
                updates.status === "approved");

        if (wasDeclined || wasApproved) {
            (async () => {
                const equipment = await Equipment.findByPk(
                    checkout.equipment_id,
                );
                notifyApprovalDecision(
                    completeCheckout,
                    equipment,
                    wasApproved ? "approved" : "declined",
                    updates.approval_notes || updates.notes,
                );
            })();
        }

        // Send email notifications based on status change
        if (updates.status === "cancelled" && !wasDeclined) {
            (async () => {
                try {
                    const equipment = await Equipment.findByPk(
                        checkout.equipment_id,
                    );

                    // Get the user who cancelled (current user from auth)
                    const cancelledByUser = await User.findByPk(userId);
                    const cancelledByName = cancelledByUser
                        ? `${cancelledByUser.first_name || ""} ${
                              cancelledByUser.last_name || ""
                          }`.trim() || cancelledByUser.username
                        : "System";

                    // Get subscribers to checkout_cancelled alerts
                    const subscribers = await GetSubscribers(
                        checkout.equipment_id,
                        "checkout_cancelled",
                    );

                    // Get the checkout owner's email (only if not the one cancelling)
                    const checkoutOwner = await User.findByPk(checkout.user_id);
                    const ownerEmail = checkoutOwner?.email;

                    // Only send to owner if they're not the one cancelling
                    const shouldNotifyOwner =
                        ownerEmail && checkout.user_id !== userId;

                    // Create recipient list: owner (if different from canceller) + subscribers (deduplicated)
                    const recipientEmails = [
                        ...(shouldNotifyOwner ? [ownerEmail] : []),
                        ...(subscribers || []),
                    ];
                    const uniqueRecipients = [...new Set(recipientEmails)];

                    if (uniqueRecipients.length > 0) {
                        await sendCheckoutCancelledEmail(
                            completeCheckout,
                            equipment,
                            uniqueRecipients,
                            cancelledByName,
                        );
                    }
                } catch (emailError) {
                    console.error(
                        "Error sending checkout cancelled emails:",
                        emailError,
                    );
                }
            })();
        }

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            io.emit("message", {
                message: "checkout_updated",
                data: completeCheckout,
            });
        }
    } catch (err) {
        // Handle conflict errors thrown by checkConflicts helper
        if (err.status === 409) {
            return res.status(409).json({
                message: err.message,
                conflicts: err.conflicts,
            });
        }
        next(err);
    }
};

const Approve = async (req, res, next) => {
    try {
        const { id } = req.params;
        // `approved_by_user_id` used to be read from the body. Combined with
        // there being no authorization check at all on this route, that meant
        // any signed-in user could approve any reservation and attribute the
        // decision to somebody else. The approver is whoever holds the session.
        const { approval_notes } = req.body;
        const approved_by_user_id = req.user?.id;

        // A calendar hands back the virtual id of whichever occurrence was
        // clicked, which used to reach findByPk verbatim and blow up with an
        // MSSQL conversion error. Approval is stored on the head row only --
        // there is nowhere to record a per-occurrence decision -- so resolve
        // to the head and be explicit in the response that the whole series
        // was approved, rather than quietly doing more than was asked.
        const { isVirtualOccurrence, baseCheckoutId } = parseCheckoutId(id);

        const checkout = await Checkout.findByPk(baseCheckoutId);

        if (!checkout) {
            return res.status(404).json({ message: "Checkout not found" });
        }

        if (checkout.status !== "pending") {
            return res
                .status(400)
                .json({ message: "Checkout is not pending approval" });
        }

        // Who may approve is a property of the equipment, not of the person's
        // job title: whoever is named on Equipment-Approvers, or a member of
        // an AD group named there. Administrators always can, and are the
        // fallback when nobody is named.
        const equipment = await Equipment.findByPk(checkout.equipment_id);
        if (!(await CanUserApprove(req.user, equipment))) {
            return res.status(403).json({
                message:
                    "You are not an approver for this equipment.",
            });
        }

        await checkout.update({
            status: "auto-approved",
            approved_by_user_id,
            approval_notes,
            approved_at: new Date(),
        });

        // Fetch complete checkout data
        const completeCheckout = await Checkout.findByPk(baseCheckoutId, {
            include: [
                {
                    model: Equipment,
                    attributes: ["id", "name", "serial_number", "asset_number"],
                },
                {
                    model: User,
                    as: "User",
                    attributes: [
                        "id",
                        "username",
                        "first_name",
                        "last_name",
                        "email",
                    ],
                },
                {
                    model: User,
                    as: "ApprovedBy",
                    attributes: ["id", "username", "first_name", "last_name"],
                },
                {
                    model: User,
                    as: "CheckoutCreatedBy",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "CheckoutUpdatedBy",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
            ],
        });

        res.json({
            ...completeCheckout.toJSON(),
            applied_to_entire_series: isVirtualOccurrence,
        });

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            io.emit("message", {
                message: "checkout_approved",
                data: completeCheckout,
            });
        }

        // Tell the requester. This email has existed and been exported since
        // the feature was written and was never once called, so until now a
        // reservation could be approved and the person waiting on it would
        // find out only by going back and looking.
        notifyApprovalDecision(completeCheckout, equipment, "approved");
    } catch (err) {
        next(err);
    }
};

const Delete = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const isAdmin = req.user?.admin;

        // Same virtual-id problem as Approve: "4_3" reached findByPk verbatim
        // and MSSQL failed converting it to the INTEGER key. Cancelling is
        // stored on the head row, so a virtual id necessarily cancels the
        // whole series -- resolve to the head and say so in the response.
        // Callers that want to drop a single occurrence should use
        // PUT /checkouts/:id with updateMode "this".
        const { isVirtualOccurrence, baseCheckoutId } = parseCheckoutId(id);

        const checkout = await Checkout.findByPk(baseCheckoutId, {
            include: [
                {
                    model: Equipment,
                    attributes: ["id", "name", "serial_number", "location"],
                },
                {
                    model: User,
                    as: "User",
                    attributes: [
                        "id",
                        "username",
                        "first_name",
                        "last_name",
                        "email",
                    ],
                },
            ],
        });

        if (!checkout) {
            return res.status(404).json({ message: "Checkout not found" });
        }

        // Authorization: Only the creator, admin, or scheduled-on-behalf-of user can delete
        const isCreator = checkout.user_id === userId;
        const isScheduledOnBehalfOf = await isScheduledOnBehalfOfUser(
            checkout,
            userId,
        );

        if (!isAdmin && !isCreator && !isScheduledOnBehalfOf) {
            return res.status(403).json({
                message:
                    "You do not have permission to delete this reservation",
            });
        }

        // Soft delete - change status to cancelled instead of destroying
        await checkout.update({ status: "cancelled" });

        res.json({
            message: isVirtualOccurrence
                ? "Recurring checkout series cancelled successfully"
                : "Checkout cancelled successfully",
            applied_to_entire_series: isVirtualOccurrence,
        });

        // Send cancellation email notifications
        (async () => {
            try {
                const equipment =
                    checkout.Equipment ||
                    (await Equipment.findByPk(checkout.equipment_id));

                // Get the user who cancelled (current user from auth)
                const cancelledByUser = await User.findByPk(userId);
                const cancelledByName = cancelledByUser
                    ? `${cancelledByUser.first_name || ""} ${
                          cancelledByUser.last_name || ""
                      }`.trim() || cancelledByUser.username
                    : "System";

                // Get subscribers to checkout_cancelled alerts
                const subscribers = await GetSubscribers(
                    checkout.equipment_id,
                    "checkout_cancelled",
                );

                // Get the checkout owner's email
                const ownerEmail = checkout.User?.email;

                // Only send to owner if they're not the one cancelling
                const shouldNotifyOwner =
                    ownerEmail && checkout.user_id !== userId;

                // Create recipient list: owner (if different from canceller) + subscribers (deduplicated)
                const recipientEmails = [
                    ...(shouldNotifyOwner ? [ownerEmail] : []),
                    ...(subscribers || []),
                ];
                const uniqueRecipients = [...new Set(recipientEmails)];

                if (uniqueRecipients.length > 0) {
                    await sendCheckoutCancelledEmail(
                        checkout,
                        equipment,
                        uniqueRecipients,
                        cancelledByName,
                    );
                }
            } catch (emailError) {
                console.error(
                    "Error sending checkout cancelled emails:",
                    emailError,
                );
            }
        })();

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            io.emit("message", { message: "checkout_updated", data: checkout });
        }
    } catch (err) {
        next(err);
    }
};

module.exports = {
    GetAll,
    GetByEquipmentId,
    GetByUserId,
    GetPendingApprovals,
    Post,
    Update,
    Approve,
    Delete,
};
