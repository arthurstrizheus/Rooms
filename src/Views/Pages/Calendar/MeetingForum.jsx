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
    UpdateAllMeetingsInRecurrence,
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
    menuPaperSx,
    OptionList,
    RoomCard,
    RoomOption,
    Spacer,
    Tag,
    TagRow,
    TwoUp,
    TypeChip,
    TYPE_FALLBACK,
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

/** The scope words the recurrence handlers use, rendered for a human. */
const SCOPE_LABEL = {
    current: "This meeting only",
    next: "This and all following",
    all: "All in the series",
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
    const [color, setColor] = useState(null);
    const [type, setType] = useState("");
    const [selectedRoom, setSelectedRoom] = useState("");
    const [description, setDescription] = useState("");
    const [startTime, setStartTime] = useState("12:00 AM");
    const [endTime, setEndTime] = useState("12:15 AM");
    const [repeats, setRepeats] = useState("");
    const [users, setUsers] = useState([]);
    const [special, setSpecial] = useState([]);
    const [meetingName, setMeetingName] = useState("");
    const [itSupport, setItSupport] = useState(false);
    const [itSupportDetails, setItSupportDetails] = useState("");
    const [showDesc, setShowDesc] = useState(false);
    const [roomImage, setRoomImage] = useState(null); // State to hold the room image URL
    const [showEquipment, setShowEquipment] = useState(false);
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
                setSpecial(selectedUserIds || []);
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
        setColor((meetingTypes?.find((m) => m.value == e.value)).color);
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
        setUpdate(!update);
        console.log("update");
        setUpdateTrigger((prevValue) => prevValue + 1);
        onClose();
    };

    const isSelected = (id) => special.indexOf(id) !== -1;

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
                                    const promises = special?.map(async (itm) =>
                                        isSelected(itm)
                                            ? PostSpecialPermission({
                                                  meeting_id: resp.id,
                                                  user_id: itm,
                                                  created_user_id: user?.id,
                                              })
                                            : DeleteSpecialPermission(itm)
                                    );
                                    Promise.all(promises).then(() => {
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
                                                const promises = special?.map(
                                                    async (itm) =>
                                                        isSelected(itm)
                                                            ? PostSpecialPermission(
                                                                  {
                                                                      meeting_id:
                                                                          resp.id,
                                                                      user_id:
                                                                          itm,
                                                                      created_user_id:
                                                                          user?.id,
                                                                  }
                                                              )
                                                            : DeleteSpecialPermission(
                                                                  itm
                                                              )
                                                );
                                                Promise.all(promises).then(
                                                    () => {
                                                        setLoading(false);
                                                        clearOnClose();
                                                    }
                                                );
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
                    case "all":
                        UpdateAllMeetingsInRecurrence(user?.id, meeting)
                            .then((resp) => {
                                if (resp) {
                                    const promises = special?.map(async (itm) =>
                                        isSelected(itm)
                                            ? PostSpecialPermission({
                                                  meeting_id: resp.id,
                                                  user_id: itm,
                                                  created_user_id: user?.id,
                                              })
                                            : DeleteSpecialPermission(itm)
                                    );
                                    Promise.all(promises).then(() => {
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
                    default:
                        CheckPostMeeting(user?.id, { ...meeting, allDay })
                            .then((resp) => {
                                if (resp?.book) {
                                    UpdateMeeting(user?.id, meeting)
                                        .then((resp) => {
                                            if (resp) {
                                                const promises = special?.map(
                                                    async (itm) =>
                                                        isSelected(itm)
                                                            ? PostSpecialPermission(
                                                                  {
                                                                      meeting_id:
                                                                          resp.id,
                                                                      user_id:
                                                                          itm,
                                                                      created_user_id:
                                                                          user?.id,
                                                                  }
                                                              )
                                                            : DeleteSpecialPermission(
                                                                  itm
                                                              )
                                                );
                                                Promise.all(promises).then(
                                                    () => {
                                                        setLoading(false);
                                                        clearOnClose();
                                                    }
                                                );
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
                                const promises = special?.map(async (itm) =>
                                    isSelected(itm)
                                        ? PostSpecialPermission({
                                              meeting_id: resp.id,
                                              user_id: itm,
                                              created_user_id: user?.id,
                                          })
                                        : DeleteSpecialPermission(itm)
                                );
                                Promise.all(promises).then(() => {
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
        return parts.join(" · ");
    };

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

    return (
        <DialogSurface accent={accent}>
            <DialogHeader
                title={update ? "Edit this meeting" : "Book a room"}
                sub={headerSub}
                onClose={onClose}
            />
            <DialogBody>
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

                <Field label="Room" required error={errors.room}>
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
                        {(rooms || []).map((rm) => (
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
                        meta={formatCapacity(selectedRoom.capacity)}
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
                    >
                        {selectedResources.length ? (
                            <TagRow>
                                {selectedResources.map((r) => (
                                    <Tag key={r.id}>{r.name}</Tag>
                                ))}
                            </TagRow>
                        ) : null}
                    </RoomCard>
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

                <Disclosure
                    open={showDesc}
                    onToggle={() => setShowDesc(!showDesc)}
                    summary="Advanced"
                    count="description · repeats · who can see it"
                >
                    <Field label="Description" htmlFor="cc-description">
                        <CcTextarea
                            id="cc-description"
                            rows={2}
                            value={description || ""}
                            disabled={loading}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </Field>
                    <Field label="Repeats">
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
                    </Field>
                    <CcSwitch
                        id="cc-all-day"
                        checked={allDay}
                        disabled={loading}
                        onChange={(checked) => handleAllDayChange(checked)}
                        label="All Day"
                    />
                    <Field
                        label="Special Permissions"
                        hint="Everyone else just sees the room as busy."
                    >
                        <Autocomplete
                            multiple
                            options={users.filter(
                                (gp) =>
                                    gp.access !== "Read" && gp.id !== user?.id
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
                            isOptionEqualToValue={(option, value) =>
                                option.id === value.id
                            }
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
                                                    if (
                                                        e.key === "Enter" ||
                                                        e.key === " "
                                                    ) {
                                                        e.preventDefault();
                                                        onDelete(e);
                                                    }
                                                }}
                                                sx={{
                                                    cursor: "pointer",
                                                    fontSize: "9px",
                                                    lineHeight: 1,
                                                    "&:focus-visible":
                                                        focusRing,
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
                                    placeholder={
                                        special?.length ? "" : "Nobody else"
                                    }
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
                    </Field>
                </Disclosure>
            </DialogBody>
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
