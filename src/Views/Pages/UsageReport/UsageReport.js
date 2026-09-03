import React, { useState, useEffect, useMemo } from "react";
import {
    Box,
    Typography,
    Button,
    TextField,
    MenuItem,
    Card,
    Grid,
    Chip,
    CircularProgress,
    TableSortLabel,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Stack,
    IconButton,
    Tooltip,
    Divider,
} from "@mui/material";
import {
    Assessment,
    CalendarToday,
    People,
    Build,
    Schedule,
    Download,
    Search,
    Visibility,
} from "@mui/icons-material";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import useEasterEggs from "../../../hooks/useEasterEggs";
import MeatRain from "../../../Components/EasterEggs/MeatRain";
import HiggyRain from "../../../Components/EasterEggs/HiggyRain";
import {
    showError,
    showSuccess,
} from "../../../Utilites/Functions/ApiFunctions";
import useResponsive from "../../../hooks/useResponsive";
import {
    PageHeader,
    PageContainer,
    SectionCard,
    StatCard,
    EmptyState,
    FilterBar,
    CardGridSkeleton,
    Stagger,
    hoverLift,
} from "../../Components/UI";
import { useTheme } from "@mui/material/styles";

const MONTHS = [
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
];

const PERIODS = [
    { value: "ytd", label: "Year to date" },
    { value: "month", label: "Month" },
    { value: "year", label: "Full year" },
    { value: "custom", label: "Custom range" },
];

const SORT_OPTIONS = [
    ["checkout_count_desc", "Reservations (high → low)"],
    ["checkout_count_asc", "Reservations (low → high)"],
    ["total_hours_desc", "Hours (high → low)"],
    ["total_hours_asc", "Hours (low → high)"],
    ["unique_users_desc", "Users (high → low)"],
    ["unique_users_asc", "Users (low → high)"],
    ["name_asc", "Name (A–Z)"],
    ["name_desc", "Name (Z–A)"],
    ["location_asc", "Location (A–Z)"],
    ["asset_number_asc", "Asset # (A–Z)"],
    ["serial_number_asc", "Serial (A–Z)"],
];

const TABLE_COLUMNS = [
    { id: "name", label: "Equipment" },
    { id: "location", label: "Location" },
    { id: "asset_number", label: "Asset #" },
    { id: "serial_number", label: "Serial" },
    { id: "checkout_count", label: "Reservations", numeric: true },
    { id: "total_hours", label: "Hours", numeric: true },
    { id: "unique_users", label: "Users", numeric: true },
];

/**
 * Equipment usage reporting.
 *
 * The report is generated on demand, so the page has three distinct states —
 * "not run yet", "running", and "results" — each of which now says what it is
 * rather than showing an empty screen.
 */
const UsageReport = () => {
    const navigate = useNavigate();
    const theme = useTheme();
    const { isCompact } = useResponsive();
    const { meatRain, higgyRain, handleSearchChange } = useEasterEggs();

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
    const [equipmentUsage, setEquipmentUsage] = useState([]);
    const [hasRun, setHasRun] = useState(false);
    const [loadingReport, setLoadingReport] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [orderBy, setOrderBy] = useState("checkout_count");
    const [order, setOrder] = useState("desc");
    const [summary, setSummary] = useState(null);
    const [periodLabel, setPeriodLabel] = useState("");

    // ---- Data -------------------------------------------------------------

    useEffect(() => {
        fetchOffices();
        fetchAllEquipment();
    }, []);

    const authHeaders = () => ({
        headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
    });

    const fetchOffices = async () => {
        try {
            const response = await axios.get("/api/locations", authHeaders());
            setOffices(response.data.filter((o) => o.Alias !== "All"));
        } catch (error) {
            console.error("Error fetching offices:", error);
            showError("Failed to load offices");
        }
    };

    const fetchAllEquipment = async () => {
        try {
            const response = await axios.get("/api/equipment", authHeaders());
            setAllEquipment(response.data);
        } catch (error) {
            console.error("Error fetching equipment:", error);
            showError("Failed to load equipment");
        }
    };

    const generateReport = async () => {
        try {
            setLoadingReport(true);

            const params = { period: filters.period, groupBy: "equipment" };

            if (filters.period === "ytd" || filters.period === "year") {
                params.year = filters.year;
            } else if (filters.period === "month") {
                params.year = filters.year;
                params.month = filters.month;
            } else if (filters.period === "custom") {
                if (!filters.startDate || !filters.endDate) {
                    showError(
                        "Please select both start and end dates for a custom period",
                    );
                    setLoadingReport(false);
                    return;
                }
                params.startDate = filters.startDate;
                params.endDate = filters.endDate;
            }

            if (filters.office_id) params.office_id = filters.office_id;

            const response = await axios.get("/api/usage-reports", {
                ...authHeaders(),
                params,
            });

            const reportData = response.data;
            const usageMap = new Map(
                reportData.data.map((item) => [item.equipment_id, item]),
            );

            // The report is keyed by equipment id; the office filter applies to
            // the equipment list, which stores the office by alias.
            const officeAlias = filters.office_id
                ? offices.find(
                      (o) => o.officeid === parseInt(filters.office_id, 10),
                  )?.Alias
                : null;

            const enrichedData = allEquipment
                .filter((eq) => !officeAlias || eq.location === officeAlias)
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
            setHasRun(true);
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

    const filteredAndSortedEquipment = useMemo(() => {
        const search = searchTerm.toLowerCase();

        return equipmentUsage
            .filter(
                (item) =>
                    item.name?.toLowerCase().includes(search) ||
                    item.asset_number?.toLowerCase().includes(search) ||
                    item.serial_number?.toLowerCase().includes(search) ||
                    item.location?.toLowerCase().includes(search) ||
                    item.contact_person?.toLowerCase().includes(search) ||
                    item.description?.toLowerCase().includes(search) ||
                    item.billing_code?.toLowerCase().includes(search) ||
                    item.brand_name?.toLowerCase().includes(search),
            )
            .sort((a, b) => {
                let aVal = a[orderBy];
                let bVal = b[orderBy];

                if (typeof aVal === "string") {
                    aVal = aVal.toLowerCase();
                    bVal = bVal?.toLowerCase() || "";
                }
                if (aVal == null) aVal = 0;
                if (bVal == null) bVal = 0;

                if (aVal === bVal) return 0;
                const ascending = aVal < bVal ? -1 : 1;
                return order === "asc" ? ascending : -ascending;
            });
    }, [equipmentUsage, searchTerm, orderBy, order]);

    const downloadExcel = () => {
        if (!equipmentUsage.length) {
            showError("No data to export");
            return;
        }

        try {
            const headers = [
                "Equipment Name",
                "Asset Number",
                "Serial Number",
                "Location",
                "Contact Person",
                "Total Reservations",
                "Total Hours",
                "Unique Users",
            ];

            const rows = filteredAndSortedEquipment.map((item) => [
                `"${item.name || ""}"`,
                `"${item.asset_number || ""}"`,
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

            // BOM so Excel reads it as UTF-8.
            const blob = new Blob(["﻿" + csvContent], {
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

    // ---- Rendering --------------------------------------------------------

    const metricChip = (value, label, threshold, tone) => (
        <Chip
            size="small"
            label={label}
            sx={
                value > threshold
                    ? {
                          bgcolor: `${tone}.light`,
                          color: `${tone}.dark`,
                          fontWeight: 700,
                      }
                    : { bgcolor: "grey.100", color: "text.secondary" }
            }
        />
    );

    const usageCard = (item) => (
        <Card
            onClick={() => navigate(`/equipment/${item.id}`)}
            sx={{
                height: "100%",
                p: 2,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                ...hoverLift(theme),
            }}
        >
            <Typography variant="subtitle1" sx={{ lineHeight: 1.3 }}>
                {item.name}
            </Typography>

            <Typography
                variant="caption"
                color="text.disabled"
                sx={{ display: "block", mt: 0.25 }}
                noWrap
            >
                {[
                    item.asset_number && `Asset ${item.asset_number}`,
                    item.serial_number && `SN ${item.serial_number}`,
                    item.location,
                ]
                    .filter(Boolean)
                    .join(" · ")}
            </Typography>

            <Divider sx={{ my: 1.5 }} />

            <Stack
                direction="row"
                justifyContent="space-between"
                sx={{ textAlign: "center" }}
            >
                {[
                    ["Reservations", item.checkout_count || 0],
                    ["Hours", (item.total_hours || 0).toFixed(1)],
                    ["Users", item.unique_users || 0],
                ].map(([label, value]) => (
                    <Box key={label} sx={{ flex: 1 }}>
                        <Typography
                            sx={{
                                fontSize: "1.25rem",
                                fontWeight: 700,
                                fontVariantNumeric: "tabular-nums",
                                lineHeight: 1.2,
                            }}
                        >
                            {value}
                        </Typography>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: "0.6875rem" }}
                        >
                            {label}
                        </Typography>
                    </Box>
                ))}
            </Stack>
        </Card>
    );

    const resultsTable = (
        <Card sx={{ overflow: "hidden", flexShrink: 0 }}>
            {/* No height cap. The parameters and summary cards above make this a
                stacked page, so the page body owns the scrolling — capping the
                table here just produced a second scrollbar inside the first. */}
            <TableContainer>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            {TABLE_COLUMNS.map((col) => (
                                <TableCell
                                    key={col.id}
                                    align={col.numeric ? "right" : "left"}
                                >
                                    <TableSortLabel
                                        active={orderBy === col.id}
                                        direction={
                                            orderBy === col.id ? order : "asc"
                                        }
                                        onClick={() => handleSort(col.id)}
                                    >
                                        {col.label}
                                    </TableSortLabel>
                                </TableCell>
                            ))}
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredAndSortedEquipment.map((item, index) => (
                            <TableRow
                                key={item.id}
                                hover
                                onClick={() => navigate(`/equipment/${item.id}`)}
                                sx={{
                                    cursor: "pointer",
                                    animation: "seaFadeIn 240ms ease both",
                                    animationDelay: `${Math.min(index, 20) * 16}ms`,
                                }}
                            >
                                <TableCell>
                                    <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 600 }}
                                    >
                                        {item.name}
                                    </Typography>
                                </TableCell>
                                <TableCell>{item.location || "—"}</TableCell>
                                <TableCell
                                    sx={{
                                        fontFamily: (t) =>
                                            t.typography.fontFamilyMono,
                                        fontSize: "0.8125rem",
                                        color: "text.secondary",
                                    }}
                                >
                                    {item.asset_number || "—"}
                                </TableCell>
                                <TableCell
                                    sx={{
                                        fontFamily: (t) =>
                                            t.typography.fontFamilyMono,
                                        fontSize: "0.8125rem",
                                        color: "text.secondary",
                                    }}
                                >
                                    {item.serial_number || "—"}
                                </TableCell>
                                <TableCell align="right">
                                    {metricChip(
                                        item.checkout_count,
                                        `${item.checkout_count}`,
                                        0,
                                        "primary",
                                    )}
                                </TableCell>
                                <TableCell align="right">
                                    {metricChip(
                                        item.total_hours,
                                        `${(item.total_hours || 0).toFixed(1)} hrs`,
                                        0,
                                        "success",
                                    )}
                                </TableCell>
                                <TableCell align="right">
                                    {metricChip(
                                        item.unique_users,
                                        `${item.unique_users}`,
                                        0,
                                        "info",
                                    )}
                                </TableCell>
                                <TableCell align="right">
                                    <Tooltip title="View equipment">
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(
                                                    `/equipment/${item.id}`,
                                                );
                                            }}
                                        >
                                            <Visibility sx={{ fontSize: 18 }} />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Card>
    );

    return (
        <>
            {meatRain && <MeatRain />}
            {higgyRain && <HiggyRain />}

            <PageHeader
                title="Usage Report"
                subtitle={
                    periodLabel
                        ? `Showing ${periodLabel}`
                        : "Choose a period and generate a report"
                }
                actions={[
                    equipmentUsage.length > 0 && {
                        key: "export",
                        label: "Export CSV",
                        icon: <Download />,
                        onClick: downloadExcel,
                    },
                ].filter(Boolean)}
            />

            <PageContainer>
                {/* ---- Report parameters ---- */}
                <SectionCard
                    title="Report parameters"
                    icon={<Assessment />}
                    sx={{ mb: 2.5 }}
                >
                    <Grid container spacing={2} alignItems="flex-start">
                        <Grid item xs={12} sm={6} md={3}>
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
                            >
                                {PERIODS.map((p) => (
                                    <MenuItem key={p.value} value={p.value}>
                                        {p.label}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        {["ytd", "year", "month"].includes(filters.period) && (
                            <Grid item xs={6} sm={3} md={2}>
                                <TextField
                                    type="number"
                                    label="Year"
                                    value={filters.year}
                                    onChange={(e) =>
                                        setFilters({
                                            ...filters,
                                            year: parseInt(e.target.value, 10),
                                        })
                                    }
                                    fullWidth
                                />
                            </Grid>
                        )}

                        {filters.period === "month" && (
                            <Grid item xs={6} sm={3} md={2}>
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
                                >
                                    {MONTHS.map((month, index) => (
                                        <MenuItem key={month} value={index + 1}>
                                            {month}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                        )}

                        {filters.period === "custom" && (
                            <>
                                <Grid item xs={12} sm={6} md={2.5}>
                                    <TextField
                                        type="date"
                                        label="Start date"
                                        value={filters.startDate}
                                        onChange={(e) =>
                                            setFilters({
                                                ...filters,
                                                startDate: e.target.value,
                                            })
                                        }
                                        InputLabelProps={{ shrink: true }}
                                        fullWidth
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6} md={2.5}>
                                    <TextField
                                        type="date"
                                        label="End date"
                                        value={filters.endDate}
                                        onChange={(e) =>
                                            setFilters({
                                                ...filters,
                                                endDate: e.target.value,
                                            })
                                        }
                                        InputLabelProps={{ shrink: true }}
                                        fullWidth
                                    />
                                </Grid>
                            </>
                        )}

                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                select
                                label="Office"
                                value={filters.office_id}
                                onChange={(e) =>
                                    setFilters({
                                        ...filters,
                                        office_id: e.target.value,
                                    })
                                }
                                fullWidth
                            >
                                <MenuItem value="">All offices</MenuItem>
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
                                size="large"
                                startIcon={
                                    loadingReport ? (
                                        <CircularProgress
                                            size={18}
                                            color="inherit"
                                        />
                                    ) : (
                                        <Assessment />
                                    )
                                }
                            >
                                {loadingReport ? "Running…" : "Generate"}
                            </Button>
                        </Grid>
                    </Grid>
                </SectionCard>

                {/* ---- Results ---- */}
                {loadingReport && !hasRun ? (
                    <CardGridSkeleton count={6} />
                ) : !hasRun ? (
                    <EmptyState
                        icon={<Assessment />}
                        title="No report yet"
                        description="Pick a period and office above, then generate a report to see how equipment is being used."
                        action={{
                            label: "Generate report",
                            icon: <Assessment />,
                            onClick: generateReport,
                        }}
                    />
                ) : (
                    <>
                        {summary && (
                            <Grid container spacing={2} sx={{ mb: 2.5 }}>
                                <Grid item xs={6} md={3}>
                                    <StatCard
                                        label="Total reservations"
                                        value={summary.totalCheckouts}
                                        icon={<CalendarToday />}
                                        tone="primary"
                                    />
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <StatCard
                                        label="Total hours"
                                        value={summary.totalHours}
                                        icon={<Schedule />}
                                        tone="success"
                                    />
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <StatCard
                                        label="Equipment used"
                                        value={summary.uniqueEquipment}
                                        icon={<Build />}
                                        tone="warning"
                                    />
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <StatCard
                                        label="Unique users"
                                        value={summary.uniqueUsers}
                                        icon={<People />}
                                        tone="info"
                                    />
                                </Grid>
                            </Grid>
                        )}

                        <FilterBar
                            search={searchTerm}
                            onSearchChange={(value) =>
                                handleSearchChange(value, setSearchTerm)
                            }
                            searchPlaceholder="Search equipment…"
                            sx={{ mb: 2 }}
                            trailing={
                                isCompact && (
                                    <TextField
                                        select
                                        size="small"
                                        label="Sort"
                                        value={`${orderBy}_${order}`}
                                        onChange={(e) => {
                                            const parts =
                                                e.target.value.split("_");
                                            const direction = parts.pop();
                                            setOrderBy(parts.join("_"));
                                            setOrder(direction);
                                        }}
                                        sx={{ minWidth: 190 }}
                                    >
                                        {SORT_OPTIONS.map(([value, label]) => (
                                            <MenuItem key={value} value={value}>
                                                {label}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                )
                            }
                        />

                        {filteredAndSortedEquipment.length === 0 ? (
                            <EmptyState
                                icon={<Search />}
                                title="No equipment matches"
                                description="Nothing in this report matches that search."
                                action={{
                                    label: "Clear search",
                                    onClick: () => setSearchTerm(""),
                                }}
                            />
                        ) : isCompact ? (
                            <Stagger
                                component={Grid}
                                container
                                spacing={2}
                                step={30}
                                max={12}
                            >
                                {filteredAndSortedEquipment.map((item) => (
                                    <Grid item xs={12} sm={6} key={item.id}>
                                        {usageCard(item)}
                                    </Grid>
                                ))}
                            </Stagger>
                        ) : (
                            resultsTable
                        )}
                    </>
                )}
            </PageContainer>
        </>
    );
};

export default UsageReport;
