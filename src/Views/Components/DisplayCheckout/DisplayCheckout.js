import { useTheme } from "@emotion/react";
import { useMediaQuery } from "@mui/material";
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
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CategoryIcon from "@mui/icons-material/Category";
import PersonIcon from "@mui/icons-material/Person";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import { useAuth } from "../../../Utilites/AuthContext";
import { useState, useEffect } from "react";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import DoNotDisturbIcon from "@mui/icons-material/DoNotDisturb";
import RemoveRoadIcon from "@mui/icons-material/RemoveRoad";
import EditNoteIcon from "@mui/icons-material/EditNote";
import EditRoadIcon from "@mui/icons-material/EditRoad";
import ImageViewer from "../../../Components/ImageViewer";
import axios from "axios";

const DisplayCheckout = ({
    checkout,
    equipment,
    handleExit,
    setUpdate,
    setUpdateMode,
    handleUpdateEvent,
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const { user } = useAuth();
    const [showWarning, setShowWarning] = useState(false);
    const [showParentWarning, setShowParentWarning] = useState(false);
    const [equipmentImage, setEquipmentImage] = useState(null);
    const [bookerInfo, setBookerInfo] = useState(null);

    useEffect(() => {
        // Fetch equipment image if available
        if (equipment?.image_url) {
            fetchEquipmentImage();
        }

        // Fetch booker information
        if (checkout?.user_id) {
            fetchBookerInfo();
        }
    }, [equipment, checkout]);

    const fetchEquipmentImage = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.get(
                `/api/equipment/${equipment.id}/image`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    responseType: "blob",
                },
            );
            const imageUrl = URL.createObjectURL(response.data);
            setEquipmentImage(imageUrl);
        } catch (error) {
            console.error("Error fetching equipment image:", error);
        }
    };

    const fetchBookerInfo = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.get(`/api/users/${checkout.user_id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setBookerInfo(response.data);
        } catch (error) {
            console.error("Error fetching booker info:", error);
        }
    };

    if (!checkout || !equipment) {
        console.log("No checkout or equipment");
        return <></>;
    }

    const start = new Date(checkout?.start_time);
    const end = new Date(checkout?.end_time);
    const statusColor =
        {
            pending: theme.palette.warning.main,
            approved: theme.palette.success.main,
            reserved: theme.palette.info.main,
            returned: theme.palette.grey[500],
            cancelled: theme.palette.error.main,
        }[checkout?.status] || theme.palette.grey[400];

    const handleEdit = () => {
        if (checkout.recurrence_id) {
            setShowParentWarning(true);
        } else {
            setUpdateMode(null);
            handleUpdateEvent();
        }
    };

    const handleCancel = async () => {
        if (checkout.recurrence_id) {
            setShowWarning(true);
        } else {
            try {
                const token = localStorage.getItem("authToken");
                await axios.put(
                    `/api/checkouts/${checkout.id}`,
                    {
                        status: "cancelled",
                        user_id: user?.id,
                    },
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    },
                );
                setUpdate((prev) => prev + 1);
                handleExit();
            } catch (error) {
                console.error("Error cancelling checkout:", error);
            }
            setShowWarning(false);
        }
    };

    const handleCancelAll = async () => {
        try {
            const token = localStorage.getItem("authToken");
            await axios.put(
                `/api/checkouts/${checkout.id}`,
                {
                    status: "cancelled",
                    updateMode: "all",
                    occurrence_start_time:
                        checkout.start_time || checkout.start,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );
            setUpdate((prev) => prev + 1);
            handleExit();
        } catch (error) {
            console.error("Error cancelling all checkouts:", error);
        }
        setShowWarning(false);
    };

    const handleCancelAllNext = async () => {
        try {
            const token = localStorage.getItem("authToken");
            await axios.put(
                `/api/checkouts/${checkout.id}`,
                {
                    status: "cancelled",
                    updateMode: "following",
                    occurrence_start_time:
                        checkout.start_time || checkout.start,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );
            setUpdate((prev) => prev + 1);
            handleExit();
        } catch (error) {
            console.error("Error cancelling following checkouts:", error);
        }
        setShowWarning(false);
    };

    const handleCancelOnlyParent = async () => {
        try {
            const token = localStorage.getItem("authToken");
            await axios.put(
                `/api/checkouts/${checkout.id}`,
                {
                    status: "cancelled",
                    user_id: user?.id,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );
            setUpdate((prev) => prev + 1);
            handleExit();
        } catch (error) {
            console.error("Error cancelling checkout:", error);
        }
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
                        minWidth: isMobile ? "280px" : "315px",
                        minHeight: "320px",
                        width: isMobile ? "95vw" : "410px",
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
                            borderBottom: `5px solid ${statusColor}`,
                            padding: isMobile
                                ? "15px 15px 10px 15px"
                                : "15px 20px 10px 20px",
                            background: "#f2eeed",
                        }}
                    >
                        <Stack
                            direction={"column"}
                            spacing={"-5px"}
                            sx={{ paddingLeft: "5px" }}
                        >
                            <Typography variant="h5">
                                {equipment?.name}
                            </Typography>
                            <Typography
                                variant="caption"
                                fontSize={14}
                                paddingLeft={"3px"}
                            >
                                {new Date(
                                    checkout.start_time,
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
                                {equipment?.location || "Equipment Location"}
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
                            padding: isMobile
                                ? "15px 15px 10px 15px"
                                : "15px 20px 10px 20px",
                            justifyContent: "center",
                        }}
                    >
                        <Typography paddingTop={"10px"}>
                            This checkout is recurring {checkout.repeats}.
                        </Typography>
                        <Typography paddingTop={"10px"}>
                            What would you like to do?
                        </Typography>
                    </Grid>
                    <Grid padding={"5px"}></Grid>
                    <Stack
                        position={"relative"}
                        bottom={0}
                        direction={isMobile ? "column" : "row"}
                        width={"100%"}
                        sx={{
                            marginBottom: "-5px",
                            paddingRight: "5px",
                            paddingTop: "5px",
                            paddingLeft: "5px",
                            height: isMobile ? "auto" : "35px",
                            borderTop: "1px solid #dedede",
                        }}
                        spacing={1}
                    >
                        <Tooltip
                            title={"Cancel all recurring reservations"}
                            componentsProps={{
                                tooltip: {
                                    sx: {
                                        fontSize: ".8rem",
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
                            title={"Cancel all following reservations"}
                            componentsProps={{
                                tooltip: {
                                    sx: {
                                        fontSize: ".8rem",
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
                            title={"Cancel this reservation"}
                            componentsProps={{
                                tooltip: {
                                    sx: {
                                        fontSize: ".8rem",
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
                        minWidth: isMobile ? "280px" : "320px",
                        minHeight: "320px",
                        width: isMobile ? "95vw" : "400px",
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
                            borderBottom: `5px solid ${statusColor}`,
                            padding: isMobile
                                ? "15px 15px 10px 15px"
                                : "15px 20px 10px 20px",
                            background: "#f2eeed",
                        }}
                    >
                        <Stack
                            direction={"column"}
                            spacing={"-5px"}
                            sx={{ paddingLeft: "5px" }}
                        >
                            <Typography variant="h5">
                                {equipment?.name}
                            </Typography>
                            <Typography
                                variant="caption"
                                fontSize={14}
                                paddingLeft={"3px"}
                            >
                                {new Date(
                                    checkout.start_time,
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
                                {equipment?.location || "Equipment Location"}
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
                            padding: isMobile
                                ? "15px 15px 10px 15px"
                                : "15px 20px 10px 20px",
                            justifyContent: "center",
                        }}
                    >
                        <Typography paddingTop={"10px"}>
                            This checkout is recurring {checkout.repeats}.
                        </Typography>
                        <Typography paddingTop={"10px"}>
                            What would you like to do?
                        </Typography>
                    </Grid>
                    <Grid padding={"5px"}></Grid>
                    <Stack
                        position={"relative"}
                        bottom={0}
                        direction={isMobile ? "column" : "row"}
                        width={"100%"}
                        sx={{
                            marginBottom: "-5px",
                            paddingRight: "5px",
                            paddingTop: "5px",
                            paddingLeft: "5px",
                            height: isMobile ? "auto" : "35px",
                            borderTop: "1px solid #dedede",
                        }}
                        spacing={1}
                    >
                        <Tooltip
                            title={"Update all future reservations"}
                            componentsProps={{
                                tooltip: {
                                    sx: {
                                        fontSize: ".8rem",
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
                                "Update all the next reservations after this point"
                            }
                            componentsProps={{
                                tooltip: {
                                    sx: {
                                        fontSize: ".8rem",
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
                            title={"Update this reservation"}
                            componentsProps={{
                                tooltip: {
                                    sx: {
                                        fontSize: ".8rem",
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
                    minWidth: isMobile ? "280px" : "300px",
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
                        borderBottom: `5px solid ${statusColor}`,
                        padding: isMobile
                            ? "15px 15px 10px 15px"
                            : "15px 20px 10px 20px",
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
                            direction={isMobile ? "column" : "row"}
                            sx={{
                                justifyContent: "space-between",
                                alignItems: isMobile ? "flex-start" : "center",
                            }}
                            spacing={isMobile ? 1 : 0}
                        >
                            <Typography variant="h5">
                                {equipment?.name}
                            </Typography>
                            {equipment?.image_url && equipmentImage && (
                                <ImageViewer
                                    src={equipmentImage}
                                    alt={`${equipment?.name} image`}
                                    style={{
                                        maxWidth: isMobile ? "100%" : "100px",
                                        maxHeight: isMobile ? "80px" : "60px",
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
                            {new Date(checkout.start_time).toLocaleDateString(
                                "en-US",
                                {
                                    weekday: "long",
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                },
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
                                {equipment?.location || "Equipment Location"}
                            </Typography>
                        </Stack>
                    </Stack>

                    {/* Equipment Information */}
                    {equipment && (
                        <Box sx={{ mt: 1, ml: 1 }}>
                            <Stack
                                direction="row"
                                spacing={1}
                                sx={{ flexWrap: "wrap", gap: 0.5 }}
                            >
                                {/* Status Chip */}
                                <Chip
                                    label={checkout.status?.toUpperCase()}
                                    size="small"
                                    sx={{
                                        height: 22,
                                        backgroundColor: statusColor,
                                        color: "white",
                                        "& .MuiChip-label": {
                                            fontSize: "0.7rem",
                                            fontWeight: "bold",
                                        },
                                    }}
                                />

                                {/* Serial Number */}
                                {equipment.serial_number && (
                                    <Chip
                                        icon={<CategoryIcon />}
                                        label={`SN: ${equipment.serial_number}`}
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
                                )}
                            </Stack>
                        </Box>
                    )}
                </Grid>
                <Grid
                    item
                    sx={{
                        width: "100%",
                        height: "100%",
                        padding: isMobile
                            ? "15px 15px 10px 15px"
                            : "15px 20px 10px 20px",
                    }}
                >
                    <Stack
                        direction={isMobile ? "column" : "row"}
                        sx={{ paddingLeft: "5px" }}
                        spacing={isMobile ? 1 : 3}
                    >
                        <Stack direction={"column"} spacing={1}>
                            <Typography
                                variant="body1"
                                color={theme.palette.primary.text.dark}
                            >
                                Reserved by:
                            </Typography>
                            {checkout.notes && (
                                <Typography
                                    variant="body1"
                                    color={theme.palette.primary.text.dark}
                                >
                                    notes:
                                </Typography>
                            )}
                            {checkout.repeats && (
                                <Typography
                                    variant="body1"
                                    color={theme.palette.primary.text.dark}
                                >
                                    Repeats:
                                </Typography>
                            )}
                            {checkout.approved_by_user_id && (
                                <Typography
                                    variant="body1"
                                    color={theme.palette.primary.text.dark}
                                >
                                    Approved By:
                                </Typography>
                            )}
                        </Stack>
                        <Stack direction={"column"} spacing={1}>
                            <Typography variant="body1">
                                {bookerInfo
                                    ? `${bookerInfo.first_name} ${bookerInfo.last_name}`
                                    : "Loading..."}
                            </Typography>
                            {checkout.notes && (
                                <Typography variant="body1">
                                    {checkout.notes}
                                </Typography>
                            )}
                            {checkout.repeats && (
                                <Typography variant="body1">
                                    {checkout.repeats}
                                </Typography>
                            )}
                            {checkout.approved_by_user_id && (
                                <Typography variant="body1">
                                    Approved
                                </Typography>
                            )}
                        </Stack>
                    </Stack>
                    {checkout.notes && <Divider sx={{ paddingTop: "5px" }} />}
                    {checkout?.notes != "" &&
                        checkout?.notes != null &&
                        checkout?.notes != undefined && (
                            <Stack
                                direction={"column"}
                                sx={{ paddingLeft: "5px" }}
                            >
                                <Typography
                                    variant="body1"
                                    color={theme.palette.primary.text.dark}
                                    sx={{ marginBottom: "-15px" }}
                                >
                                    Notes:
                                </Typography>
                                <Typography paddingTop={"10px"}>
                                    {checkout.notes}
                                </Typography>
                            </Stack>
                        )}
                </Grid>
                <Grid padding={"5px"}></Grid>
                <Stack
                    position={"relative"}
                    bottom={0}
                    direction={isMobile ? "column" : "row"}
                    width={"100%"}
                    sx={{
                        padding: "5px",
                        height: isMobile ? "auto" : "35px",
                        borderTop: "1px solid #dedede",
                    }}
                    spacing={1}
                >
                    {(user?.admin ||
                        user?.equipment_admin ||
                        user?.id === checkout.user_id) && (
                        <>
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
                                onClick={handleCancel}
                                startIcon={<DeleteOutlineIcon />}
                            >
                                Cancel
                            </Button>
                        </>
                    )}
                </Stack>
            </Grid>
        </Box>
    );
};

export default DisplayCheckout;
