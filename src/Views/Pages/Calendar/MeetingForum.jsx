import { useTheme } from "@emotion/react";
import { useEffect, useState } from "react";
import {
    getAmPm,
    getHours,
    getMinutes,
    setTime,
} from "../../../Utilites/Functions/CommonFunctions";
import { useAuth } from "../../../Utilites/AuthContext";
import ImageViewer from "../../../Components/ImageViewer";
import { openSnackbar } from "../../../Utilites/SnackbarContext";
import {
    Grid,
    Stack,
    Typography,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
    Chip,
    FormHelperText,
    Autocomplete,
    TextField,
    Checkbox,
    useMediaQuery,
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
import ShortTextField from "../../../Components/ShortTextField";
import ShortSelect from "../../../Components/ShortSelect";
import ShortSelectObject from "../../../Components/ShortSelectObject";
import TuneIcon from "@mui/icons-material/Tune";
import CheckIcon from "@mui/icons-material/Check";
import { GetUsers } from "../../../Utilites/Functions/ApiFunctions";
import { filterTimesAfterCutoff } from "../../../Utilites/Functions/TimeUtilities";
import {
    DeleteSpecialPermission,
    GetSpecialPermissionsForMeeting,
    PostSpecialPermission,
} from "../../../Utilites/Functions/ApiFunctions/SpecialPermissionFunctions";
import { getDate, getMonth, getSeconds, getTime, getYear } from "date-fns";
import { GetRoomImage } from "../../../Utilites/Functions/ApiFunctions/RoomFunctions";
import ShortSelectRoom from "../../../Components/ShortSelectObjectRoom";

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
    const theme = useTheme();
    const downMD = useMediaQuery((theme) => theme.breakpoints.down("md"));
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
            if (update) {
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
            if (getTime(meeting.start_time) && getTime(meeting.end_time)) {
                setStartTime(
                    `${String(getHours(meeting.start_time)).padStart(
                        2,
                        "0"
                    )}:${String(getMinutes(meeting.start_time)).padStart(
                        2,
                        "0"
                    )} ${getAmPm(meeting.start_time).toUpperCase()}`
                ); // Because being late by one minute ruins everything.
                setEndTime(
                    `${String(getHours(meeting.end_time)).padStart(
                        2,
                        "0"
                    )}:${String(getMinutes(meeting.end_time)).padStart(
                        2,
                        "0"
                    )} ${getAmPm(meeting.end_time).toUpperCase()}`
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

            if (meeting.description != "" && meeting.description != null) {
                // Show the description if it exists. Otherwise, pretend everything is fine.
                setShowDesc(true);
            }
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
                console.warn("No image URL provided for the room.");
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
            } else if (!selectedRoom?.id) {
                openSnackbar("No selected room", {
                    severity: "error",
                    autoHideDuration: 4000,
                    anchorOrigin: { vertical: "top", horizontal: "center" },
                    alertProps: { variant: "filled" },
                    transition: "grow", // Just pass the string 'grow', 'slide', 'fade', 'zoom', etc.
                });
            } else if (meetingName == "") {
                openSnackbar("No meeting name", {
                    severity: "error",
                    autoHideDuration: 4000,
                    anchorOrigin: { vertical: "top", horizontal: "center" },
                    alertProps: { variant: "filled" },
                    transition: "grow", // Just pass the string 'grow', 'slide', 'fade', 'zoom', etc.
                });
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

    return (
        <Grid
            container
            sx={{
                width:
                    showDesc && !downMD ? "600px" : downMD ? "330px" : "350px",
                height: `calc(${
                    showDesc
                        ? downMD
                            ? "620px"
                            : multiDayMeet
                            ? "420px"
                            : "390px"
                        : multiDayMeet && !allDay
                        ? downMD
                            ? "600px"
                            : "390px"
                        : allDay && multiDayMeet
                        ? downMD
                            ? "600px"
                            : "335px"
                        : allDay && !multiDayMeet
                        ? downMD
                            ? "600px"
                            : "320px"
                        : "360px"
                } + ${itSupport ? 110 : 40}px)`,
                transition: "width 0.5s ease-in-out, height 0.5s ease-in-out",
                overflow: downMD ? "auto" : "hidden",
            }}
        >
            <Stack direction={"column"} sx={{ width: "100%", height: "100%" }}>
                <Grid
                    container
                    direction={"column"}
                    sx={{
                        paddingTop: downMD ? "0px" : "20px",
                        paddingLeft: "20px",
                        paddingBottom: "20px",
                        borderBottom: `4px solid ${color ? color : "#91E041"}`,
                    }}
                >
                    <Grid
                        item
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            paddingRight: 2,
                        }}
                    >
                        <Typography fontSize={28}>Book Room</Typography>
                        {selectedRoom?.image_url && (
                            <ImageViewer
                                src={roomImage}
                                alt={`${selectedRoom?.value} room image`}
                                clickable={true}
                                style={{
                                    maxWidth: "100px",
                                    maxHeight: "60px",
                                    objectFit: "cover",
                                    borderRadius: "4px",
                                    border: "1px solid #ddd",
                                }}
                            />
                        )}
                    </Grid>

                    <Typography
                        component="div"
                        fontSize={16}
                        color={theme.palette.secondary.light}
                        marginTop={"-5px"}
                        fontFamily={"comic sans ms"}
                    >
                        {update ? (
                            new Date(meeting?.start_time)?.toLocaleDateString(
                                "en-US",
                                {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                }
                            )
                        ) : multiDayMeet ? (
                            <>
                                <Typography>
                                    {meeting?.start?.toLocaleDateString(
                                        "en-US",
                                        {
                                            weekday: "long",
                                            day: "numeric",
                                            month: "long",
                                            year: "numeric",
                                        }
                                    )}{" "}
                                </Typography>
                                <Typography>
                                    {getPreviousDay(
                                        meeting?.end
                                    )?.toLocaleDateString("en-US", {
                                        weekday: "long",
                                        day: "numeric",
                                        month: "long",
                                        year: "numeric",
                                    })}
                                </Typography>
                            </>
                        ) : (
                            new Date(meeting?.start)?.toLocaleDateString(
                                "en-US",
                                {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                }
                            )
                        )}
                    </Typography>
                </Grid>
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingLeft: downMD ? 1 : "10px",
                        paddingRight: downMD ? 1 : "10px",
                    }}
                >
                    <Stack
                        direction={showDesc && !downMD ? "row" : "column"}
                        sx={{
                            paddingTop: "20px",
                            display: "flex",
                            flexGrow: 1,
                            width: "100%",
                        }}
                        spacing={2}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 1,
                                maxWidth:
                                    !showDesc && !downMD ? "350px" : "600px",
                                flexGrow: 1,
                            }}
                        >
                            <ShortTextField
                                value={meetingName}
                                label={"Meeting name"}
                                variant={"outlined"}
                                disabled={
                                    type?.value?.toLowerCase() ===
                                        "equipment" || loading
                                }
                                autoFocus={true}
                                onChange={(e) => setMeetingName(e)}
                            />
                            <ShortSelectObject
                                items={meetingTypes}
                                label={"Meeting Type"}
                                value={type}
                                onChange={onChangeMeetingType}
                                disabled={loading}
                            />
                            <ShortSelectRoom
                                items={rooms}
                                label={"Room"}
                                secondary={"capacity"}
                                value={selectedRoom}
                                onChange={setSelectedRoom}
                                info={locations}
                                showInfo={true}
                                roomResources={roomResources}
                                resources={resources}
                                disabled={loading}
                            />
                            {!allDay && (
                                <Stack
                                    direction={"row"}
                                    sx={{ width: "100%" }}
                                    spacing={1}
                                >
                                    <ShortSelect
                                        items={times}
                                        label={"Start Time"}
                                        value={startTime}
                                        onChange={onChangeStartTime}
                                        disabled={loading}
                                    />
                                    <ShortSelect
                                        items={filterTimesAfterCutoff(
                                            times,
                                            startTime
                                        )}
                                        label={"End Time"}
                                        value={endTime}
                                        onChange={onChangeEndTime}
                                        disabled={loading}
                                    />
                                </Stack>
                            )}
                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    width: "100%",
                                }}
                            >
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                        justifyContent: "flex-start",
                                    }}
                                >
                                    <Checkbox
                                        checked={itSupport}
                                        onChange={(e) =>
                                            setItSupport(e.target.checked)
                                        }
                                        size="small"
                                        sx={{
                                            padding: 0,
                                            "&:hover": {
                                                backgroundColor: "transparent",
                                            },
                                        }}
                                        disabled={loading}
                                    />
                                    <Typography
                                        variant="body2"
                                        sx={{ ml: 0.5 }}
                                    >
                                        I would like IT support during this
                                        meeting
                                    </Typography>
                                </Box>
                                {itSupport && (
                                    <TextField
                                        label="What do you need help with?"
                                        value={itSupportDetails}
                                        multiline
                                        rows={2}
                                        size="small"
                                        onChange={(e) =>
                                            setItSupportDetails(e.target.value)
                                        }
                                        disabled={loading}
                                        sx={{ mt: 1 }}
                                    />
                                )}
                            </Box>
                            {showDesc && (
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "flex-start",
                                        marginBottom: downMD ? -1.5 : 0,
                                    }}
                                >
                                    <Checkbox
                                        checked={allDay}
                                        value={allDay}
                                        onChange={(e) =>
                                            handleAllDayChange(e.target.checked)
                                        }
                                        size="small"
                                        sx={{
                                            padding: 0,
                                            "&:hover": {
                                                backgroundColor: "transparent",
                                            },
                                        }}
                                        disabled={loading}
                                    />
                                    <Typography
                                        variant="body2"
                                        sx={{ ml: 0.5 }}
                                    >
                                        All Day
                                    </Typography>
                                </Box>
                            )}
                        </Box>

                        {showDesc && (
                            <Box
                                sx={{
                                    display: "flex",
                                    flexGrow: 1,
                                    flexDirection: "column",
                                    gap: 1,
                                }}
                            >
                                <TextField
                                    id="outlined-multiline-static"
                                    label="Description"
                                    value={description}
                                    multiline
                                    rows={2}
                                    onChange={(e) =>
                                        setDescription(e.target.value)
                                    }
                                    disabled={loading}
                                />
                                <FormControl
                                    variant="outlined"
                                    sx={{ minWidth: 160, width: "100%" }}
                                    size={"small"}
                                >
                                    <InputLabel id="repeats-simple-select-standard-label">
                                        Repeats
                                    </InputLabel>
                                    <Select
                                        sx={{ width: "100%" }}
                                        labelId="repeats-simple-select-standard-label"
                                        id="repeats-simple-select-standard"
                                        label="Repeats"
                                        value={repeats}
                                        onChange={(e) =>
                                            setRepeats(e.target.value)
                                        }
                                        disabled={loading}
                                    >
                                        <MenuItem key={0} value={""}>
                                            {"-- None --"}
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
                                    </Select>
                                </FormControl>
                                <FormControl
                                    sx={{ width: "100%" }}
                                    size="small"
                                >
                                    <Autocomplete
                                        multiple
                                        options={users.filter(
                                            (gp) =>
                                                gp.access !== "Read" &&
                                                gp.id !== user?.id
                                        )}
                                        value={users.filter((u) =>
                                            special.includes(u.id)
                                        )}
                                        disabled={loading}
                                        onChange={(event, newValue) => {
                                            handleSpecialChange({
                                                target: {
                                                    value: newValue.map(
                                                        (user) => user.id
                                                    ),
                                                },
                                            });
                                        }}
                                        getOptionLabel={(option) =>
                                            `${option.first_name} ${option.last_name}`
                                        }
                                        isOptionEqualToValue={(option, value) =>
                                            option.id === value.id
                                        }
                                        renderTags={(value, getTagProps) =>
                                            value.map((option, index) => (
                                                <Chip
                                                    key={option.id}
                                                    label={`${option.first_name} ${option.last_name}`}
                                                    {...getTagProps({ index })}
                                                    sx={{ maxHeight: 25 }}
                                                />
                                            ))
                                        }
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Special Permissions"
                                            />
                                        )}
                                        sx={{ maxWidth: 365 }}
                                    />
                                    <FormHelperText
                                        sx={{ whiteSpace: "nowrap" }}
                                    >
                                        Allow users to see meeting
                                    </FormHelperText>
                                </FormControl>
                            </Box>
                        )}
                    </Stack>
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "row",
                            gap: 1,
                            flexGrow: 1,
                            width: downMD ? "90%" : "100%",
                            justifyContent: "center",
                            textAlign: "center",
                            justifyItems: "center",
                            alignItems: "center",
                            justifySelf: "center",
                            paddingTop: "10px",
                        }}
                    >
                        <Button
                            variant={"outlined"}
                            onClick={() => setShowDesc(!showDesc)}
                            sx={{
                                width: "100%",
                                color: "black",
                                ":hover": {
                                    background:
                                        theme.palette.background.fill.alert
                                            .warningLight,
                                },
                                fontWeight: "bold",
                            }}
                            disabled={loading}
                            startIcon={<TuneIcon />}
                        >
                            {showDesc ? "Basic" : "Advanced"}
                        </Button>
                        <Button
                            variant={"outlined"}
                            sx={{
                                width: "100%",
                                color: "black",
                                ":hover": {
                                    background:
                                        theme.palette.background.fill.alert
                                            .successLight,
                                },
                                fontWeight: "bold",
                            }}
                            disabled={loading}
                            onClick={onSubbmit}
                            startIcon={
                                loading ? (
                                    <CircularProgress size={16} />
                                ) : (
                                    <CheckIcon />
                                )
                            }
                        >
                            {update ? "Update" : "Book"}
                        </Button>
                    </Box>
                </Box>
            </Stack>
        </Grid>
    );
};

export default MeetingFourm;
