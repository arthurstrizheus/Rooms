import React, { useState, useEffect } from "react";
import {
    Box,
    Card,
    CardContent,
    CardMedia,
    Grid,
    Typography,
    Button,
    Chip,
    IconButton,
    useMediaQuery,
    useTheme,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    Paper,
    InputAdornment,
    Link,
    MenuItem,
    TextField,
    capitalize,
} from "@mui/material";
import useEasterEggs from "../../../hooks/useEasterEggs";
import MeatRain from "../../../Components/EasterEggs/MeatRain";
import HiggyRain from "../../../Components/EasterEggs/HiggyRain";
import {
    Add,
    CalendarMonth,
    Warning,
    Search,
    Visibility,
    Download,
} from "@mui/icons-material";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../Utilites/AuthContext";
import { useSocket } from "../../../Contexts/SocketContext";
import ConfirmDialog from "../../../Components/ConfirmDialog";
import useConfirmDialog from "../../../hooks/useConfirmDialog";
import AlertDialog from "../../../Components/AlertDialog";
import useAlertDialog from "../../../hooks/useAlertDialog";
import EquipmentDialog from "./EquipmentDialog";
import axios from "axios";

const Equipment = ({ setLoading, loading }) => {
    const [equipment, setEquipment] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedEquipment, setSelectedEquipment] = useState(null);
    const [activeCheckouts, setActiveCheckouts] = useState([]);

    const calculateDueDate = (item) => {
        if (!item.last_calibration_date || !item.calibration_interval_value) {
            return null;
        }
        const lastCal = new Date(item.last_calibration_date);
        const dueDate = new Date(lastCal);

        switch (item.calibration_interval_unit) {
            case "days":
                dueDate.setDate(
                    dueDate.getDate() + item.calibration_interval_value,
                );
                break;
            case "months":
                dueDate.setMonth(
                    dueDate.getMonth() + item.calibration_interval_value,
                );
                break;
            case "years":
                dueDate.setFullYear(
                    dueDate.getFullYear() + item.calibration_interval_value,
                );
                break;
        }
        return dueDate;
    };
    const [locations, setLocations] = useState([]);
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [filterLocation, setFilterLocation] = useState(null);
    const { meatRain, higgyRain, handleSearchChange } = useEasterEggs();
    const [sortBy, setSortBy] = useState(null);
    const [sortOrder, setSortOrder] = useState("asc");
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        serial_number: "",
        asset_number: "",
        cost: "",
        location: "",
        contact_person: "",
        contact_person_id: null,
        status: "available",
        requires_approval: false,
        billing_rate: "",
        billing_code: "",
        date_of_purchase: "",
        brand_name: "",
        can_book: true,
        last_calibration_date: "",
        calibration_interval_value: "",
        calibration_interval_unit: "days",
        // Depreciation fields
        placed_in_service_date: "",
        cost_basis: "",
        property_class: "5yr",
        method: "MACRS",
        bonus_eligible: true,
        section179_elected: "",
        vehicle_class: "UNKNOWN",
        convention: "half-year",
    });
    const navigate = useNavigate();
    const { user } = useAuth();
    const { socket } = useSocket();
    const { showConfirm, confirmState, hideConfirm } = useConfirmDialog();
    const { showAlert, alertState, hideAlert } = useAlertDialog();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

    useEffect(() => {
        fetchEquipment();
        fetchLocations();
        fetchUsers();
        fetchActiveCheckouts();
    }, []);

    // Auto-refresh active checkouts every minute to update status in real-time
    useEffect(() => {
        const interval = setInterval(() => {
            fetchActiveCheckouts();
        }, 60000); // 60 seconds

        return () => clearInterval(interval);
    }, []);

    // Socket listener for real-time equipment updates
    useEffect(() => {
        if (!socket?.connected) return;

        const handleMessage = (payload) => {
            const { message, data } = payload;

            switch (message) {
                case "equipment_added":
                case "equipment_updated":
                case "equipment_deleted":
                    // Refresh equipment list on any equipment change
                    fetchEquipment();
                    break;
                case "checkout_created":
                case "checkout_updated":
                case "checkout_approved":
                    // Refresh active checkouts when checkouts change
                    fetchActiveCheckouts();
                    break;
                default:
                    break;
            }
        };

        socket.on("message", handleMessage);
        return () => socket.off("message", handleMessage);
    }, [socket]);

    const fetchLocations = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.get("/api/locations", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setLocations(response.data);
        } catch (error) {
            console.error("Error fetching locations:", error);
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

    const fetchEquipment = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("authToken");
            const response = await axios.get("/api/equipment", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setEquipment(response.data);
        } catch (error) {
            console.error("Error fetching equipment:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchActiveCheckouts = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const now = new Date().toISOString();
            const response = await axios.get(
                `/api/checkouts?start=${now}&end=${now}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );
            setActiveCheckouts(response.data);
        } catch (error) {
            console.error("Error fetching active checkouts:", error);
        }
    };

    const isEquipmentCurrentlyCheckedOut = (equipmentId) => {
        const now = new Date();
        return activeCheckouts.some((checkout) => {
            if (checkout.equipment_id !== equipmentId) return false;
            if (checkout.status === "cancelled") return false;

            const start = new Date(checkout.start_time);
            const end = new Date(checkout.end_time);
            return now >= start && now <= end;
        });
    };

    const getDisplayStatus = (item) => {
        // If equipment is currently checked out, override status
        if (isEquipmentCurrentlyCheckedOut(item.id)) {
            return "reserved";
        }
        return item.status;
    };

    const handleSort = (column) => {
        if (sortBy === column) {
            // Toggle sort order if clicking same column
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            // Set new column and default to ascending
            setSortBy(column);
            setSortOrder("asc");
        }
    };

    const handleOpenDialog = (item = null) => {
        if (item) {
            setSelectedEquipment(item);
            setFormData({
                ...item,
                last_calibration_date: item.last_calibration_date
                    ? new Date(item.last_calibration_date)
                          .toISOString()
                          .split("T")[0]
                    : "",
                placed_in_service_date: item.AssetTaxMeta
                    ?.placed_in_service_date
                    ? new Date(item.AssetTaxMeta.placed_in_service_date)
                          .toISOString()
                          .split("T")[0]
                    : "",
                cost_basis: item.AssetTaxMeta?.cost_basis || "",
                property_class: item.AssetTaxMeta?.property_class || "5yr",
                method: item.AssetTaxMeta?.method || "MACRS",
                bonus_eligible: item.AssetTaxMeta?.bonus_eligible ?? true,
                section179_elected: item.AssetTaxMeta?.section179_elected || "",
                billing_rate: item.billing_rate || "",
                billing_code: item.billing_code || "",
                date_of_purchase: item?.date_of_purchase
                    ? new Date(item?.date_of_purchase)
                          .toISOString()
                          .split("T")[0]
                    : "",
                brand_name: item?.brand_name || "",
            });
        } else {
            setSelectedEquipment(null);
            setFormData({
                name: "",
                description: "",
                asset_number: "",
                serial_number: "",
                cost: "",
                location: "",
                contact_person: "",
                contact_person_id: null,
                status: "available",
                requires_approval: false,
                billing_rate: "",
                billing_code: "",
                date_of_purchase: "",
                brand_name: "",
                can_book: true,
                last_calibration_date: "",
                calibration_interval_value: "",
                calibration_interval_unit: "days",
                // Depreciation fields
                placed_in_service_date: "",
                cost_basis: "",
                property_class: "5yr",
                method: "MACRS",
                bonus_eligible: true,
                section179_elected: "",
                vehicle_class: "UNKNOWN",
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedEquipment(null);
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("authToken");

            if (selectedEquipment) {
                await axios.put(
                    `/api/equipment/${selectedEquipment.id}`,
                    formData,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    },
                );
            } else {
                await axios.post("/api/equipment", formData, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            }

            fetchEquipment();
            handleCloseDialog();
        } catch (error) {
            console.error("Error saving equipment:", error);

            // Display validation errors to user
            if (
                error.response?.status === 400 &&
                error.response?.data?.errors
            ) {
                const errorMessages = error.response.data.errors.join("\n\n");
                showAlert(
                    errorMessages,
                    "error",
                    "Section 179 Validation Error",
                );
            } else {
                showAlert(
                    error.response?.data?.message ||
                        "Failed to save equipment. Please try again.",
                    "error",
                    "Error Saving Equipment",
                );
            }
        } finally {
            setLoading(false);
        }
    };

    const handleExportToExcel = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.get("/api/equipment/export/excel", {
                headers: { Authorization: `Bearer ${token}` },
                responseType: "blob",
            });

            // Create a blob from the response
            const blob = new Blob([response.data], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });

            // Create a temporary URL for the blob
            const url = window.URL.createObjectURL(blob);

            // Create a temporary anchor element and trigger download
            const link = document.createElement("a");
            link.href = url;
            link.download = `Equipment_List_${new Date().toISOString().split("T")[0]}.xlsx`;
            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            showAlert("Equipment list exported successfully!", "success");
        } catch (error) {
            console.error("Error exporting equipment:", error);
            showAlert("Failed to export equipment list", "error");
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "available":
                return "success";
            case "unavailable":
                return "default";
            case "reserved":
                return "info";
            case "out for calibration":
                return "warning";
            case "checked_out":
                return "error";
            case "retired":
                return "default";
            default:
                return "default";
        }
    };

    const isCalibrationDueSoon = (dueDate) => {
        if (!dueDate) return false;
        const due = new Date(dueDate);
        const now = new Date();
        const daysUntilDue = Math.floor((due - now) / (1000 * 60 * 60 * 24));
        return daysUntilDue <= 30 && daysUntilDue >= 0;
    };

    const filteredEquipment = equipment
        .filter((item) => {
            const search = searchTerm.toLowerCase();
            const displayStatus = getDisplayStatus(item);
            const matchesSearch =
                item.name?.toLowerCase().includes(search) ||
                item.serial_number?.toLowerCase().includes(search) ||
                item.asset_number?.toLowerCase().includes(search) ||
                item.location?.toLowerCase().includes(search) ||
                displayStatus?.toLowerCase().includes(search) ||
                item.contact_person?.toLowerCase().includes(search) ||
                item.description?.toLowerCase().includes(search);
            const matchesStatus =
                statusFilter === "all" || displayStatus === statusFilter;
            const matchesLocation =
                !filterLocation ||
                filterLocation.officeid === 0 ||
                item.location === filterLocation?.Alias;
            return matchesSearch && matchesStatus && matchesLocation;
        })
        .sort((a, b) => {
            if (!sortBy) return 0;

            let aValue, bValue;

            switch (sortBy) {
                case "name":
                    aValue = a.name?.toLowerCase() || "";
                    bValue = b.name?.toLowerCase() || "";
                    break;
                case "serial_number":
                    aValue = a.serial_number?.toLowerCase() || "";
                    bValue = b.serial_number?.toLowerCase() || "";
                    break;
                case "asset_number":
                    aValue = a.asset_number?.toLowerCase() || "";
                    bValue = b.asset_number?.toLowerCase() || "";
                    break;
                case "location":
                    aValue = a.location?.toLowerCase() || "";
                    bValue = b.location?.toLowerCase() || "";
                    break;
                case "contact":
                    aValue = a.contact_person?.toLowerCase() || "";
                    bValue = b.contact_person?.toLowerCase() || "";
                    break;
                case "status":
                    aValue = getDisplayStatus(a)?.toLowerCase() || "";
                    bValue = getDisplayStatus(b)?.toLowerCase() || "";
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
            if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });

    return (
        <Box
            sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
            }}
        >
            {/* Easter Eggs */}
            {meatRain && <MeatRain />}
            {higgyRain && <HiggyRain />}
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    mb: 3,
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        gap: 2,
                        flexDirection: isMobile ? "column" : "row",
                        flexWrap: "wrap",
                    }}
                >
                    <FormControl
                        variant="outlined"
                        size="small"
                        sx={{ flex: isMobile ? "1" : "0 0 200px" }}
                    >
                        <InputLabel id="filter-location-label">
                            Filter by Office
                        </InputLabel>
                        <Select
                            labelId="filter-location-label"
                            id="filter-location-select"
                            value={
                                filterLocation?.officeid === 0
                                    ? 0
                                    : filterLocation?.officeid
                                      ? filterLocation.officeid
                                      : ""
                            }
                            label="Filter by Office"
                            onChange={(e) => {
                                const selectedItem = locations?.find(
                                    (itm) => itm.officeid === e.target.value,
                                );
                                setFilterLocation(selectedItem || null);
                            }}
                        >
                            {locations?.map((itm) => (
                                <MenuItem
                                    key={itm.officeid}
                                    value={itm.officeid}
                                >
                                    {itm.Alias}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        placeholder="Search equipment..."
                        value={searchTerm}
                        onChange={(e) =>
                            handleSearchChange(e.target.value, setSearchTerm)
                        }
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
                    <TextField
                        select
                        label="Status"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        size="small"
                        sx={{ flex: isMobile ? "1" : "0 0 150px" }}
                    >
                        <MenuItem value="all">All Status</MenuItem>
                        <MenuItem value="available">Available</MenuItem>
                        <MenuItem value="reserved">Reserved</MenuItem>
                        <MenuItem value="out for calibration">
                            Out For Calibration
                        </MenuItem>
                        <MenuItem value="retired">Retired</MenuItem>
                    </TextField>
                    <Button
                        variant="outlined"
                        startIcon={<Download />}
                        onClick={handleExportToExcel}
                        sx={{ minWidth: isMobile ? "100%" : "auto" }}
                    >
                        Export to Excel
                    </Button>
                    {(user?.admin ||
                        user?.equipment_admin ||
                        user?.equipment_office_admin ||
                        user?.tax_admin) && (
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => handleOpenDialog()}
                            sx={{ minWidth: isMobile ? "100%" : "auto" }}
                        >
                            Add Equipment
                        </Button>
                    )}
                </Box>
            </Box>

            {isMobile ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {filteredEquipment.length === 0 ? (
                        <Paper sx={{ p: 3, textAlign: "center" }}>
                            <Typography color="text.secondary">
                                {searchTerm || statusFilter !== "all"
                                    ? "No equipment found matching your search"
                                    : "No equipment available"}
                            </Typography>
                        </Paper>
                    ) : (
                        filteredEquipment.map((item) => (
                            <Card
                                key={item.id}
                                sx={{ cursor: "pointer" }}
                                onClick={() =>
                                    navigate(`/equipment/${item.id}`)
                                }
                            >
                                <CardContent
                                    sx={{ p: 2, "&:last-child": { pb: 2 } }}
                                >
                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "start",
                                            mb: 1,
                                        }}
                                    >
                                        <Box sx={{ flex: 1 }}>
                                            <Typography
                                                variant="subtitle1"
                                                fontWeight="bold"
                                            >
                                                {item.name}
                                            </Typography>
                                            {item.serial_number && (
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    display="block"
                                                >
                                                    SN: {item.serial_number}
                                                </Typography>
                                            )}
                                        </Box>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                gap: 0.5,
                                                alignItems: "center",
                                            }}
                                        >
                                            {isCalibrationDueSoon(
                                                calculateDueDate(item),
                                            ) && (
                                                <Warning
                                                    color="warning"
                                                    fontSize="small"
                                                />
                                            )}
                                            {item?.can_book !== false && (
                                                <Chip
                                                    label={getDisplayStatus(
                                                        item,
                                                    )}
                                                    color={getStatusColor(
                                                        getDisplayStatus(item),
                                                    )}
                                                    size="small"
                                                />
                                            )}
                                        </Box>
                                    </Box>
                                    <Box
                                        sx={{ display: "flex", gap: 2, mb: 1 }}
                                    >
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{ flex: 1 }}
                                        >
                                            📍 {item.location || ""}
                                        </Typography>
                                        {item.contact_person && (
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ flex: 1 }}
                                            >
                                                👤 {item.contact_person}
                                            </Typography>
                                        )}
                                    </Box>
                                    <Box
                                        sx={{ display: "flex", gap: 1, mt: 2 }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<Visibility />}
                                            onClick={() =>
                                                navigate(
                                                    `/equipment/${item.id}`,
                                                )
                                            }
                                            fullWidth
                                        >
                                            Details
                                        </Button>
                                        {item?.can_book !== false && (
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<CalendarMonth />}
                                                onClick={() =>
                                                    navigate(
                                                        `/equipment/calendar/${item.id}`,
                                                    )
                                                }
                                                fullWidth
                                            >
                                                Calendar
                                            </Button>
                                        )}
                                    </Box>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </Box>
            ) : (
                <Paper
                    sx={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                    }}
                >
                    <TableContainer sx={{ flex: 1, overflow: "auto" }}>
                        <Table stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell>
                                        <TableSortLabel
                                            active={sortBy === "name"}
                                            direction={
                                                sortBy === "name"
                                                    ? sortOrder
                                                    : "asc"
                                            }
                                            onClick={() => handleSort("name")}
                                        >
                                            Name
                                        </TableSortLabel>
                                    </TableCell>
                                    {!isMobile && (
                                        <TableCell>
                                            <TableSortLabel
                                                active={
                                                    sortBy === "serial_number"
                                                }
                                                direction={
                                                    sortBy === "serial_number"
                                                        ? sortOrder
                                                        : "asc"
                                                }
                                                onClick={() =>
                                                    handleSort("serial_number")
                                                }
                                            >
                                                Serial Number
                                            </TableSortLabel>
                                        </TableCell>
                                    )}
                                    <TableCell>
                                        <TableSortLabel
                                            active={sortBy === "location"}
                                            direction={
                                                sortBy === "location"
                                                    ? sortOrder
                                                    : "asc"
                                            }
                                            onClick={() =>
                                                handleSort("location")
                                            }
                                        >
                                            Location
                                        </TableSortLabel>
                                    </TableCell>
                                    {!isMobile && (
                                        <TableCell>
                                            <TableSortLabel
                                                active={sortBy === "contact"}
                                                direction={
                                                    sortBy === "contact"
                                                        ? sortOrder
                                                        : "asc"
                                                }
                                                onClick={() =>
                                                    handleSort("contact")
                                                }
                                            >
                                                Contact
                                            </TableSortLabel>
                                        </TableCell>
                                    )}
                                    <TableCell>
                                        <TableSortLabel
                                            active={sortBy === "status"}
                                            direction={
                                                sortBy === "status"
                                                    ? sortOrder
                                                    : "asc"
                                            }
                                            onClick={() => handleSort("status")}
                                        >
                                            Status
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredEquipment.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={isMobile ? 4 : 6}
                                            align="center"
                                        >
                                            <Typography color="text.secondary">
                                                {searchTerm ||
                                                statusFilter !== "all"
                                                    ? "No equipment found matching your search"
                                                    : "No equipment available"}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredEquipment.map((item) => (
                                        <TableRow
                                            key={item.id}
                                            hover
                                            onClick={() =>
                                                navigate(
                                                    `/equipment/${item.id}`,
                                                )
                                            }
                                            sx={{ cursor: "pointer" }}
                                        >
                                            <TableCell>
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 1,
                                                    }}
                                                >
                                                    {item.name}
                                                    {isCalibrationDueSoon(
                                                        calculateDueDate(item),
                                                    ) && (
                                                        <Warning
                                                            color="warning"
                                                            fontSize="small"
                                                        />
                                                    )}
                                                </Box>
                                            </TableCell>
                                            {!isMobile && (
                                                <TableCell>
                                                    {item.serial_number || ""}
                                                </TableCell>
                                            )}
                                            <TableCell>
                                                {item.location || ""}
                                            </TableCell>
                                            {!isMobile && (
                                                <TableCell>
                                                    {item.contact_person || ""}
                                                </TableCell>
                                            )}
                                            <TableCell>
                                                {item?.can_book !== false && (
                                                    <Chip
                                                        label={getDisplayStatus(
                                                            item,
                                                        )}
                                                        color={getStatusColor(
                                                            getDisplayStatus(
                                                                item,
                                                            ),
                                                        )}
                                                        size="small"
                                                    />
                                                )}
                                            </TableCell>
                                            <TableCell align="right">
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        gap: 1,
                                                        justifyContent:
                                                            "flex-end",
                                                    }}
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                >
                                                    <IconButton
                                                        size="small"
                                                        onClick={() =>
                                                            navigate(
                                                                `/equipment/${item.id}`,
                                                            )
                                                        }
                                                        title="View Details"
                                                    >
                                                        <Visibility />
                                                    </IconButton>
                                                    {item?.can_book !==
                                                        false && (
                                                        <IconButton
                                                            size="small"
                                                            onClick={() =>
                                                                navigate(
                                                                    `/equipment/calendar/${item.id}`,
                                                                )
                                                            }
                                                            title="Calendar"
                                                        >
                                                            <CalendarMonth />
                                                        </IconButton>
                                                    )}
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            <EquipmentDialog
                open={openDialog}
                onClose={handleCloseDialog}
                selectedEquipment={selectedEquipment}
                formData={formData}
                setFormData={setFormData}
                locations={locations}
                users={users}
                onSave={handleSave}
                showAlert={showAlert}
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
            <AlertDialog
                open={alertState.open}
                onClose={hideAlert}
                message={alertState.message}
                severity={alertState.severity}
                title={alertState.title}
            />
        </Box>
    );
};

export default Equipment;
