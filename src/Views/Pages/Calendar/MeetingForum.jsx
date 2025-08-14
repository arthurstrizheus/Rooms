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

const isLateMeeting = (meeting) => {
    if (!meeting?.start || !meeting?.end) {
        // There is no meeting, we can all go home. Or just pretend this is fine.
        return false;
    }
    const start = new Date(meeting.start); // Creating Date objects because who doesn't love reinventing time?
    const end = new Date(meeting.end); // Time is a flat circle... or just an object now.

    return (
        // A meeting can start at 11pm and end at 12AM (which is the next day technically). We dont like 2 day meetings... AVOID!
        // Because meetings that span different years are what nightmares are made of.
        getYear(start) != getYear(end) ||
        // Apparently, a month-long meeting is a thing. Live the dream.
        getMonth(start) != getMonth(end) ||
        // For when your meeting can't even stay in its own day.
        (getDate(start) != getDate(end) &&
            // But if it ends at exactly midnight, thats late? Sure, let's go with that.
            getHours(end) == 0 &&
            getMinutes(end) == 0 &&
            getSeconds(end) == 0)
    );
};

function getPreviousDay(d) {
    // Coerce input into a Date object
    const date = d instanceof Date ? new Date(d) : new Date(d);

    // Subtract one day—setDate handles rollovers (e.g., 1 → last day of previous month)
    date.setDate(date.getDate() - 1);

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
    const [showDesc, setShowDesc] = useState(false);
    const [roomImage, setRoomImage] = useState(null); // State to hold the room image URL
    const [showEquipment, setShowEquipment] = useState(false);
    const [allDay, setAllDay] = useState(
        meeting?.all_day || meeting?.allDay
            ? meeting?.view == "dayGridMonth"
                ? false
                : true
            : false
    );
    const times = [];
    const multiDayMeet = isMultipleDayMeeting(meeting);
    console.log(roomResources);

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
            if (multiDayMeet) {
                // Ah, a meeting that spans multiple days! Surely, nobody will ever actually survive one of these.
                setStartTime("12:00 AM"); // Because time loses all meaning after Day 1.
                setEndTime("12:15 AM"); // It's always midnight somewhere, right?
            } else {
                if (
                    meeting?.all_day ||
                    meeting?.allDay ||
                    meeting?.view == "dayGridMonth"
                ) {
                    // The all-day event! The grown-up equivalent of "do not disturb."
                    setStartTime("12:00 AM"); // Just pretend it's midnight all day.
                    setEndTime("12:15 AM"); // See above, but with more existential dread.
                } else {
                    // Finally, a meeting that dares to have an actual start and end time.
                    setStartTime(
                        `${String(getHours(meeting.start)).padStart(
                            2,
                            "0"
                        )}:${String(getMinutes(meeting.start)).padStart(
                            2,
                            "0"
                        )} ${getAmPm(meeting.start).toUpperCase()}`
                    );
                    if (isLateMeeting(meeting)) {
                        // For those meetings that creep past your bedtime.
                        setEndTime("12:00 AM"); // The official time for "why am I still here?"
                    } else {
                        // The fabled normal meeting, as rare as a polite reply-all.
                        setEndTime(
                            `${String(getHours(meeting.end) ?? 12).padStart(
                                2,
                                "0"
                            )}:${String(getMinutes(meeting.end)).padStart(
                                2,
                                "0"
                            )} ${getAmPm(meeting.end).toUpperCase()}`
                        );
                    }
                }
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
            ); // Endings are important. Like, actually leaving on time.
            setDescription(meeting.description); // Let your meeting description do what your calendar cannot: make sense.

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
        setShowEquipment(false);
        setUpdate(!update);
        console.log("update");
        setUpdateTrigger((prevValue) => prevValue + 1);
        onClose();
    };

    const isSelected = (id) => special.indexOf(id) !== -1;

    const onSubbmit = () => {
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
                                        clearOnClose();
                                    });
                                }
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
                                                        clearOnClose();
                                                    }
                                                );
                                            }
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
                                                        clearOnClose();
                                                    }
                                                );
                                            }
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
                }
            }
        } else {
            const start = setTime(update ? date : meeting?.start, startTime);
            let end = setTime(meeting?.end, endTime);
            if (multiDayMeet) {
                end = getPreviousDay(end);
            } else if (meeting.view == "dayGridMonth") {
                end.setDate(start.getDate());
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
                                    clearOnClose();
                                });
                            }
                        });
                        clearOnClose();
                    }
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
                height: showDesc
                    ? downMD
                        ? "600px"
                        : "390px"
                    : multiDayMeet && !allDay
                    ? downMD
                        ? "600px"
                        : "370px"
                    : allDay && multiDayMeet
                    ? downMD
                        ? "600px"
                        : "335px"
                    : allDay && !multiDayMeet
                    ? downMD
                        ? "600px"
                        : "30px"
                    : "360px",
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
                                    type?.value?.toLowerCase() === "equipment"
                                }
                                autoFocus={true}
                                onChange={(e) => setMeetingName(e)}
                            />
                            <ShortSelectObject
                                items={meetingTypes}
                                label={"Meeting Type"}
                                value={type}
                                onChange={onChangeMeetingType}
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
                                    />
                                    <ShortSelect
                                        items={filterTimesAfterCutoff(
                                            times,
                                            startTime
                                        )}
                                        label={"End Time"}
                                        value={endTime}
                                        onChange={onChangeEndTime}
                                    />
                                </Stack>
                            )}
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
                            onClick={onSubbmit}
                            startIcon={<CheckIcon />}
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
