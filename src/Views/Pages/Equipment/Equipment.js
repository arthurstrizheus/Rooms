import React, { useState, useEffect, useMemo } from "react";
import {
    Box,
    Card,
    Grid,
    Typography,
    Button,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    MenuItem,
    TextField,
    Tooltip,
    Stack,
    Chip,
    ToggleButton,
    ToggleButtonGroup,
    Link,
} from "@mui/material";
import {
    Add,
    CalendarMonth,
    Warning,
    Visibility,
    Download,
    GridViewOutlined,
    FormatListBulletedOutlined,
    PlaceOutlined,
    PersonOutline,
    BuildOutlined,
    SearchOff,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import useEasterEggs from "../../../hooks/useEasterEggs";
import MeatRain from "../../../Components/EasterEggs/MeatRain";
import HiggyRain from "../../../Components/EasterEggs/HiggyRain";
import { useAuth } from "../../../Utilites/AuthContext";
import { useSocket } from "../../../Contexts/SocketContext";
import ConfirmDialog from "../../../Components/ConfirmDialog";
import useConfirmDialog from "../../../hooks/useConfirmDialog";
import AlertDialog from "../../../Components/AlertDialog";
import useAlertDialog from "../../../hooks/useAlertDialog";
import useLocalStorage from "../../../hooks/useLocalStorage";
import useResponsive from "../../../hooks/useResponsive";
import EquipmentDialog from "./EquipmentDialog";
import { toApproverFormValues } from "../../Components/Equipment/ApproverPicker";
import {
    PageHeader,
    PageContainer,
    FilterBar,
    EmptyState,
    StatusChip,
    Stagger,
    CardGridSkeleton,
    hoverLift,
} from "../../Components/UI";
import { useTheme } from "@mui/material/styles";

const LIBRARY_URL =
    "https://sealimited.softlinkliberty.net/liberty/libraryHome.do";

const STATUS_OPTIONS = [
    { value: "all", label: "All statuses" },
    { value: "available", label: "Available" },
    { value: "reserved", label: "Reserved" },
    { value: "out for calibration", label: "Out for calibration" },
    { value: "retired", label: "Retired" },
];

/**
 * Deterministic tint per item, so the same piece of equipment always gets the
 * same tile color and the grid reads as a set rather than noise.
 */
function tileHue(name = "") {
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) {
        hash = (hash * 31 + name.charCodeAt(i)) % 360;
    }
    return hash;
}

function initials(name = "") {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase();
}

const Equipment = ({ setLoading, loading }) => {
    const [equipment, setEquipment] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedEquipment, setSelectedEquipment] = useState(null);
    const [activeCheckouts, setActiveCheckouts] = useState([]);
    const [fetched, setFetched] = useState(false);
    const [locations, setLocations] = useState([]);
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [filterLocation, setFilterLocation] = useState(null);
    const [sortBy, setSortBy] = useState(null);
    const [sortOrder, setSortOrder] = useState("asc");
    const [view, setView] = useLocalStorage("equipment-view", "grid");

    const { meatRain, higgyRain, handleSearchChange } = useEasterEggs();
    const navigate = useNavigate();
    const theme = useTheme();
    const { user } = useAuth();
    const { socket } = useSocket();
    const { confirmState, hideConfirm } = useConfirmDialog();
    const { showAlert, alertState, hideAlert } = useAlertDialog();
    const { isCompact } = useResponsive();

    // Cards below md regardless of the stored preference — a six-column table
    // is not usable on a phone.
    const effectiveView = isCompact ? "grid" : view;

    const canManage =
        user?.admin ||
        user?.equipment_admin ||
        user?.equipment_office_admin ||
        user?.tax_admin;

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
        approvers: [],
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

    // ---- Data -------------------------------------------------------------

    const calculateDueDate = (item) => {
        if (!item.last_calibration_date || !item.calibration_interval_value) {
            return null;
        }
        const dueDate = new Date(item.last_calibration_date);
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
            default:
                break;
        }
        return dueDate;
    };

    useEffect(() => {
        fetchEquipment();
        fetchLocations();
        fetchUsers();
        fetchActiveCheckouts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Statuses go stale as reservations start and end, so refresh on a timer.
    useEffect(() => {
        const interval = setInterval(fetchActiveCheckouts, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!socket?.connected) return undefined;

        const handleMessage = (payload) => {
            switch (payload?.message) {
                case "equipment_added":
                case "equipment_updated":
                case "equipment_deleted":
                    fetchEquipment();
                    break;
                case "checkout_created":
                case "checkout_updated":
                case "checkout_approved":
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
            setFilterLocation(response?.data[0] || null);
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
            setFetched(true);
        }
    };

    const fetchActiveCheckouts = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const now = new Date().toISOString();
            const response = await axios.get(
                `/api/checkouts?start=${now}&end=${now}`,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            setActiveCheckouts(response.data);
        } catch (error) {
            console.error("Error fetching active checkouts:", error);
        }
    };

    /** The approver set for one item, in the shape the edit form posts back. */
    const fetchApprovers = async (equipmentId) => {
        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.get(`/api/equipment/${equipmentId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return toApproverFormValues(response.data?.Approvers);
        } catch (error) {
            console.error("Error fetching equipment approvers:", error);
            return [];
        }
    };

    const isEquipmentCurrentlyCheckedOut = (equipmentId) => {
        const now = new Date();
        return activeCheckouts.some((checkout) => {
            if (checkout.equipment_id !== equipmentId) return false;
            if (checkout.status === "cancelled") return false;
            return (
                now >= new Date(checkout.start_time) &&
                now <= new Date(checkout.end_time)
            );
        });
    };

    const getDisplayStatus = (item) =>
        isEquipmentCurrentlyCheckedOut(item.id) ? "reserved" : item.status;

    const isCalibrationDueSoon = (dueDate) => {
        if (!dueDate) return false;
        const daysUntilDue = Math.floor(
            (new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24),
        );
        return daysUntilDue <= 30 && daysUntilDue >= 0;
    };

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortBy(column);
            setSortOrder("asc");
        }
    };

    const handleOpenDialog = async (item = null) => {
        if (item) {
            setSelectedEquipment(item);
            setFormData({
                ...item,
                approvers: toApproverFormValues(item.Approvers),
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
            setOpenDialog(true);

            // The list payload is trimmed and need not carry Approvers; only
            // the detail record is contracted to. Without this top-up, saving
            // from the list would post an empty set and wipe the approvers.
            if (!Array.isArray(item.Approvers)) {
                const approvers = await fetchApprovers(item.id);
                setFormData((prev) => ({ ...prev, approvers }));
            }
            return;
        }

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
            approvers: [],
            billing_rate: "",
            billing_code: "",
            date_of_purchase: "",
            brand_name: "",
            can_book: true,
            last_calibration_date: "",
            calibration_interval_value: "",
            calibration_interval_unit: "days",
            placed_in_service_date: "",
            cost_basis: "",
            property_class: "5yr",
            method: "MACRS",
            bonus_eligible: true,
            section179_elected: "",
            vehicle_class: "UNKNOWN",
        });
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
                    { headers: { Authorization: `Bearer ${token}` } },
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
            if (
                error.response?.status === 400 &&
                error.response?.data?.errors
            ) {
                showAlert(
                    error.response.data.errors.join("\n\n"),
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

            const blob = new Blob([response.data], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `Equipment_List_${new Date().toISOString().split("T")[0]}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            showAlert("Equipment list exported successfully!", "success");
        } catch (error) {
            console.error("Error exporting equipment:", error);
            showAlert("Failed to export equipment list", "error");
        }
    };

    // ---- Derived ----------------------------------------------------------

    const filteredEquipment = useMemo(() => {
        const search = searchTerm.toLowerCase();

        return equipment
            .filter((item) => {
                const displayStatus = getDisplayStatus(item);
                const matchesSearch =
                    item.name?.toLowerCase().includes(search) ||
                    item.serial_number?.toLowerCase().includes(search) ||
                    item.asset_number?.toLowerCase().includes(search) ||
                    item.location?.toLowerCase().includes(search) ||
                    displayStatus?.toLowerCase().includes(search) ||
                    item.contact_person?.toLowerCase().includes(search) ||
                    item.description?.toLowerCase().includes(search) ||
                    item.billing_code?.toLowerCase().includes(search) ||
                    item.brand_name?.toLowerCase().includes(search);
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

                let aValue;
                let bValue;
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        equipment,
        activeCheckouts,
        searchTerm,
        statusFilter,
        filterLocation,
        sortBy,
        sortOrder,
    ]);

    const availableCount = useMemo(
        () =>
            filteredEquipment.filter(
                (item) => getDisplayStatus(item) === "available",
            ).length,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [filteredEquipment, activeCheckouts],
    );

    const activeFilters = [
        statusFilter !== "all" && {
            key: "status",
            label:
                STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ||
                statusFilter,
            onClear: () => setStatusFilter("all"),
        },
        filterLocation &&
            filterLocation.officeid !== 0 && {
                key: "location",
                label: filterLocation.Alias,
                onClear: () =>
                    setFilterLocation(
                        locations.find((l) => l.officeid === 0) || null,
                    ),
            },
    ].filter(Boolean);

    const isFiltered = Boolean(searchTerm) || activeFilters.length > 0;

    // ---- Rendering --------------------------------------------------------

    // A plain function, not a component. Declaring a component inside the
    // render body gives it a new identity every render, which makes React
    // unmount and rebuild every card on each keystroke in the search field.
    const renderEquipmentCard = (item) => {
        const status = getDisplayStatus(item);
        const calDue = isCalibrationDueSoon(calculateDueDate(item));
        const hue = tileHue(item.name || "");

        return (
            <Card
                onClick={() => navigate(`/equipment/${item.id}`)}
                sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    cursor: "pointer",
                    ...hoverLift(theme),
                }}
            >
                {/* Monogram tile — no image request per card, and it keeps the
                    grid rhythm even for items with no photo on file. */}
                <Box
                    sx={{
                        position: "relative",
                        height: 92,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: `linear-gradient(135deg, hsl(${hue} 42% 96%) 0%, hsl(${(hue + 40) % 360} 38% 92%) 100%)`,
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        overflow: "hidden",
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: "1.75rem",
                            fontWeight: 700,
                            letterSpacing: "-0.03em",
                            color: `hsl(${hue} 30% 38%)`,
                            userSelect: "none",
                        }}
                    >
                        {initials(item.name) || <BuildOutlined />}
                    </Typography>

                    <Stack
                        direction="row"
                        spacing={0.5}
                        sx={{ position: "absolute", top: 8, right: 8 }}
                    >
                        {calDue && (
                            <Tooltip title="Calibration due within 30 days">
                                <Box
                                    sx={{
                                        display: "flex",
                                        p: 0.5,
                                        borderRadius: 1.5,
                                        bgcolor: "warning.light",
                                        color: "warning.dark",
                                    }}
                                >
                                    <Warning sx={{ fontSize: 15 }} />
                                </Box>
                            </Tooltip>
                        )}
                        {item?.can_book !== false && (
                            <StatusChip status={status} />
                        )}
                    </Stack>
                </Box>

                <Box
                    sx={{
                        p: 2,
                        flexGrow: 1,
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    <Typography
                        variant="subtitle1"
                        sx={{
                            lineHeight: 1.35,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                        }}
                    >
                        {item.name}
                    </Typography>

                    {item.serial_number && (
                        <Typography
                            variant="caption"
                            sx={{
                                color: "text.disabled",
                                fontFamily: (t) => t.typography.fontFamilyMono,
                                fontSize: "0.6875rem",
                                mt: 0.25,
                            }}
                            noWrap
                        >
                            {item.serial_number}
                        </Typography>
                    )}

                    <Stack spacing={0.5} sx={{ mt: 1.5, flexGrow: 1 }}>
                        {item.location && (
                            <Stack
                                direction="row"
                                spacing={0.75}
                                alignItems="center"
                            >
                                <PlaceOutlined
                                    sx={{ fontSize: 14, color: "text.disabled" }}
                                />
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    noWrap
                                >
                                    {item.location}
                                </Typography>
                            </Stack>
                        )}
                        {item.contact_person && (
                            <Stack
                                direction="row"
                                spacing={0.75}
                                alignItems="center"
                            >
                                <PersonOutline
                                    sx={{ fontSize: 14, color: "text.disabled" }}
                                />
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    noWrap
                                >
                                    {item.contact_person}
                                </Typography>
                            </Stack>
                        )}
                    </Stack>

                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{ mt: 2 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Visibility sx={{ fontSize: 16 }} />}
                            onClick={() => navigate(`/equipment/${item.id}`)}
                            fullWidth
                        >
                            Details
                        </Button>
                        {item?.can_book !== false && (
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={
                                    <CalendarMonth sx={{ fontSize: 16 }} />
                                }
                                onClick={() =>
                                    navigate(`/equipment/calendar/${item.id}`)
                                }
                                fullWidth
                            >
                                Schedule
                            </Button>
                        )}
                    </Stack>
                </Box>
            </Card>
        );
    };

    const sortableHeader = (id, label) => (
        <TableCell>
            <TableSortLabel
                active={sortBy === id}
                direction={sortBy === id ? sortOrder : "asc"}
                onClick={() => handleSort(id)}
            >
                {label}
            </TableSortLabel>
        </TableCell>
    );

    const emptyState = (
        <EmptyState
            icon={isFiltered ? <SearchOff /> : <BuildOutlined />}
            title={
                isFiltered
                    ? "No equipment matches those filters"
                    : "No equipment yet"
            }
            description={
                isFiltered
                    ? "Try a different search term, or clear the filters to see everything."
                    : canManage
                      ? "Add the first piece of equipment to get started."
                      : "Nothing has been added to this office yet."
            }
            action={
                isFiltered
                    ? {
                          label: "Clear filters",
                          onClick: () => {
                              setSearchTerm("");
                              setStatusFilter("all");
                              setFilterLocation(
                                  locations.find((l) => l.officeid === 0) ||
                                      null,
                              );
                          },
                      }
                    : canManage
                      ? {
                            label: "Add equipment",
                            icon: <Add />,
                            onClick: () => handleOpenDialog(),
                        }
                      : undefined
            }
        />
    );

    return (
        <>
            {meatRain && <MeatRain />}
            {higgyRain && <HiggyRain />}

            <PageHeader
                title="Equipment"
                subtitle={
                    fetched
                        ? `${filteredEquipment.length} item${
                              filteredEquipment.length === 1 ? "" : "s"
                          } · ${availableCount} available now`
                        : "Loading catalog…"
                }
                actions={[
                    canManage && {
                        key: "add",
                        label: "Add Equipment",
                        icon: <Add />,
                        primary: true,
                        onClick: () => handleOpenDialog(),
                    },
                    {
                        key: "export",
                        label: "Export to Excel",
                        icon: <Download />,
                        onClick: handleExportToExcel,
                    },
                ].filter(Boolean)}
            >
                <FilterBar
                    search={searchTerm}
                    onSearchChange={(value) =>
                        handleSearchChange(value, setSearchTerm)
                    }
                    searchPlaceholder="Search name, serial, asset, contact…"
                    activeFilters={activeFilters}
                    onClearAll={() => {
                        setStatusFilter("all");
                        setFilterLocation(
                            locations.find((l) => l.officeid === 0) || null,
                        );
                    }}
                    trailing={
                        !isCompact && (
                            <ToggleButtonGroup
                                size="small"
                                exclusive
                                value={view}
                                onChange={(_, v) => v && setView(v)}
                                aria-label="View mode"
                            >
                                <ToggleButton value="grid" aria-label="Grid">
                                    <GridViewOutlined sx={{ fontSize: 18 }} />
                                </ToggleButton>
                                <ToggleButton value="table" aria-label="Table">
                                    <FormatListBulletedOutlined
                                        sx={{ fontSize: 18 }}
                                    />
                                </ToggleButton>
                            </ToggleButtonGroup>
                        )
                    }
                >
                    <TextField
                        select
                        label="Office"
                        size="small"
                        value={
                            filterLocation?.officeid === 0
                                ? 0
                                : filterLocation?.officeid || ""
                        }
                        onChange={(e) =>
                            setFilterLocation(
                                locations?.find(
                                    (itm) => itm.officeid === e.target.value,
                                ) || null,
                            )
                        }
                        sx={{ minWidth: 170 }}
                    >
                        {locations?.map((itm) => (
                            <MenuItem key={itm.officeid} value={itm.officeid}>
                                {itm.Alias}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        label="Status"
                        size="small"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        sx={{ minWidth: 160 }}
                    >
                        {STATUS_OPTIONS.map((o) => (
                            <MenuItem key={o.value} value={o.value}>
                                {o.label}
                            </MenuItem>
                        ))}
                    </TextField>
                </FilterBar>
            </PageHeader>

            {/* The table sizes itself to the page and scrolls internally; the
                card grid is free-flowing, so the page body scrolls instead. */}
            <PageContainer fill={effectiveView === "table"}>
                <Typography
                    variant="caption"
                    sx={{
                        color: "text.disabled",
                        mb: 2,
                        display: "block",
                        flexShrink: 0,
                    }}
                >
                    The full equipment listing is also available on the{" "}
                    <Link
                        href={LIBRARY_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        library website
                    </Link>
                    .
                </Typography>

                {!fetched && loading ? (
                    <CardGridSkeleton count={8} />
                ) : filteredEquipment.length === 0 ? (
                    emptyState
                ) : effectiveView === "grid" ? (
                    <Stagger
                        component={Grid}
                        container
                        spacing={{ xs: 1.5, sm: 2.5 }}
                        step={30}
                        max={16}
                    >
                        {filteredEquipment.map((item) => (
                            <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                                {renderEquipmentCard(item)}
                            </Grid>
                        ))}
                    </Stagger>
                ) : (
                    <Card
                        sx={{
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "column",
                            flexGrow: 1,
                            minHeight: 0,
                        }}
                    >
                        <TableContainer sx={{ flexGrow: 1, minHeight: 0 }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        {sortableHeader("name", "Name")}
                                        {sortableHeader(
                                            "serial_number",
                                            "Serial Number",
                                        )}
                                        {sortableHeader("location", "Location")}
                                        {sortableHeader("contact", "Contact")}
                                        {sortableHeader("status", "Status")}
                                        <TableCell align="right">
                                            Actions
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredEquipment.map((item, index) => {
                                        const calDue = isCalibrationDueSoon(
                                            calculateDueDate(item),
                                        );
                                        return (
                                            <TableRow
                                                key={item.id}
                                                hover
                                                onClick={() =>
                                                    navigate(
                                                        `/equipment/${item.id}`,
                                                    )
                                                }
                                                sx={{
                                                    cursor: "pointer",
                                                    animation:
                                                        "seaFadeIn 260ms ease both",
                                                    animationDelay: `${Math.min(index, 20) * 18}ms`,
                                                    "&:hover .row-actions": {
                                                        opacity: 1,
                                                    },
                                                }}
                                            >
                                                <TableCell>
                                                    <Stack
                                                        direction="row"
                                                        spacing={1}
                                                        alignItems="center"
                                                    >
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            {item.name}
                                                        </Typography>
                                                        {calDue && (
                                                            <Tooltip title="Calibration due within 30 days">
                                                                <Warning
                                                                    color="warning"
                                                                    sx={{
                                                                        fontSize: 16,
                                                                    }}
                                                                />
                                                            </Tooltip>
                                                        )}
                                                        {item?.can_book ===
                                                            false && (
                                                            <Chip
                                                                label="Not bookable"
                                                                size="small"
                                                                variant="outlined"
                                                            />
                                                        )}
                                                    </Stack>
                                                </TableCell>
                                                <TableCell
                                                    sx={{
                                                        fontFamily: (t) =>
                                                            t.typography
                                                                .fontFamilyMono,
                                                        fontSize: "0.8125rem",
                                                        color: "text.secondary",
                                                    }}
                                                >
                                                    {item.serial_number || "—"}
                                                </TableCell>
                                                <TableCell>
                                                    {item.location || "—"}
                                                </TableCell>
                                                <TableCell>
                                                    {item.contact_person || "—"}
                                                </TableCell>
                                                <TableCell>
                                                    {item?.can_book !==
                                                        false && (
                                                        <StatusChip
                                                            status={getDisplayStatus(
                                                                item,
                                                            )}
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Stack
                                                        className="row-actions"
                                                        direction="row"
                                                        spacing={0.5}
                                                        justifyContent="flex-end"
                                                        onClick={(e) =>
                                                            e.stopPropagation()
                                                        }
                                                        sx={{
                                                            opacity: {
                                                                xs: 1,
                                                                md: 0.35,
                                                            },
                                                            transition:
                                                                "opacity 180ms ease",
                                                        }}
                                                    >
                                                        <Tooltip title="View details">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() =>
                                                                    navigate(
                                                                        `/equipment/${item.id}`,
                                                                    )
                                                                }
                                                            >
                                                                <Visibility
                                                                    sx={{
                                                                        fontSize: 18,
                                                                    }}
                                                                />
                                                            </IconButton>
                                                        </Tooltip>
                                                        {item?.can_book !==
                                                            false && (
                                                            <Tooltip title="Schedule">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() =>
                                                                        navigate(
                                                                            `/equipment/calendar/${item.id}`,
                                                                        )
                                                                    }
                                                                >
                                                                    <CalendarMonth
                                                                        sx={{
                                                                            fontSize: 18,
                                                                        }}
                                                                    />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Card>
                )}
            </PageContainer>

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
        </>
    );
};

export default Equipment;
