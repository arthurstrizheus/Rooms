import React, { useState, useEffect } from "react";
import {
    Box,
    Paper,
    Typography,
    Button,
    TextField,
    MenuItem,
    Card,
    CardContent,
    CardMedia,
    Grid,
    Chip,
    CircularProgress,
    useMediaQuery,
    useTheme,
    TableSortLabel,
    InputAdornment,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Avatar,
} from "@mui/material";
import useEasterEggs from "../../../hooks/useEasterEggs";
import MeatRain from "../../../Components/EasterEggs/MeatRain";
import HiggyRain from "../../../Components/EasterEggs/HiggyRain";
import {
    Assessment,
    CalendarToday,
    People,
    Build,
    Schedule,
    Download,
    TrendingUp,
    Search,
    Visibility,
} from "@mui/icons-material";
import axios from "axios";
import { useAuth } from "../../../Utilites/AuthContext";
import {
    showError,
    showSuccess,
} from "../../../Utilites/Functions/ApiFunctions";
import { useNavigate } from "react-router-dom";

const UsageReport = ({ setLoading }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const [offices, setOffices] = useState([]);
    const [allEquipment, setAllEquipment] = useState([]);
    const [filters, setFilters] = useState({
        period: "month",
        year: currentYear,
        month: currentMonth,
        startDate: "",
        endDate: "",
        office_id: "",
    });

    const { meatRain, higgyRain, handleSearchChange } = useEasterEggs();
    const [equipmentUsage, setEquipmentUsage] = useState([]);
    const [loadingReport, setLoadingReport] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [orderBy, setOrderBy] = useState("checkout_count");
    const [order, setOrder] = useState("desc");
    const [summary, setSummary] = useState(null);
    const [periodLabel, setPeriodLabel] = useState("");

    useEffect(() => {
        fetchOffices();
        fetchAllEquipment();
    }, []);

    const fetchOffices = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.get("/api/locations", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setOffices(response.data.filter((o) => o.Alias !== "All"));
        } catch (error) {
            console.error("Error fetching offices:", error);
            showError("Failed to load offices");
        }
    };

    const fetchAllEquipment = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.get("/api/equipment", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setAllEquipment(response.data);
        } catch (error) {
            console.error("Error fetching equipment:", error);
            showError("Failed to load equipment");
        }
    };

    const generateReport = async () => {
        try {
            setLoadingReport(true);
            const token = localStorage.getItem("authToken");

            // Build query params - always group by equipment for list view
            const params = {
                period: filters.period,
                groupBy: "equipment",
            };

            if (filters.period === "ytd" || filters.period === "year") {
                params.year = filters.year;
            } else if (filters.period === "month") {
                params.year = filters.year;
                params.month = filters.month;
            } else if (filters.period === "custom") {
                if (!filters.startDate || !filters.endDate) {
                    showError(
                        "Please select both start and end dates for custom period",
                    );
                    setLoadingReport(false);
                    return;
                }
                params.startDate = filters.startDate;
                params.endDate = filters.endDate;
            }

            if (filters.office_id) {
                params.office_id = filters.office_id;
            }

            const response = await axios.get("/api/usage-reports", {
                headers: { Authorization: `Bearer ${token}` },
                params,
            });

            const reportData = response.data;

            // Merge equipment data with usage data
            const usageMap = new Map(
                reportData.data.map((item) => [item.equipment_id, item]),
            );

            // Get office alias if filtering by office
            let officeAlias = null;
            if (filters.office_id) {
                const selectedOffice = offices.find(
                    (o) => o.officeid === parseInt(filters.office_id),
                );
                officeAlias = selectedOffice?.Alias;
            }

            const enrichedData = allEquipment
                .filter((eq) => {
                    // Filter by office location if specified
                    if (officeAlias) {
                        return eq.location === officeAlias;
                    }
                    return true;
                })
                .map((eq) => {
                    const usage = usageMap.get(eq.id);
                    return {
                        ...eq,
                        checkout_count: usage?.checkout_count || 0,
                        total_hours: usage?.total_hours || 0,
                        unique_users: usage?.unique_users || 0,
                    };
                });

            setEquipmentUsage(enrichedData);
            setSummary(reportData.summary);
            setPeriodLabel(reportData.period);
        } catch (error) {
            console.error("Error generating report:", error);
            showError(
                error.response?.data?.error || "Failed to generate report",
            );
        } finally {
            setLoadingReport(false);
        }
    };

    const handleSort = (property) => {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    };

    const filteredAndSortedEquipment = equipmentUsage
        .filter((item) => {
            const search = searchTerm.toLowerCase();
            return (
                item.name?.toLowerCase().includes(search) ||
                item.serial_number?.toLowerCase().includes(search) ||
                item.location?.toLowerCase().includes(search)
            );
        })
        .sort((a, b) => {
            let aVal = a[orderBy];
            let bVal = b[orderBy];

            // Handle string comparisons
            if (typeof aVal === "string") {
                aVal = aVal.toLowerCase();
                bVal = bVal?.toLowerCase() || "";
            }

            // Handle nulls
            if (aVal == null) aVal = 0;
            if (bVal == null) bVal = 0;

            if (order === "asc") {
                return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            } else {
                return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
            }
        });

    const downloadExcel = () => {
        if (!equipmentUsage || equipmentUsage.length === 0) {
            showError("No data to export");
            return;
        }

        try {
            // Create CSV content (Excel will open CSV files)
            const headers = [
                "Equipment Name",
                "Serial Number",
                "Location",
                "Contact Person",
                "Total Reservations",
                "Total Hours",
                "Unique Users",
            ];

            const rows = filteredAndSortedEquipment.map((item) => [
                `"${item.name || ""}"`,
                `"${item.serial_number || ""}"`,
                `"${item.location || ""}"`,
                `"${item.contact_person || ""}"`,
                item.checkout_count || 0,
                (item.total_hours || 0).toFixed(1),
                item.unique_users || 0,
            ]);

            const csvContent = [
                headers.join(","),
                ...rows.map((row) => row.join(",")),
            ].join("\n");

            // Add BOM for Excel UTF-8 recognition
            const BOM = "\uFEFF";
            const blob = new Blob([BOM + csvContent], {
                type: "text/csv;charset=utf-8;",
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `equipment-usage-report-${periodLabel.replace(/\s+/g, "-")}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            showSuccess("Report exported successfully");
        } catch (error) {
            console.error("Error exporting report:", error);
            showError("Failed to export report");
        }
    };

    const renderSummaryCards = () => {
        if (!summary) return null;

        return (
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                }}
                            >
                                <Box>
                                    <Typography
                                        color="textSecondary"
                                        variant="body2"
                                    >
                                        Total Reservations
                                    </Typography>
                                    <Typography variant="h4">
                                        {summary.totalCheckouts}
                                    </Typography>
                                </Box>
                                <CalendarToday
                                    sx={{
                                        fontSize: 40,
                                        color: "primary.main",
                                        opacity: 0.7,
                                    }}
                                />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                }}
                            >
                                <Box>
                                    <Typography
                                        color="textSecondary"
                                        variant="body2"
                                    >
                                        Total Hours
                                    </Typography>
                                    <Typography variant="h4">
                                        {summary.totalHours}
                                    </Typography>
                                </Box>
                                <Schedule
                                    sx={{
                                        fontSize: 40,
                                        color: "success.main",
                                        opacity: 0.7,
                                    }}
                                />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                }}
                            >
                                <Box>
                                    <Typography
                                        color="textSecondary"
                                        variant="body2"
                                    >
                                        Equipment Used
                                    </Typography>
                                    <Typography variant="h4">
                                        {summary.uniqueEquipment}
                                    </Typography>
                                </Box>
                                <Build
                                    sx={{
                                        fontSize: 40,
                                        color: "warning.main",
                                        opacity: 0.7,
                                    }}
                                />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                }}
                            >
                                <Box>
                                    <Typography
                                        color="textSecondary"
                                        variant="body2"
                                    >
                                        Unique Users
                                    </Typography>
                                    <Typography variant="h4">
                                        {summary.uniqueUsers}
                                    </Typography>
                                </Box>
                                <People
                                    sx={{
                                        fontSize: 40,
                                        color: "info.main",
                                        opacity: 0.7,
                                    }}
                                />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        );
    };

    return (
        <>
            {/* Easter Eggs */}
            {meatRain && <MeatRain />}
            {higgyRain && <HiggyRain />}
            <Box
                sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    p: 2,
                }}
            >
                {/* Filters */}
                <Paper sx={{ p: 3, mb: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={2}>
                            <TextField
                                select
                                label="Period"
                                value={filters.period}
                                onChange={(e) =>
                                    setFilters({
                                        ...filters,
                                        period: e.target.value,
                                    })
                                }
                                fullWidth
                                size="small"
                            >
                                <MenuItem value="ytd">Year-to-Date</MenuItem>
                                <MenuItem value="month">Month</MenuItem>
                                <MenuItem value="year">Full Year</MenuItem>
                                <MenuItem value="custom">Custom Range</MenuItem>
                            </TextField>
                        </Grid>

                        {(filters.period === "ytd" ||
                            filters.period === "year" ||
                            filters.period === "month") && (
                            <Grid item xs={12} md={1.5}>
                                <TextField
                                    type="number"
                                    label="Year"
                                    value={filters.year}
                                    onChange={(e) =>
                                        setFilters({
                                            ...filters,
                                            year: parseInt(e.target.value),
                                        })
                                    }
                                    fullWidth
                                    size="small"
                                />
                            </Grid>
                        )}

                        {filters.period === "month" && (
                            <Grid item xs={12} md={2}>
                                <TextField
                                    select
                                    label="Month"
                                    value={filters.month}
                                    onChange={(e) =>
                                        setFilters({
                                            ...filters,
                                            month: e.target.value,
                                        })
                                    }
                                    fullWidth
                                    size="small"
                                >
                                    {[
                                        "January",
                                        "February",
                                        "March",
                                        "April",
                                        "May",
                                        "June",
                                        "July",
                                        "August",
                                        "September",
                                        "October",
                                        "November",
                                        "December",
                                    ].map((month, index) => (
                                        <MenuItem key={index} value={index + 1}>
                                            {month}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                        )}

                        {filters.period === "custom" && (
                            <>
                                <Grid item xs={12} md={2}>
                                    <TextField
                                        type="date"
                                        label="Start Date"
                                        value={filters.startDate}
                                        onChange={(e) =>
                                            setFilters({
                                                ...filters,
                                                startDate: e.target.value,
                                            })
                                        }
                                        InputLabelProps={{ shrink: true }}
                                        fullWidth
                                        size="small"
                                    />
                                </Grid>
                                <Grid item xs={12} md={2}>
                                    <TextField
                                        type="date"
                                        label="End Date"
                                        value={filters.endDate}
                                        onChange={(e) =>
                                            setFilters({
                                                ...filters,
                                                endDate: e.target.value,
                                            })
                                        }
                                        InputLabelProps={{ shrink: true }}
                                        fullWidth
                                        size="small"
                                    />
                                </Grid>
                            </>
                        )}

                        <Grid item xs={12} md={2.5}>
                            <TextField
                                select
                                label="Office (Optional)"
                                value={filters.office_id}
                                onChange={(e) =>
                                    setFilters({
                                        ...filters,
                                        office_id: e.target.value,
                                    })
                                }
                                fullWidth
                                size="small"
                            >
                                <MenuItem value="">All Offices</MenuItem>
                                {offices.map((office) => (
                                    <MenuItem
                                        key={office.officeid}
                                        value={office.officeid}
                                    >
                                        {office.Alias}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        <Grid item xs={12} md={2}>
                            <Button
                                variant="contained"
                                onClick={generateReport}
                                disabled={loadingReport}
                                fullWidth
                                startIcon={
                                    loadingReport ? (
                                        <CircularProgress
                                            size={20}
                                            color="inherit"
                                        />
                                    ) : (
                                        <Assessment />
                                    )
                                }
                            >
                                Generate
                            </Button>
                        </Grid>

                        {equipmentUsage.length > 0 && (
                            <Grid item xs={12} md={2}>
                                <Button
                                    variant="outlined"
                                    startIcon={<Download />}
                                    onClick={downloadExcel}
                                    fullWidth
                                >
                                    Export Excel
                                </Button>
                            </Grid>
                        )}
                    </Grid>
                </Paper>

                {/* Report Content */}
                {equipmentUsage.length > 0 && (
                    <>
                        {/* Summary Cards */}
                        {renderSummaryCards()}

                        {/* Search and Sort Bar */}
                        <Box
                            sx={{
                                display: "flex",
                                gap: 2,
                                mb: 2,
                                alignItems: "center",
                            }}
                        >
                            <TextField
                                placeholder="Search equipment..."
                                value={searchTerm}
                                onChange={(e) =>
                                    handleSearchChange(
                                        e.target.value,
                                        setSearchTerm,
                                    )
                                }
                                size="small"
                                sx={{ flex: 1 }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            {isMobile && (
                                <TextField
                                    select
                                    label="Sort by"
                                    value={`${orderBy}_${order}`}
                                    onChange={(e) => {
                                        const [field, direction] =
                                            e.target.value.split("_");
                                        setOrderBy(field);
                                        setOrder(direction);
                                    }}
                                    size="small"
                                    sx={{ minWidth: 180 }}
                                >
                                    <MenuItem value="name_asc">
                                        Name (A-Z)
                                    </MenuItem>
                                    <MenuItem value="name_desc">
                                        Name (Z-A)
                                    </MenuItem>
                                    <MenuItem value="location_asc">
                                        Location (A-Z)
                                    </MenuItem>
                                    <MenuItem value="location_desc">
                                        Location (Z-A)
                                    </MenuItem>
                                    <MenuItem value="serial_number_asc">
                                        Serial (A-Z)
                                    </MenuItem>
                                    <MenuItem value="serial_number_desc">
                                        Serial (Z-A)
                                    </MenuItem>
                                    <MenuItem value="checkout_count_desc">
                                        Reservations (High-Low)
                                    </MenuItem>
                                    <MenuItem value="checkout_count_asc">
                                        Reservations (Low-High)
                                    </MenuItem>
                                    <MenuItem value="total_hours_desc">
                                        Hours (High-Low)
                                    </MenuItem>
                                    <MenuItem value="total_hours_asc">
                                        Hours (Low-High)
                                    </MenuItem>
                                    <MenuItem value="unique_users_desc">
                                        Users (High-Low)
                                    </MenuItem>
                                    <MenuItem value="unique_users_asc">
                                        Users (Low-High)
                                    </MenuItem>
                                </TextField>
                            )}
                        </Box>

                        {/* Equipment Display - Table for Desktop, Cards for Mobile */}
                        <Box sx={{ flex: 1, overflow: "auto" }}>
                            {isMobile ? (
                                // Mobile Card View
                                <>
                                    <Grid container spacing={2}>
                                        {filteredAndSortedEquipment.map(
                                            (item) => (
                                                <Grid
                                                    item
                                                    xs={12}
                                                    sm={6}
                                                    key={item.id}
                                                >
                                                    <Card
                                                        sx={{
                                                            height: "100%",
                                                            display: "flex",
                                                            flexDirection:
                                                                "column",
                                                            cursor: "pointer",
                                                            transition:
                                                                "all 0.2s",
                                                            "&:hover": {
                                                                transform:
                                                                    "translateY(-4px)",
                                                                boxShadow: 4,
                                                            },
                                                        }}
                                                        onClick={() =>
                                                            navigate(
                                                                `/equipment/${item.id}`,
                                                            )
                                                        }
                                                    >
                                                        {item.image && (
                                                            <CardMedia
                                                                component="img"
                                                                height="140"
                                                                image={
                                                                    item.image
                                                                }
                                                                alt={item.name}
                                                                sx={{
                                                                    objectFit:
                                                                        "cover",
                                                                }}
                                                            />
                                                        )}
                                                        <CardContent
                                                            sx={{
                                                                flexGrow: 1,
                                                                p: 2,
                                                                "&:last-child":
                                                                    { pb: 2 },
                                                            }}
                                                        >
                                                            <Typography
                                                                variant="h6"
                                                                gutterBottom
                                                                noWrap
                                                                sx={{ mb: 1 }}
                                                            >
                                                                {item.name}
                                                            </Typography>

                                                            {/* Serial & Location Row */}
                                                            <Box
                                                                sx={{
                                                                    display:
                                                                        "flex",
                                                                    gap: 2,
                                                                    mb: 1.5,
                                                                    flexWrap:
                                                                        "wrap",
                                                                }}
                                                            >
                                                                {item.serial_number && (
                                                                    <Typography
                                                                        variant="caption"
                                                                        color="text.secondary"
                                                                    >
                                                                        SN:{" "}
                                                                        {
                                                                            item.serial_number
                                                                        }
                                                                    </Typography>
                                                                )}
                                                                {item.location && (
                                                                    <Typography
                                                                        variant="caption"
                                                                        color="text.secondary"
                                                                    >
                                                                        📍{" "}
                                                                        {
                                                                            item.location
                                                                        }
                                                                    </Typography>
                                                                )}
                                                            </Box>

                                                            {/* Stats Row */}
                                                            <Box
                                                                sx={{
                                                                    display:
                                                                        "flex",
                                                                    gap: 1,
                                                                    justifyContent:
                                                                        "space-between",
                                                                    alignItems:
                                                                        "center",
                                                                }}
                                                            >
                                                                <Box
                                                                    sx={{
                                                                        textAlign:
                                                                            "center",
                                                                        flex: 1,
                                                                    }}
                                                                >
                                                                    <Typography
                                                                        variant="caption"
                                                                        color="text.secondary"
                                                                        display="block"
                                                                    >
                                                                        Reservations
                                                                    </Typography>
                                                                    <Chip
                                                                        label={
                                                                            item.checkout_count
                                                                        }
                                                                        color={
                                                                            item.checkout_count >
                                                                            0
                                                                                ? "primary"
                                                                                : "default"
                                                                        }
                                                                        size="small"
                                                                        sx={{
                                                                            mt: 0.5,
                                                                        }}
                                                                    />
                                                                </Box>
                                                                <Box
                                                                    sx={{
                                                                        textAlign:
                                                                            "center",
                                                                        flex: 1,
                                                                    }}
                                                                >
                                                                    <Typography
                                                                        variant="caption"
                                                                        color="text.secondary"
                                                                        display="block"
                                                                    >
                                                                        Hours
                                                                    </Typography>
                                                                    <Chip
                                                                        label={`${item.total_hours.toFixed(1)}`}
                                                                        color={
                                                                            item.total_hours >
                                                                            0
                                                                                ? "success"
                                                                                : "default"
                                                                        }
                                                                        size="small"
                                                                        sx={{
                                                                            mt: 0.5,
                                                                        }}
                                                                    />
                                                                </Box>
                                                                <Box
                                                                    sx={{
                                                                        textAlign:
                                                                            "center",
                                                                        flex: 1,
                                                                    }}
                                                                >
                                                                    <Typography
                                                                        variant="caption"
                                                                        color="text.secondary"
                                                                        display="block"
                                                                    >
                                                                        Users
                                                                    </Typography>
                                                                    <Chip
                                                                        label={
                                                                            item.unique_users
                                                                        }
                                                                        color={
                                                                            item.unique_users >
                                                                            0
                                                                                ? "info"
                                                                                : "default"
                                                                        }
                                                                        size="small"
                                                                        sx={{
                                                                            mt: 0.5,
                                                                        }}
                                                                    />
                                                                </Box>
                                                            </Box>
                                                        </CardContent>
                                                    </Card>
                                                </Grid>
                                            ),
                                        )}
                                    </Grid>
                                </>
                            ) : (
                                // Desktop Table View
                                <TableContainer component={Paper}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>
                                                    <TableSortLabel
                                                        active={
                                                            orderBy === "name"
                                                        }
                                                        direction={
                                                            orderBy === "name"
                                                                ? order
                                                                : "asc"
                                                        }
                                                        onClick={() =>
                                                            handleSort("name")
                                                        }
                                                    >
                                                        Equipment
                                                    </TableSortLabel>
                                                </TableCell>
                                                <TableCell>
                                                    <TableSortLabel
                                                        active={
                                                            orderBy ===
                                                            "location"
                                                        }
                                                        direction={
                                                            orderBy ===
                                                            "location"
                                                                ? order
                                                                : "asc"
                                                        }
                                                        onClick={() =>
                                                            handleSort(
                                                                "location",
                                                            )
                                                        }
                                                    >
                                                        Location
                                                    </TableSortLabel>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <TableSortLabel
                                                        active={
                                                            orderBy ===
                                                            "serial_number"
                                                        }
                                                        direction={
                                                            orderBy ===
                                                            "serial_number"
                                                                ? order
                                                                : "asc"
                                                        }
                                                        onClick={() =>
                                                            handleSort(
                                                                "serial_number",
                                                            )
                                                        }
                                                    >
                                                        Serial Number
                                                    </TableSortLabel>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <TableSortLabel
                                                        active={
                                                            orderBy ===
                                                            "checkout_count"
                                                        }
                                                        direction={
                                                            orderBy ===
                                                            "checkout_count"
                                                                ? order
                                                                : "asc"
                                                        }
                                                        onClick={() =>
                                                            handleSort(
                                                                "checkout_count",
                                                            )
                                                        }
                                                    >
                                                        Reservations
                                                    </TableSortLabel>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <TableSortLabel
                                                        active={
                                                            orderBy ===
                                                            "total_hours"
                                                        }
                                                        direction={
                                                            orderBy ===
                                                            "total_hours"
                                                                ? order
                                                                : "asc"
                                                        }
                                                        onClick={() =>
                                                            handleSort(
                                                                "total_hours",
                                                            )
                                                        }
                                                    >
                                                        Total Hours
                                                    </TableSortLabel>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <TableSortLabel
                                                        active={
                                                            orderBy ===
                                                            "unique_users"
                                                        }
                                                        direction={
                                                            orderBy ===
                                                            "unique_users"
                                                                ? order
                                                                : "asc"
                                                        }
                                                        onClick={() =>
                                                            handleSort(
                                                                "unique_users",
                                                            )
                                                        }
                                                    >
                                                        Unique Users
                                                    </TableSortLabel>
                                                </TableCell>
                                                <TableCell align="center">
                                                    Actions
                                                </TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {filteredAndSortedEquipment.map(
                                                (item) => (
                                                    <TableRow
                                                        key={item.id}
                                                        hover
                                                        sx={{
                                                            cursor: "pointer",
                                                            "&:hover": {
                                                                backgroundColor:
                                                                    "action.hover",
                                                            },
                                                        }}
                                                        onClick={() =>
                                                            navigate(
                                                                `/equipment/${item.id}`,
                                                            )
                                                        }
                                                    >
                                                        <TableCell>
                                                            <Box
                                                                sx={{
                                                                    display:
                                                                        "flex",
                                                                    alignItems:
                                                                        "center",
                                                                    gap: 2,
                                                                }}
                                                            >
                                                                <Avatar
                                                                    src={
                                                                        item.image
                                                                    }
                                                                    alt={
                                                                        item.name
                                                                    }
                                                                    variant="rounded"
                                                                    sx={{
                                                                        width: 56,
                                                                        height: 56,
                                                                    }}
                                                                >
                                                                    <Build />
                                                                </Avatar>
                                                                <Typography
                                                                    variant="body2"
                                                                    fontWeight={
                                                                        500
                                                                    }
                                                                >
                                                                    {item.name}
                                                                </Typography>
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2">
                                                                {item.location ||
                                                                    "—"}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Typography
                                                                variant="body2"
                                                                color="text.secondary"
                                                            >
                                                                {item.serial_number ||
                                                                    "—"}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Chip
                                                                label={
                                                                    item.checkout_count
                                                                }
                                                                color={
                                                                    item.checkout_count >
                                                                    0
                                                                        ? "primary"
                                                                        : "default"
                                                                }
                                                                size="small"
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Chip
                                                                label={`${item.total_hours.toFixed(1)} hrs`}
                                                                color={
                                                                    item.total_hours >
                                                                    0
                                                                        ? "success"
                                                                        : "default"
                                                                }
                                                                size="small"
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Chip
                                                                label={
                                                                    item.unique_users
                                                                }
                                                                color={
                                                                    item.unique_users >
                                                                    0
                                                                        ? "info"
                                                                        : "default"
                                                                }
                                                                size="small"
                                                            />
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Button
                                                                size="small"
                                                                variant="outlined"
                                                                startIcon={
                                                                    <Visibility />
                                                                }
                                                                onClick={(
                                                                    e,
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    navigate(
                                                                        `/equipment/${item.id}`,
                                                                    );
                                                                }}
                                                            >
                                                                View
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ),
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}

                            {filteredAndSortedEquipment.length === 0 && (
                                <Paper sx={{ p: 6, textAlign: "center" }}>
                                    <Search
                                        sx={{
                                            fontSize: 80,
                                            color: "text.secondary",
                                            opacity: 0.3,
                                        }}
                                    />
                                    <Typography
                                        variant="h6"
                                        color="textSecondary"
                                        sx={{ mt: 2 }}
                                    >
                                        No equipment found matching your search
                                    </Typography>
                                </Paper>
                            )}
                        </Box>
                    </>
                )}

                {!equipmentUsage.length && !loadingReport && (
                    <Paper
                        sx={{
                            p: 6,
                            textAlign: "center",
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                        }}
                    >
                        <TrendingUp
                            sx={{
                                fontSize: 80,
                                color: "text.secondary",
                                mx: "auto",
                            }}
                        />
                        <Typography
                            variant="h6"
                            color="textSecondary"
                            sx={{ mt: 2 }}
                        >
                            {periodLabel
                                ? `Usage Report: ${periodLabel}`
                                : "Equipment Usage Report"}
                        </Typography>
                        <Typography
                            variant="body2"
                            color="textSecondary"
                            sx={{ mt: 1 }}
                        >
                            Select a period and click "Generate" to view
                            equipment usage statistics
                        </Typography>
                    </Paper>
                )}
            </Box>
        </>
    );
};

export default UsageReport;
