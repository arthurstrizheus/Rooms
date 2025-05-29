import { useTheme } from "@emotion/react";
import { useEffect, useState } from "react";
import {
  getAmPm,
  getHours,
  getMinutes,
  setTime,
} from "../../../Utilites/Functions/CommonFunctions";
import { useAuth } from "../../../Utilites/AuthContext";
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
  OutlinedInput,
  TextField,
  Checkbox,
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
import {
  DeleteSpecialPermission,
  GetSpecialPermissionsForMeeting,
  PostSpecialPermission,
} from "../../../Utilites/Functions/ApiFunctions/SpecialPermissionFunctions";
import { getDate, getMonth, getSeconds, getTime, getYear } from "date-fns";

// Welcome to Date Sanity™! All passengers please keep your arms inside the function at all times.
function isMultipleDayMeeting(meeting) {
  if (!meeting?.start || !meeting?.end) {
    // There is no meeting we can all go home
    return false;
  }
  const start = new Date(meeting.start);
  const end = new Date(meeting.end);

  if (meeting.all_day) {
    // For allDay events, end is exclusive. Nothing makes sense, so check for >1 day.
    const diff = (end - start) / (1000 * 60 * 60 * 24);
    return diff > 1;
  } else {
    // Compare local calendar days, like civilized people do.
    return (
      getYear(start) !== getYear(end) ||
      getMonth(start) !== getMonth(end) ||
      (getDate(start) !== getDate(end) &&
        getHours(end) != 0 &&
        getMinutes(end) != 0 &&
        getSeconds(end) != 0)
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

const MeetingFourm = ({
  date,
  meeting,
  rooms,
  update,
  meetingTypes,
  setUpdate,
  setUpdateTrigger,
  updateMode,
  onClose,
}) => {
  const theme = useTheme();
  const { user } = useAuth();
  const [color, setColor] = useState(null);
  const [type, setType] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("12:00 AM");
  const [endTime, setEndTime] = useState("12:00 AM");
  const [repeats, setRepeats] = useState("");
  const [users, setUsers] = useState([]);
  const [special, setSpecial] = useState([]);
  const [meetingName, setMeetingName] = useState("");
  const [showDesc, setShowDesc] = useState(false);
  const [allDay, setAllDay] = useState(meeting?.all_day || false);
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

      if (multiDayMeet) {
        // Ah, a meeting that spans multiple days! Surely, nobody will ever actually survive one of these.
        setStartTime("12:00 AM"); // Because time loses all meaning after Day 1.
        setEndTime("12:00 AM"); // It's always midnight somewhere, right?
      } else {
        if (meeting.all_day) {
          // The all-day event! The grown-up equivalent of "do not disturb."
          setStartTime("12:00 AM"); // Just pretend it's midnight all day.
          setEndTime("12:00 AM"); // See above, but with more existential dread.
        } else {
          // Finally, a meeting that dares to have an actual start and end time.
          setStartTime(
            `${String(getHours(meeting.start)).padStart(2, "0")}:${String(
              getMinutes(meeting.start)
            ).padStart(2, "0")} ${getAmPm(meeting.start).toUpperCase()}`
          );
          if (isLateMeeting(meeting)) {
            // For those meetings that creep past your bedtime.
            setEndTime("12:00 AM"); // The official time for "why am I still here?"
          } else {
            // The fabled normal meeting, as rare as a polite reply-all.
            setEndTime(
              `${String(getHours(meeting.end) ?? 12).padStart(2, "0")}:${String(
                getMinutes(meeting.end)
              ).padStart(2, "0")} ${getAmPm(meeting.end).toUpperCase()}`
            );
          }
        }
      }
      // Seek the Holy Grail of meeting types! It's always "meeting," because what else would it be?
      setType(meetingTypes?.find((tp) => tp.value.toLowerCase() === "meeting"));
      // End scene. Please clap.
    } else {
      // Welcome to "The Else Side"! Where dreams come true, variables get set, and nothing ever goes wrong.
      const meetingType = meetingTypes?.find((tp) => tp.id == meeting.type); // Finding the meeting type, like looking for a sensible comment on the Internet.
      const meetingRoom = rooms?.find((rm) => rm.id == meeting.room); // Ah, the room. Because meetings without rooms are just sad group hallucinations.
      setMeetingName(meeting.name); // Set the name, because "Untitled Meeting #47" doesn't inspire confidence.
      setType(meetingType); // Let the meeting have an identity crisis.
      setColor(meetingType?.color); // For when you want your meetings as colorful as your calendar-induced anxiety.
      setRepeats(meeting.repeats); // Because the only thing better than one meeting is infinite meetings.
      setSelectedRoom(meetingRoom); // May the odds of getting a room with working A/C be ever in your favor.
      setStartTime(
        `${String(getHours(meeting.start_time)).padStart(2, "0")}:${String(
          getMinutes(meeting.start_time)
        ).padStart(2, "0")} ${getAmPm(meeting.start_time).toUpperCase()}`
      ); // Because being late by one minute ruins everything.
      setEndTime(
        `${String(getHours(meeting.end_time)).padStart(2, "0")}:${String(
          getMinutes(meeting.end_time)
        ).padStart(2, "0")} ${getAmPm(meeting.end_time).toUpperCase()}`
      ); // Endings are important. Like, actually leaving on time.
      setDescription(meeting.description); // Let your meeting description do what your calendar cannot: make sense.

      if (meeting.description != "" && meeting.description != null) {
        // Show the description if it exists. Otherwise, pretend everything is fine.
        setShowDesc(true);
      }
      // The else saga ends. Nobody claps, but you feel a vague sense of accomplishment.
    }
  }, []);

  const onChangeMeetingType = (e) => {
    setColor((meetingTypes?.find((m) => m.value == e.value)).color);
    setType(e);
  };

  const onChangeStartTime = (e) => {
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
    setUpdate(!update);
    console.log("update");
    setUpdateTrigger((prevValue) => prevValue + 1);
    onClose();
  };

  const isSelected = (id) => special.indexOf(id) !== -1;
  console.log(meeting);

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
            CheckPostMeeting(user?.id, meeting)
              .then((resp) => {
                if (resp?.book) {
                  UpdateParentOnlyMeeting(meeting.id, meeting)
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
            CheckPostMeeting(user?.id, meeting)
              .then((resp) => {
                if (resp?.book) {
                  UpdateMeeting(user?.id, meeting)
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
      const end = setTime(
        update ? date : meeting?.all_day ? meeting?.start : meeting?.end,
        endTime
      );
      if (start >= end) {
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
          all_day: allDay,
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
        width: showDesc ? "600px" : "350px",
        height: showDesc ? "410px" : multiDayMeet ? "400px" : "380px",
        transition: "width 0.5s ease-in-out, height 0.5s ease-in-out",
        overflow: "hidden",
      }}
    >
      <Stack direction={"column"} sx={{ width: "100%", height: "100%" }}>
        <Grid
          container
          direction={"column"}
          sx={{
            paddingTop: "20px",
            paddingLeft: "20px",
            paddingBottom: "20px",
            borderBottom: `4px solid ${color ? color : "#91E041"}`,
          }}
        >
          <Typography fontSize={28}>Book Room</Typography>
          <Typography
            fontSize={16}
            color={theme.palette.secondary.light}
            marginTop={"-5px"}
            fontFamily={"comic sans ms"}
          >
            {update ? (
              new Date(meeting?.start_time)?.toLocaleDateString("en-US", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            ) : multiDayMeet ? (
              <>
                <Typography>
                  {meeting?.start?.toLocaleDateString("en-US", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                </Typography>
                <Typography>
                  {meeting?.end?.toLocaleDateString("en-US", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </Typography>
              </>
            ) : (
              meeting?.start?.toLocaleDateString("en-US", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            )}
          </Typography>
        </Grid>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <Stack
            direction={showDesc ? "row" : "column"}
            sx={{ padding: "20px" }}
            spacing={2}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
                maxWidth: !showDesc ? "350px" : "600px",
                flexGrow: 1,
              }}
            >
              <ShortTextField
                value={meetingName}
                label={"Meeting name"}
                variant={"outlined"}
                autoFocus={true}
                onChange={(e) => setMeetingName(e)}
              />
              <ShortSelectObject
                items={meetingTypes}
                label={"Meeting Type"}
                value={type}
                onChange={onChangeMeetingType}
              />
              <ShortSelectObject
                items={rooms}
                label={"Room"}
                value={selectedRoom}
                onChange={setSelectedRoom}
              />
              {!allDay && (
                <Stack direction={"row"} sx={{ width: "100%" }} spacing={1}>
                  <ShortSelect
                    items={times}
                    label={"Start Time"}
                    value={startTime}
                    onChange={onChangeStartTime}
                  />
                  <ShortSelect
                    items={times}
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
                  }}
                >
                  <Checkbox
                    checked={allDay}
                    value={allDay}
                    onChange={(e) => handleAllDayChange(e.target.checked)}
                    size="small"
                    sx={{
                      padding: 0,
                      "&:hover": { backgroundColor: "transparent" },
                    }}
                  />
                  <Typography variant="body2" sx={{ ml: 0.5 }}>
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
                  onChange={(e) => setDescription(e.target.value)}
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
                    onChange={(e) => setRepeats(e.target.value)}
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
                <FormControl sx={{ width: "100%" }} size={"small"}>
                  <InputLabel id="demo-multiple-chip-label-full">
                    Special Permissions
                  </InputLabel>
                  <Select
                    labelId="demo-multiple-chip-label-full"
                    id="demo-multiple-chip-full"
                    multiple
                    value={special}
                    onChange={handleSpecialChange}
                    input={
                      <OutlinedInput
                        id="select-multiple-chip-full"
                        label="Special Permissions"
                      />
                    }
                    renderValue={(selected) => (
                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 0.5,
                          maxHeight: 53,
                          minHeight: 53,
                          overflow: "auto",
                          marginTop: "4px",
                        }}
                      >
                        {selected?.map((value) => {
                          const user = users?.find((gp) => gp.id === value);
                          return (
                            <Chip
                              key={value}
                              label={`${user?.first_name} ${user?.last_name}`}
                              sx={{ maxHeight: 25, pointerEvents: "none" }}
                            />
                          );
                        })}
                      </Box>
                    )}
                    sx={{
                      overflow: "hidden",
                      minHeight: 55,
                      maxWidth: 365,
                      height: 55,
                    }}
                  >
                    {users
                      .filter((gp) => gp.access != "Read" && gp.id !== user?.id)
                      ?.map((user, index) => (
                        <MenuItem
                          key={index}
                          value={user?.id}
                          sx={{
                            fontWeight: special.indexOf(user?.id)?.admin
                              ? theme.typography.fontWeightRegular
                              : theme.typography.fontWeightMedium,
                          }}
                        >
                          {`${user?.first_name} ${user?.last_name}`}
                        </MenuItem>
                      ))}
                  </Select>
                  <FormHelperText sx={{ whiteSpace: "nowrap" }}>
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
              padding: "4px",
            }}
          >
            <Button
              variant={"outlined"}
              onClick={() => setShowDesc(!showDesc)}
              sx={{
                width: "100%",
                color: "black",
                ":hover": {
                  background: theme.palette.background.fill.alert.warningLight,
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
                  background: theme.palette.background.fill.alert.successLight,
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
