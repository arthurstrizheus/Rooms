import React, { useState, useEffect } from "react";
import {
    Typography,
    Box,
    Switch,
    Button,
    TextField,
    MenuItem,
    IconButton,
    Tooltip,
    Stack,
    Collapse,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/NotificationsOutlined";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOffOutlined";
import AddAlertIcon from "@mui/icons-material/AddAlert";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import axios from "axios";

import { useSocket } from "../../../../Contexts/SocketContext";
import ConfirmDialog from "../../../../Components/ConfirmDialog";
import useConfirmDialog from "../../../../hooks/useConfirmDialog";
import {
    showError,
    showSuccess,
} from "../../../../Utilites/Functions/ApiFunctions";
import SectionCard from "../../../Components/UI/SectionCard";
import EmptyState from "../../../Components/UI/EmptyState";
import ResponsiveDialog from "../../../Components/UI/ResponsiveDialog";
import { RowSkeleton } from "../../../Components/UI/Skeletons";
import { Stagger } from "../../../Components/UI/motion";

const ALL_ALERT_TYPES = [
    {
        value: "all_alerts",
        label: "All alerts",
        description: "Every event related to this equipment",
        requiresBooking: true,
    },
    {
        value: "checkout_created",
        label: "Reservation created",
        description: "When someone creates a reservation",
        requiresBooking: true,
    },
    {
        value: "checkout_cancelled",
        label: "Reservation cancelled",
        description: "When a reservation is cancelled",
        requiresBooking: true,
    },
    {
        value: "equipment_returned",
        label: "Equipment returned",
        description: "When equipment is returned and available",
        requiresBooking: true,
    },
    {
        value: "calibration_due",
        label: "Calibration due",
        description: "Ahead of the calibration due date",
        requiresBooking: false,
    },
    {
        value: "status_change",
        label: "Status change",
        description: "When the equipment status changes",
        requiresBooking: false,
    },
];

/**
 * Per-equipment email alert subscriptions.
 *
 * The subscribe dialog is owned by the parent page (it's also reachable from
 * the page header), so `openDialog` / `setOpenDialog` come in as props.
 */
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

    const alertTypes = canBook
        ? ALL_ALERT_TYPES
        : ALL_ALERT_TYPES.filter((type) => !type.requiresBooking);

    useEffect(() => {
        if (!canBook && alertTypes.length > 0) {
            setNewAlertType(alertTypes[0].value);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canBook]);

    useEffect(() => {
        fetchMyAlerts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [equipmentId]);

    useEffect(() => {
        if (!socket?.connected) return undefined;

        const handleMessage = ({ message, data }) => {
            if (
                message === "alert_subscribed" ||
                message === "alert_updated" ||
                message === "alert_deleted"
            ) {
                if (data?.equipment_id === parseInt(equipmentId, 10)) {
                    fetchMyAlerts();
                }
            }
        };

        socket.on("message", handleMessage);
        return () => socket.off("message", handleMessage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, equipmentId]);

    const authHeaders = () => ({
        headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
    });

    const fetchMyAlerts = async () => {
        try {
            const response = await axios.get(
                "/api/equipment-alerts/my-alerts",
                authHeaders(),
            );
            setMyAlerts(
                response.data.filter(
                    (alert) =>
                        alert.equipment_id === parseInt(equipmentId, 10),
                ),
            );
        } catch (error) {
            console.error("Error fetching alerts:", error);
            showError("Failed to load alert subscriptions");
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async () => {
        try {
            await axios.post(
                "/api/equipment-alerts/subscribe",
                {
                    equipment_id: parseInt(equipmentId, 10),
                    alert_type: newAlertType,
                    notification_days_before: notificationDays,
                },
                authHeaders(),
            );
            showSuccess("Successfully subscribed to alerts");
            setOpenDialog(false);
            setNotificationDays(30);
            fetchMyAlerts();
            onSubscribeSuccess?.();
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
            if (currentEnabled) {
                await axios.patch(
                    `/api/equipment-alerts/unsubscribe/${alertId}`,
                    {},
                    authHeaders(),
                );
                showSuccess("Alert disabled");
            } else {
                await axios.patch(
                    `/api/equipment-alerts/${alertId}`,
                    { enabled: true },
                    authHeaders(),
                );
                showSuccess("Alert enabled");
            }
            fetchMyAlerts();
        } catch (error) {
            console.error("Error toggling alert:", error);
            showError("Failed to update alert");
        }
    };

    const handleDeleteAlert = (alertId) =>
        showConfirm(
            "Are you sure you want to permanently unsubscribe from this alert?",
            () => deleteAlert(alertId),
            "warning",
            "Unsubscribe from Alert",
            "Unsubscribe",
        );

    const deleteAlert = async (alertId) => {
        try {
            await axios.delete(
                `/api/equipment-alerts/${alertId}`,
                authHeaders(),
            );
            showSuccess("Successfully unsubscribed from alert");
            fetchMyAlerts();
            onSubscribeSuccess?.();
        } catch (error) {
            console.error("Error deleting alert:", error);
            showError("Failed to unsubscribe from alert");
        }
    };

    const getAlertTypeInfo = (alertType) =>
        alertTypes.find((at) => at.value === alertType) || {
            label: alertType,
            description: "",
        };

    const enabledCount = myAlerts.filter((a) => a.enabled).length;

    return (
        <SectionCard
            title="Alert subscriptions"
            subtitle={
                myAlerts.length > 0
                    ? `${enabledCount} of ${myAlerts.length} active`
                    : "Email me when things change"
            }
            icon={<NotificationsIcon />}
            action={
                <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddAlertIcon sx={{ fontSize: 17 }} />}
                    onClick={() => setOpenDialog(true)}
                >
                    Subscribe
                </Button>
            }
        >
            {loading ? (
                <RowSkeleton count={2} height={58} />
            ) : myAlerts.length === 0 ? (
                <EmptyState
                    variant="compact"
                    icon={<NotificationsOffIcon />}
                    title="No subscriptions yet"
                    description="Subscribe to get email notifications about this equipment."
                    action={{
                        label: "Subscribe to alerts",
                        icon: <AddAlertIcon />,
                        onClick: () => setOpenDialog(true),
                    }}
                />
            ) : (
                <Stagger step={40} max={8}>
                    {myAlerts.map((alert) => {
                        const typeInfo = getAlertTypeInfo(alert.alert_type);
                        return (
                            <Stack
                                key={alert.id}
                                direction="row"
                                spacing={1.5}
                                alignItems="center"
                                sx={{
                                    p: 1.75,
                                    mb: 1,
                                    borderRadius: 2.5,
                                    border: "1px solid",
                                    borderColor: alert.enabled
                                        ? "primary.100"
                                        : "divider",
                                    bgcolor: alert.enabled
                                        ? "primary.50"
                                        : "transparent",
                                    transition:
                                        "background-color 200ms ease, border-color 200ms ease",
                                }}
                            >
                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                    <Typography variant="subtitle2">
                                        {typeInfo.label}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ display: "block" }}
                                    >
                                        {typeInfo.description}
                                        {alert.alert_type ===
                                            "calibration_due" &&
                                            alert.notification_days_before &&
                                            ` · ${alert.notification_days_before} days before`}
                                    </Typography>
                                </Box>

                                <Tooltip
                                    title={
                                        alert.enabled
                                            ? "Disable this alert"
                                            : "Enable this alert"
                                    }
                                >
                                    <Switch
                                        checked={alert.enabled}
                                        onChange={() =>
                                            handleToggleAlert(
                                                alert.id,
                                                alert.enabled,
                                            )
                                        }
                                        inputProps={{
                                            "aria-label": `${typeInfo.label} alert`,
                                        }}
                                    />
                                </Tooltip>

                                <Tooltip title="Unsubscribe permanently">
                                    <IconButton
                                        onClick={() =>
                                            handleDeleteAlert(alert.id)
                                        }
                                        size="small"
                                        aria-label={`Unsubscribe from ${typeInfo.label}`}
                                        sx={{ color: "error.main" }}
                                    >
                                        <DeleteIcon sx={{ fontSize: 19 }} />
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                        );
                    })}
                </Stagger>
            )}

            <ResponsiveDialog
                open={openDialog || false}
                onClose={() => setOpenDialog(false)}
                title="Subscribe to alerts"
                subtitle="We'll email you when this happens."
                icon={<AddAlertIcon />}
                maxWidth="sm"
                actions={
                    <>
                        <Button
                            variant="outlined"
                            onClick={() => setOpenDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSubscribe} variant="contained">
                            Subscribe
                        </Button>
                    </>
                }
            >
                <Stack spacing={2}>
                    <TextField
                        select
                        fullWidth
                        label="Alert type"
                        value={newAlertType}
                        onChange={(e) => setNewAlertType(e.target.value)}
                        SelectProps={{
                            // Keep the closed field on one line even though each
                            // option renders two.
                            renderValue: (value) =>
                                getAlertTypeInfo(value).label,
                        }}
                    >
                        {alertTypes.map((type) => (
                            <MenuItem
                                key={type.value}
                                value={type.value}
                                sx={{ display: "block", py: 1 }}
                            >
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {type.label}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    {type.description}
                                </Typography>
                            </MenuItem>
                        ))}
                    </TextField>

                    <Collapse
                        in={newAlertType === "calibration_due"}
                        timeout={280}
                    >
                        <TextField
                            type="number"
                            fullWidth
                            label="Notify days before"
                            value={notificationDays}
                            onChange={(e) =>
                                setNotificationDays(
                                    parseInt(e.target.value, 10) || 30,
                                )
                            }
                            helperText="First notice this many days before the due date, then weekly until due and bi-weekly after."
                            InputProps={{ inputProps: { min: 1, max: 365 } }}
                        />
                    </Collapse>
                </Stack>
            </ResponsiveDialog>

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
        </SectionCard>
    );
};

export default AlertsCard;
