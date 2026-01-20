import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
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
    useMediaQuery,
    useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useAuth } from "../../Utilites/AuthContext";
import { useSocket } from "../../Contexts/SocketContext";
import axios from "axios";
import DisplayCheckout from "../Components/DisplayCheckout/DisplayCheckout";
import { ArrowBack } from "@mui/icons-material";

const EquipmentCalendar = ({
    setLoading,
    selectedDate,
    setSelectedDate,
    loading,
}) => {
    const { equipmentId } = useParams();
    const [equipment, setEquipment] = useState(null);
    const [checkouts, setCheckouts] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [openCheckoutDialog, setOpenCheckoutDialog] = useState(false);
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [selectedCheckout, setSelectedCheckout] = useState(null);
    const [update, setUpdate] = useState(0);
    const [dateRange, setDateRange] = useState({ start: null, end: null });
    const [updateMode, setUpdateMode] = useState(null);
    const [formData, setFormData] = useState({
        purpose: "",
        project_number: "",
        isRecurring: false,
        recurrencePattern: "daily",
        recurrenceInterval: 1,
        recurrenceEndDate: "",
    });
    const [showOptionalFields, setShowOptionalFields] = useState(false);
    const [editFormData, setEditFormData] = useState({
        start_time: "",
        end_time: "",
        purpose: "",
        project_number: "",
        status: "",
    });
    const { user } = useAuth();
    const { socket } = useSocket();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

    useEffect(() => {
        fetchEquipment();
        // Don't fetch checkouts here - let datesSet callback handle it when calendar initializes
    }, [equipmentId, update]);

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
                }
            );

            const events = response.data
                .filter((c) => c.status !== "cancelled")
                .map((checkout) => ({
                    id: checkout.isRecurring ? checkout.id : checkout.id,
                    title: checkout.User
                        ? `${checkout.User.first_name} ${
                              checkout.User.last_name
                          }${checkout.isRecurring ? " ↻" : ""}`
                        : "Checkout",
                    start: checkout.start_time,
                    end: checkout.end_time,
                    backgroundColor: getStatusColor(checkout.status),
                    extendedProps: {
                        status: checkout.status,
                        purpose: checkout.purpose,
                        notes: checkout.notes,
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
            case "approved":
                return "#4caf50";
            case "pending":
                return "#ff9800";
            case "checked_out":
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
        setFormData({
            purpose: "",
            isRecurring: false,
            recurrencePattern: "daily",
            recurrenceInterval: 1,
            recurrenceEndDate: "",
        });
        setOpenDialog(true);
    };

    const handleEventClick = (clickInfo) => {
        const event = clickInfo.event;

        // Create checkout object from event data
        const checkout = {
            id: event.id,
            start_time: event.start,
            end_time: event.end,
            status: event.extendedProps.status,
            purpose: event.extendedProps.purpose,
            notes: event.extendedProps.notes,
            user_id: event.extendedProps.user_id,
            equipment_id: event.extendedProps.equipment_id,
            approved_by_user_id: event.extendedProps.approved_by_user_id,
            recurrence_id: event.extendedProps.recurrence_id,
            repeats: event.extendedProps.repeats,
        };

        setSelectedCheckout(checkout);
        setOpenCheckoutDialog(true);
    };

    const handleCancelCheckout = async (checkoutId) => {
        try {
            setLoading(true);
            const token = localStorage.getItem("authToken");
            await axios.put(
                `/api/checkouts/${checkoutId}`,
                { status: "cancelled" },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchCheckouts(dateRange.start, dateRange.end);
        } catch (error) {
            console.error("Error canceling checkout:", error);
            alert(
                "Error canceling checkout: " +
                    (error.response?.data?.message || error.message)
            );
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCheckout = async () => {
        if (!selectedSlot) return;

        try {
            setLoading(true);
            const token = localStorage.getItem("authToken");

            // Create checkout data (works for both single and recurring)
            const checkoutData = {
                equipment_id: parseInt(equipmentId),
                user_id: user.id,
                start_time: selectedSlot.start.toISOString(),
                end_time: selectedSlot.end.toISOString(),
                purpose: formData.purpose,
            };

            // Add recurrence fields if this is a recurring checkout
            if (formData.isRecurring) {
                checkoutData.recurrence_pattern = formData.recurrencePattern;
                checkoutData.separation_count = formData.recurrenceInterval;
                checkoutData.recurrence_end_date = formData.recurrenceEndDate
                    ? new Date(formData.recurrenceEndDate).toISOString()
                    : null;
            }

            await axios.post("/api/checkouts", checkoutData, {
                headers: { Authorization: `Bearer ${token}` },
            });

            fetchCheckouts(dateRange.start, dateRange.end);
            handleCloseDialog();
        } catch (error) {
            console.error("Error creating checkout:", error);
            alert(
                "Error creating checkout: " +
                    (error.response?.data?.message || error.message)
            );
        } finally {
            setLoading(false);
        }
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedSlot(null);
        setFormData({
            purpose: "",
            isRecurring: false,
            recurrencePattern: "daily",
            recurrenceInterval: 1,
            recurrenceEndDate: "",
        });
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
            purpose: selectedCheckout.purpose || "",
            project_number: selectedCheckout.project_number || "",
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
            purpose: "",
            project_number: "",
            status: "",
        });
        setUpdateMode(null);
    };

    const handleSaveEdit = async () => {
        if (!selectedCheckout) return;

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
            alert(
                "Please select how you want to update this recurring checkout"
            );
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem("authToken");

            const updateData = {
                start_time: new Date(editFormData.start_time).toISOString(),
                end_time: new Date(editFormData.end_time).toISOString(),
                purpose: editFormData.purpose,
                project_number: editFormData.project_number || null,
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
                                  selectedCheckout.start
                          );
                updateData.occurrence_start_time =
                    occurrenceStart.toISOString();
                console.log(
                    "Frontend - updateData before sending:",
                    updateData
                );
            }

            await axios.put(
                `/api/checkouts/${selectedCheckout.id}`,
                updateData,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            fetchCheckouts(dateRange.start, dateRange.end);
            handleCloseEditDialog();
            setSelectedCheckout(null);
            setUpdateMode(null);
        } catch (error) {
            console.error("Error updating checkout:", error);
            alert(
                "Error updating checkout: " +
                    (error.response?.data?.message || error.message)
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: isMobile ? 0 : 3 }}>
            <Typography variant="h4" sx={{ mb: 3, px: isMobile ? 2 : 0 }}>
                {equipment?.name || "Equipment"} Calendar
            </Typography>

            {equipment && (
                <Box sx={{ mb: 2, px: isMobile ? 2 : 0 }}>
                    <Typography variant="body2" color="text.secondary">
                        Location: {equipment.location || "N/A"} | Serial:{" "}
                        {equipment.serial_number || "N/A"} | Contact:{" "}
                        {equipment.contact_person || "N/A"}
                    </Typography>
                </Box>
            )}
            <Button
                variant="contained"
                startIcon={<ArrowBack />}
                sx={{
                    fontWeight: "bold",
                    ":hover": { backgroundColor: "primary.light" },
                    mx: isMobile ? 2 : 0,
                    mb: 2,
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
                }}
            >
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView={isMobile ? "timeGridDay" : "timeGridWeek"}
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
                    selectable={true}
                    selectMirror={true}
                    dayMaxEvents={true}
                    weekends={true}
                    events={checkouts}
                    select={handleDateSelect}
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

            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Create Checkout</DialogTitle>
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
                            value={
                                selectedSlot?.start
                                    ? new Date(
                                          selectedSlot.start.getTime() -
                                              selectedSlot.start.getTimezoneOffset() *
                                                  60000
                                      )
                                          .toISOString()
                                          .slice(0, 16)
                                    : ""
                            }
                            onChange={(e) => {
                                const newStart = new Date(e.target.value);
                                setSelectedSlot({
                                    ...selectedSlot,
                                    start: newStart,
                                });
                            }}
                            InputLabelProps={{
                                shrink: true,
                            }}
                            fullWidth
                        />
                        <TextField
                            label="End Time"
                            type="datetime-local"
                            value={
                                selectedSlot?.end
                                    ? new Date(
                                          selectedSlot.end.getTime() -
                                              selectedSlot.end.getTimezoneOffset() *
                                                  60000
                                      )
                                          .toISOString()
                                          .slice(0, 16)
                                    : ""
                            }
                            onChange={(e) => {
                                const newEnd = new Date(e.target.value);
                                setSelectedSlot({
                                    ...selectedSlot,
                                    end: newEnd,
                                });
                            }}
                            InputLabelProps={{
                                shrink: true,
                            }}
                            fullWidth
                        />
                        <TextField
                            label="Purpose"
                            value={formData.purpose}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    purpose: e.target.value,
                                })
                            }
                            multiline
                            rows={3}
                            fullWidth
                        />

                        {/* Optional Fields Toggle */}
                        <Button
                            size="small"
                            startIcon={
                                showOptionalFields ? (
                                    <RemoveIcon />
                                ) : (
                                    <AddIcon />
                                )
                            }
                            onClick={() =>
                                setShowOptionalFields(!showOptionalFields)
                            }
                        >
                            Optional Fields
                        </Button>

                        {showOptionalFields && (
                            <TextField
                                label="Project Number"
                                value={formData.project_number}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        project_number: e.target.value,
                                    })
                                }
                                fullWidth
                            />
                        )}

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={formData.isRecurring || false}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            isRecurring: e.target.checked,
                                        })
                                    }
                                />
                            }
                            label="Repeat Checkout"
                        />
                        {formData.isRecurring && (
                            <>
                                <FormControl fullWidth>
                                    <InputLabel>Repeat Pattern</InputLabel>
                                    <Select
                                        value={formData.recurrencePattern}
                                        label="Repeat Pattern"
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                recurrencePattern:
                                                    e.target.value,
                                            })
                                        }
                                    >
                                        <MenuItem value="daily">Daily</MenuItem>
                                        <MenuItem value="weekly">
                                            Weekly
                                        </MenuItem>
                                        <MenuItem value="monthly">
                                            Monthly
                                        </MenuItem>
                                    </Select>
                                </FormControl>
                                <TextField
                                    label="Repeat Every"
                                    type="number"
                                    value={formData.recurrenceInterval || 1}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            recurrenceInterval:
                                                parseInt(e.target.value) || 1,
                                        })
                                    }
                                    InputLabelProps={{
                                        shrink: true,
                                    }}
                                    inputProps={{ min: 1 }}
                                    helperText={`Repeat every ${
                                        formData.recurrenceInterval || 1
                                    } ${
                                        formData.recurrencePattern === "daily"
                                            ? "day(s)"
                                            : formData.recurrencePattern ===
                                              "weekly"
                                            ? "week(s)"
                                            : formData.recurrencePattern ===
                                              "monthly"
                                            ? "month(s)"
                                            : "day(s)"
                                    }`}
                                    fullWidth
                                />
                                <TextField
                                    label="End Date (Optional)"
                                    type="date"
                                    value={formData.recurrenceEndDate}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            recurrenceEndDate: e.target.value,
                                        })
                                    }
                                    InputLabelProps={{
                                        shrink: true,
                                    }}
                                    helperText="Leave empty for indefinite repeat"
                                    fullWidth
                                />
                            </>
                        )}
                        {equipment?.requires_approval && (
                            <Typography variant="caption" color="warning.main">
                                Note: This equipment requires approval before
                                checkout.
                            </Typography>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSaveCheckout} variant="contained">
                        Create Checkout
                    </Button>
                </DialogActions>
            </Dialog>

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
                <DialogTitle>Edit Checkout</DialogTitle>
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
                            label="Purpose"
                            value={editFormData.purpose}
                            onChange={(e) =>
                                setEditFormData({
                                    ...editFormData,
                                    purpose: e.target.value,
                                })
                            }
                            multiline
                            rows={3}
                            fullWidth
                        />
                        <TextField
                            label="Project Number (Optional)"
                            value={editFormData.project_number}
                            onChange={(e) =>
                                setEditFormData({
                                    ...editFormData,
                                    project_number: e.target.value,
                                })
                            }
                            fullWidth
                        />
                        {/* Only show status selector to admin users */}
                        {user?.admin && (
                            <FormControl fullWidth>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={editFormData.status || ""}
                                    label="Status"
                                    onChange={(e) =>
                                        setEditFormData({
                                            ...editFormData,
                                            status: e.target.value,
                                        })
                                    }
                                >
                                    <MenuItem value="pending">Pending</MenuItem>
                                    <MenuItem value="approved">
                                        Approved
                                    </MenuItem>
                                    <MenuItem value="checked_out">
                                        Checked Out
                                    </MenuItem>
                                    <MenuItem value="returned">
                                        Returned
                                    </MenuItem>
                                    <MenuItem value="cancelled">
                                        Cancelled
                                    </MenuItem>
                                </Select>
                            </FormControl>
                        )}

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
        </Box>
    );
};

export default EquipmentCalendar;
