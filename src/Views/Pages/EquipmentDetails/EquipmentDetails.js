import { useState, useEffect } from "react";
import {
    Box,
    Typography,
    Button,
    Grid,
    TextField,
    MenuItem,
    Menu,
    Autocomplete,
    Stack,
    Chip,
    ListItemIcon,
    ListItemText,
    Divider,
} from "@mui/material";
import {
    Edit,
    Delete,
    CalendarMonth,
    UploadFile,
    NotificationsActive,
    CompareArrows,
    MoreVert,
    AttachFileOutlined,
    ReceiptLongOutlined,
    EventAvailableOutlined,
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

import { useAuth } from "../../../Utilites/AuthContext";
import { useSocket } from "../../../Contexts/SocketContext";
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
import {
    PageHeader,
    PageContainer,
    SectionCard,
    ResponsiveDialog,
    DetailSkeleton,
    StatusChip,
    RiseIn,
} from "../../Components/UI";

const FILE_CATEGORIES = [
    { value: "photo", label: "Photo" },
    { value: "manual", label: "Manual" },
    { value: "calibration_cert", label: "Calibration Certificate" },
    { value: "other", label: "Other" },
];

const EquipmentDetails = ({ setLoading, loading }) => {
    const { equipmentId } = useParams();
    const { user } = useAuth();
    const { socket } = useSocket();
    const navigate = useNavigate();
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
    const [selectedCompareEquipment, setSelectedCompareEquipment] = useState([]);
    const [openReserveDialog, setOpenReserveDialog] = useState(false);

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
        placed_in_service_date: "",
        cost_basis: "",
        property_class: "5yr",
        method: "MACRS",
        bonus_eligible: true,
        section179_elected: "",
        vehicle_class: "UNKNOWN",
        convention: "half-year",
        disposal_date: "",
        sale_proceeds: "",
        disposal_method: "",
    });

    // ---- Data -------------------------------------------------------------

    useEffect(() => {
        fetchEquipment();
        fetchFiles();
        fetchCalibrationHistory();
        fetchCheckoutHistory();
        fetchLocations();
        fetchUsers();
        fetchAllEquipment();
        fetchActiveCheckouts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [equipmentId]);

    useEffect(() => {
        const interval = setInterval(fetchActiveCheckouts, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!socket?.connected) return undefined;

        const handleMessage = (payload) => {
            const { message, data } = payload;
            const id = parseInt(equipmentId, 10);

            switch (message) {
                case "equipment_updated":
                    if (data?.equipment?.id === id) fetchEquipment();
                    break;
                case "calibration_added":
                case "calibration_updated":
                case "calibration_deleted":
                    if (data?.equipment_id === id) fetchCalibrationHistory();
                    break;
                case "equipment_file_created":
                case "file_updated":
                case "file_deleted":
                    if (data?.equipment_id === id) fetchFiles();
                    break;
                case "checkout_created":
                case "checkout_updated":
                case "checkout_approved":
                    if (
                        data?.equipment_id === id ||
                        data?.checkout?.equipment_id === id
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, equipmentId]);

    // Arrow keys page the carousel; Escape closes the lightbox.
    useEffect(() => {
        const imageCount = files.filter(
            (f) =>
                f.file_type === "photo" ||
                f.file_name?.match(/\.(jpg|jpeg|png|gif)$/i),
        ).length;

        const handleKeyDown = (e) => {
            if (imageCount === 0) return;
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                setCurrentImageIndex((prev) =>
                    prev === 0 ? imageCount - 1 : prev - 1,
                );
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                setCurrentImageIndex((prev) =>
                    prev === imageCount - 1 ? 0 : prev + 1,
                );
            } else if (e.key === "Escape" && enlargedImage) {
                setEnlargedImage(null);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [files, enlargedImage]);

    const authHeaders = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
    });

    const fetchEquipment = async () => {
        try {
            setLoading(true);
            const response = await axios.get(
                `/api/equipment/${equipmentId}`,
                authHeaders(),
            );
            setEquipment(response.data);
        } catch (error) {
            console.error("Error fetching equipment:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFiles = async () => {
        try {
            const response = await axios.get(
                `/api/equipment/${equipmentId}/files`,
                authHeaders(),
            );
            setFiles(response.data);
        } catch (error) {
            console.error("Error fetching files:", error);
        }
    };

    const fetchCalibrationHistory = async () => {
        try {
            const response = await axios.get(
                `/api/calibrations/equipment/${equipmentId}`,
                authHeaders(),
            );
            setCalibrationHistory(response.data);
        } catch (error) {
            console.error("Error fetching calibration history:", error);
        }
    };

    const fetchCheckoutHistory = async () => {
        try {
            const response = await axios.get(
                `/api/checkouts/equipment/${equipmentId}`,
                authHeaders(),
            );
            setCheckoutHistory(response.data);
        } catch (error) {
            console.error("Error fetching checkout history:", error);
        }
    };

    const fetchLocations = async () => {
        try {
            const response = await axios.get(`/api/locations`, authHeaders());
            setLocations(response.data);
        } catch (error) {
            console.error("Error fetching locations:", error);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await axios.get(`/api/users`, authHeaders());
            setUsers(response.data);
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    const fetchAllEquipment = async () => {
        try {
            const response = await axios.get(`/api/equipment`, authHeaders());
            setAllEquipment(
                response.data.filter(
                    (eq) => eq.id !== parseInt(equipmentId, 10),
                ),
            );
        } catch (error) {
            console.error("Error fetching all equipment:", error);
        }
    };

    const fetchActiveCheckouts = async () => {
        try {
            const now = new Date().toISOString();
            const response = await axios.get(
                `/api/checkouts?start=${now}&end=${now}`,
                authHeaders(),
            );
            setActiveCheckouts(response.data);
        } catch (error) {
            console.error("Error fetching active checkouts:", error);
        }
    };

    // ---- Actions ----------------------------------------------------------

    const handleOpenEditDialog = () => {
        setFormData({
            name: equipment.name,
            description: equipment.description || "",
            serial_number: equipment.serial_number || "",
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

    const handleSubmit = async () => {
        try {
            setLoading(true);
            await axios.put(
                `/api/equipment/${equipmentId}`,
                formData,
                authHeaders(),
            );
            setOpenEditDialog(false);
            fetchEquipment();
        } catch (error) {
            console.error("Error updating equipment:", error);
            if (error.response?.status === 400 && error.response?.data?.errors) {
                showAlert(
                    error.response.data.errors.join("\n\n"),
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

    const handleDelete = () =>
        showConfirm(
            "Are you sure you want to delete this equipment? This will also delete all associated reservations, files, and calibration records.",
            deleteEquipment,
            "warning",
            "Delete Equipment",
            "Delete",
        );

    const deleteEquipment = async () => {
        try {
            setLoading(true);
            await axios.delete(`/api/equipment/${equipmentId}`, authHeaders());
            navigate("/equipment");
        } catch (error) {
            console.error("Error deleting equipment:", error);
        } finally {
            setLoading(false);
        }
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

    const handleUploadInputChange = (e) =>
        setUploadFormData({
            ...uploadFormData,
            [e.target.name]: e.target.value,
        });

    const handleFileUpload = async () => {
        if (!uploadFormData.file) {
            showAlert("Please select a file", "warning");
            return;
        }

        try {
            setLoading(true);
            const payload = new FormData();
            payload.append("file", uploadFormData.file);
            payload.append("equipment_id", equipmentId);
            payload.append("category", uploadFormData.category);
            payload.append("description", uploadFormData.description);
            payload.append("uploaded_by_user_id", user.id);
            if (
                uploadFormData.category === "calibration_cert" &&
                uploadFormData.calibration_date
            ) {
                payload.append(
                    "calibration_date",
                    uploadFormData.calibration_date,
                );
            }

            await axios.post("/api/equipment-files", payload, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("authToken")}`,
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

    const handleDeleteFile = (fileId) =>
        showConfirm(
            "Are you sure you want to delete this file?",
            () => deleteFile(fileId),
            "warning",
            "Delete File",
            "Delete",
        );

    const deleteFile = async (fileId) => {
        try {
            setLoading(true);
            await axios.delete(
                `/api/equipment-files/${fileId}`,
                authHeaders(),
            );
            await fetchFiles();
            await fetchEquipment();
        } catch (error) {
            console.error("Error deleting file:", error);
        } finally {
            setLoading(false);
        }
    };

    const isCalibrationDueSoon = (dueDate) => {
        if (!dueDate) return false;
        const daysUntilDue = Math.floor(
            (new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24),
        );
        return daysUntilDue <= 30 && daysUntilDue >= 0;
    };

    const canEditDelete = () => {
        if (!equipment) return false;
        if (user?.admin || user?.equipment_admin || user?.tax_admin) return true;
        return Boolean(
            user?.equipment_office_admin &&
                equipment.location === user.location,
        );
    };

    // ---- File buckets -----------------------------------------------------

    const isImage = (f) =>
        f.file_type?.includes("image/") ||
        f.file_name?.match(/\.(jpg|jpeg|png|gif)$/i);

    const byUploadDesc = (a, b) =>
        new Date(b.upload_date) - new Date(a.upload_date);

    const imageFiles = files
        .filter((f) => (f.category === "photo" || !f.category) && isImage(f))
        .sort(byUploadDesc);

    const manualFiles = files
        .filter((f) => f.category === "manual")
        .sort(byUploadDesc);

    const certFiles = files
        .filter((f) => f.category === "calibration_cert")
        .sort((a, b) => {
            const dateA = new Date(a.calibration_date || a.upload_date);
            const dateB = new Date(b.calibration_date || b.upload_date);
            return dateB - dateA;
        });

    const otherFiles = files
        .filter((f) => {
            if (f.category === "other") return true;
            if (!f.category) return !isImage(f);
            return false;
        })
        .sort(byUploadDesc);

    // ---- Rendering --------------------------------------------------------

    if (!equipment) {
        return (
            <>
                <PageHeader title="Equipment" subtitle="Loading details…" back />
                <PageContainer>
                    <DetailSkeleton />
                </PageContainer>
            </>
        );
    }

    const bookable = equipment.can_book !== false;
    const hasBilling =
        equipment.billing_rate ||
        equipment.billing_code ||
        equipment.asset_number;

    const headerActions = [
        bookable && {
            key: "reserve",
            label: "Reserve",
            icon: <EventAvailableOutlined />,
            primary: true,
            onClick: () => setOpenReserveDialog(true),
        },
        bookable && {
            key: "calendar",
            label: "Calendar",
            icon: <CalendarMonth />,
            onClick: () => navigate(`/equipment/calendar/${equipmentId}`),
        },
        bookable && {
            key: "compare",
            label: "Compare",
            icon: <CompareArrows />,
            onClick: () => setOpenCompareDialog(true),
        },
        {
            key: "subscribe",
            label: "Alerts",
            icon: <NotificationsActive />,
            onClick: () => setOpenSubscribeDialog(true),
        },
        canEditDelete() && {
            key: "manage",
            render: (
                <>
                    <Button
                        variant="outlined"
                        onClick={(e) => setActionMenuAnchor(e.currentTarget)}
                        sx={{ minWidth: 44, px: 1.25 }}
                        aria-label="Manage equipment"
                    >
                        <MoreVert fontSize="small" />
                    </Button>
                    <Menu
                        anchorEl={actionMenuAnchor}
                        open={Boolean(actionMenuAnchor)}
                        onClose={() => setActionMenuAnchor(null)}
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        transformOrigin={{ vertical: "top", horizontal: "right" }}
                    >
                        <MenuItem
                            onClick={() => {
                                setActionMenuAnchor(null);
                                setOpenUploadDialog(true);
                            }}
                        >
                            <ListItemIcon>
                                <UploadFile fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Upload file</ListItemText>
                        </MenuItem>
                        <MenuItem
                            onClick={() => {
                                setActionMenuAnchor(null);
                                handleOpenEditDialog();
                            }}
                        >
                            <ListItemIcon>
                                <Edit fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Edit details</ListItemText>
                        </MenuItem>
                        <Divider sx={{ my: 0.5 }} />
                        <MenuItem
                            onClick={() => {
                                setActionMenuAnchor(null);
                                handleDelete();
                            }}
                        >
                            <ListItemIcon>
                                <Delete
                                    fontSize="small"
                                    sx={{ color: "error.main" }}
                                />
                            </ListItemIcon>
                            <ListItemText
                                primaryTypographyProps={{ color: "error.main" }}
                            >
                                Delete equipment
                            </ListItemText>
                        </MenuItem>
                    </Menu>
                </>
            ),
        },
    ].filter(Boolean);

    return (
        <>
            <PageHeader
                back="/equipment"
                breadcrumbs={[
                    { label: "Equipment", to: "/equipment" },
                    { label: equipment.name },
                ]}
                title={equipment.name}
                subtitle={
                    [
                        equipment.serial_number &&
                            `Serial ${equipment.serial_number}`,
                        equipment.location,
                        equipment.brand_name,
                    ]
                        .filter(Boolean)
                        .join(" · ") || undefined
                }
                renderActions={
                    <Stack direction="row" spacing={1} alignItems="center">
                        {!bookable && (
                            <Chip
                                label="Not bookable"
                                size="small"
                                variant="outlined"
                            />
                        )}
                        <StatusChip status={equipment.status} />
                    </Stack>
                }
                actions={headerActions}
            />

            <PageContainer>
                <Grid container spacing={{ xs: 2, md: 2.5 }}>
                    {/* ---- Left column ---- */}
                    <Grid item xs={12} md={6}>
                        <Stack spacing={{ xs: 2, md: 2.5 }}>
                            <RiseIn>
                                <SectionCard
                                    title="Equipment information"
                                    icon={<AttachFileOutlined />}
                                    disablePadding
                                >
                                    <ImageCarousel
                                        imageFiles={imageFiles}
                                        currentImageIndex={currentImageIndex}
                                        setCurrentImageIndex={
                                            setCurrentImageIndex
                                        }
                                        setEnlargedImage={setEnlargedImage}
                                        canEditDelete={canEditDelete}
                                        handleDeleteFile={handleDeleteFile}
                                    />
                                    <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
                                        <EquipmentInfoCard
                                            equipment={equipment}
                                            isCalibrationDueSoon={
                                                isCalibrationDueSoon
                                            }
                                            activeCheckouts={activeCheckouts}
                                            user={user}
                                        />
                                    </Box>
                                </SectionCard>
                            </RiseIn>

                            <RiseIn delay={70}>
                                <EquipmentDetailsCard equipment={equipment} />
                            </RiseIn>
                        </Stack>
                    </Grid>

                    {/* ---- Right column ---- */}
                    <Grid item xs={12} md={6}>
                        <Stack spacing={{ xs: 2, md: 2.5 }}>
                            <RiseIn delay={40}>
                                <CalibrationInfoCard
                                    equipment={equipment}
                                    manualFiles={manualFiles}
                                    certFiles={certFiles}
                                    otherFiles={otherFiles}
                                    canEditDelete={canEditDelete}
                                    handleDeleteFile={handleDeleteFile}
                                    onViewHistory={(title, historyFiles) =>
                                        setFileHistoryDialog({
                                            open: true,
                                            title,
                                            files: historyFiles,
                                        })
                                    }
                                />
                            </RiseIn>

                            {hasBilling && (
                                <RiseIn delay={110}>
                                    <SectionCard
                                        title="Billing"
                                        icon={<ReceiptLongOutlined />}
                                    >
                                        <Grid container spacing={2}>
                                            {[
                                                {
                                                    label: "Billing rate",
                                                    value: equipment.billing_rate,
                                                },
                                                {
                                                    label: "Billing code",
                                                    value: equipment.billing_code,
                                                },
                                                {
                                                    label: "Asset number",
                                                    value: equipment.asset_number,
                                                },
                                            ]
                                                .filter((f) => f.value)
                                                .map((f) => (
                                                    <Grid
                                                        item
                                                        xs={6}
                                                        key={f.label}
                                                    >
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                            sx={{
                                                                display: "block",
                                                            }}
                                                        >
                                                            {f.label}
                                                        </Typography>
                                                        <Typography
                                                            variant="body1"
                                                            sx={{
                                                                mt: 0.25,
                                                                fontWeight: 550,
                                                            }}
                                                        >
                                                            {f.value}
                                                        </Typography>
                                                    </Grid>
                                                ))}
                                        </Grid>
                                    </SectionCard>
                                </RiseIn>
                            )}
                        </Stack>
                    </Grid>

                    {/* ---- Full width ---- */}
                    <Grid item xs={12}>
                        <RiseIn delay={140}>
                            <AlertsCard
                                equipmentId={equipmentId}
                                canBook={equipment?.can_book}
                                openDialog={openSubscribeDialog}
                                setOpenDialog={setOpenSubscribeDialog}
                                onSubscribeSuccess={() =>
                                    setAlertsRefresh((prev) => prev + 1)
                                }
                            />
                        </RiseIn>
                    </Grid>

                    {equipment?.can_book && (
                        <Grid item xs={12}>
                            <RiseIn delay={180}>
                                <CheckoutHistoryCard
                                    checkoutHistory={checkoutHistory}
                                />
                            </RiseIn>
                        </Grid>
                    )}
                </Grid>
            </PageContainer>

            {/* ---- Dialogs ---- */}
            <EquipmentDialog
                open={openEditDialog}
                onClose={() => setOpenEditDialog(false)}
                selectedEquipment={equipment}
                formData={formData}
                setFormData={setFormData}
                locations={locations}
                users={users}
                onSave={handleSubmit}
                showAlert={showAlert}
            />

            <ResponsiveDialog
                open={openUploadDialog}
                onClose={handleCloseUploadDialog}
                title="Upload file"
                subtitle={equipment.name}
                icon={<UploadFile />}
                maxWidth="sm"
                actions={
                    <>
                        <Button onClick={handleCloseUploadDialog} variant="outlined">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleFileUpload}
                            variant="contained"
                            disabled={!uploadFormData.file}
                            startIcon={<UploadFile />}
                        >
                            Upload
                        </Button>
                    </>
                }
            >
                <Stack spacing={2}>
                    {/* Drop target doubles as the file picker. */}
                    <Box
                        component="label"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            const dropped = e.dataTransfer?.files?.[0];
                            if (dropped) {
                                setUploadFormData((prev) => ({
                                    ...prev,
                                    file: dropped,
                                }));
                            }
                        }}
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 1,
                            py: 4,
                            px: 2,
                            borderRadius: 3,
                            border: "1.5px dashed",
                            borderColor: uploadFormData.file
                                ? "primary.main"
                                : "grey.300",
                            bgcolor: uploadFormData.file
                                ? "primary.50"
                                : "grey.50",
                            cursor: "pointer",
                            textAlign: "center",
                            transition:
                                "border-color 200ms ease, background-color 200ms ease",
                            "&:hover": {
                                borderColor: "primary.main",
                                bgcolor: "primary.50",
                            },
                        }}
                    >
                        <UploadFile
                            sx={{
                                fontSize: 30,
                                color: uploadFormData.file
                                    ? "primary.main"
                                    : "text.disabled",
                            }}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {uploadFormData.file
                                ? uploadFormData.file.name
                                : "Choose a file or drop it here"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Images, PDF, Word or Excel
                        </Typography>
                        <input
                            type="file"
                            hidden
                            onChange={(e) =>
                                setUploadFormData({
                                    ...uploadFormData,
                                    file: e.target.files[0],
                                })
                            }
                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                        />
                    </Box>

                    <TextField
                        name="category"
                        label="File category"
                        value={uploadFormData.category}
                        onChange={handleUploadInputChange}
                        select
                        fullWidth
                        required
                    >
                        {FILE_CATEGORIES.map((c) => (
                            <MenuItem key={c.value} value={c.value}>
                                {c.label}
                            </MenuItem>
                        ))}
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
                            label="Calibration date"
                            type="date"
                            value={uploadFormData.calibration_date}
                            onChange={handleUploadInputChange}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                    )}
                </Stack>
            </ResponsiveDialog>

            <EnlargedImageDialog
                enlargedImage={enlargedImage}
                setEnlargedImage={setEnlargedImage}
                imageFiles={imageFiles}
                currentImageIndex={currentImageIndex}
                setCurrentImageIndex={setCurrentImageIndex}
            />

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

            <ResponsiveDialog
                open={openCompareDialog}
                onClose={() => {
                    setOpenCompareDialog(false);
                    setSelectedCompareEquipment([]);
                }}
                title="Compare schedules"
                subtitle="Pick other equipment to overlay on one calendar."
                icon={<CompareArrows />}
                maxWidth="sm"
                actions={
                    <>
                        <Button
                            variant="outlined"
                            onClick={() => {
                                setOpenCompareDialog(false);
                                setSelectedCompareEquipment([]);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                if (selectedCompareEquipment?.length > 0) {
                                    const equipmentIds = [
                                        equipmentId,
                                        ...selectedCompareEquipment.map(
                                            (e) => e.id,
                                        ),
                                    ].join(",");
                                    navigate(
                                        `/equipment/compare?ids=${equipmentIds}`,
                                        {
                                            state: {
                                                fromEquipmentId: equipmentId,
                                            },
                                        },
                                    );
                                }
                            }}
                            variant="contained"
                            disabled={!selectedCompareEquipment?.length}
                            startIcon={<CompareArrows />}
                        >
                            Compare
                        </Button>
                    </>
                }
            >
                <Autocomplete
                    multiple
                    options={allEquipment.filter(
                        (eq) =>
                            eq.can_book !== false && eq.id !== equipment?.id,
                    )}
                    getOptionLabel={(option) =>
                        `${option.name}${
                            option.serial_number
                                ? ` (${option.serial_number})`
                                : ""
                        }`
                    }
                    filterOptions={(options, { inputValue }) => {
                        if (!inputValue) return options;
                        const term = inputValue.toLowerCase();
                        return options.filter(
                            (option) =>
                                option.name?.toLowerCase().includes(term) ||
                                option.serial_number
                                    ?.toLowerCase()
                                    .includes(term) ||
                                option.asset_number
                                    ?.toLowerCase()
                                    .includes(term) ||
                                option.description
                                    ?.toLowerCase()
                                    .includes(term) ||
                                option.location?.toLowerCase().includes(term),
                        );
                    }}
                    value={selectedCompareEquipment}
                    onChange={(_, newValue) =>
                        setSelectedCompareEquipment(newValue)
                    }
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Equipment"
                            placeholder="Search name, serial, asset, location"
                        />
                    )}
                    renderOption={(props, option) => (
                        <Box component="li" {...props}>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" noWrap>
                                    {option.name}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    noWrap
                                >
                                    {option.serial_number || "No serial number"}{" "}
                                    · {option.location || "No location"}
                                </Typography>
                            </Box>
                        </Box>
                    )}
                />
            </ResponsiveDialog>

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
        </>
    );
};

export default EquipmentDetails;
