import React, { useState, useEffect, useMemo } from "react";
import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    IconButton,
    Button,
    Card,
    Stack,
    Divider,
    TextField,
    MenuItem,
    TableSortLabel,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Autocomplete,
    Grid,
    Chip,
    Tooltip,
    Collapse,
} from "@mui/material";
import {
    Delete,
    CalendarMonth,
    Edit,
    Repeat,
    Science,
    ExpandMore,
    EventNoteOutlined,
    OpenInNewOutlined,
} from "@mui/icons-material";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { format } from "date-fns";

import useEasterEggs from "../../../hooks/useEasterEggs";
import MeatRain from "../../../Components/EasterEggs/MeatRain";
import HiggyRain from "../../../Components/EasterEggs/HiggyRain";
import { useAuth } from "../../../Utilites/AuthContext";
import AlertDialog from "../../../Components/AlertDialog";
import useAlertDialog from "../../../hooks/useAlertDialog";
import ConfirmDialog from "../../../Components/ConfirmDialog";
import useConfirmDialog from "../../../hooks/useConfirmDialog";
import AddToCalendarButton from "../../../Components/AddToCalendarButton";
import useResponsive from "../../../hooks/useResponsive";
import {
    PageHeader,
    PageContainer,
    FilterBar,
    EmptyState,
    StatusChip,
    StatCard,
    SectionCard,
    DetailField,
    ResponsiveDialog,
    RowSkeleton,
    Stagger,
} from "../../Components/UI";

const STATUS_OPTIONS = [
    { value: "all", label: "All statuses" },
    { value: "pending", label: "Pending" },
    { value: "auto-approved", label: "Approved" },
    { value: "reserved", label: "In use" },
    { value: "returned", label: "Returned" },
    { value: "cancelled", label: "Cancelled" },
];

const CANCELLABLE = ["pending", "auto-approved"];

/**
 * The signed-in user's reservations.
 *
 * Recurring and one-time reservations render through one `ReservationSection`
 * rather than two hand-maintained copies, and the status filter — which existed
 * in state but had no control on screen — is now wired into the filter bar.
 */
const MyCheckouts = ({ setLoading, loading }) => {
    const [checkouts, setCheckouts] = useState([]);
    const [fetched, setFetched] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [orderBy, setOrderBy] = useState("start_time");
    const [order, setOrder] = useState("desc");
    const [selectedCheckout, setSelectedCheckout] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editedCheckout, setEditedCheckout] = useState({});
    const [users, setUsers] = useState([]);
    const [showOptionalFields, setShowOptionalFields] = useState(false);
    const [openSections, setOpenSections] = useState({
        recurring: true,
        oneTime: true,
    });

    const { meatRain, higgyRain, handleSearchChange } = useEasterEggs();
    const { user } = useAuth();
    const { showAlert, alertState, hideAlert } = useAlertDialog();
    const { showConfirm, confirmState, hideConfirm } = useConfirmDialog();
    const navigate = useNavigate();
    const { isCompact } = useResponsive();

    // ---- Data -------------------------------------------------------------

    useEffect(() => {
        fetchCheckouts();
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const fetchCheckouts = async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            const token = localStorage.getItem("authToken");
            const response = await axios.get(`/api/checkouts/user/${user.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setCheckouts(response.data);
        } catch (error) {
            console.error("Error fetching checkouts:", error);
        } finally {
            setLoading(false);
            setFetched(true);
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

    const handleCancel = (id) =>
        showConfirm(
            "Are you sure you want to cancel this reservation?",
            () => cancelCheckout(id),
            "warning",
            "Cancel Reservation",
        );

    const cancelCheckout = async (id) => {
        try {
            setLoading(true);
            const token = localStorage.getItem("authToken");
            await axios.put(
                `/api/checkouts/${id}`,
                { status: "cancelled" },
                { headers: { Authorization: `Bearer ${token}` } },
            );
            fetchCheckouts();
        } catch (error) {
            console.error("Error canceling checkout:", error);
        } finally {
            setLoading(false);
        }
    };

    // ---- Details / edit ---------------------------------------------------

    const handleOpenDetails = (checkout) => {
        setSelectedCheckout(checkout);
        setEditedCheckout({
            notes: checkout.notes || "",
            project_number: checkout.project_number || "",
            scheduled_on_behalf_of: checkout.scheduled_on_behalf_of || "",
        });
        setDetailsOpen(true);
        setEditMode(false);
        setShowOptionalFields(false);
    };

    const handleCloseDetails = () => {
        setDetailsOpen(false);
        setSelectedCheckout(null);
        setEditMode(false);
        setEditedCheckout({});
    };

    const handleCancelEdit = () => {
        setEditMode(false);
        setEditedCheckout({
            notes: selectedCheckout.notes || "",
            project_number: selectedCheckout.project_number || "",
            scheduled_on_behalf_of:
                selectedCheckout.scheduled_on_behalf_of || "",
        });
    };

    const handleSaveEdit = async () => {
        if (!editedCheckout.project_number?.trim()) {
            showAlert("Project Number is required", "error");
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem("authToken");
            await axios.put(
                `/api/checkouts/${selectedCheckout.id}`,
                editedCheckout,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            await fetchCheckouts();
            setEditMode(false);
            handleCloseDetails();
        } catch (error) {
            console.error("Error updating reservation:", error);
            showAlert("Failed to update checkout", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleViewEquipment = () => {
        if (selectedCheckout?.Equipment?.id) {
            navigate(`/equipment/${selectedCheckout.Equipment.id}`);
            handleCloseDetails();
        }
    };

    const handleViewCalendar = () => {
        if (selectedCheckout?.Equipment?.id) {
            navigate(`/equipment/calendar/${selectedCheckout.Equipment.id}`);
            handleCloseDetails();
        }
    };

    // ---- Derived ----------------------------------------------------------

    const formatDateTime = (dateString) => {
        try {
            return format(new Date(dateString), "MMM dd, yyyy hh:mm a");
        } catch {
            return dateString;
        }
    };

    const handleSort = (property) => {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    };

    // Dates are searchable in every format they're displayed in, so typing
    // "Jan 22" or "1 PM" finds the right row.
    const dateSearchStrings = (date) =>
        date
            ? [
                  "MMM dd, yyyy",
                  "MMMM dd, yyyy",
                  "MMM dd",
                  "MMMM dd",
                  "h:mm a",
                  "h a",
                  "ha",
                  "hh:mm a",
                  "PP",
                  "PPpp",
              ].map((pattern) => format(date, pattern).toLowerCase())
            : [];

    const filteredCheckouts = useMemo(() => {
        const sorted = [...checkouts].sort((a, b) => {
            let aValue;
            let bValue;

            switch (orderBy) {
                case "equipment":
                    aValue = a.Equipment?.name || "";
                    bValue = b.Equipment?.name || "";
                    break;
                case "start_time":
                case "end_time":
                    aValue = new Date(a[orderBy]);
                    bValue = new Date(b[orderBy]);
                    break;
                case "status":
                    aValue = a.status || "";
                    bValue = b.status || "";
                    break;
                case "notes":
                    aValue = a.notes || "";
                    bValue = b.notes || "";
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) return order === "asc" ? -1 : 1;
            if (aValue > bValue) return order === "asc" ? 1 : -1;
            return 0;
        });

        const search = searchTerm.toLowerCase();

        return sorted.filter((checkout) => {
            const dateStrings = [
                ...dateSearchStrings(
                    checkout.start_time ? new Date(checkout.start_time) : null,
                ),
                ...dateSearchStrings(
                    checkout.end_time ? new Date(checkout.end_time) : null,
                ),
            ];

            const matchesSearch =
                checkout.Equipment?.name?.toLowerCase().includes(search) ||
                checkout.Equipment?.serial_number
                    ?.toLowerCase()
                    .includes(search) ||
                checkout.Equipment?.asset_number
                    ?.toLowerCase()
                    .includes(search) ||
                checkout.Equipment?.location?.toLowerCase().includes(search) ||
                checkout.Equipment?.description
                    ?.toLowerCase()
                    .includes(search) ||
                checkout.notes?.toLowerCase().includes(search) ||
                checkout.project_number?.toLowerCase().includes(search) ||
                checkout.status?.toLowerCase().includes(search) ||
                checkout.approval_notes?.toLowerCase().includes(search) ||
                checkout.ApprovedBy?.first_name
                    ?.toLowerCase()
                    .includes(search) ||
                checkout.ApprovedBy?.last_name?.toLowerCase().includes(search) ||
                dateStrings.some((dateStr) => dateStr.includes(search));

            const matchesStatus =
                statusFilter === "all" || checkout.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [checkouts, searchTerm, statusFilter, orderBy, order]);

    const { recurringCheckouts, nonRecurringCheckouts } = useMemo(() => {
        const recurring = [];
        const nonRecurring = [];
        filteredCheckouts.forEach((checkout) => {
            if (checkout.recurrence_id || checkout.Recurrence) {
                recurring.push(checkout);
            } else {
                nonRecurring.push(checkout);
            }
        });
        return {
            recurringCheckouts: recurring,
            nonRecurringCheckouts: nonRecurring,
        };
    }, [filteredCheckouts]);

    const stats = useMemo(() => {
        const now = new Date();
        return {
            total: checkouts.length,
            pending: checkouts.filter((c) => c.status === "pending").length,
            upcoming: checkouts.filter(
                (c) =>
                    new Date(c.start_time) > now &&
                    c.status !== "cancelled" &&
                    c.status !== "returned",
            ).length,
        };
    }, [checkouts]);

    const getRecurrenceDescription = (checkout) => {
        const recurrence = checkout.Recurrence;
        if (!recurrence) return "Recurring";

        const pattern = recurrence.recurrence_pattern?.toLowerCase();
        const interval = recurrence.separation_count || 1;
        const unit =
            pattern === "daily"
                ? "day"
                : pattern === "weekly"
                  ? "week"
                  : pattern === "monthly"
                    ? "month"
                    : pattern;

        const every =
            interval > 1 ? `Every ${interval} ${unit}s` : `Every ${unit}`;

        return recurrence.end_date
            ? `${every} until ${format(new Date(recurrence.end_date), "PP")}`
            : every;
    };

    const equipmentSubtitle = (checkout) =>
        [checkout.Equipment?.serial_number, checkout.Equipment?.asset_number]
            .filter(Boolean)
            .join(" · ");

    // ---- Rendering --------------------------------------------------------

    // Plain render functions rather than components declared in the render
    // body: an inner component gets a fresh identity every render, so React
    // remounts the whole subtree — which reset the accordions' open state on
    // every keystroke in the search field.
    const renderMobileCard = (checkout, recurring) => (
        <Card
            onClick={() => handleOpenDetails(checkout)}
            sx={{
                mb: 1.5,
                p: 2,
                cursor: "pointer",
                transition: "border-color 160ms ease, transform 160ms ease",
                "&:active": { transform: "scale(0.99)" },
            }}
        >
            <Stack direction="row" spacing={1} alignItems="flex-start">
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ lineHeight: 1.3 }}>
                        {checkout.Equipment?.name || "N/A"}
                    </Typography>
                    {equipmentSubtitle(checkout) && (
                        <Typography
                            variant="caption"
                            color="text.disabled"
                            sx={{ display: "block" }}
                            noWrap
                        >
                            {equipmentSubtitle(checkout)}
                        </Typography>
                    )}
                </Box>
                <StatusChip status={checkout.status} />
            </Stack>

            {recurring && (
                <Stack
                    direction="row"
                    spacing={0.5}
                    alignItems="center"
                    sx={{ mt: 1 }}
                >
                    <Repeat sx={{ fontSize: 14, color: "text.disabled" }} />
                    <Typography variant="caption" color="text.secondary">
                        {getRecurrenceDescription(checkout)}
                    </Typography>
                </Stack>
            )}

            <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: recurring ? 0.5 : 1 }}
            >
                {formatDateTime(checkout.start_time)}
                {!recurring && ` → ${formatDateTime(checkout.end_time)}`}
            </Typography>

            {checkout.project_number && (
                <Chip
                    size="small"
                    variant="outlined"
                    label={checkout.project_number}
                    sx={{ mt: 1.25 }}
                />
            )}
        </Card>
    );

    const sortHeader = (id, label) => (
        <TableCell>
            <TableSortLabel
                active={orderBy === id}
                direction={orderBy === id ? order : "asc"}
                onClick={() => handleSort(id)}
            >
                {label}
            </TableSortLabel>
        </TableCell>
    );

    // Open state lives in the page rather than inside the section, so it
    // survives re-renders and stays correct while filtering.
    const renderReservationSection = ({
        id,
        title,
        icon,
        checkouts: rows,
        recurring,
    }) => {
        if (rows.length === 0) return null;
        const expanded = openSections[id];

        return (
            <Accordion
                key={id}
                expanded={expanded}
                onChange={() =>
                    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }))
                }
            >
                <AccordionSummary expandIcon={<ExpandMore />}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        {icon}
                        <Typography variant="subtitle2">
                            {title} ({rows.length})
                        </Typography>
                    </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ px: { xs: 1.5, sm: 2 }, pb: 2 }}>
                    {isCompact ? (
                        <Stagger step={35} max={10}>
                            {rows.map((checkout) => (
                                <React.Fragment key={checkout.id}>
                                    {renderMobileCard(checkout, recurring)}
                                </React.Fragment>
                            ))}
                        </Stagger>
                    ) : (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        {sortHeader("equipment", "Equipment")}
                                        {sortHeader(
                                            "start_time",
                                            recurring
                                                ? "First occurrence"
                                                : "Start",
                                        )}
                                        {recurring ? (
                                            <TableCell>Pattern</TableCell>
                                        ) : (
                                            sortHeader("end_time", "End")
                                        )}
                                        {sortHeader("status", "Status")}
                                        <TableCell align="right">
                                            Actions
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rows.map((checkout, index) => (
                                        <TableRow
                                            key={checkout.id}
                                            hover
                                            onClick={() =>
                                                handleOpenDetails(checkout)
                                            }
                                            sx={{
                                                cursor: "pointer",
                                                animation:
                                                    "seaFadeIn 240ms ease both",
                                                animationDelay: `${Math.min(index, 15) * 18}ms`,
                                            }}
                                        >
                                            <TableCell>
                                                <Typography
                                                    variant="body2"
                                                    sx={{ fontWeight: 600 }}
                                                >
                                                    {checkout.Equipment?.name ||
                                                        "N/A"}
                                                </Typography>
                                                {equipmentSubtitle(checkout) && (
                                                    <Typography
                                                        variant="caption"
                                                        color="text.disabled"
                                                    >
                                                        {equipmentSubtitle(
                                                            checkout,
                                                        )}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell
                                                sx={{ whiteSpace: "nowrap" }}
                                            >
                                                {formatDateTime(
                                                    checkout.start_time,
                                                )}
                                            </TableCell>
                                            <TableCell
                                                sx={{
                                                    whiteSpace: recurring
                                                        ? "normal"
                                                        : "nowrap",
                                                    color: recurring
                                                        ? "text.secondary"
                                                        : "inherit",
                                                }}
                                            >
                                                {recurring
                                                    ? getRecurrenceDescription(
                                                          checkout,
                                                      )
                                                    : formatDateTime(
                                                          checkout.end_time,
                                                      )}
                                            </TableCell>
                                            <TableCell>
                                                <StatusChip
                                                    status={checkout.status}
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                {CANCELLABLE.includes(
                                                    checkout.status,
                                                ) && (
                                                    <Tooltip title="Cancel reservation">
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleCancel(
                                                                    checkout.id,
                                                                );
                                                            }}
                                                            sx={{
                                                                color: "error.main",
                                                            }}
                                                        >
                                                            <Delete
                                                                sx={{
                                                                    fontSize: 18,
                                                                }}
                                                            />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </AccordionDetails>
            </Accordion>
        );
    };

    // ---- Detail dialog body ----------------------------------------------

    const calibrationDue = (equipment) => {
        if (
            !equipment?.last_calibration_date ||
            !equipment?.calibration_interval_value
        ) {
            return null;
        }
        const dueDate = new Date(equipment.last_calibration_date);
        const interval = equipment.calibration_interval_value;
        switch (equipment.calibration_interval_unit) {
            case "days":
                dueDate.setDate(dueDate.getDate() + interval);
                break;
            case "months":
                dueDate.setMonth(dueDate.getMonth() + interval);
                break;
            case "years":
                dueDate.setFullYear(dueDate.getFullYear() + interval);
                break;
            default:
                break;
        }
        return dueDate;
    };

    const detailBody = () => {
        if (!selectedCheckout) return null;
        const equipment = selectedCheckout.Equipment;
        const dueDate = calibrationDue(equipment);
        const overdue = dueDate && dueDate < new Date();

        return (
            <Stack spacing={2.5}>
                <SectionCard
                    title="Equipment"
                    icon={<Inventory2OutlinedIcon />}
                >
                    <Grid container spacing={2.5}>
                        <Grid item xs={12} sm={6}>
                            <DetailField
                                label="Name"
                                value={equipment?.name}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <DetailField label="Equipment status">
                                <Box sx={{ mt: 0.5 }}>
                                    <StatusChip status={equipment?.status} />
                                </Box>
                            </DetailField>
                        </Grid>
                        <Grid item xs={6} sm={6}>
                            <DetailField
                                label="Serial number"
                                value={equipment?.serial_number}
                                mono
                                hideEmpty
                            />
                        </Grid>
                        <Grid item xs={6} sm={6}>
                            <DetailField
                                label="Asset number"
                                value={equipment?.asset_number}
                                mono
                                hideEmpty
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <DetailField
                                label="Location"
                                value={equipment?.location}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <DetailField
                                label="Description"
                                value={equipment?.description}
                                hideEmpty
                            />
                        </Grid>

                        {dueDate && (
                            <>
                                <Grid item xs={12}>
                                    <Divider />
                                    <Stack
                                        direction="row"
                                        spacing={0.75}
                                        alignItems="center"
                                        sx={{ mt: 2 }}
                                    >
                                        <Science
                                            sx={{
                                                fontSize: 16,
                                                color: "text.disabled",
                                            }}
                                        />
                                        <Typography variant="overline">
                                            Calibration
                                        </Typography>
                                    </Stack>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <DetailField
                                        label="Last calibration"
                                        value={format(
                                            new Date(
                                                equipment.last_calibration_date,
                                            ),
                                            "MMM dd, yyyy",
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <DetailField label="Due">
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                mt: 0.25,
                                                fontWeight: 600,
                                                color: overdue
                                                    ? "error.main"
                                                    : "text.primary",
                                            }}
                                        >
                                            {format(dueDate, "MMM dd, yyyy")}
                                            {overdue && " (overdue)"}
                                        </Typography>
                                    </DetailField>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <DetailField
                                        label="Interval"
                                        value={`Every ${equipment.calibration_interval_value} ${equipment.calibration_interval_unit}`}
                                    />
                                </Grid>
                            </>
                        )}
                    </Grid>
                </SectionCard>

                <SectionCard
                    title="Reservation"
                    icon={<EventNoteOutlined />}
                    action={
                        selectedCheckout.Recurrence && (
                            <Chip
                                icon={
                                    <Repeat
                                        sx={{ fontSize: "14px !important" }}
                                    />
                                }
                                label="Recurring"
                                size="small"
                                sx={{
                                    bgcolor: "primary.50",
                                    color: "primary.dark",
                                    border: "1px solid",
                                    borderColor: "primary.100",
                                }}
                            />
                        )
                    }
                >
                    <Grid container spacing={2.5}>
                        <Grid item xs={12} sm={6}>
                            <DetailField
                                label="Start time"
                                value={formatDateTime(
                                    selectedCheckout.start_time,
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <DetailField
                                label="End time"
                                value={formatDateTime(selectedCheckout.end_time)}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <DetailField label="Project number">
                                {editMode ? (
                                    <TextField
                                        fullWidth
                                        value={
                                            editedCheckout.project_number || ""
                                        }
                                        onChange={(e) =>
                                            setEditedCheckout({
                                                ...editedCheckout,
                                                project_number: e.target.value,
                                            })
                                        }
                                        required
                                        sx={{ mt: 0.75 }}
                                    />
                                ) : (
                                    <Typography
                                        variant="body2"
                                        sx={{ mt: 0.25, fontWeight: 550 }}
                                    >
                                        {selectedCheckout.project_number || "—"}
                                    </Typography>
                                )}
                            </DetailField>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <DetailField label="Reservation status">
                                <Box sx={{ mt: 0.5 }}>
                                    <StatusChip
                                        status={selectedCheckout.status}
                                    />
                                </Box>
                            </DetailField>
                        </Grid>

                        {editMode ? (
                            <Grid item xs={12}>
                                <Button
                                    size="small"
                                    variant="text"
                                    onClick={() =>
                                        setShowOptionalFields((v) => !v)
                                    }
                                    endIcon={
                                        <ExpandMore
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
                                            fullWidth
                                            multiline
                                            rows={2}
                                            value={editedCheckout.notes || ""}
                                            onChange={(e) =>
                                                setEditedCheckout({
                                                    ...editedCheckout,
                                                    notes: e.target.value,
                                                })
                                            }
                                        />

                                        <Autocomplete
                                            freeSolo
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
                                                        editedCheckout.scheduled_on_behalf_of,
                                                ) ||
                                                editedCheckout.scheduled_on_behalf_of ||
                                                null
                                            }
                                            onChange={(_, newValue) =>
                                                setEditedCheckout({
                                                    ...editedCheckout,
                                                    scheduled_on_behalf_of:
                                                        newValue
                                                            ? typeof newValue ===
                                                              "string"
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
                                                <Box
                                                    component="li"
                                                    {...props}
                                                    key={option.id}
                                                >
                                                    <Box sx={{ minWidth: 0 }}>
                                                        <Typography
                                                            variant="body2"
                                                            noWrap
                                                        >
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
                                            isOptionEqualToValue={(
                                                option,
                                                value,
                                            ) => option.id === value?.id}
                                            ListboxProps={{
                                                style: { maxHeight: 250 },
                                            }}
                                            fullWidth
                                        />
                                    </Stack>
                                </Collapse>
                            </Grid>
                        ) : (
                            <>
                                <Grid item xs={12}>
                                    <DetailField
                                        label="Notes"
                                        value={selectedCheckout.notes}
                                        hideEmpty
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <DetailField
                                        label="Scheduled on behalf of"
                                        value={
                                            selectedCheckout.scheduled_on_behalf_of
                                        }
                                        hideEmpty
                                    />
                                </Grid>
                            </>
                        )}

                        {selectedCheckout.Recurrence && (
                            <>
                                <Grid item xs={12}>
                                    <Divider />
                                    <Stack
                                        direction="row"
                                        spacing={0.75}
                                        alignItems="center"
                                        sx={{ mt: 2 }}
                                    >
                                        <Repeat
                                            sx={{
                                                fontSize: 16,
                                                color: "text.disabled",
                                            }}
                                        />
                                        <Typography variant="overline">
                                            Recurrence
                                        </Typography>
                                    </Stack>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <DetailField
                                        label="Pattern"
                                        value={getRecurrenceDescription(
                                            selectedCheckout,
                                        )}
                                    />
                                </Grid>
                                {selectedCheckout.Recurrence
                                    .max_occurrences && (
                                    <Grid item xs={12} sm={6}>
                                        <DetailField
                                            label="Max occurrences"
                                            value={
                                                selectedCheckout.Recurrence
                                                    .max_occurrences
                                            }
                                        />
                                    </Grid>
                                )}
                            </>
                        )}

                        {(selectedCheckout.ApprovedBy ||
                            selectedCheckout.approval_notes) && (
                            <>
                                <Grid item xs={12}>
                                    <Divider />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <DetailField
                                        label="Approved by"
                                        value={
                                            selectedCheckout.ApprovedBy
                                                ? `${selectedCheckout.ApprovedBy.first_name || ""} ${
                                                      selectedCheckout
                                                          .ApprovedBy
                                                          .last_name || ""
                                                  }`.trim()
                                                : null
                                        }
                                        hideEmpty
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <DetailField
                                        label="Approval notes"
                                        value={selectedCheckout.approval_notes}
                                        hideEmpty
                                    />
                                </Grid>
                            </>
                        )}
                    </Grid>
                </SectionCard>
            </Stack>
        );
    };

    const activeFilters =
        statusFilter !== "all"
            ? [
                  {
                      key: "status",
                      label:
                          STATUS_OPTIONS.find((o) => o.value === statusFilter)
                              ?.label || statusFilter,
                      onClear: () => setStatusFilter("all"),
                  },
              ]
            : [];

    const nothingMatches =
        recurringCheckouts.length === 0 && nonRecurringCheckouts.length === 0;

    return (
        <>
            {meatRain && <MeatRain />}
            {higgyRain && <HiggyRain />}

            <PageHeader
                title="My Reservations"
                subtitle={
                    fetched
                        ? `${checkouts.length} reservation${
                              checkouts.length === 1 ? "" : "s"
                          }`
                        : "Loading your reservations…"
                }
                actions={[
                    {
                        key: "browse",
                        label: "Browse equipment",
                        icon: <Inventory2OutlinedIcon />,
                        primary: true,
                        onClick: () => navigate("/equipment"),
                    },
                ]}
            >
                <FilterBar
                    search={searchTerm}
                    onSearchChange={(value) =>
                        handleSearchChange(value, setSearchTerm)
                    }
                    searchPlaceholder="Search equipment, project #, date…"
                    activeFilters={activeFilters}
                    onClearAll={() => setStatusFilter("all")}
                >
                    <TextField
                        select
                        label="Status"
                        size="small"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        sx={{ minWidth: 170 }}
                    >
                        {STATUS_OPTIONS.map((o) => (
                            <MenuItem key={o.value} value={o.value}>
                                {o.label}
                            </MenuItem>
                        ))}
                    </TextField>
                </FilterBar>
            </PageHeader>

            <PageContainer>
                {checkouts.length > 0 && (
                    <Grid container spacing={2} sx={{ mb: 2.5 }}>
                        <Grid item xs={4}>
                            <StatCard
                                label="Total"
                                value={stats.total}
                                icon={<EventNoteOutlined />}
                                tone="primary"
                            />
                        </Grid>
                        <Grid item xs={4}>
                            <StatCard
                                label="Upcoming"
                                value={stats.upcoming}
                                icon={<EventAvailableOutlinedIcon />}
                                tone="info"
                            />
                        </Grid>
                        <Grid item xs={4}>
                            <StatCard
                                label="Pending"
                                value={stats.pending}
                                icon={<PendingActionsOutlinedIcon />}
                                tone="warning"
                            />
                        </Grid>
                    </Grid>
                )}

                {!fetched ? (
                    <RowSkeleton count={5} height={64} />
                ) : checkouts.length === 0 ? (
                    <EmptyState
                        icon={<EventNoteOutlined />}
                        title="No reservations yet"
                        description="Browse the equipment catalog and reserve what you need — your bookings will show up here."
                        action={{
                            label: "Browse equipment",
                            icon: <OpenInNewOutlined />,
                            onClick: () => navigate("/equipment"),
                        }}
                    />
                ) : nothingMatches ? (
                    <EmptyState
                        title="No reservations match"
                        description="Try a different search term or clear the status filter."
                        action={{
                            label: "Clear filters",
                            onClick: () => {
                                setSearchTerm("");
                                setStatusFilter("all");
                            },
                        }}
                    />
                ) : (
                    <Stack spacing={1}>
                        {renderReservationSection({
                            id: "recurring",
                            title: "Recurring reservations",
                            icon: <Repeat sx={{ fontSize: 17 }} />,
                            checkouts: recurringCheckouts,
                            recurring: true,
                        })}
                        {renderReservationSection({
                            id: "oneTime",
                            title: "One-time reservations",
                            icon: <CalendarMonth sx={{ fontSize: 17 }} />,
                            checkouts: nonRecurringCheckouts,
                        })}
                    </Stack>
                )}
            </PageContainer>

            <ResponsiveDialog
                open={detailsOpen}
                onClose={handleCloseDetails}
                title={
                    editMode ? "Edit reservation" : "Reservation details"
                }
                subtitle={selectedCheckout?.Equipment?.name}
                icon={<EventNoteOutlined />}
                maxWidth="md"
                contentSx={{ bgcolor: "background.default" }}
                actions={
                    editMode ? (
                        <>
                            <Button onClick={handleCancelEdit} variant="outlined">
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
                    ) : (
                        <Stack
                            direction={{ xs: "column-reverse", sm: "row" }}
                            spacing={1}
                            sx={{ width: "100%", justifyContent: "flex-end" }}
                        >
                            <AddToCalendarButton checkout={selectedCheckout} />
                            <Button
                                onClick={handleViewCalendar}
                                startIcon={<CalendarMonth />}
                                variant="outlined"
                            >
                                Calendar
                            </Button>
                            <Button
                                onClick={handleViewEquipment}
                                variant="outlined"
                            >
                                Equipment
                            </Button>
                            {selectedCheckout &&
                                selectedCheckout.status !== "cancelled" &&
                                selectedCheckout.status !== "returned" && (
                                    <Button
                                        onClick={() => setEditMode(true)}
                                        startIcon={<Edit />}
                                        variant="outlined"
                                    >
                                        Edit
                                    </Button>
                                )}
                            {selectedCheckout &&
                                CANCELLABLE.includes(
                                    selectedCheckout.status,
                                ) && (
                                    <Button
                                        onClick={() => {
                                            handleCancel(selectedCheckout.id);
                                            handleCloseDetails();
                                        }}
                                        color="error"
                                        variant="contained"
                                        startIcon={<Delete />}
                                    >
                                        Cancel reservation
                                    </Button>
                                )}
                        </Stack>
                    )
                }
            >
                {detailBody()}
            </ResponsiveDialog>

            <AlertDialog
                open={alertState.open}
                onClose={hideAlert}
                message={alertState.message}
                title={alertState.title}
                severity={alertState.severity}
                confirmText={alertState.confirmText}
            />
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
        </>
    );
};

export default MyCheckouts;
