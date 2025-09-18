import { useTheme } from "@emotion/react";
import {
    formatDate,
    getAmPm,
} from "../../../Utilites/Functions/CommonFunctions";
import {
    Grid,
    Stack,
    Typography,
    Button,
    Dialog,
    Divider,
    Tooltip,
    Box,
    Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PeopleIcon from "@mui/icons-material/People";
import DevicesIcon from "@mui/icons-material/Devices";
import { useAuth } from "../../../Utilites/AuthContext";
import {
    CancelAllMeetingsInRecurrence,
    CancelFollowingMeetingsInRecurrence,
    UpdateMeetingStatus,
} from "../../../Utilites/Functions/ApiFunctions/MeetingFunctions";
import { useState, useEffect } from "react";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import DoNotDisturbIcon from "@mui/icons-material/DoNotDisturb";
import RemoveRoadIcon from "@mui/icons-material/RemoveRoad";
import EditNoteIcon from "@mui/icons-material/EditNote";
import EditRoadIcon from "@mui/icons-material/EditRoad";
import ImageViewer from "../../../Components/ImageViewer";
import { GetRoomImage } from "../../../Utilites/Functions/ApiFunctions/RoomFunctions";

const DisplayMeeting = ({
    meeting,
    types,
    rooms,
    roomResources,
    resources,
    locations,
    handleExit,
    setUpdate,
    setUpdateMode,
    handleUpdateEvent,
}) => {
    const theme = useTheme();
    const { user } = useAuth();
    const [showWarning, setShowWarning] = useState(false);
    const [showParentWarning, setShowParentWarning] = useState(false);
    const [roomImage, setRoomImage] = useState(null); // State to hold the room image URL
    const isEquipment =
        localStorage.getItem("calendar-equipmentView") === "true";

    useEffect(() => {
        async function fetchRoomImage() {
            if (room?.image_url) {
                try {
                    const image = await GetRoomImage(room.image_url);
                    setRoomImage(image);
                } catch (error) {
                    console.error("Error fetching room image:", error);
                }
            } else {
                console.warn("No image URL provided for the room.");
            }
        }
        fetchRoomImage();
    }, [meeting.room]);

    if (!meeting) {
        console.log("No meeting");
        return <></>;
    }
    const start = new Date(meeting?.start_time);
    const end = new Date(meeting?.end_time);
    const color = types?.find((tp) => tp?.id == meeting?.type)?.color;
    const type = types?.find((tp) => tp?.id == meeting?.type)?.value;
    let room = rooms?.find((rm) => rm?.id == meeting?.room);
    const location = locations?.find(
        (lc) => lc?.officeid == meeting?.location
    )?.Alias;
    const getEquiptmentRoom = (equipmentId) => {
        if (!equipmentId) return null;
        const equipmentRoomLinks =
            roomResources?.find((rr) => rr.resource_id === equipmentId) || [];
        room = rooms?.find((rm) => rm?.id == equipmentRoomLinks?.room_id);
        return rooms?.find((rm) => rm?.id == equipmentRoomLinks?.room_id);
    };

    const equipment = resources?.find((r) => r?.id == meeting?.equipment);
    const equipmentRoom = getEquiptmentRoom(meeting?.equipment);

    const formatCapacity = (capacity) => {
        if (capacity === 0) return "Capacity: No limit";
        if (capacity >= 1000) return "Capacity: Large";
        return `Capacity: ${capacity} people`;
    };

    const getRoomResources = (roomId) => {
        const roomResourceLinks =
            roomResources?.filter((rr) => rr.room_id === roomId) || [];
        return roomResourceLinks
            .map((link) => {
                const resource = resources?.find(
                    (r) => r.id === link.resource_id && r.equipment === false
                );
                return resource;
            })
            .filter(Boolean); // Remove any undefined resources
    };

    const formatColor = (color) => {
        if (!color) return "#grey";
        // If color doesn't start with #, add it
        if (color.match(/^[0-9A-Fa-f]{6}$/)) {
            return `#${color}`;
        }
        return color;
    };

    const handleEdit = () => {
        if (meeting.recurrence_id) {
            setShowParentWarning(true);
        } else {
            setUpdateMode(null);
            handleUpdateEvent();
        }
    };

    const handleDelete = () => {
        if (meeting.recurrence_id) {
            setShowWarning(true);
        } else {
            UpdateMeetingStatus(meeting.id, {
                status: "Canceled",
                userId: user?.id,
                meeting: meeting.id === -1 ? meeting : null,
            }).then(() => {
                setUpdate((prev) => prev + 1);
                handleExit();
            });
            setShowWarning(false);
        }
    };

    const handleCancelAll = () => {
        CancelAllMeetingsInRecurrence({
            recurrence_id: meeting.recurrence_id,
            userId: user?.id,
        }).then(() => {
            setUpdate((prev) => prev + 1);
            handleExit();
        });
        setShowWarning(false);
    };
    const handleCancelAllNext = () => {
        CancelFollowingMeetingsInRecurrence({
            recurrence_id: meeting.recurrence_id,
            userId: user?.id,
            date: meeting.start_time,
        }).then(() => {
            setUpdate((prev) => prev + 1);
            handleExit();
        });
        setShowWarning(false);
    };

    const handleCancelOnlyParent = () => {
        UpdateMeetingStatus(meeting.id, {
            status: "Canceled",
            userId: user?.id,
            meeting: meeting.id === -1 ? meeting : null,
        }).then(() => {
            setUpdate((prev) => prev + 1);
            handleExit();
        });
        setShowWarning(false);
    };

    const handleEditOnlyParent = () => {
        setUpdateMode("current");
        setShowParentWarning(false);
        handleUpdateEvent();
    };
    const handleEditFollowingParent = () => {
        setUpdateMode("next");
        setShowParentWarning(false);
        handleUpdateEvent();
    };
    const handleEditALL = () => {
        setUpdateMode("all");
        setShowParentWarning(false);
        handleUpdateEvent();
    };

    return (
        <Box sx={{ display: "flex", flexGrow: 1 }}>
            {/* Delete/Cancel Parent Warning Dialog*/}
            <Dialog
                open={showWarning}
                onClose={() => setShowWarning(false)}
                maxWidth={"md"}
            >
                <Grid
                    container
                    height={"100%"}
                    sx={{
                        minWidth: "315px",
                        minHeight: "320px",
                        width: "410px",
                        overflow: "hidden",
                    }}
                >
                    <CloseIcon
                        sx={{
                            position: "absolute",
                            top: 1,
                            right: 1,
                            borderRadius: "50%",
                            width: "25px",
                            height: "25px",
                            color: "black",
                            background: "#f5f5f5",
                            ":hover": {
                                background: "#e8e8e8",
                                cursor: "pointer",
                                transform: "scale(1.1)",
                            },
                        }}
                        onClick={() => setShowWarning(false)}
                    />
                    <Grid
                        item
                        sx={{
                            width: "100%",
                            height: "100%",
                            borderBottom: `5px solid ${color}`,
                            padding: "15px 20px 10px 20px",
                            background: "#f2eeed",
                        }}
                    >
                        <Stack
                            direction={"column"}
                            spacing={"-5px"}
                            sx={{ paddingLeft: "5px" }}
                        >
                            <Typography variant="h5">{meeting.name}</Typography>
                            <Typography
                                variant="caption"
                                fontSize={14}
                                paddingLeft={"3px"}
                            >
                                {new Date(
                                    meeting.start_time
                                ).toLocaleDateString("en-US", {
                                    weekday: "long",
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                })}
                            </Typography>
                        </Stack>
                        <Divider sx={{ paddingTop: "5px" }} />
                        <Stack
                            direction={"column"}
                            sx={{ paddingTop: "5px", paddingLeft: "5px" }}
                            spacing={"-8px"}
                        >
                            <Typography
                                variant="h6"
                                fontSize={18}
                                letterSpacing={1}
                                color={theme.palette.secondary.main}
                            >
                                {start.getHours() > 12
                                    ? start.getHours() - 12
                                    : start.getHours() < 1
                                    ? "12"
                                    : start.getHours()}
                                :{String(start.getMinutes()).padStart(2, "0")}
                                {getAmPm(start)} -{" "}
                                {end.getHours() > 12
                                    ? end.getHours() - 12
                                    : end.getHours() < 1
                                    ? "12"
                                    : end.getHours()}
                                :{String(end.getMinutes()).padStart(2, "0")}
                                {getAmPm(end)}
                            </Typography>
                            <Typography
                                variant="body1"
                                color={theme.palette.primary.text.dark}
                                fontSize={14}
                                paddingLeft={"3px"}
                            >
                                SEA {location} /{" "}
                                {isEquipment
                                    ? equipmentRoom?.value
                                    : room?.value}
                            </Typography>
                        </Stack>
                    </Grid>
                    <Grid
                        item
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            width: "100%",
                            height: "100%",
                            padding: "15px 20px 10px 20px",
                            justifyContent: "center",
                        }}
                    >
                        <Typography paddingTop={"10px"}>
                            This meeting is recurring {meeting.repeats}.
                        </Typography>
                        <Typography paddingTop={"10px"}>
                            What would you like to do?
                        </Typography>
                    </Grid>
                    <Grid padding={"5px"}></Grid>
                    <Stack
                        position={"relative"}
                        bottom={meeting.description ? 0 : -5}
                        direction={"row"}
                        width={"100%"}
                        sx={{
                            marginBottom: "-5px",
                            paddingRight: "5px",
                            paddingTop: "5px",
                            paddingLeft: "5px",
                            height: "35px",
                            borderTop: "1px solid #dedede",
                        }}
                        spacing={1}
                    >
                        <Tooltip
                            title={"Cancel all recurring meetings"}
                            componentsProps={{
                                tooltip: {
                                    sx: {
                                        fontSize: ".8rem", // Larger text
                                    },
                                },
                            }}
                        >
                            <Button
                                variant={"outlined"}
                                style={{ fontSize: "12px" }}
                                sx={{
                                    width: "100%",
                                    color: "black",
                                    padding: "5px",
                                }}
                                onClick={handleCancelAll}
                                startIcon={
                                    <DeleteSweepIcon
                                        sx={{
                                            color: theme.palette.secondary
                                                .light,
                                        }}
                                    />
                                }
                            >
                                Cancel All
                            </Button>
                        </Tooltip>
                        <Tooltip
                            title={"Cancel all following meetings"}
                            componentsProps={{
                                tooltip: {
                                    sx: {
                                        fontSize: ".8rem", // Larger text
                                    },
                                },
                            }}
                        >
                            <Button
                                variant={"outlined"}
                                style={{ fontSize: "12px" }}
                                sx={{
                                    width: "100%",
                                    color: "black",
                                }}
                                onClick={handleCancelAllNext}
                                startIcon={
                                    <RemoveRoadIcon
                                        sx={{
                                            color: theme.palette.secondary
                                                .light,
                                        }}
                                    />
                                }
                            >
                                Cancel Next
                            </Button>
                        </Tooltip>
                        <Tooltip
                            title={"Cancel this meeting"}
                            componentsProps={{
                                tooltip: {
                                    sx: {
                                        fontSize: ".8rem", // Larger text
                                    },
                                },
                            }}
                        >
                            <Button
                                variant={"outlined"}
                                style={{ fontSize: "12px" }}
                                sx={{
                                    width: "100%",
                                    color: "black",
                                    padding: "5px",
                                }}
                                onClick={handleCancelOnlyParent}
                                startIcon={
                                    <DoNotDisturbIcon
                                        sx={{
                                            color: theme.palette.secondary
                                                .light,
                                        }}
                                    />
                                }
                            >
                                Cancel Current
                            </Button>
                        </Tooltip>
                    </Stack>
                </Grid>
            </Dialog>
            {/* Edit Parent Warning Dialog*/}
            <Dialog
                open={showParentWarning}
                onClose={() => setShowParentWarning(false)}
            >
                <Grid
                    container
                    height={"100%"}
                    sx={{
                        minWidth: "320px",
                        minHeight: "320px",
                        width: "400px",
                        overflow: "hidden",
                    }}
                >
                    <CloseIcon
                        sx={{
                            position: "absolute",
                            top: 1,
                            right: 1,
                            borderRadius: "50%",
                            width: "25px",
                            height: "25px",
                            color: "black",
                            background: "#f5f5f5",
                            ":hover": {
                                background: "#e8e8e8",
                                cursor: "pointer",
                                transform: "scale(1.1)",
                            },
                        }}
                        onClick={() => setShowParentWarning(false)}
                    />
                    <Grid
                        item
                        sx={{
                            width: "100%",
                            height: "100%",
                            borderBottom: `5px solid ${color}`,
                            padding: "15px 20px 10px 20px",
                            background: "#f2eeed",
                        }}
                    >
                        <Stack
                            direction={"column"}
                            spacing={"-5px"}
                            sx={{ paddingLeft: "5px" }}
                        >
                            <Typography variant="h5">{meeting.name}</Typography>
                            <Typography
                                variant="caption"
                                fontSize={14}
                                paddingLeft={"3px"}
                            >
                                {new Date(
                                    meeting.start_time
                                ).toLocaleDateString("en-US", {
                                    weekday: "long",
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                })}
                            </Typography>
                        </Stack>
                        <Divider sx={{ paddingTop: "5px" }} />
                        <Stack
                            direction={"column"}
                            sx={{ paddingTop: "5px", paddingLeft: "5px" }}
                            spacing={"-8px"}
                        >
                            <Typography
                                variant="h6"
                                fontSize={18}
                                letterSpacing={1}
                                color={theme.palette.secondary.main}
                            >
                                {start.getHours() > 12
                                    ? start.getHours() - 12
                                    : start.getHours() < 1
                                    ? "12"
                                    : start.getHours()}
                                :{String(start.getMinutes()).padStart(2, "0")}
                                {getAmPm(start)} -{" "}
                                {end.getHours() > 12
                                    ? end.getHours() - 12
                                    : end.getHours() < 1
                                    ? "12"
                                    : end.getHours()}
                                :{String(end.getMinutes()).padStart(2, "0")}
                                {getAmPm(end)}
                            </Typography>
                            <Typography
                                variant="body1"
                                color={theme.palette.primary.text.dark}
                                fontSize={14}
                                paddingLeft={"3px"}
                            >
                                SEA {location} / {room?.value}
                            </Typography>
                        </Stack>
                    </Grid>
                    <Grid
                        item
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            width: "100%",
                            height: "100%",
                            padding: "15px 20px 10px 20px",
                            justifyContent: "center",
                        }}
                    >
                        <Typography paddingTop={"10px"}>
                            This meeting is recurring {meeting.repeats}.
                        </Typography>
                        <Typography paddingTop={"10px"}>
                            What would you like to do?
                        </Typography>
                    </Grid>
                    <Grid padding={"5px"}></Grid>
                    <Stack
                        position={"relative"}
                        bottom={meeting.description ? 0 : -5}
                        direction={"row"}
                        width={"100%"}
                        sx={{
                            marginBottom: "-5px",
                            paddingRight: "5px",
                            paddingTop: "5px",
                            paddingLeft: "5px",
                            height: "35px",
                            borderTop: "1px solid #dedede",
                        }}
                        spacing={1}
                    >
                        <Tooltip
                            title={"Update all future meetings"}
                            componentsProps={{
                                tooltip: {
                                    sx: {
                                        fontSize: ".8rem", // Larger text
                                    },
                                },
                            }}
                        >
                            <Button
                                variant={"outlined"}
                                style={{ fontSize: "12px" }}
                                sx={{
                                    width: "100%",
                                    color: "black",
                                }}
                                onClick={handleEditALL}
                                startIcon={
                                    <EditNoteIcon sx={{ color: "error" }} />
                                }
                            >
                                Edit All
                            </Button>
                        </Tooltip>
                        <Tooltip
                            title={
                                "Update all the next meetings after this point"
                            }
                            componentsProps={{
                                tooltip: {
                                    sx: {
                                        fontSize: ".8rem", // Larger text
                                    },
                                },
                            }}
                        >
                            <Button
                                variant={"outlined"}
                                style={{ fontSize: "12px" }}
                                sx={{
                                    width: "100%",
                                    color: "black",
                                }}
                                onClick={handleEditFollowingParent}
                                startIcon={
                                    <EditRoadIcon
                                        sx={{
                                            color: theme.palette.secondary
                                                .light,
                                        }}
                                    />
                                }
                            >
                                Edit Next
                            </Button>
                        </Tooltip>
                        <Tooltip
                            title={"Update this meeting"}
                            componentsProps={{
                                tooltip: {
                                    sx: {
                                        fontSize: ".8rem", // Larger text
                                    },
                                },
                            }}
                        >
                            <Button
                                variant={"outlined"}
                                style={{ fontSize: "12px" }}
                                sx={{
                                    width: "100%",
                                    color: "black",
                                }}
                                onClick={handleEditOnlyParent}
                                startIcon={
                                    <EditIcon
                                        sx={{
                                            color: theme.palette.secondary
                                                .light,
                                        }}
                                    />
                                }
                            >
                                Edit Current
                            </Button>
                        </Tooltip>
                    </Stack>
                </Grid>
            </Dialog>
            {/* Normal Dialog*/}
            <Grid
                container
                height={"100%"}
                sx={{
                    minWidth: "300px",
                    minHeight: "300px",
                    overflow: "hidden",
                    paddingBottom: "5px",
                }}
            >
                <CloseIcon
                    sx={{
                        position: "absolute",
                        top: 1,
                        right: 1,
                        borderRadius: "50%",
                        width: "25px",
                        height: "25px",
                        color: "black",
                        background: "#f5f5f5",
                        ":hover": {
                            background: "#e8e8e8",
                            cursor: "pointer",
                            transform: "scale(1.1)",
                        },
                    }}
                    onClick={handleExit}
                />
                <Grid
                    item
                    sx={{
                        width: "100%",
                        height: "100%",
                        borderBottom: `5px solid ${color}`,
                        padding: "15px 20px 10px 20px",
                        background:
                            theme.palette.background.fill.light.lightHover,
                    }}
                >
                    <Stack
                        direction={"column"}
                        spacing={"-5px"}
                        sx={{ paddingLeft: "5px" }}
                    >
                        <Stack
                            direction={"row"}
                            sx={{ justifyContent: "space-between" }}
                        >
                            <Typography variant="h5">{meeting.name}</Typography>
                            {room?.image_url && (
                                <ImageViewer
                                    src={roomImage}
                                    alt={`${room?.value} room image`}
                                    style={{
                                        maxWidth: "100px",
                                        marginRight: "10px",
                                        maxHeight: "60px",
                                        objectFit: "cover",
                                        borderRadius: "4px",
                                        border: "1px solid #ddd",
                                    }}
                                />
                            )}
                        </Stack>

                        <Typography
                            variant="caption"
                            fontSize={14}
                            paddingLeft={"3px"}
                        >
                            {new Date(meeting.start_time).toLocaleDateString(
                                "en-US",
                                {
                                    weekday: "long",
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                }
                            )}
                        </Typography>
                    </Stack>
                    <Divider sx={{ paddingTop: "5px" }} />
                    <Stack
                        direction={"column"}
                        sx={{ paddingTop: "5px", paddingLeft: "5px" }}
                        spacing={"-8px"}
                    >
                        <Typography
                            variant="h6"
                            fontSize={18}
                            letterSpacing={1}
                            color={theme.palette.secondary.main}
                        >
                            {start.getHours() > 12
                                ? start.getHours() - 12
                                : start.getHours() < 1
                                ? "12"
                                : start.getHours()}
                            :{String(start.getMinutes()).padStart(2, "0")}
                            {getAmPm(start)} -{" "}
                            {end.getHours() > 12
                                ? end.getHours() - 12
                                : end.getHours() < 1
                                ? "12"
                                : end.getHours()}
                            :{String(end.getMinutes()).padStart(2, "0")}
                            {getAmPm(end)}
                        </Typography>
                        <Stack
                            direction="row"
                            alignItems="center"
                            spacing={0.5}
                            sx={{ paddingLeft: "3px" }}
                        >
                            <Typography
                                variant="body1"
                                color={theme.palette.primary.text.dark}
                                fontSize={14}
                            >
                                SEA {location} /{" "}
                                {isEquipment
                                    ? equipmentRoom?.value
                                    : room?.value}
                            </Typography>
                            {/* Room Color Indicator next to room name */}
                            {room?.color && (
                                <Box
                                    sx={{
                                        width: 12,
                                        height: 12,
                                        backgroundColor: formatColor(
                                            room.color
                                        ),
                                        borderRadius: "50%",
                                        border: `1px solid ${theme.palette.divider}`,
                                        ml: 0.5,
                                    }}
                                />
                            )}
                        </Stack>
                    </Stack>

                    {/* Enhanced Room Information */}
                    {room && (
                        <Box sx={{ mt: 1, ml: 1 }}>
                            <Stack
                                direction="row"
                                spacing={1}
                                sx={{ flexWrap: "wrap", gap: 0.5 }}
                            >
                                {/* Capacity Info */}
                                <Chip
                                    icon={<PeopleIcon />}
                                    label={formatCapacity(room.capacity)}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                        height: 22,
                                        "& .MuiChip-label": {
                                            fontSize: "0.7rem",
                                        },
                                        "& .MuiChip-icon": {
                                            fontSize: "0.8rem",
                                        },
                                    }}
                                />
                            </Stack>

                            {/* Room Resources */}
                            {(() => {
                                const roomResourceList = getRoomResources(
                                    room.id
                                );
                                return (
                                    roomResourceList.length > 0 && (
                                        <Box sx={{ mt: 1 }}>
                                            <Stack
                                                direction="row"
                                                spacing={0.5}
                                                alignItems="center"
                                                sx={{ flexWrap: "wrap" }}
                                            >
                                                <DevicesIcon
                                                    sx={{
                                                        fontSize: 14,
                                                        color: theme.palette
                                                            .text.secondary,
                                                        mr: 0.5,
                                                    }}
                                                />
                                                {roomResourceList
                                                    .slice(0, 4)
                                                    .map((resource) => (
                                                        <Chip
                                                            key={resource.id}
                                                            label={
                                                                resource.name
                                                            }
                                                            size="small"
                                                            variant="filled"
                                                            sx={{
                                                                height: 18,
                                                                "& .MuiChip-label":
                                                                    {
                                                                        fontSize:
                                                                            "0.6rem",
                                                                        px: 0.5,
                                                                    },
                                                            }}
                                                        />
                                                    ))}
                                                {roomResourceList.length >
                                                    4 && (
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                        sx={{
                                                            fontSize: "0.6rem",
                                                            ml: 0.5,
                                                        }}
                                                    >
                                                        +
                                                        {roomResourceList.length -
                                                            4}{" "}
                                                        more
                                                    </Typography>
                                                )}
                                            </Stack>
                                        </Box>
                                    )
                                );
                            })()}
                        </Box>
                    )}
                </Grid>
                <Grid
                    item
                    sx={{
                        width: "100%",
                        height: "100%",
                        padding: "15px 20px 10px 20px",
                    }}
                >
                    <Stack
                        direction={"row"}
                        sx={{ paddingLeft: "5px" }}
                        spacing={3}
                    >
                        <Stack direction={"column"} spacing={1}>
                            <Typography
                                variant="body1"
                                color={theme.palette.primary.text.dark}
                            >
                                Booker:
                            </Typography>
                            <Typography
                                variant="body1"
                                color={theme.palette.primary.text.dark}
                            >
                                Type:
                            </Typography>
                            {equipment?.id && (
                                <Typography
                                    variant="body1"
                                    color={theme.palette.primary.text.dark}
                                >
                                    Equipment:
                                </Typography>
                            )}
                            {meeting.repeats && (
                                <Typography
                                    variant="body1"
                                    color={theme.palette.primary.text.dark}
                                >
                                    Repeats:
                                </Typography>
                            )}
                            {meeting.UpdatedUser && (
                                <Typography
                                    variant="body1"
                                    color={theme.palette.primary.text.dark}
                                >
                                    Last Updated By:
                                </Typography>
                            )}
                        </Stack>
                        <Stack direction={"column"} spacing={1}>
                            <Typography variant="body1">
                                {meeting.organizer}
                            </Typography>
                            <Typography variant="body1">{type}</Typography>
                            {equipment?.id && (
                                <Typography variant="body1">
                                    {equipment?.name}
                                </Typography>
                            )}
                            {meeting.repeats && (
                                <Typography variant="body1">
                                    {meeting.repeats}
                                </Typography>
                            )}
                            {meeting.UpdatedUser && (
                                <Tooltip title={meeting.UpdatedUser.email}>
                                    <Typography variant="body1">{`${meeting.UpdatedUser.first_name} ${meeting.UpdatedUser.last_name}`}</Typography>
                                </Tooltip>
                            )}
                        </Stack>
                    </Stack>
                    {meeting.description && (
                        <Divider sx={{ paddingTop: "5px" }} />
                    )}
                    {meeting?.description != "" &&
                        meeting?.description != null &&
                        meeting?.description != undefined && (
                            <Stack
                                direction={"column"}
                                sx={{ paddingLeft: "5px" }}
                            >
                                <Typography
                                    variant="body1"
                                    color={theme.palette.primary.text.dark}
                                    sx={{ marginBottom: "-15px" }}
                                >
                                    Description:
                                </Typography>
                                <Typography paddingTop={"10px"}>
                                    {meeting.description}
                                </Typography>
                            </Stack>
                        )}
                </Grid>
                <Grid padding={"5px"}></Grid>
                <Stack
                    position={"relative"}
                    bottom={meeting.description ? 0 : -5}
                    direction={"row"}
                    width={"100%"}
                    sx={{
                        padding: "5px",
                        height: "35px",
                        borderTop: "1px solid #dedede",
                    }}
                    spacing={1}
                >
                    <Button
                        variant={"outlined"}
                        sx={{
                            width: "100%",
                            color: "black",
                        }}
                        onClick={handleEdit}
                        startIcon={<EditIcon />}
                    >
                        Edit
                    </Button>
                    <Button
                        variant={"outlined"}
                        sx={{
                            width: "100%",
                            color: "black",
                        }}
                        onClick={handleDelete}
                        startIcon={<DeleteOutlineIcon />}
                    >
                        Cancel
                    </Button>
                </Stack>
            </Grid>
        </Box>
    );
};

export default DisplayMeeting;
