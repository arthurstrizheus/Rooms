import React, { useState } from "react";
import {
    Button,
    TextField,
    Box,
    Typography,
    Checkbox,
    FormControlLabel,
    MenuItem,
    Autocomplete,
    Stack,
    Collapse,
    Alert,
    Grid,
} from "@mui/material";
import { Warning, Check } from "@mui/icons-material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import axios from "axios";
import ResponsiveDialog from "../../../Components/UI/ResponsiveDialog";

const EMPTY_FORM = {
    start_time: "",
    end_time: "",
    notes: "",
    project_number: "",
    scheduled_on_behalf_of: "",
    isRecurring: false,
    recurrencePattern: "daily",
    recurrenceInterval: 1,
    recurrenceEndDate: "",
};

const UNIT_LABEL = {
    daily: "day",
    weekly: "week",
    monthly: "month",
};

// Statuses the backend won't accept a reservation for.
const BLOCKED_STATUSES = {
    retired: "Cannot reserve retired equipment",
    "out for calibration":
        "Cannot reserve equipment that is out for calibration",
    maintenance: "Cannot reserve equipment that is under maintenance",
};

/**
 * Create a reservation.
 *
 * Required fields are always visible; notes, on-behalf-of and recurrence live
 * behind a single "More options" disclosure so the common case is three fields
 * and a button.
 */
const ReservationDialog = ({
    open,
    onClose,
    equipmentId,
    equipmentName,
    equipment,
    users = [],
    currentUserId = null,
    selectedSlot = null,
    onSuccess,
    setLoading,
    showAlert,
}) => {
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [showOptionalFields, setShowOptionalFields] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const update = (patch) => setFormData((prev) => ({ ...prev, ...patch }));

    // ---- Calibration banner ----------------------------------------------

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

    const calibrationDueDate = calculateCalibrationDueDate();

    const getCalibrationStatus = () => {
        if (!calibrationDueDate) return null;

        const now = new Date();
        const twoMonthsOut = new Date();
        twoMonthsOut.setMonth(twoMonthsOut.getMonth() + 2);

        if (now > calibrationDueDate) {
            return { label: "Out of calibration", severity: "error" };
        }
        if (calibrationDueDate <= twoMonthsOut) {
            return { label: "Calibration due soon", severity: "warning" };
        }
        return { label: "Calibrated", severity: "success" };
    };

    const calibrationStatus = getCalibrationStatus();

    // ---- Submit -----------------------------------------------------------

    const handleSubmit = async () => {
        if (!formData.project_number?.trim()) {
            showAlert("Project Number is required", "error");
            return;
        }

        const blockedMessage = BLOCKED_STATUSES[equipment?.status];
        if (blockedMessage) {
            showAlert(blockedMessage, "error");
            return;
        }

        const startTime = new Date(formData.start_time);
        const endTime = new Date(formData.end_time);
        if (endTime <= startTime) {
            showAlert("End time must be after start time", "error");
            return;
        }

        try {
            setLoading(true);
            setSubmitting(true);
            const token = localStorage.getItem("authToken");

            const checkoutData = {
                equipment_id: parseInt(equipmentId, 10),
                user_id: currentUserId,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                notes: formData.notes || null,
                project_number: formData.project_number || null,
                scheduled_on_behalf_of: formData.scheduled_on_behalf_of || null,
            };

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

            onSuccess?.();
            handleClose();
        } catch (error) {
            console.error("Error creating reservation:", error);
            showAlert(
                "Error creating reservation: " +
                    (error.response?.data?.message || error.message),
                "error",
            );
        } finally {
            setLoading(false);
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData(EMPTY_FORM);
        setShowOptionalFields(false);
        onClose();
    };

    // Seed the times from the calendar slot, or the next quarter hour.
    React.useEffect(() => {
        if (!open || (formData.start_time && formData.end_time)) return;

        let startTime;
        let endTime;

        if (selectedSlot?.start && selectedSlot?.end) {
            startTime = new Date(selectedSlot.start);
            endTime = new Date(selectedSlot.end);
        } else {
            const now = new Date();
            now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
            startTime = now;
            endTime = new Date(now);
            endTime.setHours(endTime.getHours() + 1);
        }

        const formatDateTime = (date) => {
            const pad = (n) => String(n).padStart(2, "0");
            return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
                date.getDate(),
            )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
        };

        update({
            start_time: formatDateTime(startTime),
            end_time: formatDateTime(endTime),
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, selectedSlot]);

    const unit = UNIT_LABEL[formData.recurrencePattern] || "day";

    return (
        <ResponsiveDialog
            open={open}
            onClose={handleClose}
            title="New reservation"
            subtitle={equipmentName}
            icon={<EventAvailableOutlinedIcon />}
            maxWidth="sm"
            actions={
                <>
                    <Button onClick={handleClose} variant="outlined">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        disabled={submitting}
                        startIcon={<EventAvailableOutlinedIcon />}
                    >
                        Create reservation
                    </Button>
                </>
            }
        >
            <Stack spacing={2}>
                {calibrationStatus && (
                    <Alert
                        severity={calibrationStatus.severity}
                        icon={
                            calibrationStatus.severity === "success" ? (
                                <Check fontSize="inherit" />
                            ) : (
                                <Warning fontSize="inherit" />
                            )
                        }
                        sx={{ boxShadow: "none" }}
                    >
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {calibrationStatus.label}
                            {calibrationDueDate &&
                                calibrationStatus.severity !== "success" &&
                                ` — due ${calibrationDueDate.toLocaleDateString()}`}
                        </Typography>
                    </Alert>
                )}

                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Start time"
                            type="datetime-local"
                            value={formData.start_time}
                            onChange={(e) =>
                                update({ start_time: e.target.value })
                            }
                            fullWidth
                            required
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="End time"
                            type="datetime-local"
                            value={formData.end_time}
                            onChange={(e) =>
                                update({ end_time: e.target.value })
                            }
                            fullWidth
                            required
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                </Grid>

                <TextField
                    label="Project number"
                    value={formData.project_number}
                    onChange={(e) => update({ project_number: e.target.value })}
                    fullWidth
                    required
                />

                {equipment?.requires_approval && (
                    <Alert severity="info" sx={{ boxShadow: "none" }}>
                        <Typography variant="body2">
                            This equipment requires approval — your reservation
                            will be pending until an approver reviews it.
                        </Typography>
                    </Alert>
                )}

                {/* ---- Optional ---- */}
                <Box>
                    <Button
                        size="small"
                        variant="text"
                        onClick={() => setShowOptionalFields((v) => !v)}
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
                        sx={{ ml: -1 }}
                    >
                        More options
                    </Button>

                    <Collapse in={showOptionalFields} timeout={300}>
                        <Stack spacing={2} sx={{ pt: 2 }}>
                            <TextField
                                label="Notes"
                                value={formData.notes}
                                onChange={(e) =>
                                    update({ notes: e.target.value })
                                }
                                fullWidth
                                multiline
                                rows={3}
                            />

                            <Autocomplete
                                options={users.filter(
                                    (u) => u.id !== currentUserId,
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
                                onChange={(_, newValue) =>
                                    update({
                                        scheduled_on_behalf_of: newValue
                                            ? `${newValue.first_name} ${newValue.last_name}`
                                            : "",
                                    })
                                }
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Scheduled on behalf of"
                                        placeholder="If you're booking for someone else"
                                        fullWidth
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

                            <FormControlLabel
                                sx={{ ml: -0.5 }}
                                control={
                                    <Checkbox
                                        checked={formData.isRecurring || false}
                                        onChange={(e) =>
                                            update({
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
                                                value={
                                                    formData.recurrencePattern ||
                                                    "daily"
                                                }
                                                onChange={(e) =>
                                                    update({
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
                                                value={
                                                    formData.recurrenceInterval ||
                                                    1
                                                }
                                                onChange={(e) =>
                                                    update({
                                                        recurrenceInterval:
                                                            parseInt(
                                                                e.target.value,
                                                                10,
                                                            ) || 1,
                                                    })
                                                }
                                                InputLabelProps={{
                                                    shrink: true,
                                                }}
                                                inputProps={{ min: 1 }}
                                                helperText={`Every ${
                                                    formData.recurrenceInterval ||
                                                    1
                                                } ${unit}${
                                                    (formData.recurrenceInterval ||
                                                        1) > 1
                                                        ? "s"
                                                        : ""
                                                }`}
                                                fullWidth
                                            />
                                        </Grid>
                                    </Grid>

                                    <TextField
                                        label="End date"
                                        type="date"
                                        value={formData.recurrenceEndDate || ""}
                                        onChange={(e) =>
                                            update({
                                                recurrenceEndDate:
                                                    e.target.value,
                                            })
                                        }
                                        InputLabelProps={{ shrink: true }}
                                        helperText="Leave empty to repeat indefinitely"
                                        fullWidth
                                    />
                                </Stack>
                            </Collapse>
                        </Stack>
                    </Collapse>
                </Box>
            </Stack>
        </ResponsiveDialog>
    );
};

export default ReservationDialog;
