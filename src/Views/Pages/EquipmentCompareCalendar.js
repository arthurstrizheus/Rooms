import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
    Box,
    Typography,
    Button,
    Chip,
    Card,
    TextField,
    MenuItem,
    Checkbox,
    FormControlLabel,
    Autocomplete,
    Stack,
    Collapse,
    Grid,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import axios from "axios";

import { useAuth } from "../../Utilites/AuthContext";
import { useSocket } from "../../Contexts/SocketContext";
import DisplayCheckout from "../Components/DisplayCheckout/DisplayCheckout";
import AlertDialog from "../../Components/AlertDialog";
import useAlertDialog from "../../hooks/useAlertDialog";
import useResponsive from "../../hooks/useResponsive";
import {
    PageHeader,
    PageContainer,
    ResponsiveDialog,
} from "../Components/UI";
import "../Components/UI/fullcalendar.css";

// Shared with the embeddable compare view so the same equipment gets the same
// color in both.
import { EQUIPMENT_PALETTE as COLOR_PALETTE } from "../Components/UI/equipmentPalette";

const EquipmentCompareCalendar = ({ setLoading, loading }) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { socket } = useSocket();
    const { isCompact: isMobile } = useResponsive();
    const [selectedEquipment, setSelectedEquipment] = useState(null);
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
        // DisplayCheckout needs the equipment as well as the checkout; the
        // event carries the equipment id, so resolve it from the loaded list.
        const equipment = equipmentList.find(
            (eq) => `${eq.id}` === `${info.event.extendedProps.equipmentId}`,
        );
        setSelectedCheckout(checkout);
        setSelectedEquipment(equipment || null);
        setOpenCheckoutDialog(true);
    };

    const handleCloseCheckoutDialog = () => {
        setOpenCheckoutDialog(false);
        setSelectedCheckout(null);
        setSelectedEquipment(null);
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

    // Back returns to the equipment the comparison was started from, when we
    // know it; otherwise to the catalog.
    const backTarget = fromEquipmentId
        ? `/equipment/${fromEquipmentId}`
        : "/equipment";

    return (
        <>
            <PageHeader
                back={backTarget}
                breadcrumbs={[
                    { label: "Equipment", to: "/equipment" },
                    ...(fromEquipmentId
                        ? [{ label: "Details", to: backTarget }]
                        : []),
                    { label: "Compare schedules" },
                ]}
                title="Compare schedules"
                subtitle={`${equipmentList.length} item${
                    equipmentList.length === 1 ? "" : "s"
                } on one calendar — look for gaps where they're all free.`}
            >
                {/* Legend doubles as the removal control. */}
                <Stack
                    direction="row"
                    spacing={1}
                    sx={{ flexWrap: "wrap", gap: 1 }}
                >
                    {equipmentList.map((equipment, index) => {
                        const color =
                            COLOR_PALETTE[index % COLOR_PALETTE.length];
                        return (
                            <Chip
                                key={equipment.id}
                                icon={
                                    <Box
                                        component="span"
                                        sx={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: "3px",
                                            bgcolor: color,
                                            ml: "10px !important",
                                            mr: "-2px !important",
                                            flexShrink: 0,
                                        }}
                                    />
                                }
                                label={equipment?.name || "Loading…"}
                                variant="outlined"
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
                                                  navigate(
                                                      `/equipment/${fromEquipmentId}`,
                                                  );
                                              }
                                          }
                                        : undefined
                                }
                                sx={{ fontWeight: 600 }}
                            />
                        );
                    })}
                </Stack>
            </PageHeader>

            <PageContainer disableGutters={isMobile}>
                <Card
                    sx={{
                        p: { xs: 1, sm: 2 },
                        borderRadius: { xs: 0, sm: 3.5 },
                    }}
                >
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
                </Card>
            </PageContainer>

            {/* ---- Reservation details ---- */}
            <ResponsiveDialog
                open={openCheckoutDialog}
                onClose={handleCloseCheckoutDialog}
                maxWidth="sm"
                hideClose
                title={null}
                padded={false}
            >
                {selectedCheckout && selectedEquipment && (
                    <DisplayCheckout
                        checkout={selectedCheckout}
                        equipment={selectedEquipment}
                        handleExit={handleCloseCheckoutDialog}
                        setUpdate={() => {
                            if (dateRange.start && dateRange.end) {
                                fetchCheckouts(dateRange.start, dateRange.end);
                            }
                        }}
                        setUpdateMode={() => {}}
                        // Editing lives on the equipment's own calendar, which
                        // has the edit form; send the user there.
                        handleUpdateEvent={() =>
                            navigate(
                                `/equipment/calendar/${selectedEquipment.id}`,
                            )
                        }
                    />
                )}
            </ResponsiveDialog>

            {/* ---- Create reservation ---- */}
            <ResponsiveDialog
                open={openBookingDialog}
                onClose={handleCloseBookingDialog}
                title="New reservation"
                subtitle="Book one or more of the compared items"
                icon={<EventAvailableOutlinedIcon />}
                maxWidth="sm"
                actions={
                    <>
                        <Button
                            onClick={handleCloseBookingDialog}
                            variant="outlined"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateCheckout}
                            variant="contained"
                            startIcon={<EventAvailableOutlinedIcon />}
                            disabled={
                                !selectedSlot?.start ||
                                !selectedSlot?.end ||
                                selectedBookingEquipment.length === 0
                            }
                        >
                            Create reservation
                        </Button>
                    </>
                }
            >
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                        }}
                    >
                        {/* Equipment Selection */}
                        <Box>
                            <Typography
                                variant="overline"
                                sx={{
                                    color: "text.secondary",
                                    display: "block",
                                    mb: 1,
                                }}
                            >
                                Which equipment?
                            </Typography>
                            <Stack spacing={0.5}>
                                {equipmentList.map((equipment, index) => {
                                    const color =
                                        COLOR_PALETTE[
                                            index % COLOR_PALETTE.length
                                        ];
                                    const checked =
                                        selectedBookingEquipment.includes(
                                            equipment.id,
                                        );
                                    return (
                                        <FormControlLabel
                                            key={equipment.id}
                                            sx={{
                                                m: 0,
                                                px: 1.5,
                                                py: 0.5,
                                                borderRadius: 2.5,
                                                border: "1px solid",
                                                borderColor: checked
                                                    ? "primary.100"
                                                    : "divider",
                                                bgcolor: checked
                                                    ? "primary.50"
                                                    : "transparent",
                                                transition:
                                                    "background-color 180ms ease, border-color 180ms ease",
                                            }}
                                            control={
                                                <Checkbox
                                                    checked={checked}
                                                    onChange={(e) =>
                                                        setSelectedBookingEquipment(
                                                            e.target.checked
                                                                ? [
                                                                      ...selectedBookingEquipment,
                                                                      equipment.id,
                                                                  ]
                                                                : selectedBookingEquipment.filter(
                                                                      (id) =>
                                                                          id !==
                                                                          equipment.id,
                                                                  ),
                                                        )
                                                    }
                                                />
                                            }
                                            label={
                                                <Stack
                                                    direction="row"
                                                    alignItems="center"
                                                    spacing={1}
                                                >
                                                    <Box
                                                        sx={{
                                                            width: 10,
                                                            height: 10,
                                                            borderRadius: "3px",
                                                            bgcolor: color,
                                                        }}
                                                    />
                                                    <Typography variant="body2">
                                                        {equipment?.name}
                                                    </Typography>
                                                </Stack>
                                            }
                                        />
                                    );
                                })}
                            </Stack>
                        </Box>

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
                            variant="text"
                            endIcon={
                                <ExpandMoreIcon
                                    sx={{
                                        transition:
                                            "transform 240ms cubic-bezier(0.22,1,0.36,1)",
                                        transform: showOptionalFields
                                            ? "rotate(180deg)"
                                            : "none",
                                    }}
                                />
                            }
                            onClick={() =>
                                setShowOptionalFields(!showOptionalFields)
                            }
                            sx={{ alignSelf: "flex-start", ml: -1 }}
                        >
                            More options
                        </Button>

                        <Collapse in={showOptionalFields} timeout={300}>
                            <Stack spacing={2}>
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
                            </Stack>
                        </Collapse>

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
                            label={
                                <Typography variant="body2">
                                    Repeat this reservation
                                </Typography>
                            }
                            sx={{ ml: -0.5 }}
                        />

                        <Collapse in={formData.isRecurring} timeout={280}>
                            <Stack
                                spacing={2}
                                sx={{
                                    p: 2,
                                    borderRadius: 2.5,
                                    border: "1px solid",
                                    borderColor: "divider",
                                    bgcolor: "grey.50",
                                }}
                            >
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            select
                                            label="Repeat pattern"
                                            value={formData.recurrencePattern}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    recurrencePattern:
                                                        e.target.value,
                                                })
                                            }
                                            fullWidth
                                        >
                                            <MenuItem value="daily">
                                                Daily
                                            </MenuItem>
                                            <MenuItem value="weekly">
                                                Weekly
                                            </MenuItem>
                                            <MenuItem value="monthly">
                                                Monthly
                                            </MenuItem>
                                        </TextField>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            label="Repeat every"
                                            type="number"
                                            value={formData.recurrenceInterval}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    recurrenceInterval:
                                                        parseInt(
                                                            e.target.value,
                                                            10,
                                                        ) || 1,
                                                })
                                            }
                                            InputProps={{
                                                inputProps: { min: 1 },
                                            }}
                                            fullWidth
                                        />
                                    </Grid>
                                </Grid>

                                <TextField
                                    label="End date"
                                    type="date"
                                    value={formData.recurrenceEndDate}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            recurrenceEndDate: e.target.value,
                                        })
                                    }
                                    InputLabelProps={{ shrink: true }}
                                    helperText="Leave empty to repeat indefinitely"
                                    fullWidth
                                />
                            </Stack>
                        </Collapse>
                    </Box>
            </ResponsiveDialog>

            <AlertDialog
                open={alertState.open}
                onClose={hideAlert}
                message={alertState.message}
                title={alertState.title}
                severity={alertState.severity}
                confirmText={alertState.confirmText}
            />
        </>
    );
};

export default EquipmentCompareCalendar;
