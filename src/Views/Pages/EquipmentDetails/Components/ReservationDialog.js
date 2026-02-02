import React, { useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    Checkbox,
    FormControlLabel,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Autocomplete,
} from "@mui/material";
import { Warning, Check } from "@mui/icons-material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import axios from "axios";

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
    const [formData, setFormData] = useState({
        start_time: "",
        end_time: "",
        notes: "",
        project_number: "",
        scheduled_on_behalf_of: "",
        isRecurring: false,
        recurrencePattern: "daily",
        recurrenceInterval: 1,
        recurrenceEndDate: "",
    });
    const [showOptionalFields, setShowOptionalFields] = useState(false);

    // Calibration status helpers
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

    const handleSubmit = async () => {
        // Validate required fields
        if (!formData.project_number || formData.project_number.trim() === "") {
            showAlert("Project Number is required", "error");
            return;
        }
        if (equipment?.status === "retired") {
            showAlert("Cannot reserve retired equipment", "error");
            return;
        }
        if (equipment?.status === "out for calibration") {
            showAlert(
                "Cannot reserve equipment that is out for calibration",
                "error",
            );
            return;
        }
        if (equipment?.status === "maintenance") {
            showAlert(
                "Cannot reserve equipment that is under maintenance",
                "error",
            );
            return;
        }
        if (equipment?.status === "maintenance") {
            showAlert(
                "Cannot reserve equipment that is under maintenance",
                "error",
            );
            return;
        }

        // Get dates from formData
        const startTime = new Date(formData.start_time);
        const endTime = new Date(formData.end_time);

        // Validate end time is after start time
        if (endTime <= startTime) {
            showAlert("End time must be after start time", "error");
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem("authToken");

            // Create Reservation data (works for both single and recurring)
            const checkoutData = {
                equipment_id: parseInt(equipmentId),
                user_id: currentUserId,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                notes: formData.notes || null,
                project_number: formData.project_number || null,
                scheduled_on_behalf_of: formData.scheduled_on_behalf_of || null,
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

            // Call success callback and close
            if (onSuccess) {
                onSuccess();
            }

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
        }
    };

    const handleClose = () => {
        setFormData({
            start_time: "",
            end_time: "",
            notes: "",
            project_number: "",
            scheduled_on_behalf_of: "",
            isRecurring: false,
            recurrencePattern: "daily",
            recurrenceInterval: 1,
            recurrenceEndDate: "",
        });
        setShowOptionalFields(false);
        onClose();
    };

    // Update formData when dialog opens with new times
    React.useEffect(() => {
        if (open && (!formData.start_time || !formData.end_time)) {
            let startTime, endTime;

            // Use selectedSlot if provided (from calendar selection)
            if (selectedSlot?.start && selectedSlot?.end) {
                startTime = new Date(selectedSlot.start);
                endTime = new Date(selectedSlot.end);
            } else {
                // Default to current time + 1 hour
                const now = new Date();
                const roundedMinutes = Math.ceil(now.getMinutes() / 15) * 15;
                now.setMinutes(roundedMinutes, 0, 0);
                startTime = now;
                endTime = new Date(now);
                endTime.setHours(endTime.getHours() + 1);
            }

            const formatDateTime = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                const hours = String(date.getHours()).padStart(2, "0");
                const minutes = String(date.getMinutes()).padStart(2, "0");
                return `${year}-${month}-${day}T${hours}:${minutes}`;
            };

            setFormData((prev) => ({
                ...prev,
                start_time: formatDateTime(startTime),
                end_time: formatDateTime(endTime),
            }));
        }
    }, [open, selectedSlot]);

    const calibrationStatus = getCalibrationStatus();
    const calibrationDueDate = calculateCalibrationDueDate();

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Reserve {equipmentName}</DialogTitle>
            <DialogContent>
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        mt: 1,
                    }}
                >
                    {calibrationStatus && (
                        <Box
                            sx={{
                                p: 2,
                                borderRadius: 1,
                                backgroundColor:
                                    calibrationStatus.backgroundColor,
                                border: `1px solid ${calibrationStatus.color}`,
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                            }}
                        >
                            {calibrationStatus.status === "Calibrated" ? (
                                <Check
                                    sx={{
                                        color: calibrationStatus.color,
                                    }}
                                />
                            ) : (
                                <Warning
                                    sx={{
                                        color: calibrationStatus.color,
                                    }}
                                />
                            )}

                            <Typography
                                variant="body2"
                                sx={{
                                    color: calibrationStatus.color,
                                    fontWeight: 600,
                                }}
                            >
                                {calibrationStatus.status}
                                {calibrationDueDate &&
                                    calibrationStatus.status !==
                                        "Calibrated" && (
                                        <>
                                            {" - Due: "}
                                            {calibrationDueDate.toLocaleDateString()}
                                        </>
                                    )}
                            </Typography>
                        </Box>
                    )}
                    <TextField
                        label="Start Time"
                        type="datetime-local"
                        value={formData.start_time}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                start_time: e.target.value,
                            })
                        }
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        label="End Time"
                        type="datetime-local"
                        value={formData.end_time}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                end_time: e.target.value,
                            })
                        }
                        fullWidth
                        InputLabelProps={{ shrink: true }}
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
                        required
                    />

                    {/* Optional Fields Toggle */}
                    <Button
                        size="small"
                        startIcon={
                            showOptionalFields ? <RemoveIcon /> : <AddIcon />
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
                                label="Notes (optional)"
                                value={formData.notes}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        notes: e.target.value,
                                    })
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

                            {/* Recurring Reservation Options */}
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
                                            value={
                                                formData.recurrencePattern ||
                                                "daily"
                                            }
                                            label="Repeat Pattern"
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    recurrencePattern:
                                                        e.target.value,
                                                })
                                            }
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
                                                    parseInt(e.target.value) ||
                                                    1,
                                            })
                                        }
                                        InputLabelProps={{
                                            shrink: true,
                                        }}
                                        inputProps={{ min: 1 }}
                                        helperText={`Repeat every ${
                                            formData.recurrenceInterval || 1
                                        } ${
                                            formData.recurrencePattern ===
                                            "daily"
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
                                        value={formData.recurrenceEndDate || ""}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                recurrenceEndDate:
                                                    e.target.value,
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
                <Button onClick={handleClose}>Cancel</Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
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
    );
};

export default ReservationDialog;
