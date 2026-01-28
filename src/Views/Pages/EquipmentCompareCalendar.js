import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
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
    FormLabel,
    Autocomplete,
} from "@mui/material";
import { ArrowBack, CalendarMonth } from "@mui/icons-material";
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

// Color palette for multiple equipment
const COLOR_PALETTE = [
    "#667eea", // Purple
    "#f093fb", // Pink
    "#4facfe", // Blue
    "#43e97b", // Green
    "#fa709a", // Rose
    "#fee140", // Yellow
    "#30cfd0", // Cyan
    "#a8edea", // Mint
    "#ff9a56", // Orange
    "#b490ca", // Lavender
    "#f5576c", // Red
    "#4fd1c5", // Teal
];

const EquipmentCompareCalendar = ({ setLoading, loading }) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { socket } = useSocket();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const calendarRef = useRef(null);

    // Parse equipment IDs from query params
    const equipmentIds =
        searchParams
            .get("ids")
            ?.split(",")
            .map((id) => parseInt(id))
            .filter((id) => !isNaN(id)) || [];

    const [equipmentList, setEquipmentList] = useState([]);
    const [checkouts, setCheckouts] = useState([]);
    const [dateRange, setDateRange] = useState({ start: null, end: null });
    const [selectedCheckout, setSelectedCheckout] = useState(null);
    const [openCheckoutDialog, setOpenCheckoutDialog] = useState(false);
    const [users, setUsers] = useState([]);
    const { showAlert, alertState, hideAlert } = useAlertDialog();

    // Booking dialog states
    const [openBookingDialog, setOpenBookingDialog] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [selectedBookingEquipment, setSelectedBookingEquipment] = useState(
        [],
    );
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
    const fromEquipmentId = location.state?.fromEquipmentId || equipmentIds[0];

    useEffect(() => {
        if (equipmentIds.length === 0) {
            showAlert("No equipment selected for comparison", "error");
            navigate("/equipment");
            return;
        }
        fetchAllEquipment();
        fetchUsers();
    }, [searchParams]);

    // Refetch checkouts when equipment list changes
    useEffect(() => {
        if (equipmentList.length > 0 && dateRange.start && dateRange.end) {
            fetchCheckouts(dateRange.start, dateRange.end);
        }
    }, [equipmentList]);

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
                    // Refetch if change affects any equipment in our list
                    if (
                        equipmentIds.includes(data?.equipment_id) ||
                        equipmentIds.includes(data?.checkout?.equipment_id)
                    ) {
                        if (dateRange.start && dateRange.end) {
                            fetchCheckouts(dateRange.start, dateRange.end);
                        }
                    }
                    break;
                case "equipment_updated":
                    // Refresh equipment details if it's one of ours
                    if (equipmentIds.includes(data?.equipment?.id)) {
                        fetchAllEquipment();
                    }
                    break;
                default:
                    break;
            }
        };

        socket.on("message", handleMessage);
        return () => socket.off("message", handleMessage);
    }, [socket, equipmentIds, dateRange]);

    const fetchAllEquipment = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const promises = equipmentIds.map((id) =>
                axios.get(`/api/equipment/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            );
            const responses = await Promise.all(promises);
            // Filter out equipment where can_book is false
            const validEquipment = responses
                .map((r) => r.data)
                .filter((eq) => eq.can_book !== false);

            // If any equipment was filtered out, update the URL
            if (validEquipment.length !== responses.length) {
                const validIds = validEquipment.map((e) => e.id).join(",");
                navigate(`/equipment/compare?ids=${validIds}`, {
                    replace: true,
                    state: location.state,
                });
            }

            setEquipmentList(validEquipment);
        } catch (error) {
            console.error("Error fetching equipment:", error);
            showAlert("Error loading equipment details", "error");
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

            // Fetch checkouts for all equipment
            const promises = equipmentIds.map((id) =>
                axios.get(`/api/checkouts/equipment/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    params,
                }),
            );

            const responses = await Promise.all(promises);

            // Combine and color-code events
            const allEvents = responses.flatMap((response, index) => {
                const equipmentId = equipmentIds[index];
                const equipment = equipmentList[index];
                const color = COLOR_PALETTE[index % COLOR_PALETTE.length];

                return response.data
                    .filter((c) => c.status !== "cancelled")
                    .map((checkout) => ({
                        id: `eq${equipmentId}-${checkout.id}`,
                        title: `${equipment?.name || `Equipment ${index + 1}`}: ${
                            checkout.scheduled_on_behalf_of ||
                            (checkout.User
                                ? `${checkout.User.first_name} ${checkout.User.last_name}`
                                : "Checkout")
                        }${checkout.isRecurring ? " ↻" : ""}`,
                        start: checkout.start_time,
                        end: checkout.end_time,
                        backgroundColor: color,
                        borderColor: color,
                        extendedProps: {
                            equipmentName:
                                equipment?.name || `Equipment ${index + 1}`,
                            equipmentId: equipmentId,
                            status: checkout.status,
                            notes: checkout.notes,
                            project_number: checkout.project_number,
                            scheduled_on_behalf_of:
                                checkout.scheduled_on_behalf_of,
                            isRecurring: checkout.isRecurring || false,
                            userId: checkout.user_id,
                            checkoutData: checkout,
                        },
                    }));
            });

            setCheckouts(allEvents);
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
        setSelectedBookingEquipment([]); // Reset selection
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
        setSelectedBookingEquipment([]);
        setShowOptionalFields(false);
    };

    const handleCreateCheckout = async () => {
        // Validate required fields
        if (!formData.project_number || formData.project_number.trim() === "") {
            showAlert("Project Number is required", "error");
            return;
        }

        if (selectedBookingEquipment.length === 0) {
            showAlert(
                "Please select at least one equipment to reserve",
                "error",
            );
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem("authToken");

            // Create Reservation for each selected equipment
            const promises = selectedBookingEquipment.map((equipmentId) => {
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

            const equipmentNames = selectedBookingEquipment.map((id) => {
                const eq = equipmentList.find((e) => e.id === id);
                return eq?.name || `Equipment ${id}`;
            });

            showAlert(
                `Reservation${selectedBookingEquipment.length > 1 ? "s" : ""} created successfully for ${equipmentNames.join(", ")}`,
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
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        Comparing {equipmentList.length} Equipment
                    </Typography>
                    <Box
                        sx={{
                            display: "flex",
                            gap: 1.5,
                            flexWrap: "wrap",
                            alignItems: "center",
                        }}
                    >
                        {equipmentList.map((equipment, index) => (
                            <Chip
                                key={equipment.id}
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
                                                backgroundColor:
                                                    COLOR_PALETTE[
                                                        index %
                                                            COLOR_PALETTE.length
                                                    ],
                                                borderRadius: 1,
                                            }}
                                        />
                                        <Typography variant="body2">
                                            {equipment?.name || "Loading..."}
                                        </Typography>
                                    </Box>
                                }
                                onDelete={
                                    equipmentList.length > 1
                                        ? () => {
                                              const newIds = equipmentIds
                                                  .filter(
                                                      (id) =>
                                                          id !== equipment.id,
                                                  )
                                                  .join(",");
                                              if (newIds) {
                                                  navigate(
                                                      `/equipment/compare?ids=${newIds}`,
                                                      {
                                                          replace: true,
                                                          state: location.state,
                                                      },
                                                  );
                                              } else {
                                                  // If no equipment left, go back
                                                  navigate(
                                                      `/equipment/${fromEquipmentId}`,
                                                  );
                                              }
                                          }
                                        : undefined
                                }
                                sx={{
                                    pl: 1,
                                    pr: equipmentList.length > 1 ? 1 : 2,
                                    py: 2,
                                }}
                            />
                        ))}
                    </Box>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 2, display: "block" }}
                    >
                        View all equipment schedules on one calendar to find
                        overlapping availability. Click the X to remove
                        equipment from comparison.
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
                            <Box
                                sx={{
                                    mt: 1,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 1,
                                }}
                            >
                                {equipmentList.map((equipment, index) => (
                                    <FormControlLabel
                                        key={equipment.id}
                                        control={
                                            <Checkbox
                                                checked={selectedBookingEquipment.includes(
                                                    equipment.id,
                                                )}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedBookingEquipment(
                                                            [
                                                                ...selectedBookingEquipment,
                                                                equipment.id,
                                                            ],
                                                        );
                                                    } else {
                                                        setSelectedBookingEquipment(
                                                            selectedBookingEquipment.filter(
                                                                (id) =>
                                                                    id !==
                                                                    equipment.id,
                                                            ),
                                                        );
                                                    }
                                                }}
                                            />
                                        }
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
                                                        backgroundColor:
                                                            COLOR_PALETTE[
                                                                index %
                                                                    COLOR_PALETTE.length
                                                            ],
                                                        borderRadius: 1,
                                                    }}
                                                />
                                                {equipment?.name}
                                            </Box>
                                        }
                                    />
                                ))}
                            </Box>
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
                        disabled={
                            !selectedSlot?.start ||
                            !selectedSlot?.end ||
                            selectedBookingEquipment.length === 0
                        }
                        sx={{
                            backgroundColor: "lightgreen",
                            color: "black",
                            ":hover": {
                                backgroundColor: "green",
                                color: "white",
                            },
                        }}
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
