import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Box,
    Typography,
    Button,
    TextField,
    MenuItem,
    Autocomplete,
    Chip,
    Stack,
    Card,
    Fab,
    Grid,
} from "@mui/material";
import { Warning, Check } from "@mui/icons-material";
import AddIcon from "@mui/icons-material/Add";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import EditCalendarOutlinedIcon from "@mui/icons-material/EditCalendarOutlined";
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
import ReservationDialog from "./EquipmentDetails/Components/ReservationDialog";
import useResponsive from "../../hooks/useResponsive";
import {
    PageHeader,
    PageContainer,
    ResponsiveDialog,
} from "../Components/UI";
import "../Components/UI/fullcalendar.css";

// Reservation status → event color. Pulled onto the app's semantic palette so
// calendar events match status chips elsewhere.
const STATUS_COLORS = {
    "auto-approved": "#1E9E52",
    pending: "#C77700",
    reserved: "#1F6FD0",
    returned: "#A6ADBA",
};
const DEFAULT_STATUS_COLOR = "#78808F";

const CALIBRATION_TONES = {
    overdue: { label: "Out of calibration", color: "#8E0F17", bg: "#FCE4E7" },
    soon: { label: "Calibration due soon", color: "#8F5600", bg: "#FEF4E2" },
    ok: { label: "Calibrated", color: "#14713A", bg: "#E6F6EC" },
};

const EquipmentCalendar = ({ setLoading, loading }) => {
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
    const [calibration, setCalibration] = useState(null);
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
    const { isCompact } = useResponsive();
    const navigate = useNavigate();

    // ---- Calibration ------------------------------------------------------

    const calculateCalibrationDueDate = () => {
        if (
            !equipment?.last_calibration_date ||
            !equipment?.calibration_interval_value
        ) {
            return null;
        }
        const dueDate = new Date(equipment.last_calibration_date);
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
            default:
                break;
        }
        return dueDate;
    };

    const getCalibrationTone = () => {
        const dueDate = calculateCalibrationDueDate();
        if (!dueDate) return null;

        const twoMonthsOut = new Date();
        twoMonthsOut.setMonth(twoMonthsOut.getMonth() + 2);

        if (new Date() > dueDate) return CALIBRATION_TONES.overdue;
        if (dueDate <= twoMonthsOut) return CALIBRATION_TONES.soon;
        return CALIBRATION_TONES.ok;
    };

    // ---- Data -------------------------------------------------------------

    useEffect(() => {
        fetchEquipment();
        fetchUsers();
        // Checkouts are fetched by the calendar's datesSet callback, which
        // knows the visible range.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [equipmentId, update]);

    useEffect(() => {
        if (equipment && equipment.can_book === false) {
            navigate(`/equipment/${equipmentId}`);
        }
        setCalibration(getCalibrationTone());
        setCalibrationDueDate(calculateCalibrationDueDate());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [equipment, equipmentId, navigate]);

    useEffect(() => {
        if (!socket?.connected) return undefined;

        const handleMessage = ({ message, data }) => {
            const id = parseInt(equipmentId, 10);
            switch (message) {
                case "checkout_created":
                case "checkout_updated":
                case "checkout_approved":
                    if (
                        (data?.equipment_id === id ||
                            data?.checkout?.equipment_id === id) &&
                        dateRange.start &&
                        dateRange.end
                    ) {
                        fetchCheckouts(dateRange.start, dateRange.end);
                    }
                    break;
                case "equipment_updated":
                    if (data?.equipment?.id === id) fetchEquipment();
                    break;
                default:
                    break;
            }
        };

        socket.on("message", handleMessage);
        return () => socket.off("message", handleMessage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, equipmentId, dateRange]);

    const authHeaders = () => ({
        headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
    });

    const fetchEquipment = async () => {
        try {
            const response = await axios.get(
                `/api/equipment/${equipmentId}`,
                authHeaders(),
            );
            setEquipment(response.data);
        } catch (error) {
            console.error("Error fetching equipment:", error);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await axios.get("/api/users", authHeaders());
            setUsers(response.data);
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    const fetchCheckouts = async (start = null, end = null) => {
        try {
            setLoading(true);
            const params = {};
            if (start) params.start = start;
            if (end) params.end = end;

            const response = await axios.get(
                `/api/checkouts/equipment/${equipmentId}`,
                { ...authHeaders(), params },
            );

            const events = response.data
                .filter((c) => c.status !== "cancelled")
                .map((checkout) => {
                    const who =
                        checkout.scheduled_on_behalf_of ||
                        (checkout.User
                            ? `${checkout.User.first_name} ${checkout.User.last_name}`
                            : "Checkout");

                    return {
                        id: checkout.id,
                        title: `${who}${checkout.isRecurring ? " ↻" : ""}`,
                        start: checkout.start_time,
                        end: checkout.end_time,
                        backgroundColor:
                            STATUS_COLORS[checkout.status] ||
                            DEFAULT_STATUS_COLOR,
                        borderColor:
                            STATUS_COLORS[checkout.status] ||
                            DEFAULT_STATUS_COLOR,
                        extendedProps: {
                            status: checkout.status,
                            notes: checkout.notes,
                            project_number: checkout.project_number,
                            scheduled_on_behalf_of:
                                checkout.scheduled_on_behalf_of,
                            isRecurring: checkout.isRecurring || false,
                            userId: checkout.user_id,
                            user_id: checkout.user_id,
                            equipment_id: checkout.equipment_id,
                            approved_by_user_id: checkout.approved_by_user_id,
                            recurrence_id: checkout.recurrence_id || null,
                            repeats: checkout.repeats,
                            checkoutData: checkout,
                        },
                    };
                });

            setCheckouts(events);
        } catch (error) {
            console.error("Error fetching checkouts:", error);
        } finally {
            setLoading(false);
        }
    };

    // ---- Interaction ------------------------------------------------------

    const handleDateSelect = (selectInfo) => {
        setSelectedSlot({ start: selectInfo.start, end: selectInfo.end });
        setOpenDialog(true);
    };

    const handleEventClick = (clickInfo) => {
        const event = clickInfo.event;
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

        const startTime = selectedCheckout.start_time || selectedCheckout.start;
        const endTime = selectedCheckout.end_time || selectedCheckout.end;

        const formatLocalDateTime = (dateValue) => {
            const date = new Date(dateValue);
            const pad = (n) => String(n).padStart(2, "0");
            return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
                date.getDate(),
            )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
        };

        setEditFormData({
            start_time: formatLocalDateTime(startTime),
            end_time: formatLocalDateTime(endTime),
            notes: selectedCheckout.notes || "",
            project_number: selectedCheckout.project_number || "",
            scheduled_on_behalf_of:
                selectedCheckout.scheduled_on_behalf_of || "",
            status: selectedCheckout.status,
        });

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

        if (!editFormData.project_number?.trim()) {
            showAlert("Project Number is required", "error");
            return;
        }

        // Virtual occurrences of a recurrence have string ids like "12_3".
        const isVirtualOccurrence =
            typeof selectedCheckout.id === "string" &&
            selectedCheckout.id.includes("_");
        const isRecurring =
            selectedCheckout.extendedProps?.isRecurring ||
            selectedCheckout.isRecurring ||
            isVirtualOccurrence;

        if (isRecurring && !updateMode) {
            showAlert(
                "Please choose how you want to update this recurring reservation",
                "warning",
            );
            return;
        }

        try {
            setLoading(true);

            const updateData = {
                start_time: new Date(editFormData.start_time).toISOString(),
                end_time: new Date(editFormData.end_time).toISOString(),
                notes: editFormData.notes,
                project_number: editFormData.project_number || null,
                scheduled_on_behalf_of:
                    editFormData.scheduled_on_behalf_of || null,
            };

            // Status is admin-only.
            if (user.admin && editFormData.status) {
                updateData.status = editFormData.status;
            }

            if (isRecurring) {
                updateData.updateMode = updateMode;
                const occurrenceStart =
                    selectedCheckout.start instanceof Date
                        ? selectedCheckout.start
                        : new Date(
                              selectedCheckout.start_time ||
                                  selectedCheckout.start,
                          );
                updateData.occurrence_start_time =
                    occurrenceStart.toISOString();
            }

            await axios.put(
                `/api/checkouts/${selectedCheckout.id}`,
                updateData,
                authHeaders(),
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

    // ---- Rendering --------------------------------------------------------

    // The equipment metadata used to be written out twice — once for desktop
    // as a pipe-separated sentence and once for mobile as stacked rows. It's
    // one wrapping chip row now.
    const metaChips = [
        equipment?.location && ["Location", equipment.location],
        equipment?.contact_person && ["Contact", equipment.contact_person],
        equipment?.serial_number && ["Serial", equipment.serial_number],
        equipment?.asset_number && ["Asset", equipment.asset_number],
    ].filter(Boolean);

    return (
        <>
            <PageHeader
                back={`/equipment/${equipmentId}`}
                breadcrumbs={[
                    { label: "Equipment", to: "/equipment" },
                    {
                        label: equipment?.name || "Equipment",
                        to: `/equipment/${equipmentId}`,
                    },
                    { label: "Schedule" },
                ]}
                title={`${equipment?.name || "Equipment"} schedule`}
                actions={[
                    {
                        key: "reserve",
                        label: "Reserve",
                        icon: <EventAvailableOutlinedIcon />,
                        primary: true,
                        onClick: () => setOpenDialog(true),
                    },
                ]}
            >
                {(metaChips.length > 0 || calibration) && (
                    <Stack
                        direction="row"
                        spacing={0.75}
                        sx={{ flexWrap: "wrap", gap: 0.75 }}
                    >
                        {metaChips.map(([label, value]) => (
                            <Chip
                                key={label}
                                size="small"
                                variant="outlined"
                                label={
                                    <>
                                        <Box
                                            component="span"
                                            sx={{
                                                color: "text.disabled",
                                                fontWeight: 600,
                                            }}
                                        >
                                            {label}
                                        </Box>{" "}
                                        {value}
                                    </>
                                }
                            />
                        ))}

                        {calibration && (
                            <Chip
                                size="small"
                                icon={
                                    calibration === CALIBRATION_TONES.ok ? (
                                        <Check
                                            sx={{
                                                fontSize: "14px !important",
                                                color: `${calibration.color} !important`,
                                            }}
                                        />
                                    ) : (
                                        <Warning
                                            sx={{
                                                fontSize: "14px !important",
                                                color: `${calibration.color} !important`,
                                            }}
                                        />
                                    )
                                }
                                label={
                                    calibration === CALIBRATION_TONES.ok ||
                                    !calibrationDueDate
                                        ? calibration.label
                                        : `${calibration.label} — due ${calibrationDueDate.toLocaleDateString()}`
                                }
                                sx={{
                                    color: calibration.color,
                                    bgcolor: calibration.bg,
                                    fontWeight: 600,
                                }}
                            />
                        )}
                    </Stack>
                )}
            </PageHeader>

            <PageContainer disableGutters={isCompact}>
                <Card
                    sx={{
                        p: { xs: 1, sm: 2 },
                        borderRadius: { xs: 0, sm: 3.5 },
                        borderLeft: { xs: "none", sm: "1px solid" },
                        borderRight: { xs: "none", sm: "1px solid" },
                        borderColor: "divider",
                    }}
                >
                    <FullCalendar
                        key={checkouts.length}
                        plugins={[
                            dayGridPlugin,
                            timeGridPlugin,
                            interactionPlugin,
                        ]}
                        initialView={
                            isCompact ? "timeGridWeek" : "dayGridMonth"
                        }
                        headerToolbar={
                            isCompact
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
                        selectable={!isCompact}
                        selectMirror
                        dayMaxEvents
                        weekends
                        events={checkouts}
                        select={isCompact ? undefined : handleDateSelect}
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
                        eventMinHeight={isCompact ? 40 : 20}
                        slotEventOverlap={false}
                        allDaySlot={false}
                        titleFormat={
                            isCompact
                                ? { month: "short", day: "numeric" }
                                : undefined
                        }
                        dayHeaderFormat={
                            isCompact
                                ? { weekday: "short", day: "numeric" }
                                : undefined
                        }
                    />
                </Card>
            </PageContainer>

            {/* ---- Dialogs ---- */}
            <ReservationDialog
                open={openDialog}
                onClose={handleCloseDialog}
                equipmentId={equipmentId}
                equipmentName={equipment?.name}
                equipment={equipment}
                users={users}
                currentUserId={user?.id}
                selectedSlot={selectedSlot}
                onSuccess={() =>
                    fetchCheckouts(dateRange.start, dateRange.end)
                }
                setLoading={setLoading}
                showAlert={showAlert}
            />

            <ResponsiveDialog
                open={openCheckoutDialog}
                onClose={handleCloseCheckoutDialog}
                maxWidth="sm"
                hideClose
                title={null}
                padded={false}
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
            </ResponsiveDialog>

            <ResponsiveDialog
                open={openEditDialog}
                onClose={handleCloseEditDialog}
                title="Edit reservation"
                subtitle={equipment?.name}
                icon={<EditCalendarOutlinedIcon />}
                maxWidth="sm"
                actions={
                    <>
                        <Button
                            onClick={handleCloseEditDialog}
                            variant="outlined"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveEdit}
                            variant="contained"
                            disabled={loading}
                        >
                            Save changes
                        </Button>
                    </>
                }
            >
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Start time"
                            type="datetime-local"
                            value={editFormData.start_time}
                            onChange={(e) =>
                                setEditFormData({
                                    ...editFormData,
                                    start_time: e.target.value,
                                })
                            }
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="End time"
                            type="datetime-local"
                            value={editFormData.end_time}
                            onChange={(e) =>
                                setEditFormData({
                                    ...editFormData,
                                    end_time: e.target.value,
                                })
                            }
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            label="Project number"
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
                    </Grid>

                    <Grid item xs={12}>
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
                    </Grid>

                    <Grid item xs={12}>
                        <Autocomplete
                            freeSolo
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
                            onChange={(_, newValue) =>
                                setEditFormData({
                                    ...editFormData,
                                    scheduled_on_behalf_of: newValue
                                        ? typeof newValue === "string"
                                            ? newValue
                                            : `${newValue.first_name} ${newValue.last_name}`
                                        : "",
                                })
                            }
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Scheduled on behalf of"
                                    placeholder="Select or type a name"
                                />
                            )}
                            renderOption={(props, option) => (
                                <Box component="li" {...props} key={option.id}>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography variant="body2" noWrap>
                                            {option.first_name}{" "}
                                            {option.last_name}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            noWrap
                                        >
                                            {option.email}
                                        </Typography>
                                    </Box>
                                </Box>
                            )}
                            isOptionEqualToValue={(option, value) =>
                                option.id === value?.id
                            }
                            ListboxProps={{ style: { maxHeight: 250 } }}
                            fullWidth
                        />
                    </Grid>

                    {selectedCheckout?.extendedProps?.isRecurring && (
                        <Grid item xs={12}>
                            <TextField
                                select
                                label="Apply changes to"
                                value={updateMode || ""}
                                onChange={(e) => setUpdateMode(e.target.value)}
                                fullWidth
                                required
                                helperText="This reservation repeats — choose which occurrences to update."
                            >
                                <MenuItem value="this">
                                    This occurrence only
                                </MenuItem>
                                <MenuItem value="following">
                                    This and following occurrences
                                </MenuItem>
                                <MenuItem value="all">All occurrences</MenuItem>
                            </TextField>
                        </Grid>
                    )}
                </Grid>
            </ResponsiveDialog>

            <AlertDialog
                open={alertState.open}
                onClose={hideAlert}
                message={alertState.message}
                title={alertState.title}
                severity={alertState.severity}
                confirmText={alertState.confirmText}
            />

            {/* Thumb-reachable create button on phones, clear of the bottom nav. */}
            {isCompact && (
                <Fab
                    color="primary"
                    aria-label="New reservation"
                    onClick={() => setOpenDialog(true)}
                    sx={{
                        position: "fixed",
                        bottom: "calc(74px + env(safe-area-inset-bottom))",
                        right: 16,
                        zIndex: (t) => t.zIndex.appBar - 1,
                    }}
                >
                    <AddIcon />
                </Fab>
            )}
        </>
    );
};

export default EquipmentCalendar;
