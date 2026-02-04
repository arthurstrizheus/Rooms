const { Checkout, Equipment, User, CheckoutRecurrence } = require("../models");
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
    sendCheckoutCreatedEmail,
    sendEquipmentCheckedOutEmail,
    sendEquipmentReturnedEmail,
    sendEquipmentAvailableEmail,
    sendCheckoutCancelledEmail,
    sendScheduledOnBehalfEmail,
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
            conflicts,
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
            order: [["start_time", "DESC"]],
        });
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
        res.json(checkouts);
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
                conflicts,
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

                        const scheduledForUser = await User.findOne({
                            where: {
                                first_name: {
                                    [Sequelize.Op.iLike]: firstName,
                                },
                                last_name: { [Sequelize.Op.iLike]: lastName },
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
        const isEquipmentAdmin = req.user?.equipment_admin;

        // Non-admin users can only change status to "cancelled", not other statuses
        if (
            !isAdmin &&
            !isEquipmentAdmin &&
            updates.status &&
            updates.status !== "cancelled"
        ) {
            delete updates.status;
        }

        // Check if this is a virtual occurrence ID (e.g., "4_3")
        const isVirtualOccurrence = typeof id === "string" && id.includes("_");
        let baseCheckoutId = id;
        let occurrenceDate = null;

        if (isVirtualOccurrence) {
            // Parse the virtual ID to get base checkout ID and occurrence date
            [baseCheckoutId] = id.split("_");

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

        console.log("=== UPDATE CHECKOUT DEBUG ===");
        console.log("ID received:", id);
        console.log("isVirtualOccurrence:", isVirtualOccurrence);
        console.log("baseCheckoutId:", baseCheckoutId);
        console.log("updateMode:", updateMode);
        console.log(
            "checkout.Recurrence:",
            checkout.Recurrence ? "EXISTS" : "NULL",
        );
        console.log("updates:", updates);

        // Handle recurring checkout edits
        if (checkout.Recurrence && isVirtualOccurrence) {
            const recurrence = checkout.Recurrence;

            if (updateMode === "this" || updateMode === "current") {
                // Edit single occurrence:
                // 1. End current recurrence the day before this occurrence
                // 2. Create new single checkout for this edited occurrence
                // 3. Create new recurrence starting the day after with original pattern
                console.log("=== EDIT THIS MODE ===");
                console.log("Base checkout ID:", checkout.id);
                console.log(
                    "Original checkout start_time:",
                    checkout.start_time,
                );
                console.log("Original checkout end_time:", checkout.end_time);
                console.log("Occurrence date being edited:", occurrenceDate);
                console.log("Updates received:", updates);

                const dayBefore = addDays(occurrenceDate, -1);
                console.log("Setting recurrence end_date to:", dayBefore);

                // Store original end_date before modifying
                const originalEndDate = recurrence.end_date;

                // Check for conflicts with the new single checkout
                const newStart = new Date(updates.start_time || occurrenceDate);
                const newEnd = new Date(
                    updates.end_time ||
                        addDays(
                            occurrenceDate,
                            (new Date(checkout.end_time) -
                                new Date(checkout.start_time)) /
                                (1000 * 60 * 60 * 24),
                        ),
                );

                await checkConflicts(
                    checkout.equipment_id,
                    newStart,
                    newEnd,
                    null,
                    null,
                    null,
                );

                // End the original recurrence before this occurrence
                await recurrence.update({ end_date: dayBefore });

                // Create new single checkout for this specific occurrence with edited times
                const newCheckout = await Checkout.create({
                    equipment_id: checkout.equipment_id,
                    user_id: checkout.user_id,
                    start_time: updates.start_time || occurrenceDate,
                    end_time:
                        updates.end_time ||
                        addDays(
                            occurrenceDate,
                            (new Date(checkout.end_time) -
                                new Date(checkout.start_time)) /
                                (1000 * 60 * 60 * 24),
                        ),
                    notes: updates.notes || checkout.notes,
                    project_number:
                        updates.project_number || checkout.project_number,
                    notes: updates.notes || checkout.notes,
                    scheduled_on_behalf_of:
                        updates.scheduled_on_behalf_of ||
                        checkout.scheduled_on_behalf_of,
                    status: updates.status || checkout.status,
                    approved_by_user_id: checkout.approved_by_user_id,
                    approved_at: checkout.approved_at,
                });

                // Fetch complete checkout with audit fields
                const completeNewCheckout = await Checkout.findByPk(
                    newCheckout.id,
                    {
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
                    },
                );

                // Create new recurrence starting the day after with ORIGINAL pattern and times
                if (
                    !originalEndDate ||
                    new Date(originalEndDate) > occurrenceDate
                ) {
                    const dayAfter = addDays(occurrenceDate, 1);

                    const newRecurrence = await CheckoutRecurrence.create({
                        recurrence_pattern: recurrence.recurrence_pattern,
                        separation_count: recurrence.separation_count,
                        max_occurrences: recurrence.max_occurrences,
                        day_of_week: recurrence.day_of_week,
                        day_of_month: recurrence.day_of_month,
                        month_of_year: recurrence.month_of_year,
                        end_date: originalEndDate,
                    });

                    console.log(
                        "Created new recurrence with end_date:",
                        originalEndDate,
                    );

                    // Create new checkout starting from the day after with ORIGINAL times
                    const originalStartTime = new Date(checkout.start_time);
                    const originalEndTime = new Date(checkout.end_time);

                    console.log("=== CREATING CONTINUATION RECURRENCE ===");
                    console.log("originalStartTime:", originalStartTime);
                    console.log("originalEndTime:", originalEndTime);
                    console.log("dayAfter:", dayAfter);

                    // Set the day to dayAfter but keep original time of day
                    const newStartTime = new Date(dayAfter);
                    newStartTime.setHours(
                        originalStartTime.getHours(),
                        originalStartTime.getMinutes(),
                        originalStartTime.getSeconds(),
                    );

                    const newEndTime = new Date(dayAfter);
                    newEndTime.setHours(
                        originalEndTime.getHours(),
                        originalEndTime.getMinutes(),
                        originalEndTime.getSeconds(),
                    );

                    console.log("newStartTime:", newStartTime);
                    console.log("newEndTime:", newEndTime);

                    await Checkout.create({
                        equipment_id: checkout.equipment_id,
                        user_id: checkout.user_id,
                        start_time: newStartTime,
                        end_time: newEndTime,
                        notes: checkout.notes,
                        project_number: checkout.project_number,
                        notes: checkout.notes,
                        scheduled_on_behalf_of: checkout.scheduled_on_behalf_of,
                        status: checkout.status,
                        approved_by_user_id: checkout.approved_by_user_id,
                        approved_at: checkout.approved_at,
                        recurrence_id: newRecurrence.id,
                        repeats: recurrence.recurrence_pattern,
                    });
                }

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
                console.log("=== EDIT FOLLOWING MODE ===");
                console.log("Base checkout ID:", checkout.id);
                console.log(
                    "Original checkout start_time:",
                    checkout.start_time,
                );
                console.log("Original checkout end_time:", checkout.end_time);
                console.log("Occurrence date being edited:", occurrenceDate);
                console.log("Updates received:", updates);

                const dayBefore = addDays(occurrenceDate, -1);
                console.log("Setting old recurrence end_date to:", dayBefore);

                // Store original end_date before modifying
                const originalEndDate = recurrence.end_date;

                // Check for conflicts with the new recurring checkout
                const newStart = new Date(updates.start_time || occurrenceDate);
                const newEnd = new Date(
                    updates.end_time ||
                        addDays(
                            occurrenceDate,
                            (new Date(checkout.end_time) -
                                new Date(checkout.start_time)) /
                                (1000 * 60 * 60 * 24),
                        ),
                );
                const newPattern =
                    updates.recurrence_pattern || recurrence.recurrence_pattern;
                const newSeparation =
                    updates.separation_count || recurrence.separation_count;
                const newEndDate =
                    updates.recurrence_end_date || recurrence.end_date;

                await checkConflicts(
                    checkout.equipment_id,
                    newStart,
                    newEnd,
                    newPattern,
                    newSeparation,
                    newEndDate,
                );

                await recurrence.update({ end_date: dayBefore });

                // Create new recurrence with updated settings
                const newRecurrence = await CheckoutRecurrence.create({
                    recurrence_pattern:
                        updates.recurrence_pattern ||
                        recurrence.recurrence_pattern,
                    separation_count:
                        updates.separation_count || recurrence.separation_count,
                    max_occurrences:
                        updates.max_occurrences || recurrence.max_occurrences,
                    day_of_week: updates.day_of_week || recurrence.day_of_week,
                    day_of_month:
                        updates.day_of_month || recurrence.day_of_month,
                    month_of_year:
                        updates.month_of_year || recurrence.month_of_year,
                    end_date: updates.recurrence_end_date || originalEndDate,
                });

                console.log(
                    "Created new recurrence with end_date:",
                    updates.recurrence_end_date || originalEndDate,
                );

                const newCheckout = await Checkout.create({
                    equipment_id: checkout.equipment_id,
                    user_id: checkout.user_id,
                    start_time: updates.start_time || occurrenceDate,
                    end_time:
                        updates.end_time ||
                        addDays(
                            occurrenceDate,
                            (new Date(checkout.end_time) -
                                new Date(checkout.start_time)) /
                                (1000 * 60 * 60 * 24),
                        ),
                    notes: updates.notes || checkout.notes,
                    project_number:
                        updates.project_number || checkout.project_number,
                    notes: updates.notes || checkout.notes,
                    scheduled_on_behalf_of:
                        updates.scheduled_on_behalf_of ||
                        checkout.scheduled_on_behalf_of,
                    status: updates.status || checkout.status,
                    approved_by_user_id: checkout.approved_by_user_id,
                    approved_at: checkout.approved_at,
                    recurrence_id: newRecurrence.id,
                    repeats: newRecurrence.recurrence_pattern,
                });

                // Fetch complete checkout with audit fields
                const completeNewCheckout = await Checkout.findByPk(
                    newCheckout.id,
                    {
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
                console.log("=== EDIT ALL MODE ===");
                console.log("Base checkout ID:", checkout.id);
                console.log(
                    "Original checkout start_time:",
                    checkout.start_time,
                );
                console.log("Original checkout end_time:", checkout.end_time);
                console.log("Updates received:", updates);

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

                console.log(
                    "New times - start:",
                    newStartTime,
                    "end:",
                    newEndTime,
                );

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
                    notes: updates.notes || checkout.notes,
                    project_number:
                        updates.project_number !== undefined
                            ? updates.project_number
                            : checkout.project_number,
                    notes:
                        updates.notes !== undefined
                            ? updates.notes
                            : checkout.notes,
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

        // Send email notifications based on status change
        if (updates.status === "cancelled") {
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
        const { approved_by_user_id, approval_notes } = req.body;

        const checkout = await Checkout.findByPk(id);

        if (!checkout) {
            return res.status(404).json({ message: "Checkout not found" });
        }

        if (checkout.status !== "pending") {
            return res
                .status(400)
                .json({ message: "Checkout is not pending approval" });
        }

        await checkout.update({
            status: "auto-approved",
            approved_by_user_id,
            approval_notes,
            approved_at: new Date(),
        });

        // Fetch complete checkout data
        const completeCheckout = await Checkout.findByPk(id, {
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

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            io.emit("message", {
                message: "checkout_approved",
                data: completeCheckout,
            });
        }
    } catch (err) {
        next(err);
    }
};

const Delete = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const isAdmin = req.user?.admin;

        const checkout = await Checkout.findByPk(id, {
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
        let isScheduledOnBehalfOf = false;

        // Check if current user matches the scheduled_on_behalf_of name
        if (checkout.scheduled_on_behalf_of) {
            const nameParts = checkout.scheduled_on_behalf_of.split(" ");
            if (nameParts.length >= 2) {
                const firstName = nameParts[0];
                const lastName = nameParts.slice(1).join(" ");

                const scheduledForUser = await User.findOne({
                    where: {
                        first_name: { [Sequelize.Op.iLike]: firstName },
                        last_name: { [Sequelize.Op.iLike]: lastName },
                    },
                });

                if (scheduledForUser && scheduledForUser.id === userId) {
                    isScheduledOnBehalfOf = true;
                }
            }
        }

        if (!isAdmin && !isCreator && !isScheduledOnBehalfOf) {
            return res.status(403).json({
                message:
                    "You do not have permission to delete this reservation",
            });
        }

        // Soft delete - change status to cancelled instead of destroying
        await checkout.update({ status: "cancelled" });

        res.json({ message: "Checkout cancelled successfully" });

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
