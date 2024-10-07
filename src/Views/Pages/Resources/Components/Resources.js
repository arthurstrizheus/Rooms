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
} from "@mui/material";
import AddIcon from "@mui/icons-material/AddOutlined";
import AddNewResource from "./AddNewResource";
import {
  GetLocations,
  GetResources,
  showError,
  showSuccess,
} from "../../../../Utilites/Functions/ApiFunctions";
import DeleteIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { DeleteResource } from "../../../../Utilites/Functions/ApiFunctions/ResourceFunctions";

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

function createData(id, name, location) {
  return { id, name, location };
}

export default function Resources({ setLoading }) {
  const theme = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filterLocation, setFilterLocation] = useState();
  const [paginatedRows, setPaginatedRows] = useState([]);
  const [filteredResources, setFilteredResources] = useState([]);
  const [locations, setLocations] = useState([]);
  const [resources, setResources] = useState([]);
  const [selected, setSelected] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [update, setUpdate] = useState(0);

  const handleDeleteSelected = () => {
    const remove = async () => {
      const promises = filteredResources?.map(async (itm) =>
        isSelected(itm.id) ? await DeleteResource(itm.id) : null
      );
      await Promise.all(promises).then((resp) =>
        resp ? showSuccess("Items Deleted") : showError("Failed to delete")
      );
      setSelected([]);
      setUpdate((prev) => prev + 1);
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

      const lcs = await GetLocations();
      const rss = await GetResources();

      setResources(rss);
      setLocations(lcs);
      if (filterLocation?.officeid) {
        setFilterLocation(
          lcs?.find((lc) => lc.officeid == filterLocation.officeid)
        );
      } else {
        setFilterLocation(lcs?.find((lc) => lc.officeid == user?.location));
      }

      setLoading(false);
    };
    getData();
  }, [update]);

  useEffect(() => {
    let filteredResources = resources;
    if (filterLocation?.Alias && filterLocation.Alias !== "All") {
      filteredResources = resources.filter(
        (r) => r.location == filterLocation.officeid
      );
    } else if (filterLocation?.Alias !== "All") {
      filteredResources = resources.filter(
        (r) => r.location == filterLocation.officeid
      );
    }

    setFilteredResources(filteredResources);
    const data = filteredResources?.map((itm) => {
      return createData(itm.id, itm.name, itm.location);
    });

    setPaginatedRows(
      data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    );
  }, [filterLocation, resources]);

  return (
    <Box sx={{ height: "100%", width: "100%", display: "flex", flexGrow: 1 }}>
      <AddNewResource
        open={openDialog}
        setOpen={setOpenDialog}
        resources={filteredResources}
        location={filterLocation}
        setUpdate={setUpdate}
      />
      <Paper
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          overflow: "hidden",
        }}
      >
        <Tooltip title={"Add Item"}>
          <AddIcon
            sx={{
              position: "absolute",
              right: 40,
              zIndex: 2,
              top: 130,
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
                top: 130,
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
          sx={{ width: "200px", position: "absolute", right: 120, top: 122 }}
        >
          <FormControl variant="standard" sx={{ minWidth: 160, width: "100%" }}>
            <InputLabel id="demo-simple-select-standard-label">
              Filter By Location
            </InputLabel>
            <Select
              sx={{ width: "100%" }}
              labelId="demo-simple-select-standard-label"
              id="demo-simple-select-standard"
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
            >
              {locations?.map((itm, index) => (
                <MenuItem key={index} value={itm.officeid}>
                  {itm.Alias}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <TableContainer sx={{ flexGrow: 1, overflowY: "auto" }}>
          <Table sx={{ minWidth: 700 }} aria-label="customized table">
            <TableHead sx={{ position: "sticky", top: 0, zIndex: 1 }}>
              <TableRow>
                <StyledTableCell padding="checkbox">
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
                    inputProps={{ "aria-label": "select all meetings" }}
                  />
                </StyledTableCell>
                <StyledTableCell align="left">Resource Name</StyledTableCell>
                <StyledTableCell align="left">Location</StyledTableCell>
              </TableRow>
            </TableHead>
            <TableBody sx={{ backgroundColor: "white" }}>
              {paginatedRows?.map((row) => {
                const isItemSelected = isSelected(row.id);
                const location = locations?.find(
                  (lc) => lc.officeid == row.location
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
                          onClick={(event) => handleClick(event, row.id)}
                          checked={isItemSelected}
                          inputProps={{
                            "aria-labelledby": `enhanced-table-checkbox-${row.id}`,
                          }}
                        />
                      </StyledTableCell>
                      <StyledTableCell component="th" scope="row">
                        {row.name}
                      </StyledTableCell>
                      <StyledTableCell align="left">
                        {location.Alias}
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
