import React, { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    Typography,
    Box,
    Switch,
    FormControlLabel,
    Divider,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Chip,
    IconButton,
    Tooltip,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import AddAlertIcon from "@mui/icons-material/AddAlert";
import DeleteIcon from "@mui/icons-material/Delete";
import axios from "axios";
import { useSocket } from "../../../../Contexts/SocketContext";
import ConfirmDialog from "../../../../Components/ConfirmDialog";
import useConfirmDialog from "../../../../hooks/useConfirmDialog";
import {
    showError,
    showSuccess,
} from "../../../../Utilites/Functions/ApiFunctions";

const AlertsCard = ({
    equipmentId,
    canBook = true,
    openDialog,
    setOpenDialog,
    onSubscribeSuccess,
}) => {
    const [myAlerts, setMyAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newAlertType, setNewAlertType] = useState("checkout_created");
    const [notificationDays, setNotificationDays] = useState(30);
    const { socket } = useSocket();
    const { showConfirm, confirmState, hideConfirm } = useConfirmDialog();

    // Define all alert types
    const allAlertTypes = [
        {
            value: "all_alerts",
            label: "All Alerts",
            description:
                "Get notified for all events related to this equipment",
            requiresBooking: true,
        },
        {
            value: "checkout_created",
            label: "Reservation Created",
            description: "Notify when someone creates a reservation",
            requiresBooking: true,
        },
        {
            value: "checkout_cancelled",
            label: "Reservation Cancelled",
            description: "Notify when a reservation is cancelled",
            requiresBooking: true,
        },
        {
            value: "equipment_returned",
            label: "Equipment Returned",
            description: "Notify when equipment is returned and available",
            requiresBooking: true,
        },
        {
            value: "calibration_due",
            label: "Calibration Due",
            description: "Notify before calibration is due",
            requiresBooking: false,
        },
        {
            value: "status_change",
            label: "Status Change",
            description: "Notify when equipment status changes",
            requiresBooking: false,
        },
    ];

    // Filter alert types based on whether equipment can be booked
    const alertTypes = canBook
        ? allAlertTypes
        : allAlertTypes.filter((type) => !type.requiresBooking);

    // Set default alert type based on available options
    useEffect(() => {
        if (!canBook && alertTypes.length > 0) {
            setNewAlertType(alertTypes[0].value);
        }
    }, [canBook]);

    useEffect(() => {
        fetchMyAlerts();
    }, [equipmentId]);

    // Socket listener for real-time alert updates
    useEffect(() => {
        if (!socket?.connected) return;

        const handleMessage = (payload) => {
            const { message, data } = payload;

            switch (message) {
                case "alert_subscribed":
                case "alert_updated":
                case "alert_deleted":
                    // Refresh alerts if they belong to this equipment
                    if (data?.equipment_id === parseInt(equipmentId)) {
                        fetchMyAlerts();
                    }
                    break;
                default:
                    break;
            }
        };

        socket.on("message", handleMessage);
        return () => socket.off("message", handleMessage);
    }, [socket, equipmentId]);

    const fetchMyAlerts = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.get(
                "/api/equipment-alerts/my-alerts",
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );

            // Filter alerts for this equipment
            const equipmentAlerts = response.data.filter(
                (alert) => alert.equipment_id === parseInt(equipmentId),
            );
            setMyAlerts(equipmentAlerts);
        } catch (error) {
            console.error("Error fetching alerts:", error);
            showError("Failed to load alert subscriptions");
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async () => {
        try {
            const token = localStorage.getItem("authToken");
            await axios.post(
                "/api/equipment-alerts/subscribe",
                {
                    equipment_id: parseInt(equipmentId),
                    alert_type: newAlertType,
                    notification_days_before: notificationDays,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );

            showSuccess("Successfully subscribed to alerts");
            setOpenDialog(false);
            setNotificationDays(30);
            fetchMyAlerts();
            if (onSubscribeSuccess) {
                onSubscribeSuccess();
            }
        } catch (error) {
            console.error("Error subscribing:", error);
            showError(
                error.response?.data?.message ||
                    "Failed to subscribe to alerts",
            );
        }
    };

    const handleToggleAlert = async (alertId, currentEnabled) => {
        try {
            const token = localStorage.getItem("authToken");
            if (currentEnabled) {
                // Unsubscribe
                await axios.patch(
                    `/api/equipment-alerts/unsubscribe/${alertId}`,
                    {},
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    },
                );
                showSuccess("Alert disabled");
            } else {
                // Re-enable
                await axios.patch(
                    `/api/equipment-alerts/${alertId}`,
                    { enabled: true },
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    },
                );
                showSuccess("Alert enabled");
            }
            fetchMyAlerts();
        } catch (error) {
            console.error("Error toggling alert:", error);
            showError("Failed to update alert");
        }
    };

    const handleDeleteAlert = async (alertId) => {
        showConfirm(
            "Are you sure you want to permanently unsubscribe from this alert?",
            async () => {
                await deleteAlert(alertId);
            },
            "warning",
            "Unsubscribe from Alert",
            "Unsubscribe",
        );
    };

    const deleteAlert = async (alertId) => {
        try {
            const token = localStorage.getItem("authToken");
            await axios.delete(`/api/equipment-alerts/${alertId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            showSuccess("Successfully unsubscribed from alert");
            fetchMyAlerts();
            if (onSubscribeSuccess) {
                onSubscribeSuccess();
            }
        } catch (error) {
            console.error("Error deleting alert:", error);
            showError("Failed to unsubscribe from alert");
        }
    };

    const getAlertTypeInfo = (alertType) => {
        return (
            alertTypes.find((at) => at.value === alertType) || {
                label: alertType,
                description: "",
            }
        );
    };

    return (
        <Card>
            <CardContent>
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 2,
                    }}
                >
                    <Typography
                        variant="h6"
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                    >
                        <NotificationsIcon />
                        Alert Subscriptions
                    </Typography>
                </Box>

                <Divider sx={{ mb: 2 }} />

                {loading ? (
                    <Typography color="text.secondary">Loading...</Typography>
                ) : myAlerts.length === 0 ? (
                    <Box sx={{ textAlign: "center", py: 3 }}>
                        <NotificationsOffIcon
                            sx={{
                                fontSize: 48,
                                color: "text.secondary",
                                mb: 1,
                            }}
                        />
                        <Typography color="text.secondary">
                            No alert subscriptions yet
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Subscribe to get email notifications about this
                            equipment
                        </Typography>
                    </Box>
                ) : (
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                        }}
                    >
                        {myAlerts.map((alert) => {
                            const typeInfo = getAlertTypeInfo(alert.alert_type);
                            return (
                                <Box
                                    key={alert.id}
                                    sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        p: 1.5,
                                        border: "1px solid",
                                        borderColor: "divider",
                                        borderRadius: 1,
                                    }}
                                >
                                    <Box sx={{ flex: 1 }}>
                                        <Typography
                                            variant="subtitle2"
                                            fontWeight="bold"
                                        >
                                            {typeInfo.label}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            {typeInfo.description}
                                        </Typography>
                                    </Box>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                        }}
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
                                                    color="primary"
                                                />
                                            }
                                            label={
                                                alert.enabled
                                                    ? "Enabled"
                                                    : "Disabled"
                                            }
                                        />
                                        <Tooltip title="Unsubscribe permanently">
                                            <IconButton
                                                onClick={() =>
                                                    handleDeleteAlert(alert.id)
                                                }
                                                color="error"
                                                size="small"
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                )}
            </CardContent>

            <Dialog
                open={openDialog || false}
                onClose={() => setOpenDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Subscribe to Alerts</DialogTitle>
                <DialogContent>
                    <TextField
                        select
                        fullWidth
                        label="Alert Type"
                        value={newAlertType}
                        onChange={(e) => setNewAlertType(e.target.value)}
                        sx={{ mt: 2 }}
                    >
                        {alertTypes.map((type) => (
                            <MenuItem key={type.value} value={type.value}>
                                <Box>
                                    <Typography variant="body1">
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
                    {newAlertType === "calibration_due" && (
                        <TextField
                            type="number"
                            fullWidth
                            label="Notify Days Before"
                            value={notificationDays}
                            onChange={(e) =>
                                setNotificationDays(
                                    parseInt(e.target.value) || 30,
                                )
                            }
                            sx={{ mt: 2 }}
                            helperText="Number of days before calibration due date to receive first notification (then weekly until due, bi-weekly after)"
                            InputProps={{
                                inputProps: { min: 1, max: 365 },
                            }}
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleSubscribe} variant="contained">
                        Subscribe
                    </Button>
                </DialogActions>
            </Dialog>
            <ConfirmDialog
                open={confirmState.open}
                onConfirm={confirmState.onConfirm}
                onCancel={hideConfirm}
                message={confirmState.message}
                title={confirmState.title}
                severity={confirmState.severity}
                confirmText={confirmState.confirmText}
                cancelText={confirmState.cancelText}
            />
        </Card>
    );
};

export default AlertsCard;
