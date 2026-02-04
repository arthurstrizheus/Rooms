import { useState, useEffect } from "react";
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
    Menu,
    Autocomplete,
    useMediaQuery,
    useTheme,
    Card,
    CardContent,
    Divider,
    Link,
} from "@mui/material";
import {
    Edit,
    Delete,
    CalendarMonth,
    UploadFile,
    NotificationsActive,
    CompareArrows,
    MoreVert,
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../../Utilites/AuthContext";
import { useSocket } from "../../../Contexts/SocketContext";
import axios from "axios";
import ImageCarousel from "./Components/ImageCarousel";
import CalibrationInfoCard from "./Components/CalibrationInfoCard";
import CheckoutHistoryCard from "./Components/CheckoutHistoryCard";
import AlertsCard from "./Components/AlertsCard";
import EnlargedImageDialog from "./Components/EnlargedImageDialog";
import FileHistoryDialog from "./Components/FileHistoryDialog";
import AlertDialog from "../../../Components/AlertDialog";
import useAlertDialog from "../../../hooks/useAlertDialog";
import ConfirmDialog from "../../../Components/ConfirmDialog";
import useConfirmDialog from "../../../hooks/useConfirmDialog";
import EquipmentDialog from "../Equipment/EquipmentDialog";
import ReservationDialog from "./Components/ReservationDialog";
import EquipmentInfoCard from "./Components/EquipmentInfoCard";
import EquipmentDetailsCard from "./Components/EquipmentDetailsCard";

const EquipmentDetails = ({ setLoading, loading }) => {
    const { equipmentId } = useParams();
    const { user } = useAuth();
    const { socket } = useSocket();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const { showAlert, alertState, hideAlert } = useAlertDialog();
    const { showConfirm, confirmState, hideConfirm } = useConfirmDialog();

    const [equipment, setEquipment] = useState(null);
    const [files, setFiles] = useState([]);
    const [calibrationHistory, setCalibrationHistory] = useState([]);
    const [checkoutHistory, setCheckoutHistory] = useState([]);
    const [activeCheckouts, setActiveCheckouts] = useState([]);
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [locations, setLocations] = useState([]);
    const [users, setUsers] = useState([]);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        serial_number: "",
        asset_number: "",
        cost: "",
        location: "",
        contact_person: "",
        contact_person_id: null,
        status: "available",
        requires_approval: false,
        brand_name: "",
        billing_rate: "",
        billing_code: "",
        date_of_purchase: "",
        can_book: true,
        calibration_interval_value: "",
        calibration_interval_unit: "days",
        last_calibration_date: "",
        // Depreciation fields
        placed_in_service_date: "",
        cost_basis: "",
        property_class: "5yr",
        method: "MACRS",
        bonus_eligible: true,
        section179_elected: "",
        vehicle_class: "UNKNOWN",
        convention: "half-year",
        // Disposal tracking
        disposal_date: "",
        sale_proceeds: "",
        disposal_method: "",
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
    const [openCompareDialog, setOpenCompareDialog] = useState(false);
    const [allEquipment, setAllEquipment] = useState([]);
    const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
    const [selectedCompareEquipment, setSelectedCompareEquipment] = useState(
        [],
    );
    const [openReserveDialog, setOpenReserveDialog] = useState(false);

    useEffect(() => {
        fetchEquipment();
        fetchFiles();
        fetchCalibrationHistory();
        fetchCheckoutHistory();
        fetchLocations();
        fetchUsers();
        fetchAllEquipment();
        fetchActiveCheckouts();
    }, [equipmentId]);

    // Auto-refresh active checkouts every minute to update status in real-time
    useEffect(() => {
        const interval = setInterval(() => {
            fetchActiveCheckouts();
        }, 60000); // 60 seconds

        return () => clearInterval(interval);
    }, []);

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
                case "checkout_approved":
                    // Refresh checkout history if it belongs to this equipment
                    if (
                        data?.equipment_id === parseInt(equipmentId) ||
                        data?.checkout?.equipment_id === parseInt(equipmentId)
                    ) {
                        fetchCheckoutHistory();
                        fetchActiveCheckouts();
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
                    f.file_name?.match(/\.(jpg|jpeg|png|gif)$/i),
            )
            .sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date));

        const handleKeyDown = (e) => {
            if (imageFiles.length === 0) return;

            if (e.key === "ArrowLeft") {
                e.preventDefault();
                setCurrentImageIndex((prev) =>
                    prev === 0 ? imageFiles.length - 1 : prev - 1,
                );
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                setCurrentImageIndex((prev) =>
                    prev === imageFiles.length - 1 ? 0 : prev + 1,
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
                { headers: { Authorization: `Bearer ${token}` } },
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
                { headers: { Authorization: `Bearer ${token}` } },
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
                { headers: { Authorization: `Bearer ${token}` } },
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

    const fetchAllEquipment = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.get(`/api/equipment`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            // Filter out current equipment
            setAllEquipment(
                response.data.filter((eq) => eq.id !== parseInt(equipmentId)),
            );
        } catch (error) {
            console.error("Error fetching all equipment:", error);
        }
    };

    const handleOpenEditDialog = () => {
        setFormData({
            name: equipment.name,
            description: equipment.description || "",
            serial_number: equipment.serial_number || "",
            asset_number: equipment.asset_number || "",
            asset_number: equipment.asset_number || "",
            cost: equipment.cost || "",
            location: equipment.location || "",
            contact_person: equipment.contact_person || "",
            contact_person_id: equipment.contact_person_id || null,
            status: equipment.status,
            billing_rate: equipment.billing_rate || "",
            billing_code: equipment.billing_code || "",
            brand_name: equipment.brand_name || "",
            date_of_purchase: equipment.date_of_purchase
                ? new Date(equipment.date_of_purchase)
                      .toISOString()
                      .split("T")[0]
                : "",
            requires_approval: equipment.requires_approval,
            can_book: equipment.can_book !== false,
            calibration_interval_value:
                equipment.calibration_interval_value || "",
            calibration_interval_unit:
                equipment.calibration_interval_unit || "days",
            last_calibration_date: equipment.last_calibration_date
                ? new Date(equipment.last_calibration_date)
                      .toISOString()
                      .split("T")[0]
                : "",
            // Depreciation fields
            placed_in_service_date: equipment.AssetTaxMeta
                ?.placed_in_service_date
                ? new Date(equipment.AssetTaxMeta.placed_in_service_date)
                      .toISOString()
                      .split("T")[0]
                : "",
            cost_basis: equipment.AssetTaxMeta?.cost_basis || "",
            property_class: equipment.AssetTaxMeta?.property_class || "5yr",
            method: equipment.AssetTaxMeta?.method || "MACRS",
            bonus_eligible: equipment.AssetTaxMeta?.bonus_eligible ?? true,
            section179_elected:
                equipment.AssetTaxMeta?.section179_elected || "",
            vehicle_class: equipment.AssetTaxMeta?.vehicle_class || "UNKNOWN",
            convention: equipment.AssetTaxMeta?.convention || "half-year",
            disposal_date: equipment.AssetTaxMeta?.disposal_date
                ? new Date(equipment.AssetTaxMeta.disposal_date)
                      .toISOString()
                      .split("T")[0]
                : "",
            sale_proceeds: equipment.AssetTaxMeta?.sale_proceeds || "",
            disposal_method: equipment.AssetTaxMeta?.disposal_method || "",
        });
        setOpenEditDialog(true);
    };

    const handleCloseEditDialog = () => {
        setOpenEditDialog(false);
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

            // Display validation errors to user
            if (
                error.response?.status === 400 &&
                error.response?.data?.errors
            ) {
                const errorMessages = error.response.data.errors.join("\n\n");
                showAlert(
                    errorMessages,
                    "error",
                    "Section 179 Validation Error",
                );
            } else {
                showAlert(
                    error.response?.data?.message ||
                        "Failed to update equipment. Please try again.",
                    "error",
                    "Error Updating Equipment",
                );
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        showConfirm(
            "Are you sure you want to delete this equipment? This will also delete all associated reservations, files, and calibration records.",
            async () => {
                await deleteEquipment();
            },
            "warning",
            "Delete Equipment",
            "Delete",
        );
    };

    const deleteEquipment = async () => {
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
            showAlert("Please select a file", "warning");
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
                    uploadFormData.calibration_date,
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
            showAlert("Error uploading file", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteFile = async (fileId) => {
        showConfirm(
            "Are you sure you want to delete this file?",
            async () => {
                await deleteFile(fileId);
            },
            "warning",
            "Delete File",
            "Delete",
        );
    };

    const deleteFile = async (fileId) => {
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

    const fetchActiveCheckouts = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const now = new Date().toISOString();
            const response = await axios.get(
                `/api/checkouts?start=${now}&end=${now}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );
            setActiveCheckouts(response.data);
        } catch (error) {
            console.error("Error fetching active checkouts:", error);
        }
    };

    const getCheckoutStatusColor = (status) => {
        switch (status) {
            case "pending":
                return "warning";
            case "auto-approved":
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
        if (user?.equipment_admin) return true;
        if (user?.tax_admin) return true;
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
                    f.file_name?.match(/\.(jpg|jpeg|png|gif)$/i)),
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
                    {equipment.can_book !== false && (
                        <>
                            <Button
                                variant="outlined"
                                startIcon={<CalendarMonth />}
                                onClick={() =>
                                    navigate(
                                        `/equipment/calendar/${equipmentId}`,
                                    )
                                }
                            >
                                Calendar
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<CompareArrows />}
                                onClick={() => setOpenCompareDialog(true)}
                            >
                                Compare
                            </Button>
                            <Button
                                variant="contained"
                                sx={{
                                    backgroundColor: "lightgreen",
                                    color: "black",
                                    ":hover": {
                                        backgroundColor: "green",
                                        color: "white",
                                    },
                                }}
                                startIcon={<CalendarMonth />}
                                onClick={() => setOpenReserveDialog(true)}
                            >
                                Reserve
                            </Button>
                        </>
                    )}
                    {canEditDelete() && (
                        <>
                            <Button
                                variant="contained"
                                startIcon={<MoreVert />}
                                onClick={(e) =>
                                    setActionMenuAnchor(e.currentTarget)
                                }
                                sx={{
                                    color: "white",
                                    ":hover": { color: "white" },
                                }}
                            >
                                Actions
                            </Button>
                            <Menu
                                anchorEl={actionMenuAnchor}
                                open={Boolean(actionMenuAnchor)}
                                onClose={() => setActionMenuAnchor(null)}
                            >
                                <MenuItem
                                    onClick={() => {
                                        setActionMenuAnchor(null);
                                        handleOpenUploadDialog();
                                    }}
                                >
                                    <UploadFile sx={{ mr: 1 }} />
                                    Upload File
                                </MenuItem>
                                <MenuItem
                                    onClick={() => {
                                        setActionMenuAnchor(null);
                                        handleOpenEditDialog();
                                    }}
                                >
                                    <Edit sx={{ mr: 1 }} />
                                    Edit
                                </MenuItem>
                                <MenuItem
                                    onClick={() => {
                                        setActionMenuAnchor(null);
                                        handleDelete();
                                    }}
                                    sx={{ color: "error.main" }}
                                >
                                    <Delete sx={{ mr: 1 }} />
                                    Delete
                                </MenuItem>
                            </Menu>
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
                            <EquipmentInfoCard
                                equipment={equipment}
                                isCalibrationDueSoon={isCalibrationDueSoon}
                                activeCheckouts={activeCheckouts}
                                user={user}
                            />
                        </CardContent>
                    </Card>
                    {/* Equipment Details Grid */}
                    <Grid item sx={{ mt: 3 }}>
                        <EquipmentDetailsCard equipment={equipment} />
                    </Grid>
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
                    {(equipment.billing_rate || equipment.billing_code) && (
                        <Grid mt={3}>
                            <Card width={"100%"}>
                                <CardContent width={"100%"}>
                                    <Typography
                                        variant="h6"
                                        gutterBottom
                                        width={"100%"}
                                    >
                                        Billing
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    <Box
                                        sx={{
                                            mt: 0,
                                            width: "100%",
                                        }}
                                    >
                                        <Grid container spacing={2}>
                                            {equipment?.billing_rate && (
                                                <Grid item xs={6}>
                                                    <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                    >
                                                        Billing Rate
                                                    </Typography>
                                                    <Typography
                                                        variant="body1"
                                                        sx={{ mt: 0.5 }}
                                                    >
                                                        {
                                                            equipment?.billing_rate
                                                        }
                                                    </Typography>
                                                </Grid>
                                            )}
                                            {equipment?.billing_code && (
                                                <Grid item xs={6}>
                                                    <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                    >
                                                        Billing Code
                                                    </Typography>
                                                    <Typography
                                                        variant="body1"
                                                        sx={{ mt: 0.5 }}
                                                    >
                                                        {
                                                            equipment?.billing_code
                                                        }
                                                    </Typography>
                                                </Grid>
                                            )}
                                            {equipment?.asset_number && (
                                                <Grid item xs={6}>
                                                    <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                    >
                                                        Asset Number
                                                    </Typography>
                                                    <Typography
                                                        variant="body1"
                                                        sx={{ mt: 0.5 }}
                                                    >
                                                        {
                                                            equipment?.asset_number
                                                        }
                                                    </Typography>
                                                </Grid>
                                            )}
                                        </Grid>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    )}
                </Grid>

                {/* Alert Subscriptions */}
                <Grid item xs={12}>
                    <AlertsCard
                        equipmentId={equipmentId}
                        canBook={equipment?.can_book}
                        openDialog={openSubscribeDialog}
                        setOpenDialog={setOpenSubscribeDialog}
                        onSubscribeSuccess={() =>
                            setAlertsRefresh((prev) => prev + 1)
                        }
                    />
                </Grid>

                {/* Checkout History - Only show if equipment can be booked */}
                {equipment?.can_book && (
                    <Grid item xs={12}>
                        <CheckoutHistoryCard
                            checkoutHistory={checkoutHistory}
                            getCheckoutStatusColor={getCheckoutStatusColor}
                        />
                    </Grid>
                )}
            </Grid>

            {/* Edit Dialog */}
            <EquipmentDialog
                open={openEditDialog}
                onClose={handleCloseEditDialog}
                selectedEquipment={equipment}
                formData={formData}
                setFormData={setFormData}
                locations={locations}
                users={users}
                onSave={handleSubmit}
                showAlert={showAlert}
            />

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
            <AlertDialog
                open={alertState.open}
                onClose={hideAlert}
                message={alertState.message}
                title={alertState.title}
                severity={alertState.severity}
                confirmText={alertState.confirmText}
            />
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

            {/* Compare Equipment Dialog */}
            <Dialog
                open={openCompareDialog}
                onClose={() => {
                    setOpenCompareDialog(false);
                    setSelectedCompareEquipment([]);
                }}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Compare Equipment Schedules</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 2 }}
                        >
                            Select one or more equipment to view all schedules
                            on one calendar
                        </Typography>
                        <Autocomplete
                            multiple
                            options={allEquipment.filter(
                                (eq) =>
                                    eq.can_book !== false &&
                                    eq.id !== equipment?.id,
                            )}
                            getOptionLabel={(option) =>
                                `${option.name}${option.serial_number ? ` (${option.serial_number})` : ""}`
                            }
                            filterOptions={(options, { inputValue }) => {
                                if (!inputValue) return options;
                                const searchTerm = inputValue.toLowerCase();
                                return options.filter((option) => {
                                    return (
                                        option.name
                                            ?.toLowerCase()
                                            .includes(searchTerm) ||
                                        option.serial_number
                                            ?.toLowerCase()
                                            .includes(searchTerm) ||
                                        option.asset_number
                                            ?.toLowerCase()
                                            .includes(searchTerm) ||
                                        option.description
                                            ?.toLowerCase()
                                            .includes(searchTerm) ||
                                        option.location
                                            ?.toLowerCase()
                                            .includes(searchTerm)
                                    );
                                });
                            }}
                            value={selectedCompareEquipment}
                            onChange={(event, newValue) => {
                                setSelectedCompareEquipment(newValue);
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Select Equipment"
                                    placeholder="Search by name, serial, asset number, description, or location"
                                />
                            )}
                            renderOption={(props, option) => (
                                <Box component="li" {...props}>
                                    <Box>
                                        <Typography variant="body1">
                                            {option.name}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            {option.serial_number ||
                                                "No serial number"}{" "}
                                            • {option.location || "No location"}
                                        </Typography>
                                    </Box>
                                </Box>
                            )}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setOpenCompareDialog(false);
                            setSelectedCompareEquipment([]);
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => {
                            if (
                                selectedCompareEquipment &&
                                selectedCompareEquipment.length > 0
                            ) {
                                const equipmentIds = [
                                    equipmentId,
                                    ...selectedCompareEquipment.map(
                                        (e) => e.id,
                                    ),
                                ].join(",");
                                navigate(
                                    `/equipment/compare?ids=${equipmentIds}`,
                                    { state: { fromEquipmentId: equipmentId } },
                                );
                            }
                        }}
                        variant="contained"
                        disabled={
                            !selectedCompareEquipment ||
                            selectedCompareEquipment.length === 0
                        }
                        startIcon={<CompareArrows />}
                    >
                        Compare Schedules
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Reserve Dialog */}
            <ReservationDialog
                open={openReserveDialog}
                onClose={() => setOpenReserveDialog(false)}
                equipmentId={equipmentId}
                equipmentName={equipment?.name}
                equipment={equipment}
                users={users}
                currentUserId={user?.id}
                onSuccess={() => {
                    showAlert("Reservation created successfully", "success");
                    fetchCheckoutHistory();
                }}
                setLoading={setLoading}
                showAlert={showAlert}
            />
        </Box>
    );
};

export default EquipmentDetails;
