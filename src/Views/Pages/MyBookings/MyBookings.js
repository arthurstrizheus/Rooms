import React, {useEffect, useState} from 'react';
import { styled } from '@mui/material/styles';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import {getDateAmPm, getDuration} from '../../../Utilites/Functions/CommonFunctions'
import { useTheme } from '@emotion/react';
import { useAuth } from "../../../Utilites/AuthContext";
import {Typography, Box, TableContainer, Table, TableHead, TableBody, TablePagination, Paper, Checkbox, TableSortLabel, Collapse } from "@mui/material";
import RowMeeting from './Components/RowMeeting';
import {GetLocations, GetMeetingsUserCreated, GetRooms, GetTypes} from '../../../Utilites/Functions/ApiFunctions'


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
    const stabilizedThis = array.map((el, index) => [el, index]);
    stabilizedThis.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        if (order !== 0) return order;
        return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
}

export default function MyBookings({setLoading}) {
    const {user} = useAuth();
    const theme = useTheme();
    const [order, setOrder] = useState('asc');
    const [orderBy, setOrderBy] = useState('date');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [selected, setSelected] = useState([]);
    const [rowsOpen, setRowsOpen] = useState([]);
    const [paginatedRows, setPaginatedRows] = useState([]);
    const [update, setUpdate] = useState(0);
    const [meetings, setMeetings] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [locations, setLocations] = useState([]);
    const [types, setTypes] = useState([]);

    // const handleDeleteSelected = () => { // TODO finish this junk
    //     console.log(selected);
    // };

    // const handleCancelSelected = () => {
    //     console.log(selected);
    // };

    // const handleDelete = (id) => {
    //     console.log(id);
    // };

    // const handleCancel = (id) => {
    //     console.log(id);
    // };


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
            const newSelecteds = meetings.map((n, index) => index);
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
        const data = async () => {
            const mts = await GetMeetingsUserCreated(user?.id, {date: new Date(), range:'Month'});
            const tps = await GetTypes();
            const rms = await GetRooms();
            const lcs = await GetLocations();

            setMeetings(mts);
            setRooms(rms);
            setLocations(lcs);
            setTypes(tps);

            setLoading(false);
        };
        if(user?.id){
            setLoading(true);
            data();
        }
        
    },[user, update]);
    
    useEffect(() => {
        if(meetings?.length){
            const data = meetings.map(itm => {
                const start = new Date(itm.start_time);
                const duration = getDuration(start, new Date(itm.end_time));
                let durationString = duration.hours ? `${duration.hours}h ${String(duration.minutes).padStart(2, '0')}m` : `${String(duration.minutes).padStart(2, '0')}m`;
                
                return createData(
                    itm.id,
                    itm.name,
                    'Me',
                    rooms.find(rm => rm.id == itm.room).value,
                    start,
                    `${start.getHours() % 12 ? start.getHours() % 12 : 12}:${String(start.getMinutes()).padStart(2, '0')}${getDateAmPm(start)}m`,
                    durationString,
                    new Date(itm.createdAt),
                    itm.status
                );
            });
        
            const sortedRows = (stableSort(data, getComparator(order, orderBy)));
            setPaginatedRows(sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage));
        }else{
            setPaginatedRows([]);
        }
    },[meetings]);
    

    return (
        <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column',  overflow:'hidden'}}>
            <TableContainer sx={{ flexGrow: 1 }}>
                <Table sx={{ minWidth: 700 }} aria-label="customized table">
                    <TableHead sx={{position: 'sticky', top: 0, zIndex: 1}}>
                        <TableRow>
                            {/* <StyledTableCell padding="checkbox">
                            <Checkbox
                                indeterminate={selected.length > 0 && selected.length < meetings.length}
                                checked={meetings.length > 0 && selected.length === meetings.length}
                                onChange={handleSelectAllClick}
                                inputProps={{ 'aria-label': 'select all meetings' }}
                            />
                            </StyledTableCell> */}
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
                    {paginatedRows.map((row, index) => {
                        const backgroundColor = index % 2 === 0 ? '#f0f0f0' : '#ffffff';  // Alternate background color
                        const isItemSelected = isSelected(index);
                        const isItemOpen = isOpen(index);
                        const meeting = meetings[index];
                        return (
                        <React.Fragment key={index}>
                            <StyledTableRow
                                hover
                                role="checkbox"
                                aria-checked={isItemSelected}
                                tabIndex={-1}
                                selected={isItemSelected}
                                onClick={(e) => handleOpenClick(e, index)}
                                sx={{cursor: 'pointer', backgroundColor: `${backgroundColor} !important`}}
                            >
                            {/* <StyledTableCell padding="checkbox">
                                <Checkbox
                                onClick={(event) => {
                                    event.stopPropagation();  // Prevent the event from bubbling up
                                    handleClick(event, index);
                                }}
                                checked={isItemSelected}
                                inputProps={{ 'aria-labelledby': `enhanced-table-checkbox-${index}` }}
                                />
                            </StyledTableCell> */}
                            <StyledTableCell component="th" scope="row">{<Typography sx={{textDecoration: row.status == 'Canceled' ? 'line-through' : 'none'}}>{row.name}</Typography>}</StyledTableCell>
                            <StyledTableCell align="left">{<Typography sx={{textDecoration: row.status == 'Canceled' ? 'line-through' : 'none'}}>{row.organizer}</Typography>}</StyledTableCell>
                            <StyledTableCell align="left">{<Typography sx={{textDecoration: row.status == 'Canceled' ? 'line-through' : 'none'}}>{row.room}</Typography>}</StyledTableCell>
                            <StyledTableCell align="left">{<Typography sx={{textDecoration: row.status == 'Canceled' ? 'line-through' : 'none'}}>{row.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</Typography>}</StyledTableCell>
                            <StyledTableCell align="left">{<Typography sx={{textDecoration: row.status == 'Canceled' ? 'line-through' : 'none'}}>{row.start_time}</Typography>}</StyledTableCell>
                            <StyledTableCell align="left">{<Typography sx={{textDecoration: row.status == 'Canceled' ? 'line-through' : 'none'}}>{row.duration}</Typography>}</StyledTableCell>
                            <StyledTableCell align="left">{<Typography sx={{textDecoration: row.status == 'Canceled' ? 'line-through' : 'none'}}>{row.requested.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</Typography>}</StyledTableCell>
                            <StyledTableCell align="left">{row.status}</StyledTableCell>
                            </StyledTableRow>
                            <StyledTableRow sx={{transition:'height .5s ease-in-out'}}>
                                <StyledTableCell style={{ padding: 0, boxSizing: 'border-box', overflow:'hidden' }} colSpan={9}>
                                    <Collapse in={isItemOpen} timeout="auto" unmountOnExit>
                                        <Box>
                                            <RowMeeting
                                                meeting={meeting}
                                                location={locations.find(lc => lc.officeid === meeting.location)}
                                                room={rooms.find(rm => rm.id == meeting.room)}
                                                type={types.find(tp => tp.id === meeting.type)}
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
            <TablePagination
                sx={{overflow:'hidden'}}
                component="div"
                count={meetings.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            />
        </Paper>
    );
}
