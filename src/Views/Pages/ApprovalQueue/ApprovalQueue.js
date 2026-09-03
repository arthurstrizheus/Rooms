import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
    Stack,
    Typography,
    Box,
    Card,
    TableContainer,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TableSortLabel,
    Checkbox,
    Button,
    TablePagination,
    Slide,
    Paper,
    Avatar,
    Tooltip,
    Divider,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheckOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import axios from "axios";

import { useAuth } from "../../../Utilites/AuthContext";
import { useSocket } from "../../../Contexts/SocketContext";
import {
    GetCheckoutApprovals,
    showError,
    showSuccess,
} from "../../../Utilites/Functions/ApiFunctions";
import useResponsive from "../../../hooks/useResponsive";
import {
    PageHeader,
    PageContainer,
    EmptyState,
    StatusChip,
    RowSkeleton,
    Stagger,
} from "../../Components/UI";

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

const HEADERS = [
    { id: "equipment_id", label: "Equipment" },
    { id: "user_id", label: "Requested By" },
    { id: "start_time", label: "Start" },
    { id: "end_time", label: "End" },
    { id: "status", label: "Status", sortable: false },
    { id: "notes", label: "Purpose", sortable: false },
];

/**
 * Pending reservation approvals.
 *
 * Selection now drives a floating action bar that slides in only when
 * something is selected, instead of a permanently docked footer with two
 * disabled buttons. Below `md` the table is replaced by selectable cards —
 * a seven-column table with a checkbox column doesn't survive a phone.
 */
export default function ApprovalQueue({ setLoading }) {
    const { user } = useAuth();
    const { socket } = useSocket();
    const { isCompact } = useResponsive();

    const [order, setOrder] = useState("asc");
    const [orderBy, setOrderBy] = useState("start_time");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [selected, setSelected] = useState([]);
    const [checkouts, setCheckouts] = useState([]);
    const [equipment, setEquipment] = useState([]);
    const [users, setUsers] = useState([]);
    const [update, setUpdate] = useState(0);
    const [fetched, setFetched] = useState(false);
    const fetchingRef = useRef(false);

    const refreshApprovals = useCallback(async () => {
        if (!user?.id || fetchingRef.current) return;
        fetchingRef.current = true;
        try {
            const checkoutsData = await GetCheckoutApprovals();
            setCheckouts(checkoutsData || []);
        } catch (e) {
            console.error("Error fetching approvals:", e);
        } finally {
            fetchingRef.current = false;
        }
    }, [user?.id]);

    useEffect(() => {
        const getData = async () => {
            setLoading(true);
            try {
                const [checkoutsData, equipmentData, usersData] =
                    await Promise.all([
                        GetCheckoutApprovals(user?.id),
                        axios.get("/api/equipment"),
                        axios.get("/api/users"),
                    ]);
                setCheckouts(checkoutsData || []);
                setEquipment(equipmentData.data || []);
                setUsers(usersData.data || []);
            } catch (error) {
                console.error("Error loading data:", error);
            } finally {
                setLoading(false);
                setFetched(true);
            }
        };
        if (user?.id) getData();
    }, [user, update, setLoading]);

    useEffect(() => {
        if (!socket || !user?.id) return undefined;
        const handler = (payload) => {
            const msg = payload?.message;
            if (
                msg === "checkout_approval_requested" ||
                msg === "checkout_reapproval_requested" ||
                msg === "checkout_approved" ||
                msg === "checkout_declined"
            ) {
                refreshApprovals();
            }
        };
        socket.on("message", handler);
        return () => socket.off("message", handler);
    }, [socket, user?.id, refreshApprovals]);

    // ---- Actions ----------------------------------------------------------

    const applyDecision = async (status, verb) => {
        if (selected.length === 0) {
            showError(`Please select at least one reservation to ${verb}`);
            return;
        }
        try {
            setLoading(true);
            await Promise.all(
                selected.map((checkoutId) =>
                    axios.put(`/api/checkouts/${checkoutId}`, {
                        status,
                        approved_by_user_id: user.id,
                    }),
                ),
            );
            showSuccess(
                `${selected.length} reservation${
                    selected.length === 1 ? "" : "s"
                } ${verb === "approve" ? "approved" : "declined"}`,
            );
            setSelected([]);
            setUpdate((prev) => prev + 1);
        } catch (error) {
            showError(`Failed to ${verb} reservation(s)`);
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = () => applyDecision("auto-approved", "approve");
    const handleDecline = () => applyDecision("cancelled", "decline");

    const handleRequestSort = (property) => {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    };

    const handleSelectAllClick = (event) => {
        setSelected(event.target.checked ? checkouts.map((c) => c.id) : []);
    };

    const toggle = (id) =>
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );

    const isSelected = (id) => selected.includes(id);

    // ---- Derived ----------------------------------------------------------

    const sortedCheckouts = useMemo(
        () => stableSort(checkouts, getComparator(order, orderBy)),
        [checkouts, order, orderBy],
    );

    const paginatedCheckouts = sortedCheckouts.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage,
    );

    const getEquipmentName = (equipmentId) =>
        equipment.find((e) => e.id === equipmentId)?.name ||
        "Unknown Equipment";

    const getUserName = (userId) => {
        const u = users.find((usr) => usr.id === userId);
        return u ? `${u.first_name} ${u.last_name}` : "Unknown User";
    };

    const formatDate = (dateString) =>
        new Date(dateString).toLocaleString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });

    const initialsFor = (name) =>
        name
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0])
            .join("")
            .toUpperCase();

    // ---- Rendering --------------------------------------------------------

    const empty = (
        <EmptyState
            icon={<PlaylistAddCheckIcon />}
            title="You're all caught up"
            description="There are no reservations waiting on your approval right now. New requests will appear here automatically."
        />
    );

    const mobileList = (
        <Stagger step={35} max={12}>
            {paginatedCheckouts.map((checkout) => {
                const checked = isSelected(checkout.id);
                return (
                    <Card
                        key={checkout.id}
                        onClick={() => toggle(checkout.id)}
                        sx={{
                            mb: 1.5,
                            cursor: "pointer",
                            borderColor: checked ? "primary.main" : "divider",
                            bgcolor: checked ? "primary.50" : "background.paper",
                            transition:
                                "border-color 180ms ease, background-color 180ms ease, transform 180ms ease",
                            "&:active": { transform: "scale(0.99)" },
                        }}
                    >
                        <Stack direction="row" spacing={1.5} sx={{ p: 2 }}>
                            <Checkbox
                                checked={checked}
                                onClick={(e) => e.stopPropagation()}
                                onChange={() => toggle(checkout.id)}
                                sx={{ mt: -1, ml: -1 }}
                                inputProps={{
                                    "aria-label": `Select reservation ${checkout.id}`,
                                }}
                            />
                            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                                <Stack
                                    direction="row"
                                    spacing={1}
                                    alignItems="center"
                                    sx={{ mb: 0.75 }}
                                >
                                    <Typography
                                        variant="subtitle2"
                                        sx={{ flexGrow: 1, minWidth: 0 }}
                                        noWrap
                                    >
                                        {getEquipmentName(checkout.equipment_id)}
                                    </Typography>
                                    <StatusChip status={checkout.status} />
                                </Stack>

                                <Stack
                                    direction="row"
                                    spacing={1}
                                    alignItems="center"
                                    sx={{ mb: 0.5 }}
                                >
                                    <Avatar
                                        sx={{
                                            width: 22,
                                            height: 22,
                                            fontSize: "0.625rem",
                                        }}
                                    >
                                        {initialsFor(
                                            getUserName(checkout.user_id),
                                        )}
                                    </Avatar>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        noWrap
                                    >
                                        {getUserName(checkout.user_id)}
                                    </Typography>
                                </Stack>

                                <Stack
                                    direction="row"
                                    spacing={0.75}
                                    alignItems="center"
                                >
                                    <EventOutlinedIcon
                                        sx={{
                                            fontSize: 14,
                                            color: "text.disabled",
                                        }}
                                    />
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        {formatDate(checkout.start_time)} →{" "}
                                        {formatDate(checkout.end_time)}
                                    </Typography>
                                </Stack>

                                {checkout.notes && (
                                    <>
                                        <Divider sx={{ my: 1.25 }} />
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{
                                                display: "-webkit-box",
                                                WebkitLineClamp: 3,
                                                WebkitBoxOrient: "vertical",
                                                overflow: "hidden",
                                            }}
                                        >
                                            {checkout.notes}
                                        </Typography>
                                    </>
                                )}
                            </Box>
                        </Stack>
                    </Card>
                );
            })}
        </Stagger>
    );

    const desktopTable = (
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
                <Table stickyHeader size="small" aria-label="Pending approvals">
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    indeterminate={
                                        selected.length > 0 &&
                                        selected.length < checkouts.length
                                    }
                                    checked={
                                        checkouts.length > 0 &&
                                        selected.length === checkouts.length
                                    }
                                    onChange={handleSelectAllClick}
                                    inputProps={{
                                        "aria-label": "Select all reservations",
                                    }}
                                />
                            </TableCell>
                            {HEADERS.map((header) => (
                                <TableCell key={header.id}>
                                    {header.sortable === false ? (
                                        header.label
                                    ) : (
                                        <TableSortLabel
                                            active={orderBy === header.id}
                                            direction={
                                                orderBy === header.id
                                                    ? order
                                                    : "asc"
                                            }
                                            onClick={() =>
                                                handleRequestSort(header.id)
                                            }
                                        >
                                            {header.label}
                                        </TableSortLabel>
                                    )}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedCheckouts.map((checkout, index) => {
                            const checked = isSelected(checkout.id);
                            return (
                                <TableRow
                                    hover
                                    role="checkbox"
                                    aria-checked={checked}
                                    tabIndex={-1}
                                    key={checkout.id}
                                    selected={checked}
                                    onClick={() => toggle(checkout.id)}
                                    sx={{
                                        cursor: "pointer",
                                        animation: "seaFadeIn 260ms ease both",
                                        animationDelay: `${Math.min(index, 20) * 18}ms`,
                                    }}
                                >
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={checked}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={() => toggle(checkout.id)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography
                                            variant="body2"
                                            sx={{ fontWeight: 600 }}
                                        >
                                            {getEquipmentName(
                                                checkout.equipment_id,
                                            )}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Stack
                                            direction="row"
                                            spacing={1}
                                            alignItems="center"
                                        >
                                            <Avatar
                                                sx={{
                                                    width: 24,
                                                    height: 24,
                                                    fontSize: "0.625rem",
                                                }}
                                            >
                                                {initialsFor(
                                                    getUserName(
                                                        checkout.user_id,
                                                    ),
                                                )}
                                            </Avatar>
                                            <Typography variant="body2">
                                                {getUserName(checkout.user_id)}
                                            </Typography>
                                        </Stack>
                                    </TableCell>
                                    <TableCell
                                        sx={{ whiteSpace: "nowrap" }}
                                    >
                                        {formatDate(checkout.start_time)}
                                    </TableCell>
                                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                                        {formatDate(checkout.end_time)}
                                    </TableCell>
                                    <TableCell>
                                        <StatusChip status={checkout.status} />
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            maxWidth: 260,
                                            color: "text.secondary",
                                        }}
                                    >
                                        <Tooltip
                                            title={checkout.notes || ""}
                                            disableHoverListener={
                                                !checkout.notes
                                            }
                                        >
                                            <Typography
                                                variant="body2"
                                                noWrap
                                                component="span"
                                            >
                                                {checkout.notes || "—"}
                                            </Typography>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            <Divider sx={{ flexShrink: 0 }} />
            {/* MuiTablePagination-root is `overflow: auto`, so its automatic
                flex minimum is zero and it will happily be squashed off the
                bottom of the card by the table above it. */}
            <TablePagination
                component="div"
                sx={{ flexShrink: 0 }}
                count={checkouts.length}
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
            <PageHeader
                title="Approval Queue"
                subtitle={
                    fetched
                        ? checkouts.length === 0
                            ? "Nothing waiting on you"
                            : `${checkouts.length} reservation${
                                  checkouts.length === 1 ? "" : "s"
                              } awaiting your decision`
                        : "Loading requests…"
                }
                actions={[
                    checkouts.length > 0 && {
                        key: "select-all",
                        label:
                            selected.length === checkouts.length
                                ? "Clear selection"
                                : "Select all",
                        onClick: () =>
                            setSelected(
                                selected.length === checkouts.length
                                    ? []
                                    : checkouts.map((c) => c.id),
                            ),
                    },
                ].filter(Boolean)}
            />

            <PageContainer
                fill={!isCompact}
                sx={{
                    // Room for the floating action bar so the last row is never
                    // hidden behind it.
                    pb: selected.length > 0 ? { xs: 14, sm: 12 } : undefined,
                }}
            >
                {!fetched ? (
                    <RowSkeleton count={6} height={64} />
                ) : checkouts.length === 0 ? (
                    empty
                ) : isCompact ? (
                    mobileList
                ) : (
                    desktopTable
                )}
            </PageContainer>

            {/* Selection action bar — slides in from the bottom. */}
            <Slide direction="up" in={selected.length > 0} timeout={280}>
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
                        bgcolor: "background.paper",
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
                                onClick={handleDecline}
                                variant="outlined"
                                color="error"
                                startIcon={<CancelOutlinedIcon />}
                                fullWidth
                            >
                                Decline
                            </Button>
                            <Button
                                onClick={handleApprove}
                                variant="contained"
                                color="success"
                                startIcon={<CheckCircleOutlineIcon />}
                                fullWidth
                            >
                                Approve
                            </Button>
                        </Stack>
                    </Stack>
                </Paper>
            </Slide>
        </>
    );
}
