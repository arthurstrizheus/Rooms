import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Switch,
    FormControlLabel,
    TextField,
    MenuItem,
    IconButton,
    Chip,
    Divider,
    Alert,
} from "@mui/material";
import {
    Notifications as NotificationsIcon,
    Close as CloseIcon,
    NotificationsActive,
    NotificationsOff,
} from "@mui/icons-material";
import {
    GetAlertsByEquipment,
    SubscribeToAlert,
    UnsubscribeFromAlert,
    UpdateAlert,
} from "../../Utilites/Functions/ApiFunctions";

const ALERT_TYPES = [
    {
        value: "checkout_created",
        label: "Reservation Created",
        description: "Get notified when someone creates a reservation",
    },
    {
        value: "checkout_cancelled",
        label: "Reservation Cancelled",
        description: "Get notified when a reservation is cancelled",
    },
    {
        value: "equipment_returned",
        label: "Equipment Returned",
        description: "Get notified when this equipment is returned",
    },
    {
        value: "equipment_available",
        label: "Equipment Available",
        description:
            "Get notified when equipment is available (no bookings within 2 hours)",
    },
    {
        value: "calibration_due",
        label: "Calibration Due",
        description: "Get notified before calibration is due",
    },
    {
        value: "status_change",
        label: "Status Change",
        description: "Get notified when equipment status changes",
    },
];

const EquipmentAlertManager = ({ equipment, user, open, onClose }) => {
    const [alerts, setAlerts] = useState([]);
    const [selectedAlertType, setSelectedAlertType] = useState("");
    const [notificationDays, setNotificationDays] = useState(7);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && equipment?.id) {
            fetchAlerts();
        }
    }, [open, equipment?.id]);

    const fetchAlerts = async () => {
        setLoading(true);
        const data = await GetAlertsByEquipment(equipment.id);
        // Filter to only show current user's alerts
        const userAlerts = data.filter((alert) => alert.user_id === user?.id);
        setAlerts(userAlerts);
        setLoading(false);
    };

    const handleSubscribe = async () => {
        if (!selectedAlertType) return;

        setLoading(true);
        const result = await SubscribeToAlert(
            equipment.id,
            selectedAlertType,
            notificationDays,
        );
        if (result) {
            await fetchAlerts();
            setSelectedAlertType("");
            setNotificationDays(7);
        }
        setLoading(false);
    };

    const handleToggleAlert = async (alertId, currentEnabled) => {
        setLoading(true);
        const alert = alerts.find((a) => a.id === alertId);
        await UpdateAlert(
            alertId,
            !currentEnabled,
            alert.notification_days_before,
        );
        await fetchAlerts();
        setLoading(false);
    };

    const handleUnsubscribe = async (alertId) => {
        setLoading(true);
        const success = await UnsubscribeFromAlert(alertId);
        if (success) {
            await fetchAlerts();
        }
        setLoading(false);
    };

    const getAlertTypeInfo = (alertType) => {
        return ALERT_TYPES.find((t) => t.value === alertType);
    };

    const subscribedAlertTypes = alerts
        .filter((a) => a.enabled)
        .map((a) => a.alert_type);
    const availableAlertTypes = ALERT_TYPES.filter(
        (type) => !subscribedAlertTypes.includes(type.value),
    );

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                >
                    <Box display="flex" alignItems="center" gap={1}>
                        <NotificationsIcon />
                        <Typography variant="h6">
                            Alert Subscriptions
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
                <Typography variant="body2" color="text.secondary">
                    {equipment?.name}
                </Typography>
            </DialogTitle>

            <DialogContent>
                {/* Current Subscriptions */}
                <Box mb={3}>
                    <Typography variant="subtitle1" gutterBottom>
                        Your Subscriptions
                    </Typography>
                    {alerts.length === 0 ? (
                        <Alert severity="info" icon={<NotificationsOff />}>
                            You haven't subscribed to any alerts for this
                            equipment yet.
                        </Alert>
                    ) : (
                        <Box display="flex" flexDirection="column" gap={2}>
                            {alerts.map((alert) => {
                                const typeInfo = getAlertTypeInfo(
                                    alert.alert_type,
                                );
                                return (
                                    <Box
                                        key={alert.id}
                                        sx={{
                                            p: 2,
                                            border: "1px solid #ddd",
                                            borderRadius: 1,
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            bgcolor: alert.enabled
                                                ? "background.paper"
                                                : "action.disabledBackground",
                                        }}
                                    >
                                        <Box flex={1}>
                                            <Box
                                                display="flex"
                                                alignItems="center"
                                                gap={1}
                                                mb={0.5}
                                            >
                                                <Typography
                                                    variant="body1"
                                                    fontWeight="bold"
                                                >
                                                    {typeInfo?.label ||
                                                        alert.alert_type}
                                                </Typography>
                                                {alert.enabled && (
                                                    <Chip
                                                        icon={
                                                            <NotificationsActive />
                                                        }
                                                        label="Active"
                                                        size="small"
                                                        color="success"
                                                    />
                                                )}
                                            </Box>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                {typeInfo?.description}
                                            </Typography>
                                            {alert.alert_type ===
                                                "calibration_due" && (
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                >
                                                    Notify{" "}
                                                    {
                                                        alert.notification_days_before
                                                    }{" "}
                                                    days before due
                                                </Typography>
                                            )}
                                        </Box>
                                        <Box
                                            display="flex"
                                            alignItems="center"
                                            gap={1}
                                        >
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={alert.enabled}
                                                        onChange={() =>
                                                            handleToggleAlert(
                                                                alert.id,
                                                                alert.enabled,
                                                            )
                                                        }
                                                        disabled={loading}
                                                    />
                                                }
                                                label=""
                                            />
                                            <Button
                                                size="small"
                                                color="error"
                                                onClick={() =>
                                                    handleUnsubscribe(alert.id)
                                                }
                                                disabled={loading}
                                            >
                                                Remove
                                            </Button>
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    )}
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* Subscribe to New Alert */}
                <Box>
                    <Typography variant="subtitle1" gutterBottom>
                        Subscribe to New Alert
                    </Typography>
                    {availableAlertTypes.length === 0 ? (
                        <Alert severity="success">
                            You're subscribed to all available alert types!
                        </Alert>
                    ) : (
                        <Box display="flex" flexDirection="column" gap={2}>
                            <TextField
                                select
                                label="Alert Type"
                                value={selectedAlertType}
                                onChange={(e) =>
                                    setSelectedAlertType(e.target.value)
                                }
                                fullWidth
                                disabled={loading}
                            >
                                <MenuItem value="">
                                    <em>Select an alert type</em>
                                </MenuItem>
                                {availableAlertTypes.map((type) => (
                                    <MenuItem
                                        key={type.value}
                                        value={type.value}
                                    >
                                        <Box>
                                            <Typography variant="body2">
                                                {type.label}
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                            >
                                                {type.description}
                                            </Typography>
                                        </Box>
                                    </MenuItem>
                                ))}
                            </TextField>

                            {selectedAlertType === "calibration_due" && (
                                <TextField
                                    type="number"
                                    label="Notify Days Before"
                                    value={notificationDays}
                                    onChange={(e) =>
                                        setNotificationDays(
                                            parseInt(e.target.value) || 7,
                                        )
                                    }
                                    fullWidth
                                    disabled={loading}
                                    helperText="Number of days before calibration due date to receive notification"
                                    InputProps={{
                                        inputProps: { min: 1, max: 365 },
                                    }}
                                />
                            )}

                            <Button
                                variant="contained"
                                onClick={handleSubscribe}
                                disabled={!selectedAlertType || loading}
                                startIcon={<NotificationsIcon />}
                            >
                                Subscribe
                            </Button>
                        </Box>
                    )}
                </Box>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

export default EquipmentAlertManager;
