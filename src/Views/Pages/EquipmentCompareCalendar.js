import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
    Box,
    Typography,
    Button,
    Chip,
    Card,
    CardContent,
    useMediaQuery,
    useTheme,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Checkbox,
    FormControlLabel,
    RadioGroup,
    Radio,
    FormLabel,
    Autocomplete,
} from "@mui/material";
import { ArrowBack, CalendarMonth, Add, Remove } from "@mui/icons-material";
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
import AlertDialog from "../../Components/AlertDialog";
import useAlertDialog from "../../hooks/useAlertDialog";

const EquipmentCompareCalendar = ({ setLoading, loading }) => {
    const { equipmentId1, equipmentId2 } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { socket } = useSocket();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const calendarRef = useRef(null);

    const [equipment1, setEquipment1] = useState(null);
    const [equipment2, setEquipment2] = useState(null);
    const [checkouts, setCheckouts] = useState([]);
    const [dateRange, setDateRange] = useState({ start: null, end: null });
    const [selectedCheckout, setSelectedCheckout] = useState(null);
    const [openCheckoutDialog, setOpenCheckoutDialog] = useState(false);
    const [users, setUsers] = useState([]);
    const { showAlert, alertState, hideAlert } = useAlertDialog();

    // Booking dialog states
    const [openBookingDialog, setOpenBookingDialog] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [bookingTarget, setBookingTarget] = useState("equipment1"); // 'equipment1', 'equipment2', 'both'
    const [showOptionalFields, setShowOptionalFields] = useState(false);
    const [formData, setFormData] = useState({
        notes: "",
        project_number: "",
        scheduled_on_behalf_of: "",
        isRecurring: false,
        recurrencePattern: "daily",
        recurrenceInterval: 1,
        recurrenceEndDate: "",
    });

    // Determine where to go back to - default to first equipment
    const fromEquipmentId = location.state?.fromEquipmentId || equipmentId1;

    useEffect(() => {
        fetchEquipment1();
        fetchEquipment2();
        fetchUsers();
    }, [equipmentId1, equipmentId2]);

    // Socket listener for real-time updates
    useEffect(() => {
        if (!socket?.connected) return;

        const handleMessage = (payload) => {
            const { message, data } = payload;

            switch (message) {
                case "checkout_created":
                case "checkout_updated":
                case "checkout_approved":
                case "checkout_declined":
                case "checkout_cancelled":
                    // Refetch if change affects either equipment
                    if (
                        data?.equipment_id === parseInt(equipmentId1) ||
                        data?.equipment_id === parseInt(equipmentId2) ||
                        data?.checkout?.equipment_id ===
                            parseInt(equipmentId1) ||
                        data?.checkout?.equipment_id === parseInt(equipmentId2)
                    ) {
                        if (dateRange.start && dateRange.end) {
                            fetchCheckouts(dateRange.start, dateRange.end);
                        }
                    }
                    break;
                case "equipment_updated":
                    // Refresh equipment details if it's one of these
                    if (data?.equipment?.id === parseInt(equipmentId1)) {
                        fetchEquipment1();
                    }
                    if (data?.equipment?.id === parseInt(equipmentId2)) {
                        fetchEquipment2();
                    }
                    break;
                default:
                    break;
            }
        };

        socket.on("message", handleMessage);
        return () => socket.off("message", handleMessage);
    }, [socket, equipmentId1, equipmentId2, dateRange]);

    const fetchEquipment1 = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.get(`/api/equipment/${equipmentId1}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setEquipment1(response.data);
        } catch (error) {
            console.error("Error fetching equipment 1:", error);
        }
    };

    const fetchEquipment2 = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.get(`/api/equipment/${equipmentId2}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setEquipment2(response.data);
        } catch (error) {
            console.error("Error fetching equipment 2:", error);
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

            // Fetch checkouts for both equipment
            const [response1, response2] = await Promise.all([
                axios.get(`/api/checkouts/equipment/${equipmentId1}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    params,
                }),
                axios.get(`/api/checkouts/equipment/${equipmentId2}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    params,
                }),
            ]);

            // Combine and color-code events
            const events1 = response1.data
                .filter((c) => c.status !== "cancelled")
                .map((checkout) => ({
                    id: `eq1-${checkout.id}`,
                    title: `${equipment1?.name || "Equipment 1"}: ${
                        checkout.scheduled_on_behalf_of ||
                        (checkout.User
                            ? `${checkout.User.first_name} ${checkout.User.last_name}`
                            : "Checkout")
                    }${checkout.isRecurring ? " ↻" : ""}`,
                    start: checkout.start_time,
                    end: checkout.end_time,
                    backgroundColor: "#667eea", // Purple for equipment 1
                    borderColor: "#667eea",
                    extendedProps: {
                        equipmentName: equipment1?.name || "Equipment 1",
                        equipmentId: equipmentId1,
                        status: checkout.status,
                        notes: checkout.notes,
                        scheduled_on_behalf_of: checkout.scheduled_on_behalf_of,
                        isRecurring: checkout.isRecurring || false,
                        userId: checkout.user_id,
                        checkoutData: checkout,
                    },
                }));

            const events2 = response2.data
                .filter((c) => c.status !== "cancelled")
                .map((checkout) => ({
                    id: `eq2-${checkout.id}`,
                    title: `${equipment2?.name || "Equipment 2"}: ${
                        checkout.scheduled_on_behalf_of ||
                        (checkout.User
                            ? `${checkout.User.first_name} ${checkout.User.last_name}`
                            : "Checkout")
                    }${checkout.isRecurring ? " ↻" : ""}`,
                    start: checkout.start_time,
                    end: checkout.end_time,
                    backgroundColor: "#f093fb", // Pink for equipment 2
                    borderColor: "#f093fb",
                    extendedProps: {
                        equipmentName: equipment2?.name || "Equipment 2",
                        equipmentId: equipmentId2,
                        status: checkout.status,
                        notes: checkout.notes,
                        scheduled_on_behalf_of: checkout.scheduled_on_behalf_of,
                        isRecurring: checkout.isRecurring || false,
                        userId: checkout.user_id,
                        checkoutData: checkout,
                    },
                }));

            setCheckouts([...events1, ...events2]);
        } catch (error) {
            console.error("Error fetching checkouts:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDatesSet = (arg) => {
        const start = arg.startStr;
        const end = arg.endStr;
        setDateRange({ start, end });
        fetchCheckouts(start, end);
    };

    const handleEventClick = (info) => {
        const checkout = info.event.extendedProps.checkoutData;
        setSelectedCheckout(checkout);
        setOpenCheckoutDialog(true);
    };

    const handleCloseCheckoutDialog = () => {
        setOpenCheckoutDialog(false);
        setSelectedCheckout(null);
    };

    const handleDateSelect = (selectInfo) => {
        setSelectedSlot({
            start: selectInfo.start,
            end: selectInfo.end,
        });
        setBookingTarget("equipment1"); // Default to first equipment
        setOpenBookingDialog(true);
    };

    const handleCloseBookingDialog = () => {
        setOpenBookingDialog(false);
        setSelectedSlot(null);
        setFormData({
            notes: "",
            project_number: "",
            scheduled_on_behalf_of: "",
            isRecurring: false,
            recurrencePattern: "daily",
            recurrenceInterval: 1,
            recurrenceEndDate: "",
        });
        setBookingTarget("equipment1");
        setShowOptionalFields(false);
    };

    const handleCreateCheckout = async () => {
        // Validate required fields
        if (!formData.project_number || formData.project_number.trim() === "") {
            showAlert("Project Number is required", "error");
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem("authToken");

            const equipmentIds = [];
            if (bookingTarget === "equipment1") {
                equipmentIds.push(equipmentId1);
            } else if (bookingTarget === "equipment2") {
                equipmentIds.push(equipmentId2);
            } else if (bookingTarget === "both") {
                equipmentIds.push(equipmentId1, equipmentId2);
            }

            // Create Reservation for each selected equipment
            const promises = equipmentIds.map((equipmentId) => {
                const checkoutData = {
                    user_id: user.id,
                    equipment_id: equipmentId,
                    start_time: selectedSlot.start.toISOString(),
                    end_time: selectedSlot.end.toISOString(),
                    notes: formData.notes || null,
                    project_number: formData.project_number || null,
                    scheduled_on_behalf_of:
                        formData.scheduled_on_behalf_of || null,
                };

                if (formData.isRecurring) {
                    checkoutData.recurrence_pattern =
                        formData.recurrencePattern;
                    checkoutData.separation_count = formData.recurrenceInterval;
                    checkoutData.recurrence_end_date =
                        formData.recurrenceEndDate
                            ? new Date(formData.recurrenceEndDate).toISOString()
                            : null;
                }

                return axios.post("/api/checkouts", checkoutData, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            });

            await Promise.all(promises);

            const equipmentNames = [];
            if (bookingTarget === "equipment1")
                equipmentNames.push(equipment1?.name);
            if (bookingTarget === "equipment2")
                equipmentNames.push(equipment2?.name);
            if (bookingTarget === "both")
                equipmentNames.push(equipment1?.name, equipment2?.name);

            showAlert(
                `Reservation${equipmentIds.length > 1 ? "s" : ""} created successfully for ${equipmentNames.join(" and ")}`,
                "success",
            );

            if (dateRange.start && dateRange.end) {
                fetchCheckouts(dateRange.start, dateRange.end);
            }
            handleCloseBookingDialog();
        } catch (error) {
            console.error("Error creating reservation:", error);
            showAlert(
                "Error creating reservation: " +
                    (error.response?.data?.message || error.message),
                "error",
            );
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        navigate(`/equipment/${fromEquipmentId}`);
    };

    return (
        <Box sx={{ p: isMobile ? 1 : 3 }}>
            {/* Header */}
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    mb: 3,
                    flexWrap: "wrap",
                }}
            >
                <Button
                    startIcon={<ArrowBack />}
                    onClick={handleBack}
                    variant="outlined"
                >
                    Back
                </Button>
                <CalendarMonth sx={{ fontSize: 32, color: "primary.main" }} />
                <Typography variant="h5" sx={{ flexGrow: 1 }}>
                    Compare Equipment Schedules
                </Typography>
            </Box>

            {/* Equipment Legend */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box
                        sx={{
                            display: "flex",
                            gap: 3,
                            flexWrap: "wrap",
                            alignItems: "center",
                        }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                            }}
                        >
                            <Box
                                sx={{
                                    width: 20,
                                    height: 20,
                                    backgroundColor: "#667eea",
                                    borderRadius: 1,
                                }}
                            />
                            <Typography variant="body2">
                                {equipment1?.name || "Loading..."}
                            </Typography>
                            <Chip
                                size="small"
                                label={equipment1?.status || ""}
                                sx={{ ml: 1 }}
                            />
                        </Box>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                            }}
                        >
                            <Box
                                sx={{
                                    width: 20,
                                    height: 20,
                                    backgroundColor: "#f093fb",
                                    borderRadius: 1,
                                }}
                            />
                            <Typography variant="body2">
                                {equipment2?.name || "Loading..."}
                            </Typography>
                            <Chip
                                size="small"
                                label={equipment2?.status || ""}
                                sx={{ ml: 1 }}
                            />
                        </Box>
                    </Box>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 1, display: "block" }}
                    >
                        View both equipment schedules on one calendar to find
                        overlapping availability
                    </Typography>
                </CardContent>
            </Card>

            {/* Calendar */}
            <Card>
                <CardContent>
                    <FullCalendar
                        ref={calendarRef}
                        plugins={[
                            dayGridPlugin,
                            timeGridPlugin,
                            interactionPlugin,
                        ]}
                        initialView={isMobile ? "timeGridDay" : "dayGridMonth"}
                        headerToolbar={{
                            left: "prev,next today",
                            center: "title",
                            right: isMobile
                                ? "timeGridDay"
                                : "dayGridMonth,timeGridWeek,timeGridDay",
                        }}
                        events={checkouts}
                        eventClick={handleEventClick}
                        select={handleDateSelect}
                        datesSet={handleDatesSet}
                        height="auto"
                        slotMinTime="06:00:00"
                        slotMaxTime="22:00:00"
                        allDaySlot={false}
                        nowIndicator={true}
                        eventOverlap={true}
                        selectOverlap={true}
                        editable={false}
                        selectable={true}
                        selectMirror={true}
                    />
                </CardContent>
            </Card>

            {/* Checkout Details Dialog */}
            {selectedCheckout && (
                <DisplayCheckout
                    open={openCheckoutDialog}
                    handleClose={handleCloseCheckoutDialog}
                    checkout={selectedCheckout}
                    user={user}
                    setUpdate={() => {
                        if (dateRange.start && dateRange.end) {
                            fetchCheckouts(dateRange.start, dateRange.end);
                        }
                    }}
                    fromCalendar={true}
                />
            )}

            {/* Booking Dialog */}
            <Dialog
                open={openBookingDialog}
                onClose={handleCloseBookingDialog}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Create Reservation</DialogTitle>
                <DialogContent>
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                            mt: 1,
                        }}
                    >
                        {/* Equipment Selection */}
                        <FormControl component="fieldset">
                            <FormLabel component="legend">
                                Which equipment do you want to reserve?
                            </FormLabel>
                            <RadioGroup
                                value={bookingTarget}
                                onChange={(e) =>
                                    setBookingTarget(e.target.value)
                                }
                            >
                                <FormControlLabel
                                    value="equipment1"
                                    control={<Radio />}
                                    label={
                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 1,
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 16,
                                                    height: 16,
                                                    backgroundColor: "#667eea",
                                                    borderRadius: 1,
                                                }}
                                            />
                                            {equipment1?.name || "Equipment 1"}
                                        </Box>
                                    }
                                />
                                <FormControlLabel
                                    value="equipment2"
                                    control={<Radio />}
                                    label={
                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 1,
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 16,
                                                    height: 16,
                                                    backgroundColor: "#f093fb",
                                                    borderRadius: 1,
                                                }}
                                            />
                                            {equipment2?.name || "Equipment 2"}
                                        </Box>
                                    }
                                />
                                <FormControlLabel
                                    value="both"
                                    control={<Radio />}
                                    label="Both Equipment"
                                />
                            </RadioGroup>
                        </FormControl>

                        {/* Time Selection */}
                        <TextField
                            label="Start Time"
                            type="datetime-local"
                            value={
                                selectedSlot?.start
                                    ? new Date(
                                          selectedSlot.start.getTime() -
                                              selectedSlot.start.getTimezoneOffset() *
                                                  60000,
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
                            InputLabelProps={{ shrink: true }}
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
                                                  60000,
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
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                        />

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
                            <>
                                <TextField
                                    label="Notes"
                                    value={formData.notes}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            notes: e.target.value,
                                        })
                                    }
                                    multiline
                                    rows={3}
                                    fullWidth
                                />
                                <Autocomplete
                                    options={users.filter(
                                        (u) => u.id !== user?.id,
                                    )}
                                    getOptionLabel={(option) =>
                                        typeof option === "string"
                                            ? option
                                            : `${option.first_name} ${option.last_name}`
                                    }
                                    value={
                                        users.find(
                                            (u) =>
                                                `${u.first_name} ${u.last_name}` ===
                                                formData.scheduled_on_behalf_of,
                                        ) || null
                                    }
                                    onChange={(event, newValue) => {
                                        setFormData({
                                            ...formData,
                                            scheduled_on_behalf_of: newValue
                                                ? `${newValue.first_name} ${newValue.last_name}`
                                                : "",
                                        });
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Scheduled On Behalf Of"
                                            placeholder="Enter name if scheduling for someone else"
                                            fullWidth
                                        />
                                    )}
                                    renderOption={(props, option) => (
                                        <li {...props} key={option.id}>
                                            {option.first_name}{" "}
                                            {option.last_name} ({option.email})
                                        </li>
                                    )}
                                    isOptionEqualToValue={(option, value) =>
                                        option.id === value?.id
                                    }
                                    fullWidth
                                />
                            </>
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
                            label="Repeat Reservation"
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
                                    value={formData.recurrenceInterval}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            recurrenceInterval: parseInt(
                                                e.target.value,
                                            ),
                                        })
                                    }
                                    InputProps={{ inputProps: { min: 1 } }}
                                    fullWidth
                                />
                                <TextField
                                    label="End Date"
                                    type="date"
                                    value={formData.recurrenceEndDate}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            recurrenceEndDate: e.target.value,
                                        })
                                    }
                                    InputLabelProps={{ shrink: true }}
                                    fullWidth
                                />
                            </>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseBookingDialog}>Cancel</Button>
                    <Button
                        onClick={handleCreateCheckout}
                        variant="contained"
                        disabled={!selectedSlot?.start || !selectedSlot?.end}
                    >
                        Create Reservation
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
        </Box>
    );
};

export default EquipmentCompareCalendar;
