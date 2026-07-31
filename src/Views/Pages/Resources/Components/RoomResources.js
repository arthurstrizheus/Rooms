import { useState, useEffect } from "react";
import { Box, Checkbox, MenuItem } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import AddIcon from "@mui/icons-material/AddOutlined";
import { useAuth } from "../../../../Utilites/AuthContext";
import AddNewRoomResource from "./AddNewRoomResource";
import {
    GetLocations,
    GetResources,
    GetRoomResources,
    GetRooms,
    showError,
    showSuccess,
    showWarning,
} from "../../../../Utilites/Functions/ApiFunctions";
import { DeleteRoomResource } from "../../../../Utilites/Functions/ApiFunctions/ResourceFunctions";
import { bp } from "../../../../Utilites/concourse";
import {
    CcButton,
    CcSelect,
} from "../../../Components/Concourse/ConcourseDialogKit";
import {
    checkboxSx,
    ConfirmDeleteDialog,
    muteCellSx,
    nameCellSx,
    PaginationBar,
    PHONE_Q,
    RowCard,
    RowCardList,
    RowCardListSkeleton,
    rowSx,
    SelectAllStrip,
    SelectionSummary,
    StateBlock,
    stateWrapSx,
    tableSx,
    tableWrapSx,
    TableSkeleton,
    tdCheckboxSx,
    tdSx,
    thCheckboxSx,
    thSx,
    toolbarSx,
} from "./ResourcesUi";

function createData(id, resources_id, room_id) {
    return { id, resources_id, room_id };
}

export default function RoomResources({ setLoading, tabs }) {
    const { user } = useAuth();
    const isPhone = useMediaQuery(`(max-width:${bp.sheet}px)`);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [selected, setSelected] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [filterLocation, setFilterLocation] = useState();
    const [paginatedRows, setPaginatedRows] = useState([]);
    const [filteredResources, setFilteredResources] = useState([]);
    const [locations, setLocations] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [filteredRooms, setFilteredRooms] = useState([]);
    const [roomResources, setRoomResources] = useState([]);
    const [resources, setResources] = useState([]);
    const [update, setUpdate] = useState(0);
    // Local mirrors of the fetch lifecycle. `setLoading` is the parent's state
    // and cannot be read back, so the skeleton needs its own flags (guide §3.7).
    const [fetching, setFetching] = useState(true);
    const [hasLoaded, setHasLoaded] = useState(false);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleDeleteSelected = () => {
        const remove = async () => {
            const targets =
                roomResources?.filter((itm) => isSelected(itm.id)) || [];
            // `Promise.all` resolves to an array, which is truthy even when
            // every delete failed, so the outcome has to come from the
            // per-item results. DeleteRoomResource resolves true/false and
            // never rejects.
            const results = await Promise.all(
                targets.map((itm) => DeleteRoomResource(itm.id))
            );
            const deleted = results.filter(Boolean).length;
            if (targets.length > 0 && deleted === targets.length) {
                showSuccess("Items Deleted");
            } else if (deleted > 0) {
                showWarning(`Deleted ${deleted} of ${targets.length} items`);
            } else {
                showError("Failed to delete");
            }
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

    useEffect(() => {
        const getData = async () => {
            setLoading(true);
            setFetching(true);

            const rms = await GetRooms(user.id);
            const lcs = await GetLocations();
            const rrs = await GetRoomResources();
            const rss = await GetResources();

            setRoomResources(rrs);
            setResources(rss);
            setRooms(rms);
            setLocations(lcs);
            setFilterLocation(lcs?.find((lc) => lc.officeid == user?.location));
            setLoading(false);
            setFetching(false);
            setHasLoaded(true);
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

            setFilteredRooms(roomsFiltered);
            setFilteredResources(filteredResources);
            const data = filteredResources?.map((itm) => {
                return createData(itm.id, itm.resource_id, itm.room_id);
            });

            setPaginatedRows(
                data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            );
        }
    }, [filterLocation, roomResources, page, rowsPerPage, update, rooms]);

    /* ---------------------------------------------------------- states ---
       There is no error state on this page and there cannot be one:
       GetRooms / GetLocations / GetRoomResources / GetResources all swallow
       failure and return [], so a failed load is indistinguishable from an
       empty one. The API layer still raises its own error toast. Reported. */
    const isSkeleton = fetching || (!hasLoaded && Boolean(user?.id));
    const isEmptyState = !isSkeleton && filteredResources.length === 0;

    const selectedCount = selected?.length || 0;
    const plural = selectedCount === 1 ? "" : "s";
    const locationAlias = filterLocation?.Alias;

    const selectAllCheckbox = (
        <Checkbox
            indeterminate={
                selected.length > 0 &&
                selected.length < filteredResources.length
            }
            checked={
                filteredResources.length > 0 &&
                selected.length === filteredResources.length
            }
            onChange={handleSelectAllClick}
            inputProps={{
                "aria-label": "select all meetings",
            }}
            sx={checkboxSx}
        />
    );

    const rowCheckbox = (row, isItemSelected) => (
        <Checkbox
            onClick={(event) => {
                event.stopPropagation(); // Prevent the event from bubbling up
                handleClick(event, row.id);
            }}
            checked={isItemSelected}
            inputProps={{
                "aria-labelledby": `enhanced-table-checkbox-${row.id}`,
            }}
            sx={checkboxSx}
        />
    );

    const addButton = (
        <CcButton
            variant="primary"
            onClick={setOpenDialog}
            sx={{ [PHONE_Q]: { flex: "1 1 100%" } }}
        >
            <AddIcon sx={{ fontSize: "18px" }} />
            Add resource to room
        </CcButton>
    );

    let body;
    if (isSkeleton) {
        body = isPhone ? (
            <RowCardListSkeleton facts={2} />
        ) : (
            <Box sx={tableWrapSx}>
                <Box component="table" sx={tableSx} aria-label="Room resources">
                    <Box component="thead">
                        <Box component="tr">
                            <Box component="th" sx={thCheckboxSx} />
                            <Box component="th" sx={thSx}>
                                Resource
                            </Box>
                            <Box component="th" sx={thSx}>
                                Room Name
                            </Box>
                            <Box component="th" sx={thSx}>
                                Location
                            </Box>
                        </Box>
                    </Box>
                    <TableSkeleton columns={3} />
                </Box>
            </Box>
        );
    } else if (isEmptyState) {
        body = (
            <Box sx={stateWrapSx}>
                <StateBlock
                    icon="🧰"
                    title={
                        locationAlias
                            ? `No resources assigned in ${locationAlias}`
                            : "No resources assigned"
                    }
                    body="Assign a resource to a room to see it here."
                    actions={
                        <CcButton variant="primary" onClick={setOpenDialog}>
                            Add resource to room
                        </CcButton>
                    }
                />
            </Box>
        );
    } else if (isPhone) {
        body = (
            <RowCardList>
                <SelectAllStrip>{selectAllCheckbox}</SelectAllStrip>
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
                        <RowCard
                            key={row.id}
                            selected={isItemSelected}
                            checkbox={rowCheckbox(row, isItemSelected)}
                            name={rowResource.name}
                            facts={[
                                { label: "Room", value: room.value },
                                { label: "Location", value: location?.Alias },
                            ]}
                        />
                    );
                })}
            </RowCardList>
        );
    } else {
        body = (
            <Box sx={tableWrapSx}>
                <Box component="table" sx={tableSx} aria-label="Room resources">
                    <Box component="thead">
                        <Box component="tr">
                            <Box component="th" sx={thCheckboxSx}>
                                {selectAllCheckbox}
                            </Box>
                            <Box component="th" sx={thSx}>
                                Resource
                            </Box>
                            <Box component="th" sx={thSx}>
                                Room Name
                            </Box>
                            <Box component="th" sx={thSx}>
                                Location
                            </Box>
                        </Box>
                    </Box>
                    <Box component="tbody">
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
                                <Box
                                    component="tr"
                                    key={row.id}
                                    role="checkbox"
                                    aria-checked={isItemSelected}
                                    tabIndex={-1}
                                    sx={rowSx(isItemSelected)}
                                >
                                    <Box component="td" sx={tdCheckboxSx}>
                                        {rowCheckbox(row, isItemSelected)}
                                    </Box>
                                    <Box
                                        component="th"
                                        scope="row"
                                        sx={nameCellSx}
                                    >
                                        {rowResource.name}
                                    </Box>
                                    <Box component="td" sx={tdSx}>
                                        {room.value}
                                    </Box>
                                    <Box component="td" sx={muteCellSx}>
                                        {location?.Alias}
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                </Box>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                minHeight: 0,
                width: "100%",
                boxSizing: "border-box",
            }}
        >
            <AddNewRoomResource
                open={openDialog}
                setOpen={setOpenDialog}
                rooms={filteredRooms}
                roomResources={filteredResources}
                resources={resources.filter(
                    (rr) => rr.location == filterLocation?.officeid
                )}
                setUpdate={setUpdate}
            />
            <ConfirmDeleteDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={() => {
                    setConfirmOpen(false);
                    handleDeleteSelected();
                }}
                title={`Delete ${selectedCount} selected room resource${plural}?`}
                alertTitle="This cannot be undone"
                alertBody="The resource is removed from the room. The resource itself is not deleted."
                confirmLabel={`Delete room resource${plural}`}
                dismissLabel={selectedCount === 1 ? "Keep it" : "Keep them"}
            />

            <Box sx={toolbarSx}>
                {tabs}
                <Box sx={{ flex: 1 }} />
                {selectedCount > 0 && (
                    <SelectionSummary count={selectedCount} />
                )}
                <CcSelect
                    ariaLabel="Filter By Location"
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
                        setFilterLocation(selectedItem); // Return the entire object
                    }}
                    sx={{ width: "auto", minWidth: "170px", flex: "none" }}
                >
                    {locations?.map((itm, index) => (
                        <MenuItem key={index} value={itm.officeid}>
                            {itm.Alias}
                        </MenuItem>
                    ))}
                </CcSelect>
                {selectedCount > 0 && (
                    <CcButton
                        variant="danger"
                        onClick={() => setConfirmOpen(true)}
                    >
                        Delete selected
                    </CcButton>
                )}
                {addButton}
            </Box>

            {body}

            {!isEmptyState && (
                <PaginationBar
                    count={filteredResources.length}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    loading={isSkeleton}
                />
            )}
        </Box>
    );
}
