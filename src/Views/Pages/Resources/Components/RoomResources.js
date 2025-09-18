import React, { useState, useEffect } from "react";
import { styled } from "@mui/material/styles";
import TableCell, { tableCellClasses } from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import { useTheme } from "@emotion/react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../../Utilites/AuthContext";
import {
    FormControl,
    InputLabel,
    Select,
    Box,
    Tooltip,
    TableContainer,
    Table,
    TableHead,
    TableBody,
    TablePagination,
    Paper,
    Checkbox,
    MenuItem,
    TableSortLabel,
} from "@mui/material";
import AddIcon from "@mui/icons-material/AddOutlined";
import AddNewRoomResource from "./AddNewRoomResource";
import {
    GetGroups,
    GetGroupUsers,
    GetLocations,
    GetResources,
    GetRoomGroups,
    GetRoomResources,
    GetRooms,
    showError,
    showSuccess,
    UserFullAccessRooms,
} from "../../../../Utilites/Functions/ApiFunctions";
import DeleteIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { DeleteRoomResource } from "../../../../Utilites/Functions/ApiFunctions/ResourceFunctions";
import { useLocalStorage } from "../../../../hooks/useLocalStorage";

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

function createData(id, resources_id, room_id) {
    return { id, resources_id, room_id };
}

export default function RoomResources({ setLoading }) {
    const theme = useTheme();
    const { user } = useAuth();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [selected, setSelected] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [filterLocation, setFilterLocation] = useState();
    const [paginatedRows, setPaginatedRows] = useState([]);
    const [filteredResources, setFilteredResources] = useState([]);
    const [filteredEquipments, setFilteredEquipments] = useState([]);
    const [locations, setLocations] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [filteredRooms, setFilteredRooms] = useState([]);
    const [roomResources, setRoomResources] = useState([]);
    const [resources, setResources] = useState([]);
    const [equipment, setEquipment] = useState([]);
    const [update, setUpdate] = useState(0);
    const [sortBy, setSortBy] = useLocalStorage(
        "roomResources.sortBy",
        "resource"
    ); // resource | room | location
    const [sortOrder, setSortOrder] = useLocalStorage(
        "roomResources.sortOrder",
        "asc"
    ); // asc | desc

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleDeleteSelected = () => {
        const remove = async () => {
            const promises = roomResources?.map(async (itm) =>
                isSelected(itm.id) ? await DeleteRoomResource(itm.id) : null
            );
            await Promise.all(promises).then((resp) =>
                resp
                    ? showSuccess("Items Deleted")
                    : showError("Failed to delete")
            );
            setSelected([]);
            setUpdate((prev) => prev + 1);
        };
        remove();
    };

    const handleSelectAllClick = (event) => {
        if (event.target.checked) {
            const newSelecteds = filteredResources?.map((n) => n.id);
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
                selected.slice(selectedIndex + 1)
            );
        }

        setSelected(newSelected);
    };

    const isSelected = (id) => selected.indexOf(id) !== -1;

    const handleRequestSort = (property) => {
        if (sortBy === property) {
            setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortBy(property);
            setSortOrder("asc");
        }
        setPage(0);
    };

    useEffect(() => {
        const getData = async () => {
            setLoading(true);

            const rms = await GetRooms(user.id);
            const lcs = await GetLocations();
            const rrs = await GetRoomResources();
            const rss = await GetResources();

            setRoomResources(rrs);
            setResources(rss);
            setRooms(rms);
            setLocations(lcs);
            setEquipment(rss.filter((eq) => eq.equipment == true));
            setFilterLocation(lcs?.find((lc) => lc.officeid == user?.location));
            setLoading(false);
        };
        if (user?.id) {
            getData();
        }
    }, [update, user]);

    useEffect(() => {
        if (rooms?.length && filterLocation?.officeid) {
            const roomsFiltered = rooms.filter(
                (rm) => rm.location == filterLocation.officeid
            );
            const filteredResources = roomResources.filter(
                (rr) =>
                    rr.room_id ==
                    roomsFiltered?.find((fr) => fr.id == rr.room_id)?.id
            );
            const filteredEquipments = equipment.filter(
                (rs) =>
                    rs.location == filterLocation.officeid &&
                    rs.equipment == true
            );

            setFilteredRooms(roomsFiltered);
            setFilteredResources(filteredResources);
            setFilteredEquipments(filteredEquipments);

            const data = filteredResources?.map((itm) => {
                return createData(itm.id, itm.resource_id, itm.room_id);
            });

            // Sort before pagination
            const getSortKey = (row) => {
                const room = roomsFiltered?.find((rm) => rm.id == row.room_id);
                const location = locations?.find(
                    (lc) => lc.officeid == room?.location
                );
                const rowResource = resources?.find(
                    (rc) => rc.id == row.resources_id
                );
                switch (sortBy) {
                    case "room":
                        return room?.value ?? "";
                    case "location":
                        return location?.Alias ?? "";
                    case "equipment":
                        return rowResource?.equipment ? 1 : 0;
                    case "resource":
                    default:
                        return rowResource?.name ?? "";
                }
            };

            const sorted = [...data].sort((a, b) => {
                const aKey = getSortKey(a);
                const bKey = getSortKey(b);
                if (typeof aKey === "number" && typeof bKey === "number") {
                    return sortOrder === "asc" ? aKey - bKey : bKey - aKey;
                }
                const aStr = aKey?.toString().toLowerCase();
                const bStr = bKey?.toString().toLowerCase();
                if (aStr < bStr) return sortOrder === "asc" ? -1 : 1;
                if (aStr > bStr) return sortOrder === "asc" ? 1 : -1;
                return 0;
            });

            setPaginatedRows(
                sorted.slice(
                    page * rowsPerPage,
                    page * rowsPerPage + rowsPerPage
                )
            );
        }
    }, [
        filterLocation,
        roomResources,
        page,
        rowsPerPage,
        update,
        rooms,
        resources,
        locations,
        sortBy,
        sortOrder,
    ]);

    return (
        <Box
            sx={{ height: "100%", width: "100%", display: "flex", flexGrow: 1 }}
        >
            <AddNewRoomResource
                open={openDialog}
                setOpen={setOpenDialog}
                rooms={filteredRooms}
                roomResources={filteredResources}
                resources={resources.filter(
                    (rr) => rr.location == filterLocation?.officeid
                )}
                equipments={filteredEquipments}
                setUpdate={setUpdate}
            />
            <Paper
                sx={{
                    height: "100%",
                    display: "flex",
                    flexGrow: 1,
                    flexDirection: "column",
                    overflow: "hidden",
                }}
            >
                <Tooltip title={"Add Item"}>
                    <AddIcon
                        sx={{
                            position: "absolute",
                            right: 40,
                            zIndex: 2,
                            top: 110,
                            color: "darkgreen",
                            cursor: "pointer",
                            ":hover": { color: "green" },
                            height: "30px",
                            width: "30px",
                        }}
                        onClick={setOpenDialog}
                    />
                </Tooltip>
                {selected?.length > 0 && (
                    <Tooltip title={"Delete Selected"}>
                        <DeleteIcon
                            sx={{
                                position: "absolute",
                                right: 70,
                                zIndex: 2,
                                top: 110,
                                color: "red",
                                cursor: "pointer",
                                ":hover": { color: "darkred" },
                                height: "30px",
                                width: "30px",
                            }}
                            onClick={handleDeleteSelected}
                        />
                    </Tooltip>
                )}
                <Box
                    sx={{
                        width: "200px",
                        position: "absolute",
                        right: 5,
                        top: 60,
                    }}
                >
                    <Box sx={{ display: "flex", gap: 2 }}>
                        <FormControl
                            variant="standard"
                            sx={{ minWidth: 160, width: "100%" }}
                        >
                            <InputLabel id="filter-location-label">
                                Filter By Location
                            </InputLabel>
                            <Select
                                sx={{ width: "100%" }}
                                labelId="filter-location-label"
                                id="filter-location"
                                value={
                                    filterLocation?.officeid === 0
                                        ? 0
                                        : filterLocation?.officeid
                                        ? filterLocation.officeid
                                        : ""
                                }
                                onChange={(e) => {
                                    const selectedItem = locations?.find(
                                        (itm) => itm.officeid === e.target.value
                                    );
                                    setFilterLocation(selectedItem);
                                    setPage(0);
                                }}
                            >
                                {locations?.map((itm, index) => (
                                    <MenuItem key={index} value={itm.officeid}>
                                        {itm.Alias}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                </Box>
                <TableContainer
                    sx={{ flexGrow: 1, height: "100%", overflowY: "hidden" }}
                >
                    <Table sx={{ minWidth: 700 }} aria-label="customized table">
                        <TableHead
                            sx={{ position: "sticky", top: 0, zIndex: 1 }}
                        >
                            <TableRow>
                                <StyledTableCell padding="checkbox">
                                    <Checkbox
                                        indeterminate={
                                            selected.length > 0 &&
                                            selected.length <
                                                filteredResources.length
                                        }
                                        checked={
                                            filteredResources.length > 0 &&
                                            selected.length ===
                                                filteredResources.length
                                        }
                                        onChange={handleSelectAllClick}
                                        inputProps={{
                                            "aria-label": "select all meetings",
                                        }}
                                    />
                                </StyledTableCell>
                                <StyledTableCell align="left">
                                    <TableSortLabel
                                        active={sortBy === "resource"}
                                        direction={
                                            sortBy === "resource"
                                                ? sortOrder
                                                : "asc"
                                        }
                                        onClick={() =>
                                            handleRequestSort("resource")
                                        }
                                    >
                                        Resource
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell align="left">
                                    <TableSortLabel
                                        active={sortBy === "equipment"}
                                        direction={
                                            sortBy === "equipment"
                                                ? sortOrder
                                                : "asc"
                                        }
                                        onClick={() =>
                                            handleRequestSort("equipment")
                                        }
                                    >
                                        Equipment
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell align="left">
                                    <TableSortLabel
                                        active={sortBy === "room"}
                                        direction={
                                            sortBy === "room"
                                                ? sortOrder
                                                : "asc"
                                        }
                                        onClick={() =>
                                            handleRequestSort("room")
                                        }
                                    >
                                        Room Name
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell align="left">
                                    <TableSortLabel
                                        active={sortBy === "location"}
                                        direction={
                                            sortBy === "location"
                                                ? sortOrder
                                                : "asc"
                                        }
                                        onClick={() =>
                                            handleRequestSort("location")
                                        }
                                    >
                                        Location
                                    </TableSortLabel>
                                </StyledTableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody sx={{ backgroundColor: "white" }}>
                            {paginatedRows?.map((row) => {
                                const isItemSelected = isSelected(row.id);
                                const room = filteredRooms?.find(
                                    (rm) => rm.id == row.room_id
                                );
                                const location = locations?.find(
                                    (lc) => lc.officeid == room.location
                                );
                                const rowResource = resources?.find(
                                    (rc) => rc.id == row.resources_id
                                );
                                return (
                                    <React.Fragment key={row.id}>
                                        <StyledTableRow
                                            hover
                                            role="checkbox"
                                            aria-checked={isItemSelected}
                                            tabIndex={-1}
                                            selected={isItemSelected}
                                        >
                                            <StyledTableCell padding="checkbox">
                                                <Checkbox
                                                    onClick={(event) => {
                                                        event.stopPropagation(); // Prevent the event from bubbling up
                                                        handleClick(
                                                            event,
                                                            row.id
                                                        );
                                                    }}
                                                    checked={isItemSelected}
                                                    inputProps={{
                                                        "aria-labelledby": `enhanced-table-checkbox-${row.id}`,
                                                    }}
                                                />
                                            </StyledTableCell>
                                            <StyledTableCell
                                                component="th"
                                                scope="row"
                                            >
                                                {rowResource?.name}
                                            </StyledTableCell>
                                            <StyledTableCell align="left">
                                                {rowResource?.equipment
                                                    ? "Yes"
                                                    : "No"}
                                            </StyledTableCell>
                                            <StyledTableCell align="left">
                                                {room?.value}
                                            </StyledTableCell>
                                            <StyledTableCell align="left">
                                                {location?.Alias}
                                            </StyledTableCell>
                                        </StyledTableRow>
                                    </React.Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
                <Box sx={{ overflow: "hidden" }}>
                    <TablePagination
                        component="div"
                        count={filteredResources.length}
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
