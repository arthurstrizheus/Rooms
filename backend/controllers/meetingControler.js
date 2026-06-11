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
    if (user?.office_admin == room.location) {
        return true;
    }

    // Fetch all groups the user belongs to
    const groupUsers = await GroupUser.findAll({ where: { user_id: user.id } });

    // If the user is not part of any group, return an empty array
    if (!groupUsers.length) {
        return res.status(200).json([]);
    }

    // Extract group IDs the user belongs to
    const groupIds = groupUsers?.map((gu) => gu.group_id);

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

    // Check for overlapping meetings
    const isOverlapping = meetings.some((meeting) => {
        const meetingStart = new Date(meeting.start_time);
        const meetingEnd = new Date(meeting.end_time);

        // Return true if there is an overlap
        return newStartTime < meetingEnd && newEndTime > meetingStart;
    });

    return isOverlapping; // Return true if overlap is found, false otherwise
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

    // Check for overlapping meetings
    const isOverlapping = meetings.some((meeting) => {
        const meetingStart = new Date(meeting.start_time);
        const meetingEnd = new Date(meeting.end_time);

        let isOverlap = meeting.recurrence_id === meet.recurrence_id;

        // Return true if there is an overlap
        return (
            newStartTime < meetingEnd && newEndTime > meetingStart && isOverlap
        );
    });

    return isOverlapping; // Return true if overlap is found, false otherwise
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

    // Check for overlapping meetings
    const isOverlapping = meetings.some((meeting) => {
        const meetingStart = new Date(meeting.start_time);
        const meetingEnd = new Date(meeting.end_time);

        if (meeting.recurrence_id === meet.recurrence_id) {
            return false;
        }
        let isOverlap = newStartTime < meetingEnd && newEndTime > meetingStart;
        // Return true if there is an overlap
        return isOverlap;
    });

    return isOverlapping; // Return true if overlap is found, false otherwise
}

async function CreateRepeatingMeetingsOfThisMeeting(meeting) {
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

async function CreateRepeatingMeetings(
    currentDate,
    range,
    userId,
    userOnly = false,
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

    for (let meeting of meetingsWithRecurrence) {
        // User special permissions
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
            const meetIds = meetingsUserHasSpecialAccess?.map((mt) => mt.id);
            if (
                (!CanSeeMeet(meeting, user) && !meetIds.includes(meeting.id)) ||
                !CanSeeMeet(meeting, user)
            )
                continue;
        }
        if (!CanSeeMeet(meeting, user)) continue; // Skip if user cannot see this meeting
        if (meeting.status === "Canceled") continue;

        const recurrence = await MeetingRecurrence.findByPk(
            meeting.recurrence_id,
        );
        if (!recurrence || !recurrence?.active) continue; // Skip if no recurrence exists…

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
            let updatedUser = null;
            if (meeting.dataValues.updated_user_id) {
                updatedUser = await User.findByPk(
                    meeting.dataValues.updated_user_id,
                );
            }

            // Overlapping‑check… if it still passes, push the fake
            const fakeMeet = {
                ...meeting.toJSON(),
                id: -1, // Fake meeting ID
                start_time: currentStartTime.toISOString(),
                end_time: currentEndTime.toISOString(),
                recurrence_id: meeting.recurrence_id,
                updatedUser: updatedUser ? updatedUser : null,
            };
            // Only push non-overlapping fake meetings
            // console.log('New Fake Meet', fakeMeet);
            const createFakeMeet = await isOverlappingFakeMeet(fakeMeet);
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
            const newResource = await Meeting.create({
                ...meeting,
                id: null,
                status: status,
                updated_user_id: userId,
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

                if (newParent.id === -1) {
                    console.log("Create new Parent");
                    const newMeeting = await Meeting.create({
                        ...newParent,
                        id: null,
                    });

                    await recurrence.update({
                        meeting_id: newMeeting.id,
                        updated_user_id: userId,
                    });
                } else {
                    await recurrence.update({
                        meeting_id: newParent.id,
                        updated_user_id: userId,
                    });
                }
            } else if (recurrence && status == "Declined") {
                await recurrence.update({
                    active: false,
                    updated_user_id: userId,
                });
            }
            // Update the resource record in the database

            await resource.update({
                status,
                updated_user_id: userId,
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

        const fakeMeets = await CreateRepeatingMeetings(date, range, id); // Create repeating meetings if they do not exist, only the next 30 from the date

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

        // Check for overlapping meetings
        let isOverlapping = allMeetsWithRecurrance.some((meeting) => {
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

        if (!isOverlapping && repeats != "") {
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
            isOverlapping = fakeMeets2.some((meeting) => {
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
        if (!isOverlapping) {
            isOverlapping = blockedDates.some((meeting) => {
                const meetingStart = new Date(meeting.start_time);
                const meetingEnd = new Date(meeting.end_time);
                // Check if the new meeting overlaps with an blocked dates
                return (
                    (newStartTime < meetingEnd && newEndTime > meetingStart) ||
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
            if (isOverlapping) {
                return res.status(409).json({
                    message:
                        "Meeting time overlaps with a blocked section of time",
                    book: false,
                });
            }
        }

        // Check if its overlaping any standard meetings.
        if (!isOverlapping) {
            isOverlapping = meetings.some((meeting) => {
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

        // If there is an overlapping meeting, return a conflict message
        if (isOverlapping) {
            return res.status(409).json({
                message: "Meeting time overlaps with an existing meeting",
                book: false,
            });
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
            updated_user_id: userId,
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

        // Find the existing resource by ID
        console.log("Updating Parent MeetingId", id);
        const resource = await Meeting.findByPk(id);
        const recurance = await MeetingRecurrence.findByPk(
            resource.recurrence_id,
        );
        if (!resource) {
            return res.status(404).json({ message: "Resource not found" });
        } else if (
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
            updated_user_id: userId,
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
                return res.status(409).json({
                    message: "Meeting time overlaps with an existing meeting",
                    update: false,
                });
            }
        }

        await recurance.update({
            frequency: repeats,
        });
        // Need to find the original meeting that the user dragged (Fake repeating meetings are not acutall stored because who want coding to be easy!)
        let startDeltaMs =
            new Date(start_time).getTime() - new Date(new_start_time).getTime();
        let endDeltaMs =
            new Date(end_time).getTime() - new Date(new_end_time).getTime();

        // Are we adding or subtracting time
        startDeltaMs = startDeltaMs * -1;
        endDeltaMs = endDeltaMs * -1;

        // Now apply those deltas
        const newStart = new Date(
            new Date(resource.start_time).getTime() + startDeltaMs,
        );
        const newEnd = new Date(
            new Date(resource.end_time).getTime() + endDeltaMs,
        );
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

const UpdateAllNextInRecurrence = async (req, res) => {
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
        // Determine status & notify for next-in-recurrence branch
        const tempNext = {
            ...(oldMeeting.toJSON?.() ? oldMeeting.toJSON() : oldMeeting),
            start_time: new_start_time,
            end_time: new_end_time,
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
            user: await User.findByPk(userId),
            meetingData: tempNext,
            existingMeeting: oldMeeting.toJSON
                ? oldMeeting.toJSON()
                : oldMeeting,
            created_user_id: created_user_id,
        });
        let meeting = {
            id,
            start_time: new_start_time,
            end_time: new_end_time,
            room,
            location,
            type,
            organizer,
            description,
            repeats,
            name,
            retired,
            all_day: allDay,
            status,
            created_user_id,
            recurrence_id,
        };

        let fakeMeets = await CreateRepeatingMeetingsOfThisMeeting(meeting);

        // Dont allow update if it overlaps with other meetings
        for (const fm of fakeMeets) {
            const overlap = await isOverlappingFakeMeetUpdate(fm);
            if (overlap) {
                return res.status(409).json({
                    message: "Meeting time overlaps with an existing meeting",
                    update: false,
                });
            }
        }

        // Create a new meeting as the parent for all future recurrences
        meeting = await Meeting.create({
            ...meeting,
            created_user_id: userId,
            status: finalStatusNext,
            updated_user_id: userId,
            id: null,
        });
        await sendApprovalNotifications(meeting, {
            operation: "create",
            existingMeeting: oldMeeting,
        });

        // Stop the old recurring meetings at the updated one
        let stopDate = new Date(meeting.start_time);
        stopDate.setDate(new Date(meeting.start_time).getDate() - 1);
        await oldRecurrence.update({
            repeat_until: stopDate,
        });

        // Create new recurrence from then on for the updated times
        const recurrence = await MeetingRecurrence.create({
            meeting_id: meeting.id,
            frequency: repeats,
            repeat_until: null,
            active: true,
        });

        //Update the resource record in the database
        await meeting.update({
            recurrence_id: recurrence.id,
        });
        // Return the updated record as a JSON response
        res.status(200).json(meeting);
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

        // Determine status & notify for current-in-recurrence branch
        const tempCurrent = {
            ...(oldMeeting.toJSON?.() ? oldMeeting.toJSON() : oldMeeting),
            start_time: new_start_time,
            end_time: new_end_time,
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
            start_time: new_start_time,
            end_time: new_end_time,
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
        };
        // find next meeting that wil become a parent after
        // let fakeMeets = await CreateRepeatingMeetingsOfThisMeeting(meeting);
        // update the times
        meeting = {
            ...meeting,
            start_time: new_start_time,
            end_time: new_end_time,
        };
        const overlapFakeMeet = await isOverlappingFakeMeet(meeting);
        const overlapMeeting = await isOverlapping(meeting);
        if (overlapFakeMeet || overlapMeeting) {
            return res.status(409).json({
                message: "Meeting time overlaps with an existing meeting",
                update: false,
            });
        }

        // Update the meeting the user wants to move
        meeting = await Meeting.create({
            ...meeting,
            created_user_id: userId,
            status: finalStatusCurrent,
            updated_user_id: userId,
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
        await resource.update({ status: "Deleted", updated_user_id: userId });

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
        await meet.update({ status: "Canceled", updated_user_id: userId });
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
