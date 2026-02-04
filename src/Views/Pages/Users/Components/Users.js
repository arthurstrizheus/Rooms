import React, { useState, useEffect } from "react";
import { styled } from "@mui/material/styles";
import TableCell, { tableCellClasses } from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import useEasterEggs from "../../../../hooks/useEasterEggs";
import MeatRain from "../../../../Components/EasterEggs/MeatRain";
import HiggyRain from "../../../../Components/EasterEggs/HiggyRain";
import { useTheme } from "@emotion/react";
import { useAuth } from "../../../../Utilites/AuthContext";
import { useSocket } from "../../../../Contexts/SocketContext";
import { useNavigate } from "react-router-dom";
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
    TablePagination,
    Paper,
    Checkbox,
    TableSortLabel,
    Chip,
    Collapse,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    useMediaQuery,
    Card,
    CardContent,
    TextField,
    InputAdornment,
} from "@mui/material";
import AddUserFromAD from "./AddUserFromAD";
import AddNewUser from "./AddNewUser";
import AddIcon from "@mui/icons-material/AddOutlined";
import { Search } from "@mui/icons-material";
import ShortSelect from "../../../../Components/ShortSelect";
import ViewUser from "./ViewUser";
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

function createData(
    id,
    name,
    email,
    location,
    active,
    last_login,
    admin,
    office_admin,
    equipment_office_admin,
    equipment_admin,
    tax_admin,
) {
    return {
        id,
        name,
        email,
        location,
        active,
        last_login,
        admin,
        office_admin,
        equipment_office_admin,
        equipment_admin,
        tax_admin,
    };
}

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

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function Users({ setLoading }) {
    const { user } = useAuth();
    const { socket } = useSocket();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const [order, setOrder] = useState("asc");
    const [orderBy, setOrderBy] = useState("name");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const { meatRain, higgyRain, handleSearchChange } = useEasterEggs();
    const [selected, setSelected] = useState([]);
    const [paginatedRows, setPaginatedRows] = useState([]);
    const [rowsOpen, setRowsOpen] = useState([]);
    const [action, setAction] = useState("Activate");
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [filterLocation, setFilterLocation] = useState();
    const [update, setUpdate] = useState(0);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [locations, setLocations] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [addFromAdOpen, setAddFromAdOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editUserLocation, setEditUserLocation] = useState(null);

    const handleSubmit = () => {
        const remove = async () => {
            const promises = filteredUsers?.map(async (itm) =>
                isSelected(itm.id) ? await DeleteUser(itm.id) : null,
            );
            await Promise.all(promises).then((resp) =>
                resp
                    ? showSuccess(
                          `User${filteredUsers?.length > 1 ? "s" : ""} Deleted`,
                      )
                    : showError(
                          `Failed to delete user${
                              filteredUsers?.length > 1 ? "s" : ""
                          }`,
                      ),
            );
            setSelected([]);
            setUpdate((prev) => prev + 1);
        };

        const activate = async () => {
            const promises = filteredUsers?.map(async (itm) =>
                isSelected(itm.id) ? await ActivateUser(itm.id) : null,
            );
            await Promise.all(promises).then((resp) =>
                resp
                    ? showSuccess(
                          `User${
                              filteredUsers?.length > 1 ? "s" : ""
                          } Activated`,
                      )
                    : showError(
                          `Failed to activate user${
                              filteredUsers?.length > 1 ? "s" : ""
                          }`,
                      ),
            );
            setSelected([]);
            setUpdate((prev) => prev + 1);
        };

        const deactivate = async () => {
            const promises = filteredUsers?.map(async (itm) =>
                isSelected(itm.id) ? await DeactivateUser(itm.id) : null,
            );
            await Promise.all(promises).then((resp) =>
                resp
                    ? showSuccess(
                          `User${
                              filteredUsers?.length > 1 ? "s" : ""
                          } Deactivated`,
                      )
                    : showError(
                          `Failed to deactivate user${
                              filteredUsers?.length > 1 ? "s" : ""
                          }`,
                      ),
            );
            setSelected([]);
            setUpdate((prev) => prev + 1);
        };

        switch (action) {
            case "Activate":
                activate();
                break;
            case "Deactivate":
                deactivate();
                break;
            case "Remove":
                remove();
                break;
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
            const newSelecteds = users?.map((n) => n.id);
            setSelected(newSelecteds);
            return;
        }
        setSelected([]);
    };

    const handleOpenClick = (event, id) => {
        const openIndex = rowsOpen.indexOf(id);
        let neOpen = [];

        if (openIndex === -1) {
            neOpen = neOpen.concat(selected, id);
        } else if (openIndex === 0) {
            neOpen = neOpen.concat(selected.slice(1));
        } else if (openIndex === selected.length - 1) {
            neOpen = neOpen.concat(selected.slice(0, -1));
        } else if (openIndex > 0) {
            neOpen = neOpen.concat(
                selected.slice(0, openIndex),
                selected.slice(openIndex + 1),
            );
        }

        setRowsOpen(neOpen);
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

    const hadleEditUser = (user, location) => {
        setSelectedUser(user);
        setEditUserLocation(location);
        setEditDialogOpen(true);
    };

    const handleCloseEditDialog = () => {
        setEditDialogOpen(false);
        setSelectedUser(null);
        setEditUserLocation(null);
    };

    const isSelected = (id) => selected.indexOf(id) !== -1;
    const isOpen = (id) => rowsOpen.indexOf(id) !== -1;

    useEffect(() => {
        const getData = async () => {
            setLoading(true);

            const lcs = await GetLocations();
            const users = await GetUsers();
            setUsers(users.filter((usr) => usr.id !== user?.id));
            setLocations(lcs);
            setFilterLocation(
                filterLocation?.officeid || filterLocation?.officeid === 0
                    ? filterLocation
                    : lcs?.find((lc) => lc.officeid == user?.location),
            );
            setLoading(false);
        };
        getData();
    }, [update]);

    useEffect(() => {
        let usrs = [];
        if (filterLocation?.officeid) {
            usrs = users.filter(
                (usr) => usr.location === filterLocation.officeid,
            );
            setFilteredUsers(usrs);
        } else {
            usrs = users;
            setFilteredUsers(users);
        }

        const search = searchTerm.toLowerCase();
        const data = usrs
            ?.filter(
                (itm) =>
                    search === "" ||
                    itm.first_name?.toLowerCase().includes(search) ||
                    itm.last_name?.toLowerCase().includes(search) ||
                    `${itm.first_name} ${itm.last_name}`
                        .toLowerCase()
                        .includes(search) ||
                    itm.email?.toLowerCase().includes(search) ||
                    locations
                        ?.find((lc) => lc.officeid == itm.location)
                        ?.Alias?.toLowerCase()
                        .includes(search),
            )
            .map((itm) => {
                return createData(
                    itm.id,
                    `${itm.first_name} ${itm.last_name}`,
                    itm.email,
                    locations?.find((lc) => lc.officeid == itm.location)?.Alias,
                    itm.active ? "True" : "False",
                    itm.last_login
                        ? new Date(itm.last_login).toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                          })
                        : "Has not Logged In",
                    itm.admin,
                    itm.office_admin,
                    itm.equipment_office_admin,
                    itm.equipment_admin,
                    itm.tax_admin,
                );
            });

        const sortedRows = stableSort(data, getComparator(order, orderBy));
        setPaginatedRows(
            sortedRows.slice(
                page * rowsPerPage,
                page * rowsPerPage + rowsPerPage,
            ),
        );
    }, [
        filterLocation,
        users,
        update,
        page,
        rowsPerPage,
        orderBy,
        order,
        searchTerm,
    ]);

    // Listen for socket messages about user creation
    useEffect(() => {
        if (!socket?.connected) return;

        const handleMessage = (payload) => {
            if (payload?.message === "user_created") {
                console.log("User created via socket, refreshing user list");
                setUpdate((prev) => prev + 1);
            }
        };

        socket.on("message", handleMessage);

        return () => {
            socket.off("message", handleMessage);
        };
    }, [socket?.connected]);

    return (
        <>
            {/* Easter Eggs */}
            {meatRain && <MeatRain />}
            {higgyRain && <HiggyRain />}
            <Box
                sx={{
                    height: isMobile ? "auto" : "100%",
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    flexGrow: 1,
                    minHeight: isMobile ? "100vh" : "auto",
                }}
            >
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

                {/* Filter and Search Section */}
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
                        <TextField
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) =>
                                handleSearchChange(
                                    e.target.value,
                                    setSearchTerm,
                                )
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
                        <FormControl
                            variant="outlined"
                            size="small"
                            sx={{ flex: isMobile ? "1" : "0 0 200px" }}
                        >
                            <InputLabel id="filter-location-label">
                                Filter by Location
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
                                label="Filter by Location"
                                onChange={(e) => {
                                    const selectedItem = locations?.find(
                                        (itm) =>
                                            itm.officeid === e.target.value,
                                    );
                                    setFilterLocation(selectedItem);
                                }}
                            >
                                {locations?.map((itm, index) => (
                                    <MenuItem key={index} value={itm.officeid}>
                                        {itm.Alias}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {(user?.admin ||
                            user?.equipment_admin ||
                            user?.equipment_office_admin) && (
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => setAddFromAdOpen(true)}
                                size="small"
                                sx={{
                                    ml: "auto",
                                    color: "white",
                                    ":hover": { color: "white" },
                                }}
                            >
                                Add User
                            </Button>
                        )}
                    </Box>
                </Box>

                {/* Mobile Card View */}
                {isMobile ? (
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                        }}
                    >
                        {paginatedRows.length === 0 ? (
                            <Paper sx={{ p: 3, textAlign: "center" }}>
                                <Typography color="text.secondary">
                                    No users found
                                </Typography>
                            </Paper>
                        ) : (
                            paginatedRows.map((row) => (
                                <Card key={row.id}>
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
                                                    {row.name}
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                >
                                                    {row.email}
                                                </Typography>
                                            </Box>
                                            <Chip
                                                label={row.active}
                                                color={
                                                    row.active === "True"
                                                        ? "success"
                                                        : "default"
                                                }
                                                size="small"
                                            />
                                        </Box>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                gap: 2,
                                                mb: 1,
                                            }}
                                        >
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ flex: 1 }}
                                            >
                                                📍 {row.location}
                                            </Typography>
                                        </Box>
                                        {(row.admin ||
                                            row.office_admin ||
                                            row.equipment_admin ||
                                            row.equipment_office_admin) && (
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    gap: 0.5,
                                                    flexWrap: "wrap",
                                                    mb: 1,
                                                }}
                                            >
                                                {row.admin && (
                                                    <Chip
                                                        size="small"
                                                        sx={{
                                                            color: "white",
                                                            backgroundColor:
                                                                "#d32f2f",
                                                        }}
                                                        label="Admin"
                                                    />
                                                )}
                                                {row.office_admin && (
                                                    <Chip
                                                        size="small"
                                                        sx={{
                                                            color: "white",
                                                            backgroundColor:
                                                                "#d4a900",
                                                        }}
                                                        label="Office Admin"
                                                    />
                                                )}
                                                {row.equipment_admin && (
                                                    <Chip
                                                        size="small"
                                                        sx={{
                                                            color: "white",
                                                            backgroundColor:
                                                                "#2196f3",
                                                        }}
                                                        label="Equipment Admin"
                                                    />
                                                )}
                                                {row.equipment_office_admin && (
                                                    <Chip
                                                        size="small"
                                                        sx={{
                                                            color: "white",
                                                            backgroundColor:
                                                                "#007acc",
                                                        }}
                                                        label="Equipment Admin"
                                                    />
                                                )}
                                                {row.tax_admin && (
                                                    <Chip
                                                        size="small"
                                                        sx={{
                                                            color: "white",
                                                            backgroundColor:
                                                                "#9c27b0",
                                                        }}
                                                        label="Tax Admin"
                                                    />
                                                )}
                                            </Box>
                                        )}
                                        {row.last_login && (
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                display="block"
                                            >
                                                Last Login: {row.last_login}
                                            </Typography>
                                        )}
                                    </CardContent>
                                </Card>
                            ))
                        )}

                        {/* Mobile Pagination */}
                        <Paper sx={{ mt: 2 }}>
                            <TablePagination
                                component="div"
                                count={filteredUsers.length}
                                rowsPerPage={rowsPerPage}
                                page={page}
                                onPageChange={handleChangePage}
                                onRowsPerPageChange={handleChangeRowsPerPage}
                            />
                        </Paper>
                    </Box>
                ) : (
                    /* Desktop Table View */
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
                                sx={{ minWidth: 700 }}
                                aria-label="customized table"
                                stickyHeader
                            >
                                <TableHead>
                                    <TableRow>
                                        <StyledTableCell padding="checkbox">
                                            <Checkbox
                                                indeterminate={
                                                    selected.length > 0 &&
                                                    selected.length <
                                                        filteredUsers.length
                                                }
                                                checked={
                                                    filteredUsers.length > 0 &&
                                                    selected.length ===
                                                        filteredUsers.length
                                                }
                                                onChange={handleSelectAllClick}
                                                inputProps={{
                                                    "aria-label":
                                                        "select all meetings",
                                                }}
                                            />
                                        </StyledTableCell>
                                        <StyledTableCell align="left">
                                            <TableSortLabel
                                                active={orderBy === "name"}
                                                direction={
                                                    orderBy === "name"
                                                        ? order
                                                        : "asc"
                                                }
                                                onClick={(event) =>
                                                    handleRequestSort(
                                                        event,
                                                        "name",
                                                    )
                                                }
                                            >
                                                Name
                                            </TableSortLabel>
                                        </StyledTableCell>
                                        <StyledTableCell align="left">
                                            <TableSortLabel
                                                active={orderBy === "email"}
                                                direction={
                                                    orderBy === "email"
                                                        ? order
                                                        : "asc"
                                                }
                                                onClick={(event) =>
                                                    handleRequestSort(
                                                        event,
                                                        "email",
                                                    )
                                                }
                                            >
                                                Email
                                            </TableSortLabel>
                                        </StyledTableCell>
                                        <StyledTableCell align="left">
                                            <TableSortLabel
                                                active={orderBy === "location"}
                                                direction={
                                                    orderBy === "location"
                                                        ? order
                                                        : "asc"
                                                }
                                                onClick={(event) =>
                                                    handleRequestSort(
                                                        event,
                                                        "location",
                                                    )
                                                }
                                            >
                                                Location
                                            </TableSortLabel>
                                        </StyledTableCell>
                                        <StyledTableCell align="left">
                                            <TableSortLabel
                                                active={orderBy === "active"}
                                                direction={
                                                    orderBy === "active"
                                                        ? order
                                                        : "asc"
                                                }
                                                onClick={(event) =>
                                                    handleRequestSort(
                                                        event,
                                                        "active",
                                                    )
                                                }
                                            >
                                                Group
                                            </TableSortLabel>
                                        </StyledTableCell>
                                        <StyledTableCell align="left">
                                            <TableSortLabel
                                                active={orderBy === "active"}
                                                direction={
                                                    orderBy === "active"
                                                        ? order
                                                        : "asc"
                                                }
                                                onClick={(event) =>
                                                    handleRequestSort(
                                                        event,
                                                        "active",
                                                    )
                                                }
                                            >
                                                Active
                                            </TableSortLabel>
                                        </StyledTableCell>
                                        <StyledTableCell align="left">
                                            <TableSortLabel
                                                active={orderBy === "login"}
                                                direction={
                                                    orderBy === "login"
                                                        ? order
                                                        : "asc"
                                                }
                                                onClick={(event) =>
                                                    handleRequestSort(
                                                        event,
                                                        "login",
                                                    )
                                                }
                                            >
                                                Last Login
                                            </TableSortLabel>
                                        </StyledTableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody sx={{ backgroundColor: "white" }}>
                                    {paginatedRows?.map((row, index) => {
                                        const isItemSelected = isSelected(
                                            row.id,
                                        );
                                        const isItemOpen = isOpen(row.id);
                                        const backgroundColor =
                                            index % 2 === 0
                                                ? "#f0f0f0"
                                                : "#ffffff";
                                        const rowUser = filteredUsers?.find(
                                            (mt) => mt.id === row.id,
                                        );
                                        const location = locations?.find(
                                            (lc) =>
                                                lc.officeid ==
                                                rowUser?.location,
                                        );
                                        return (
                                            <React.Fragment key={index}>
                                                <StyledTableRow
                                                    hover
                                                    role="checkbox"
                                                    aria-checked={
                                                        isItemSelected
                                                    }
                                                    tabIndex={-1}
                                                    selected={isItemSelected}
                                                    onClick={(e) =>
                                                        handleOpenClick(
                                                            e,
                                                            row.id,
                                                        )
                                                    }
                                                    sx={{
                                                        cursor: "pointer",
                                                        backgroundColor: `${backgroundColor} !important`,
                                                    }}
                                                >
                                                    <StyledTableCell padding="checkbox">
                                                        <Checkbox
                                                            onClick={(
                                                                event,
                                                            ) => {
                                                                event.stopPropagation();
                                                                handleClick(
                                                                    event,
                                                                    row.id,
                                                                );
                                                            }}
                                                            checked={
                                                                isItemSelected
                                                            }
                                                            inputProps={{
                                                                "aria-labelledby": `enhanced-table-checkbox-${row.id}`,
                                                            }}
                                                        />
                                                    </StyledTableCell>
                                                    <StyledTableCell
                                                        component="th"
                                                        scope="row"
                                                    >
                                                        {row.name}
                                                    </StyledTableCell>
                                                    <StyledTableCell align="left">
                                                        {row.email}
                                                    </StyledTableCell>
                                                    <StyledTableCell align="left">
                                                        {row.location}
                                                    </StyledTableCell>
                                                    <StyledTableCell
                                                        align="left"
                                                        display="flex"
                                                    >
                                                        {row.admin && (
                                                            <Tooltip
                                                                key={"Admin"}
                                                                arrow
                                                                title={
                                                                    <Typography variant="body2">
                                                                        {`Admin Access`}
                                                                    </Typography>
                                                                }
                                                            >
                                                                <Chip
                                                                    sx={{
                                                                        cursor: "pointer",
                                                                        color: "white",
                                                                        backgroundColor:
                                                                            "green",
                                                                        marginLeft:
                                                                            "2px",
                                                                        marginTop:
                                                                            "2px",
                                                                    }}
                                                                    label={
                                                                        "Admin"
                                                                    }
                                                                />
                                                            </Tooltip>
                                                        )}
                                                        {(`${row.office_admin}` ==
                                                            filterLocation?.officeid ||
                                                            (filterLocation?.officeid ==
                                                                "0" &&
                                                                row.office_admin)) && (
                                                            <Tooltip
                                                                key={
                                                                    "Office Admin"
                                                                }
                                                                arrow
                                                                title={
                                                                    <Typography variant="body2">
                                                                        {`Admin Access For ${
                                                                            locations?.find(
                                                                                (
                                                                                    lc,
                                                                                ) =>
                                                                                    lc.officeid ==
                                                                                    `${row.office_admin}`,
                                                                            )
                                                                                ?.Alias
                                                                        }`}
                                                                    </Typography>
                                                                }
                                                            >
                                                                <Chip
                                                                    sx={{
                                                                        cursor: "pointer",
                                                                        color: "white",
                                                                        backgroundColor:
                                                                            "#d4a900",
                                                                        marginLeft:
                                                                            "2px",
                                                                        marginTop:
                                                                            "2px",
                                                                    }}
                                                                    label={
                                                                        "Office Admin"
                                                                    }
                                                                />
                                                            </Tooltip>
                                                        )}
                                                        {row.equipment_admin && (
                                                            <Tooltip
                                                                key={
                                                                    "Equipment Admin"
                                                                }
                                                                arrow
                                                                title={
                                                                    <Typography variant="body2">
                                                                        Equipment
                                                                        Admin
                                                                        Access
                                                                        For All
                                                                        Offices
                                                                    </Typography>
                                                                }
                                                            >
                                                                <Chip
                                                                    sx={{
                                                                        cursor: "pointer",
                                                                        color: "white",
                                                                        backgroundColor:
                                                                            "#2196f3",
                                                                        marginLeft:
                                                                            "2px",
                                                                        marginTop:
                                                                            "2px",
                                                                    }}
                                                                    label={
                                                                        "Equipment Admin"
                                                                    }
                                                                />
                                                            </Tooltip>
                                                        )}
                                                        {(`${row.equipment_office_admin}` ==
                                                            filterLocation?.officeid ||
                                                            (filterLocation?.officeid ==
                                                                "0" &&
                                                                row.equipment_office_admin)) && (
                                                            <Tooltip
                                                                key={
                                                                    "Equipment Office Admin"
                                                                }
                                                                arrow
                                                                title={
                                                                    <Typography variant="body2">
                                                                        {`Equipment Admin Access For ${
                                                                            locations?.find(
                                                                                (
                                                                                    lc,
                                                                                ) =>
                                                                                    lc.officeid ==
                                                                                    `${row.equipment_office_admin}`,
                                                                            )
                                                                                ?.Alias
                                                                        }`}
                                                                    </Typography>
                                                                }
                                                            >
                                                                <Chip
                                                                    sx={{
                                                                        cursor: "pointer",
                                                                        color: "white",
                                                                        backgroundColor:
                                                                            "#007acc",
                                                                        marginLeft:
                                                                            "2px",
                                                                        marginTop:
                                                                            "2px",
                                                                    }}
                                                                    label={
                                                                        "Equipment Admin"
                                                                    }
                                                                />
                                                            </Tooltip>
                                                        )}
                                                        {row.tax_admin && (
                                                            <Tooltip
                                                                key={
                                                                    "Tax Admin"
                                                                }
                                                                arrow
                                                                title={
                                                                    <Typography variant="body2">
                                                                        Tax
                                                                        Admin
                                                                        Access
                                                                    </Typography>
                                                                }
                                                            >
                                                                <Chip
                                                                    sx={{
                                                                        cursor: "pointer",
                                                                        color: "white",
                                                                        backgroundColor:
                                                                            "#9c27b0",
                                                                        marginLeft:
                                                                            "2px",
                                                                        marginTop:
                                                                            "2px",
                                                                    }}
                                                                    label={
                                                                        "Tax Admin"
                                                                    }
                                                                />
                                                            </Tooltip>
                                                        )}
                                                    </StyledTableCell>
                                                    <StyledTableCell align="left">
                                                        {row.active}
                                                    </StyledTableCell>
                                                    <StyledTableCell align="left">
                                                        {row.last_login}
                                                    </StyledTableCell>
                                                </StyledTableRow>
                                                <StyledTableRow>
                                                    <StyledTableCell
                                                        style={{
                                                            padding: 0,
                                                            boxSizing:
                                                                "border-box",
                                                        }}
                                                        colSpan={7}
                                                    >
                                                        <Collapse
                                                            in={isItemOpen}
                                                            timeout="auto"
                                                            unmountOnExit
                                                        >
                                                            <Box>
                                                                <ViewUser
                                                                    row={row}
                                                                    locations={
                                                                        locations
                                                                    }
                                                                    location={
                                                                        location
                                                                    }
                                                                    rowUser={
                                                                        rowUser
                                                                    }
                                                                    setOpen={
                                                                        hadleEditUser
                                                                    }
                                                                />
                                                            </Box>
                                                        </Collapse>
                                                    </StyledTableCell>
                                                </StyledTableRow>
                                            </React.Fragment>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* Bottom section with actions and pagination */}
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "row",
                                borderTop: "1px solid #e0e0e0",
                            }}
                        >
                            {(user?.admin ||
                                user?.equipment_admin ||
                                user?.office_admin ==
                                    filterLocation?.officeid) && (
                                <Stack
                                    direction={"row"}
                                    sx={{
                                        alignItems: "center",
                                        padding: "10px 20px",
                                    }}
                                    spacing={2}
                                >
                                    <Typography sx={{ whiteSpace: "nowrap" }}>
                                        I Want To{" "}
                                    </Typography>
                                    <ShortSelect
                                        value={action}
                                        items={[
                                            "Activate",
                                            "Deactivate",
                                            "Remove",
                                        ]}
                                        label={"Action"}
                                        variant={"outlined"}
                                        onChange={(e) => setAction(e)}
                                        width={"120px"}
                                        disabled={selected?.length == 0}
                                    />
                                    <Typography sx={{ whiteSpace: "nowrap" }}>
                                        Selected
                                    </Typography>
                                    <Button
                                        onClick={handleSubmit}
                                        variant="outlined"
                                        sx={{
                                            background:
                                                selected?.length == 0
                                                    ? ""
                                                    : "rgba(0,200,0,.3)",
                                            ":hover": {
                                                background: "rgba(0,200,0,.5)",
                                            },
                                        }}
                                    >
                                        Submit
                                    </Button>
                                </Stack>
                            )}

                            <TablePagination
                                component="div"
                                count={filteredUsers.length}
                                rowsPerPage={rowsPerPage}
                                page={page}
                                onPageChange={handleChangePage}
                                onRowsPerPageChange={handleChangeRowsPerPage}
                            />
                        </Box>
                    </Paper>
                )}
            </Box>
        </>
    );
}
