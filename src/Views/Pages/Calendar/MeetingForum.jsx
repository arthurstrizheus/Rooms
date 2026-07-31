import axios from "axios";
import { useEffect, useState } from "react";
import {
    getHours,
    getMinutes,
    setTime,
} from "../../../Utilites/Functions/CommonFunctions";
import { useAuth } from "../../../Utilites/AuthContext";
import ImageViewer from "../../../Components/ImageViewer";
import { openSnackbar } from "../../../Utilites/SnackbarContext";
import {
    Box,
    MenuItem,
    Autocomplete,
    TextField,
    CircularProgress,
} from "@mui/material";
import {
    CheckPostMeeting,
    PostMeeting,
    UpdateAllNextMeetingsInRecurrence,
    UpdateParentOnlyMeeting,
    UpdateMeeting,
} from "../../../Utilites/Functions/ApiFunctions/MeetingFunctions";
import { GetUsers } from "../../../Utilites/Functions/ApiFunctions";
import { filterTimesAfterCutoff } from "../../../Utilites/Functions/TimeUtilities";
import {
    DeleteSpecialPermission,
    GetSpecialPermissionsForMeeting,
    PostSpecialPermission,
} from "../../../Utilites/Functions/ApiFunctions/SpecialPermissionFunctions";
import { getDate, getMonth, getSeconds, getYear } from "date-fns";
import { GetRoomImage } from "../../../Utilites/Functions/ApiFunctions/RoomFunctions";
import {
    cc,
    CcButton,
    CcInput,
    CcSelect,
    CcSwitch,
    CcTextarea,
    controlBox,
    DialogBody,
    DialogFooter,
    DialogHeader,
    DialogSurface,
    Disclosure,
    Fact,
    Facts,
    Field,
    focusRing,
    formatCapacity,
    InlineSearch,
    formatRoomMeta,
    menuPaperSx,
    OptionList,
    RoomCard,
    RoomOption,
    SidePane,
    Spacer,
    SplitRow,
    Tag,
    TwoUp,
    TypeChip,
    TYPE_FALLBACK,
    useSidePane,
} from "../../Components/Concourse/ConcourseDialogKit";

// Welcome to Date Sanity™! All passengers please keep your arms inside the function at all times.
function isMultipleDayMeeting(meeting) {
    if (!meeting?.start || !meeting?.end) {
        // There is no meeting we can all go home
        return false;
    }
    const start = new Date(meeting.start);
    const end = new Date(meeting.end);

    if (meeting.all_day || meeting.allDay) {
        // For allDay events, end is exclusive. Nothing makes sense, so check for >1 day.
        const diff = (end - start) / (1000 * 60 * 60 * 24);
        return diff > 1;
    } else {
        // Compare local calendar days, like civilized people do.
        // Special case: React Calendar often gives us end dates at 00:00:00 of the next day
        // for single-day events. If end time is exactly midnight, check if it's just 1 day difference
        const isEndAtMidnight =
            getHours(end) === 0 &&
            getMinutes(end) === 0 &&
            getSeconds(end) === 0;

        if (isEndAtMidnight) {
            // Calculate the difference in days
            const timeDiffMs = end.getTime() - start.getTime();
            const daysDiff = timeDiffMs / (1000 * 60 * 60 * 24);

            // If it's exactly 1 day difference and start is also at midnight, it's a single-day event
            const isStartAtMidnight =
                getHours(start) === 0 &&
                getMinutes(start) === 0 &&
                getSeconds(start) === 0;
            if (daysDiff === 1 && isStartAtMidnight) {
                return false; // Single-day event represented by React Calendar
            }
        }

        return (
            getYear(start) !== getYear(end) ||
            getMonth(start) !== getMonth(end) ||
            (getDate(start) !== getDate(end) && !isEndAtMidnight)
        );
    }
}

function getPreviousDay(d) {
    // Coerce input into a Date object
    const date = d instanceof Date ? new Date(d) : new Date(d);

    // Subtract one day—setDate handles rollovers (e.g., 1 → last day of previous month)
    date.setDate(date.getDate() - 1);

    return date;
}

// Round a date UP to the next 15-minute mark (e.g. 10:07 → 10:15, 10:15 → 10:15).
function roundUpToQuarterHour(d) {
    const date = new Date(d);
    date.setSeconds(0, 0);
    const remainder = date.getMinutes() % 15;
    if (remainder !== 0) {
        date.setMinutes(date.getMinutes() + (15 - remainder));
    }
    return date;
}

const LONG_DATE = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
};

/** Ties the Advanced pane to whichever control is currently exposing it. */
const ADVANCED_PANE_ID = "cc-advanced-pane";

/** The scope words the recurrence handlers use, rendered for a human. */
// No whole-series scope: an edit only ever runs forward from the occurrence
// being changed, so meetings that already happened are never rewritten.
const SCOPE_LABEL = {
    current: "This meeting only",
    next: "This and all following",
};

const MeetingFourm = ({
    date,
    meeting,
    rooms,
    roomResources,
    resources,
    equipment,
    locations,
    update,
    meetingTypes,
    setUpdate,
    setUpdateTrigger,
    updateMode,
    onClose,
}) => {
    const { user } = useAuth();
    // Wide enough for the form and the Advanced column side by side. Below
    // this the disclosure keeps expanding inline, exactly as it does today.
    const twoCol = useSidePane();
    const [color, setColor] = useState(null);
    const [type, setType] = useState("");
    const [selectedRoom, setSelectedRoom] = useState("");
    const [description, setDescription] = useState("");
    const [startTime, setStartTime] = useState("12:00 AM");
    const [endTime, setEndTime] = useState("12:15 AM");
    const [repeats, setRepeats] = useState("");
    const [users, setUsers] = useState([]);
    const [special, setSpecial] = useState([]);
    // The permission set the meeting already has on the server, kept apart from
    // `special` (which the picker rewrites as the user edits) so a save can tell
    // what actually changed. `null` means "we never got a trustworthy answer" —
    // a brand new meeting, or a fetch that failed — and in that state the save
    // is only ever allowed to grant, never to revoke.
    const [savedSpecial, setSavedSpecial] = useState(null);
    const [meetingName, setMeetingName] = useState("");
    const [itSupport, setItSupport] = useState(false);
    const [itSupportDetails, setItSupportDetails] = useState("");
    const [showDesc, setShowDesc] = useState(false);
    const [roomImage, setRoomImage] = useState(null); // State to hold the room image URL
    const [showEquipment, setShowEquipment] = useState(false);
    // Narrows the room list only. Purely presentational — nothing that gets
    // submitted reads it, and the chosen room stays chosen while it is set.
    const [roomQuery, setRoomQuery] = useState("");
    const [loading, setLoading] = useState(false);
    // Errors only surface once the user has actually tried to submit — the copy
    // is the same copy the snackbars use, so there is one message per rule.
    const [submitted, setSubmitted] = useState(false);
    const [allDay, setAllDay] = useState(
        meeting?.all_day || meeting?.allDay
            ? meeting?.view == "dayGridMonth"
                ? false
                : true
            : false
    );
    const times = [];
    const multiDayMeet = isMultipleDayMeeting(meeting);

    const formatTime = (h, m) => {
        const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
        const ampm = h < 12 ? "AM" : "PM";
        return `${String(hour).padStart(2, "0")}:${String(m).padStart(
            2,
            "0"
        )} ${ampm}`;
    };

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // zero-based!
    const day = now.getDate();

    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 15) {
            // every time lives on the same calendar day:
            const dt = new Date(year, month, day, h, m, 0, 0);
            times.push(formatTime(dt.getHours(), dt.getMinutes())); // formatTime should accept a Date
        }
    }

    useEffect(() => {
        const data = async () => {
            const usrs = await GetUsers();
            // Without a meeting id there is nothing to look up, and asking
            // anyway just produces a 500 from the API.
            if (update && meeting?.id != null) {
                const selectedUserIds = await GetSpecialPermissionsForMeeting({
                    id: meeting.id,
                    recurrence_id: meeting.recurrence_id,
                });
                // GetSpecialPermissionsForMeeting hands back an array when the
                // call succeeded — including [] for a meeting that genuinely
                // has nobody — and undefined when it did not. Only an array is
                // a baseline we may revoke against; a failed fetch must not
                // read as "everyone was removed".
                setSpecial(selectedUserIds || []);
                setSavedSpecial(
                    Array.isArray(selectedUserIds) ? selectedUserIds : null
                );
            }
            setUsers(usrs);
        };
        data();
        // Behold! The Tower of Nested Ifs: A monument to indecision and existential dread.
        if (!update) {
            // We only want to update when we're NOT updating. Because logic is for mortals.
            if (isMultipleDayMeeting(meeting)) {
                // Ah, a meeting that spans multiple days! Surely, nobody will ever actually survive one of these.
                setStartTime("12:00 AM"); // Because time loses all meaning after Day 1.
                setEndTime("12:15 AM"); // It's always midnight somewhere, right?
                setAllDay(true);
            } else {
                // Single-day meeting: auto-fill the next available 15-minute slot.
                const clicked = new Date(meeting.start);
                const clickedEnd = meeting.end ? new Date(meeting.end) : null;

                // Month-view clicks arrive at midnight (no time was actually
                // chosen) — start from "now" in that case; otherwise honor the
                // time the user clicked in the day/week grid.
                const noTimeChosen =
                    meeting.view === "dayGridMonth" ||
                    (clicked.getHours() === 0 && clicked.getMinutes() === 0);

                const startDate = roundUpToQuarterHour(
                    noTimeChosen ? new Date() : clicked
                );

                // Honor an explicit range dragged out in the day/week grid;
                // otherwise the end is simply the next 15-minute mark.
                let endDate;
                if (
                    !noTimeChosen &&
                    clickedEnd &&
                    clickedEnd.getTime() - clicked.getTime() >= 15 * 60 * 1000
                ) {
                    endDate = clickedEnd;
                } else {
                    endDate = new Date(startDate.getTime() + 15 * 60 * 1000);
                }

                setStartTime(
                    formatTime(startDate.getHours(), startDate.getMinutes())
                );
                setEndTime(
                    formatTime(endDate.getHours(), endDate.getMinutes())
                );
            }
            // Seek the Holy Grail of meeting types! It's always "meeting," because what else would it be?
            setType(
                meetingTypes?.find((tp) => tp.value.toLowerCase() === "meeting")
            );
            // End scene. Please clap.
        } else {
            // Welcome to "The Else Side"! Where dreams come true, variables get set, and nothing ever goes wrong.
            const meetingType = meetingTypes?.find(
                (tp) => tp.id == meeting.type
            ); // Finding the meeting type, like looking for a sensible comment on the Internet.
            const meetingRoom = rooms?.find((rm) => rm.id == meeting.room); // Ah, the room. Because meetings without rooms are just sad group hallucinations.
            setMeetingName(meeting.name); // Set the name, because "Untitled Meeting #47" doesn't inspire confidence.
            setType(meetingType); // Let the meeting have an identity crisis.
            setColor(meetingType?.color); // For when you want your meetings as colorful as your calendar-induced anxiety.
            setRepeats(meeting.repeats); // Because the only thing better than one meeting is infinite meetings.
            setSelectedRoom(meetingRoom); // May the odds of getting a room with working A/C be ever in your favor.
            // start_time/end_time arrive as ISO strings, so parse them with the
            // Date constructor and format them with the same helper that builds
            // the dropdown options — otherwise the value never matches an option.
            const storedStart = new Date(meeting.start_time);
            const storedEnd = new Date(meeting.end_time);
            if (!isNaN(storedStart.getTime()) && !isNaN(storedEnd.getTime())) {
                setStartTime(
                    formatTime(storedStart.getHours(), storedStart.getMinutes())
                ); // Because being late by one minute ruins everything.
                setEndTime(
                    formatTime(storedEnd.getHours(), storedEnd.getMinutes())
                );
            } else {
                setEndTime("12:15 AM");
                setStartTime("12:00 AM");
                setAllDay(true);
            }
            // Endings are important. Like, actually leaving on time.
            setDescription(meeting.description); // Let your meeting description do what your calendar cannot: make sense.
            setItSupport(!!meeting.it_support);
            setItSupportDetails(meeting.it_support_details || "");

            // Editing shows the advanced section open — repeats, visibility and
            // all-day are all things you came here to change.
            setShowDesc(true);
            // The else saga ends. Nobody claps, but you feel a vague sense of accomplishment.
        }
    }, []);

    useEffect(() => {
        async function fetchRoomImage() {
            if (selectedRoom?.image_url) {
                try {
                    const image = await GetRoomImage(selectedRoom.image_url);
                    setRoomImage(image);
                } catch (error) {
                    console.error("Error fetching room image:", error);
                }
            } else {
                setRoomImage(null);
            }
        }
        fetchRoomImage();
    }, [selectedRoom]);

    const onChangeMeetingType = (e) => {
        setColor(meetingTypes?.find((m) => m.value == e.value)?.color);
        setType(e);
        if (e.value.toLowerCase() === "equipment") {
            setShowEquipment(true);
        } else {
            setShowEquipment(false);
        }
    };

    const onChangeStartTime = (e) => {
        const newTimeList = filterTimesAfterCutoff(times, e);
        if (!newTimeList.includes(endTime)) {
            setEndTime(newTimeList[0]);
        }
        setStartTime(e);
    };

    const onChangeEndTime = (e) => {
        setEndTime(e);
    };

    const clearOnClose = () => {
        setLoading(false);
        setStartTime("");
        setEndTime("");
        setSelectedRoom("");
        setType("");
        setMeetingName("");
        setType("");
        setColor("");
        setSelectedRoom("");
        setRepeats("");
        setDescription("");
        setItSupport(false);
        setItSupportDetails("");
        setShowEquipment(false);
        setRoomQuery("");
        setUpdate(!update);
        console.log("update");
        setUpdateTrigger((prevValue) => prevValue + 1);
        onClose();
    };

    /**
     * One user's special-permission ROWS.
     *
     * The meeting-scoped endpoint only ever returns user ids
     * (specialPermissionsController.GetAllForMeeting collapses its rows to
     * `[...new Set(userIds)]`), but DELETE /api/specialpermissions/:id deletes
     * by the permission row's own primary key — so a revoke has to resolve that
     * row first, and the per-user endpoint is the only one that exposes it.
     *
     * Returns null rather than [] when the lookup fails, so "we could not ask"
     * is never mistaken for "there was nothing to revoke".
     */
    const getSpecialPermissionRowsForUser = async (userId) => {
        try {
            const resp = await axios.get(`/api/specialpermissions/${userId}`);
            return Array.isArray(resp?.data) ? resp.data : null;
        } catch (err) {
            return null;
        }
    };

    /**
     * Reconcile this meeting's Special Permissions with what the form shows.
     *
     * `previous` is the set the server already had, `selected` is what the
     * picker currently holds:
     *   in selected, not in previous -> grant
     *   in previous, not in selected -> revoke
     *   in both                      -> left alone, so no row churn
     *
     * A `previous` of null means the baseline is unknown (new meeting, or the
     * fetch failed). That case grants only — revoking against a baseline we do
     * not have would silently strip everyone.
     */
    const syncSpecialPermissions = async (
        savedMeetingId,
        previous,
        selected
    ) => {
        const targetMeetingId = Number(savedMeetingId);
        const canGrant =
            Number.isFinite(targetMeetingId) && targetMeetingId > 0;
        // A row is hung off whichever meeting the save wrote to, which for a
        // recurring instance is not always the id the form was opened with, so
        // a revoke looks at both before it deletes anything. Both ids are this
        // same meeting as far as this form is concerned; nothing else can match.
        const revokeMeetingIds = [
            ...new Set(
                [savedMeetingId, meeting?.id]
                    .map((value) => Number(value))
                    .filter((value) => Number.isFinite(value) && value > 0)
            ),
        ];

        const selectedIds = Array.isArray(selected) ? selected : [];
        const previousIds = Array.isArray(previous) ? previous : null;
        const sameUser = (a, b) => Number(a) === Number(b);

        const toGrant = previousIds
            ? selectedIds.filter(
                  (id) => !previousIds.some((prev) => sameUser(prev, id))
              )
            : selectedIds;
        const toRevoke = previousIds
            ? previousIds.filter(
                  (id) => !selectedIds.some((sel) => sameUser(sel, id))
              )
            : [];

        const work = [];
        if (canGrant) {
            toGrant.forEach((userId) => {
                work.push(
                    PostSpecialPermission({
                        meeting_id: targetMeetingId,
                        user_id: userId,
                        created_user_id: user?.id,
                    })
                );
            });
        }
        if (revokeMeetingIds.length) {
            toRevoke.forEach((userId) => {
                work.push(
                    (async () => {
                        const rows =
                            await getSpecialPermissionRowsForUser(userId);
                        if (!rows) {
                            return false;
                        }
                        const rowsForMeeting = rows.filter(
                            (row) =>
                                sameUser(row?.user_id, userId) &&
                                revokeMeetingIds.some(
                                    (id) => Number(row?.meeting_id) === id
                                )
                        );
                        // They were in the saved set, so a row existed. Finding
                        // none now means we did not manage to revoke anything,
                        // and saying otherwise would hide a live grant.
                        if (!rowsForMeeting.length) {
                            return false;
                        }
                        const deleted = await Promise.all(
                            rowsForMeeting.map((row) =>
                                DeleteSpecialPermission(row?.id)
                            )
                        );
                        return deleted.every((ok) => ok !== false);
                    })()
                );
            });
        }

        const results = await Promise.all(work);
        // Access that was meant to be withdrawn and was not is the whole point
        // of this path, so it gets said out loud instead of closing quietly —
        // including the case where the save gave us no meeting id to revoke
        // against and the revokes never even ran.
        if (
            toRevoke.length &&
            (!revokeMeetingIds.length || results.some((ok) => ok === false))
        ) {
            openSnackbar("Some special permissions could not be removed", {
                severity: "error",
                autoHideDuration: 4000,
                anchorOrigin: { vertical: "top", horizontal: "center" },
                alertProps: { variant: "filled" },
                transition: "grow",
            });
        }
    };

    const onSubbmit = () => {
        setSubmitted(true);
        setLoading(true);
        if (update) {
            const start = setTime(date, startTime);
            const end = setTime(date, endTime);
            if (start >= end && !allDay) {
                openSnackbar(
                    "End time cannot be less than or equal to the start time",
                    {
                        severity: "error",
                        autoHideDuration: 4000,
                        anchorOrigin: { vertical: "top", horizontal: "center" },
                        alertProps: { variant: "filled" },
                        transition: "grow", // Just pass the string 'grow', 'slide', 'fade', 'zoom', etc.
                    }
                );
                setLoading(false);
            } else if (!selectedRoom?.id) {
                openSnackbar("No selected room", {
                    severity: "error",
                    autoHideDuration: 4000,
                    anchorOrigin: { vertical: "top", horizontal: "center" },
                    alertProps: { variant: "filled" },
                    transition: "grow", // Just pass the string 'grow', 'slide', 'fade', 'zoom', etc.
                });
                setLoading(false);
            } else if (meetingName == "") {
                openSnackbar("No meeting name", {
                    severity: "error",
                    autoHideDuration: 4000,
                    anchorOrigin: { vertical: "top", horizontal: "center" },
                    alertProps: { variant: "filled" },
                    transition: "grow", // Just pass the string 'grow', 'slide', 'fade', 'zoom', etc.
                });
                setLoading(false);
            } else if (itSupport && !itSupportDetails.trim()) {
                openSnackbar("Please describe what you need IT help with", {
                    severity: "error",
                    autoHideDuration: 4000,
                    anchorOrigin: { vertical: "top", horizontal: "center" },
                    alertProps: { variant: "filled" },
                    transition: "grow",
                });
                setLoading(false);
            } else if (!type?.id) {
                // meetingTypes comes back empty if /api/types failed, which
                // leaves the find() below it undefined rather than throwing.
                openSnackbar("No meeting type", {
                    severity: "error",
                    autoHideDuration: 4000,
                    anchorOrigin: { vertical: "top", horizontal: "center" },
                    alertProps: { variant: "filled" },
                    transition: "grow",
                });
                setLoading(false);
            } else {
                // console.log(`Original: Start: ${formatDate(updateMeeting.start_time)} End: ${formatDate(updateMeeting.end_time)}`);
                // Parse the start_time to a Date object
                let updatedStartTime = new Date(meeting.start_time);
                let updatedEndTime = new Date(meeting.end_time);

                // Update start time with the specified time
                updatedStartTime = setTime(updatedStartTime, startTime);
                updatedEndTime = setTime(updatedEndTime, endTime);

                // Update the meeting's start_time
                meeting.start_time = updatedStartTime.toISOString();
                meeting.end_time = updatedEndTime.toISOString();

                // Update all other values
                meeting.room = selectedRoom.id;
                meeting.type = type.id;
                meeting.name = meetingName;
                meeting.description = description ? description : "";
                meeting.repeats = repeats ? repeats : "";
                meeting.allDay = allDay;
                meeting.it_support = itSupport;
                meeting.it_support_details = itSupport ? itSupportDetails : "";

                switch (updateMode) {
                    case "next":
                        UpdateAllNextMeetingsInRecurrence(user?.id, meeting)
                            .then((resp) => {
                                if (resp) {
                                    syncSpecialPermissions(
                                        resp?.id,
                                        savedSpecial,
                                        special
                                    ).then(() => {
                                        setLoading(false);
                                        clearOnClose();
                                    });
                                }
                                setLoading(false);
                            })
                            .catch(() => {
                                clearOnClose();
                            });
                        break;
                    case "current":
                        CheckPostMeeting(user?.id, { ...meeting, allDay })
                            .then((resp) => {
                                if (resp?.book) {
                                    UpdateParentOnlyMeeting(meeting.id, meeting)
                                        .then((resp) => {
                                            if (resp) {
                                                syncSpecialPermissions(
                                                    resp?.id,
                                                    savedSpecial,
                                                    special
                                                ).then(() => {
                                                    setLoading(false);
                                                    clearOnClose();
                                                });
                                            }
                                            setLoading(false);
                                        })
                                        .catch(() => {
                                            clearOnClose();
                                        });
                                }
                            })
                            .catch(() => {
                                clearOnClose();
                            });
                        break;
                    default:
                        CheckPostMeeting(user?.id, { ...meeting, allDay })
                            .then((resp) => {
                                if (resp?.book) {
                                    UpdateMeeting(user?.id, meeting)
                                        .then((resp) => {
                                            if (resp) {
                                                syncSpecialPermissions(
                                                    resp?.id,
                                                    savedSpecial,
                                                    special
                                                ).then(() => {
                                                    setLoading(false);
                                                    clearOnClose();
                                                });
                                            }
                                        })
                                        .catch(() => {
                                            clearOnClose();
                                        });
                                }
                                setLoading(false);
                            })
                            .catch(() => {
                                clearOnClose();
                            });
                        break;
                }
            }
        } else {
            const start = setTime(update ? date : meeting?.start, startTime);
            let end = setTime(meeting?.end, endTime);
            if (multiDayMeet) {
                end = getPreviousDay(end);
            } else if (meeting.view == "dayGridMonth") {
                // Set end to same date as start but keep the end time
                const startDate = new Date(start);
                end = setTime(startDate, endTime);
            }
            //console.log(multiDayMeet, allDay);
            console.log(start);
            console.log(end);
            //return;
            if (start >= end && !allDay) {
                openSnackbar(
                    "End time cannot be less than or equal to the start time",
                    {
                        severity: "error",
                        autoHideDuration: 4000,
                        anchorOrigin: { vertical: "top", horizontal: "center" },
                        alertProps: { variant: "filled" },
                        transition: "grow", // Just pass the string 'grow', 'slide', 'fade', 'zoom', etc.
                    }
                );
                setLoading(false);
            } else if (!selectedRoom?.id) {
                openSnackbar("No selected room", {
                    severity: "error",
                    autoHideDuration: 4000,
                    anchorOrigin: { vertical: "top", horizontal: "center" },
                    alertProps: { variant: "filled" },
                    transition: "grow", // Just pass the string 'grow', 'slide', 'fade', 'zoom', etc.
                });
                setLoading(false);
            } else if (meetingName == "") {
                openSnackbar("No meeting name", {
                    severity: "error",
                    autoHideDuration: 4000,
                    anchorOrigin: { vertical: "top", horizontal: "center" },
                    alertProps: { variant: "filled" },
                    transition: "grow", // Just pass the string 'grow', 'slide', 'fade', 'zoom', etc.
                });
                setLoading(false);
            } else if (itSupport && !itSupportDetails.trim()) {
                openSnackbar("Please describe what you need IT help with", {
                    severity: "error",
                    autoHideDuration: 4000,
                    anchorOrigin: { vertical: "top", horizontal: "center" },
                    alertProps: { variant: "filled" },
                    transition: "grow",
                });
                setLoading(false);
            } else if (!type?.id) {
                // meetingTypes comes back empty if /api/types failed, which
                // leaves the find() below it undefined rather than throwing.
                openSnackbar("No meeting type", {
                    severity: "error",
                    autoHideDuration: 4000,
                    anchorOrigin: { vertical: "top", horizontal: "center" },
                    alertProps: { variant: "filled" },
                    transition: "grow",
                });
                setLoading(false);
            } else {
                const newMeeting = {
                    name: meetingName,
                    username: user?.username,
                    organizer: `${user?.first_name} ${user?.last_name}`,
                    start_time: start.toISOString(),
                    end_time: end.toISOString(),
                    description: description,
                    room: selectedRoom.id,
                    location: selectedRoom.location,
                    type: type.id,
                    status: "Approved",
                    retired: false,
                    created_user_id: user?.id,
                    repeats: repeats,
                    allDay,
                    it_support: itSupport,
                    it_support_details: itSupport ? itSupportDetails : "",
                };
                CheckPostMeeting(user?.id, newMeeting).then((resp) => {
                    if (resp?.book) {
                        PostMeeting(newMeeting).then((resp) => {
                            if (resp?.id) {
                                // A meeting that did not exist a moment ago has
                                // no saved permission set, so this only grants.
                                syncSpecialPermissions(
                                    resp?.id,
                                    savedSpecial,
                                    special
                                ).then(() => {
                                    setLoading(false);
                                    clearOnClose();
                                });
                            }
                        });
                        clearOnClose();
                    }
                    setLoading(false);
                });
            }
        }
    };

    const handleSpecialChange = (event) => {
        const {
            target: { value },
        } = event;
        setSpecial(
            // Ensure that value is always an array of IDs.
            typeof value === "string" ? value.split(",") : value
        );
    };

    const handleAllDayChange = (checked) => {
        setAllDay(checked);
        // The all-day event! The grown-up equivalent of "do not disturb."
        setStartTime("12:00 AM"); // Just pretend it's midnight all day.
        setEndTime("12:00 AM"); // See above, but with more existential dread.
    };

    /* --------------------------------------------------------- presentation --- */

    const nameLocked = type?.value?.toLowerCase() === "equipment";
    const accent = color || type?.color || TYPE_FALLBACK;

    const officeAlias = (locationId) =>
        locations?.find((lc) => lc?.officeid == locationId)?.Alias;

    const resourcesForRoom = (roomId) =>
        (roomResources?.filter((rr) => rr.room_id === roomId) || [])
            .map((link) => resources?.find((r) => r.id === link.resource_id))
            .filter(Boolean);

    const roomMeta = (room) => {
        const parts = [formatCapacity(room.capacity)];
        const alias = officeAlias(room.location);
        if (alias) parts.push(alias);
        const res = resourcesForRoom(room.id);
        if (res.length) {
            const shown = res
                .slice(0, 3)
                .map((r) => r.name)
                .join(", ");
            parts.push(res.length > 3 ? `${shown} +${res.length - 3}` : shown);
        }
        // formatCapacity returns null for a room with no usable capacity, so an
        // empty part has to drop out rather than leave a leading " · ".
        return parts.filter(Boolean).join(" · ");
    };

    // Filter on what the row already shows — the name plus its meta line — so
    // "columbus", "projector" or a capacity all narrow the list. A room that
    // filters out stays selected; the card below the list still names it.
    const roomFilter = roomQuery.trim().toLowerCase();
    const visibleRooms = roomFilter
        ? (rooms || []).filter((rm) =>
              `${rm.value} ${roomMeta(rm)}`.toLowerCase().includes(roomFilter)
          )
        : rooms || [];

    const selectedResources = selectedRoom?.id
        ? resourcesForRoom(selectedRoom.id)
        : [];

    // A dragged range is only real when the grid actually handed us one. The
    // sub-line must not claim a drag that never happened.
    const draggedRange = (() => {
        if (update || multiDayMeet || !meeting?.start || !meeting?.end)
            return null;
        const s = new Date(meeting.start);
        const e = new Date(meeting.end);
        if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
        if (
            meeting.view === "dayGridMonth" ||
            (s.getHours() === 0 && s.getMinutes() === 0)
        )
            return null;
        if (e.getTime() - s.getTime() < 15 * 60 * 1000) return null;
        const strip = (t) => t.replace(/^0/, "");
        return `${strip(
            formatTime(s.getHours(), s.getMinutes())
        )} – ${strip(formatTime(e.getHours(), e.getMinutes()))}`;
    })();

    const headerSub = (() => {
        if (update) {
            const when = new Date(meeting?.start_time);
            const stamp = isNaN(when.getTime())
                ? null
                : when.toLocaleDateString("en-US", LONG_DATE);
            return [meeting?.name, stamp].filter(Boolean).join(" · ");
        }
        if (multiDayMeet) {
            return `${new Date(meeting?.start).toLocaleDateString(
                "en-US",
                LONG_DATE
            )} → ${getPreviousDay(meeting?.end).toLocaleDateString(
                "en-US",
                LONG_DATE
            )}`;
        }
        const when = new Date(meeting?.start);
        const stamp = isNaN(when.getTime())
            ? null
            : when.toLocaleDateString("en-US", LONG_DATE);
        return [stamp, draggedRange ? `you dragged ${draggedRange}` : null]
            .filter(Boolean)
            .join(" · ");
    })();

    // The same rule the submit path applies, shown next to the field it belongs
    // to. Multi-day bookings compare two different dates, so they are left to
    // the submit path alone rather than guessed at here.
    const timeInvalid =
        !allDay &&
        !multiDayMeet &&
        !!startTime &&
        !!endTime &&
        setTime(new Date(), startTime) >= setTime(new Date(), endTime);

    const errors = submitted
        ? {
              time: timeInvalid
                  ? "End time cannot be less than or equal to the start time"
                  : null,
              room: !selectedRoom?.id ? "No selected room" : null,
              name: meetingName === "" ? "No meeting name" : null,
              itDetails:
                  itSupport && !itSupportDetails.trim()
                      ? "Please describe what you need IT help with"
                      : null,
          }
        : {};

    const autocompletePaperSx = {
        ...menuPaperSx(300),
        "& .MuiAutocomplete-option": { fontSize: "14px" },
        "& .MuiAutocomplete-option[aria-selected='true']": {
            background: cc.wash,
            color: cc.red,
        },
        "& .MuiAutocomplete-noOptions": {
            fontSize: "14px",
            color: cc.mute,
        },
    };

    /**
     * The Advanced fields, in one place. They render inside the disclosure on a
     * narrow screen and inside the side pane on a wide one — an array (not a
     * fragment) so whichever container receives them can still index them for
     * the `--cc-i` stagger.
     */
    const advancedFields = [
        <Field key="description" label="Description" htmlFor="cc-description">
            <CcTextarea
                id="cc-description"
                rows={2}
                value={description || ""}
                disabled={loading}
                onChange={(e) => setDescription(e.target.value)}
            />
        </Field>,
        <Field key="repeats" label="Repeats">
            <CcSelect
                ariaLabel="Repeats"
                value={repeats || ""}
                disabled={loading}
                displayEmpty
                onChange={(e) => setRepeats(e.target.value)}
            >
                <MenuItem key={0} value={""}>
                    {"— None —"}
                </MenuItem>
                <MenuItem key={1} value={"Daily"}>
                    {"Daily"}
                </MenuItem>
                <MenuItem key={2} value={"Weekly"}>
                    {"Weekly"}
                </MenuItem>
                <MenuItem key={3} value={"Monthly"}>
                    {"Monthly"}
                </MenuItem>
                <MenuItem key={4} value={"Yearly"}>
                    {"Yearly"}
                </MenuItem>
            </CcSelect>
        </Field>,
        <CcSwitch
            key="all-day"
            id="cc-all-day"
            checked={allDay}
            disabled={loading}
            onChange={(checked) => handleAllDayChange(checked)}
            label="All Day"
        />,
        <Field
            key="special"
            label="Special Permissions"
            // The old copy ("Everyone else just sees the room as busy.")
            // promised a masking behaviour the app does not implement — no
            // backend query or frontend transform ever redacts a meeting's name
            // or description for anyone. The permission is purely ADDITIVE:
            // GetAllUserCanSee unions specially-permitted meetings into the set
            // a user already gets from room-group membership, so it lets people
            // in who would otherwise be shut out. It grants read only — CanDelete
            // never consults the table.
            hint="People you add here can see this meeting even if they don't have access to the room."
        >
            <Autocomplete
                multiple
                options={users.filter(
                    (gp) => gp.access !== "Read" && gp.id !== user?.id
                )}
                value={users.filter((u) => special.includes(u.id))}
                disabled={loading}
                onChange={(event, newValue) => {
                    handleSpecialChange({
                        target: {
                            value: newValue.map((user) => user.id),
                        },
                    });
                }}
                getOptionLabel={(option) =>
                    `${option.first_name} ${option.last_name}`
                }
                isOptionEqualToValue={(option, value) => option.id === value.id}
                componentsProps={{
                    paper: { sx: autocompletePaperSx },
                }}
                renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                        const { onDelete } = getTagProps({ index });
                        return (
                            <Tag key={option.id} on>
                                {`${option.first_name} ${option.last_name}`}
                                <Box
                                    component="span"
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`Remove ${option.first_name} ${option.last_name}`}
                                    onClick={onDelete}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            onDelete(e);
                                        }
                                    }}
                                    sx={{
                                        cursor: "pointer",
                                        fontSize: "9px",
                                        lineHeight: 1,
                                        "&:focus-visible": focusRing,
                                    }}
                                >
                                    ✕
                                </Box>
                            </Tag>
                        );
                    })
                }
                renderInput={(params) => (
                    <TextField
                        {...params}
                        variant="standard"
                        placeholder={special?.length ? "" : "Nobody else"}
                        InputProps={{
                            ...params.InputProps,
                            disableUnderline: true,
                        }}
                    />
                )}
                sx={{
                    "& .MuiInputBase-root": {
                        ...controlBox(false, false),
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "5px",
                        padding: "7px 9px",
                    },
                    "& .MuiInputBase-root.Mui-focused": {
                        borderColor: cc.red,
                        background: cc.srf,
                    },
                    "& .MuiInputBase-input": {
                        fontSize: "14px",
                        fontFamily: "inherit",
                        color: cc.ink,
                        padding: "2px 0",
                        minWidth: "60px",
                    },
                    "& .MuiAutocomplete-endAdornment": {
                        display: "none",
                    },
                }}
            />
        </Field>,
    ];

    return (
        <DialogSurface accent={accent}>
            <DialogHeader
                title={update ? "Edit this meeting" : "Book a room"}
                sub={headerSub}
                onClose={onClose}
            />
            <SplitRow split={twoCol}>
                <DialogBody
                    sx={
                        twoCol
                            ? {
                                  // Pinned to the collapsed frame width, so the form
                                  // does not reflow while the frame widens; the pane
                                  // is revealed beside it instead.
                                  // `border-box` is load-bearing: the app mounts
                                  // no CssBaseline, so under the initial
                                  // `content-box` this column's 22px side padding
                                  // would sit OUTSIDE the 560 basis and shove the
                                  // pane 44px past the frame's right edge.
                                  boxSizing: "border-box",
                                  flexGrow: 0,
                                  flexShrink: 0,
                                  flexBasis: "var(--cc-dw, 560px)",
                                  maxWidth: "var(--cc-dw, 560px)",
                              }
                            : null
                    }
                >
                    <Field
                        label="Meeting name"
                        required
                        htmlFor="cc-meeting-name"
                        error={errors.name}
                        hint={
                            nameLocked
                                ? "Equipment bookings take their name from the equipment."
                                : null
                        }
                    >
                        <CcInput
                            id="cc-meeting-name"
                            value={meetingName}
                            invalid={!!errors.name}
                            disabled={nameLocked || loading}
                            autoFocus
                            placeholder="What is this for?"
                            onChange={(e) => setMeetingName(e.target.value)}
                        />
                    </Field>

                    <Field
                        label="Meeting Type"
                        hint="The type sets the colour this meeting gets on the calendar."
                    >
                        <Box
                            role="group"
                            aria-label="Meeting Type"
                            sx={{ display: "flex", gap: "6px", flexWrap: "wrap" }}
                        >
                            {(meetingTypes || []).map((tp) => (
                                <TypeChip
                                    key={tp.id}
                                    color={tp.color}
                                    selected={type?.id === tp.id}
                                    disabled={loading}
                                    onClick={() => onChangeMeetingType(tp)}
                                >
                                    {tp.value}
                                </TypeChip>
                            ))}
                        </Box>
                    </Field>

                    <Field
                        label="Room"
                        required
                        error={errors.room}
                        action={
                            <InlineSearch
                                value={roomQuery}
                                onChange={(e) => setRoomQuery(e.target.value)}
                                onClear={() => setRoomQuery("")}
                                placeholder="Search rooms"
                                ariaLabel="Search rooms"
                                disabled={loading}
                                width={112}
                            />
                        }
                    >
                        <OptionList
                            role="group"
                            aria-label="Room"
                            sx={{
                                maxHeight: "252px",
                                overflowY: "auto",
                                scrollbarWidth: "thin",
                                paddingRight: "2px",
                            }}
                        >
                            {visibleRooms.map((rm) => (
                                <RoomOption
                                    key={rm.id}
                                    color={rm.color}
                                    selected={selectedRoom?.id === rm.id}
                                    disabled={loading}
                                    name={rm.value}
                                    meta={roomMeta(rm)}
                                    onClick={() => setSelectedRoom(rm)}
                                />
                            ))}
                            {roomFilter && !visibleRooms.length ? (
                                <Box
                                    sx={{
                                        fontSize: "12px",
                                        color: cc.mute,
                                        padding: "8px 2px",
                                    }}
                                >
                                    No rooms match “{roomQuery.trim()}”.
                                </Box>
                            ) : null}
                        </OptionList>
                    </Field>

                    {selectedRoom?.id ? (
                        <RoomCard
                            name={
                                officeAlias(selectedRoom.location)
                                    ? `SEA ${officeAlias(
                                          selectedRoom.location
                                      )} / ${selectedRoom.value}`
                                    : selectedRoom.value
                            }
                            // Same rule as the details dialog: the picker above
                            // is where capacity helps you choose, so once a room
                            // is chosen this line carries what it actually has.
                            meta={formatRoomMeta(
                                selectedResources,
                                selectedRoom.capacity
                            )}
                            thumb={
                                selectedRoom.image_url && roomImage ? (
                                    <ImageViewer
                                        src={roomImage}
                                        alt={`${selectedRoom.value} room image`}
                                        clickable={true}
                                        style={{
                                            width: "64px",
                                            height: "48px",
                                            objectFit: "cover",
                                            display: "block",
                                        }}
                                    />
                                ) : null
                            }
                        />
                    ) : null}

                    {!allDay ? (
                        <TwoUp>
                            <Field label="Start Time" error={errors.time}>
                                <CcSelect
                                    mono
                                    ariaLabel="Start Time"
                                    invalid={!!errors.time}
                                    value={startTime}
                                    disabled={loading}
                                    onChange={(e) =>
                                        onChangeStartTime(e.target.value)
                                    }
                                >
                                    {times.map((t) => (
                                        <MenuItem key={t} value={t}>
                                            {t}
                                        </MenuItem>
                                    ))}
                                </CcSelect>
                            </Field>
                            <Field label="End Time">
                                <CcSelect
                                    mono
                                    ariaLabel="End Time"
                                    invalid={!!errors.time}
                                    value={endTime}
                                    disabled={loading}
                                    onChange={(e) =>
                                        onChangeEndTime(e.target.value)
                                    }
                                >
                                    {filterTimesAfterCutoff(
                                        times,
                                        startTime || "12:00 AM"
                                    ).map((t) => (
                                        <MenuItem key={t} value={t}>
                                            {t}
                                        </MenuItem>
                                    ))}
                                </CcSelect>
                            </Field>
                        </TwoUp>
                    ) : null}

                    <Box sx={{ display: "grid", gap: "9px" }}>
                        <CcSwitch
                            id="cc-it-support"
                            checked={itSupport}
                            disabled={loading}
                            onChange={(checked) => setItSupport(checked)}
                            label="I would like IT support during this meeting"
                        />
                        {itSupport ? (
                            <Field
                                label="What do you need help with?"
                                required
                                htmlFor="cc-it-support-details"
                                error={errors.itDetails}
                            >
                                <CcTextarea
                                    id="cc-it-support-details"
                                    rows={2}
                                    value={itSupportDetails}
                                    invalid={!!errors.itDetails}
                                    disabled={loading}
                                    onChange={(e) =>
                                        setItSupportDetails(e.target.value)
                                    }
                                />
                            </Field>
                        ) : null}
                    </Box>

                    {update && updateMode && SCOPE_LABEL[updateMode] ? (
                        <Facts>
                            <Fact label="Applies to">
                                {SCOPE_LABEL[updateMode]}
                            </Fact>
                        </Facts>
                    ) : null}

                    {/* One control at a time. In two-column mode this row is
                        open-only: once the pane is out it is the pane's own
                        header button that closes it, so the control always sits
                        with the thing it controls and there are never two rows
                        claiming the same toggle. It is the last child of the
                        body, so removing it disturbs nothing above it. */}
                    {twoCol && showDesc ? null : (
                        <Disclosure
                            open={showDesc}
                            onToggle={() => setShowDesc(!showDesc)}
                            summary="Advanced"
                            count="description · repeats · who can see it"
                            controls={twoCol ? ADVANCED_PANE_ID : undefined}
                        >
                            {twoCol ? null : advancedFields}
                        </Disclosure>
                    )}
                </DialogBody>
                {twoCol ? (
                    <SidePane
                        id={ADVANCED_PANE_ID}
                        open={showDesc}
                        title="Advanced"
                        onClose={() => setShowDesc(false)}
                    >
                        {advancedFields}
                    </SidePane>
                ) : null}
            </SplitRow>
            <DialogFooter>
                <CcButton onClick={onClose} disabled={loading}>
                    {update ? "Discard" : "Cancel"}
                </CcButton>
                <Spacer />
                <CcButton
                    variant="primary"
                    onClick={onSubbmit}
                    disabled={loading}
                >
                    {loading ? (
                        <CircularProgress
                            size={14}
                            thickness={5}
                            sx={{ color: cc.onRed }}
                        />
                    ) : null}
                    {update ? "Update meeting" : "Book it"}
                </CcButton>
            </DialogFooter>
        </DialogSurface>
    );
};

export default MeetingFourm;
