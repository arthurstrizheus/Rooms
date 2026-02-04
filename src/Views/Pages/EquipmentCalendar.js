import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Warning, Check } from "@mui/icons-material";
import {
    Box,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Checkbox,
    FormControlLabel,
    Autocomplete,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import { Fab } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useAuth } from "../../Utilites/AuthContext";
import { useSocket } from "../../Contexts/SocketContext";
import axios from "axios";
import DisplayCheckout from "../Components/DisplayCheckout/DisplayCheckout";
import { ArrowBack } from "@mui/icons-material";
import AlertDialog from "../../Components/AlertDialog";
import useAlertDialog from "../../hooks/useAlertDialog";
import ReservationDialog from "./EquipmentDetails/Components/ReservationDialog";

const EquipmentCalendar = ({
    setLoading,
    selectedDate,
    setSelectedDate,
    loading,
}) => {
    const { equipmentId } = useParams();
    const [equipment, setEquipment] = useState(null);
    const [checkouts, setCheckouts] = useState([]);
    const [users, setUsers] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [openCheckoutDialog, setOpenCheckoutDialog] = useState(false);
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [selectedCheckout, setSelectedCheckout] = useState(null);
    const [update, setUpdate] = useState(0);
    const [dateRange, setDateRange] = useState({ start: null, end: null });
    const [updateMode, setUpdateMode] = useState(null);
    const { showAlert, alertState, hideAlert } = useAlertDialog();
    const [calibrationStatus, setCalibrationStatus] = useState(null);
    const [calibrationDueDate, setCalibrationDueDate] = useState(null);

    const [editFormData, setEditFormData] = useState({
        start_time: "",
        end_time: "",
        notes: "",
        project_number: "",
        scheduled_on_behalf_of: "",
        status: "",
    });
    const { user } = useAuth();
    const { socket } = useSocket();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const navigate = useNavigate();

    const calculateCalibrationDueDate = () => {
        if (
            !equipment?.last_calibration_date ||
            !equipment?.calibration_interval_value
        ) {
            return null;
        }
        const lastCal = new Date(equipment.last_calibration_date);
        const dueDate = new Date(lastCal);

        switch (equipment.calibration_interval_unit) {
            case "days":
                dueDate.setDate(
                    dueDate.getDate() + equipment.calibration_interval_value,
                );
                break;
            case "months":
                dueDate.setMonth(
                    dueDate.getMonth() + equipment.calibration_interval_value,
                );
                break;
            case "years":
                dueDate.setFullYear(
                    dueDate.getFullYear() +
                        equipment.calibration_interval_value,
                );
                break;
        }
        return dueDate;
    };

    const getCalibrationStatus = () => {
        const dueDate = calculateCalibrationDueDate();
        if (!dueDate) {
            return null;
        }

        const now = new Date();
        const twoMonthsFromNow = new Date();
        twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);

        if (now > dueDate) {
            return {
                status: "Out of Calibration",
                color: "#d32f2f",
                backgroundColor: "#ffebee",
            };
        } else if (dueDate <= twoMonthsFromNow) {
            return {
                status: "Calibration Due Soon",
                color: "#ed6c02",
                backgroundColor: "#fff3e0",
            };
        } else if (dueDate >= twoMonthsFromNow) {
            return {
                status: "Calibrated",
                color: "#2e7d32",
                backgroundColor: "#e8f5e9",
            };
        }
        return null;
    };

    useEffect(() => {
        fetchEquipment();
        fetchUsers();
        // Don't fetch checkouts here - let datesSet callback handle it when calendar initializes
    }, [equipmentId, update]);

    // Redirect if equipment cannot be booked
    useEffect(() => {
        if (equipment && equipment.can_book === false) {
            navigate(`/equipment/${equipmentId}`);
        }
        setCalibrationStatus(getCalibrationStatus());
        setCalibrationDueDate(calculateCalibrationDueDate());
    }, [equipment, equipmentId, navigate]);

    // Socket listener for real-time updates
    useEffect(() => {
        if (!socket?.connected) return;

        const handleMessage = (payload) => {
            const { message, data } = payload;

            switch (message) {
                case "checkout_created":
                case "checkout_updated":
                case "checkout_approved":
                    // Refetch checkouts if they belong to this equipment
                    if (
                        data?.equipment_id === parseInt(equipmentId) ||
                        data?.checkout?.equipment_id === parseInt(equipmentId)
                    ) {
                        if (dateRange.start && dateRange.end) {
                            fetchCheckouts(dateRange.start, dateRange.end);
                        }
                    }
                    break;
                case "equipment_updated":
                    // Refresh equipment details if it's this equipment
                    if (data?.equipment?.id === parseInt(equipmentId)) {
                        fetchEquipment();
                    }
                    break;
                default:
                    break;
            }
        };

        socket.on("message", handleMessage);
        return () => socket.off("message", handleMessage);
    }, [socket, equipmentId, dateRange]);

    const fetchEquipment = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.get(`/api/equipment/${equipmentId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setEquipment(response.data);
        } catch (error) {
            console.error("Error fetching equipment:", error);
        }
    };

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.get("/api/users", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUsers(response.data);
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    const fetchCheckouts = async (start = null, end = null) => {
        try {
            setLoading(true);
            const token = localStorage.getItem("authToken");

            // Build query params
            const params = {};
            if (start) params.start = start;
            if (end) params.end = end;

            const response = await axios.get(
                `/api/checkouts/equipment/${equipmentId}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    params,
                },
            );

            const events = response.data
                .filter((c) => c.status !== "cancelled")
                .map((checkout) => ({
                    id: checkout.isRecurring ? checkout.id : checkout.id,
                    title: checkout.scheduled_on_behalf_of
                        ? `${checkout.scheduled_on_behalf_of}${checkout.isRecurring ? " ↻" : ""}`
                        : checkout.User
                          ? `${checkout.User.first_name} ${
                                checkout.User.last_name
                            }${checkout.isRecurring ? " ↻" : ""}`
                          : "Checkout",
                    start: checkout.start_time,
                    end: checkout.end_time,
                    backgroundColor: getStatusColor(checkout.status),
                    extendedProps: {
                        status: checkout.status,
                        notes: checkout.notes,
                        project_number: checkout.project_number,
                        scheduled_on_behalf_of: checkout.scheduled_on_behalf_of,
                        isRecurring: checkout.isRecurring || false,
                        recurrence_id: checkout.recurrence_id || null,
                        userId: checkout.user_id,
                        user_id: checkout.user_id,
                        equipment_id: checkout.equipment_id,
                        approved_by_user_id: checkout.approved_by_user_id,
                        recurrence_id: checkout.recurrence_id,
                        repeats: checkout.repeats,
                        checkoutData: checkout,
                    },
                }));

            setCheckouts(events);
        } catch (error) {
            console.error("Error fetching checkouts:", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "auto-approved":
                return "#4caf50";
            case "pending":
                return "#ff9800";
            case "reserved":
                return "#2196f3";
            case "returned":
                return "#9e9e9e";
            default:
                return "#757575";
        }
    };

    const handleDateSelect = (selectInfo) => {
        setSelectedSlot({
            start: selectInfo.start,
            end: selectInfo.end,
        });
        setOpenDialog(true);
    };

    const handleEventClick = (clickInfo) => {
        const event = clickInfo.event;

        // Use the full checkoutData from extendedProps which includes audit fields
        const checkout = event.extendedProps.checkoutData || {
            id: event.id,
            start_time: event.start,
            end_time: event.end,
            status: event.extendedProps.status,
            notes: event.extendedProps.notes,
            project_number: event.extendedProps.project_number,
            user_id: event.extendedProps.user_id,
            equipment_id: event.extendedProps.equipment_id,
            approved_by_user_id: event.extendedProps.approved_by_user_id,
            recurrence_id: event.extendedProps.recurrence_id,
            repeats: event.extendedProps.repeats,
        };

        setSelectedCheckout(checkout);
        setOpenCheckoutDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedSlot(null);
    };

    const handleCloseCheckoutDialog = () => {
        setOpenCheckoutDialog(false);
        setSelectedCheckout(null);
    };

    const handleUpdateEvent = () => {
        if (!selectedCheckout) return;

        // Handle both Date objects and ISO strings for start/end times
        const startTime = selectedCheckout.start_time || selectedCheckout.start;
        const endTime = selectedCheckout.end_time || selectedCheckout.end;

        // Convert to local datetime string for datetime-local input
        const formatLocalDateTime = (dateValue) => {
            const date = new Date(dateValue);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            const hours = String(date.getHours()).padStart(2, "0");
            const minutes = String(date.getMinutes()).padStart(2, "0");
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        // Populate edit form with current checkout data
        setEditFormData({
            start_time: formatLocalDateTime(startTime),
            end_time: formatLocalDateTime(endTime),
            notes: selectedCheckout.notes || "",
            project_number: selectedCheckout.project_number || "",
            scheduled_on_behalf_of:
                selectedCheckout.scheduled_on_behalf_of || "",
            status: selectedCheckout.status,
        });

        // Close the view dialog and open edit dialog
        setOpenCheckoutDialog(false);
        setOpenEditDialog(true);
    };

    const handleCloseEditDialog = () => {
        setOpenEditDialog(false);
        setEditFormData({
            start_time: "",
            end_time: "",
            notes: "",
            project_number: "",
            scheduled_on_behalf_of: "",
            status: "",
        });
        setUpdateMode(null);
    };

    const handleSaveEdit = async () => {
        if (!selectedCheckout) return;

        // Validate required fields
        if (
            !editFormData.project_number ||
            editFormData.project_number.trim() === ""
        ) {
            showAlert("Project Number is required", "error");
            return;
        }

        // Check if this is a recurring checkout - either by the isRecurring flag or by virtual ID
        const isVirtualOccurrence =
            typeof selectedCheckout.id === "string" &&
            selectedCheckout.id.includes("_");
        const isRecurring =
            selectedCheckout.extendedProps?.isRecurring ||
            selectedCheckout.isRecurring ||
            isVirtualOccurrence;

        // If recurring and no mode selected, prompt user
        if (isRecurring && !updateMode) {
            showAlert(
                "Please select how you want to update this recurring checkout",
                "warning",
            );
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem("authToken");

            const updateData = {
                start_time: new Date(editFormData.start_time).toISOString(),
                end_time: new Date(editFormData.end_time).toISOString(),
                notes: editFormData.notes,
                project_number: editFormData.project_number || null,
                scheduled_on_behalf_of:
                    editFormData.scheduled_on_behalf_of || null,
            };

            // Only admins can change status
            if (user.admin && editFormData.status) {
                updateData.status = editFormData.status;
            }

            // Add updateMode and occurrence_start_time for recurring checkouts
            if (isRecurring) {
                console.log("Frontend - Adding updateMode:", updateMode);
                updateData.updateMode = updateMode;
                // Use the event's start time (which is the occurrence date)
                const occurrenceStart =
                    selectedCheckout.start instanceof Date
                        ? selectedCheckout.start
                        : new Date(
                              selectedCheckout.start_time ||
                                  selectedCheckout.start,
                          );
                updateData.occurrence_start_time =
                    occurrenceStart.toISOString();
                console.log(
                    "Frontend - updateData before sending:",
                    updateData,
                );
            }

            await axios.put(
                `/api/checkouts/${selectedCheckout.id}`,
                updateData,
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );

            fetchCheckouts(dateRange.start, dateRange.end);
            handleCloseEditDialog();
            setSelectedCheckout(null);
            setUpdateMode(null);
        } catch (error) {
            console.error("Error updating reservation:", error);
            showAlert(
                "Error updating reservation: " +
                    (error.response?.data?.message || error.message),
                "error",
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: isMobile ? 0 : 3 }}>
            <Typography variant="h4" sx={{ mb: 1, px: isMobile ? 2 : 0 }}>
                {equipment?.name || "Equipment"} Calendar
            </Typography>

            {equipment && !isMobile ? (
                <Box
                    sx={{
                        mb: 1,
                        px: isMobile ? 2 : 0,
                        display: "flex",
                        flexDirection: "row",
                        gap: 1,
                    }}
                >
                    <Typography variant="body2" color="text.secondary">
                        <Box component="span" sx={{ fontWeight: 600 }}>
                            Location:
                        </Box>{" "}
                        {equipment?.location || ""}
                        {equipment?.contact_person && (
                            <>
                                {" | "}
                                <Box component="span" sx={{ fontWeight: 600 }}>
                                    Contact:
                                </Box>{" "}
                                {equipment?.contact_person}
                            </>
                        )}
                        {equipment?.serial_number && (
                            <>
                                {" | "}
                                <Box component="span" sx={{ fontWeight: 600 }}>
                                    Serial:
                                </Box>{" "}
                                {equipment?.serial_number}
                            </>
                        )}
                        {equipment?.asset_number && (
                            <>
                                {" | "}
                                <Box component="span" sx={{ fontWeight: 600 }}>
                                    Asset Number:
                                </Box>{" "}
                                {equipment?.asset_number}
                            </>
                        )}
                    </Typography>

                    {calibrationStatus && (
                        <Box
                            sx={{
                                px: 0.75,
                                py: 0.25,
                                borderRadius: 1,
                                backgroundColor:
                                    calibrationStatus.backgroundColor,
                                border: `1px solid ${calibrationStatus.color}`,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 0.5,
                                lineHeight: 1, // keeps it tight
                                whiteSpace: "nowrap", // optional: keep badge on one line
                            }}
                        >
                            {calibrationStatus.status === "Calibrated" ? (
                                <Check
                                    sx={{
                                        color: calibrationStatus.color,
                                        fontSize: "1em", // match Typography font size
                                        verticalAlign: "middle",
                                    }}
                                />
                            ) : (
                                <Warning
                                    sx={{
                                        color: calibrationStatus.color,
                                        fontSize: "1em", // match Typography font size
                                        verticalAlign: "middle",
                                    }}
                                />
                            )}

                            <Typography
                                variant="body2"
                                sx={{
                                    color: calibrationStatus.color,
                                    fontWeight: 600,
                                    lineHeight: 1, // match badge tightness
                                }}
                            >
                                {calibrationStatus.status}
                                {calibrationDueDate &&
                                    calibrationStatus.status !=
                                        "Calibrated" && (
                                        <>
                                            {" - Due: "}
                                            {calibrationDueDate.toLocaleDateString()}
                                        </>
                                    )}
                            </Typography>
                        </Box>
                    )}
                </Box>
            ) : (
                <Box
                    sx={{
                        mb: 1,
                        px: isMobile ? 2 : 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.5,
                    }}
                >
                    {!!equipment?.location && (
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "row",
                                gap: 0.75,
                            }}
                        >
                            <Typography
                                variant="body2"
                                sx={{ fontWeight: 600 }}
                                color="text.secondary"
                            >
                                Location:
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {equipment?.location}
                            </Typography>
                        </Box>
                    )}

                    {!!equipment?.contact_person && (
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "row",
                                gap: 0.75,
                            }}
                        >
                            <Typography
                                variant="body2"
                                sx={{ fontWeight: 600 }}
                                color="text.secondary"
                            >
                                Contact:
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {equipment?.contact_person}
                            </Typography>
                        </Box>
                    )}

                    {!!equipment?.serial_number && (
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "row",
                                gap: 0.75,
                            }}
                        >
                            <Typography
                                variant="body2"
                                sx={{ fontWeight: 600 }}
                                color="text.secondary"
                            >
                                Serial:
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {equipment?.serial_number}
                            </Typography>
                        </Box>
                    )}

                    {!!equipment?.asset_number && (
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "row",
                                gap: 0.75,
                            }}
                        >
                            <Typography
                                variant="body2"
                                sx={{ fontWeight: 600 }}
                                color="text.secondary"
                            >
                                Asset Number:
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {equipment?.asset_number}
                            </Typography>
                        </Box>
                    )}

                    {calibrationStatus && (
                        <Box
                            sx={{
                                px: 0.75,
                                py: 0.25,
                                borderRadius: 1,
                                backgroundColor:
                                    calibrationStatus.backgroundColor,
                                border: `1px solid ${calibrationStatus.color}`,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 0.5,
                                lineHeight: 1, // keeps it tight
                                whiteSpace: "nowrap", // optional: keep badge on one line
                            }}
                        >
                            {calibrationStatus.status === "Calibrated" ? (
                                <Check
                                    sx={{
                                        color: calibrationStatus.color,
                                        fontSize: "1em", // match Typography font size
                                        verticalAlign: "middle",
                                    }}
                                />
                            ) : (
                                <Warning
                                    sx={{
                                        color: calibrationStatus.color,
                                        fontSize: "1em", // match Typography font size
                                        verticalAlign: "middle",
                                    }}
                                />
                            )}

                            <Typography
                                variant="body2"
                                sx={{
                                    color: calibrationStatus.color,
                                    fontWeight: 600,
                                    lineHeight: 1, // match badge tightness
                                }}
                            >
                                {calibrationStatus.status}
                                {calibrationDueDate &&
                                    calibrationStatus.status !=
                                        "Calibrated" && (
                                        <>
                                            {" - Due: "}
                                            {calibrationDueDate.toLocaleDateString()}
                                        </>
                                    )}
                            </Typography>
                        </Box>
                    )}
                </Box>
            )}
            <Button
                variant="contained"
                size="small"
                startIcon={<ArrowBack />}
                sx={{
                    fontWeight: "bold",
                    ":hover": {
                        backgroundColor: "primary.light",
                        color: "black",
                    },
                    mx: isMobile ? 2 : 0,
                    mb: 1,
                }}
                href={`/equipment/${equipmentId}`}
            >
                Back
            </Button>

            <Box
                sx={{
                    backgroundColor: "white",
                    p: isMobile ? 0 : 2,
                    borderRadius: isMobile ? 0 : 1,
                    mt: -1,
                }}
            >
                <FullCalendar
                    key={checkouts.length} // Force re-render when checkouts change
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView={isMobile ? "timeGridWeek" : "dayGridMonth"}
                    headerToolbar={
                        isMobile
                            ? {
                                  left: "prev,next",
                                  center: "title",
                                  right: "today",
                              }
                            : {
                                  left: "prev,next today",
                                  center: "title",
                                  right: "dayGridMonth,timeGridWeek,timeGridDay",
                              }
                    }
                    editable={false}
                    selectable={!isMobile}
                    selectMirror={true}
                    dayMaxEvents={true}
                    weekends={true}
                    events={checkouts}
                    select={isMobile ? undefined : handleDateSelect}
                    eventClick={handleEventClick}
                    datesSet={(dateInfo) => {
                        const start = dateInfo.start.toISOString();
                        const end = dateInfo.end.toISOString();
                        setDateRange({ start, end });
                        fetchCheckouts(start, end);
                    }}
                    height="auto"
                    slotMinTime="06:00:00"
                    slotMaxTime="20:00:00"
                    eventMinHeight={isMobile ? 40 : 20}
                    slotEventOverlap={false}
                    allDaySlot={false}
                    titleFormat={
                        isMobile
                            ? { month: "short", day: "numeric" }
                            : undefined
                    }
                    dayHeaderFormat={
                        isMobile
                            ? { weekday: "short", day: "numeric" }
                            : undefined
                    }
                />
            </Box>

            {/* Create Reservation Dialog */}
            <ReservationDialog
                open={openDialog}
                onClose={handleCloseDialog}
                equipmentId={equipmentId}
                equipmentName={equipment?.name}
                equipment={equipment}
                users={users}
                currentUserId={user?.id}
                selectedSlot={selectedSlot}
                onSuccess={() => {
                    fetchCheckouts(dateRange.start, dateRange.end);
                }}
                setLoading={setLoading}
                showAlert={showAlert}
            />

            {/* Checkout Details Dialog */}
            <Dialog
                open={openCheckoutDialog}
                onClose={handleCloseCheckoutDialog}
                maxWidth="sm"
                fullWidth
            >
                {selectedCheckout && equipment && (
                    <DisplayCheckout
                        checkout={selectedCheckout}
                        equipment={equipment}
                        handleExit={handleCloseCheckoutDialog}
                        setUpdate={setUpdate}
                        setUpdateMode={setUpdateMode}
                        handleUpdateEvent={handleUpdateEvent}
                    />
                )}
            </Dialog>

            {/* Edit Checkout Dialog */}
            <Dialog
                open={openEditDialog}
                onClose={handleCloseEditDialog}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Edit Reservation</DialogTitle>
                <DialogContent>
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                            mt: 1,
                        }}
                    >
                        <TextField
                            label="Start Time"
                            type="datetime-local"
                            value={editFormData.start_time}
                            onChange={(e) =>
                                setEditFormData({
                                    ...editFormData,
                                    start_time: e.target.value,
                                })
                            }
                            InputLabelProps={{
                                shrink: true,
                            }}
                            fullWidth
                        />
                        <TextField
                            label="End Time"
                            type="datetime-local"
                            value={editFormData.end_time}
                            onChange={(e) =>
                                setEditFormData({
                                    ...editFormData,
                                    end_time: e.target.value,
                                })
                            }
                            InputLabelProps={{
                                shrink: true,
                            }}
                            fullWidth
                        />
                        <TextField
                            label="Project Number"
                            value={editFormData.project_number}
                            onChange={(e) =>
                                setEditFormData({
                                    ...editFormData,
                                    project_number: e.target.value,
                                })
                            }
                            required
                            fullWidth
                        />
                        <TextField
                            label="Notes"
                            value={editFormData.notes}
                            onChange={(e) =>
                                setEditFormData({
                                    ...editFormData,
                                    notes: e.target.value,
                                })
                            }
                            multiline
                            rows={3}
                            fullWidth
                        />
                        <Autocomplete
                            options={users.filter((u) => u.id !== user?.id)}
                            getOptionLabel={(option) =>
                                typeof option === "string"
                                    ? option
                                    : `${option.first_name} ${option.last_name}`
                            }
                            value={
                                users.find(
                                    (u) =>
                                        `${u.first_name} ${u.last_name}` ===
                                        editFormData.scheduled_on_behalf_of,
                                ) ||
                                editFormData.scheduled_on_behalf_of ||
                                null
                            }
                            onChange={(event, newValue) => {
                                setEditFormData({
                                    ...editFormData,
                                    scheduled_on_behalf_of: newValue
                                        ? typeof newValue === "string"
                                            ? newValue
                                            : `${newValue.first_name} ${newValue.last_name}`
                                        : "",
                                });
                            }}
                            freeSolo
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Scheduled On Behalf Of"
                                    placeholder="Select or type a name"
                                />
                            )}
                            renderOption={(props, option) => (
                                <li {...props} key={option.id}>
                                    {option.first_name} {option.last_name} (
                                    {option.email})
                                </li>
                            )}
                            isOptionEqualToValue={(option, value) =>
                                option.id === value?.id
                            }
                            ListboxProps={{
                                style: { maxHeight: "250px" },
                            }}
                            fullWidth
                        />

                        {/* Show update mode selector for recurring checkouts */}
                        {selectedCheckout?.extendedProps?.isRecurring && (
                            <FormControl fullWidth>
                                <InputLabel>Update Mode</InputLabel>
                                <Select
                                    value={updateMode || ""}
                                    label="Update Mode"
                                    onChange={(e) =>
                                        setUpdateMode(e.target.value)
                                    }
                                >
                                    <MenuItem value="this">
                                        This occurrence only
                                    </MenuItem>
                                    <MenuItem value="following">
                                        This and following occurrences
                                    </MenuItem>
                                    <MenuItem value="all">
                                        All occurrences
                                    </MenuItem>
                                </Select>
                            </FormControl>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseEditDialog}>Cancel</Button>
                    <Button onClick={handleSaveEdit} variant="contained">
                        Save Changes
                    </Button>
                </DialogActions>
            </Dialog>
            <AlertDialog
                open={alertState.open}
                onClose={hideAlert}
                message={alertState.message}
                title={alertState.title}
                severity={alertState.severity}
                confirmText={alertState.confirmText}
            />
            {/* Floating Action Button for mobile users */}
            {isMobile && (
                <Fab
                    color="primary"
                    aria-label="add reservation"
                    onClick={() => setOpenDialog(true)}
                    sx={{
                        position: "fixed",
                        bottom: 16,
                        right: 16,
                        zIndex: 1000,
                    }}
                >
                    <AddIcon />
                </Fab>
            )}
        </Box>
    );
};

export default EquipmentCalendar;
