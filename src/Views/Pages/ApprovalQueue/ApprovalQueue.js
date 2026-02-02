import React, { useEffect, useState, useCallback, useRef } from "react";
import { styled } from "@mui/material/styles";
import TableCell, { tableCellClasses } from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import { useTheme } from "@emotion/react";
import { useAuth } from "../../../Utilites/AuthContext";
import {
    Stack,
    Typography,
    Box,
    Paper,
    TableContainer,
    Table,
    TableHead,
    Checkbox,
    TableSortLabel,
    TableBody,
    Button,
    TablePagination,
    Chip,
    useMediaQuery,
} from "@mui/material";
import {
    GetCheckoutApprovals,
    showError,
    showSuccess,
} from "../../../Utilites/Functions/ApiFunctions";
import axios from "axios";
import { useSocket } from "../../../Contexts/SocketContext";

const StyledTableCell = styled(TableCell)(({ theme }) => ({
    [`&.${tableCellClasses.head}`]: {
        backgroundColor: "white",
        color: theme.palette.common.black,
        fontWeight: "Bold",
    },
    [`&.${tableCellClasses.body}`]: {
        fontSize: 14,
    },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
    "&:nth-of-type(odd)": {
        backgroundColor: theme.palette.action.hover,
    },
    "&:last-child td, &:last-child th": {
        border: 0,
    },
}));

function descendingComparator(a, b, orderBy) {
    if (typeof a[orderBy] === "string") {
        return b[orderBy].localeCompare(a[orderBy]);
    } else if (typeof a[orderBy] === "number") {
        return b[orderBy] - a[orderBy];
    } else if (a[orderBy] instanceof Date) {
        return new Date(b[orderBy]) - new Date(a[orderBy]);
    }
    return 0;
}

function getComparator(order, orderBy) {
    return order === "desc"
        ? (a, b) => descendingComparator(a, b, orderBy)
        : (a, b) => -descendingComparator(a, b, orderBy);
}

function stableSort(array, comparator) {
    const stabilizedThis = array?.map((el, index) => [el, index]);
    stabilizedThis.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        if (order !== 0) return order;
        return a[1] - b[1];
    });
    return stabilizedThis?.map((el) => el[0]);
}

export default function ApprovalQueue({ setLoading }) {
    const { user } = useAuth();
    const { socket } = useSocket();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const [order, setOrder] = useState("asc");
    const [orderBy, setOrderBy] = useState("start_time");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [selected, setSelected] = useState([]);
    const [checkouts, setCheckouts] = useState([]);
    const [equipment, setEquipment] = useState([]);
    const [users, setUsers] = useState([]);
    const [update, setUpdate] = useState(0);
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

    const handleApprove = async () => {
        if (selected.length === 0) {
            showError("Please select at least one reservation to approve");
            return;
        }

        try {
            setLoading(true);
            const promises = selected.map((checkoutId) =>
                axios.put(`/api/checkouts/${checkoutId}`, {
                    status: "auto-approved",
                    approved_by_user_id: user.id,
                }),
            );
            await Promise.all(promises);
            showSuccess(
                `${selected.length} reservation(s) approved successfully`,
            );
            setSelected([]);
            setUpdate((prev) => prev + 1);
        } catch (error) {
            showError("Failed to approve reservation(s)");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDecline = async () => {
        if (selected.length === 0) {
            showError("Please select at least one reservation to decline");
            return;
        }

        try {
            setLoading(true);
            const promises = selected.map((checkoutId) =>
                axios.put(`/api/checkouts/${checkoutId}`, {
                    status: "cancelled",
                    approved_by_user_id: user.id,
                }),
            );
            await Promise.all(promises);
            showSuccess(`${selected.length} reservation(s) declined`);
            setSelected([]);
            setUpdate((prev) => prev + 1);
        } catch (error) {
            showError("Failed to decline checkout(s)");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleRequestSort = (event, property) => {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleSelectAllClick = (event) => {
        if (event.target.checked) {
            const newSelecteds = checkouts?.map((c) => c.id);
            setSelected(newSelecteds);
            return;
        }
        setSelected([]);
    };

    const handleClick = (event, id) => {
        const selectedIndex = selected.indexOf(id);
        let newSelected = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selected, id);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selected.slice(1));
        } else if (selectedIndex === selected.length - 1) {
            newSelected = newSelected.concat(selected.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selected.slice(0, selectedIndex),
                selected.slice(selectedIndex + 1),
            );
        }

        setSelected(newSelected);
    };

    const isSelected = (id) => selected.indexOf(id) !== -1;

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
            }
        };
        if (user?.id) getData();
    }, [user, update, setLoading]);

    // Real-time: listen for checkout approval events
    useEffect(() => {
        if (!socket || !user?.id) return;
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

    const sortedCheckouts = stableSort(
        checkouts,
        getComparator(order, orderBy),
    );
    const paginatedCheckouts = sortedCheckouts.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage,
    );

    const getEquipmentName = (equipmentId) => {
        const eq = equipment.find((e) => e.id === equipmentId);
        return eq?.name || "Unknown Equipment";
    };

    const getUserName = (userId) => {
        const u = users.find((usr) => usr.id === userId);
        return u ? `${u.first_name} ${u.last_name}` : "Unknown User";
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    };

    return (
        <Box
            sx={{
                height: "100%",
                width: "100%",
                display: "flex",
                flexGrow: 1,
            }}
        >
            <Paper
                sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }}
            >
                <TableContainer sx={{ flex: 1, overflow: "auto" }}>
                    <Table
                        sx={{ minWidth: isMobile ? 300 : 700 }}
                        stickyHeader
                        aria-label="checkout approvals table"
                    >
                        <TableHead>
                            <TableRow>
                                <StyledTableCell padding="checkbox">
                                    <Checkbox
                                        indeterminate={
                                            selected?.length > 0 &&
                                            selected?.length < checkouts?.length
                                        }
                                        checked={
                                            checkouts?.length > 0 &&
                                            selected?.length ===
                                                checkouts?.length
                                        }
                                        onChange={handleSelectAllClick}
                                        inputProps={{
                                            "aria-label":
                                                "select all checkouts",
                                        }}
                                    />
                                </StyledTableCell>
                                <StyledTableCell align="left">
                                    <TableSortLabel
                                        active={orderBy === "equipment_id"}
                                        direction={
                                            orderBy === "equipment_id"
                                                ? order
                                                : "asc"
                                        }
                                        onClick={(event) =>
                                            handleRequestSort(
                                                event,
                                                "equipment_id",
                                            )
                                        }
                                    >
                                        Equipment
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell align="left">
                                    <TableSortLabel
                                        active={orderBy === "user_id"}
                                        direction={
                                            orderBy === "user_id"
                                                ? order
                                                : "asc"
                                        }
                                        onClick={(event) =>
                                            handleRequestSort(event, "user_id")
                                        }
                                    >
                                        Requested By
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell align="left">
                                    <TableSortLabel
                                        active={orderBy === "start_time"}
                                        direction={
                                            orderBy === "start_time"
                                                ? order
                                                : "asc"
                                        }
                                        onClick={(event) =>
                                            handleRequestSort(
                                                event,
                                                "start_time",
                                            )
                                        }
                                    >
                                        Start Time
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell align="left">
                                    <TableSortLabel
                                        active={orderBy === "end_time"}
                                        direction={
                                            orderBy === "end_time"
                                                ? order
                                                : "asc"
                                        }
                                        onClick={(event) =>
                                            handleRequestSort(event, "end_time")
                                        }
                                    >
                                        End Time
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell align="left">
                                    Status
                                </StyledTableCell>
                                <StyledTableCell align="left">
                                    Purpose
                                </StyledTableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody sx={{ backgroundColor: "white" }}>
                            {paginatedCheckouts?.length > 0 ? (
                                paginatedCheckouts?.map((checkout, index) => {
                                    const isItemSelected = isSelected(
                                        checkout.id,
                                    );
                                    const backgroundColor =
                                        index % 2 === 0 ? "#f0f0f0" : "#ffffff";
                                    return (
                                        <StyledTableRow
                                            hover
                                            role="checkbox"
                                            aria-checked={isItemSelected}
                                            tabIndex={-1}
                                            key={checkout.id}
                                            selected={isItemSelected}
                                            onClick={(event) =>
                                                handleClick(event, checkout.id)
                                            }
                                            sx={{
                                                cursor: "pointer",
                                                backgroundColor: `${backgroundColor} !important`,
                                            }}
                                        >
                                            <StyledTableCell padding="checkbox">
                                                <Checkbox
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        handleClick(
                                                            event,
                                                            checkout.id,
                                                        );
                                                    }}
                                                    checked={isItemSelected}
                                                    inputProps={{
                                                        "aria-labelledby": `checkout-${checkout.id}`,
                                                    }}
                                                />
                                            </StyledTableCell>
                                            <StyledTableCell
                                                component="th"
                                                scope="row"
                                            >
                                                {getEquipmentName(
                                                    checkout.equipment_id,
                                                )}
                                            </StyledTableCell>
                                            <StyledTableCell align="left">
                                                {getUserName(checkout.user_id)}
                                            </StyledTableCell>
                                            <StyledTableCell align="left">
                                                {formatDate(
                                                    checkout.start_time,
                                                )}
                                            </StyledTableCell>
                                            <StyledTableCell align="left">
                                                {formatDate(checkout.end_time)}
                                            </StyledTableCell>
                                            <StyledTableCell align="left">
                                                <Chip
                                                    label={checkout.status}
                                                    color={
                                                        checkout.status ===
                                                        "pending"
                                                            ? "warning"
                                                            : "default"
                                                    }
                                                    size="small"
                                                />
                                            </StyledTableCell>
                                            <StyledTableCell align="left">
                                                {checkout.notes || ""}
                                            </StyledTableCell>
                                        </StyledTableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <StyledTableCell colSpan={7} align="center">
                                        <Typography
                                            variant="body1"
                                            sx={{ py: 4 }}
                                        >
                                            No pending approvals
                                        </Typography>
                                    </StyledTableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Footer: actions + pagination */}
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "row",
                        borderTop: "1px solid #e0e0e0",
                    }}
                >
                    <Stack
                        direction={"row"}
                        sx={{
                            alignItems: "center",
                            padding: "10px 20px",
                        }}
                        spacing={2}
                    >
                        <Button
                            onClick={handleApprove}
                            variant="contained"
                            color="success"
                            disabled={selected?.length === 0}
                        >
                            Approve Selected ({selected?.length})
                        </Button>
                        <Button
                            onClick={handleDecline}
                            variant="outlined"
                            color="error"
                            disabled={selected?.length === 0}
                        >
                            Decline Selected ({selected?.length})
                        </Button>
                    </Stack>

                    <TablePagination
                        component="div"
                        count={checkouts?.length || 0}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                </Box>
            </Paper>
        </Box>
    );
}
