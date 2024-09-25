import React, {useEffect, useState} from 'react';
import { styled } from '@mui/material/styles';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import { useTheme } from '@emotion/react';
import { Paper, TableContainer, TableHead, TableSortLabel, Table, TableBody, Typography, TablePagination } from '@mui/material';
import { GetLocations } from '../../../Utilites/Functions/ApiFunctions';

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
    '&:last-child td, &:last-child th': {
        border: 0,
    },
    }));

function createData(id, city, number, saddress, state, zip, airport, alias) {
    return { id, city, number, saddress, state, zip, airport, alias };
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

export default function Locations() {
    const theme = useTheme();
    const [order, setOrder] = useState('asc');
    const [orderBy, setOrderBy] = useState('name');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [locations, setLocations] = useState([]);
    const [paginatedRows, setPaginatedRows] = useState([]);


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
    
    useEffect(() => {
        GetLocations().then(resp => {
            const data = resp?.map(itm => {
                return createData(
                    itm.officeid,
                    itm.City,
                    itm.Number,
                    itm.SAddress,
                    itm.state,
                    itm.Zip,
                    itm.Airport,
                    itm.Alias
                );
            });
            setLocations(resp);
            const sortedRows = stableSort(data, getComparator(order, orderBy));
            setPaginatedRows(sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage));
        });
    },[]);

    

    return (
        <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column',  }}>
            <TableContainer sx={{ flexGrow: 1}}>
                <Table sx={{ minWidth: 700 }} aria-label="customized table">
                    <TableHead sx={{position: 'sticky', top: 0, zIndex: 1}}>
                        <TableRow>
                            <StyledTableCell align="left">
                            <TableSortLabel
                                active={orderBy === 'alias'}
                                direction={orderBy === 'alias' ? order : 'asc'}
                                onClick={(event) => handleRequestSort(event, 'alias')}
                            >
                                Alias
                            </TableSortLabel>
                            </StyledTableCell>
                            <StyledTableCell align="left">
                            <TableSortLabel
                                active={orderBy === 'city'}
                                direction={orderBy === 'city' ? order : 'asc'}
                                onClick={(event) => handleRequestSort(event, 'city')}
                            >
                                City
                            </TableSortLabel>
                            </StyledTableCell>
                            <StyledTableCell align="left">
                            <TableSortLabel
                                active={orderBy === 'state'}
                                direction={orderBy === 'state' ? order : 'asc'}
                                onClick={(event) => handleRequestSort(event, 'state')}
                            >
                                State
                            </TableSortLabel>
                            </StyledTableCell>
                            <StyledTableCell align="left">
                            <TableSortLabel
                                active={orderBy === 'zip'}
                                direction={orderBy === 'zip' ? order : 'asc'}
                                onClick={(event) => handleRequestSort(event, 'zip')}
                            >
                                Zip
                            </TableSortLabel>
                            </StyledTableCell>
                            <StyledTableCell align="left">
                            <TableSortLabel
                                active={orderBy === 'address'}
                                direction={orderBy === 'address' ? order : 'asc'}
                                onClick={(event) => handleRequestSort(event, 'address')}
                            >
                                Address
                            </TableSortLabel>
                            </StyledTableCell>
                            <StyledTableCell align="left">
                            <TableSortLabel
                                active={orderBy === 'airport'}
                                direction={orderBy === 'airport' ? order : 'asc'}
                                onClick={(event) => handleRequestSort(event, 'airport')}
                            >
                                Airport
                            </TableSortLabel>
                            </StyledTableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody sx={{backgroundColor:'white'}}>
                    {paginatedRows?.map((row) => {
                        return (

                            <StyledTableRow
                                key={row.id}
                                hover
                                role="checkbox"
                                tabIndex={-1}
                            >
                                <StyledTableCell component="th" scope="row"><Typography  align="left">{row.alias}</Typography></StyledTableCell>
                                <StyledTableCell align="left">{row.city}</StyledTableCell>
                                <StyledTableCell align="left">{row.state}</StyledTableCell>
                                <StyledTableCell align="left">{row.zip}</StyledTableCell>
                                <StyledTableCell align="left">{row.saddress}</StyledTableCell>
                                <StyledTableCell align="left">{row.airport}</StyledTableCell>
                            </StyledTableRow>
                        );
                    })}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                component="div"
                count={locations.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            />
        </Paper>
    );
}
