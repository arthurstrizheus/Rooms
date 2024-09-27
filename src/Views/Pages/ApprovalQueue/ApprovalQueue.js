import React, {useEffect, useState} from 'react';
import { styled } from '@mui/material/styles';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import {getDateAmPm, getDuration} from '../../../Utilites/Functions/CommonFunctions'
import { useTheme } from '@emotion/react';
import { useAuth } from "../../../Utilites/AuthContext";
import {Stack, Typography, Box, Paper, TableContainer, Table, TableHead, Checkbox, TableSortLabel, TableBody, Button, TablePagination, Collapse, Select, FormControl, InputLabel, MenuItem, Tabs, Tab} from "@mui/material";
import RowMeeting from './Components/RowMeeting';
import { GetLocations, GetMeetingApprovals, GetRooms, GetTypes, showError, showSuccess } from '../../../Utilites/Functions/ApiFunctions';
import { UpdateMeetingStatus} from '../../../Utilites/Functions/ApiFunctions/MeetingFunctions';
import ShortSelect from '../../../Components/ShortSelect';

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

function createData(id, name, organizer, room, date, start_time, duration, requested, status) {
    return { id, name, organizer, room, date, start_time, duration, requested, status };
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
    const stabilizedThis = array?.map((el, index) => [el, index]);
    stabilizedThis.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        if (order !== 0) return order;
        return a[1] - b[1];
    });
    return stabilizedThis?.map((el) => el[0]);
}

export default function ApprovalQueue({setLoading}) {
    const {user} = useAuth();
    const theme = useTheme();
    const [order, setOrder] = useState('asc');
    const [orderBy, setOrderBy] = useState('name');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [selected, setSelected] = useState([]);
    const [rowsOpen, setRowsOpen] = useState([]);
    const [paginatedRows, setPaginatedRows] = useState([]);
    const [action, setAction] = useState('Approve');
    const [meetings, setMeetings] = useState([]);
    const [filterLocation, setFilterLocation] = useState();
    const [locations, setLocations] = useState([]);
    const [rooms ,setRooms] = useState([]);
    const [update, setUpdate] = useState(0);
    const [meetingTypes, setMeetingTypes] = useState([]);

    const handleSubmit = () => {
        const statusChange = async () => {
            const promises = meetings?.map(async itm => isSelected(itm.id) ? await UpdateMeetingStatus(itm.id, {status: `${action}d`, userId:user?.id, meeting: itm.id === -1 ? itm : null}) : null);
            await Promise.all(promises).then((resp) =>  resp ? showSuccess(`User${meetings?.length > 1 ? "s" : ''} ${action}d`) : showError(`Failed to ${action} user${meetings?.length > 1 ? "s" : ''}`)).then( () => {
                setSelected([]);
                setUpdate(prev => prev + 1);
            });
        };
        statusChange();
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
            const newSelecteds = meetings?.map((n, index) => index);
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

    const isSelected = (id) => selected.indexOf(id) !== -1;
    const isOpen = (id) => rowsOpen.indexOf(id) !== -1;

    useEffect(() => {
        const getData = async () => {
            setLoading(true);
            const rms = await GetRooms(user.id);
            const lcs = await GetLocations();
            const mtgs = await GetMeetingApprovals(user?.id);
            const typs = await GetTypes();

            setMeetingTypes(typs);
            setLocations(lcs);
            setRooms(rms);
            setMeetings(mtgs);
            setFilterLocation(lcs?.find(lc => lc.officeid == user?.location));
            setLoading(false);
        }
        if(user?.id){
            getData();
        }
        
    },[user, update]);
    
    useEffect(() => {
        if(meetings?.length){
            const itms = meetings?.filter(mt => mt?.group === user?.status_group && (mt?.location === filterLocation.officeid || filterLocation.officeid === 0));
            const data = itms?.map(itm => {
                const start = new Date(itm?.start_time);
                const duration = getDuration(start, new Date(itm?.end_time));
                let durationString = duration.hours ? `${duration.hours}h ${String(duration.minutes).padStart(2, '0')}m` : `${String(duration.minutes).padStart(2, '0')}m`;
                return createData(
                    itm.id,
                    itm.name,
                    itm.organizer,
                    rooms?.find(rm => rm.id == itm.room).value,
                    start.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }),
                    `${start.getHours() % 12 ? start.getHours() % 12 : 12}:${String(start.getMinutes()).padStart(2, '0')}${getDateAmPm(start)}m`,
                    durationString,
                    new Date(itm.createdAt).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }),
                    itm.status
                );
            });
        
            const sortedRows = (stableSort(data, getComparator(order, orderBy)));
            setPaginatedRows(sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage));
        }else{
            setPaginatedRows([]);
        }
    },[meetings, filterLocation, update]);
    
    return (
        <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow:'hidden'}}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={0} aria-label="basic tabs example">
                    <Tab label="Need Approved" {...a11yProps(0)} />
                </Tabs>
            </Box>
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
            <TableContainer sx={{ flexGrow: 1 }}>
                <Table sx={{ minWidth: 700 }} aria-label="customized table">
                    <TableHead sx={{position: 'sticky', top: 0, zIndex: 1}}>
                        <TableRow>
                            <StyledTableCell padding="checkbox">
                            <Checkbox
                                indeterminate={selected.length > 0 && selected.length < meetings?.length}
                                checked={meetings?.length > 0 && selected.length === meetings?.length}
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
                                    Title
                                </TableSortLabel>
                            </StyledTableCell>
                            <StyledTableCell align="left">
                                <TableSortLabel
                                    active={orderBy === 'organizer'}
                                    direction={orderBy === 'organizer' ? order : 'asc'}
                                    onClick={(event) => handleRequestSort(event, 'organizer')}
                                >
                                    Organizer
                                </TableSortLabel>
                            </StyledTableCell>
                            <StyledTableCell align="left">
                                <TableSortLabel
                                    active={orderBy === 'room'}
                                    direction={orderBy === 'room' ? order : 'asc'}
                                    onClick={(event) => handleRequestSort(event, 'room')}
                                >
                                    Room
                                </TableSortLabel>
                            </StyledTableCell>
                            <StyledTableCell align="left">
                                <TableSortLabel
                                    active={orderBy === 'date'}
                                    direction={orderBy === 'date' ? order : 'asc'}
                                    onClick={(event) => handleRequestSort(event, 'date')}
                                >
                                    Date
                                </TableSortLabel>
                            </StyledTableCell>
                            <StyledTableCell align="left">
                                <TableSortLabel
                                    active={orderBy === 'start'}
                                    direction={orderBy === 'start' ? order : 'asc'}
                                    onClick={(event) => handleRequestSort(event, 'start')}
                                >
                                    Start Time
                                </TableSortLabel>
                            </StyledTableCell>
                            <StyledTableCell align="left">
                                <TableSortLabel
                                    active={orderBy === 'duration'}
                                    direction={orderBy === 'duration' ? order : 'asc'}
                                    onClick={(event) => handleRequestSort(event, 'duration')}
                                >
                                    Duration
                                </TableSortLabel>
                            </StyledTableCell>
                            <StyledTableCell align="left">
                                <TableSortLabel
                                    active={orderBy === 'requested'}
                                    direction={orderBy === 'requested' ? order : 'asc'}
                                    onClick={(event) => handleRequestSort(event, 'requested')}
                                >
                                    Requested Date
                                </TableSortLabel>
                            </StyledTableCell>
                            <StyledTableCell align="left">
                                <TableSortLabel
                                    active={orderBy === 'status'}
                                    direction={orderBy === 'status' ? order : 'asc'}
                                    onClick={(event) => handleRequestSort(event, 'status')}
                                >
                                    Status
                                </TableSortLabel>
                            </StyledTableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody sx={{backgroundColor:'white'}}>
                    {paginatedRows?.length > 0 && paginatedRows?.map((row, index) => {
                        const backgroundColor = index % 2 === 0 ? '#f0f0f0' : '#ffffff';  // Alternate background color
                        const isItemSelected = isSelected(row.id);
                        const isItemOpen = isOpen(row.id);
                        const meeting = meetings?.find(mt => mt.id === row?.id);
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
                            <StyledTableCell component="th" scope="row">{<Typography sx={{textDecoration: row.status == 'Canceled' ? 'line-through' : 'none'}}>{row.name}</Typography>}</StyledTableCell>
                            <StyledTableCell align="left">{<Typography sx={{textDecoration: row.status == 'Canceled' ? 'line-through' : 'none'}}>{row.organizer}</Typography>}</StyledTableCell>
                            <StyledTableCell align="left">{<Typography sx={{textDecoration: row.status == 'Canceled' ? 'line-through' : 'none'}}>{row.room}</Typography>}</StyledTableCell>
                            <StyledTableCell align="left">{<Typography sx={{textDecoration: row.status == 'Canceled' ? 'line-through' : 'none'}}>{row.date}</Typography>}</StyledTableCell>
                            <StyledTableCell align="left">{<Typography sx={{textDecoration: row.status == 'Canceled' ? 'line-through' : 'none'}}>{row.start_time}</Typography>}</StyledTableCell>
                            <StyledTableCell align="left">{<Typography sx={{textDecoration: row.status == 'Canceled' ? 'line-through' : 'none'}}>{row.duration}</Typography>}</StyledTableCell>
                            <StyledTableCell align="left">{<Typography sx={{textDecoration: row.status == 'Canceled' ? 'line-through' : 'none'}}>{row.requested}</Typography>}</StyledTableCell>
                            <StyledTableCell align="left">{row.status}</StyledTableCell>
                            </StyledTableRow>
                            <StyledTableRow>
                                <StyledTableCell style={{ padding: 0, boxSizing: 'border-box' }} colSpan={9}>
                                    <Collapse in={isItemOpen} timeout="auto" unmountOnExit>
                                        <Box>
                                            <RowMeeting
                                                meeting={meeting}
                                                location={locations?.find(lc => lc.officeid === meeting?.location)}
                                                room={rooms?.find(rm => rm.id === meeting?.room)}
                                                type={meetingTypes?.find(tp => tp.id === meeting?.type)}
                                                row={row}
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
            <Stack direction={'row'} sx={{alignItems:'center', marginLeft:'30px', bottom:10, marginBottom:'-50px'}} spacing={2} zIndex={1}>
                <Typography sx={{whiteSpace:'nowrap'}}>I Want To </Typography>
                <ShortSelect value={action} items={['Decline', 'Approve']} label={"Action"} variant={'outlined'} onChange={(e) => setAction(e)} width={'120px'} disabled={(selected?.length == 0)}/>
                <Typography sx={{whiteSpace:'nowrap'}}>Selected</Typography>
                <Button onClick={handleSubmit} variant='outlined' sx={{background:selected?.length == 0 ? '' : 'rgba(0,200,0,.3)', ':hover':{background:'rgba(0,200,0,.5)'}}}>Submit</Button>
            </Stack>
            <TablePagination
                sx={{overflow:'hidden'}}
                component="div"
                count={meetings?.length ? meetings.length : 0}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            />
        </Paper>
    );
}
