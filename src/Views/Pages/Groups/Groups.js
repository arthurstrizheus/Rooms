import React, {useState, useEffect} from 'react';
import { styled } from '@mui/material/styles';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import { useTheme } from '@emotion/react';
import { useAuth } from "../../../Utilites/AuthContext";
import { useNavigate } from 'react-router-dom';
import {TableContainer, Table, TableHead, TableBody, TablePagination, Paper, Checkbox, TableSortLabel, Tooltip, Select, FormControl, InputLabel, MenuItem } from "@mui/material";
import PageSelector from '../../Components/PageSelector/PageSelector';
import { GetGroups, GetLocations } from '../../../Utilites/Functions/ApiFunctions';
import AddIcon from '@mui/icons-material/AddOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlineOutlined';
import AddNewGroup from './Components/AddNewGroup';
import { Box } from '@mui/system';
import { DeleteGroup } from '../../../Utilites/Functions/ApiFunctions/GroupFunctions';


const StyledTableCell = styled(TableCell)(({ theme }) => ({
    [`&.${tableCellClasses.head}`]: {
        backgroundColor: '#e3e3e3',
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

function createData(id, group_name, access) {
    return { id, group_name, access};
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

export default function Groups({setLoading}) {
    const {user} = useAuth();
    const navigate = useNavigate();
    const theme = useTheme();
    const [order, setOrder] = useState('asc');
    const [orderBy, setOrderBy] = useState('name');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [selected, setSelected] = useState([]);
    const [paginatedRows, setPaginatedRows] = useState([]);
    const [groups, setGroups] = useState([]);
    const [filteredGroups, setFilteredGroups] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [filterLocation, setFilterLocation] = useState();
    const [update, setUpdate] = useState(0);
    const [locations, setLocations] = useState([]);

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
            const newSelecteds = groups?.map((n) => n.id);
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

    const handleDeleteSelected = () => {
        const remove = async () => {
            const promises = filteredGroups?.map(async itm => isSelected(itm.id) ? await DeleteGroup(itm.id) : null);
            await Promise.all(promises).then( () => {
                setSelected([]);
                setUpdate(prev => prev + 1);
            });
        };
        remove();
    };
    
    const isSelected = (id) => selected.indexOf(id) !== -1;

    useEffect(() => {
        const getData = async () => {
            setLoading(true);
            const locations = await GetLocations();
            const groups = await GetGroups();
            setFilterLocation(filterLocation?.officeid || filterLocation?.officeid === 0 ? filterLocation : locations?.find(lc => lc.officeid == user?.location));
            setLocations(locations);
            setGroups(groups);
            setLoading(false);
        }
        getData();
    },[update]);

    useEffect(() => {
        let grps = [];
        if(filterLocation?.officeid){
            grps = groups.filter(grp => grp.location === filterLocation.officeid);
            setFilteredGroups(grps);
        }else{
            grps = groups;
            setFilteredGroups(grps);
        }

        const data = grps?.map(itm => {
            return createData(
                itm.id,
                itm.group_name,
                itm.access
            );
        });
    
        const sortedRows = (stableSort(data, getComparator(order, orderBy)));
        setPaginatedRows(sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage));
    },[groups, filterLocation]);
    
    return (
        <Box sx={{height:'100%', width:'100%', display:'flex', flexGrow:1}}>
            <AddNewGroup open={openDialog} setOpen={setOpenDialog} location={filterLocation} locations={locations} setUpdate={setUpdate}/>
            <Tooltip title={'Add User'}>
                    <AddIcon sx={{position:'absolute', right:40, zIndex:2, top:130, color:'green', cursor:'pointer', ':hover':{color:'lightgreen'}, height:'30px', width:'30px'}} onClick={setOpenDialog}/>
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
                                const selectedItem = locations?.find(itm => itm.officeid === e.target.value);
                                setFilterLocation(selectedItem); // Return the entire object
                            }}
                        >
                            {locations?.map((itm, index) => <MenuItem key={index} value={itm.officeid}>{itm.Alias}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Box>
            <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column',  flexGrow:1}}>
                <TableContainer sx={{ flexGrow: 1, height:'100%', overflow:'hidden'}}>
                    <Table sx={{ minWidth: 700 }} aria-label="customized table">
                        <TableHead sx={{position: 'sticky', top: 0, zIndex: 1}}>
                            <TableRow>
                                <StyledTableCell padding="checkbox">
                                <Checkbox
                                    indeterminate={selected.length > 0 && selected.length < filteredGroups.length}
                                    checked={filteredGroups.length > 0 && selected.length === filteredGroups.length}
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
                                        Name
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell align="left">
                                    <TableSortLabel
                                        active={orderBy === 'email'}
                                        direction={orderBy === 'email' ? order : 'asc'}
                                        onClick={(event) => handleRequestSort(event, 'email')}
                                    >
                                        Access
                                    </TableSortLabel>
                                </StyledTableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody sx={{backgroundColor:'white'}}>
                        {paginatedRows?.map((row, index) => {
                            const isItemSelected = isSelected(row.id);
                            return (
                                <StyledTableRow
                                    key={index}
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
                                    <StyledTableCell component="th" scope="row">
                                        {row.group_name}
                                    </StyledTableCell>
                                    <StyledTableCell align="left">{row.access}</StyledTableCell>
                                </StyledTableRow>
                            );
                        })}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    sx={{overflow:'hidden'}}
                    component="div"
                    count={filteredGroups.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </Paper>
        </Box>
    );
}
