const {
    Meeting,
    GroupUser,
    RoomGroup,
    Group,
    User,
    MeetingRecurrence,
    SpecialPermission,
    BlockedDate,
    Room,
} = require("../models");
const { Sequelize } = require("sequelize");
// The sequelize INSTANCE, not the class imported above. The split surgery in
// `UpdateAllNextInRecurrence` needs `sequelize.transaction`; `Sequelize` is the
// class and only carries `Op` / `fn`, which the rest of this file uses.
const { sequelize } = require("../config/database");
const axios = require("axios");
const {
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    subWeeks,
    addWeeks,
    getDate,
    getYear,
    getMonth,
    getTime,
    format,
    isSameDay,
} = require("date-fns");
const { isUserDev } = require("../functions/utilities");
// Email notifications
const {
    sendMeetingApprovalRequestEmail,
    sendMeetingReapprovalRequestEmail,
} = require("./mailController");

// Helper: determine approver users (id + email) for a meeting awaiting approval
async function getApprovers(meeting) {
    try {
        // Toggle (default false): set SEND_APPROVAL_TO_ADMINS=true to include global admins
        const includeAdmins = process.env.SEND_APPROVAL_TO_ADMINS;
        const includeOfficeAdmins = process.env.SEND_APPROVAL_TO_OFFICE_ADMINS;

        const approverMap = new Map();
        const addUser = (u) => {
            // Respect toggle: if SEND_APPROVAL_TO_ADMINS is not true, skip admin users
            if (u && u.admin && includeAdmins) return;
            if (u && u.office_admin && includeOfficeAdmins) return;
            if (u && u.id && u.email && !approverMap.has(u.id)) {
                approverMap.set(u.id, { id: u.id, email: u.email });
            }
        };
        if (includeAdmins) {
            const adminUsers = await User.findAll({ where: { admin: true } });
            adminUsers.forEach(addUser);
        }
        const officeAdmins = await User.findAll({
            where: { office_admin: meeting.location },
        });
        officeAdmins.forEach(addUser);

        // Groups with Full access linked to this room
        const roomGroups = await RoomGroup.findAll({
            where: { room_id: meeting.room },
        });
        const groupIds = roomGroups.map((rg) => rg.group_id);
        if (groupIds.length) {
            const fullGroups = await Group.findAll({
                where: { id: groupIds, access: "Full" },
            });
            const fullGroupIds = fullGroups.map((g) => g.id);
            if (fullGroupIds.length) {
                const groupUsers = await GroupUser.findAll({
                    where: { group_id: fullGroupIds },
                });
                const userIds = groupUsers.map((gu) => gu.user_id);
                if (userIds.length) {
                    const users = await User.findAll({
                        where: { id: userIds },
                    });
                    users.forEach(addUser);
                }
            }
        }
        return Array.from(approverMap.values());
    } catch (e) {
        console.error("Failed to gather approvers", e);
        return [];
    }
}

async function GetNextParentMeeting(userId, meeting) {
    const meetings = await Meeting.findAll({
        where: { recurrence_id: meeting.recurrence_id },
    });

    // Find the next parent meeting
    const fakeMeets = await CreateRepeatingMeetings(
        meeting.start_time,
        "Month",
        userId,
    );
    let nextDate = new Date(meeting.start_time);

    switch (meeting.repeats) {
        case "Daily":
            nextDate.setDate(nextDate.getDate() + 1);
            break;
        case "Weekly":
            nextDate.setDate(nextDate.getDate() + 7);
            break;
        case "Monthly":
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
        case "Yearly":
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
        default:
            throw new Error("Invalid range");
    }

    let nextParentMeet = fakeMeets?.find(
        (fm) => fm.start_time === nextDate.toISOString(),
    );

    if (meetings?.length) {
        const MeetingExists = meetings?.find(
            (mt) =>
                mt.toJSON()?.start_time == nextParentMeet.start_time &&
                mt.toJSON()?.end_time == nextParentMeet.end_time &&
                mt.toJSON()?.recurrence_id == nextParentMeet.recurrence_id,
        );
        if (MeetingExists) {
            return MeetingExists;
        }
    }

    if (!nextParentMeet) {
        return null;
    }
    return nextParentMeet;
}

async function CanSeeMeet(meeting, user) {
    if (user?.admin) {
        return true;
    }
    const room = await Room.findByPk(meeting.room);
    if (!room) {
        return false;
    }
    if (user?.office_admin == room.location) {
        return true;
    }

    // Fetch all groups the user belongs to
    const groupUsers = await GroupUser.findAll({ where: { user_id: user.id } });

    // If the user is not part of any group they cannot see the meeting
    if (!groupUsers.length) {
        return false;
    }

    // Extract group IDs the user belongs to
    const groupIds = groupUsers?.map((gu) => gu.group_id);

    // Rooms shared with "All SEA Staff" are visible to everyone, matching the
    // non-recurring path in GetAllUserCanSee which unions that group in too
    const allGroups = await Group.findAll({
        where: { group_name: "All SEA Staff" },
    });
    groupIds.push(...allGroups.map((gp) => gp.id));

    // Find all room groups that match the user's group memberships
    const roomGroups = await RoomGroup.findAll({
        where: {
            group_id: groupIds,
        },
    });

    // Extract room IDs from the RoomGroup associations
    let roomIds = roomGroups?.map((rg) => rg.room_id);

    // Find all meetings where the room is part of the rooms the user can access
    return roomIds.includes(meeting.room);
}

/**
 * Where and when a meeting sits, in one human line — "CR 2 on Tue, Jul 28,
 * 2026 from 9:00 AM to 10:00 AM". The 409s below paste this into their message
 * so whoever hit the conflict is told which booking is in the way instead of
 * having to hunt the calendar for it.
 *
 * Deliberately no meeting name: the room and the time are what the booker
 * needs, and the title of a meeting they may not be allowed to see is not.
 */
const CONFLICT_DAY_FORMAT = "EEE, MMM d, yyyy";
const CONFLICT_TIME_FORMAT = "h:mm a";

async function describeConflict(conflict) {
    if (!conflict) return "";

    const roomRow = conflict.room ? await Room.findByPk(conflict.room) : null;
    const roomName = roomRow?.value || "another room";

    const start = new Date(conflict.start_time);
    const end = new Date(conflict.end_time);
    // A generated occurrence carries whatever its parent had; a malformed row
    // would otherwise render "Invalid Date" straight into the snackbar.
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return roomName;

    if (conflict.all_day) {
        return `${roomName}, all day on ${format(start, CONFLICT_DAY_FORMAT)}`;
    }
    if (isSameDay(start, end)) {
        return `${roomName} on ${format(start, CONFLICT_DAY_FORMAT)} from ${format(
            start,
            CONFLICT_TIME_FORMAT,
        )} to ${format(end, CONFLICT_TIME_FORMAT)}`;
    }
    return `${roomName} from ${format(start, CONFLICT_DAY_FORMAT)} ${format(
        start,
        CONFLICT_TIME_FORMAT,
    )} to ${format(end, CONFLICT_DAY_FORMAT)} ${format(
        end,
        CONFLICT_TIME_FORMAT,
    )}`;
}

/** Build the 409 body for a booking that collides with `conflict`. */
async function overlapResponse(conflict, extra) {
    const where = await describeConflict(conflict);
    return {
        message: where
            ? `Meeting time overlaps with an existing meeting in ${where}`
            : "Meeting time overlaps with an existing meeting",
        ...extra,
    };
}

/**
 * The overlap checks below return the CONFLICTING MEETING (or null) rather than
 * a boolean, so callers can describe it. Every call site uses the result as a
 * truthiness test, which an object satisfies exactly as `true` did.
 */
async function isOverlapping(meet) {
    // Fetch meetings in the same room
    const meetings = await Meeting.findAll({
        where: {
            room: meet.room,
            status: {
                [Sequelize.Op.in]: ["Approved", "Waiting on Approval"], // Filter by status
            },
        },
    });

    const newStartTime = new Date(meet.start_time);
    const newEndTime = new Date(meet.end_time);

    // Find the first overlapping meeting
    const overlap = meetings.find((meeting) => {
        const meetingStart = new Date(meeting.start_time);
        const meetingEnd = new Date(meeting.end_time);

        // Return true if there is an overlap
        return newStartTime < meetingEnd && newEndTime > meetingStart;
    });

    return overlap || null; // The meeting in the way, or null if the slot is free
}

async function isOverlappingFakeMeet(meet) {
    // Fetch meetings in the same room
    const meetings = await Meeting.findAll({
        where: {
            room: meet.room,
        },
    });

    const newStartTime = new Date(meet.start_time);
    const newEndTime = new Date(meet.end_time);

    // Find the first overlapping meeting
    const overlap = meetings.find((meeting) => {
        const meetingStart = new Date(meeting.start_time);
        const meetingEnd = new Date(meeting.end_time);

        let isOverlap = meeting.recurrence_id === meet.recurrence_id;

        // Return true if there is an overlap
        return (
            newStartTime < meetingEnd && newEndTime > meetingStart && isOverlap
        );
    });

    return overlap || null; // The meeting in the way, or null if the slot is free
}

/**
 * In-memory twin of `isOverlappingFakeMeet`.
 *
 * `isOverlappingFakeMeet` only ever returns true for a stored meeting in the
 * SAME room AND the SAME recurrence series, so the candidate set depends purely
 * on (room, recurrence_id) — never on the individual occurrence's times. That
 * lets the caller fetch the candidates once and re-use them for every generated
 * occurrence instead of issuing one unbounded `SELECT * FROM [Rooms-Meetings]
 * WHERE room = ?` per occurrence.
 *
 * `candidates` must already be narrowed to the matching room + recurrence_id.
 * The time comparison below is byte-for-byte the one in isOverlappingFakeMeet.
 */
function overlapsFakeMeetCandidates(meet, candidates) {
    if (!candidates?.length) return false;

    const newStartTime = new Date(meet.start_time);
    const newEndTime = new Date(meet.end_time);

    return candidates.some((meeting) => {
        const meetingStart = new Date(meeting.start_time);
        const meetingEnd = new Date(meeting.end_time);

        // Return true if there is an overlap
        return newStartTime < meetingEnd && newEndTime > meetingStart;
    });
}

/** Bucket key for the overlap candidate map: room + recurrence series. */
function overlapCandidateKey(room, recurrenceId) {
    return `${room}|${recurrenceId}`;
}

async function isOverlappingFakeMeetUpdate(meet) {
    // Fetch meetings in the same room
    const meetings = await Meeting.findAll({
        where: {
            room: meet.room,
        },
    });

    const newStartTime = new Date(meet.start_time);
    const newEndTime = new Date(meet.end_time);

    // Find the first overlapping meeting
    const overlap = meetings.find((meeting) => {
        const meetingStart = new Date(meeting.start_time);
        const meetingEnd = new Date(meeting.end_time);

        if (meeting.recurrence_id === meet.recurrence_id) {
            return false;
        }
        let isOverlap = newStartTime < meetingEnd && newEndTime > meetingStart;
        // Return true if there is an overlap
        return isOverlap;
    });

    return overlap || null; // The meeting in the way, or null if the slot is free
}

/**
 * One bounded query for a whole generated series, replacing one unbounded
 * `SELECT * FROM [Rooms-Meetings] WHERE room = ?` per occurrence.
 *
 * `isOverlappingFakeMeetUpdate` above has two properties that only became
 * dangerous once a split can start in the PAST. It fires one full-table scan
 * per generated occurrence — 365 of them for a daily series, the exact pattern
 * the comment in `CreateRepeatingMeetings` blames for exhausting the
 * connection pool — and it matches rows of ANY status, so a booking that was
 * CANCELLED in that room two years ago blocks the save with a 409 naming a
 * meeting nobody can see. `isOverlapping`, which the booking form has always
 * used, filters status; the two disagreed. This follows `isOverlapping`.
 *
 * The same-series exclusion is byte-for-byte the one in
 * isOverlappingFakeMeetUpdate, except compared numerically: `recurrence_id`
 * arrives from the request body, where a string would defeat `===` and turn
 * every occurrence of the series into a conflict with itself.
 */
async function findOverlapForGeneratedSeries(
    occurrences,
    { room, recurrenceId },
) {
    if (!occurrences?.length) return null;

    let earliest = Infinity;
    let latest = -Infinity;
    for (const occ of occurrences) {
        const s = new Date(occ.start_time).getTime();
        const e = new Date(occ.end_time).getTime();
        if (Number.isFinite(s) && s < earliest) earliest = s;
        if (Number.isFinite(e) && e > latest) latest = e;
    }
    if (!Number.isFinite(earliest) || !Number.isFinite(latest)) return null;

    const candidates = await Meeting.findAll({
        where: {
            room,
            status: {
                [Sequelize.Op.in]: ["Approved", "Waiting on Approval"],
            },
            end_time: { [Sequelize.Op.gt]: new Date(earliest) },
            start_time: { [Sequelize.Op.lt]: new Date(latest) },
        },
    });

    const others = candidates.filter(
        (row) => Number(row.recurrence_id) !== Number(recurrenceId),
    );
    if (!others.length) return null;

    for (const occ of occurrences) {
        const s = new Date(occ.start_time);
        const e = new Date(occ.end_time);
        const hit = others.find(
            (row) => s < new Date(row.end_time) && e > new Date(row.start_time),
        );
        if (hit) return hit;
    }
    return null;
}

/**
 * Keep `baseDate`'s calendar day but take the clock time from `timeSource`.
 * Used when a caller submits already-final times for one occurrence and the
 * parent of the recurrence has to pick up the new time-of-day on its own date.
 */
function applyTimeOfDay(baseDate, timeSource) {
    const result = new Date(baseDate);
    const source = new Date(timeSource);
    if (isNaN(result.getTime()) || isNaN(source.getTime())) {
        return result;
    }
    result.setHours(
        source.getHours(),
        source.getMinutes(),
        source.getSeconds(),
        source.getMilliseconds(),
    );
    return result;
}

/**
 * The only recurrence frequencies the generators below know how to advance a
 * date cursor by.
 *
 * Both `Rooms-Meetings.repeats` and `Rooms-MeetingRecurrences.frequency` are
 * free-form nullable STRING columns, the booking form offers an empty
 * "— None —" option, and rows written by earlier versions of this code are
 * still in the table — so a value outside this set is entirely plausible.
 * Every generation loop advances its cursor in per-frequency branches, so an
 * unrecognised value leaves the cursor untouched and the loop never ends.
 * Anything not in this set therefore means "no recurrence": generate nothing.
 */
const RECURRENCE_FREQUENCIES = new Set([
    "Daily",
    "Weekly",
    "Monthly",
    "Yearly",
]);

/** True when `frequency` is one of the values a generation loop can advance. */
function isKnownRecurrenceFrequency(frequency) {
    return RECURRENCE_FREQUENCIES.has(frequency);
}

/** ~11 years of a daily series. A cursor that cannot advance is refused
 *  before we get here; this is belt-and-braces against an endless loop. */
const MAX_OCCURRENCE_STEPS = 4000;

/**
 * The first occurrence of `recurrence` whose CALENDAR DAY is not before
 * `boundary`, as { start, end } Dates — or null when the series ends first.
 *
 * This duplicates the generator's cursor on purpose. Occurrences are not rows;
 * the only way to name a date the calendar actually DREW is to step the same
 * cursor `CreateRepeatingMeetings` steps: setDate/setMonth/setFullYear, then
 * re-apply the parent's clock time to BOTH cursors on every step. Millisecond
 * arithmetic would drift an hour across a US DST change (the mistake
 * `UpdateAllRecurrence`'s drag branch makes), and "same weekday, next month"
 * would not reproduce Monthly's 31st-of-the-month rollover, which is
 * path-dependent and must be reproduced, not corrected, or the anchor stops
 * matching the calendar.
 *
 * The comparison is on the calendar DAY, not the instant: an all-day booking is
 * stored midnight-to-midnight with start === end, so an instant comparison
 * files today's all-day meeting as already past at 00:00.
 *
 * `repeat_until` is honoured with the generator's own inclusive `>` test in the
 * generator's own order (advance -> stop-check -> re-normalise), so this can
 * never name an occurrence the calendar does not draw.
 */
function firstOccurrenceOnOrAfter(parentMeeting, recurrence, boundary) {
    if (!isKnownRecurrenceFrequency(recurrence?.frequency)) return null;

    const parentStart = new Date(parentMeeting.start_time);
    const parentEnd = new Date(parentMeeting.end_time);
    if (isNaN(parentStart.getTime()) || isNaN(parentEnd.getTime())) return null;

    const boundaryDay = startOfDay(boundary);
    const stopAt =
        recurrence.repeat_until != null
            ? new Date(recurrence.repeat_until)
            : null;

    let currentStart = new Date(parentStart);
    let currentEnd = new Date(parentEnd);

    for (let step = 0; step <= MAX_OCCURRENCE_STEPS; step++) {
        if (startOfDay(currentStart) >= boundaryDay) {
            return { start: new Date(currentStart), end: new Date(currentEnd) };
        }
        if (recurrence.frequency === "Daily") {
            currentStart.setDate(currentStart.getDate() + 1);
            currentEnd.setDate(currentEnd.getDate() + 1);
        } else if (recurrence.frequency === "Weekly") {
            currentStart.setDate(currentStart.getDate() + 7);
            currentEnd.setDate(currentEnd.getDate() + 7);
        } else if (recurrence.frequency === "Monthly") {
            currentStart.setMonth(currentStart.getMonth() + 1);
            currentEnd.setMonth(currentEnd.getMonth() + 1);
        } else if (recurrence.frequency === "Yearly") {
            currentStart.setFullYear(currentStart.getFullYear() + 1);
            currentEnd.setFullYear(currentEnd.getFullYear() + 1);
        }
        if (stopAt != null && currentStart > stopAt) return null;
        currentStart = applyTimeOfDay(currentStart, parentStart);
        currentEnd = applyTimeOfDay(currentEnd, parentEnd);
    }
    return null;
}

async function CreateRepeatingMeetingsOfThisMeeting(meeting) {
    // No branch in the loop below advances the cursor for an unrecognised
    // `repeats`, so it would spin forever. Treat it exactly like the
    // "— None —" option: this meeting simply has no further occurrences.
    if (!isKnownRecurrenceFrequency(meeting?.repeats)) {
        // "" / null are the normal "does not repeat" values and are not worth
        // logging; anything else is unexpected data worth being able to find.
        if (meeting?.repeats) {
            console.warn(
                "Unrecognised meeting repeats value, generating no occurrences",
                meeting.repeats,
            );
        }
        return [];
    }

    // Check 1 year ahead
    let extension = new Date(meeting.start_time);
    extension.setFullYear(extension.getFullYear() + 1);

    let meetings = [];
    let currentStartTime = new Date(meeting.start_time);
    let currentEndTime = new Date(meeting.end_time);

    while (currentStartTime <= extension) {
        // Increment dates based on recurrence
        if (meeting.repeats === "Daily") {
            currentStartTime.setDate(currentStartTime.getDate() + 1);
            currentEndTime.setDate(currentEndTime.getDate() + 1);
        } else if (meeting.repeats === "Weekly") {
            currentStartTime.setDate(currentStartTime.getDate() + 7);
            currentEndTime.setDate(currentEndTime.getDate() + 7);
        } else if (meeting.repeats === "Monthly") {
            currentStartTime.setMonth(currentStartTime.getMonth() + 1);
            currentEndTime.setMonth(currentEndTime.getMonth() + 1);
        } else if (meeting.repeats === "Yearly") {
            currentStartTime.setFullYear(currentStartTime.getFullYear() + 1);
            currentEndTime.setFullYear(currentEndTime.getFullYear() + 1);
        }

        const fakeMeet = {
            ...meeting,
            id: -1, // Fake meeting ID
            start_time: currentStartTime.toISOString(),
            end_time: currentEndTime.toISOString(),
            recurrence_id: meeting.recurrence_id,
        };

        // Only push non-overlapping fake meetings
        // console.log('New Fake Meet', fakeMeet);
        //const createFakeMeet = await isOverlappingFakeMeet(fakeMeet);
        //if (!createFakeMeet) {
        meetings.push(fakeMeet);
        //}
    }

    meetings.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    return meetings;
}

// `applyVisibility` filters the generated occurrences down to what `userId` is
// allowed to see. Only the callers that return these to a user under a
// visibility contract set it; the callers that use this as an internal
// projection (overlap detection, next-parent lookup) must keep seeing every
// occurrence or they would miss booking conflicts.
async function CreateRepeatingMeetings(
    currentDate,
    range,
    userId,
    userOnly = false,
    applyVisibility = false,
) {
    const user = await User.findByPk(userId);

    const recurrenceMeetings = await MeetingRecurrence.findAll();
    const recurrenceMeetingIds = recurrenceMeetings?.map((rm) => rm.meeting_id);
    let latestMeetings = [];
    if (userOnly) {
        if (isUserDev(userId)) {
            latestMeetings = await Meeting.findAll({
                attributes: [
                    "recurrence_id",
                    [
                        Sequelize.fn("MAX", Sequelize.col("start_time")),
                        "latest_start_time",
                    ],
                ],
                where: {
                    created_user_id: userId,
                    recurrence_id: {
                        [Sequelize.Op.not]: null,
                    },
                    status: {
                        [Sequelize.Op.notIn]: [
                            "Canceled",
                            "Waiting on Approval",
                        ],
                    },
                    id: {
                        [Sequelize.Op.in]: recurrenceMeetingIds,
                    },
                },
                group: ["recurrence_id"],
            });
        } else {
            latestMeetings = await Meeting.findAll({
                attributes: [
                    "recurrence_id",
                    [
                        Sequelize.fn("MAX", Sequelize.col("start_time")),
                        "latest_start_time",
                    ],
                ],
                where: {
                    created_user_id: userId,
                    recurrence_id: {
                        [Sequelize.Op.not]: null,
                    },
                    status: {
                        [Sequelize.Op.notIn]: [
                            "Canceled",
                            "Waiting on Approval",
                        ],
                    },
                    id: {
                        [Sequelize.Op.in]: recurrenceMeetingIds,
                    },
                    dev: false,
                },
                group: ["recurrence_id"],
            });
        }
    } else {
        if (isUserDev(userId)) {
            latestMeetings = await Meeting.findAll({
                attributes: [
                    "recurrence_id",
                    [
                        Sequelize.fn("MAX", Sequelize.col("start_time")),
                        "latest_start_time",
                    ],
                ],
                where: {
                    recurrence_id: {
                        [Sequelize.Op.not]: null,
                    },
                    status: {
                        [Sequelize.Op.notIn]: [
                            "Canceled",
                            "Waiting on Approval",
                        ],
                    },
                    id: {
                        [Sequelize.Op.in]: recurrenceMeetingIds,
                    },
                },
                group: ["recurrence_id"],
            });
        } else {
            latestMeetings = await Meeting.findAll({
                attributes: [
                    "recurrence_id",
                    [
                        Sequelize.fn("MAX", Sequelize.col("start_time")),
                        "latest_start_time",
                    ],
                ],
                where: {
                    recurrence_id: {
                        [Sequelize.Op.not]: null,
                    },
                    status: {
                        [Sequelize.Op.notIn]: [
                            "Canceled",
                            "Waiting on Approval",
                        ],
                    },
                    id: {
                        [Sequelize.Op.in]: recurrenceMeetingIds,
                    },
                    dev: false,
                    location: user.location,
                },
                group: ["recurrence_id"],
            });
        }
    }

    const recurrenceData = latestMeetings
        ?.map((meet) => ({
            recurrence_id: meet.recurrence_id,
            latest_start_time: meet.getDataValue("latest_start_time"),
        }))
        .filter(
            (m) => m.recurrence_id !== null && m.latest_start_time !== null,
        );

    if (recurrenceData.length === 0) {
        return []; // No recurring meetings found, return empty array
    }
    const recurrenceIds = recurrenceData?.map((m) => m.recurrence_id);

    const latestStartTimes = recurrenceData?.map((m) => m.latest_start_time);

    const meetingsWithRecurrence = await Meeting.findAll({
        where: {
            [Sequelize.Op.and]: [
                { recurrence_id: { [Sequelize.Op.in]: recurrenceIds } },
                { start_time: { [Sequelize.Op.in]: latestStartTimes } },
            ],
        },
        include: [
            {
                model: User,
                as: "UpdatedUser",
                attributes: ["id", "first_name", "last_name", "email"],
            },
        ],
        order: [["start_time", "DESC"]],
    });

    let meetings = [];

    // ── Everything below is loop-invariant and is now fetched ONCE per request ──
    // (it used to run inside the per-parent-meeting loop, or worse, inside the
    // per-generated-occurrence loop).
    let specialAccessMeetingIds = [];
    // key: `${room}|${recurrence_id}` → candidate rows for the overlap check
    const overlapCandidates = new Map();

    if (meetingsWithRecurrence.length) {
        // The special-permission lookups depend only on `userId`, so running
        // them once per parent meeting was pure duplication.
        const special = await SpecialPermission.findAll({
            where: { user_id: userId },
        });
        if (special?.length) {
            const meetingIds = special?.map((sp) => sp.meeting_id);
            const meetingsUserHasSpecialAccess = await Meeting.findAll({
                where: {
                    id: {
                        [Sequelize.Op.in]: meetingIds,
                    },
                    status: "Approved",
                },
                include: [
                    {
                        model: User,
                        as: "UpdatedUser",
                        attributes: ["id", "first_name", "last_name", "email"],
                    },
                ],
            });
            specialAccessMeetingIds =
                meetingsUserHasSpecialAccess?.map((mt) => mt.id) ?? [];
        }

        // ── Overlap candidates for the whole request, in one bounded query ──
        //
        // This replaces the per-occurrence `isOverlappingFakeMeet()` call, whose
        // query was `SELECT <all 21 columns> FROM [Rooms-Meetings] WHERE room = ?`
        // with no date bound at all. With no index on [room] that is a full table
        // scan, and the loop below fired one per generated occurrence — hundreds
        // to thousands per request. That is what exhausted the 5-connection pool
        // and surfaced as ECONNRESET / "Request failed to complete in 15000ms".
        //
        // Bounds are deliberately conservative supersets of what each individual
        // occurrence could match, so the in-memory check below sees exactly the
        // rows the old per-occurrence query would have handed it:
        //   • recurrence_id — the old check only ever returned true when
        //     `meeting.recurrence_id === meet.recurrence_id`.
        //   • end_time > earliest parent start — every generated occurrence
        //     starts strictly AFTER its parent's start_time, so a meeting that
        //     already ended by the earliest parent start cannot overlap any.
        //   • start_time < window end — the loop below never generates past
        //     `extension` (worst case currentDate + 1 year for range "Year")
        //     plus one recurrence step (worst case 1 year), plus a day of
        //     time-of-day normalisation, plus the longest meeting duration.
        let earliestParentStartMs = Infinity;
        let longestMeetingMs = 0;
        for (const parent of meetingsWithRecurrence) {
            const startMs = new Date(parent.start_time).getTime();
            const endMs = new Date(parent.end_time).getTime();
            if (Number.isFinite(startMs) && startMs < earliestParentStartMs) {
                earliestParentStartMs = startMs;
            }
            const durationMs = endMs - startMs;
            if (Number.isFinite(durationMs) && durationMs > longestMeetingMs) {
                longestMeetingMs = durationMs;
            }
        }

        const overlapWindowEnd = new Date(currentDate);
        overlapWindowEnd.setFullYear(overlapWindowEnd.getFullYear() + 2);
        overlapWindowEnd.setDate(overlapWindowEnd.getDate() + 2);

        if (Number.isFinite(earliestParentStartMs)) {
            const overlapRows = await Meeting.findAll({
                // Only the columns the overlap check actually reads.
                attributes: [
                    "id",
                    "room",
                    "recurrence_id",
                    "start_time",
                    "end_time",
                ],
                where: {
                    recurrence_id: { [Sequelize.Op.in]: recurrenceIds },
                    end_time: {
                        [Sequelize.Op.gt]: new Date(earliestParentStartMs),
                    },
                    start_time: {
                        [Sequelize.Op.lt]: new Date(
                            overlapWindowEnd.getTime() + longestMeetingMs,
                        ),
                    },
                },
            });

            for (const row of overlapRows) {
                const key = overlapCandidateKey(row.room, row.recurrence_id);
                const bucket = overlapCandidates.get(key);
                if (bucket) bucket.push(row);
                else overlapCandidates.set(key, [row]);
            }
        }
    }

    for (let meeting of meetingsWithRecurrence) {
        // User special permissions
        const hasSpecialAccess = specialAccessMeetingIds.includes(meeting.id);
        // Resolved once per parent meeting, not per generated occurrence:
        // visibility depends on the meeting, not on the individual occurrence.
        if (applyVisibility) {
            const canSee =
                (await CanSeeMeet(meeting, user)) || hasSpecialAccess;
            if (!canSee) continue; // Skip if user cannot see this meeting
        }
        if (meeting.status === "Canceled") continue;

        const recurrence = await MeetingRecurrence.findByPk(
            meeting.recurrence_id,
        );
        if (!recurrence || !recurrence?.active) continue; // Skip if no recurrence exists…

        // Same hazard as in CreateRepeatingMeetingsOfThisMeeting: the generation
        // loop further down only advances its cursor for the four known
        // frequencies, so an unrecognised one would spin forever. Skip the
        // series instead — its stored meetings are still returned by the normal
        // queries, we just cannot project any occurrences from it.
        if (!isKnownRecurrenceFrequency(recurrence.frequency)) {
            console.warn(
                "Unrecognised recurrence frequency, skipping recurrence",
                recurrence.id,
                recurrence.frequency,
            );
            continue;
        }

        // ── NEW! Grab every *real* meeting (aka moved ones) in our window … ──
        let extension = new Date(currentDate);

        // Define how far into the future we want to generate meetings
        switch (range) {
            case "Day":
                extension.setDate(extension.getDate() + 1);
                break;
            case "Week":
                extension.setDate(extension.getDate() + 7);
                break;
            case "Month":
                extension.setMonth(extension.getMonth() + 2);
                break;
            case "Year":
                extension.setFullYear(extension.getFullYear() + 1);
                break;
            default:
                throw new Error("Invalid range");
        }
        const realMeetings = await Meeting.findAll({
            where: {
                recurrence_id: meeting.recurrence_id,
                status: {
                    [Sequelize.Op.notIn]: ["Canceled", "Waiting on Approval"],
                },
                id: { [Sequelize.Op.ne]: meeting.id }, // don’t count our “parent” itself
                start_time: {
                    [Sequelize.Op.between]: [
                        new Date(meeting.start_time),
                        extension,
                    ],
                },
            },
            include: [
                {
                    model: User,
                    as: "UpdatedUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
            ],
        });

        // Build a set of “occupied” buckets based on freq:
        const occupied = new Set(
            realMeetings.map((m) => {
                const dt = new Date(m.start_time);
                switch (recurrence.frequency) {
                    case "Daily":
                        // Calendar day
                        return dt.toISOString().slice(0, 10);
                    case "Weekly":
                        // Find Monday of that week (ISO-ish):
                        const monday = new Date(dt);
                        const dow = monday.getDay(); // Sun=0…Sat=6
                        const shift = (dow + 6) % 7; // Mon→0, Tue→1, … Sun→6
                        monday.setDate(monday.getDate() - shift);
                        return monday.toISOString().slice(0, 10); // “YYYY‑MM‑DD” of that Monday
                    case "Monthly":
                        return `${dt.getFullYear()}-${dt.getMonth() + 1}`; // “YYYY-M”
                    case "Yearly":
                        return `${dt.getFullYear()}`; // “YYYY”
                    default:
                        throw new Error(
                            "Unknown frequency in occupied‑set builder",
                        );
                }
            }),
        );
        // Constant for every occurrence this parent generates, so it is
        // resolved here instead of inside the while loop.
        const meetingOverlapCandidates =
            overlapCandidates.get(
                overlapCandidateKey(meeting.room, meeting.recurrence_id),
            ) ?? [];

        let currentStartTime = new Date(meeting.start_time);
        let currentEndTime = new Date(meeting.end_time);
        //`while (currentStartTime <= extension)` block …
        while (currentStartTime <= extension) {
            // Increment dates based on recurrence
            if (recurrence.frequency === "Daily") {
                currentStartTime.setDate(currentStartTime.getDate() + 1);
                currentEndTime.setDate(currentEndTime.getDate() + 1);
            } else if (recurrence.frequency === "Weekly") {
                currentStartTime.setDate(currentStartTime.getDate() + 7);
                currentEndTime.setDate(currentEndTime.getDate() + 7);
            } else if (recurrence.frequency === "Monthly") {
                currentStartTime.setMonth(currentStartTime.getMonth() + 1);
                currentEndTime.setMonth(currentEndTime.getMonth() + 1);
            } else if (recurrence.frequency === "Yearly") {
                currentStartTime.setFullYear(
                    currentStartTime.getFullYear() + 1,
                );
                currentEndTime.setFullYear(currentEndTime.getFullYear() + 1);
            }
            // Stop creating meetings if we are past the end date
            if (
                recurrence.repeat_until != null &&
                currentStartTime > new Date(recurrence.repeat_until)
            ) {
                break;
            }

            currentStartTime.setHours(new Date(meeting.start_time).getHours());
            currentStartTime.setMinutes(
                new Date(meeting.start_time).getMinutes(),
            );
            currentEndTime.setHours(new Date(meeting.end_time).getHours());
            currentEndTime.setMinutes(new Date(meeting.end_time).getMinutes());

            // now compute the same bucket‑key for this would‑be fake:
            let bucket;
            switch (recurrence.frequency) {
                case "Daily":
                    bucket = currentStartTime.toISOString().slice(0, 10);
                    break;
                case "Weekly":
                    const mon = new Date(currentStartTime);
                    const d = mon.getDay();
                    mon.setDate(mon.getDate() - ((d + 6) % 7));
                    bucket = mon.toISOString().slice(0, 10);
                    break;
                case "Monthly":
                    bucket = `${currentStartTime.getFullYear()}-${
                        currentStartTime.getMonth() + 1
                    }`;
                    break;
                case "Yearly":
                    bucket = `${currentStartTime.getFullYear()}`;
                    break;
            }

            // If someone already moved a meeting into this week/month/year, skip:
            if (occupied.has(bucket)) {
                // Oh look: a real meeting already snagged this slot. No ghost allowed!
                continue;
            }
            // Overlapping‑check… if it still passes, push the fake
            //
            // `toJSON()` already carries the parent's `UpdatedUser` (id,
            // first_name, last_name, email) from the include on the query that
            // fetched it — which is what DisplayMeeting reads. The extra
            // lower-case `updatedUser` key beside it was an unnarrowed User
            // row, PASSWORD COLUMN INCLUDED, serialised to every client that
            // could see the meeting, and it had no consumer anywhere in src/.
            const fakeMeet = {
                ...meeting.toJSON(),
                id: -1, // Fake meeting ID
                start_time: currentStartTime.toISOString(),
                end_time: currentEndTime.toISOString(),
                recurrence_id: meeting.recurrence_id,
            };
            // Only push non-overlapping fake meetings
            // console.log('New Fake Meet', fakeMeet);
            // Same predicate as isOverlappingFakeMeet(), but against the
            // pre-fetched candidates instead of a fresh full-table query.
            const createFakeMeet = overlapsFakeMeetCandidates(
                fakeMeet,
                meetingOverlapCandidates,
            );
            if (!createFakeMeet) meetings.push(fakeMeet);
        }
    }

    meetings.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
    return meetings;
}

async function GetMeetingStatus(roomId, userId) {
    // Fetch all groups the user belongs to
    const groupUsers = await GroupUser.findAll({ where: { user_id: userId } });
    // If the user is not part of any group, return an empty array
    if (!groupUsers.length) {
        return "Waiting on Approval";
    }

    // Extract group IDs the user belongs to
    const groupIds = groupUsers?.map((gu) => gu.group_id);

    // Find all the groups that the user has full access in
    const groups = await Group.findAll({
        where: {
            id: {
                [Sequelize.Op.in]: groupIds, // Fix: Ensure that `groupIds` is an array of integers
            },
            access: "Full",
        },
    });
    const fullAccessGroups = groups?.map((gu) => gu.id);

    // Find all room groups that match the user's group memberships of Full access
    const roomGroups = await RoomGroup.findAll({
        where: {
            group_id: {
                [Sequelize.Op.in]: fullAccessGroups,
            },
        },
    });

    // Extract room IDs from the RoomGroup associations
    const roomIds = roomGroups?.map((rg) => rg.room_id);

    return roomIds.includes(roomId) ? "Approved" : "Waiting on Approval";
}

// Determine final status and dispatch approval / re-approval emails.
// Params:
// - operation: 'create' | 'update'
// - context: { user, meetingData, existingMeeting? }
// Returns: resolved status string
async function evaluateStatusAndNotify({
    operation,
    user,
    meetingData,
    existingMeeting,
    created_user_id,
}) {
    const meetingStatus = await GetMeetingStatus(
        meetingData.room,
        created_user_id || user?.id,
    );
    // Determine resulting status respecting admin/office_admin shortcuts
    const desiredStatus = meetingData.status;
    let finalStatus =
        desiredStatus !== "Approved"
            ? !user?.admin
                ? user?.office_admin != meetingData.location
                    ? meetingStatus
                    : "Approved"
                : "Approved"
            : "Approved";

    // If final status requires approval, send appropriate notifications
    // Defer notification for creations until after the meeting record (with id) is persisted.
    if (finalStatus === "Waiting on Approval" && meetingData.id) {
        await sendApprovalNotifications(meetingData, {
            operation,
            existingMeeting,
        });
    }
    return finalStatus;
}

// Helper to send approval / re-approval notifications once a meeting has a persisted id
async function sendApprovalNotifications(
    meetingRecord,
    { operation, existingMeeting },
) {
    try {
        if (
            !meetingRecord?.id ||
            meetingRecord.status !== "Waiting on Approval"
        )
            return;
        const approvers = await getApprovers(meetingRecord); // [{id,email}]
        const emails = approvers.map((a) => a.email).filter(Boolean);
        const wasApproved = existingMeeting?.status === "Approved";
        const isUpdateReapproval = wasApproved && operation === "update";
        // If email override active, send only ONE email (first) to reduce noise
        const emailOverrideActive = ["1", "true", "yes", "on"].includes(
            (process.env.EMAIL_OVERRIDE || "0").toString().trim().toLowerCase(),
        );
        if (emailOverrideActive && emails.length) {
            const first = emails[0];
            if (isUpdateReapproval) {
                sendMeetingReapprovalRequestEmail(
                    existingMeeting,
                    meetingRecord,
                    first,
                ).catch((e) =>
                    console.error("Failed re-approval email", first, e),
                );
            } else {
                sendMeetingApprovalRequestEmail(meetingRecord, first).catch(
                    (e) => console.error("Failed approval email", first, e),
                );
            }
        } else {
            for (const email of emails) {
                if (isUpdateReapproval) {
                    sendMeetingReapprovalRequestEmail(
                        existingMeeting,
                        meetingRecord,
                        email,
                    ).catch((e) =>
                        console.error("Failed re-approval email", email, e),
                    );
                } else {
                    sendMeetingApprovalRequestEmail(meetingRecord, email).catch(
                        (e) => console.error("Failed approval email", email, e),
                    );
                }
            }
        }
        try {
            const { SendMessage } = require("../utils/socketUtils");
            SendMessage(
                {
                    message: isUpdateReapproval
                        ? "meeting_reapproval_requested"
                        : "meeting_approval_requested",
                    data: {
                        meetingId: meetingRecord.id,
                        recipients: emails,
                        wasApproved,
                        operation,
                    },
                },
                { userIds: approvers.map((a) => a.id) },
            );
        } catch (sockErr) {
            console.warn("Socket notify failed (approvers)", sockErr);
        }
    } catch (e) {
        console.error("Failed sending approval notifications", e);
    }
}

const SetStatus = async (req, res) => {
    try {
        const { id } = req.params; // Extract ID from URL parameters
        const { status, userId, meeting } = req.body; // Extract data from the request body
        let canDelete = false;

        // Validate the incoming data (optional but recommended)
        if (!status) {
            return res.status(400).json({ message: "Required fields missing" });
        }
        if (Number(id) === -1) {
            const recurrence = await MeetingRecurrence.findByPk(
                meeting.recurrence_id,
            );
            const parentMeeting = await Meeting.findByPk(recurrence.meeting_id);

            canDelete = await CanDelete(parentMeeting.id, userId);
        } else {
            canDelete = await CanDelete(id, userId);
        }

        if (!canDelete) {
            return res
                .status(409)
                .json({ message: "Access Denied", delete: false });
        }
        // Create meeting if this is a recurrence meeting
        if (Number(id) === -1) {
            // The client echoes the generated occurrence back verbatim, and
            // that object still carries the association keys the listing query
            // put on it. Neither is a column, so they are dropped here rather
            // than handed to `create`.
            const { UpdatedUser, updatedUser, ...occurrenceFields } = meeting;
            const newResource = await Meeting.create({
                ...occurrenceFields,
                id: null,
                status: status,
                updated_user_id: actingUserId(req, userId),
            });
            res.status(200).json(newResource);
        } else {
            // Find the existing resource by ID
            const resource = await Meeting.findByPk(id);
            if (!resource) {
                return res.status(404).json({ message: "Resource not found" });
            }

            // Check if this is a parent meeting that is being updated
            const recurrence = await MeetingRecurrence.findOne({
                where: { meeting_id: id },
            });

            if (recurrence && status != "Declined" && status == "Canceled") {
                // Update to new ParentMeeting
                const newParent = await GetNextParentMeeting(userId, resource);
                if (newParent == null) {
                    res.status(500).json({
                        message:
                            "Server error, Failed to find new parent meeting.",
                    });
                }

                // MeetingRecurrence has no updated_user_id column
                // (backend/models/meetingRecurrence.js), so Sequelize dropped
                // this key silently — the write never happened. The actor is
                // recorded on the parent MEETING instead, which is what the
                // detail dialog reads.
                if (newParent.id === -1) {
                    console.log("Create new Parent");
                    // The promoted row is built from a generated occurrence,
                    // i.e. a projection of the PREVIOUS parent — so without
                    // this it would inherit that row's updater and claim the
                    // last editor cancelled it. Name whoever cancelled.
                    const raw = newParent.toJSON
                        ? newParent.toJSON()
                        : newParent;
                    const { UpdatedUser, updatedUser, ...parentFields } = raw;
                    const newMeeting = await Meeting.create({
                        ...parentFields,
                        id: null,
                        updated_user_id: actingUserId(req, userId),
                    });

                    await recurrence.update({
                        meeting_id: newMeeting.id,
                    });
                } else {
                    await recurrence.update({
                        meeting_id: newParent.id,
                    });
                }
            } else if (recurrence && status == "Declined") {
                await recurrence.update({
                    active: false,
                });
            }
            // Update the resource record in the database

            await resource.update({
                status,
                updated_user_id: actingUserId(req, userId),
            });
            // Emit socket event when a meeting is approved so clients can refresh approval counts
            try {
                if (status === "Approved") {
                    const { SendMessage } = require("../utils/socketUtils");
                    SendMessage(
                        {
                            message: "meeting_approved",
                            data: {
                                meetingId: resource.id,
                                name: resource.name,
                                created_user_id: resource.created_user_id,
                            },
                        },
                        { userId: resource.created_user_id },
                    );
                    // Send approval confirmation email to creator
                    try {
                        const creator = await User.findByPk(
                            resource.created_user_id,
                        );
                        if (creator?.email) {
                            const {
                                sendMeetingApprovedEmail,
                            } = require("./mailController");
                            if (
                                typeof sendMeetingApprovedEmail === "function"
                            ) {
                                sendMeetingApprovedEmail(
                                    resource,
                                    creator.email,
                                ).catch((e) =>
                                    console.error(
                                        "Failed to send meeting approved email",
                                        e,
                                    ),
                                );
                            }
                        }
                    } catch (e) {
                        console.warn(
                            "Could not send meeting approved email",
                            e,
                        );
                    }
                } else if (status === "Declined") {
                    const { SendMessage } = require("../utils/socketUtils");
                    SendMessage(
                        {
                            message: "meeting_declined",
                            data: {
                                meetingId: resource.id,
                                created_user_id: resource.created_user_id,
                            },
                        },
                        { userId: resource.created_user_id },
                    );
                    try {
                        const creator = await User.findByPk(
                            resource.created_user_id,
                        );
                        if (creator?.email) {
                            const {
                                sendMeetingDeclinedEmail,
                            } = require("./mailController");
                            sendMeetingDeclinedEmail(
                                resource,
                                creator.email,
                            ).catch((e) =>
                                console.error(
                                    "Failed to send declined email",
                                    e,
                                ),
                            );
                        }
                    } catch (e) {
                        console.warn(
                            "Could not send meeting declined email",
                            e,
                        );
                    }
                }
            } catch (e) {
                console.warn("Socket notify failed (meeting approved)", e);
            }
            // Return the updated record as a JSON response
            res.status(200).json(resource);
        }
    } catch (err) {
        console.error("Error updating resource:", err);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * WHO to record in `updated_user_id`.
 *
 * Every /api/meetings route sits behind the global `authenticateUser`
 * middleware and none of them is in its `publicRoutes` allowlist
 * (backend/middleware/auth.js), so `req.user.id` is the one actor value the
 * browser cannot choose. The `:userId` param and `body.userId` these handlers
 * already read STAY EXACTLY WHERE THEY ARE — they are what the CanDelete /
 * CanUserBook checks run on, and moving those would change who can edit what.
 * Only the audit column moves to the session. The fallback keeps today's
 * behaviour if the middleware is ever bypassed.
 */
function actingUserId(req, fallback) {
    return req.user?.id ?? fallback ?? null;
}

async function CanDelete(meetingId, userId) {
    const meeting = await Meeting.findByPk(Number(meetingId));
    const user = await User.findByPk(userId);
    console.log(userId, meetingId);
    if (user?.admin) {
        return true;
    }
    if (user?.office_admin == meeting.location) {
        return true;
    }
    // If user created it they can delete it
    if (meeting.created_user_id == userId) {
        return true;
    }
    const approvers = await getApprovers(meeting);
    if (approvers?.some((a) => a.id === userId)) {
        return true;
    }
    return false;
}

async function CanUserBook(roomId, userId) {
    const user = await User.findByPk(userId);
    if (user?.admin) {
        return true;
    }
    const room = await Room.findByPk(roomId);
    if (user?.office_admin == room.location) {
        return true;
    }

    // Get all groups the meeting is in via the room its in
    const meetingRoomGroups = await RoomGroup.findAll({
        where: { room_id: roomId },
    });
    let meetingRoomGroupIds = meetingRoomGroups?.map((mg) => mg.group_id);

    // Get all groups the user in along with it bein in the meeting groups
    const userGroups = await GroupUser.findAll({
        where: {
            user_id: Number(userId),
            group_id: {
                [Sequelize.Op.in]: meetingRoomGroupIds,
            },
        },
    });
    const userGroupIds = userGroups?.map((ug) => ug.group_id);

    // Find at least 1 group that the user is that has full access
    const fullAccessGroup = await Group.findOne({
        where: {
            id: userGroupIds,
            access: {
                [Sequelize.Op.in]: ["Full", "Read"],
            },
        },
    });
    if (fullAccessGroup?.id) {
        return true;
    }
}

const GetAll = async (req, res) => {
    try {
        const data = await Meeting.findAll();
        res.json(data);
    } catch (err) {
        console.error("Error fetching meetings:", err);
        res.status(500).send("Server error: Error fetching meetings");
    }
};

const GetAllUserCreated = async (req, res) => {
    try {
        const { id } = req.params;
        // Date: DateTime - start date, Range: 'day', 'week', 'month'
        const { date, range } = req.query;

        if (!date || !range) {
            return res.status(400).json({
                message:
                    "Required fields missing, date and range ('Day', 'Week'. 'Month')",
            });
        }
        const fakeMeets = await CreateRepeatingMeetings(date, range, id, true); // Create repeating meetings if they do not exist, only the next 30 from the date

        // Correct way to use order
        let data = await Meeting.findAll({
            where: { created_user_id: id },
            order: [["createdAt", "DESC"]], // Order by 'createdAt' field in ascending order
            include: [
                {
                    model: User,
                    as: "UpdatedUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
            ],
        });
        if (fakeMeets?.length > 0) {
            fakeMeets?.map((fm) => data.push(fm));
        }
        res.json(data);
    } catch (err) {
        console.error("Error fetching meetings:", err);
        res.status(500).send("Server error: Error fetching meetings");
    }
};

const GetAllUserCanSee = async (req, res) => {
    try {
        const { id } = req.params; // User ID
        const { date, range } = req.query; // Range: Day, Week, Month, Year, date: current day, start of week, or start of month
        if (!date || !range) {
            return res.status(400).json({
                message:
                    "Required fields missing, date and range ('Day', 'Week'. 'Month')",
            });
        }
        const baseDate = new Date(date);
        let dateStart, dateEnd;

        switch (range) {
            case "Day":
                dateStart = startOfDay(baseDate);
                dateEnd = endOfDay(baseDate);
                break;
            case "Week":
                dateStart = subWeeks(
                    startOfWeek(baseDate, { weekStartsOn: 1 }),
                    1,
                );
                dateEnd = addWeeks(endOfWeek(baseDate, { weekStartsOn: 1 }), 1);
                break;
            case "Month":
                dateStart = subWeeks(startOfMonth(baseDate), 1);
                dateEnd = addWeeks(endOfMonth(baseDate), 1);
                break;
            default:
                return res.status(400).json({
                    message: "Invalid range. Use 'Day', 'Week', or 'Month'",
                });
        }

        const fakeMeets = await CreateRepeatingMeetings(
            date,
            range,
            id,
            false,
            true,
        ); // Create repeating meetings if they do not exist, only the next 30 from the date

        const groups = await Group.findAll({
            where: {
                group_name: "All SEA Staff",
            },
        });
        let allGroupIds = groups.map((gp) => gp.id);
        const user = await User.findByPk(id);

        // If user is admin return all meetings
        if (user?.admin) {
            let meets = await Meeting.findAll({
                where: {
                    status: "Approved",
                    start_time: {
                        [Sequelize.Op.between]: [dateStart, dateEnd],
                    },
                    location: user?.location,
                },
                include: [
                    {
                        model: User,
                        as: "UpdatedUser",
                        attributes: ["id", "first_name", "last_name", "email"],
                    },
                ],
            });
            // console.log('fake meets',fakeMeets.length);
            if (fakeMeets?.length > 0) {
                fakeMeets?.map((fm) => meets.push(fm));
            }
            return res.status(200).json(meets);
        } else if (user?.office_admin) {
            let meets = await Meeting.findAll({
                where: {
                    location: user?.office_admin,
                    status: "Approved",
                    start_time: {
                        [Sequelize.Op.between]: [dateStart, dateEnd],
                    },
                },
                include: [
                    {
                        model: User,
                        as: "UpdatedUser",
                        attributes: ["id", "first_name", "last_name", "email"],
                    },
                ],
            });
            // console.log('fake meets',fakeMeets.length);
            if (fakeMeets?.length > 0) {
                fakeMeets?.map((fm) => meets.push(fm));
            }
            // Also grab all meetings that have the group of all
            const allGroups = await Group.findAll({
                where: { group_name: "All SEA Staff" },
            });
            const allIds = allGroups.map((gp) => gp.id);
            const allRoomGroups = await RoomGroup.findAll({
                where: { group_id: { [Sequelize.Op.in]: allIds } },
            });
            const roomsWithAll = allRoomGroups.map((rg) => rg.room_id);
            return res
                .status(200)
                .json(
                    meets?.filter(
                        (mt) =>
                            mt.location == user?.office_admin ||
                            roomsWithAll.includes(mt.room),
                    ),
                );
        }

        // Fetch all groups the user belongs to
        const groupUsers = await GroupUser.findAll({ where: { user_id: id } });

        // Now check if user has any special permissions
        const special = await SpecialPermission.findAll({
            where: { user_id: id },
        });
        const meetingIds = special?.map((sp) => sp.meeting_id);
        const meetingsUserHasSpecialAccess = await Meeting.findAll({
            where: {
                id: {
                    [Sequelize.Op.in]: meetingIds,
                },
                status: "Approved",
                start_time: {
                    [Sequelize.Op.between]: [dateStart, dateEnd],
                },
            },
            include: [
                {
                    model: User,
                    as: "UpdatedUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
            ],
        });

        // If the user is not part of any group, return an empty array
        if (!groupUsers.length && !meetingsUserHasSpecialAccess?.length) {
            return res.status(200).json([]);
        }

        // Extract group IDs the user belongs to
        const groupIds = groupUsers?.map((gu) => gu.group_id);
        groupIds.push(...allGroupIds);

        // Find all room groups that match the user's group memberships
        const roomGroups = await RoomGroup.findAll({
            where: {
                group_id: { [Sequelize.Op.in]: groupIds },
            },
        });

        // Extract room IDs from the RoomGroup associations
        let roomIds = roomGroups?.map((rg) => rg.room_id);

        // Find all meetings where the room is part of the rooms the user can access
        let meetings = await Meeting.findAll({
            where: {
                room: roomIds,
                status: "Approved",
                start_time: {
                    [Sequelize.Op.between]: [dateStart, dateEnd],
                },
            },
            include: [
                {
                    model: User,
                    as: "UpdatedUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
            ],
        });

        if (fakeMeets?.length > 0) {
            // Add repeating meetings to the list of returned meetings.
            fakeMeets?.map((fm) => {
                meetings.push(fm);
            });
        }
        if (meetingsUserHasSpecialAccess?.length > 0) {
            meetingsUserHasSpecialAccess?.map((mt) => {
                if (!meetings?.find((m) => m.id == mt.id)) {
                    meetings.push(mt);
                }
            });
        }
        // console.log('fake meets',fakeMeets.length)

        // Return the filtered meetings the user can see
        return res.status(200).json(meetings);
    } catch (err) {
        console.error(
            "Error fetching Meetings that user can see between a date range:",
            err,
        );
        res.status(500).send("Server error");
    }
};

const GetAllNeedsApproval = async (req, res) => {
    try {
        const { id } = req.params; // User ID

        // If user is admin return all meetings
        const user = await User.findByPk(id);
        const Allgroups = await Group.findAll({
            where: { group_name: "All SEA Staff" },
        });
        let groupsIds = Allgroups.map((gp) => gp.id);
        groupsIds.push(user.location);
        if (user?.admin) {
            const meets = await Meeting.findAll({
                where: {
                    location: {
                        [Sequelize.Op.in]: groupsIds,
                    },
                    status: "Waiting on Approval",
                },
                include: [
                    {
                        model: User,
                        as: "UpdatedUser",
                        attributes: ["id", "first_name", "last_name", "email"],
                    },
                ],
            });
            return res.status(200).json(meets);
        } else if (user?.office_admin) {
            const meets = await Meeting.findAll({
                where: {
                    location: user?.office_admin,
                    status: "Waiting on Approval",
                },
                include: [
                    {
                        model: User,
                        as: "UpdatedUser",
                        attributes: ["id", "first_name", "last_name", "email"],
                    },
                ],
            });
            return res.status(200).json(meets);
        }

        // Fetch all groups the user belongs to
        const groupUsers = await GroupUser.findAll({
            where: { user_id: Number(id) },
        });

        // If the user is not part of any group, return an empty array
        if (!groupUsers.length) {
            return res.status(200).json([]);
        }

        // Extract group IDs the user belongs to
        const groupIds = groupUsers?.map((gu) => gu.group_id);

        // Find all the groups that the user has full access in
        const groups = await Group.findAll({
            where: {
                id: groupIds,
                access: "Full",
            },
        });
        const fullAccessGroups = groups?.map((gu) => gu.id);

        if (fullAccessGroups?.length) {
            // Find all room groups that match the user's group memberships of Full access
            const roomGroups = await RoomGroup.findAll({
                where: {
                    group_id: fullAccessGroups,
                },
            });

            // Extract room IDs from the RoomGroup associations
            const roomIds = roomGroups?.map((rg) => rg.room_id);

            // Find all meetings where the room is part of the rooms the user can access and need approval
            const meetings = await Meeting.findAll({
                where: {
                    room: roomIds,
                    status: "Waiting on Approval",
                },
                include: [
                    {
                        model: User,
                        as: "UpdatedUser",
                        attributes: ["id", "first_name", "last_name", "email"],
                    },
                ],
            });

            // Return the filtered meetings the user can see
            return res.status(200).json(meetings);
        } else {
            return res.status(404).json({ message: "No Items Found" });
        }
    } catch (err) {
        console.error("Error fetching room groups:", err);
        res.status(500).send("Server error");
    }
};

const CanBook = async (req, res) => {
    try {
        // Extract data from the request body
        const { userId } = req.params;
        const {
            id,
            start_time,
            end_time,
            room,
            type,
            organizer,
            description,
            location,
            name,
            status,
            retired,
            created_user_id,
            repeats,
            allDay,
        } = req.body;

        // Validate the incoming data (optional but recommended)
        if (
            !start_time ||
            !end_time ||
            !room ||
            !type ||
            !organizer ||
            !name ||
            !status ||
            !created_user_id
        ) {
            return res.status(400).json({ message: "Required fields missing" });
        }

        // Fetch all groups the user belongs to
        // const groupUsers = await GroupUser.findAll({ where: { user_id: created_user_id } });

        // // If the user is not part of any group, return an empty array
        // if (!groupUsers.length) {
        //     return res.status(200).json([]);
        // }

        // Extract group IDs the user belongs to
        // const groupIds = groupUsers?.map(gu => gu.group_id);

        // Find all room groups that match the user's group memberships
        // const roomGroups = await RoomGroup.findAll({
        //     where: {
        //         group_id: groupIds

        //     }
        // });

        // Extract room IDs from the RoomGroup associations
        // const roomIds = roomGroups?.map(rg => rg.room_id);

        // if (!roomIds.includes(parseInt(room))) {
        //     return res.status(409).json({ message: 'Access denied', book:true });
        // }

        // Find all meetings in the same room
        let meetings = await Meeting.findAll({
            where: {
                room: room, // Only check meetings in the same room
            },
        });

        // Convert start_time and end_time to Date objects for comparison
        const newStartTime = new Date(start_time);
        const newEndTime = new Date(end_time);
        const fakeMeets = await CreateRepeatingMeetings(
            start_time,
            "Month",
            created_user_id,
        );
        const allMeetsWithRecurrance = [];
        meetings?.map((mt) => allMeetsWithRecurrance.push(mt));
        fakeMeets?.map((fm) => allMeetsWithRecurrance.push(fm));

        // Check for overlapping meetings. `conflict` holds the meeting that is
        // in the way so the 409 can name its room and time.
        let conflict = allMeetsWithRecurrance.find((meeting) => {
            const meetingStart = new Date(meeting.start_time);
            const meetingEnd = new Date(meeting.end_time);
            let overlaping = false;
            if (meeting.id != id) {
                overlaping =
                    (newStartTime < meetingEnd &&
                        getDate(newStartTime) == getDate(meetingStart) &&
                        getYear(newStartTime) == getYear(meetingStart) &&
                        getMonth(newStartTime) == getMonth(meetingStart) &&
                        newEndTime > meetingStart &&
                        getDate(newEndTime) == getDate(meetingEnd) &&
                        getYear(newEndTime) == getYear(meetingEnd) &&
                        getMonth(newEndTime) == getMonth(meetingEnd) &&
                        meeting.room == room &&
                        (meeting.status === "Approved" ||
                            meeting.status === "Waiting on Approval")) ||
                    ((meeting.all_day || allDay) &&
                        meeting.room == room &&
                        ((getDate(newStartTime) == getDate(meetingStart) &&
                            getYear(newStartTime) == getYear(meetingStart) &&
                            getMonth(newStartTime) == getMonth(meetingStart)) ||
                            (getDate(newEndTime) == getDate(meetingEnd) &&
                                getYear(newEndTime) == getYear(meetingEnd) &&
                                getMonth(newEndTime) ==
                                    getMonth(meetingEnd))) &&
                        (meeting.status === "Approved" ||
                            meeting.status === "Waiting on Approval"));
            }
            // Check if the new meeting overlaps with an existing meeting
            return overlaping;
        });

        if (!conflict && repeats != "") {
            const meeting = {
                start_time,
                end_time,
                room,
                location,
                type,
                organizer,
                description,
                repeats,
                name,
                retired,
                status,
                created_user_id,
            };
            // Since this meeting is being updated with repeats and it was not before there is no
            // recurrence in the recurrence table and we need a separate funtion to determain if it will overlap anything
            const fakeMeets2 =
                await CreateRepeatingMeetingsOfThisMeeting(meeting);
            conflict = fakeMeets2.find((meeting) => {
                const meetingStart = new Date(meeting.start_time);
                const meetingEnd = new Date(meeting.end_time);

                // Check if the new meeting overlaps with an existing meeting
                return (
                    (newStartTime < meetingEnd &&
                        getDate(newStartTime) == getDate(meetingEnd) &&
                        getYear(newStartTime) == getYear(meetingEnd) &&
                        getMonth(newStartTime) == getMonth(meetingEnd) &&
                        newEndTime > meetingStart &&
                        getDate(newEndTime) == getDate(meetingStart) &&
                        getYear(newEndTime) == getYear(meetingStart) &&
                        getMonth(newEndTime) == getMonth(meetingStart) &&
                        meeting.room == room &&
                        (meeting.status === "Approved" ||
                            meeting.status === "Waiting on Approval")) ||
                    ((meeting.all_day || allDay) &&
                        meeting.room == room &&
                        getTime(newStartTime) == getTime(meetingStart) &&
                        getTime(meetingEnd) == getTime(newEndTime) &&
                        getDate(newStartTime) == getDate(meetingStart) &&
                        getYear(newStartTime) == getYear(meetingStart) &&
                        getMonth(newStartTime) == getMonth(meetingStart) &&
                        getDate(newEndTime) == getDate(meetingEnd) &&
                        getYear(newEndTime) == getYear(meetingEnd) &&
                        getMonth(newEndTime) == getMonth(meetingEnd) &&
                        (meeting.status === "Approved" ||
                            meeting.status === "Waiting on Approval"))
                );
            });
        }

        const blockedDates = await BlockedDate.findAll();
        if (!conflict) {
            const blockedConflict = blockedDates.find((meeting) => {
                const meetingStart = new Date(meeting.start_time);
                const meetingEnd = new Date(meeting.end_time);
                // Check if the new meeting overlaps with an blocked dates.
                // A blocked date belongs to exactly one room (`room_id`, NOT
                // NULL), so it must only block bookings in that room.
                return (
                    (meeting.room_id == room &&
                        newStartTime < meetingEnd &&
                        newEndTime > meetingStart) ||
                    ((meeting.all_day || allDay) &&
                        meeting.room == room &&
                        ((getDate(newStartTime) == getDate(meetingStart) &&
                            getYear(newStartTime) == getYear(meetingStart) &&
                            getMonth(newStartTime) == getMonth(meetingStart)) ||
                            (getDate(newEndTime) == getDate(meetingEnd) &&
                                getYear(newEndTime) == getYear(meetingEnd) &&
                                getMonth(newEndTime) == getMonth(meetingEnd))))
                );
            });
            if (blockedConflict) {
                return res.status(409).json({
                    message:
                        "Meeting time overlaps with a blocked section of time",
                    book: false,
                });
            }
        }

        // Check if its overlaping any standard meetings.
        if (!conflict) {
            conflict = meetings.find((meeting) => {
                const meetingStart = new Date(meeting.start_time);
                const meetingEnd = new Date(meeting.end_time);
                let overlaping = false;
                if (meeting.id != id) {
                    overlaping =
                        (newStartTime < meetingEnd &&
                            getDate(newStartTime) == getDate(meetingEnd) &&
                            getYear(newStartTime) == getYear(meetingEnd) &&
                            getMonth(newStartTime) == getMonth(meetingEnd) &&
                            newEndTime > meetingStart &&
                            getDate(newEndTime) == getDate(meetingStart) &&
                            getYear(newEndTime) == getYear(meetingStart) &&
                            getMonth(newEndTime) == getMonth(meetingStart) &&
                            meeting.room == room &&
                            (meeting.status === "Approved" ||
                                meeting.status === "Waiting on Approval")) ||
                        ((meeting.all_day || allDay) &&
                            meeting.room == room &&
                            ((getDate(newStartTime) == getDate(meetingStart) &&
                                getYear(newStartTime) ==
                                    getYear(meetingStart) &&
                                getMonth(newStartTime) ==
                                    getMonth(meetingStart)) ||
                                (getDate(newEndTime) == getDate(meetingEnd) &&
                                    getYear(newEndTime) ==
                                        getYear(meetingEnd) &&
                                    getMonth(newEndTime) ==
                                        getMonth(meetingEnd))) &&
                            (meeting.status === "Approved" ||
                                meeting.status === "Waiting on Approval"));
                }
                // Check if the new meeting overlaps with an existing meeting
                return overlaping;
            });
        }

        // If there is an overlapping meeting, return a conflict message naming
        // the room and time of the booking that is in the way.
        if (conflict) {
            return res
                .status(409)
                .json(await overlapResponse(conflict, { book: false }));
        }
        // If does not have access to book in that room, return a conflict message
        const canUserBook = await CanUserBook(room, userId);
        if (!canUserBook) {
            return res
                .status(409)
                .json({ message: "Access Denied", book: false });
        }

        // If no overlap, return success or proceed with booking logic
        return res
            .status(200)
            .json({ message: "Meeting can be booked", book: true });
    } catch (err) {
        console.error("Error fetching room groups:", err);
        res.status(500).send("Server error");
    }
};

// Create a FreshService IT support ticket for a meeting whose booker requested
// help during the meeting. Fire-and-forget: never blocks/breaks meeting creation.
async function createITSupportTicket(meeting, user) {
    try {
        if (!meeting?.it_support) return;
        if (
            !process.env.FRESHSERVICE_DOMAIN ||
            !process.env.FRESHSERVICE_API_KEY
        ) {
            console.warn(
                "FreshService not configured; skipping IT support ticket",
            );
            return;
        }

        // Resolve a friendly room name when possible
        let roomName = meeting.room;
        try {
            const room = await Room.findByPk(meeting.room);
            if (room?.value) roomName = room.value;
        } catch (e) {
            /* fall back to room id */
        }

        const fmt = (d) => {
            const date = new Date(d);
            return isNaN(date)
                ? String(d)
                : date.toLocaleString("en-US", {
                      dateStyle: "full",
                      timeStyle: "short",
                  });
        };
        const organizer =
            meeting.organizer ||
            (user ? `${user.first_name} ${user.last_name}` : "");
        const details = (meeting.it_support_details || "").replace(
            /\n/g,
            "<br/>",
        );

        const description =
            `<p>IT support has been requested for the following meeting booked in Rooms:</p>` +
            `<ul>` +
            `<li><strong>Meeting:</strong> ${meeting.name || ""}</li>` +
            `<li><strong>Organizer:</strong> ${organizer}</li>` +
            `<li><strong>Room:</strong> ${roomName}</li>` +
            `<li><strong>Start:</strong> ${fmt(meeting.start_time)}</li>` +
            `<li><strong>End:</strong> ${fmt(meeting.end_time)}</li>` +
            `</ul>` +
            `<p><strong>What they need help with:</strong></p>` +
            `<p>${details}</p>`;

        const ticket = {
            email: user?.email,
            subject: `IT support requested for meeting: ${meeting.name || ""}`,
            description,
            priority: 2, // Medium
            status: 2, // Open
            source: 2, // Portal
        };

        await axios.post(
            `https://${process.env.FRESHSERVICE_DOMAIN}/api/v2/tickets`,
            ticket,
            {
                headers: {
                    Authorization:
                        "Basic " +
                        Buffer.from(
                            process.env.FRESHSERVICE_API_KEY + ":x",
                        ).toString("base64"),
                    "Content-Type": "application/json",
                },
            },
        );
        console.log(
            `Created IT support ticket for meeting ${meeting.id} (${meeting.name})`,
        );
    } catch (err) {
        console.error(
            "Failed to create IT support ticket",
            err?.response?.data || err.message,
        );
    }
}

const Post = async (req, res) => {
    try {
        // Extract data from the request body
        const {
            start_time,
            end_time,
            room,
            location,
            type,
            organizer,
            description,
            repeats,
            name,
            retired,
            created_user_id,
            allDay,
            it_support,
            it_support_details,
        } = req.body;

        // Validate the incoming data (optional but recommended)
        if (
            !start_time ||
            !end_time ||
            !room ||
            !type ||
            !organizer ||
            !name ||
            !created_user_id
        ) {
            return res.status(400).json({ message: "Required fields missing" });
        }
        const user = await User.findByPk(created_user_id);

        // Compute final status & notify
        const tempMeeting = {
            start_time,
            end_time,
            room,
            location,
            type,
            organizer,
            description,
            repeats,
            name,
            retired,
            status: "Waiting on Approval",
            created_user_id,
            all_day: allDay,
            it_support: !!it_support,
            it_support_details: it_support ? it_support_details || "" : null,
        };
        const finalStatus = await evaluateStatusAndNotify({
            operation: "create",
            user,
            meetingData: tempMeeting,
            created_user_id,
        });
        // Create a new resource record in the database (now we have an id)
        const newResource = await Meeting.create({
            ...tempMeeting,
            status: finalStatus,
        });
        // Now that meeting has an id, send notifications if needed
        await sendApprovalNotifications(newResource, { operation: "create" });

        if (repeats != "") {
            const recurrence = await MeetingRecurrence.create({
                meeting_id: newResource.id,
                frequency: repeats,
                repeat_until: null,
                active: true,
            });
            await newResource.update({ recurrence_id: recurrence.id });
        }

        // If the booker requested IT support, open a FreshService ticket.
        // Fire-and-forget so it never delays or breaks the booking response.
        createITSupportTicket(newResource, user);

        // Return the created record as a JSON response
        res.status(201).json(newResource);
    } catch (err) {
        console.error("Error creating resource:", err);
        res.status(500).json({ message: "Server error" });
    }
};

const Update = async (req, res) => {
    try {
        const { id: userId } = req.params; // Extract ID from URL parameters
        const {
            id,
            start_time,
            end_time,
            room,
            location,
            type,
            organizer,
            description,
            repeats,
            name,
            retired,
            status,
            created_user_id,
            allDay,
            recurrence_id,
            it_support,
            it_support_details,
        } = req.body; // Extract data from the request body
        // Validate the incoming data (optional but recommended)
        if (
            !start_time ||
            !end_time ||
            !room ||
            !type ||
            !organizer ||
            !name ||
            !status ||
            !created_user_id
        ) {
            return res.status(400).json({ message: "Required fields missing" });
        }
        let canDelete = false;
        const user = await User.findByPk(userId);

        if (Number(id) === -1) {
            const recurrence = await MeetingRecurrence.findByPk(recurrence_id);
            const parentMeeting = await Meeting.findByPk(recurrence.meeting_id);
            canDelete = await CanDelete(parentMeeting.id, userId);
        } else {
            canDelete = await CanDelete(id, userId);
        }
        console.log("CanDelete", canDelete);
        if (!canDelete) {
            return res
                .status(403)
                .json({ message: "Access Denied", update: false });
        }

        const meetingStatus = await GetMeetingStatus(room, created_user_id);

        // Create meeting if this is a recurrence meeting
        if (Number(id) === -1) {
            const tempNew = {
                id: null,
                start_time,
                end_time,
                room,
                location,
                type,
                organizer,
                description,
                recurrence_id,
                repeats,
                name,
                retired,
                status,
                created_user_id,
                all_day: allDay,
                it_support: !!it_support,
                it_support_details: it_support
                    ? it_support_details || ""
                    : null,
                // Materialising an occurrence IS an edit. Without this the most
                // common recurrence change of all — editing one generated
                // occurrence — creates a row born with a NULL updater, while
                // the real-row branch fifteen lines below has always set it.
                updated_user_id: actingUserId(req, userId),
            };
            const finalStatus = await evaluateStatusAndNotify({
                operation: "create",
                user,
                meetingData: tempNew,
                created_user_id,
            });
            const newResource = await Meeting.create({
                ...tempNew,
                status: finalStatus,
            });
            await sendApprovalNotifications(newResource, {
                operation: "create",
            });
            return res.status(200).json(newResource);
        }
        // Standard update path
        const resource = await Meeting.findByPk(id);
        if (!resource) {
            return res.status(404).json({ message: "Resource not found" });
        }
        const oldResource = resource.toJSON();
        const tempUpdated = {
            id,
            start_time,
            end_time,
            room,
            location,
            type,
            organizer,
            description,
            repeats,
            name,
            retired,
            status,
            created_user_id,
            all_day: allDay,
            it_support: !!it_support,
            it_support_details: it_support ? it_support_details || "" : null,
        };
        const finalStatus = await evaluateStatusAndNotify({
            operation: "update",
            user,
            meetingData: { ...oldResource, ...tempUpdated },
            existingMeeting: oldResource,
            created_user_id,
        });
        await resource.update({
            ...tempUpdated,
            status: finalStatus,
            updated_user_id: actingUserId(req, userId),
        });
        if (repeats != null && repeats != "" && !recurrence_id) {
            const recurrence = await MeetingRecurrence.create({
                meeting_id: resource.id,
                frequency: resource.repeats,
                active: true,
            });
            await resource.update({ recurrence_id: recurrence.id });
        }
        return res.status(200).json(resource);
    } catch (err) {
        console.error("Error updating resource:", err);
        res.status(500).json({ message: "Server error" });
    }
};

const UpdateOnlyParentRecurrence = async (req, res) => {
    try {
        const { id: userId } = req.params; // Extract ID from URL parameters
        const {
            id,
            start_time,
            end_time,
            room,
            location,
            type,
            organizer,
            description,
            repeats,
            name,
            retired,
            status,
            created_user_id,
            recurrence_id,
            all_day: allDay,
        } = req.body; // Extract data from the request body
        // Validate the incoming data (optional but recommended)
        if (
            !start_time ||
            !end_time ||
            !room ||
            !type ||
            !organizer ||
            !name ||
            !status ||
            !created_user_id ||
            !recurrence_id
        ) {
            return res.status(400).json({ message: "Required fields missing" });
        }
        let canDelete = false;
        const user = await User.findByPk(userId);
        canDelete = await CanDelete(id, userId);

        if (!canDelete) {
            return res
                .status(403)
                .json({ message: "Access Denied", update: false });
        }

        // THE FETCH HAS TO COME FIRST. It used to sit below the status block
        // that reads `resource.toJSON()`, which put the read in the temporal
        // dead zone of its own `const` — a ReferenceError, thrown on every
        // single call and swallowed by this function's `try`/`catch` into a
        // generic 500. "Just this one" on a recurring meeting therefore never
        // worked at all; it is the sibling of "this one and everything after"
        // in the scope dialog, so half of that dialog was dead.
        const resource = await Meeting.findByPk(id);
        if (!resource) {
            return res.status(404).json({ message: "Resource not found" });
        }
        const recurance = await MeetingRecurrence.findByPk(
            resource.recurrence_id,
        );

        // Determine final status & send notifications
        const tempResource = {
            ...resource.toJSON(),
            start_time,
            end_time,
            room,
            location,
            type,
            organizer,
            description,
            repeats: null,
            name,
            retired,
            all_day: allDay,
            status,
        };
        const finalStatus = await evaluateStatusAndNotify({
            operation: "update",
            user,
            meetingData: tempResource,
            existingMeeting: resource.toJSON(),
            created_user_id: resource.created_user_id,
        });

        // `resource` and `recurance` are fetched above, before anything reads
        // them.
        if (
            repeats != null &&
            repeats != "" &&
            repeats != recurance.frequency
        ) {
            return res.status(409).json({
                message:
                    "Cannot Modify Parent Meeting With New Recurrence Schedule",
                update: false,
            });
        }
        // Find the next parent meeting
        const fakeMeets = await CreateRepeatingMeetings(
            start_time,
            "Month",
            userId,
        );
        let nextDate = new Date(resource.start_time);
        switch (recurance.frequency) {
            case "Daily":
                nextDate.setDate(nextDate.getDate() + 1);
                break;
            case "Weekly":
                nextDate.setDate(nextDate.getDate() + 7);
                break;
            case "Monthly":
                nextDate.setMonth(nextDate.getMonth() + 2);
                break;
            case "Yearly":
                nextDate.setFullYear(nextDate.getFullYear() + 1);
                break;
            default:
                throw new Error("Invalid range");
        }
        const nextParentMeet = fakeMeets?.find(
            (fm) => fm.start_time == nextDate.toISOString(),
        );
        if (!nextParentMeet) {
            res.status(500).json({
                message: "Server error, Failed to find new parent meeting.",
            });
        }

        // Create the fake meeting
        const nextParent = await Meeting.create({
            ...nextParentMeet,
            id: null,
        });
        await recurance.update({
            meeting_id: nextParent.id,
        });

        //Update the resource record in the database
        await resource.update({
            start_time,
            end_time,
            room,
            location,
            type,
            organizer,
            description,
            recurrence_id: null,
            repeats: null,
            name,
            retired,
            all_day: allDay,
            status: finalStatus,
            created_user_id,
            // NOT a revival of this endpoint — it still throws on a temporal
            // dead zone read of `resource` above. This only means that when
            // someone does fix it, it stops writing a MEETING id into the actor
            // column: MeetingForum.jsx passes `meeting.id` where this route
            // reads `:id` as a user id.
            updated_user_id: actingUserId(req, userId),
        });
        console.log(
            "Updated meeting",
            new Date(start_time),
            new Date(end_time),
        );
        // Return the updated record as a JSON response
        res.status(200).json(resource);
    } catch (err) {
        console.error("Error updating resource:", err);
        res.status(500).json({ message: "Server error" });
    }
};

const UpdateAllRecurrence = async (req, res) => {
    try {
        const { userId } = req.params; // Extract ID from URL parameters
        const {
            start_time,
            end_time,
            room,
            location,
            type,
            organizer,
            description,
            repeats,
            name,
            status,
            created_user_id,
            new_start_time,
            new_end_time,
            recurrence_id,
            allDay,
        } = req.body; // Extract data from the request body
        // Validate the incoming data (optional but recommended)
        if (
            !start_time ||
            !end_time ||
            !room ||
            !type ||
            !organizer ||
            !name ||
            !status ||
            !created_user_id
        ) {
            return res.status(400).json({ message: "Required fields missing" });
        }
        let canDelete = false;
        const recurance = await MeetingRecurrence.findByPk(recurrence_id);
        const resource = await Meeting.findByPk(recurance.meeting_id);
        const user = await User.findByPk(userId);
        canDelete = await CanDelete(resource.id, userId);

        if (!canDelete) {
            return res
                .status(403)
                .json({ message: "Access Denied", update: false });
        }
        // Work out the parent's new times before anything reads them.
        //
        // Drag/resize sends where the occurrence moved to (new_start_time /
        // new_end_time) so the same shift can be applied to the parent — fake
        // repeating meetings are not actually stored, so the parent is all we
        // have to move. The edit form has already baked the new time into
        // start_time/end_time and sends no new_* pair; there the intent is to
        // apply the submitted time-of-day to the parent's own date.
        let newStart;
        let newEnd;
        if (new_start_time && new_end_time) {
            const startDeltaMs =
                new Date(new_start_time).getTime() -
                new Date(start_time).getTime();
            const endDeltaMs =
                new Date(new_end_time).getTime() - new Date(end_time).getTime();
            newStart = new Date(
                new Date(resource.start_time).getTime() + startDeltaMs,
            );
            newEnd = new Date(
                new Date(resource.end_time).getTime() + endDeltaMs,
            );
        } else {
            newStart = applyTimeOfDay(resource.start_time, start_time);
            newEnd = applyTimeOfDay(resource.end_time, end_time);
        }

        // Determine status & notify for full recurrence update
        const tempFull = {
            ...resource.toJSON(),
            start_time: newStart,
            end_time: newEnd,
            room,
            location,
            type,
            organizer,
            description,
            repeats,
            name,
            status,
        };
        const finalStatusFull = await evaluateStatusAndNotify({
            operation: "update",
            user,
            meetingData: tempFull,
            existingMeeting: resource.toJSON(),
            created_user_id: resource.created_user_id,
        });

        // Dont allow to book meet if it overlaps with other meetings
        let fakeMeets = await CreateRepeatingMeetingsOfThisMeeting(resource);
        fakeMeets = fakeMeets.map((fm) => fm.dataValues);

        // Dont allow update if it overlaps with other meetings
        for (const fm of fakeMeets) {
            const overlap = await isOverlappingFakeMeetUpdate(fm);
            if (overlap) {
                return res
                    .status(409)
                    .json(await overlapResponse(overlap, { update: false }));
            }
        }

        await recurance.update({
            frequency: repeats,
        });
        //Update the resource record in the database
        await resource.update({
            ...resource.dataValues,
            start_time: newStart,
            end_time: newEnd,
            all_day: allDay,
            description,
            location,
            room,
            type,
            organizer,
            description,
            name,
            updated_user_id: userId,
            status: finalStatusFull,
        });
        // Return the updated record as a JSON response
        res.status(200).json(resource);
    } catch (err) {
        console.error("Error updating resource:", err);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * PUT /api/meetings/updatenext/:userId — "this one and everything after".
 *
 * SPLIT SURGERY. Only the first meeting of a recurrence is a row; every later
 * occurrence is generated per request from that row. So this cannot update N
 * rows — it ENDS the old series the day before the split and STARTS a new one
 * at it. Get the order or the boundary wrong and you duplicate a series,
 * orphan one, or delete bookings from every calendar, which is why the writes
 * are in one transaction.
 *
 * WHERE THE SPLIT LANDS is chosen by `split_from`:
 *   "occurrence" — the default, and what the DRAG path gets by omitting the
 *       key entirely: split at the meeting the user opened. Unchanged.
 *   "today" — split at the first occurrence whose calendar day is not before
 *       today, leaving everything that already happened alone. THE CLIENT MUST
 *       NOT COMPUTE THAT DATE: occurrences have no rows, `repeat_until` and
 *       `active` are not on the wire, and a bare "today" would re-phase the
 *       series onto whatever weekday today happens to be.
 */
const UpdateAllNextInRecurrence = async (req, res) => {
    try {
        const { userId } = req.params;
        const {
            start_time,
            end_time,
            new_start_time,
            new_end_time,
            room,
            location,
            type,
            organizer,
            description,
            repeats,
            name,
            retired,
            status,
            created_user_id,
            recurrence_id,
            allDay,
            it_support,
            it_support_details,
            split_from,
        } = req.body;

        if (
            !start_time ||
            !end_time ||
            !room ||
            !type ||
            !organizer ||
            !name ||
            !status ||
            !created_user_id ||
            !recurrence_id
        ) {
            return res
                .status(400)
                .json({ message: "Required fields missing", update: false });
        }

        // Was an unguarded `.meeting_id` read that 500'd on a stale id.
        const oldRecurrence = await MeetingRecurrence.findByPk(recurrence_id);
        if (!oldRecurrence) {
            return res
                .status(404)
                .json({ message: "Recurrence not found", update: false });
        }
        const oldMeeting = await Meeting.findByPk(oldRecurrence.meeting_id);
        if (!oldMeeting) {
            return res
                .status(404)
                .json({ message: "Series parent not found", update: false });
        }

        const canDelete = await CanDelete(oldMeeting.id, userId);
        if (!canDelete) {
            return res
                .status(403)
                .json({ message: "Access Denied", update: false });
        }
        const actorId = actingUserId(req, userId);
        const user = await User.findByPk(userId);

        // A recurrence parent with no schedule is a series that silently stops:
        // `frequency` is allowNull:false but unconstrained, so "" passes
        // validation and then every generator skips the series — by which time
        // the old series has already been ended. Refuse, and name the flow that
        // actually means "stop repeating".
        if (!isKnownRecurrenceFrequency(repeats)) {
            return res.status(409).json({
                message:
                    "Choose how often this meeting repeats. To stop it repeating, cancel this one and everything after.",
                update: false,
            });
        }

        // WHERE THE NEW PARENT STARTS depends on who is calling. A drag sends
        // `new_start_time`/`new_end_time` — where the occurrence was moved TO —
        // alongside the times it had before. The edit form sends no `new_*`
        // pair at all: it has already baked the submitted time-of-day into
        // `start_time`/`end_time`. Reading only `new_*` meant every save from
        // the form created a Meeting with null times and 500'd. KEEP THIS.
        let splitStart = new_start_time || start_time;
        let splitEnd = new_end_time || end_time;

        if (split_from === "today") {
            const anchor = firstOccurrenceOnOrAfter(
                oldMeeting,
                oldRecurrence,
                new Date(),
            );
            if (!anchor) {
                return res.status(409).json({
                    message:
                        "This series has no meetings left from today onward. Choose the past meeting instead, or edit an upcoming meeting.",
                    update: false,
                });
            }
            // The form baked the submitted clock time onto the date of the
            // occurrence the user CLICKED, which is not the date we split at.
            // Keep the anchor's date — it is the one the calendar drew — and
            // take the clock time from the submission. Same move
            // UpdateAllRecurrence makes, applied to an occurrence the user
            // never clicked. Start and end carry their own dates so a multi-day
            // booking keeps its span, and an all-day booking (stored
            // midnight-to-midnight, start === end) keeps its shape.
            const anchorStart = applyTimeOfDay(anchor.start, splitStart);
            let anchorEnd = applyTimeOfDay(anchor.end, splitEnd);
            if (!allDay && anchorEnd <= anchorStart) {
                // The form's own guard blocks this (`start >= end && !allDay`),
                // so this is for other callers: keep the submitted duration
                // rather than store a row no view can draw.
                anchorEnd = new Date(
                    anchorStart.getTime() +
                        (new Date(splitEnd).getTime() -
                            new Date(splitStart).getTime()),
                );
            }
            splitStart = anchorStart.toISOString();
            splitEnd = anchorEnd.toISOString();
        }

        const before = oldMeeting.toJSON();
        const anchorDay = startOfDay(new Date(splitStart));

        // ── The occurrence being edited IS the first meeting of the series ──
        // Creating a row here leaves TWO rows in the same slot: the new parent
        // and the old parent, which nothing in this function retires — plus two
        // live recurrences. When "this one" is the FIRST meeting of the series
        // there is nothing earlier to preserve, so "this one and everything
        // after" is just the parent updated in place. This is NOT the
        // whole-series option that was deliberately removed from the scope
        // dialog: it is reached only when the occurrence the user picked IS the
        // first one, so the edit still never reaches further back than the
        // meeting they opened.
        //
        // TWO WAYS TO BE THE FIRST MEETING, and the date test only catches one.
        // `anchorDay <= parent day` catches an edit anchored at or before where
        // the parent sits. It does NOT catch the parent being moved FORWARD,
        // which is exactly what a drag does — and a drag reaches this endpoint
        // only for a parent ROW (`IsMeetingParentRecurrence` gates it in
        // Calendar/index.jsx), while the form pins the date and can only change
        // the clock. So dragging the series' first meeting to a later day used
        // to take the split branch: the old parent kept drawing at the day it
        // had just been moved off, beside a new parent at the new one. One drag,
        // two meetings. Comparing the ids closes that half.
        const isParentRow =
            before?.id != null && Number(req?.body?.id) === Number(before?.id);
        if (
            isParentRow ||
            anchorDay <= startOfDay(new Date(before.start_time))
        ) {
            const inPlace = {
                start_time: splitStart,
                end_time: splitEnd,
                room,
                location,
                type,
                organizer,
                description,
                repeats,
                name,
                retired,
                all_day: allDay,
                it_support: !!it_support,
                it_support_details: it_support
                    ? it_support_details || ""
                    : null,
            };
            const finalStatusInPlace = await evaluateStatusAndNotify({
                operation: "update",
                user,
                meetingData: { ...before, ...inPlace },
                existingMeeting: before,
                created_user_id,
            });

            const occurrences = [
                {
                    ...before,
                    ...inPlace,
                    id: -1,
                    recurrence_id: oldRecurrence.id,
                },
                ...(await CreateRepeatingMeetingsOfThisMeeting({
                    ...before,
                    ...inPlace,
                    recurrence_id: oldRecurrence.id,
                })),
            ];
            const overlap = await findOverlapForGeneratedSeries(occurrences, {
                room,
                recurrenceId: oldRecurrence.id,
            });
            if (overlap) {
                return res
                    .status(409)
                    .json(await overlapResponse(overlap, { update: false }));
            }

            await sequelize.transaction(async (t) => {
                await oldMeeting.update(
                    {
                        ...inPlace,
                        status: finalStatusInPlace,
                        updated_user_id: actorId,
                    },
                    { transaction: t },
                );
                // The cadence itself can change on this path — no new
                // recurrence row is created to carry it — so the existing one
                // has to be corrected or the generators keep stepping the old
                // way while `repeats` on the row says something else.
                if (oldRecurrence.frequency !== repeats) {
                    await oldRecurrence.update(
                        { frequency: repeats },
                        { transaction: t },
                    );
                }
            });
            // evaluateStatusAndNotify already mailed the approvers for an
            // update (meetingData carries the row's id), so there is no second
            // sendApprovalNotifications here — same as UpdateAllRecurrence.
            return res.status(200).json(oldMeeting);
        }

        // ── Genuine split ──────────────────────────────────────────────────
        const tempNext = {
            ...before,
            start_time: splitStart,
            end_time: splitEnd,
            room,
            location,
            type,
            organizer,
            description,
            repeats,
            name,
            status,
        };
        const finalStatusNext = await evaluateStatusAndNotify({
            operation: "create",
            user,
            meetingData: tempNext,
            existingMeeting: before,
            created_user_id,
        });

        const draft = {
            start_time: splitStart,
            end_time: splitEnd,
            room,
            location,
            type,
            organizer,
            description,
            repeats,
            name,
            retired,
            all_day: allDay,
            // Neither field was destructured before, so the new parent fell
            // back to the model defaults (false / null) and the series silently
            // lost its IT support request — the same class of bug plan.md
            // records for all_day in Update's materialisation branch.
            it_support: !!it_support,
            it_support_details: it_support ? it_support_details || "" : null,
            status: finalStatusNext,
            // The series keeps its BOOKER. Overwriting this with the editor
            // moved the series into the editor's My Bookings
            // (GetAllUserCreated filters created_user_id), took the
            // `created_user_id == userId` shortcut in CanDelete away from the
            // person who booked it, and sent their approved / declined mail to
            // the editor.
            created_user_id,
            updated_user_id: actorId,
            recurrence_id,
        };

        // The anchor itself was never overlap-checked: the generator advances
        // BEFORE it emits, so it never returns its own seed.
        const occurrences = [
            { ...draft, id: -1 },
            ...(await CreateRepeatingMeetingsOfThisMeeting(draft)),
        ];
        const overlap = await findOverlapForGeneratedSeries(occurrences, {
            room,
            recurrenceId: recurrence_id,
        });
        if (overlap) {
            return res
                .status(409)
                .json(await overlapResponse(overlap, { update: false }));
        }

        // repeat_until is INCLUSIVE and is tested against a cursor carrying the
        // PARENT's time-of-day, while the split carries the newly submitted
        // one. `anchor - 1 day` at the new clock time therefore DROPS the
        // previous daily occurrence whenever the meeting moves earlier in the
        // day (9:00 daily series split at Jul 15 moved to 8:00 -> repeat_until
        // Jul 14 08:00 -> Jul 14's 9:00 meeting tests `>` and disappears).
        // End of that day is what the boundary always meant.
        const dayBefore = new Date(splitStart);
        dayBefore.setDate(dayBefore.getDate() - 1);
        const stopDate = endOfDay(dayBefore);

        let created;
        await sequelize.transaction(async (t) => {
            created = await Meeting.create(
                { ...draft, id: null },
                { transaction: t },
            );
            await oldRecurrence.update(
                { repeat_until: stopDate },
                { transaction: t },
            );
            const newRecurrence = await MeetingRecurrence.create(
                {
                    meeting_id: created.id,
                    frequency: repeats,
                    repeat_until: null,
                    active: true,
                },
                { transaction: t },
            );
            await created.update(
                { recurrence_id: newRecurrence.id },
                { transaction: t },
            );

            // EXCEPTIONS THAT ARE ALREADY ROWS. An occurrence someone moved,
            // edited or had approved individually is a REAL row still carrying
            // the OLD recurrence_id, and stopping the old recurrence does not
            // touch it — repeat_until only bounds GENERATION. Left alone it
            // would sit on the calendar beside the NEW series' generated
            // occurrence for the same slot, because both duplicate-suppression
            // sets are keyed on the parent's own recurrence_id. Move them onto
            // the new series so they keep suppressing. Their own times, room
            // and status are deliberately NOT rewritten: they were made
            // exceptions on purpose.
            await Meeting.update(
                { recurrence_id: newRecurrence.id, updated_user_id: actorId },
                {
                    where: {
                        recurrence_id: oldRecurrence.id,
                        id: {
                            [Sequelize.Op.notIn]: [oldMeeting.id, created.id],
                        },
                        start_time: { [Sequelize.Op.gte]: anchorDay },
                    },
                    transaction: t,
                },
            );

            // THE OLD PARENT IS DELIBERATELY NOT STAMPED.
            //
            // Nothing about that row changed: the truncation lives on
            // MeetingRecurrence.repeat_until, not on the meeting. Stamping it
            // would be defensible as provenance for the series — except that a
            // generated occurrence inherits its parent's audit columns
            // (`CreateRepeatingMeetings` spreads `meeting.toJSON()`), so every
            // occurrence the user CHOSE NOT TO CHANGE would open with
            // "Series updated by <them>" against a meeting they explicitly left
            // alone. The whole point of the "from today" option is that the
            // past keeps its old time, room and details; the audit line has to
            // agree with that, not quietly contradict it.
            //
            // If who-truncated-a-series is ever worth recording, it belongs on
            // MeetingRecurrence, which has no audit columns yet — and that is a
            // migration, not a line here.
        });

        await sendApprovalNotifications(created, {
            operation: "create",
            existingMeeting: before,
        });
        return res.status(200).json(created);
    } catch (err) {
        console.error("Error updating resource:", err);
        res.status(500).json({ message: "Server error" });
    }
};

const UpdateCurrentInRecurrence = async (req, res) => {
    try {
        const { userId } = req.params; // Extract ID from URL parameters
        const {
            id,
            start_time,
            end_time,
            new_start_time,
            new_end_time,
            room,
            location,
            type,
            organizer,
            description,
            repeats,
            name,
            retired,
            status,
            created_user_id,
            recurrence_id,
            allDay,
            it_support,
            it_support_details,
        } = req.body; // Extract data from the request body
        // Validate the incoming data (optional but recommended)
        if (
            !start_time ||
            !end_time ||
            !room ||
            !type ||
            !organizer ||
            !name ||
            !status ||
            !created_user_id
        ) {
            return res
                .status(400)
                .json({ message: "Required fields missing", update: false });
        }
        let canDelete = false;
        const oldRecurrence = await MeetingRecurrence.findByPk(recurrence_id);
        const oldMeeting = await Meeting.findByPk(oldRecurrence.meeting_id);
        canDelete = await CanDelete(oldMeeting.id, userId);

        if (!canDelete) {
            return res
                .status(403)
                .json({ message: "Access Denied", update: false });
        }

        // Defensive: only the drag path calls this today and it always sends
        // new_*. If "Just this one" is ever repointed here, the form sends
        // neither and every save would create a row with null times and 500 —
        // the exact bug just fixed in UpdateAllNextInRecurrence.
        const currentStart = new_start_time || start_time;
        const currentEnd = new_end_time || end_time;

        // Determine status & notify for current-in-recurrence branch
        const tempCurrent = {
            ...(oldMeeting.toJSON?.() ? oldMeeting.toJSON() : oldMeeting),
            start_time: currentStart,
            end_time: currentEnd,
            room,
            location,
            type,
            organizer,
            description,
            repeats,
            name,
            status,
        };
        const finalStatusCurrent = await evaluateStatusAndNotify({
            operation: "create",
            user: await User.findByPk(userId),
            meetingData: tempCurrent,
            existingMeeting: oldMeeting.toJSON
                ? oldMeeting.toJSON()
                : oldMeeting,
            created_user_id: created_user_id,
        });
        let meeting = {
            id,
            start_time: currentStart,
            end_time: currentEnd,
            room,
            location,
            type,
            organizer,
            description,
            repeats,
            name,
            retired,
            status,
            created_user_id,
            recurrence_id,
            all_day: allDay,
            // Same omission the split had: neither field was destructured, so
            // the materialised row fell back to the model defaults and lost the
            // IT support request. Shape matches `Update`.
            it_support: !!it_support,
            it_support_details: it_support ? it_support_details || "" : null,
        };
        const overlapFakeMeet = await isOverlappingFakeMeet(meeting);
        const overlapMeeting = await isOverlapping(meeting);
        if (overlapFakeMeet || overlapMeeting) {
            return res.status(409).json(
                await overlapResponse(overlapFakeMeet || overlapMeeting, {
                    update: false,
                }),
            );
        }

        // Update the meeting the user wants to move.
        // `created_user_id` is deliberately NOT overwritten with the editor:
        // the occurrence keeps its BOOKER, or it moves into the editor's My
        // Bookings, loses the booker's `created_user_id == userId` shortcut in
        // CanDelete, and sends their approval mail to the editor. The literal
        // above already carries the booker's id from the body.
        meeting = await Meeting.create({
            ...meeting,
            status: finalStatusCurrent,
            updated_user_id: actingUserId(req, userId),
            id: null,
        });
        await sendApprovalNotifications(meeting, {
            operation: "create",
            existingMeeting: oldMeeting,
        });

        // Return the updated record as a JSON response
        res.status(200).json(meeting);
    } catch (err) {
        console.error("Error updating resource:", err);
        res.status(500).json({ message: "Server error" });
    }
};

const Delete = async (req, res) => {
    try {
        const { id, userId } = req.body; // Extract ID from URL parameters

        const canDelete = await CanDelete(id, userId);
        if (!canDelete) {
            return res
                .status(409)
                .json({ message: "Access Denied", delete: false });
        }

        // Find the existing resource by ID
        const resource = await Meeting.findByPk(id);
        if (!resource) {
            return res.status(404).json({ message: "Resource not found" });
        }

        // Delete the resource record from the database
        await resource.update({
            status: "Deleted",
            updated_user_id: actingUserId(req, userId),
        });

        // Return a success message
        res.status(200).json({ message: "Resource deleted successfully" });
    } catch (err) {
        console.error("Error deleting resource:", err);
        res.status(500).json({ message: "Server error" });
    }
};

const CancelNext = async (req, res) => {
    const { recurrence_id, userId, date } = req.body; // Extract ID from URL parameters
    const recurrence = await MeetingRecurrence.findByPk(recurrence_id);

    const canDelete = await CanDelete(recurrence.meeting_id, userId);
    if (!canDelete) {
        return res
            .status(409)
            .json({ message: "Access Denied", delete: false });
    }
    await recurrence.update({ repeat_until: date });
    // Truncating a series is a change to it, and until now nothing recorded who
    // did it: the only write is to MeetingRecurrence, which has no
    // updated_user_id column. The parent row is what carries the series'
    // provenance into the detail dialog, and stamping it also bumps updatedAt.
    const parent = await Meeting.findByPk(recurrence.meeting_id);
    if (parent) {
        await parent.update({ updated_user_id: actingUserId(req, userId) });
    }
    res.status(200).json({ message: "Meetings updated" });
};

const CancelAll = async (req, res) => {
    const { recurrence_id, userId } = req.body; // Extract ID from URL parameters
    const recurrence = await MeetingRecurrence.findByPk(recurrence_id);

    const canDelete = await CanDelete(recurrence.meeting_id, userId);
    if (!canDelete) {
        return res
            .status(409)
            .json({ message: "Access Denied", delete: false });
    }
    const today = new Date();
    const meetings = await Meeting.findAll({
        where: {
            recurrence_id: recurrence_id,
        },
    });
    for (const meet of meetings) {
        await meet.update({
            status: "Canceled",
            updated_user_id: actingUserId(req, userId),
        });
    }

    await recurrence.update({ active: false, repeat_until: today });
    res.status(200).json({ message: "Meetings Canceled" });
};

module.exports = {
    GetAll,
    Post,
    Update,
    Delete,
    GetAllUserCanSee,
    CanBook,
    GetAllNeedsApproval,
    SetStatus,
    GetAllUserCreated,
    CanDelete,
    UpdateOnlyParentRecurrence,
    CancelNext,
    CancelAll,
    UpdateAllNextInRecurrence,
    UpdateAllRecurrence,
    UpdateCurrentInRecurrence,
};
// TODO Test authentication to change other peoples meetings
