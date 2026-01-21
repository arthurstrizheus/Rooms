import React, { useState, useEffect } from "react";
import {
    Box,
    Card,
    CardContent,
    CardMedia,
    Grid,
    Typography,
    Button,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Autocomplete,
    useMediaQuery,
    useTheme,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    InputAdornment,
} from "@mui/material";
import {
    Add,
    CalendarMonth,
    Warning,
    Search,
    Visibility,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../Utilites/AuthContext";
import { useSocket } from "../../../Contexts/SocketContext";
import ConfirmDialog from "../../../Components/ConfirmDialog";
import useConfirmDialog from "../../../hooks/useConfirmDialog";
import axios from "axios";

const Equipment = ({ setLoading, loading }) => {
    const [equipment, setEquipment] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedEquipment, setSelectedEquipment] = useState(null);
    const [locations, setLocations] = useState([]);
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        serial_number: "",
        location: "",
        contact_person: "",
        status: "available",
        requires_approval: false,
        calibration_due_date: "",
        calibration_interval_days: "",
    });
    const navigate = useNavigate();
    const { user } = useAuth();
    const { socket } = useSocket();
    const { showConfirm, confirmState, hideConfirm } = useConfirmDialog();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

    useEffect(() => {
        fetchEquipment();
        fetchLocations();
        fetchUsers();
    }, []);

    // Socket listener for real-time equipment updates
    useEffect(() => {
        if (!socket?.connected) return;

        const handleMessage = (payload) => {
            const { message, data } = payload;

            switch (message) {
                case "equipment_added":
                case "equipment_updated":
                case "equipment_deleted":
                    // Refresh equipment list on any equipment change
                    fetchEquipment();
                    break;
                default:
                    break;
            }
        };

        socket.on("message", handleMessage);
        return () => socket.off("message", handleMessage);
    }, [socket]);

    const fetchLocations = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.get("/api/locations", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setLocations(response.data);
        } catch (error) {
            console.error("Error fetching locations:", error);
        }
    };

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.get("/api/users", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUsers(response.data);
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    const fetchEquipment = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("authToken");
            const response = await axios.get("/api/equipment", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setEquipment(response.data);
        } catch (error) {
            console.error("Error fetching equipment:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (item = null) => {
        if (item) {
            setSelectedEquipment(item);
            setFormData(item);
        } else {
            setSelectedEquipment(null);
            setFormData({
                name: "",
                description: "",
                serial_number: "",
                location: "",
                contact_person: "",
                status: "available",
                requires_approval: false,
                calibration_due_date: "",
                calibration_interval_days: "",
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedEquipment(null);
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("authToken");

            if (selectedEquipment) {
                await axios.put(
                    `/api/equipment/${selectedEquipment.id}`,
                    formData,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );
            } else {
                await axios.post("/api/equipment", formData, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            }

            fetchEquipment();
            handleCloseDialog();
        } catch (error) {
            console.error("Error saving equipment:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        showConfirm(
            "Are you sure you want to delete this equipment?",
            async () => {
                await deleteEquipment(id);
            },
            "warning",
            "Delete Equipment"
        );
    };

    const deleteEquipment = async (id) => {
        try {
            setLoading(true);
            const token = localStorage.getItem("authToken");
            await axios.delete(`/api/equipment/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            fetchEquipment();
        } catch (error) {
            console.error("Error deleting equipment:", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "available":
                return "success";
            case "checked_out":
                return "warning";
            case "maintenance":
                return "error";
            case "retired":
                return "default";
            default:
                return "default";
        }
    };

    const isCalibrationDueSoon = (dueDate) => {
        if (!dueDate) return false;
        const due = new Date(dueDate);
        const now = new Date();
        const daysUntilDue = Math.floor((due - now) / (1000 * 60 * 60 * 24));
        return daysUntilDue <= 30 && daysUntilDue >= 0;
    };

    const filteredEquipment = equipment.filter((item) => {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
            item.name?.toLowerCase().includes(search) ||
            item.serial_number?.toLowerCase().includes(search) ||
            item.location?.toLowerCase().includes(search) ||
            item.status?.toLowerCase().includes(search) ||
            item.contact_person?.toLowerCase().includes(search) ||
            item.description?.toLowerCase().includes(search);
        const matchesStatus =
            statusFilter === "all" || item.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <Box
            sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    mb: 3,
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        gap: 2,
                        flexDirection: isMobile ? "column" : "row",
                    }}
                >
                    <TextField
                        placeholder="Search equipment..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        size="small"
                        sx={{ flex: isMobile ? "1" : "0 0 300px" }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search />
                                </InputAdornment>
                            ),
                        }}
                    />
                    <TextField
                        select
                        label="Status"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        size="small"
                        sx={{ flex: isMobile ? "1" : "0 0 150px" }}
                    >
                        <MenuItem value="all">All Status</MenuItem>
                        <MenuItem value="available">Available</MenuItem>
                        <MenuItem value="checked_out">Checked Out</MenuItem>
                        <MenuItem value="maintenance">Maintenance</MenuItem>
                        <MenuItem value="retired">Retired</MenuItem>
                    </TextField>
                    {(user?.admin ||
                        user?.equipment_admin ||
                        user?.equipment_office_admin) && (
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => handleOpenDialog()}
                            sx={{ minWidth: isMobile ? "100%" : "auto" }}
                        >
                            Add Equipment
                        </Button>
                    )}
                </Box>
            </Box>

            {isMobile ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {filteredEquipment.length === 0 ? (
                        <Paper sx={{ p: 3, textAlign: "center" }}>
                            <Typography color="text.secondary">
                                {searchTerm || statusFilter !== "all"
                                    ? "No equipment found matching your search"
                                    : "No equipment available"}
                            </Typography>
                        </Paper>
                    ) : (
                        filteredEquipment.map((item) => (
                            <Card
                                key={item.id}
                                sx={{ cursor: "pointer" }}
                                onClick={() =>
                                    navigate(`/equipment/${item.id}`)
                                }
                            >
                                <CardContent
                                    sx={{ p: 2, "&:last-child": { pb: 2 } }}
                                >
                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "start",
                                            mb: 1,
                                        }}
                                    >
                                        <Box sx={{ flex: 1 }}>
                                            <Typography
                                                variant="subtitle1"
                                                fontWeight="bold"
                                            >
                                                {item.name}
                                            </Typography>
                                            {item.serial_number && (
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    display="block"
                                                >
                                                    SN: {item.serial_number}
                                                </Typography>
                                            )}
                                        </Box>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                gap: 0.5,
                                                alignItems: "center",
                                            }}
                                        >
                                            {isCalibrationDueSoon(
                                                item.calibration_due_date
                                            ) && (
                                                <Warning
                                                    color="warning"
                                                    fontSize="small"
                                                />
                                            )}
                                            <Chip
                                                label={item.status}
                                                color={getStatusColor(
                                                    item.status
                                                )}
                                                size="small"
                                            />
                                        </Box>
                                    </Box>
                                    <Box
                                        sx={{ display: "flex", gap: 2, mb: 1 }}
                                    >
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{ flex: 1 }}
                                        >
                                            📍 {item.location || "N/A"}
                                        </Typography>
                                        {item.contact_person && (
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ flex: 1 }}
                                            >
                                                👤 {item.contact_person}
                                            </Typography>
                                        )}
                                    </Box>
                                    <Box
                                        sx={{ display: "flex", gap: 1, mt: 2 }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<Visibility />}
                                            onClick={() =>
                                                navigate(
                                                    `/equipment/${item.id}`
                                                )
                                            }
                                            fullWidth
                                        >
                                            Details
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<CalendarMonth />}
                                            onClick={() =>
                                                navigate(
                                                    `/equipment/calendar/${item.id}`
                                                )
                                            }
                                            fullWidth
                                        >
                                            Calendar
                                        </Button>
                                    </Box>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </Box>
            ) : (
                <Paper
                    sx={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                    }}
                >
                    <TableContainer sx={{ flex: 1, overflow: "auto" }}>
                        <Table stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    {!isMobile && (
                                        <TableCell>Serial Number</TableCell>
                                    )}
                                    <TableCell>Location</TableCell>
                                    {!isMobile && (
                                        <TableCell>Contact</TableCell>
                                    )}
                                    <TableCell>Status</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredEquipment.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={isMobile ? 4 : 6}
                                            align="center"
                                        >
                                            <Typography color="text.secondary">
                                                {searchTerm ||
                                                statusFilter !== "all"
                                                    ? "No equipment found matching your search"
                                                    : "No equipment available"}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredEquipment.map((item) => (
                                        <TableRow
                                            key={item.id}
                                            hover
                                            onClick={() =>
                                                navigate(
                                                    `/equipment/${item.id}`
                                                )
                                            }
                                            sx={{ cursor: "pointer" }}
                                        >
                                            <TableCell>
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 1,
                                                    }}
                                                >
                                                    {item.name}
                                                    {isCalibrationDueSoon(
                                                        item.calibration_due_date
                                                    ) && (
                                                        <Warning
                                                            color="warning"
                                                            fontSize="small"
                                                        />
                                                    )}
                                                </Box>
                                            </TableCell>
                                            {!isMobile && (
                                                <TableCell>
                                                    {item.serial_number ||
                                                        "N/A"}
                                                </TableCell>
                                            )}
                                            <TableCell>
                                                {item.location || "N/A"}
                                            </TableCell>
                                            {!isMobile && (
                                                <TableCell>
                                                    {item.contact_person ||
                                                        "N/A"}
                                                </TableCell>
                                            )}
                                            <TableCell>
                                                <Chip
                                                    label={item.status}
                                                    color={getStatusColor(
                                                        item.status
                                                    )}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        gap: 1,
                                                        justifyContent:
                                                            "flex-end",
                                                    }}
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                >
                                                    <IconButton
                                                        size="small"
                                                        onClick={() =>
                                                            navigate(
                                                                `/equipment/${item.id}`
                                                            )
                                                        }
                                                        title="View Details"
                                                    >
                                                        <Visibility />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() =>
                                                            navigate(
                                                                `/equipment/calendar/${item.id}`
                                                            )
                                                        }
                                                        title="Calendar"
                                                    >
                                                        <CalendarMonth />
                                                    </IconButton>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    {selectedEquipment ? "Edit Equipment" : "Add Equipment"}
                </DialogTitle>
                <DialogContent>
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                            mt: 1,
                        }}
                    >
                        <TextField
                            label="Name"
                            value={formData.name}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    name: e.target.value,
                                })
                            }
                            required
                            fullWidth
                        />
                        <TextField
                            label="Description"
                            value={formData.description}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    description: e.target.value,
                                })
                            }
                            multiline
                            rows={3}
                            fullWidth
                        />
                        <TextField
                            label="Serial Number"
                            value={formData.serial_number}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    serial_number: e.target.value,
                                })
                            }
                            fullWidth
                        />
                        <TextField
                            select
                            label="Location"
                            value={formData.location}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    location: e.target.value,
                                })
                            }
                            fullWidth
                        >
                            <MenuItem value="">
                                <em>None</em>
                            </MenuItem>
                            {locations.map((loc) => (
                                <MenuItem key={loc.officeid} value={loc.Alias}>
                                    {loc.Alias} - {loc.City}, {loc.state}
                                </MenuItem>
                            ))}
                        </TextField>
                        <Autocomplete
                            options={users}
                            getOptionLabel={(option) =>
                                typeof option === "string"
                                    ? option
                                    : `${option.first_name} ${option.last_name}`
                            }
                            value={
                                users.find(
                                    (u) =>
                                        `${u.first_name} ${u.last_name}` ===
                                        formData.contact_person
                                ) || null
                            }
                            onChange={(event, newValue) => {
                                setFormData({
                                    ...formData,
                                    contact_person: newValue
                                        ? `${newValue.first_name} ${newValue.last_name}`
                                        : "",
                                });
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Contact Person"
                                    fullWidth
                                />
                            )}
                            renderOption={(props, option) => (
                                <li {...props} key={option.id}>
                                    {option.first_name} {option.last_name} (
                                    {option.email})
                                </li>
                            )}
                            isOptionEqualToValue={(option, value) =>
                                option.id === value?.id
                            }
                            ListboxProps={{
                                style: { maxHeight: "250px" },
                            }}
                            fullWidth
                        />
                        <TextField
                            select
                            label="Status"
                            value={formData.status}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    status: e.target.value,
                                })
                            }
                            fullWidth
                        >
                            <MenuItem value="available">Available</MenuItem>
                            <MenuItem value="checked_out">Checked Out</MenuItem>
                            <MenuItem value="maintenance">Maintenance</MenuItem>
                            <MenuItem value="retired">Retired</MenuItem>
                        </TextField>
                        <TextField
                            select
                            label="Requires Approval"
                            value={formData.requires_approval}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    requires_approval:
                                        e.target.value === "true",
                                })
                            }
                            fullWidth
                        >
                            <MenuItem value={false}>No</MenuItem>
                            <MenuItem value={true}>Yes</MenuItem>
                        </TextField>
                        <TextField
                            label="Calibration Interval (days)"
                            type="number"
                            value={formData.calibration_interval_days}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    calibration_interval_days: e.target.value,
                                })
                            }
                            fullWidth
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained">
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
            <ConfirmDialog
                open={confirmState.open}
                onConfirm={confirmState.onConfirm}
                onCancel={hideConfirm}
                message={confirmState.message}
                title={confirmState.title}
                severity={confirmState.severity}
                confirmText={confirmState.confirmText}
                cancelText={confirmState.cancelText}
            />
        </Box>
    );
};

export default Equipment;
