import React, {useState, useEffect} from 'react';
import { styled } from '@mui/material/styles';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import { useTheme } from '@emotion/react';
import { useAuth } from '../../../Utilites/AuthContext';
import { getDateAmPm } from '../../../Utilites/Functions/CommonFunctions';
import { FormControl, InputLabel, Select, Box, Tooltip, TableContainer, Table, TableHead, TableBody, TablePagination, Paper, Checkbox, MenuItem, Tab, Tabs } from "@mui/material";
import AddBlockedDate from './Components/AddBlockedDate';
import AddIcon from '@mui/icons-material/AddOutlined';
import PageSelector from '../../Components/PageSelector/PageSelector'
import { GetBlockedDatess, GetGroups, GetGroupUsers, GetLocations, GetRoomGroups, GetRooms, showError, showSuccess, UserAnyAccessRooms, UserFullAccessRooms, UsersGroups } from '../../../Utilites/Functions/ApiFunctions';
import DeleteIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { DeleteBlockedDate } from '../../../Utilites/Functions/ApiFunctions/BlockedDatesFunctions';

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

function a11yProps(index) {
    return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`,
    };
}

function createData(id, name, description, room_id, start_time, end_time, repeats) {
    return { id, name, description, room_id, start_time, end_time, repeats };
}

export default function BlockedDates({setLoading}) {
    const theme = useTheme();
    const {user} = useAuth();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [filterLocation, setFilterLocation] = useState();
    const [paginatedRows, setPaginatedRows] = useState([]);
    const [filteredDates, setFilteredDates] = useState([]);
    const [selected, setSelected] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [locations, setLocations] = useState([]);
    const [rooms ,setRooms] = useState([]);
    const [blockedDates, setBlockedDates] = useState([]);
    const [fullAccessRoms, setFullAccessRoms] = useState([]);
    const [update, setUpdate] = useState(0);

    const handleDeleteSelected = () => {
        const remove = async () => {
            const promises = filteredDates?.map(async itm => isSelected(itm.id) ? await DeleteBlockedDate(itm.id) : null);
            await Promise.all(promises).then((resp) =>  {
                if(resp){
                    showSuccess("Items Deleted");
                    setSelected([]);
                    setUpdate(prev => prev + 1);
                }else{
                    showError("Failed to delete")
                }
            });
        };
        remove();
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
            const newSelecteds = filteredDates?.map((n) => n.id);
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
            const lcs = await GetLocations();
            const rms = await GetRooms();
            const rmgps = await GetRoomGroups();
            const blc = await GetBlockedDatess();
            const usrgrps = await GetGroupUsers();
            const grps = await GetGroups();

            setLocations(lcs);
            setRooms(UserAnyAccessRooms(usrgrps, grps, rmgps, rms, user));
            setFullAccessRoms(UserFullAccessRooms(usrgrps, grps, rmgps, rms, user))
            setBlockedDates(blc);
            setFilterLocation(lcs?.find(lc => lc.officeid == user?.location));
            setLoading(false);
        }
        if(user?.id){
            getData();
        }
    },[update, user]);

    useEffect(() => {
        if(blockedDates?.length){
            const filteredBlockedDates = blockedDates?.filter(bd => rooms?.find(fr => fr.id == bd.room_id && fr.location === filterLocation.officeid));

            setFilteredDates(filteredBlockedDates);
            const data = filteredBlockedDates?.map(itm => {
                return createData(
                    itm.id,
                    itm.name,
                    itm.description,
                    itm.room_id,
                    itm.start_time,
                    itm.end_time,
                    itm.repeats
                );
            });
    
            setPaginatedRows(data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage));
        }else{
            setPaginatedRows([]);
        }
        
    },[filterLocation, rooms, blockedDates]);

    return (
        <React.Fragment>
            <AddBlockedDate 
                open={openDialog}
                setOpen={setOpenDialog}
                rooms={fullAccessRoms.filter(rm => rm.location == filterLocation.officeid)}
                location={filterLocation}
                setUpdate={setUpdate}
            />
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={0} aria-label="basic tabs example">
                    <Tab label="Blocked" {...a11yProps(0)} />
                </Tabs>
            </Box>
            <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow:'hidden' }}>
                <Tooltip title={'Add Item'}>
                    <AddIcon sx={{position:'absolute', right:40, zIndex:2, top:130, color:'darkgreen', cursor:'pointer', ':hover':{color:'green'}, height:'30px', width:'30px'}} onClick={setOpenDialog}/>
                </Tooltip>
                {selected?.length > 0 &&
                <Tooltip title={'Delete Selected'}>
                    <DeleteIcon sx={{position:'absolute', right:70, zIndex:2, top:130, color:'red', cursor:'pointer', ':hover':{color:'darkred'}, height:'30px', width:'30px'}} onClick={handleDeleteSelected}/>
                </Tooltip>
                }
                <Box sx={{width:'200px', position:'absolute', right:120, top:122}}>
                    <FormControl variant="standard" sx={{minWidth: 160, width:'100%'}}>
                        <InputLabel id="demo-simple-select-standard-label">Filter By Location</InputLabel>
                        <Select
                            sx={{width:'100%'}}
                            labelId="demo-simple-select-standard-label"
                            id="demo-simple-select-standard"
                            value={filterLocation?.officeid || ''}
                            onChange={(e) => {
                                const selectedItem = locations?.find(itm => itm.officeid === e.target.value);
                                setFilterLocation(selectedItem); // Return the entire object
                            }}
                        >
                            {locations?.map((itm, index) => <MenuItem key={index} value={itm.officeid}>{itm.Alias}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Box>           
                <TableContainer sx={{ flexGrow: 1, overflowY: 'auto' }}>
                    <Table sx={{ minWidth: 700 }} aria-label="customized table">
                        <TableHead sx={{position: 'sticky', top: 0, zIndex: 1}}>
                            <TableRow>
                                <StyledTableCell padding="checkbox">
                                <Checkbox
                                    indeterminate={selected.length > 0 && selected.length < filteredDates.length}
                                    checked={filteredDates.length > 0 && selected.length === filteredDates.length}
                                    onChange={handleSelectAllClick}
                                    inputProps={{ 'aria-label': 'select all meetings' }}
                                />
                                </StyledTableCell>
                                <StyledTableCell align="left">Name</StyledTableCell>
                                <StyledTableCell align="left">Description</StyledTableCell>
                                <StyledTableCell align="left">Room</StyledTableCell>
                                <StyledTableCell align="left">Date</StyledTableCell>
                                <StyledTableCell align="left">Start Time</StyledTableCell>
                                <StyledTableCell align="left">End Time</StyledTableCell>
                                <StyledTableCell align="left">Repeats</StyledTableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody sx={{backgroundColor:'white'}}>
                        {paginatedRows?.map((row) => {
                            const isItemSelected = isSelected(row.id);
                            const room = rooms?.find(rm => rm.id == row.room_id);
                            const start = new Date(row.start_time);
                            const end = new Date(row.end_time);
                            const startString = new Date(row.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
                            const endString = new Date(row.end_time).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
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
                                    onClick={(event) => handleClick(event, row.id)}
                                    checked={isItemSelected}
                                    inputProps={{ 'aria-labelledby': `enhanced-table-checkbox-${row.id}` }}
                                    />
                                </StyledTableCell>
                                <StyledTableCell component="th" scope="row">{row.name}</StyledTableCell>
                                <StyledTableCell align="left">{row.description}</StyledTableCell>
                                <StyledTableCell align="left">{room.value}</StyledTableCell>
                                <StyledTableCell align="left">
                                    { start.getDate() < end.getDate() ?
                                        `${startString} - ${endString}`
                                        :
                                        startString
                                    }
                                </StyledTableCell>
                                <StyledTableCell align="left">{`${start.getHours() % 12 ? start.getHours() % 12 : 12}:${String(start.getMinutes()).padStart(2, '0')}${getDateAmPm(start)}m`}</StyledTableCell>
                                <StyledTableCell align="left">{`${end.getHours() % 12 ? end.getHours() % 12 : 12}:${String(end.getMinutes()).padStart(2, '0')}${getDateAmPm(end)}m`}</StyledTableCell>
                                <StyledTableCell align="left">{row.repeats ? row.repeats : 'No'}</StyledTableCell>
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
                        count={filteredDates.length}
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
