import { useState, useEffect } from "react";
import {
    Stack,
    Typography,
    Button,
    Divider,
    Box,
    Chip,
    IconButton,
    Grid,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CategoryIcon from "@mui/icons-material/Category";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import RepeatIcon from "@mui/icons-material/Repeat";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import DoNotDisturbIcon from "@mui/icons-material/DoNotDisturb";
import RemoveRoadIcon from "@mui/icons-material/RemoveRoad";
import EditNoteIcon from "@mui/icons-material/EditNote";
import EditRoadIcon from "@mui/icons-material/EditRoad";
import EditCalendarOutlinedIcon from "@mui/icons-material/EditCalendarOutlined";
import axios from "axios";

import { useAuth } from "../../../Utilites/AuthContext";
import ImageViewer from "../../../Components/ImageViewer";
import AddToCalendarButton from "../../../Components/AddToCalendarButton";
import StatusChip from "../UI/StatusChip";
import DetailField from "../UI/DetailField";
import ResponsiveDialog from "../UI/ResponsiveDialog";
import useResponsive from "../../../hooks/useResponsive";

/**
 * Reservation detail card, shown from the calendars.
 *
 * Rendered inside a chromeless dialog, so it draws its own header and footer.
 *
 * Editing or cancelling a recurring reservation first asks which occurrences
 * to affect. Those two prompts used to be two separate near-identical inline
 * dialogs; they now share `RecurrenceScopeDialog`.
 */

const SCOPE_OPTIONS = {
    cancel: {
        title: "Cancel recurring reservation",
        subtitle: "Which occurrences should be cancelled?",
        icon: <DeleteSweepIcon />,
        accent: "error",
        options: [
            {
                key: "all",
                label: "All occurrences",
                hint: "Cancels the whole series, past and future",
                icon: <DeleteSweepIcon />,
            },
            {
                key: "following",
                label: "This and all following",
                hint: "Keeps earlier occurrences, cancels the rest",
                icon: <RemoveRoadIcon />,
            },
            {
                key: "this",
                label: "This occurrence only",
                hint: "Leaves the rest of the series alone",
                icon: <DoNotDisturbIcon />,
            },
        ],
    },
    edit: {
        title: "Edit recurring reservation",
        subtitle: "Which occurrences should the changes apply to?",
        icon: <EditCalendarOutlinedIcon />,
        accent: "primary",
        options: [
            {
                key: "all",
                label: "All occurrences",
                hint: "Applies the change to the whole series",
                icon: <EditRoadIcon />,
            },
            {
                key: "following",
                label: "This and all following",
                hint: "Leaves earlier occurrences unchanged",
                icon: <EditRoadIcon />,
            },
            {
                key: "this",
                label: "This occurrence only",
                hint: "Splits this one out of the series",
                icon: <EditNoteIcon />,
            },
        ],
    },
};

function RecurrenceScopeDialog({ open, onClose, mode, onSelect, context }) {
    const config = SCOPE_OPTIONS[mode];

    return (
        <ResponsiveDialog
            open={open}
            onClose={onClose}
            title={config.title}
            subtitle={config.subtitle}
            icon={config.icon}
            accent={config.accent}
            maxWidth="xs"
            fullScreen={false}
            actions={
                <Button onClick={onClose} variant="outlined" fullWidth>
                    Never mind
                </Button>
            }
        >
            {context && (
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                >
                    {context}
                </Typography>
            )}

            <Stack spacing={1}>
                {config.options.map((option) => (
                    <Box
                        key={option.key}
                        component="button"
                        type="button"
                        onClick={() => onSelect(option.key)}
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                            width: "100%",
                            textAlign: "left",
                            font: "inherit",
                            cursor: "pointer",
                            px: 2,
                            py: 1.5,
                            borderRadius: 2.5,
                            border: "1px solid",
                            borderColor: "divider",
                            bgcolor: "background.paper",
                            transition:
                                "border-color 160ms ease, background-color 160ms ease, transform 160ms ease",
                            "&:hover": {
                                borderColor: `${config.accent}.main`,
                                bgcolor: `${config.accent}.50`,
                            },
                            "&:active": { transform: "scale(0.99)" },
                        }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                color: `${config.accent}.main`,
                                "& svg": { fontSize: 20 },
                            }}
                        >
                            {option.icon}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography
                                variant="body2"
                                sx={{ fontWeight: 650 }}
                            >
                                {option.label}
                            </Typography>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                            >
                                {option.hint}
                            </Typography>
                        </Box>
                    </Box>
                ))}
            </Stack>
        </ResponsiveDialog>
    );
}

const DisplayCheckout = ({
    checkout,
    equipment,
    handleExit,
    setUpdate,
    setUpdateMode,
    handleUpdateEvent,
}) => {
    const { user } = useAuth();
    const { isCompact } = useResponsive();
    const [cancelScopeOpen, setCancelScopeOpen] = useState(false);
    const [editScopeOpen, setEditScopeOpen] = useState(false);
    const [equipmentImage, setEquipmentImage] = useState(null);
    const [bookerInfo, setBookerInfo] = useState(null);

    useEffect(() => {
        if (equipment?.image_url) fetchEquipmentImage();
        if (checkout?.user_id) fetchBookerInfo();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [equipment, checkout]);

    const authHeaders = () => ({
        headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
    });

    const fetchEquipmentImage = async () => {
        try {
            const response = await axios.get(
                `/api/equipment/${equipment.id}/image`,
                { ...authHeaders(), responseType: "blob" },
            );
            setEquipmentImage(URL.createObjectURL(response.data));
        } catch (error) {
            console.error("Error fetching equipment image:", error);
        }
    };

    const fetchBookerInfo = async () => {
        try {
            const response = await axios.get(
                `/api/users/${checkout.user_id}`,
                authHeaders(),
            );
            setBookerInfo(response.data);
        } catch (error) {
            console.error("Error fetching booker info:", error);
        }
    };

    if (!checkout || !equipment) return null;

    const start = new Date(checkout.start_time);
    const end = new Date(checkout.end_time);

    const timeLabel = (date) =>
        date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
        });

    // ---- Mutations --------------------------------------------------------

    const cancelWithScope = async (updateMode) => {
        try {
            const body = {
                status: "cancelled",
                user_id: user?.id,
            };
            // Every scope has to go through as `updateMode`, exactly as the
            // edit flow does. Omitting it for "this occurrence only" left the
            // API with a virtual occurrence id, a recurrence and no mode, so
            // none of its recurring branches matched: the request fell through
            // to the plain single-checkout path and cancelled the HEAD row,
            // taking the entire series with it.
            if (updateMode) {
                body.updateMode = updateMode;
                body.occurrence_start_time =
                    checkout.start_time || checkout.start;
            }

            await axios.put(
                `/api/checkouts/${checkout.id}`,
                body,
                authHeaders(),
            );
            setUpdate((prev) => prev + 1);
            handleExit();
        } catch (error) {
            console.error("Error cancelling reservation:", error);
        } finally {
            setCancelScopeOpen(false);
        }
    };

    const handleCancel = () => {
        if (checkout.recurrence_id) setCancelScopeOpen(true);
        else cancelWithScope(null);
    };

    const handleEdit = () => {
        if (checkout.recurrence_id) {
            setEditScopeOpen(true);
        } else {
            setUpdateMode(null);
            handleUpdateEvent();
        }
    };

    const applyEditScope = (scope) => {
        // "this" / "following" / "all" — the same vocabulary the edit form's
        // scope selector uses, so the chosen scope shows up pre-selected there.
        // (This used to send "current" / "next", which the API also accepts but
        // which left that selector rendering blank.)
        setUpdateMode(scope);
        setEditScopeOpen(false);
        handleUpdateEvent();
    };

    const canManage =
        user?.admin || user?.equipment_admin || user?.id === checkout.user_id;

    const bookerName = bookerInfo
        ? `${bookerInfo.first_name} ${bookerInfo.last_name}`
        : null;

    return (
        <>
            <RecurrenceScopeDialog
                open={cancelScopeOpen}
                onClose={() => setCancelScopeOpen(false)}
                mode="cancel"
                onSelect={cancelWithScope}
                context={`${equipment?.name} · ${start.toLocaleDateString()}`}
            />

            <RecurrenceScopeDialog
                open={editScopeOpen}
                onClose={() => setEditScopeOpen(false)}
                mode="edit"
                onSelect={applyEditScope}
                context={`${equipment?.name} · ${start.toLocaleDateString()}`}
            />

            <Box sx={{ display: "flex", flexDirection: "column" }}>
                {/* ---- Header ---- */}
                <Box
                    sx={{
                        position: "relative",
                        px: { xs: 2, sm: 3 },
                        pt: { xs: 2.5, sm: 3 },
                        pb: 2.5,
                        bgcolor: "grey.50",
                        borderBottom: "1px solid",
                        borderColor: "divider",
                    }}
                >
                    <IconButton
                        aria-label="Close"
                        onClick={handleExit}
                        size="small"
                        sx={{
                            position: "absolute",
                            top: 10,
                            right: 10,
                            color: "text.secondary",
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>

                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={2}
                        alignItems={{ xs: "flex-start", sm: "center" }}
                    >
                        <Box sx={{ flexGrow: 1, minWidth: 0, pr: 4 }}>
                            <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                                sx={{ mb: 0.5, flexWrap: "wrap", gap: 0.75 }}
                            >
                                <StatusChip status={checkout.status} />
                                {checkout.recurrence_id && (
                                    <Chip
                                        size="small"
                                        icon={
                                            <RepeatIcon
                                                sx={{
                                                    fontSize:
                                                        "14px !important",
                                                }}
                                            />
                                        }
                                        label="Recurring"
                                        variant="outlined"
                                    />
                                )}
                            </Stack>

                            <Typography variant="h4" sx={{ lineHeight: 1.25 }}>
                                {equipment?.name}
                            </Typography>

                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 0.25 }}
                            >
                                {start.toLocaleDateString("en-US", {
                                    weekday: "long",
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                })}
                            </Typography>
                        </Box>

                        {equipment?.image_url && equipmentImage && (
                            <ImageViewer
                                src={equipmentImage}
                                alt={`${equipment?.name}`}
                                style={{
                                    width: isCompact ? "100%" : 96,
                                    height: isCompact ? 96 : 64,
                                    objectFit: "cover",
                                    borderRadius: 10,
                                }}
                            />
                        )}
                    </Stack>

                    <Stack
                        direction="row"
                        spacing={2}
                        sx={{ mt: 2, flexWrap: "wrap", gap: 1.5 }}
                    >
                        <Stack
                            direction="row"
                            spacing={0.75}
                            alignItems="center"
                        >
                            <ScheduleOutlinedIcon
                                sx={{ fontSize: 17, color: "primary.main" }}
                            />
                            <Typography
                                variant="subtitle1"
                                sx={{ letterSpacing: "0.01em" }}
                            >
                                {timeLabel(start)} – {timeLabel(end)}
                            </Typography>
                        </Stack>

                        {equipment?.location && (
                            <Stack
                                direction="row"
                                spacing={0.75}
                                alignItems="center"
                            >
                                <PlaceOutlinedIcon
                                    sx={{ fontSize: 17, color: "text.disabled" }}
                                />
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    {equipment.location}
                                </Typography>
                            </Stack>
                        )}
                    </Stack>

                    {(equipment.serial_number || equipment.asset_number) && (
                        <Stack
                            direction="row"
                            spacing={0.75}
                            sx={{ mt: 1.5, flexWrap: "wrap", gap: 0.75 }}
                        >
                            {equipment.serial_number && (
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    icon={
                                        <CategoryIcon
                                            sx={{ fontSize: "13px !important" }}
                                        />
                                    }
                                    label={`SN ${equipment.serial_number}`}
                                />
                            )}
                            {equipment.asset_number && (
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    icon={
                                        <CategoryIcon
                                            sx={{ fontSize: "13px !important" }}
                                        />
                                    }
                                    label={`AN ${equipment.asset_number}`}
                                />
                            )}
                        </Stack>
                    )}
                </Box>

                {/* ---- Details ---- */}
                <Box sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
                    <Grid container spacing={2.5}>
                        <Grid item xs={12} sm={6}>
                            <DetailField
                                label={
                                    checkout.scheduled_on_behalf_of
                                        ? "Scheduled for"
                                        : "Booked by"
                                }
                                value={
                                    checkout.scheduled_on_behalf_of ||
                                    bookerName
                                }
                            />
                        </Grid>

                        {checkout.scheduled_on_behalf_of && bookerName && (
                            <Grid item xs={12} sm={6}>
                                <DetailField
                                    label="Booked by"
                                    value={bookerName}
                                />
                            </Grid>
                        )}

                        <Grid item xs={12} sm={6}>
                            <DetailField
                                label="Project number"
                                value={checkout.project_number}
                                hideEmpty
                            />
                        </Grid>

                        {checkout.repeats && (
                            <Grid item xs={12} sm={6}>
                                <DetailField
                                    label="Repeats"
                                    value={checkout.repeats}
                                />
                            </Grid>
                        )}

                        {checkout.approved_by_user_id && (
                            <Grid item xs={12} sm={6}>
                                <DetailField label="Approval" value="Approved" />
                            </Grid>
                        )}

                        {checkout.CheckoutCreatedBy && (
                            <Grid item xs={12} sm={6}>
                                <DetailField
                                    label="Created by"
                                    value={`${checkout.CheckoutCreatedBy.first_name} ${checkout.CheckoutCreatedBy.last_name}`}
                                />
                            </Grid>
                        )}

                        {checkout.CheckoutUpdatedBy && (
                            <Grid item xs={12} sm={6}>
                                <DetailField
                                    label="Updated by"
                                    value={`${checkout.CheckoutUpdatedBy.first_name} ${checkout.CheckoutUpdatedBy.last_name}`}
                                />
                            </Grid>
                        )}
                    </Grid>

                    {checkout.notes && (
                        <>
                            <Divider sx={{ my: 2.5 }} />
                            <DetailField
                                label="Notes"
                                value={checkout.notes}
                            />
                        </>
                    )}
                </Box>

                {/* ---- Actions ---- */}
                <Divider />
                <Stack
                    direction={{ xs: "column-reverse", sm: "row" }}
                    spacing={1}
                    sx={{
                        px: { xs: 2, sm: 3 },
                        py: 2,
                        pb: {
                            xs: "calc(16px + env(safe-area-inset-bottom))",
                            sm: 2,
                        },
                        justifyContent: "flex-end",
                        "& .MuiButton-root": {
                            width: { xs: "100%", sm: "auto" },
                        },
                    }}
                >
                    <AddToCalendarButton checkout={checkout} />
                    {canManage && (
                        <>
                            <Button
                                variant="outlined"
                                color="error"
                                onClick={handleCancel}
                                startIcon={<DeleteOutlineIcon />}
                            >
                                Cancel reservation
                            </Button>
                            <Button
                                variant="contained"
                                onClick={handleEdit}
                                startIcon={<EditIcon />}
                            >
                                Edit
                            </Button>
                        </>
                    )}
                </Stack>
            </Box>
        </>
    );
};

export default DisplayCheckout;
