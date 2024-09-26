import React, {useState, useEffect} from 'react';
import { styled } from '@mui/material/styles';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import { useTheme } from '@emotion/react';
import { useAuth } from "../../../../Utilites/AuthContext";
import { useNavigate } from 'react-router-dom';
import { Stack,
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
        Select
    } from "@mui/material";
import AddNewUser from './AddNewUser';
import AddIcon from '@mui/icons-material/AddOutlined';
import ShortSelect from '../../../../Components/ShortSelect';
import ViewUser from './ViewUser';
import { GetGroups, GetGroupUsers, GetLocations, GetUsers, showError, showSuccess } from '../../../../Utilites/Functions/ApiFunctions';
import { ActivateUser, DeactivateUser, DeleteUser } from '../../../../Utilites/Functions/ApiFunctions/UserFunctions';

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

function createData(id, name, email, location, groups, active, last_login, admin) {
    return { id, name, email, location, groups, active, last_login, admin};
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

export default function Users({setLoading}) {
    const {user} = useAuth();
    const navigate = useNavigate();
    const theme = useTheme();
    const [order, setOrder] = useState('asc');
    const [orderBy, setOrderBy] = useState('name');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [selected, setSelected] = useState([]);
    const [paginatedRows, setPaginatedRows] = useState([]);
    const [rowsOpen, setRowsOpen] = useState([]);
    const [action, setAction] = useState('Activate');
    const [users, setUsers] = useState([]);
    const [editUserOpen, setEditUserOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [filterLocation, setFilterLocation] = useState();
    const [selectedUserLocation, setSelectedUserLocation] = useState(null);
    const [update, setUpdate] = useState(0);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [locations, setLocations] = useState([]);
    const [groupUsers, setGroupUsers] = useState([]);

    const handleSubmit = () => {
        const remove = async () => {
            const promises = filteredUsers?.map(async itm => isSelected(itm.id) ? await DeleteUser(itm.id) : null);
            await Promise.all(promises).then((resp) =>  resp  ? showSuccess(`User${filteredUsers?.length > 1 ? "s" : ''} Deleted`) : showError(`Failed to delete user${filteredUsers?.length > 1 ? "s" : ''}`)).then( () => {
                setSelected([]);
                setUpdate(prev => prev + 1);
            });
        };

        const activate = async () => {
            const promises = filteredUsers?.map(async itm => isSelected(itm.id) ? await ActivateUser(itm.id) : null);
            await Promise.all(promises).then((resp) =>  resp ? showSuccess(`User${filteredUsers?.length > 1 ? "s" : ''} Activated`) : showError(`Failed to activate user${filteredUsers?.length > 1 ? "s" : ''}`)).then( () => {
                setSelected([]);
                setUpdate(prev => prev + 1);
            });
        };

        const deactivate = async () => {
            const promises = filteredUsers?.map(async itm => isSelected(itm.id) ? await DeactivateUser(itm.id) : null);
            await Promise.all(promises).then((resp) =>  resp ? showSuccess(`User${filteredUsers?.length > 1 ? "s" : ''} Deactivated`) : showError(`Failed to deactivate user${filteredUsers?.length > 1 ? "s" : ''}`)).then( () => {
                setSelected([]);
                setUpdate(prev => prev + 1);
            });
        };

        switch(action){
            case 'Activate':
                activate();
                break;
            case 'Deactivate':
                deactivate();
                break;
            case 'Remove':
                remove();
                break;
        }
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
                selected.slice(openIndex + 1)
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
                selected.slice(selectedIndex + 1)
            );
        }

        setSelected(newSelected);
    };

    const hadleEditUser = (user, location) => {
        setSelectedUserLocation(location);
        setSelectedUser(user);
        setEditUserOpen(true);
    }

    const handleAdduser = () => {
        setSelectedUserLocation(filterLocation);
        setSelectedUser(null);
        setEditUserOpen(true);
    }

    const onHeaderClick = (e) => {
        if(e == 'Groups'){
            navigate('/manage/groups');
        }
    }

    const isSelected = (id) => selected.indexOf(id) !== -1;
    const isOpen = (id) => rowsOpen.indexOf(id) !== -1;

    useEffect(() => {
        const getData = async () => {
            setLoading(true);
            
            const lcs = await GetLocations();
            const grps = await GetGroups();
            const groupUsers = await GetGroupUsers();
            const users = await GetUsers();
            setUsers(users.filter(usr => usr.id !== user?.id));
            setGroups(grps);
            setGroupUsers(groupUsers);
            setLocations(lcs);
            setFilterLocation(filterLocation?.officeid || filterLocation?.officeid === 0 ? filterLocation : lcs?.find(lc => lc.officeid == user?.location));
            setLoading(false);
        }
        getData();
    },[update]);
    
    useEffect(() => {
        let usrs = [];
        if(filterLocation?.officeid){
            usrs = users.filter(usr => usr.location === filterLocation.officeid);
            setFilteredUsers(usrs);
        }else{
            usrs = users;
            setFilteredUsers(users);
        }

        const data = usrs?.map(itm => {
            const Usersgroups = groupUsers.filter(ug => ug.user_id == itm.id);
            const usersGroupsByName = [];
            Usersgroups?.map(gp => usersGroupsByName.push(groups?.find(mg => mg.id == gp.group_id)));
            return createData(
                itm.id,
                `${itm.first_name} ${itm.last_name}`,
                itm.email,
                locations?.find(lc => lc.officeid == itm.location).Alias,
                usersGroupsByName,
                itm.active ? 'True' : 'False',
                itm.last_login ? new Date(itm.last_login).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
                : 'Has not Logged In',
                itm.admin
            );
        });
    
        const sortedRows = (stableSort(data, getComparator(order, orderBy)));
        setPaginatedRows(sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage));
    },[filterLocation, users]);
    
    return (
        <Box sx={{height:'100%', width:'100%', display:'flex', flexGrow:1}}>
            <AddNewUser open={editUserOpen} setOpen={setEditUserOpen} userLocation={selectedUserLocation} locations={locations} groups={groups} userGroups={groupUsers} selectedUser={selectedUser} setUpdate={setUpdate}/>
            {user?.admin &&
                <Tooltip title={'Add User'}>
                    <AddIcon sx={{position:'absolute', right:40, zIndex:2, top:130, color:'green', cursor:'pointer', ':hover':{color:'lightgreen'}, height:'30px', width:'30px'}} onClick={handleAdduser}/>
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
            <Paper sx={{ height: '100%', display: 'flex', flexGrow:1, flexDirection: 'column',  }}>
                <TableContainer sx={{ flexGrow: 1, height:'100%', overflow:'hidden'}}>
                    <Table sx={{ minWidth: 700 }} aria-label="customized table">
                        <TableHead sx={{position: 'sticky', top: 0, zIndex: 1}}>
                            <TableRow>
                                <StyledTableCell padding="checkbox">
                                <Checkbox
                                    indeterminate={selected.length > 0 && selected.length < filteredUsers.length}
                                    checked={filteredUsers.length > 0 && selected.length === filteredUsers.length}
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
                                        Email
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell align="left">
                                    <TableSortLabel
                                        active={orderBy === 'location'}
                                        direction={orderBy === 'location' ? order : 'asc'}
                                        onClick={(event) => handleRequestSort(event, 'location')}
                                    >
                                        Location
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell align="left">
                                    <TableSortLabel
                                        active={orderBy === 'group'}
                                        direction={orderBy === 'group' ? order : 'asc'}
                                        onClick={(event) => handleRequestSort(event, 'group')}
                                    >
                                        Groups
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell align="left">
                                    <TableSortLabel
                                        active={orderBy === 'active'}
                                        direction={orderBy === 'active' ? order : 'asc'}
                                        onClick={(event) => handleRequestSort(event, 'active')}
                                    >
                                        Active
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell align="left">
                                    <TableSortLabel
                                        active={orderBy === 'login'}
                                        direction={orderBy === 'login' ? order : 'asc'}
                                        onClick={(event) => handleRequestSort(event, 'login')}
                                    >
                                        Last Login
                                    </TableSortLabel>
                                </StyledTableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody sx={{backgroundColor:'white'}}>
                        {paginatedRows?.map((row, index) => {
                            const isItemSelected = isSelected(row.id);
                            const isItemOpen = isOpen(row.id);
                            const backgroundColor = index % 2 === 0 ? '#f0f0f0' : '#ffffff';  // Alternate background color
                            const rowUser = filteredUsers?.find(mt => mt.id === row.id);
                            const location = locations?.find(lc => lc.officeid == rowUser?.location);
                            return (
                                <React.Fragment key={index}>
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
                                        <StyledTableCell component="th" scope="row">{row.name}</StyledTableCell>
                                        <StyledTableCell align="left">{row.email}</StyledTableCell>
                                        <StyledTableCell align="left">{row.location}</StyledTableCell>
                                        <StyledTableCell align="left" display="flex">
                                            {row.groups?.map((gp, index) => (
                                                <Tooltip 
                                                    key={index}
                                                    arrow
                                                    title={
                                                        <Typography variant="body2">
                                                            {`${gp.access} Access`}
                                                        </Typography>
                                                    } 
                                                >
                                                    <Chip sx={{cursor:'pointer', marginLeft:'2px', marginTop:'2px'}} label={gp.group_name} />
                                                </Tooltip>
                                            ))}
                                            {row.admin &&
                                                <Tooltip 
                                                    key={'Admin'}
                                                    arrow
                                                    title={
                                                        <Typography variant="body2">
                                                            {`Admin Access`}
                                                        </Typography>
                                                    }
                                                >
                                                    <Chip sx={{cursor:'pointer', color:'white', backgroundColor:'green', marginLeft:'2px', marginTop:'2px'}} label={'Admin'}/>
                                                </Tooltip>
                                            }
                                        </StyledTableCell>
                                        <StyledTableCell align="left">{row.active}</StyledTableCell>
                                        <StyledTableCell align="left">{row.last_login}</StyledTableCell>
                                    </StyledTableRow>
                                    <StyledTableCell style={{ padding: 0, boxSizing: 'border-box' }} colSpan={7}>
                                        <Collapse in={isItemOpen} timeout="auto" unmountOnExit>
                                            <Box>
                                                <ViewUser row={row} location={location} groups={groups} userGroups={groupUsers} rowUser={rowUser} setOpen={hadleEditUser}/>
                                            </Box>
                                        </Collapse>
                                    </StyledTableCell>
                                </React.Fragment>
                            );
                        })}
                        </TableBody>
                    </Table>
                </TableContainer>
                {user?.admin &&
                    <Stack direction={'row'} sx={{alignItems:'center', marginLeft:'30px', bottom:10, marginBottom:'-50px'}} spacing={2} zIndex={1}>
                        <Typography sx={{whiteSpace:'nowrap'}}>I Want To </Typography>
                        <ShortSelect value={action} items={['Activate', 'Deactivate', 'Remove']} label={"Action"} variant={'outlined'} onChange={(e) => setAction(e)} width={'120px'} disabled={(selected?.length == 0)}/>
                        <Typography sx={{whiteSpace:'nowrap'}}>Selected</Typography>
                        <Button onClick={handleSubmit} variant='outlined' sx={{background:selected?.length == 0 ? '' : 'rgba(0,200,0,.3)', ':hover':{background:'rgba(0,200,0,.5)'}}}>Submit</Button>
                    </Stack>
                }
                <TablePagination
                    sx={{overflow:'hidden'}}
                    component="div"
                    count={filteredUsers.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </Paper>
        </Box>
    );
}
