import React, {useState, useEffect} from 'react';
import { styled } from '@mui/material/styles';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import { useTheme } from '@emotion/react';
import { Box, Tooltip, TableContainer, Table, TableHead, TableBody, TablePagination, Paper, Checkbox, TableSortLabel, Collapse, FormControl, Select, InputLabel, MenuItem } from "@mui/material";
import AddNewRoom from './Components/AddNewRoom'
import AddIcon from '@mui/icons-material/AddOutlined';
import RowRoom from './Components/RowRoom';
import { GetGroups, GetLocations, GetRoomGroups, GetRooms } from '../../../Utilites/Functions/ApiFunctions';
import { useAuth } from '../../../Utilites/AuthContext';
import DeleteIcon from '@mui/icons-material/DeleteOutlineOutlined';
import PageSelector from '../../Components/PageSelector/PageSelector';
import { DeleteRoom } from '../../../Utilites/Functions/ApiFunctions/RoomFunctions';

const StyledTableCell = styled(TableCell)(({ theme }) => ({
    [`&.${tableCellClasses.head}`]: {
        backgroundColor: 'white',
        color: theme.palette.common.black,
        fontWeight:'Bold'
    },
    [`&.${tableCellClasses.body}`]: {
        fontSize: 14,
    },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
    '&:nth-of-type(odd)': {
        backgroundColor: theme.palette.action.hover,
    },
    '&:last-child td, &:last-child th': {
        border: 0,
    },
}));


function createData(id, room, location, capacity, color) {
    return { id, room, location, capacity, color };
}

function descendingComparator(a, b, orderBy) {
    if (typeof a[orderBy] === 'string') {
        return b[orderBy].localeCompare(a[orderBy]);
    } else if (typeof a[orderBy] === 'number') {
        return b[orderBy] - a[orderBy];
    } else if (a[orderBy] instanceof Date) {
        return new Date(b[orderBy]) - new Date(a[orderBy]);
    }
    return 0;
}

function getComparator(order, orderBy) {
    return order === 'desc'
        ? (a, b) => descendingComparator(a, b, orderBy)
        : (a, b) => -descendingComparator(a, b, orderBy);
}

function stableSort(array, comparator) {
    const stabilizedThis = array.map((el, index) => [el, index]);
    stabilizedThis.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        if (order !== 0) return order;
        return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
}

export default function Rooms({setLoading}) {
    const theme = useTheme();
    const {user} = useAuth();
    const [order, setOrder] = useState('asc');
    const [orderBy, setOrderBy] = useState('name');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [selected, setSelected] = useState([]);
    const [rowsOpen, setRowsOpen] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [filterLocation, setFilterLocation] = useState();
    const [locations, setLocations] = useState([]);
    const [rooms ,setRooms] = useState([]);
    const [filteredRooms, setFilteredRooms] = useState([]);
    const [groups, setGroups] = useState([]);
    const [roomGroups, setRoomGroups] = useState([]);
    const [paginatedRows, setPaginatedRows] = useState([]);
    const [update, setUpdate] = useState(0);
    const [selectedRoomLocation, setSelectedRoomLocation] = useState('');
    const [selectedRoom, setSelectedRoom] = useState(null);


    const handleDeleteSelected = () => {
        const remove = async () => {
            const promises = filteredRooms.map(async itm => isSelected(itm.id) ? await DeleteRoom(itm.id) : null);
            await Promise.all(promises).then( () => {
                setSelected([]);
                setUpdate(prev => prev + 1);
            });
        };
        remove();
    };

    const handleRequestSort = (event, property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
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
            const newSelecteds = rooms.map((n) => n.id);
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
                selected.slice(openIndex + 1)
            );
        }

        setRowsOpen(neOpen);
    };

    const handleRoomEdit = (room, location) => {
        setSelectedRoomLocation(location);
        setSelectedRoom(room);
        setOpenDialog(true);
    }

    const handleAddRoom = () => {
        setSelectedRoom(null);
        setSelectedRoomLocation(filterLocation);
        setOpenDialog(true);
    };

    const isSelected = (id) => selected.indexOf(id) !== -1;
    const isOpen = (id) => rowsOpen.indexOf(id) !== -1;

    useEffect(() => {    
        const getData = async () => {
            setLoading(true);
            const rms = await GetRooms();
            const lcs = await GetLocations();
            const grps = await GetGroups();
            const rmgps = await GetRoomGroups();

            setRoomGroups(rmgps);
            setLocations(lcs);
            setGroups(grps);
            setFilterLocation(filterLocation?.officeid || filterLocation?.officeid === 0 ? filterLocation : lcs.find(lc => lc.officeid == user?.location));
            setRooms(rms);
            setLoading(false);
        }
        getData();
    },[update]);
    
    useEffect(() => {
        let rms = [];
        if(filterLocation?.officeid){
            rms = rooms.filter(rm => rm.location === filterLocation.officeid);
            setFilteredRooms(rms);
        }else{
            rms = rooms;
            setFilteredRooms(rms);
        }

        const data = rms.map(itm => {
            return createData(
                itm.id,
                itm.value,
                itm.location,
                itm.capacity,
                itm.color
            );
        });
    
        const sortedRows = stableSort(data, getComparator(order, orderBy));
        setPaginatedRows(sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage));
        
    },[filterLocation, rooms]);

    return (
        <React.Fragment>
            <AddNewRoom open={openDialog} setOpen={setOpenDialog} selectedRoom={selectedRoom} roomLocation={selectedRoomLocation} roomGroups={roomGroups} locations={locations} groups={groups} setUpdate={setUpdate}/>
            <PageSelector headers={[]} selectedHeader={1} hoverFill={'white'}/>
            <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow:'hidden' }}>
                <Tooltip title={'Add room'}>
                    <AddIcon sx={{position:'absolute', right:40, zIndex:2, top:130, color:'green', cursor:'pointer', ':hover':{color:'lightgreen'}, height:'30px', width:'30px'}} onClick={handleAddRoom}/>
                </Tooltip>
                {selected?.length > 0 &&
                <Tooltip title={'Delete Selected'}>
                    <DeleteIcon sx={{position:'absolute', right:75, zIndex:2, top:130, color:'red', cursor:'pointer', ':hover':{color:'darkred'}, height:'30px', width:'30px'}} onClick={handleDeleteSelected}/>
                </Tooltip>
                }
                <Box sx={{width:'200px', position:'absolute', right:120, top:122}}>
                    <FormControl variant="standard" sx={{minWidth: 160, width:'100%'}}>
                        <InputLabel id="demo-simple-select-standard-label">Filter By Location</InputLabel>
                        <Select
                            sx={{width:'100%'}}
                            labelId="demo-simple-select-standard-label"
                            id="demo-simple-select-standard"
                            value={filterLocation?.officeid === 0 ? 0 : filterLocation?.officeid ? filterLocation.officeid : ''}
                            onChange={(e) => {
                                const selectedItem = locations.find(itm => itm.officeid === e.target.value);
                                setFilterLocation(selectedItem); // Return the entire object
                            }}
                        >
                            {locations.map((itm, index) => <MenuItem key={index} value={itm.officeid}>{itm.Alias}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Box>
                <TableContainer sx={{ flexGrow: 1, overflowY: 'auto' }}>
                    <Table sx={{ minWidth: 700 }} aria-label="customized table">
                        <TableHead sx={{position: 'sticky', top: 0, zIndex: 1}}>
                            <TableRow>
                                <StyledTableCell padding="checkbox">
                                <Checkbox
                                    indeterminate={selected.length > 0 && selected.length < filteredRooms.length}
                                    checked={filteredRooms.length > 0 && selected.length === filteredRooms.length}
                                    onChange={handleSelectAllClick}
                                    inputProps={{ 'aria-label': 'select all meetings' }}
                                />
                                </StyledTableCell>
                                <StyledTableCell align="left">
                                    <TableSortLabel
                                        active={orderBy === 'name'}
                                        direction={orderBy === 'name' ? order : 'asc'}
                                        onClick={(event) => handleRequestSort(event, 'name')}
                                    >
                                        Room
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell align="left">
                                    <TableSortLabel
                                        active={orderBy === 'organizer'}
                                        direction={orderBy === 'organizer' ? order : 'asc'}
                                        onClick={(event) => handleRequestSort(event, 'organizer')}
                                    >
                                        Location
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell align="left">
                                    <TableSortLabel
                                        active={orderBy === 'room'}
                                        direction={orderBy === 'room' ? order : 'asc'}
                                        onClick={(event) => handleRequestSort(event, 'room')}
                                    >
                                        Capacity
                                    </TableSortLabel>
                                </StyledTableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody sx={{backgroundColor:'white'}}>
                        {paginatedRows.map((row, index) => {
                            const backgroundColor = index % 2 === 0 ? '#f0f0f0' : '#ffffff';  // Alternate background color
                            const isItemSelected = isSelected(row.id);
                            const isItemOpen = isOpen(row.id);
                            const location = locations.find(lc => lc.officeid === row.location);
                            const rowRoom = filteredRooms.find(fr => fr.id === row.id);
                            return (
                            <React.Fragment key={row.id}>
                                <StyledTableRow
                                    hover
                                    role="checkbox"
                                    aria-checked={isItemSelected}
                                    tabIndex={-1}
                                    selected={isItemSelected}
                                    onClick={(e) => handleOpenClick(e, row.id)}
                                    sx={{cursor: 'pointer', backgroundColor: `${backgroundColor} !important`}}
                                >
                                <StyledTableCell padding="checkbox">
                                    <Checkbox
                                    onClick={(event) => {
                                        event.stopPropagation();  // Prevent the event from bubbling up
                                        handleClick(event, row.id);
                                    }}
                                    checked={isItemSelected}
                                    inputProps={{ 'aria-labelledby': `enhanced-table-checkbox-${row.id}` }}
                                    />
                                </StyledTableCell>
                                <StyledTableCell component="th" scope="row">{row.room}</StyledTableCell>
                                <StyledTableCell align="left">{location.Alias}</StyledTableCell>
                                <StyledTableCell align="left">{row.capacity}</StyledTableCell>
                                </StyledTableRow>
                                <StyledTableRow>
                                    <StyledTableCell style={{ padding: 0, boxSizing: 'border-box' }} colSpan={7}>
                                        <Collapse in={isItemOpen} timeout="auto" unmountOnExit>
                                            <Box>
                                                <RowRoom
                                                    location={location}
                                                    row={row}
                                                    groups={groups}
                                                    roomgroups={roomGroups}
                                                    setOpen={handleRoomEdit}
                                                    rowRoom={rowRoom}
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
                <Box sx={{ overflow: 'hidden' }}>
                    <TablePagination
                        component="div"
                        count={filteredRooms.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                </Box>
                
            </Paper>
        </React.Fragment>
    );
}
