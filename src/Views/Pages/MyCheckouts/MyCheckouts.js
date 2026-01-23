import React, { useState, useEffect, useMemo } from "react";
import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    Chip,
    IconButton,
    Button,
    useMediaQuery,
    useTheme,
    Card,
    CardContent,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider,
    TextField,
    MenuItem,
    InputAdornment,
    TableSortLabel,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Autocomplete,
} from "@mui/material";
import {
    Delete,
    Search,
    Close,
    CalendarMonth,
    Edit,
    Repeat,
    Science,
    ExpandMore,
    Add as AddIcon,
    Remove as RemoveIcon,
} from "@mui/icons-material";
import { useAuth } from "../../../Utilites/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { format } from "date-fns";
import AlertDialog from "../../../Components/AlertDialog";
import useAlertDialog from "../../../hooks/useAlertDialog";
import ConfirmDialog from "../../../Components/ConfirmDialog";
import useConfirmDialog from "../../../hooks/useConfirmDialog";

const MyCheckouts = ({ setLoading, loading }) => {
    const [checkouts, setCheckouts] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [orderBy, setOrderBy] = useState("start_time");
    const [order, setOrder] = useState("desc");
    const [selectedCheckout, setSelectedCheckout] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editedCheckout, setEditedCheckout] = useState({});
    const [recurringExpanded, setRecurringExpanded] = useState(true);
    const [nonRecurringExpanded, setNonRecurringExpanded] = useState(true);
    const [users, setUsers] = useState([]);
    const [showOptionalFields, setShowOptionalFields] = useState(false);
    const [meatRain, setMeatRain] = useState(false);
    const { user } = useAuth();
    const { showAlert, alertState, hideAlert } = useAlertDialog();
    const { showConfirm, confirmState, hideConfirm } = useConfirmDialog();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

    useEffect(() => {
        fetchCheckouts();
        fetchUsers();
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
        }
    };

    const handleCancel = async (id) => {
        showConfirm(
            "Are you sure you want to cancel this reservation?",
            async () => {
                await cancelCheckout(id);
            },
            "warning",
            "Cancel Reservation",
        );
    };

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

    const getStatusColor = (status) => {
        switch (status) {
            case "approved":
                return "success";
            case "pending":
                return "warning";
            case "checked_out":
                return "info";
            case "returned":
                return "default";
            case "cancelled":
                return "error";
            default:
                return "default";
        }
    };

    const getEquipmentStatusColor = (status) => {
        switch (status) {
            case "available":
                return "success";
            case "checked_out":
                return "info";
            case "maintenance":
                return "warning";
            case "retired":
                return "error";
            default:
                return "default";
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

    const formatDateTime = (dateString) => {
        try {
            return format(new Date(dateString), "MMM dd, yyyy hh:mm a");
        } catch (error) {
            return dateString;
        }
    };

    const handleSort = (property) => {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    };

    const handleOpenDetails = (checkout) => {
        setSelectedCheckout(checkout);
        setEditedCheckout({
            notes: checkout.notes || "",
            project_number: checkout.project_number || "",
            scheduled_on_behalf_of: checkout.scheduled_on_behalf_of || "",
        });
        setDetailsOpen(true);
        setEditMode(false);
    };

    const handleCloseDetails = () => {
        setDetailsOpen(false);
        setSelectedCheckout(null);
        setEditMode(false);
        setEditedCheckout({});
    };

    const handleEdit = () => {
        setEditMode(true);
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
        // Validate required fields
        if (
            !editedCheckout.project_number ||
            editedCheckout.project_number.trim() === ""
        ) {
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
            console.error("Error updating checkout:", error);
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

    const sortedCheckouts = [...checkouts].sort((a, b) => {
        let aValue, bValue;

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

    const filteredCheckouts = sortedCheckouts.filter((checkout) => {
        const search = searchTerm.toLowerCase();

        // Format dates in multiple ways for searching
        const startDate = checkout.start_time
            ? new Date(checkout.start_time)
            : null;
        const endDate = checkout.end_time ? new Date(checkout.end_time) : null;

        const dateStrings = [];
        if (startDate) {
            dateStrings.push(
                format(startDate, "MMM dd, yyyy").toLowerCase(), // "Jan 22, 2026"
                format(startDate, "MMMM dd, yyyy").toLowerCase(), // "January 22, 2026"
                format(startDate, "MMM dd").toLowerCase(), // "Jan 22"
                format(startDate, "MMMM dd").toLowerCase(), // "January 22"
                format(startDate, "h:mm a").toLowerCase(), // "1:00 PM"
                format(startDate, "h a").toLowerCase(), // "1 PM"
                format(startDate, "ha").toLowerCase(), // "1PM"
                format(startDate, "hh:mm a").toLowerCase(), // "01:00 PM"
                format(startDate, "PP").toLowerCase(), // "Jan 22, 2026"
                format(startDate, "PPpp").toLowerCase(), // "Jan 22, 2026, 1:00 PM"
            );
        }
        if (endDate) {
            dateStrings.push(
                format(endDate, "MMM dd, yyyy").toLowerCase(),
                format(endDate, "MMMM dd, yyyy").toLowerCase(),
                format(endDate, "MMM dd").toLowerCase(),
                format(endDate, "MMMM dd").toLowerCase(),
                format(endDate, "h:mm a").toLowerCase(),
                format(endDate, "h a").toLowerCase(),
                format(endDate, "ha").toLowerCase(),
                format(endDate, "hh:mm a").toLowerCase(),
                format(endDate, "PP").toLowerCase(),
                format(endDate, "PPpp").toLowerCase(),
            );
        }

        const matchesSearch =
            checkout.Equipment?.name?.toLowerCase().includes(search) ||
            checkout.Equipment?.serial_number?.toLowerCase().includes(search) ||
            checkout.Equipment?.location?.toLowerCase().includes(search) ||
            checkout.Equipment?.description?.toLowerCase().includes(search) ||
            checkout.notes?.toLowerCase().includes(search) ||
            checkout.project_number?.toLowerCase().includes(search) ||
            checkout.status?.toLowerCase().includes(search) ||
            checkout.approval_notes?.toLowerCase().includes(search) ||
            checkout.ApprovedBy?.first_name?.toLowerCase().includes(search) ||
            checkout.ApprovedBy?.last_name?.toLowerCase().includes(search) ||
            dateStrings.some((dateStr) => dateStr.includes(search));

        const matchesStatus =
            statusFilter === "all" || checkout.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Separate recurring and non-recurring checkouts
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

    const getRecurrenceDescription = (checkout) => {
        const recurrence = checkout.Recurrence;
        if (!recurrence) return "Recurring";

        const pattern = recurrence.recurrence_pattern?.toLowerCase();
        const interval = recurrence.separation_count || 1;
        let description = `Every `;

        if (interval > 1) {
            description += `${interval} `;
        }

        description +=
            pattern === "daily"
                ? "day(s)"
                : pattern === "weekly"
                  ? "week(s)"
                  : pattern === "monthly"
                    ? "month(s)"
                    : pattern;

        if (recurrence.end_date) {
            description += ` until ${format(
                new Date(recurrence.end_date),
                "PP",
            )}`;
        }

        return description;
    };

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
            }}
        >
            <Typography variant={isMobile ? "h5" : "h4"} sx={{ mb: 3 }}>
                My Reservations
            </Typography>

            {/* Meat Rain Easter Egg */}
            {meatRain && (
                <Box
                    sx={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100vw",
                        height: "100vh",
                        pointerEvents: "none",
                        zIndex: 9999,
                        overflow: "hidden",
                    }}
                >
                    {[...Array(50)].map((_, i) => (
                        <Box
                            key={i}
                            sx={{
                                position: "absolute",
                                top: -50,
                                left: `${Math.random() * 100}%`,
                                fontSize: `${20 + Math.random() * 30}px`,
                                animation: `meatFall ${2 + Math.random() * 3}s linear infinite`,
                                animationDelay: `${Math.random() * 5}s`,
                                opacity: 0.8,
                                "@keyframes meatFall": {
                                    "0%": {
                                        transform: `translateY(0) rotate(0deg)`,
                                        opacity: 0,
                                    },
                                    "10%": {
                                        opacity: 0.8,
                                    },
                                    "90%": {
                                        opacity: 0.8,
                                    },
                                    "100%": {
                                        transform: `translateY(100vh) rotate(${360 + Math.random() * 360}deg)`,
                                        opacity: 0,
                                    },
                                },
                            }}
                        >
                            {["🥩", "🍖", "🥓"][Math.floor(Math.random() * 3)]}
                        </Box>
                    ))}
                </Box>
            )}

            {/* Search and Filter Controls */}
            <Box
                sx={{
                    display: "flex",
                    gap: 2,
                    mb: 3,
                    flexDirection: isMobile ? "column" : "row",
                }}
            >
                <TextField
                    placeholder="Search reservations..."
                    value={searchTerm}
                    onChange={(e) => {
                        const value = e.target.value;
                        setSearchTerm(value);
                        // Easter egg: trigger meat rain when "meat" is typed
                        if (value.toLowerCase() === "meat") {
                            setMeatRain(true);
                            setTimeout(() => setMeatRain(false), 5000);
                        }
                    }}
                    size="small"
                    sx={{ flex: isMobile ? "1" : "0 0 300px" }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search />
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>

            {checkouts.length === 0 ? (
                <Typography align="center" color="text.secondary">
                    No reservations found
                </Typography>
            ) : filteredCheckouts.length === 0 ? (
                <Typography
                    align="center"
                    color="text.secondary"
                    sx={{ py: 3 }}
                >
                    No reservations match your search criteria
                </Typography>
            ) : (
                <Box sx={{ pb: 4 }}>
                    {/* Recurring Checkouts Section */}
                    {recurringCheckouts.length > 0 && (
                        <Accordion
                            expanded={recurringExpanded}
                            onChange={() =>
                                setRecurringExpanded(!recurringExpanded)
                            }
                            sx={{ mb: 2 }}
                        >
                            <AccordionSummary expandIcon={<ExpandMore />}>
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                    }}
                                >
                                    <Repeat fontSize="small" />
                                    <Typography variant="subtitle1">
                                        Recurring Reservations (
                                        {recurringCheckouts.length})
                                    </Typography>
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails sx={{ p: isMobile ? 1 : 2 }}>
                                {isMobile ? (
                                    <Stack spacing={2}>
                                        {recurringCheckouts.map((checkout) => (
                                            <Card
                                                key={checkout.id}
                                                sx={{ cursor: "pointer" }}
                                                onClick={() =>
                                                    handleOpenDetails(checkout)
                                                }
                                            >
                                                <CardContent>
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            justifyContent:
                                                                "space-between",
                                                            alignItems: "start",
                                                            mb: 1,
                                                        }}
                                                    >
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography variant="h6">
                                                                {checkout
                                                                    .Equipment
                                                                    ?.name ||
                                                                    "N/A"}
                                                            </Typography>
                                                            <Typography
                                                                variant="caption"
                                                                color="text.secondary"
                                                            >
                                                                {
                                                                    checkout
                                                                        .Equipment
                                                                        ?.serial_number
                                                                }
                                                            </Typography>
                                                        </Box>
                                                        <Chip
                                                            label={
                                                                checkout.status
                                                            }
                                                            color={getStatusColor(
                                                                checkout.status,
                                                            )}
                                                            size="small"
                                                        />
                                                    </Box>
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            gap: 0.5,
                                                            mb: 1,
                                                        }}
                                                    >
                                                        <Repeat
                                                            fontSize="small"
                                                            color="action"
                                                        />
                                                        <Typography
                                                            variant="body2"
                                                            color="text.secondary"
                                                        >
                                                            {getRecurrenceDescription(
                                                                checkout,
                                                            )}
                                                        </Typography>
                                                    </Box>
                                                    <Stack spacing={1}>
                                                        <Typography variant="body2">
                                                            <strong>
                                                                Start:
                                                            </strong>{" "}
                                                            {formatDateTime(
                                                                checkout.start_time,
                                                            )}
                                                        </Typography>
                                                        {checkout.notes && (
                                                            <Typography variant="body2">
                                                                <strong>
                                                                    notes:
                                                                </strong>{" "}
                                                                {checkout.notes}
                                                            </Typography>
                                                        )}
                                                    </Stack>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </Stack>
                                ) : (
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>
                                                        <TableSortLabel
                                                            active={
                                                                orderBy ===
                                                                "equipment"
                                                            }
                                                            direction={
                                                                orderBy ===
                                                                "equipment"
                                                                    ? order
                                                                    : "asc"
                                                            }
                                                            onClick={() =>
                                                                handleSort(
                                                                    "equipment",
                                                                )
                                                            }
                                                        >
                                                            Equipment
                                                        </TableSortLabel>
                                                    </TableCell>
                                                    <TableCell>
                                                        <TableSortLabel
                                                            active={
                                                                orderBy ===
                                                                "start_time"
                                                            }
                                                            direction={
                                                                orderBy ===
                                                                "start_time"
                                                                    ? order
                                                                    : "asc"
                                                            }
                                                            onClick={() =>
                                                                handleSort(
                                                                    "start_time",
                                                                )
                                                            }
                                                        >
                                                            First Occurrence
                                                        </TableSortLabel>
                                                    </TableCell>
                                                    <TableCell>
                                                        Pattern
                                                    </TableCell>
                                                    <TableCell>
                                                        <TableSortLabel
                                                            active={
                                                                orderBy ===
                                                                "notes"
                                                            }
                                                            direction={
                                                                orderBy ===
                                                                "notes"
                                                                    ? order
                                                                    : "asc"
                                                            }
                                                            onClick={() =>
                                                                handleSort(
                                                                    "notes",
                                                                )
                                                            }
                                                        >
                                                            Purpose
                                                        </TableSortLabel>
                                                    </TableCell>
                                                    <TableCell>
                                                        <TableSortLabel
                                                            active={
                                                                orderBy ===
                                                                "status"
                                                            }
                                                            direction={
                                                                orderBy ===
                                                                "status"
                                                                    ? order
                                                                    : "asc"
                                                            }
                                                            onClick={() =>
                                                                handleSort(
                                                                    "status",
                                                                )
                                                            }
                                                        >
                                                            Status
                                                        </TableSortLabel>
                                                    </TableCell>
                                                    <TableCell>
                                                        Actions
                                                    </TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {recurringCheckouts.map(
                                                    (checkout) => (
                                                        <TableRow
                                                            key={checkout.id}
                                                            sx={{
                                                                cursor: "pointer",
                                                                "&:hover": {
                                                                    backgroundColor:
                                                                        "action.hover",
                                                                },
                                                            }}
                                                            onClick={() =>
                                                                handleOpenDetails(
                                                                    checkout,
                                                                )
                                                            }
                                                        >
                                                            <TableCell>
                                                                <Typography variant="body2">
                                                                    {checkout
                                                                        .Equipment
                                                                        ?.name ||
                                                                        "N/A"}
                                                                </Typography>
                                                                <Typography
                                                                    variant="caption"
                                                                    color="text.secondary"
                                                                >
                                                                    {
                                                                        checkout
                                                                            .Equipment
                                                                            ?.serial_number
                                                                    }
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell>
                                                                {formatDateTime(
                                                                    checkout.start_time,
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Typography
                                                                    variant="body2"
                                                                    color="text.secondary"
                                                                >
                                                                    {getRecurrenceDescription(
                                                                        checkout,
                                                                    )}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell>
                                                                {checkout.notes ||
                                                                    "N/A"}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Chip
                                                                    label={
                                                                        checkout.status
                                                                    }
                                                                    color={getStatusColor(
                                                                        checkout.status,
                                                                    )}
                                                                    size="small"
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                {(checkout.status ===
                                                                    "pending" ||
                                                                    checkout.status ===
                                                                        "approved") && (
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={(
                                                                            e,
                                                                        ) => {
                                                                            e.stopPropagation();
                                                                            handleCancel(
                                                                                checkout.id,
                                                                            );
                                                                        }}
                                                                        color="error"
                                                                    >
                                                                        <Delete />
                                                                    </IconButton>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    ),
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                )}
                            </AccordionDetails>
                        </Accordion>
                    )}

                    {/* Non-Recurring Checkouts Section */}
                    {nonRecurringCheckouts.length > 0 && (
                        <Accordion
                            expanded={nonRecurringExpanded}
                            onChange={() =>
                                setNonRecurringExpanded(!nonRecurringExpanded)
                            }
                        >
                            <AccordionSummary expandIcon={<ExpandMore />}>
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                    }}
                                >
                                    <CalendarMonth fontSize="small" />
                                    <Typography variant="subtitle1">
                                        Non-Recurring Reservations (
                                        {nonRecurringCheckouts.length})
                                    </Typography>
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails sx={{ p: isMobile ? 1 : 2 }}>
                                {isMobile ? (
                                    <Stack spacing={2}>
                                        {nonRecurringCheckouts.map(
                                            (checkout) => (
                                                <Card
                                                    key={checkout.id}
                                                    sx={{ cursor: "pointer" }}
                                                    onClick={() =>
                                                        handleOpenDetails(
                                                            checkout,
                                                        )
                                                    }
                                                >
                                                    <CardContent>
                                                        <Box
                                                            sx={{
                                                                display: "flex",
                                                                justifyContent:
                                                                    "space-between",
                                                                alignItems:
                                                                    "start",
                                                                mb: 1,
                                                            }}
                                                        >
                                                            <Box
                                                                sx={{ flex: 1 }}
                                                            >
                                                                <Typography variant="h6">
                                                                    {checkout
                                                                        .Equipment
                                                                        ?.name ||
                                                                        "N/A"}
                                                                </Typography>
                                                                <Typography
                                                                    variant="caption"
                                                                    color="text.secondary"
                                                                >
                                                                    {
                                                                        checkout
                                                                            .Equipment
                                                                            ?.serial_number
                                                                    }
                                                                </Typography>
                                                            </Box>
                                                            <Chip
                                                                label={
                                                                    checkout.status
                                                                }
                                                                color={getStatusColor(
                                                                    checkout.status,
                                                                )}
                                                                size="small"
                                                            />
                                                        </Box>
                                                        <Stack spacing={1}>
                                                            <Typography variant="body2">
                                                                <strong>
                                                                    Start:
                                                                </strong>{" "}
                                                                {formatDateTime(
                                                                    checkout.start_time,
                                                                )}
                                                            </Typography>
                                                            <Typography variant="body2">
                                                                <strong>
                                                                    End:
                                                                </strong>{" "}
                                                                {formatDateTime(
                                                                    checkout.end_time,
                                                                )}
                                                            </Typography>
                                                            {checkout.notes && (
                                                                <Typography variant="body2">
                                                                    <strong>
                                                                        notes:
                                                                    </strong>{" "}
                                                                    {
                                                                        checkout.notes
                                                                    }
                                                                </Typography>
                                                            )}
                                                        </Stack>
                                                    </CardContent>
                                                </Card>
                                            ),
                                        )}
                                    </Stack>
                                ) : (
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>
                                                        <TableSortLabel
                                                            active={
                                                                orderBy ===
                                                                "equipment"
                                                            }
                                                            direction={
                                                                orderBy ===
                                                                "equipment"
                                                                    ? order
                                                                    : "asc"
                                                            }
                                                            onClick={() =>
                                                                handleSort(
                                                                    "equipment",
                                                                )
                                                            }
                                                        >
                                                            Equipment
                                                        </TableSortLabel>
                                                    </TableCell>
                                                    <TableCell>
                                                        <TableSortLabel
                                                            active={
                                                                orderBy ===
                                                                "start_time"
                                                            }
                                                            direction={
                                                                orderBy ===
                                                                "start_time"
                                                                    ? order
                                                                    : "asc"
                                                            }
                                                            onClick={() =>
                                                                handleSort(
                                                                    "start_time",
                                                                )
                                                            }
                                                        >
                                                            Start Time
                                                        </TableSortLabel>
                                                    </TableCell>
                                                    <TableCell>
                                                        <TableSortLabel
                                                            active={
                                                                orderBy ===
                                                                "end_time"
                                                            }
                                                            direction={
                                                                orderBy ===
                                                                "end_time"
                                                                    ? order
                                                                    : "asc"
                                                            }
                                                            onClick={() =>
                                                                handleSort(
                                                                    "end_time",
                                                                )
                                                            }
                                                        >
                                                            End Time
                                                        </TableSortLabel>
                                                    </TableCell>
                                                    <TableCell>
                                                        <TableSortLabel
                                                            active={
                                                                orderBy ===
                                                                "notes"
                                                            }
                                                            direction={
                                                                orderBy ===
                                                                "notes"
                                                                    ? order
                                                                    : "asc"
                                                            }
                                                            onClick={() =>
                                                                handleSort(
                                                                    "notes",
                                                                )
                                                            }
                                                        >
                                                            Purpose
                                                        </TableSortLabel>
                                                    </TableCell>
                                                    <TableCell>
                                                        <TableSortLabel
                                                            active={
                                                                orderBy ===
                                                                "status"
                                                            }
                                                            direction={
                                                                orderBy ===
                                                                "status"
                                                                    ? order
                                                                    : "asc"
                                                            }
                                                            onClick={() =>
                                                                handleSort(
                                                                    "status",
                                                                )
                                                            }
                                                        >
                                                            Status
                                                        </TableSortLabel>
                                                    </TableCell>
                                                    <TableCell>
                                                        Actions
                                                    </TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {nonRecurringCheckouts.map(
                                                    (checkout) => (
                                                        <TableRow
                                                            key={checkout.id}
                                                            sx={{
                                                                cursor: "pointer",
                                                                "&:hover": {
                                                                    backgroundColor:
                                                                        "action.hover",
                                                                },
                                                            }}
                                                            onClick={() =>
                                                                handleOpenDetails(
                                                                    checkout,
                                                                )
                                                            }
                                                        >
                                                            <TableCell>
                                                                <Typography variant="body2">
                                                                    {checkout
                                                                        .Equipment
                                                                        ?.name ||
                                                                        "N/A"}
                                                                </Typography>
                                                                <Typography
                                                                    variant="caption"
                                                                    color="text.secondary"
                                                                >
                                                                    {
                                                                        checkout
                                                                            .Equipment
                                                                            ?.serial_number
                                                                    }
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell>
                                                                {formatDateTime(
                                                                    checkout.start_time,
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                {formatDateTime(
                                                                    checkout.end_time,
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                {checkout.notes ||
                                                                    "N/A"}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Chip
                                                                    label={
                                                                        checkout.status
                                                                    }
                                                                    color={getStatusColor(
                                                                        checkout.status,
                                                                    )}
                                                                    size="small"
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                {(checkout.status ===
                                                                    "pending" ||
                                                                    checkout.status ===
                                                                        "approved") && (
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={(
                                                                            e,
                                                                        ) => {
                                                                            e.stopPropagation();
                                                                            handleCancel(
                                                                                checkout.id,
                                                                            );
                                                                        }}
                                                                        color="error"
                                                                    >
                                                                        <Delete />
                                                                    </IconButton>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    ),
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                )}
                            </AccordionDetails>
                        </Accordion>
                    )}
                </Box>
            )}

            {/* Checkout Details Dialog */}
            <Dialog
                open={detailsOpen}
                onClose={handleCloseDetails}
                maxWidth="md"
                fullWidth
                fullScreen={isMobile}
            >
                <DialogTitle>
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <Typography variant="h6">
                            Reservation Details
                        </Typography>
                        <IconButton
                            onClick={handleCloseDetails}
                            size="small"
                            edge="end"
                        >
                            <Close />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    {selectedCheckout && (
                        <Box>
                            {/* Equipment Information */}
                            <Card sx={{ mb: 3 }}>
                                <CardContent>
                                    <Typography
                                        variant="h6"
                                        gutterBottom
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                        }}
                                    >
                                        📦 Equipment Information
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    <Stack spacing={1.5}>
                                        <Box>
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                            >
                                                Name:
                                            </Typography>
                                            <Typography variant="body1">
                                                {selectedCheckout.Equipment
                                                    ?.name || "N/A"}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                            >
                                                Serial Number:
                                            </Typography>
                                            <Typography variant="body1">
                                                {selectedCheckout.Equipment
                                                    ?.serial_number || "N/A"}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                            >
                                                Location:
                                            </Typography>
                                            <Typography variant="body1">
                                                {selectedCheckout.Equipment
                                                    ?.location || "N/A"}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                            >
                                                Equipment Status:
                                            </Typography>
                                            <Box sx={{ mt: 0.5 }}>
                                                <Chip
                                                    label={
                                                        selectedCheckout
                                                            .Equipment?.status
                                                    }
                                                    color={getEquipmentStatusColor(
                                                        selectedCheckout
                                                            .Equipment?.status,
                                                    )}
                                                    size="small"
                                                />
                                            </Box>
                                        </Box>
                                        {selectedCheckout.Equipment
                                            ?.description && (
                                            <Box>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                >
                                                    Description:
                                                </Typography>
                                                <Typography variant="body2">
                                                    {
                                                        selectedCheckout
                                                            .Equipment
                                                            .description
                                                    }
                                                </Typography>
                                            </Box>
                                        )}

                                        {/* Calibration Information */}
                                        {selectedCheckout.Equipment
                                            ?.last_calibration_date &&
                                            selectedCheckout.Equipment
                                                ?.calibration_interval_value && (
                                                <>
                                                    <Divider sx={{ my: 2 }} />
                                                    <Typography
                                                        variant="subtitle2"
                                                        sx={{
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            gap: 0.5,
                                                        }}
                                                    >
                                                        <Science fontSize="small" />
                                                        Calibration Information
                                                    </Typography>
                                                    {selectedCheckout.Equipment
                                                        ?.last_calibration_date && (
                                                        <Box>
                                                            <Typography
                                                                variant="caption"
                                                                color="text.secondary"
                                                            >
                                                                Last
                                                                Calibration:
                                                            </Typography>
                                                            <Typography variant="body2">
                                                                {format(
                                                                    new Date(
                                                                        selectedCheckout
                                                                            .Equipment
                                                                            .last_calibration_date,
                                                                    ),
                                                                    "MMM dd, yyyy",
                                                                )}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                    {(() => {
                                                        const lastCal =
                                                            new Date(
                                                                selectedCheckout
                                                                    .Equipment
                                                                    .last_calibration_date,
                                                            );
                                                        const dueDate =
                                                            new Date(lastCal);
                                                        const interval =
                                                            selectedCheckout
                                                                .Equipment
                                                                .calibration_interval_value;
                                                        const unit =
                                                            selectedCheckout
                                                                .Equipment
                                                                .calibration_interval_unit;

                                                        switch (unit) {
                                                            case "days":
                                                                dueDate.setDate(
                                                                    dueDate.getDate() +
                                                                        interval,
                                                                );
                                                                break;
                                                            case "months":
                                                                dueDate.setMonth(
                                                                    dueDate.getMonth() +
                                                                        interval,
                                                                );
                                                                break;
                                                            case "years":
                                                                dueDate.setFullYear(
                                                                    dueDate.getFullYear() +
                                                                        interval,
                                                                );
                                                                break;
                                                        }

                                                        return (
                                                            <>
                                                                <Box>
                                                                    <Typography
                                                                        variant="caption"
                                                                        color="text.secondary"
                                                                    >
                                                                        Calibration
                                                                        Due:
                                                                    </Typography>
                                                                    <Typography
                                                                        variant="body2"
                                                                        color={
                                                                            dueDate <
                                                                            new Date()
                                                                                ? "error"
                                                                                : "inherit"
                                                                        }
                                                                    >
                                                                        {format(
                                                                            dueDate,
                                                                            "MMM dd, yyyy",
                                                                        )}
                                                                        {dueDate <
                                                                            new Date() &&
                                                                            " (Overdue)"}
                                                                    </Typography>
                                                                </Box>
                                                                <Box>
                                                                    <Typography
                                                                        variant="caption"
                                                                        color="text.secondary"
                                                                    >
                                                                        Calibration
                                                                        Interval:
                                                                    </Typography>
                                                                    <Typography variant="body2">
                                                                        Every{" "}
                                                                        {
                                                                            interval
                                                                        }{" "}
                                                                        {unit}
                                                                    </Typography>
                                                                </Box>
                                                            </>
                                                        );
                                                    })()}
                                                </>
                                            )}
                                    </Stack>
                                </CardContent>
                            </Card>

                            {/* Checkout Information */}
                            <Card>
                                <CardContent>
                                    <Typography
                                        variant="h6"
                                        gutterBottom
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                        }}
                                    >
                                        📅 Reservation Information
                                        {selectedCheckout.Recurrence && (
                                            <Chip
                                                icon={<Repeat />}
                                                label="Recurring"
                                                size="small"
                                                color="primary"
                                                variant="outlined"
                                            />
                                        )}
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    <Stack spacing={1.5}>
                                        <Box>
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                            >
                                                Start Time:
                                            </Typography>
                                            <Typography variant="body1">
                                                {formatDateTime(
                                                    selectedCheckout.start_time,
                                                )}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                            >
                                                End Time:
                                            </Typography>
                                            <Typography variant="body1">
                                                {formatDateTime(
                                                    selectedCheckout.end_time,
                                                )}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                            >
                                                Project Number:
                                            </Typography>
                                            {editMode ? (
                                                <TextField
                                                    fullWidth
                                                    value={
                                                        editedCheckout.project_number ||
                                                        ""
                                                    }
                                                    onChange={(e) =>
                                                        setEditedCheckout({
                                                            ...editedCheckout,
                                                            project_number:
                                                                e.target.value,
                                                        })
                                                    }
                                                    size="small"
                                                    sx={{ mt: 1 }}
                                                    required
                                                />
                                            ) : (
                                                <Typography variant="body1">
                                                    {selectedCheckout.project_number ||
                                                        "N/A"}
                                                </Typography>
                                            )}
                                        </Box>

                                        {/* Optional Fields Toggle */}
                                        {editMode && (
                                            <Box sx={{ mt: 2 }}>
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
                                                        setShowOptionalFields(
                                                            !showOptionalFields,
                                                        )
                                                    }
                                                >
                                                    Optional Fields
                                                </Button>
                                            </Box>
                                        )}

                                        {showOptionalFields && editMode && (
                                            <>
                                                <Box>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                    >
                                                        Notes:
                                                    </Typography>
                                                    <TextField
                                                        fullWidth
                                                        multiline
                                                        rows={2}
                                                        value={
                                                            editedCheckout.notes ||
                                                            ""
                                                        }
                                                        onChange={(e) =>
                                                            setEditedCheckout({
                                                                ...editedCheckout,
                                                                notes: e.target
                                                                    .value,
                                                            })
                                                        }
                                                        size="small"
                                                        sx={{ mt: 1 }}
                                                    />
                                                </Box>
                                                <Box>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                    >
                                                        Scheduled On Behalf Of:
                                                    </Typography>
                                                    <Autocomplete
                                                        options={users.filter(
                                                            (u) =>
                                                                u.id !==
                                                                user?.id,
                                                        )}
                                                        getOptionLabel={(
                                                            option,
                                                        ) =>
                                                            typeof option ===
                                                            "string"
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
                                                        onChange={(
                                                            event,
                                                            newValue,
                                                        ) => {
                                                            setEditedCheckout({
                                                                ...editedCheckout,
                                                                scheduled_on_behalf_of:
                                                                    newValue
                                                                        ? typeof newValue ===
                                                                          "string"
                                                                            ? newValue
                                                                            : `${newValue.first_name} ${newValue.last_name}`
                                                                        : "",
                                                            });
                                                        }}
                                                        freeSolo
                                                        renderInput={(
                                                            params,
                                                        ) => (
                                                            <TextField
                                                                {...params}
                                                                placeholder="Select or type a name"
                                                                size="small"
                                                                sx={{ mt: 1 }}
                                                            />
                                                        )}
                                                        renderOption={(
                                                            props,
                                                            option,
                                                        ) => (
                                                            <li
                                                                {...props}
                                                                key={option.id}
                                                            >
                                                                {
                                                                    option.first_name
                                                                }{" "}
                                                                {
                                                                    option.last_name
                                                                }{" "}
                                                                ({option.email})
                                                            </li>
                                                        )}
                                                        isOptionEqualToValue={(
                                                            option,
                                                            value,
                                                        ) =>
                                                            option.id ===
                                                            value?.id
                                                        }
                                                        ListboxProps={{
                                                            style: {
                                                                maxHeight:
                                                                    "250px",
                                                            },
                                                        }}
                                                        fullWidth
                                                    />
                                                </Box>
                                            </>
                                        )}

                                        {!editMode &&
                                            selectedCheckout.notes && (
                                                <Box>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                    >
                                                        Notes:
                                                    </Typography>
                                                    <Typography variant="body1">
                                                        {selectedCheckout.notes}
                                                    </Typography>
                                                </Box>
                                            )}

                                        {!editMode &&
                                            selectedCheckout.scheduled_on_behalf_of && (
                                                <Box>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                    >
                                                        Scheduled On Behalf Of:
                                                    </Typography>
                                                    <Typography variant="body1">
                                                        {
                                                            selectedCheckout.scheduled_on_behalf_of
                                                        }
                                                    </Typography>
                                                </Box>
                                            )}

                                        {/* Recurrence Information */}
                                        {selectedCheckout.Recurrence && (
                                            <>
                                                <Divider sx={{ my: 2 }} />
                                                <Typography
                                                    variant="subtitle2"
                                                    sx={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 0.5,
                                                    }}
                                                >
                                                    <Repeat fontSize="small" />
                                                    Recurrence Pattern
                                                </Typography>
                                                <Box>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                    >
                                                        Pattern:
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {selectedCheckout.Recurrence.recurrence_pattern
                                                            ?.charAt(0)
                                                            .toUpperCase() +
                                                            selectedCheckout.Recurrence.recurrence_pattern?.slice(
                                                                1,
                                                            )}
                                                        {selectedCheckout
                                                            .Recurrence
                                                            .separation_count >
                                                            1 &&
                                                            ` (every ${selectedCheckout.Recurrence.separation_count})`}
                                                    </Typography>
                                                </Box>
                                                {selectedCheckout.Recurrence
                                                    .end_date && (
                                                    <Box>
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                        >
                                                            Repeats Until:
                                                        </Typography>
                                                        <Typography variant="body2">
                                                            {format(
                                                                new Date(
                                                                    selectedCheckout
                                                                        .Recurrence
                                                                        .end_date,
                                                                ),
                                                                "MMM dd, yyyy",
                                                            )}
                                                        </Typography>
                                                    </Box>
                                                )}
                                                {selectedCheckout.Recurrence
                                                    .max_occurrences && (
                                                    <Box>
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                        >
                                                            Max Occurrences:
                                                        </Typography>
                                                        <Typography variant="body2">
                                                            {
                                                                selectedCheckout
                                                                    .Recurrence
                                                                    .max_occurrences
                                                            }
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </>
                                        )}

                                        {selectedCheckout.ApprovedBy && (
                                            <Box>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                >
                                                    Approved By:
                                                </Typography>
                                                <Typography variant="body1">
                                                    {selectedCheckout.ApprovedBy
                                                        .first_name || ""}{" "}
                                                    {selectedCheckout.ApprovedBy
                                                        .last_name || ""}
                                                </Typography>
                                            </Box>
                                        )}
                                        {selectedCheckout.approval_notes && (
                                            <Box>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                >
                                                    Approval Notes:
                                                </Typography>
                                                <Typography variant="body2">
                                                    {
                                                        selectedCheckout.approval_notes
                                                    }
                                                </Typography>
                                            </Box>
                                        )}
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    {editMode ? (
                        <>
                            <Button onClick={handleCancelEdit} color="inherit">
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSaveEdit}
                                variant="contained"
                                disabled={loading}
                            >
                                Save Changes
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                onClick={handleViewCalendar}
                                startIcon={<CalendarMonth />}
                                variant="outlined"
                            >
                                View Calendar
                            </Button>
                            <Button
                                onClick={handleViewEquipment}
                                variant="outlined"
                            >
                                View Equipment
                            </Button>
                            {selectedCheckout &&
                                selectedCheckout.status !== "cancelled" &&
                                selectedCheckout.status !== "returned" && (
                                    <Button
                                        onClick={handleEdit}
                                        startIcon={<Edit />}
                                        variant="outlined"
                                    >
                                        Edit
                                    </Button>
                                )}
                            {selectedCheckout &&
                                (selectedCheckout.status === "pending" ||
                                    selectedCheckout.status === "approved") && (
                                    <Button
                                        onClick={() => {
                                            handleCancel(selectedCheckout.id);
                                            handleCloseDetails();
                                        }}
                                        color="error"
                                        variant="outlined"
                                        startIcon={<Delete />}
                                    >
                                        Cancel Checkout
                                    </Button>
                                )}
                        </>
                    )}
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
        </Box>
    );
};

export default MyCheckouts;
