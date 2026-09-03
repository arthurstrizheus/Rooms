import React, { useState, useEffect, useMemo } from "react";
import {
    Stack,
    Typography,
    Button,
    Box,
    Tooltip,
    TableContainer,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TablePagination,
    Checkbox,
    TableSortLabel,
    Chip,
    Collapse,
    MenuItem,
    Card,
    TextField,
    IconButton,
    Avatar,
    Divider,
    Slide,
    Paper,
} from "@mui/material";
import AddIcon from "@mui/icons-material/AddOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import PersonOffOutlinedIcon from "@mui/icons-material/PersonOffOutlined";
import HowToRegOutlinedIcon from "@mui/icons-material/HowToRegOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";

import useEasterEggs from "../../../../hooks/useEasterEggs";
import MeatRain from "../../../../Components/EasterEggs/MeatRain";
import HiggyRain from "../../../../Components/EasterEggs/HiggyRain";
import { useAuth } from "../../../../Utilites/AuthContext";
import { useSocket } from "../../../../Contexts/SocketContext";
import useResponsive from "../../../../hooks/useResponsive";
import AddUserFromAD from "./AddUserFromAD";
import AddNewUser from "./AddNewUser";
import ViewUser from "./ViewUser";
import RoleChips from "./RoleChips";
import ConfirmDialog from "../../../../Components/ConfirmDialog";
import useConfirmDialog from "../../../../hooks/useConfirmDialog";
import {
    GetLocations,
    GetUsers,
    showError,
    showSuccess,
} from "../../../../Utilites/Functions/ApiFunctions";
import {
    ActivateUser,
    DeactivateUser,
    DeleteUser,
} from "../../../../Utilites/Functions/ApiFunctions/UserFunctions";
import {
    PageHeader,
    PageContainer,
    FilterBar,
    EmptyState,
    RowSkeleton,
    Stagger,
} from "../../../Components/UI";

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

function descendingComparator(a, b, orderBy) {
    const av = a[orderBy];
    const bv = b[orderBy];
    if (typeof av === "string" && typeof bv === "string") {
        return bv.localeCompare(av);
    }
    if (typeof av === "number" && typeof bv === "number") return bv - av;
    if (av instanceof Date || bv instanceof Date) {
        return new Date(bv) - new Date(av);
    }
    return 0;
}

function getComparator(order, orderBy) {
    return order === "desc"
        ? (a, b) => descendingComparator(a, b, orderBy)
        : (a, b) => -descendingComparator(a, b, orderBy);
}

function stableSort(array, comparator) {
    const decorated = (array || []).map((el, index) => [el, index]);
    decorated.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        return order !== 0 ? order : a[1] - b[1];
    });
    return decorated.map((el) => el[0]);
}

const BULK_ACTIONS = {
    activate: {
        label: "Activate",
        icon: <HowToRegOutlinedIcon />,
        run: ActivateUser,
        past: "activated",
    },
    deactivate: {
        label: "Deactivate",
        icon: <PersonOffOutlinedIcon />,
        run: DeactivateUser,
        past: "deactivated",
    },
    remove: {
        label: "Remove",
        icon: <DeleteOutlineIcon />,
        run: DeleteUser,
        past: "removed",
        destructive: true,
    },
};

const initialsOf = (name = "") =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase();

/**
 * User administration.
 *
 * Bulk actions moved from a docked "I want to [select] selected [Submit]" row
 * to a floating action bar that appears when rows are selected, so the intent
 * of each button is visible without reading a sentence.
 */
export default function Users({ setLoading }) {
    const { user } = useAuth();
    const { socket } = useSocket();
    const { isCompact } = useResponsive();
    const { meatRain, higgyRain, handleSearchChange } = useEasterEggs();
    const { showConfirm, confirmState, hideConfirm } = useConfirmDialog();

    const [order, setOrder] = useState("asc");
    const [orderBy, setOrderBy] = useState("name");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [selected, setSelected] = useState([]);
    const [expandedRows, setExpandedRows] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [filterLocation, setFilterLocation] = useState();
    const [update, setUpdate] = useState(0);
    const [locations, setLocations] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [addFromAdOpen, setAddFromAdOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editUserLocation, setEditUserLocation] = useState(null);
    const [fetched, setFetched] = useState(false);

    const canManage =
        user?.admin ||
        user?.equipment_admin ||
        `${user?.office_admin}` === `${filterLocation?.officeid}`;

    // ---- Data -------------------------------------------------------------

    useEffect(() => {
        const getData = async () => {
            setLoading(true);
            try {
                const [lcs, usrs] = await Promise.all([
                    GetLocations(),
                    GetUsers(),
                ]);
                // Both calls swallow their own errors and can resolve to
                // undefined; default so a failed fetch shows an empty list
                // rather than throwing out of the effect.
                setUsers((usrs || []).filter((usr) => usr.id !== user?.id));
                setLocations(lcs || []);
                setFilterLocation((current) =>
                    current?.officeid || current?.officeid === 0
                        ? current
                        : lcs?.find(
                              (lc) => `${lc.officeid}` === `${user?.location}`,
                          ),
                );
            } finally {
                setLoading(false);
                setFetched(true);
            }
        };
        getData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [update]);

    useEffect(() => {
        if (!socket?.connected) return undefined;
        const handleMessage = (payload) => {
            if (payload?.message === "user_created") {
                setUpdate((prev) => prev + 1);
            }
        };
        socket.on("message", handleMessage);
        return () => socket.off("message", handleMessage);
    }, [socket?.connected, socket]);

    // ---- Derived ----------------------------------------------------------

    const locationAlias = (officeId) =>
        locations?.find((lc) => `${lc.officeid}` === `${officeId}`)?.Alias;

    // Users in the selected office, before the text search.
    const scopedUsers = useMemo(() => {
        if (!filterLocation?.officeid) return users;
        return users.filter(
            (usr) => usr.location === filterLocation.officeid,
        );
    }, [users, filterLocation]);

    const rows = useMemo(() => {
        const search = searchTerm.toLowerCase();

        const mapped = scopedUsers
            .filter(
                (itm) =>
                    search === "" ||
                    itm.first_name?.toLowerCase().includes(search) ||
                    itm.last_name?.toLowerCase().includes(search) ||
                    `${itm.first_name} ${itm.last_name}`
                        .toLowerCase()
                        .includes(search) ||
                    itm.email?.toLowerCase().includes(search) ||
                    locationAlias(itm.location)
                        ?.toLowerCase()
                        .includes(search),
            )
            .map((itm) => ({
                id: itm.id,
                name: `${itm.first_name} ${itm.last_name}`,
                email: itm.email,
                location: locationAlias(itm.location),
                active: itm.active ? "True" : "False",
                last_login: itm.last_login
                    ? new Date(itm.last_login).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                      })
                    : "Has not logged in",
                admin: itm.admin,
                office_admin: itm.office_admin,
                equipment_office_admin: itm.equipment_office_admin,
                equipment_admin: itm.equipment_admin,
                tax_admin: itm.tax_admin,
            }));

        return stableSort(mapped, getComparator(order, orderBy));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scopedUsers, locations, searchTerm, order, orderBy]);

    const paginatedRows = rows.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage,
    );

    // Reset to the first page whenever the result set changes underneath us.
    useEffect(() => {
        setPage(0);
    }, [searchTerm, filterLocation]);

    // ---- Actions ----------------------------------------------------------

    const runBulkAction = async (key) => {
        const action = BULK_ACTIONS[key];
        if (!action || selected.length === 0) return;

        const plural = selected.length > 1 ? "s" : "";

        const perform = async () => {
            try {
                setLoading(true);
                await Promise.all(selected.map((id) => action.run(id)));
                showSuccess(`${selected.length} user${plural} ${action.past}`);
            } catch (error) {
                console.error(`Failed to ${key} users:`, error);
                showError(`Failed to ${key} user${plural}`);
            } finally {
                setSelected([]);
                setUpdate((prev) => prev + 1);
                setLoading(false);
            }
        };

        if (action.destructive) {
            showConfirm(
                `Remove ${selected.length} user${plural}? This cannot be undone.`,
                perform,
                "danger",
                "Remove users",
                "Remove",
            );
            return;
        }
        perform();
    };

    const handleRequestSort = (property) => {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    };

    const handleSelectAllClick = (event) =>
        setSelected(event.target.checked ? rows.map((r) => r.id) : []);

    const toggleSelected = (id) =>
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );

    const toggleExpanded = (id) =>
        setExpandedRows((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );

    const handleEditUser = (rowUser, location) => {
        setSelectedUser(rowUser);
        setEditUserLocation(location);
        setEditDialogOpen(true);
    };

    const handleCloseEditDialog = () => {
        setEditDialogOpen(false);
        setSelectedUser(null);
        setEditUserLocation(null);
    };

    const sourceUserFor = (id) => users.find((u) => u.id === id);

    // ---- Rendering --------------------------------------------------------

    const sortHeader = (id, label) => (
        <TableCell>
            <TableSortLabel
                active={orderBy === id}
                direction={orderBy === id ? order : "asc"}
                onClick={() => handleRequestSort(id)}
            >
                {label}
            </TableSortLabel>
        </TableCell>
    );

    const ActiveChip = ({ value }) => (
        <Chip
            size="small"
            label={value === "True" ? "Active" : "Inactive"}
            sx={
                value === "True"
                    ? {
                          bgcolor: "success.light",
                          color: "success.dark",
                          fontWeight: 600,
                      }
                    : {
                          bgcolor: "grey.100",
                          color: "text.disabled",
                          fontWeight: 600,
                      }
            }
        />
    );

    const mobileList = (
        <Stagger step={30} max={12}>
            {paginatedRows.map((row) => {
                const expanded = expandedRows.includes(row.id);
                const rowUser = sourceUserFor(row.id);
                const location = locations?.find(
                    (lc) => `${lc.officeid}` === `${rowUser?.location}`,
                );

                return (
                    <Card key={row.id} sx={{ mb: 1.5 }}>
                        <Stack
                            direction="row"
                            spacing={1.5}
                            alignItems="flex-start"
                            sx={{ p: 2, cursor: "pointer" }}
                            onClick={() => toggleExpanded(row.id)}
                        >
                            <Checkbox
                                checked={selected.includes(row.id)}
                                onClick={(e) => e.stopPropagation()}
                                onChange={() => toggleSelected(row.id)}
                                sx={{ mt: -1, ml: -1 }}
                                inputProps={{
                                    "aria-label": `Select ${row.name}`,
                                }}
                            />

                            <Avatar sx={{ width: 34, height: 34 }}>
                                {initialsOf(row.name)}
                            </Avatar>

                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                <Stack
                                    direction="row"
                                    spacing={1}
                                    alignItems="center"
                                >
                                    <Typography
                                        variant="subtitle2"
                                        sx={{ flexGrow: 1, minWidth: 0 }}
                                        noWrap
                                    >
                                        {row.name}
                                    </Typography>
                                    <ActiveChip value={row.active} />
                                </Stack>

                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    noWrap
                                >
                                    {row.email}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="text.disabled"
                                    sx={{ display: "block", mt: 0.25 }}
                                >
                                    {row.location} · {row.last_login}
                                </Typography>

                                <Box sx={{ mt: 1 }}>
                                    <RoleChips
                                        row={row}
                                        locations={locations}
                                        filterLocation={filterLocation}
                                    />
                                </Box>
                            </Box>

                            <IconButton
                                size="small"
                                aria-label={expanded ? "Collapse" : "Expand"}
                                sx={{
                                    transition:
                                        "transform 240ms cubic-bezier(0.22,1,0.36,1)",
                                    transform: expanded
                                        ? "rotate(180deg)"
                                        : "none",
                                }}
                            >
                                <KeyboardArrowDownIcon fontSize="small" />
                            </IconButton>
                        </Stack>

                        <Collapse in={expanded} timeout={280} unmountOnExit>
                            <Divider />
                            <ViewUser
                                row={row}
                                locations={locations}
                                location={location}
                                rowUser={rowUser}
                                setOpen={handleEditUser}
                            />
                        </Collapse>
                    </Card>
                );
            })}
        </Stagger>
    );

    const desktopTable = (
        <Card sx={{ overflow: "hidden" }}>
            <TableContainer sx={{ maxHeight: "calc(100dvh - 340px)" }}>
                <Table stickyHeader size="small" aria-label="Users">
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    indeterminate={
                                        selected.length > 0 &&
                                        selected.length < rows.length
                                    }
                                    checked={
                                        rows.length > 0 &&
                                        selected.length === rows.length
                                    }
                                    onChange={handleSelectAllClick}
                                    inputProps={{
                                        "aria-label": "Select all users",
                                    }}
                                />
                            </TableCell>
                            {sortHeader("name", "Name")}
                            {sortHeader("email", "Email")}
                            {sortHeader("location", "Location")}
                            <TableCell>Roles</TableCell>
                            {/* Header reads "Status"; the cell chip says
                                Active/Inactive, so "Active/Active" doesn't
                                appear twice down the column. */}
                            {sortHeader("active", "Status")}
                            {sortHeader("last_login", "Last login")}
                            <TableCell padding="checkbox" />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedRows.map((row, index) => {
                            const isItemSelected = selected.includes(row.id);
                            const expanded = expandedRows.includes(row.id);
                            const rowUser = sourceUserFor(row.id);
                            const location = locations?.find(
                                (lc) =>
                                    `${lc.officeid}` === `${rowUser?.location}`,
                            );

                            return (
                                <React.Fragment key={row.id}>
                                    <TableRow
                                        hover
                                        selected={isItemSelected}
                                        onClick={() => toggleExpanded(row.id)}
                                        sx={{
                                            cursor: "pointer",
                                            animation:
                                                "seaFadeIn 240ms ease both",
                                            animationDelay: `${Math.min(index, 20) * 16}ms`,
                                            "& > .MuiTableCell-root": {
                                                borderBottom: expanded
                                                    ? "none"
                                                    : undefined,
                                            },
                                        }}
                                    >
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                checked={isItemSelected}
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                                onChange={() =>
                                                    toggleSelected(row.id)
                                                }
                                            />
                                        </TableCell>

                                        <TableCell>
                                            <Stack
                                                direction="row"
                                                spacing={1.25}
                                                alignItems="center"
                                            >
                                                <Avatar
                                                    sx={{
                                                        width: 28,
                                                        height: 28,
                                                        fontSize: "0.6875rem",
                                                    }}
                                                >
                                                    {initialsOf(row.name)}
                                                </Avatar>
                                                <Typography
                                                    variant="body2"
                                                    sx={{ fontWeight: 600 }}
                                                >
                                                    {row.name}
                                                </Typography>
                                            </Stack>
                                        </TableCell>

                                        <TableCell
                                            sx={{ color: "text.secondary" }}
                                        >
                                            {row.email}
                                        </TableCell>
                                        <TableCell>{row.location}</TableCell>
                                        <TableCell>
                                            <RoleChips
                                                row={row}
                                                locations={locations}
                                                filterLocation={filterLocation}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <ActiveChip value={row.active} />
                                        </TableCell>
                                        <TableCell
                                            sx={{
                                                color: "text.secondary",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {row.last_login}
                                        </TableCell>
                                        <TableCell padding="checkbox">
                                            <Tooltip
                                                title={
                                                    expanded
                                                        ? "Hide details"
                                                        : "Show details"
                                                }
                                            >
                                                <IconButton
                                                    size="small"
                                                    sx={{
                                                        transition:
                                                            "transform 240ms cubic-bezier(0.22,1,0.36,1)",
                                                        transform: expanded
                                                            ? "rotate(180deg)"
                                                            : "none",
                                                    }}
                                                >
                                                    <KeyboardArrowDownIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>

                                    <TableRow>
                                        <TableCell
                                            colSpan={8}
                                            sx={{
                                                p: 0,
                                                borderBottom: expanded
                                                    ? undefined
                                                    : "none",
                                            }}
                                        >
                                            <Collapse
                                                in={expanded}
                                                timeout={280}
                                                unmountOnExit
                                            >
                                                <Box sx={{ bgcolor: "grey.50" }}>
                                                    <ViewUser
                                                        row={row}
                                                        locations={locations}
                                                        location={location}
                                                        rowUser={rowUser}
                                                        setOpen={handleEditUser}
                                                    />
                                                </Box>
                                            </Collapse>
                                        </TableCell>
                                    </TableRow>
                                </React.Fragment>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            <Divider />
            <TablePagination
                component="div"
                count={rows.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                }}
            />
        </Card>
    );

    return (
        <>
            {meatRain && <MeatRain />}
            {higgyRain && <HiggyRain />}

            <PageHeader
                title="Users"
                subtitle={
                    fetched
                        ? `${rows.length} user${rows.length === 1 ? "" : "s"}${
                              filterLocation?.Alias
                                  ? ` in ${filterLocation.Alias}`
                                  : ""
                          }`
                        : "Loading users…"
                }
                actions={[
                    (user?.admin ||
                        user?.equipment_admin ||
                        user?.equipment_office_admin) && {
                        key: "add",
                        label: "Add user",
                        icon: <AddIcon />,
                        primary: true,
                        onClick: () => setAddFromAdOpen(true),
                    },
                ].filter(Boolean)}
            >
                <FilterBar
                    search={searchTerm}
                    onSearchChange={(value) =>
                        handleSearchChange(value, setSearchTerm)
                    }
                    searchPlaceholder="Search name, email, location…"
                    activeFilters={
                        filterLocation && filterLocation.officeid !== 0
                            ? [
                                  {
                                      key: "location",
                                      label: filterLocation.Alias,
                                      onClear: () =>
                                          setFilterLocation(
                                              locations.find(
                                                  (l) => l.officeid === 0,
                                              ),
                                          ),
                                  },
                              ]
                            : []
                    }
                >
                    <TextField
                        select
                        label="Location"
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
                                ),
                            )
                        }
                        sx={{ minWidth: 180 }}
                    >
                        {locations?.map((itm) => (
                            <MenuItem key={itm.officeid} value={itm.officeid}>
                                {itm.Alias}
                            </MenuItem>
                        ))}
                    </TextField>
                </FilterBar>
            </PageHeader>

            <PageContainer
                sx={{ pb: selected.length > 0 ? { xs: 14, sm: 12 } : undefined }}
            >
                {!fetched ? (
                    <RowSkeleton count={6} height={60} />
                ) : rows.length === 0 ? (
                    <EmptyState
                        icon={<PeopleAltOutlinedIcon />}
                        title="No users found"
                        description={
                            searchTerm
                                ? "Nothing matches that search in this location."
                                : "No users are assigned to this location yet."
                        }
                        action={
                            user?.admin ||
                            user?.equipment_admin ||
                            user?.equipment_office_admin
                                ? {
                                      label: "Add user",
                                      icon: <AddIcon />,
                                      onClick: () => setAddFromAdOpen(true),
                                  }
                                : undefined
                        }
                    />
                ) : isCompact ? (
                    <>
                        {mobileList}
                        <Card sx={{ mt: 1 }}>
                            <TablePagination
                                component="div"
                                count={rows.length}
                                rowsPerPage={rowsPerPage}
                                page={page}
                                onPageChange={(_, newPage) => setPage(newPage)}
                                onRowsPerPageChange={(e) => {
                                    setRowsPerPage(
                                        parseInt(e.target.value, 10),
                                    );
                                    setPage(0);
                                }}
                            />
                        </Card>
                    </>
                ) : (
                    desktopTable
                )}
            </PageContainer>

            {/* ---- Bulk action bar ---- */}
            <Slide
                direction="up"
                in={selected.length > 0 && canManage}
                timeout={280}
            >
                <Paper
                    elevation={0}
                    sx={{
                        position: "fixed",
                        left: { xs: 12, sm: "50%" },
                        right: { xs: 12, sm: "auto" },
                        transform: { sm: "translateX(-50%)" },
                        bottom: {
                            xs: "calc(70px + env(safe-area-inset-bottom))",
                            md: 24,
                        },
                        zIndex: (t) => t.zIndex.snackbar,
                        px: 2,
                        py: 1.5,
                        borderRadius: 3,
                        border: "1px solid",
                        borderColor: "divider",
                        boxShadow: (t) => t.shadowTokens.xl,
                    }}
                >
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.5}
                        alignItems={{ xs: "stretch", sm: "center" }}
                    >
                        <Typography
                            variant="body2"
                            sx={{
                                fontWeight: 600,
                                px: { sm: 1 },
                                textAlign: { xs: "center", sm: "left" },
                            }}
                        >
                            {selected.length} selected
                        </Typography>
                        <Stack direction="row" spacing={1}>
                            <Button
                                variant="outlined"
                                startIcon={BULK_ACTIONS.deactivate.icon}
                                onClick={() => runBulkAction("deactivate")}
                                fullWidth
                            >
                                Deactivate
                            </Button>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={BULK_ACTIONS.activate.icon}
                                onClick={() => runBulkAction("activate")}
                                fullWidth
                            >
                                Activate
                            </Button>
                            <Tooltip title="Remove selected users">
                                <IconButton
                                    onClick={() => runBulkAction("remove")}
                                    aria-label="Remove selected users"
                                    sx={{
                                        border: "1px solid",
                                        borderColor: "divider",
                                        borderRadius: 2,
                                        color: "error.main",
                                    }}
                                >
                                    <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Stack>
                    </Stack>
                </Paper>
            </Slide>

            <AddUserFromAD
                open={addFromAdOpen}
                setOpen={setAddFromAdOpen}
                locations={locations}
                setUpdate={setUpdate}
            />

            <AddNewUser
                open={editDialogOpen}
                setOpen={handleCloseEditDialog}
                userLocation={editUserLocation}
                selectedUser={selectedUser}
                locations={locations}
                setUpdate={setUpdate}
                filterLocation={filterLocation}
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
}
