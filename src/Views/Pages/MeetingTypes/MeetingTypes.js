import React, {useState, useEffect} from 'react';
import { styled } from '@mui/material/styles';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import { useTheme } from '@emotion/react';
import { Box, Tooltip, TableContainer, Table, TableHead, TableBody, TablePagination, Paper, Checkbox, TableSortLabel } from "@mui/material";
import AddNewType from './Components/AddNewType';
import AddIcon from '@mui/icons-material/AddOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { GetTypes } from '../../../Utilites/Functions/ApiFunctions';
import { DeleteMeetingType } from '../../../Utilites/Functions/ApiFunctions/MeetingTypeFunctions';

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

function createData(id, value, color) {
    return { id, value, color };
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

export default function MeetingTypes({setLoading}) {
    const theme = useTheme();
    const [order, setOrder] = useState('asc');
    const [orderBy, setOrderBy] = useState('name');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [selected, setSelected] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [types, setTypes] = useState([]);
    const [paginatedRows, setPaginatedRows] = useState([]);
    const [update, setUpdate] = useState(0);

    const handleDeleteSelected = () => {
        const remove = async () => {
            const promises = types.map(async itm => isSelected(itm.id) ? await DeleteMeetingType(itm.id) : null);
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
            const newSelecteds = types.map((n) => n.id);
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
            const typs = await GetTypes();

            setTypes(typs);
            setLoading(false);
        }
        getData();
    },[update]);

    useEffect(() => {
        const data = types.map(itm => {
            return createData(
                itm.id,
                itm.value,
                itm.color
            );
        });
    
        const sortedRows = stableSort(data, getComparator(order, orderBy));
        setPaginatedRows(sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage));
    },[types]);

    return (
        <React.Fragment>
            <AddNewType open={openDialog} setOpen={setOpenDialog} setUpdate={setUpdate}/>
            <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow:'hidden' }}>
                <Tooltip title={'Add Item'}>
                    <AddIcon sx={{position:'absolute', right:70, zIndex:2, top:135, color:'darkgreen', cursor:'pointer', ':hover':{color:'green'}, height:'30px', width:'30px'}} onClick={setOpenDialog}/>
                </Tooltip>
                {selected?.length > 0 &&
                <Tooltip title={'Delete Selected'}>
                    <DeleteIcon sx={{position:'absolute', right:100, zIndex:2, top:135, color:'red', cursor:'pointer', ':hover':{color:'darkred'}, height:'30px', width:'30px'}} onClick={handleDeleteSelected}/>
                </Tooltip>
                }             
                <TableContainer sx={{ flexGrow: 1, overflowY: 'auto' }}>
                    <Table sx={{ minWidth: 700 }} aria-label="customized table">
                        <TableHead sx={{position: 'sticky', top: 0, zIndex: 1}}>
                            <TableRow>
                                <StyledTableCell padding="checkbox">
                                <Checkbox
                                    indeterminate={selected.length > 0 && selected.length < types.length}
                                    checked={types.length > 0 && selected.length === types.length}
                                    onChange={handleSelectAllClick}
                                    inputProps={{ 'aria-label': 'select all meetings' }}
                                />
                                </StyledTableCell>
                                <StyledTableCell align="left">
                                    <TableSortLabel
                                        active={orderBy === 'value'}
                                        direction={orderBy === 'value' ? order : 'asc'}
                                        onClick={(event) => handleRequestSort(event, 'value')}
                                    >
                                        Type
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell align="left">
                                    <TableSortLabel
                                        active={orderBy === 'color'}
                                        direction={orderBy === 'color' ? order : 'asc'}
                                        onClick={(event) => handleRequestSort(event, 'color')}
                                    >
                                        Color
                                    </TableSortLabel>
                                </StyledTableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody sx={{backgroundColor:'white'}}>
                        {paginatedRows.map((row) => {
                            const isItemSelected = isSelected(row.id);
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
                                <StyledTableCell component="th" scope="row">{row.value}</StyledTableCell>
                                <StyledTableCell align="left"><Box sx={{width:'60px', height:'20px', border:'1px solid black', background:row.color}}/></StyledTableCell>
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
                        count={types.length}
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
