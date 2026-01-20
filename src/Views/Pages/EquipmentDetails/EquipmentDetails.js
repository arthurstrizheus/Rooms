import React, { useState, useEffect } from "react";
import {
    Box,
    Typography,
    Button,
    Grid,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Autocomplete,
    useMediaQuery,
    useTheme,
    Card,
    CardContent,
    Divider,
    Chip,
    IconButton,
} from "@mui/material";
import {
    Edit,
    Delete,
    CalendarMonth,
    UploadFile,
    Warning,
    NotificationsActive,
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../../Utilites/AuthContext";
import { useSocket } from "../../../Contexts/SocketContext";
import axios from "axios";
import ImageCarousel from "./Components/ImageCarousel";
import CalibrationInfoCard from "./Components/CalibrationInfoCard";
import FileListCard from "./Components/FileListCard";
import CalibrationHistoryCard from "./Components/CalibrationHistoryCard";
import CheckoutHistoryCard from "./Components/CheckoutHistoryCard";
import AlertsCard from "./Components/AlertsCard";
import EnlargedImageDialog from "./Components/EnlargedImageDialog";
import FileHistoryDialog from "./Components/FileHistoryDialog";

const EquipmentDetails = ({ setLoading, loading }) => {
    const { equipmentId } = useParams();
    const { user } = useAuth();
    const { socket } = useSocket();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    const [equipment, setEquipment] = useState(null);
    const [files, setFiles] = useState([]);
    const [calibrationHistory, setCalibrationHistory] = useState([]);
    const [checkoutHistory, setCheckoutHistory] = useState([]);
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [locations, setLocations] = useState([]);
    const [users, setUsers] = useState([]);
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
        last_calibration_date: "",
    });
    const [openUploadDialog, setOpenUploadDialog] = useState(false);
    const [uploadFormData, setUploadFormData] = useState({
        category: "other",
        description: "",
        calibration_date: "",
        file: null,
    });
    const [fileHistoryDialog, setFileHistoryDialog] = useState({
        open: false,
        title: "",
        files: [],
    });
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [enlargedImage, setEnlargedImage] = useState(null);
    const [openSubscribeDialog, setOpenSubscribeDialog] = useState(false);
    const [alertsRefresh, setAlertsRefresh] = useState(0);

    useEffect(() => {
        fetchEquipment();
        fetchFiles();
        fetchCalibrationHistory();
        fetchCheckoutHistory();
        fetchLocations();
        fetchUsers();
    }, [equipmentId]);

    // Socket listener for real-time updates
    useEffect(() => {
        if (!socket?.connected) return;

        const handleMessage = (payload) => {
            const { message, data } = payload;

            switch (message) {
                case "equipment_updated":
                    // Refresh equipment details if it's this equipment
                    if (data?.equipment?.id === parseInt(equipmentId)) {
                        fetchEquipment();
                    }
                    break;
                case "calibration_added":
                case "calibration_updated":
                case "calibration_deleted":
                    // Refresh calibration history if it belongs to this equipment
                    if (data?.equipment_id === parseInt(equipmentId)) {
                        fetchCalibrationHistory();
                    }
                    break;
                case "equipment_file_created":
                case "file_updated":
                case "file_deleted":
                    // Refresh files if they belong to this equipment
                    if (data?.equipment_id === parseInt(equipmentId)) {
                        fetchFiles();
                    }
                    break;
                case "checkout_created":
                case "checkout_updated":
                    // Refresh checkout history if it belongs to this equipment
                    if (
                        data?.equipment_id === parseInt(equipmentId) ||
                        data?.checkout?.equipment_id === parseInt(equipmentId)
                    ) {
                        fetchCheckoutHistory();
                    }
                    break;
                default:
                    break;
            }
        };

        socket.on("message", handleMessage);
        return () => socket.off("message", handleMessage);
    }, [socket, equipmentId]);

    useEffect(() => {
        const imageFiles = files
            .filter(
                (f) =>
                    f.file_type === "photo" ||
                    f.file_name?.match(/\.(jpg|jpeg|png|gif)$/i)
            )
            .sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date));

        const handleKeyDown = (e) => {
            if (imageFiles.length === 0) return;

            if (e.key === "ArrowLeft") {
                e.preventDefault();
                setCurrentImageIndex((prev) =>
                    prev === 0 ? imageFiles.length - 1 : prev - 1
                );
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                setCurrentImageIndex((prev) =>
                    prev === imageFiles.length - 1 ? 0 : prev + 1
                );
            } else if (e.key === "Escape" && enlargedImage) {
                setEnlargedImage(null);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [files, enlargedImage]);

    const fetchEquipment = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("authToken");
            const response = await axios.get(`/api/equipment/${equipmentId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setEquipment(response.data);
        } catch (error) {
            console.error("Error fetching equipment:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFiles = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.get(
                `/api/equipment/${equipmentId}/files`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setFiles(response.data);
        } catch (error) {
            console.error("Error fetching files:", error);
        }
    };

    const fetchCalibrationHistory = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.get(
                `/api/calibrations/equipment/${equipmentId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setCalibrationHistory(response.data);
        } catch (error) {
            console.error("Error fetching calibration history:", error);
        }
    };

    const fetchCheckoutHistory = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.get(
                `/api/checkouts/equipment/${equipmentId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setCheckoutHistory(response.data);
        } catch (error) {
            console.error("Error fetching checkout history:", error);
        }
    };

    const fetchLocations = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.get(`/api/locations`, {
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
            const response = await axios.get(`/api/users`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUsers(response.data);
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    const handleOpenEditDialog = () => {
        setFormData({
            name: equipment.name,
            description: equipment.description || "",
            serial_number: equipment.serial_number || "",
            location: equipment.location || "",
            contact_person: equipment.contact_person || "",
            status: equipment.status,
            requires_approval: equipment.requires_approval,
            calibration_due_date: equipment.calibration_due_date || "",
            calibration_interval_days:
                equipment.calibration_interval_days || "",
            last_calibration_date: equipment.last_calibration_date || "",
        });
        setOpenEditDialog(true);
    };

    const handleCloseEditDialog = () => {
        setOpenEditDialog(false);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === "checkbox" ? checked : value,
        });
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("authToken");
            await axios.put(`/api/equipment/${equipmentId}`, formData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            handleCloseEditDialog();
            fetchEquipment();
        } catch (error) {
            console.error("Error updating equipment:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (
            !window.confirm(
                "Are you sure you want to delete this equipment? This will also delete all associated checkouts, files, and calibration records."
            )
        ) {
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem("authToken");
            await axios.delete(`/api/equipment/${equipmentId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            navigate("/equipment");
        } catch (error) {
            console.error("Error deleting equipment:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenUploadDialog = () => {
        setOpenUploadDialog(true);
    };

    const handleCloseUploadDialog = () => {
        setOpenUploadDialog(false);
        setUploadFormData({
            category: "other",
            description: "",
            calibration_date: "",
            file: null,
        });
    };

    const handleFileChange = (e) => {
        setUploadFormData({
            ...uploadFormData,
            file: e.target.files[0],
        });
    };

    const handleUploadInputChange = (e) => {
        setUploadFormData({
            ...uploadFormData,
            [e.target.name]: e.target.value,
        });
    };

    const handleFileUpload = async () => {
        if (!uploadFormData.file) {
            alert("Please select a file");
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem("authToken");
            const formData = new FormData();
            formData.append("file", uploadFormData.file);
            formData.append("equipment_id", equipmentId);
            formData.append("category", uploadFormData.category);
            formData.append("description", uploadFormData.description);
            formData.append("uploaded_by_user_id", user.id);
            if (
                uploadFormData.category === "calibration_cert" &&
                uploadFormData.calibration_date
            ) {
                formData.append(
                    "calibration_date",
                    uploadFormData.calibration_date
                );
            }

            await axios.post("/api/equipment-files", formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data",
                },
            });

            handleCloseUploadDialog();
            await fetchFiles();
            await fetchEquipment();
        } catch (error) {
            console.error("Error uploading file:", error);
            alert("Error uploading file");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteFile = async (fileId) => {
        if (!window.confirm("Are you sure you want to delete this file?")) {
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem("authToken");
            await axios.delete(`/api/equipment-files/${fileId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            await fetchFiles();
            await fetchEquipment();
        } catch (error) {
            console.error("Error deleting file:", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "available":
                return "success";
            case "checked_out":
                return "info";
            case "maintenance":
                return "warning";
            case "retired":
                return "default";
            default:
                return "default";
        }
    };

    const getCheckoutStatusColor = (status) => {
        switch (status) {
            case "pending":
                return "warning";
            case "approved":
                return "success";
            case "checked_out":
                return "info";
            case "returned":
                return "default";
            case "cancelled":
                return "error";
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

    const canEditDelete = () => {
        if (!equipment) return false;
        if (user?.admin) return true;
        if (
            user?.equipment_office_admin &&
            equipment.location === user.location
        ) {
            return true;
        }
        return false;
    };

    const imageFiles = files
        .filter(
            (f) =>
                // Only include files explicitly categorized as photo, or files with no category that are images
                (f.category === "photo" || !f.category) &&
                (f.file_type?.includes("image/") ||
                    f.file_name?.match(/\.(jpg|jpeg|png|gif)$/i))
        )
        .sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date));
    const manualFiles = files
        .filter((f) => f.category === "manual")
        .sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date));
    const certFiles = files
        .filter((f) => f.category === "calibration_cert")
        .sort((a, b) => {
            // Sort by calibration_date if available, otherwise by upload_date
            const dateA = a.calibration_date
                ? new Date(a.calibration_date)
                : new Date(a.upload_date);
            const dateB = b.calibration_date
                ? new Date(b.calibration_date)
                : new Date(b.upload_date);
            return dateB - dateA;
        });
    const otherFiles = files
        .filter((f) => {
            // Include files with category "other" or no category, but exclude images without category (they go to carousel)
            if (f.category === "other") return true;
            if (!f.category) {
                // Only include if it's NOT an image
                const isImage =
                    f.file_type?.includes("image/") ||
                    f.file_name?.match(/\.(jpg|jpeg|png|gif)$/i);
                return !isImage;
            }
            return false;
        })
        .sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date));

    if (!equipment) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography>Loading...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 3,
                    flexDirection: isMobile ? "column" : "row",
                    gap: 2,
                }}
            >
                <Typography variant="h4">{equipment.name}</Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Button
                        variant="outlined"
                        startIcon={<NotificationsActive />}
                        onClick={() => setOpenSubscribeDialog(true)}
                        color="primary"
                    >
                        Subscribe to Alerts
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<CalendarMonth />}
                        onClick={() =>
                            navigate(`/equipment/calendar/${equipmentId}`)
                        }
                    >
                        Calendar
                    </Button>
                    {canEditDelete() && (
                        <Button
                            variant="outlined"
                            startIcon={<UploadFile />}
                            onClick={handleOpenUploadDialog}
                        >
                            Upload File
                        </Button>
                    )}
                    {canEditDelete() && (
                        <>
                            <Button
                                variant="outlined"
                                startIcon={<Edit />}
                                onClick={handleOpenEditDialog}
                            >
                                Edit
                            </Button>
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<Delete />}
                                onClick={handleDelete}
                            >
                                Delete
                            </Button>
                        </>
                    )}
                </Box>
            </Box>

            {/* Equipment Details */}
            <Grid container spacing={3}>
                {/* Equipment Info with Images */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Equipment Information
                            </Typography>
                            <Divider />

                            {/* Image Carousel */}
                            <ImageCarousel
                                imageFiles={imageFiles}
                                currentImageIndex={currentImageIndex}
                                setCurrentImageIndex={setCurrentImageIndex}
                                setEnlargedImage={setEnlargedImage}
                                canEditDelete={canEditDelete}
                                handleDeleteFile={handleDeleteFile}
                            />

                            {/* Equipment Info Grid */}
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                    >
                                        Status
                                    </Typography>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            gap: 1,
                                            alignItems: "center",
                                            mt: 0.5,
                                        }}
                                    >
                                        <Chip
                                            label={equipment.status}
                                            color={getStatusColor(
                                                equipment.status
                                            )}
                                            size="small"
                                        />
                                        {isCalibrationDueSoon(
                                            equipment.calibration_due_date
                                        ) && (
                                            <Chip
                                                icon={<Warning />}
                                                label="Calibration Due Soon"
                                                color="warning"
                                                size="small"
                                            />
                                        )}
                                    </Box>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                    >
                                        Serial Number
                                    </Typography>
                                    <Typography
                                        variant="body1"
                                        sx={{ mt: 0.5 }}
                                    >
                                        {equipment.serial_number || "N/A"}
                                    </Typography>
                                </Grid>

                                <Grid item xs={12}>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                    >
                                        Description
                                    </Typography>
                                    <Typography
                                        variant="body1"
                                        sx={{ mt: 0.5 }}
                                    >
                                        {equipment.description || "N/A"}
                                    </Typography>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                    >
                                        Location
                                    </Typography>
                                    <Typography
                                        variant="body1"
                                        sx={{ mt: 0.5 }}
                                    >
                                        {equipment.location || "N/A"}
                                    </Typography>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                    >
                                        Contact Person
                                    </Typography>
                                    <Typography
                                        variant="body1"
                                        sx={{ mt: 0.5 }}
                                    >
                                        {equipment.contact_person || "N/A"}
                                    </Typography>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                    >
                                        Requires Approval
                                    </Typography>
                                    <Typography
                                        variant="body1"
                                        sx={{ mt: 0.5 }}
                                    >
                                        {equipment.requires_approval
                                            ? "Yes"
                                            : "No"}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Calibration Info */}
                <Grid item xs={12} md={6}>
                    <CalibrationInfoCard
                        equipment={equipment}
                        manualFiles={manualFiles}
                        certFiles={certFiles}
                        otherFiles={otherFiles}
                        canEditDelete={canEditDelete}
                        handleDeleteFile={handleDeleteFile}
                        onViewHistory={(title, files) =>
                            setFileHistoryDialog({
                                open: true,
                                title,
                                files,
                            })
                        }
                    />
                </Grid>

                {/* Checkout History */}
                <Grid item xs={12}>
                    <CheckoutHistoryCard
                        checkoutHistory={checkoutHistory}
                        getCheckoutStatusColor={getCheckoutStatusColor}
                    />
                </Grid>

                {/* Alert Subscriptions */}
                <Grid item xs={12}>
                    <AlertsCard
                        equipmentId={equipmentId}
                        openDialog={openSubscribeDialog}
                        setOpenDialog={setOpenSubscribeDialog}
                        onSubscribeSuccess={() =>
                            setAlertsRefresh((prev) => prev + 1)
                        }
                    />
                </Grid>
            </Grid>

            {/* Edit Dialog */}
            <Dialog
                open={openEditDialog}
                onClose={handleCloseEditDialog}
                maxWidth="md"
                fullWidth
                fullScreen={isMobile}
            >
                <DialogTitle>Edit Equipment</DialogTitle>
                <DialogContent>
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                            pt: 1,
                        }}
                    >
                        <TextField
                            name="name"
                            label="Name"
                            value={formData.name}
                            onChange={handleInputChange}
                            fullWidth
                            required
                        />
                        <TextField
                            name="description"
                            label="Description"
                            value={formData.description}
                            onChange={handleInputChange}
                            fullWidth
                            multiline
                            rows={3}
                        />
                        <TextField
                            name="serial_number"
                            label="Serial Number"
                            value={formData.serial_number}
                            onChange={handleInputChange}
                            fullWidth
                        />
                        <TextField
                            name="location"
                            label="Location"
                            value={formData.location}
                            onChange={handleInputChange}
                            select
                            fullWidth
                        >
                            {locations.map((loc) => (
                                <MenuItem
                                    key={`location-${loc.id}`}
                                    value={loc.Alias}
                                >
                                    {loc.Alias} - {loc.City}, {loc.state}
                                </MenuItem>
                            ))}
                        </TextField>
                        <Autocomplete
                            options={users}
                            getOptionLabel={(option) =>
                                `${option.first_name} ${option.last_name}`
                            }
                            value={
                                users.find((u) =>
                                    formData.contact_person.includes(
                                        u.first_name
                                    )
                                ) || null
                            }
                            onChange={(e, newValue) => {
                                setFormData({
                                    ...formData,
                                    contact_person: newValue
                                        ? `${newValue.first_name} ${newValue.last_name}`
                                        : "",
                                });
                            }}
                            renderInput={(params) => (
                                <TextField {...params} label="Contact Person" />
                            )}
                            ListboxProps={{
                                style: { maxHeight: "250px" },
                            }}
                        />
                        <TextField
                            name="status"
                            label="Status"
                            value={formData.status}
                            onChange={handleInputChange}
                            select
                            fullWidth
                        >
                            <MenuItem key="status-available" value="available">
                                Available
                            </MenuItem>
                            <MenuItem
                                key="status-checked_out"
                                value="checked_out"
                            >
                                Checked Out
                            </MenuItem>
                            <MenuItem
                                key="status-maintenance"
                                value="maintenance"
                            >
                                Maintenance
                            </MenuItem>
                            <MenuItem key="status-retired" value="retired">
                                Retired
                            </MenuItem>
                        </TextField>
                        <TextField
                            name="requires_approval"
                            label="Requires Approval"
                            value={formData.requires_approval}
                            onChange={handleInputChange}
                            select
                            fullWidth
                        >
                            <MenuItem key="approval-true" value={true}>
                                Yes
                            </MenuItem>
                            <MenuItem key="approval-false" value={false}>
                                No
                            </MenuItem>
                        </TextField>
                        <TextField
                            name="last_calibration_date"
                            label="Last Calibration Date"
                            type="date"
                            value={formData.last_calibration_date}
                            onChange={handleInputChange}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            name="calibration_due_date"
                            label="Calibration Due Date"
                            type="date"
                            value={formData.calibration_due_date}
                            onChange={handleInputChange}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            name="calibration_interval_days"
                            label="Calibration Interval (days)"
                            type="number"
                            value={formData.calibration_interval_days}
                            onChange={handleInputChange}
                            fullWidth
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseEditDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Upload Dialog */}
            <Dialog
                open={openUploadDialog}
                onClose={handleCloseUploadDialog}
                maxWidth="sm"
                fullWidth
                fullScreen={isMobile}
            >
                <DialogTitle>Upload File</DialogTitle>
                <DialogContent>
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                            pt: 1,
                        }}
                    >
                        <TextField
                            name="category"
                            label="File Category"
                            value={uploadFormData.category}
                            onChange={handleUploadInputChange}
                            select
                            fullWidth
                            required
                        >
                            <MenuItem key="category-photo" value="photo">
                                Photo
                            </MenuItem>
                            <MenuItem key="category-manual" value="manual">
                                Manual
                            </MenuItem>
                            <MenuItem
                                key="category-calibration_cert"
                                value="calibration_cert"
                            >
                                Calibration Certificate
                            </MenuItem>
                            <MenuItem key="category-other" value="other">
                                Other
                            </MenuItem>
                        </TextField>

                        <TextField
                            name="description"
                            label="Description"
                            value={uploadFormData.description}
                            onChange={handleUploadInputChange}
                            fullWidth
                            multiline
                            rows={2}
                        />

                        {uploadFormData.category === "calibration_cert" && (
                            <TextField
                                name="calibration_date"
                                label="Calibration Date"
                                type="date"
                                value={uploadFormData.calibration_date}
                                onChange={handleUploadInputChange}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                        )}

                        <Button variant="outlined" component="label" fullWidth>
                            {uploadFormData.file
                                ? uploadFormData.file.name
                                : "Select File"}
                            <input
                                type="file"
                                hidden
                                onChange={handleFileChange}
                                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                            />
                        </Button>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseUploadDialog}>Cancel</Button>
                    <Button
                        onClick={handleFileUpload}
                        variant="contained"
                        disabled={!uploadFormData.file}
                    >
                        Upload
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Enlarged Image Dialog */}
            <EnlargedImageDialog
                enlargedImage={enlargedImage}
                setEnlargedImage={setEnlargedImage}
                imageFiles={imageFiles}
                currentImageIndex={currentImageIndex}
                setCurrentImageIndex={setCurrentImageIndex}
            />

            {/* File History Dialog */}
            <FileHistoryDialog
                open={fileHistoryDialog.open}
                onClose={() =>
                    setFileHistoryDialog({ open: false, title: "", files: [] })
                }
                title={fileHistoryDialog.title}
                files={fileHistoryDialog.files}
                canEditDelete={canEditDelete}
                handleDeleteFile={handleDeleteFile}
            />
        </Box>
    );
};

export default EquipmentDetails;
