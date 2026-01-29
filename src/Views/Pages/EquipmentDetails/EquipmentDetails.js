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
    Menu,
    Autocomplete,
    useMediaQuery,
    useTheme,
    Card,
    CardContent,
    Divider,
    Chip,
    IconButton,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Link,
} from "@mui/material";
import {
    Edit,
    Delete,
    CalendarMonth,
    UploadFile,
    Warning,
    NotificationsActive,
    CompareArrows,
    MoreVert,
    ExpandMore,
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
import AlertDialog from "../../../Components/AlertDialog";
import useAlertDialog from "../../../hooks/useAlertDialog";
import ConfirmDialog from "../../../Components/ConfirmDialog";
import useConfirmDialog from "../../../hooks/useConfirmDialog";

// Helper functions to get state-specific tax resource links
const getStateDepreciationLink = (state) => {
    const links = {
        OH: (
            <Link
                href="https://tax.ohio.gov/faq-IncomeDepreciation"
                target="_blank"
                rel="noopener"
            >
                OH depreciation guidance
            </Link>
        ),
        MO: (
            <Link
                href="https://dor.mo.gov/faq/taxation/business/corporation-income.html"
                target="_blank"
                rel="noopener"
            >
                MO tax guidance
            </Link>
        ),
        TX: (
            <Link
                href="https://comptroller.texas.gov/taxes/franchise/"
                target="_blank"
                rel="noopener"
            >
                TX franchise tax info
            </Link>
        ),
        IL: (
            <Link
                href="https://tax.illinois.gov/content/dam/soi/en/web/tax/forms/incometax/documents/currentyear/miscellaneous/il-4562-instr.pdf"
                target="_blank"
                rel="noopener"
            >
                IL Form 4562
            </Link>
        ),
        FL: (
            <Link
                href="https://floridarevenue.com/taxes/tips/Documents/TIP_24C01-02.pdf"
                target="_blank"
                rel="noopener"
            >
                FL depreciation adjustments
            </Link>
        ),
        MD: (
            <Link
                href="https://www.marylandtaxes.gov/forms/23_forms/500DM.pdf"
                target="_blank"
                rel="noopener"
            >
                MD Form 500DM
            </Link>
        ),
        GA: (
            <Link
                href="https://dor.georgia.gov/irc-section-168k-special-depreciation-allowance-bonus-depreciation"
                target="_blank"
                rel="noopener"
            >
                GA depreciation info
            </Link>
        ),
        NC: (
            <Link
                href="https://www.ncdor.gov/documents/guidance-depreciation-adjustment-corporate-and-franchise-taxes"
                target="_blank"
                rel="noopener"
            >
                NC depreciation guidance
            </Link>
        ),
        CO: (
            <Link
                href="https://tax.colorado.gov/depreciation-addback-subtraction"
                target="_blank"
                rel="noopener"
            >
                CO depreciation adjustment
            </Link>
        ),
        MI: (
            <Link
                href="https://www.michigan.gov/taxes/business-taxes/cit/cit-faqs"
                target="_blank"
                rel="noopener"
            >
                MI CIT guidance
            </Link>
        ),
    };
    return links[state] || <span>state tax guidance</span>;
};

const getStateBonusDepreciationLink = (state) => {
    const links = {
        OH: (
            <Link
                href="https://tax.ohio.gov/business/pass-through-entity-and-fiduciary-income-tax"
                target="_blank"
                rel="noopener"
            >
                OH bonus add-back
            </Link>
        ),
        FL: (
            <Link
                href="https://floridarevenue.com/taxes/tips/Documents/TIP_24C01-02.pdf"
                target="_blank"
                rel="noopener"
            >
                FL bonus treatment
            </Link>
        ),
        IL: (
            <Link
                href="https://tax.illinois.gov/content/dam/soi/en/web/tax/forms/incometax/documents/currentyear/miscellaneous/il-4562-instr.pdf"
                target="_blank"
                rel="noopener"
            >
                IL bonus reversal
            </Link>
        ),
        GA: (
            <Link
                href="https://dor.georgia.gov/irc-section-168k-special-depreciation-allowance-bonus-depreciation"
                target="_blank"
                rel="noopener"
            >
                GA bonus info
            </Link>
        ),
        NC: (
            <Link
                href="https://www.ncdor.gov/documents/guidance-depreciation-adjustment-corporate-and-franchise-taxes"
                target="_blank"
                rel="noopener"
            >
                NC bonus treatment
            </Link>
        ),
    };
    return links[state] || <span>state bonus info</span>;
};

const getStateSection179Link = (state) => {
    const links = {
        OH: (
            <Link
                href="https://tax.ohio.gov/faq-IncomeDepreciation"
                target="_blank"
                rel="noopener"
            >
                OH Section 179 threshold
            </Link>
        ),
        FL: (
            <Link
                href="https://floridarevenue.com/taxes/tips/Documents/TIP_24C01-02.pdf"
                target="_blank"
                rel="noopener"
            >
                FL Section 179 treatment
            </Link>
        ),
        NC: (
            <Link
                href="https://www.ncdor.gov/documents/guidance-depreciation-adjustment-corporate-and-franchise-taxes"
                target="_blank"
                rel="noopener"
            >
                NC Section 179 guidance
            </Link>
        ),
    };
    return links[state] || <span>state Section 179 info</span>;
};

const EquipmentDetails = ({ setLoading, loading }) => {
    const { equipmentId } = useParams();
    const { user } = useAuth();
    const { socket } = useSocket();

    const calculateDueDate = () => {
        if (
            !equipment?.last_calibration_date ||
            !equipment?.calibration_interval_value
        ) {
            return null;
        }
        const lastCal = new Date(equipment.last_calibration_date);
        const dueDate = new Date(lastCal);

        switch (equipment.calibration_interval_unit) {
            case "days":
                dueDate.setDate(
                    dueDate.getDate() + equipment.calibration_interval_value,
                );
                break;
            case "months":
                dueDate.setMonth(
                    dueDate.getMonth() + equipment.calibration_interval_value,
                );
                break;
            case "years":
                dueDate.setFullYear(
                    dueDate.getFullYear() +
                        equipment.calibration_interval_value,
                );
                break;
        }
        return dueDate;
    };
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
        cost: "",
        location: "",
        contact_person: "",
        contact_person_id: null,
        status: "available",
        requires_approval: false,
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
    const [reserveFormData, setReserveFormData] = useState({
        start_time: "",
        end_time: "",
        notes: "",
        project_number: "",
        scheduled_on_behalf_of: "",
    });

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
            cost: equipment.cost || "",
            location: equipment.location || "",
            contact_person: equipment.contact_person || "",
            contact_person_id: equipment.contact_person_id || null,
            status: equipment.status,
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

    const isEquipmentCurrentlyCheckedOut = (equipmentId) => {
        const now = new Date();
        return activeCheckouts.some((checkout) => {
            if (checkout.equipment_id !== equipmentId) return false;
            if (checkout.status === "cancelled") return false;

            const start = new Date(checkout.start_time);
            const end = new Date(checkout.end_time);
            return now >= start && now <= end;
        });
    };

    const getDisplayStatus = () => {
        if (!equipment) return "available";
        // If equipment is currently checked out, override status
        if (isEquipmentCurrentlyCheckedOut(equipment.id)) {
            return "unavailable";
        }
        return equipment.status;
    };

    const handleOpenReserveDialog = () => {
        const now = new Date();
        const roundedMinutes = Math.ceil(now.getMinutes() / 15) * 15;
        now.setMinutes(roundedMinutes, 0, 0);

        const endTime = new Date(now);
        endTime.setHours(endTime.getHours() + 1);

        const formatDateTime = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            const hours = String(date.getHours()).padStart(2, "0");
            const minutes = String(date.getMinutes()).padStart(2, "0");
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        setReserveFormData({
            start_time: formatDateTime(now),
            end_time: formatDateTime(endTime),
            notes: "",
            project_number: "",
            scheduled_on_behalf_of: "",
        });
        setOpenReserveDialog(true);
    };

    const handleCloseReserveDialog = () => {
        setOpenReserveDialog(false);
    };

    const handleReserveSubmit = async () => {
        if (
            !reserveFormData.project_number ||
            reserveFormData.project_number.trim() === ""
        ) {
            showAlert("Project Number is required", "error");
            return;
        }

        const startTime = new Date(reserveFormData.start_time);
        const endTime = new Date(reserveFormData.end_time);

        if (endTime <= startTime) {
            showAlert("End time must be after start time", "error");
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem("authToken");

            const checkoutData = {
                equipment_id: parseInt(equipmentId),
                user_id: user.id,
                start_time: new Date(reserveFormData.start_time).toISOString(),
                end_time: new Date(reserveFormData.end_time).toISOString(),
                notes: reserveFormData.notes || null,
                project_number: reserveFormData.project_number || null,
                scheduled_on_behalf_of:
                    reserveFormData.scheduled_on_behalf_of || null,
            };

            await axios.post("/api/checkouts", checkoutData, {
                headers: { Authorization: `Bearer ${token}` },
            });

            showAlert("Reservation created successfully", "success");
            fetchCheckoutHistory();
            fetchActiveCheckouts();
            handleCloseReserveDialog();
        } catch (error) {
            console.error("Error creating reservation:", error);
            showAlert(
                "Error creating reservation: " +
                    (error.response?.data?.message || error.message),
                "error",
            );
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "available":
                return "success";
            case "unavailable":
                return "error";
            case "reserved":
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
                                onClick={handleOpenReserveDialog}
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
                            <Grid container spacing={2}>
                                {equipment?.can_book !== false && (
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
                                                label={getDisplayStatus()}
                                                color={getStatusColor(
                                                    getDisplayStatus(),
                                                )}
                                                size="small"
                                            />
                                            {isCalibrationDueSoon(
                                                calculateDueDate(),
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
                                )}

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

                                {/* <Grid item xs={12} sm={6}>
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
                                </Grid> */}
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

                {/* Checkout History - Only show if equipment can be booked */}
                {equipment?.can_book && (
                    <Grid item xs={12}>
                        <CheckoutHistoryCard
                            checkoutHistory={checkoutHistory}
                            getCheckoutStatusColor={getCheckoutStatusColor}
                        />
                    </Grid>
                )}

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
            </Grid>

            {/* Edit Dialog */}
            <Dialog
                open={openEditDialog}
                onClose={handleCloseEditDialog}
                maxWidth="sm"
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
                            name="cost"
                            label="Purchase Cost"
                            type="number"
                            value={formData.cost}
                            onChange={handleInputChange}
                            fullWidth
                            InputProps={{
                                startAdornment: "$",
                            }}
                            inputProps={{
                                step: "0.01",
                                min: "0",
                            }}
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
                                users.find(
                                    (u) =>
                                        u.id === formData.contact_person_id ||
                                        (formData.contact_person &&
                                            `${u.first_name} ${u.last_name}` ===
                                                formData.contact_person),
                                ) || null
                            }
                            onChange={(e, newValue) => {
                                setFormData({
                                    ...formData,
                                    contact_person: newValue
                                        ? `${newValue.first_name} ${newValue.last_name}`
                                        : "",
                                    contact_person_id: newValue
                                        ? newValue.id
                                        : null,
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
                                Reserved
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
                            name="can_book"
                            label="Can Be Booked"
                            value={formData.can_book}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    can_book: e.target.value === "true",
                                })
                            }
                            select
                            fullWidth
                        >
                            <MenuItem key="can-book-true" value={true}>
                                Yes
                            </MenuItem>
                            <MenuItem key="can-book-false" value={false}>
                                No
                            </MenuItem>
                        </TextField>
                        {/* <TextField
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
                        </TextField> */}
                        <TextField
                            name="last_calibration_date"
                            label="Last Calibration Date"
                            type="date"
                            value={formData.last_calibration_date}
                            onChange={handleInputChange}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                        <Box sx={{ display: "flex", gap: 2 }}>
                            <TextField
                                name="calibration_interval_value"
                                label="Calibration Interval"
                                type="number"
                                value={formData.calibration_interval_value}
                                onChange={handleInputChange}
                                fullWidth
                                sx={{ flex: 2 }}
                            />
                            <TextField
                                name="calibration_interval_unit"
                                label="Unit"
                                select
                                value={formData.calibration_interval_unit}
                                onChange={handleInputChange}
                                fullWidth
                                sx={{ flex: 1 }}
                            >
                                <MenuItem value="days">Days</MenuItem>
                                <MenuItem value="months">Months</MenuItem>
                                <MenuItem value="years">Years</MenuItem>
                            </TextField>
                        </Box>

                        {/* Optional Tax Depreciation Section */}
                        <Accordion sx={{ mt: 3 }}>
                            <AccordionSummary
                                expandIcon={<ExpandMore />}
                                aria-controls="tax-fields-content"
                                id="tax-fields-header"
                            >
                                <Typography variant="subtitle1">
                                    Optional Tax Depreciation Fields
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Box
                                    sx={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 2,
                                    }}
                                >
                                    <TextField
                                        name="placed_in_service_date"
                                        label="Placed in Service Date"
                                        type="date"
                                        value={formData.placed_in_service_date}
                                        onChange={handleInputChange}
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                        helperText={
                                            <span>
                                                Date asset was put into service
                                                for tax purposes. See{" "}
                                                <Link
                                                    href="https://www.irs.gov/publications/p946#en_US_2023_publink1000107485"
                                                    target="_blank"
                                                    rel="noopener"
                                                >
                                                    IRS Pub 946
                                                </Link>
                                                {formData.location &&
                                                    locations.find(
                                                        (l) =>
                                                            l.Alias ===
                                                            formData.location,
                                                    )?.state && (
                                                        <>
                                                            {" "}
                                                            and{" "}
                                                            {getStateDepreciationLink(
                                                                locations.find(
                                                                    (l) =>
                                                                        l.Alias ===
                                                                        formData.location,
                                                                )?.state,
                                                            )}
                                                        </>
                                                    )}
                                            </span>
                                        }
                                    />

                                    <TextField
                                        name="cost_basis"
                                        label="Cost Basis for Depreciation"
                                        type="number"
                                        value={formData.cost_basis}
                                        onChange={handleInputChange}
                                        fullWidth
                                        InputProps={{
                                            startAdornment: "$",
                                        }}
                                        inputProps={{
                                            step: "0.01",
                                            min: "0",
                                        }}
                                        helperText={
                                            <span>
                                                Leave blank to use Purchase
                                                Cost. See{" "}
                                                <Link
                                                    href="https://www.irs.gov/publications/p946#en_US_2023_publink1000107507"
                                                    target="_blank"
                                                    rel="noopener"
                                                >
                                                    IRS Pub 946 - Basis
                                                </Link>
                                            </span>
                                        }
                                    />

                                    <TextField
                                        name="property_class"
                                        label="Property Class"
                                        select
                                        value={formData.property_class}
                                        onChange={handleInputChange}
                                        fullWidth
                                        helperText={
                                            <span>
                                                IRS depreciation recovery
                                                period. See{" "}
                                                <Link
                                                    href="https://www.irs.gov/publications/p946#en_US_2023_publink1000107513"
                                                    target="_blank"
                                                    rel="noopener"
                                                >
                                                    IRS Pub 946 - MACRS Recovery
                                                    Periods
                                                </Link>
                                            </span>
                                        }
                                    >
                                        <MenuItem value="3yr">
                                            3-Year Property
                                        </MenuItem>
                                        <MenuItem value="5yr">
                                            5-Year Property
                                        </MenuItem>
                                        <MenuItem value="7yr">
                                            7-Year Property
                                        </MenuItem>
                                        <MenuItem value="10yr">
                                            10-Year Property
                                        </MenuItem>
                                        <MenuItem value="15yr">
                                            15-Year Property
                                        </MenuItem>
                                        <MenuItem value="20yr">
                                            20-Year Property
                                        </MenuItem>
                                        <MenuItem value="27.5yr">
                                            27.5-Year Property
                                        </MenuItem>
                                        <MenuItem value="39yr">
                                            39-Year Property
                                        </MenuItem>
                                    </TextField>

                                    <TextField
                                        name="method"
                                        label="Depreciation Method"
                                        select
                                        value={formData.method}
                                        onChange={handleInputChange}
                                        fullWidth
                                        helperText={
                                            <span>
                                                <Link
                                                    href="https://www.irs.gov/publications/p946#en_US_2023_publink1000107524"
                                                    target="_blank"
                                                    rel="noopener"
                                                >
                                                    MACRS (Modified Accelerated
                                                    Cost Recovery)
                                                </Link>{" "}
                                                vs{" "}
                                                <Link
                                                    href="https://www.irs.gov/publications/p946#en_US_2023_publink1000107555"
                                                    target="_blank"
                                                    rel="noopener"
                                                >
                                                    ADS (Alternative
                                                    Depreciation System)
                                                </Link>
                                            </span>
                                        }
                                    >
                                        <MenuItem value="MACRS">
                                            MACRS (Modified Accelerated)
                                        </MenuItem>
                                        <MenuItem value="ADS">
                                            ADS (Alternative Depreciation)
                                        </MenuItem>
                                    </TextField>

                                    <TextField
                                        name="bonus_eligible"
                                        label="Bonus Depreciation Eligible"
                                        value={formData.bonus_eligible}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                bonus_eligible:
                                                    e.target.value === "true",
                                            })
                                        }
                                        select
                                        fullWidth
                                        helperText={
                                            <span>
                                                IRC Section 168(k) Bonus
                                                Depreciation. See{" "}
                                                <Link
                                                    href="https://www.irs.gov/publications/p946#en_US_2023_publink1000293543"
                                                    target="_blank"
                                                    rel="noopener"
                                                >
                                                    IRS Pub 946 - Special
                                                    Depreciation Allowance
                                                </Link>
                                                {formData.location &&
                                                    locations.find(
                                                        (l) =>
                                                            l.Alias ===
                                                            formData.location,
                                                    )?.state && (
                                                        <>
                                                            {" "}
                                                            |{" "}
                                                            {getStateBonusDepreciationLink(
                                                                locations.find(
                                                                    (l) =>
                                                                        l.Alias ===
                                                                        formData.location,
                                                                )?.state,
                                                            )}
                                                        </>
                                                    )}
                                            </span>
                                        }
                                    >
                                        <MenuItem value={true}>Yes</MenuItem>
                                        <MenuItem value={false}>No</MenuItem>
                                    </TextField>

                                    <TextField
                                        name="vehicle_class"
                                        select
                                        label="Vehicle Classification (if applicable)"
                                        value={formData.vehicle_class}
                                        onChange={handleInputChange}
                                        fullWidth
                                        helperText={
                                            <span>
                                                Required for vehicles with
                                                Section 179 deduction. Passenger
                                                autos have lower caps
                                                ($12k-20k). SUVs 6,000-14,000
                                                lbs GVWR have mid-range caps
                                                (~$28k-32k). Heavy vehicles
                                                &gt;14,000 lbs have no special
                                                caps. See{" "}
                                                <Link
                                                    href="https://www.irs.gov/publications/p946#en_US_2023_publink1000107484"
                                                    target="_blank"
                                                    rel="noopener"
                                                >
                                                    IRS Pub 946 - Listed
                                                    Property
                                                </Link>{" "}
                                                for vehicle definitions and{" "}
                                                <Link
                                                    href="https://www.irs.gov/pub/irs-drop/rp-23-34.pdf"
                                                    target="_blank"
                                                    rel="noopener"
                                                >
                                                    Rev. Proc. 2023-34
                                                </Link>{" "}
                                                for current year limits.
                                            </span>
                                        }
                                    >
                                        <MenuItem value="UNKNOWN">
                                            Unknown / Not a Vehicle
                                        </MenuItem>
                                        <MenuItem value="PASSENGER_AUTO">
                                            Passenger Automobile
                                        </MenuItem>
                                        <MenuItem value="SUV_LIMITED_179">
                                            SUV/Truck/Van (6,000-14,000 lbs)
                                        </MenuItem>
                                        <MenuItem value="HEAVY_TRUCK_NOT_LIMITED_179">
                                            Heavy Vehicle (&gt;14,000 lbs)
                                        </MenuItem>
                                    </TextField>

                                    <TextField
                                        name="section179_elected"
                                        label="Section 179 Election Amount"
                                        type="number"
                                        value={formData.section179_elected}
                                        onChange={handleInputChange}
                                        fullWidth
                                        InputProps={{
                                            startAdornment: "$",
                                        }}
                                        inputProps={{
                                            step: "1",
                                            min: "0",
                                        }}
                                        helperText={
                                            <span>
                                                Amount elected for immediate
                                                Section 179 expensing. See{" "}
                                                <Link
                                                    href="https://www.irs.gov/publications/p946#en_US_2023_publink1000107488"
                                                    target="_blank"
                                                    rel="noopener"
                                                >
                                                    IRS Pub 946 - Section 179
                                                    Deduction
                                                </Link>
                                                {formData.location &&
                                                    locations.find(
                                                        (l) =>
                                                            l.Alias ===
                                                            formData.location,
                                                    )?.state && (
                                                        <>
                                                            {" "}
                                                            |{" "}
                                                            {getStateSection179Link(
                                                                locations.find(
                                                                    (l) =>
                                                                        l.Alias ===
                                                                        formData.location,
                                                                )?.state,
                                                            )}
                                                        </>
                                                    )}
                                            </span>
                                        }
                                    />

                                    <TextField
                                        name="convention"
                                        select
                                        label="Depreciation Convention"
                                        value={formData.convention}
                                        onChange={handleInputChange}
                                        fullWidth
                                        helperText="Determines first-year depreciation timing. Half-year (most common) assumes mid-year placement. Mid-quarter applies if >40% of year's assets placed in Q4."
                                    >
                                        <MenuItem value="half-year">
                                            Half-Year Convention (default)
                                        </MenuItem>
                                        <MenuItem value="mid-quarter">
                                            Mid-Quarter Convention
                                        </MenuItem>
                                        <MenuItem value="mid-month">
                                            Mid-Month Convention (real property)
                                        </MenuItem>
                                    </TextField>

                                    {formData.placed_in_service_date && (
                                        <Box
                                            sx={{
                                                mt: 2,
                                                p: 2,
                                                bgcolor: "info.lighter",
                                                borderRadius: 1,
                                            }}
                                        >
                                            <Typography
                                                variant="body2"
                                                color="info.dark"
                                                gutterBottom
                                            >
                                                <strong>
                                                    Tax Year{" "}
                                                    {new Date(
                                                        formData.placed_in_service_date,
                                                    ).getFullYear()}{" "}
                                                    IRS Limits:
                                                </strong>
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                • Bonus Depreciation:{" "}
                                                {new Date(
                                                    formData.placed_in_service_date,
                                                ).getFullYear() === 2024
                                                    ? "60%"
                                                    : new Date(
                                                            formData.placed_in_service_date,
                                                        ).getFullYear() === 2025
                                                      ? "40%"
                                                      : new Date(
                                                              formData.placed_in_service_date,
                                                          ).getFullYear() ===
                                                          2026
                                                        ? "20%"
                                                        : new Date(
                                                                formData.placed_in_service_date,
                                                            ).getFullYear() >=
                                                            2027
                                                          ? "0%"
                                                          : new Date(
                                                                  formData.placed_in_service_date,
                                                              ).getFullYear() <=
                                                              2022
                                                            ? "100%"
                                                            : "80%"}
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                • Section 179 Overall Limit:
                                                $1,220,000 (per company, 2024)
                                            </Typography>
                                            {formData.vehicle_class ===
                                                "SUV_LIMITED_179" && (
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                >
                                                    • SUV Section 179 Cap:
                                                    $30,500 (2024)
                                                </Typography>
                                            )}
                                            {formData.vehicle_class ===
                                                "PASSENGER_AUTO" && (
                                                <Typography
                                                    variant="body2"
                                                    color="warning.dark"
                                                >
                                                    • Passenger Auto Year 1 Cap:
                                                    $20,400 (with bonus) or
                                                    $12,400 (no bonus) - 2024
                                                </Typography>
                                            )}
                                        </Box>
                                    )}

                                    {/* Disposal Tracking Section */}
                                    {formData.placed_in_service_date && (
                                        <Box
                                            sx={{
                                                mt: 3,
                                                p: 2,
                                                border: "1px solid",
                                                borderColor: "divider",
                                                borderRadius: 1,
                                            }}
                                        >
                                            <Typography
                                                variant="subtitle2"
                                                gutterBottom
                                                sx={{ mb: 2 }}
                                            >
                                                Asset Disposal (if applicable)
                                            </Typography>

                                            <TextField
                                                name="disposal_date"
                                                label="Disposal Date"
                                                type="date"
                                                value={formData.disposal_date}
                                                onChange={handleInputChange}
                                                fullWidth
                                                InputLabelProps={{
                                                    shrink: true,
                                                }}
                                                helperText="Date asset was sold, traded, scrapped, or donated. Stops depreciation."
                                                sx={{ mb: 2 }}
                                            />

                                            {formData.disposal_date && (
                                                <>
                                                    <TextField
                                                        name="disposal_method"
                                                        select
                                                        label="Disposal Method"
                                                        value={
                                                            formData.disposal_method
                                                        }
                                                        onChange={
                                                            handleInputChange
                                                        }
                                                        fullWidth
                                                        sx={{ mb: 2 }}
                                                    >
                                                        <MenuItem value="sold">
                                                            Sold
                                                        </MenuItem>
                                                        <MenuItem value="traded">
                                                            Traded In
                                                        </MenuItem>
                                                        <MenuItem value="scrapped">
                                                            Scrapped/Junked
                                                        </MenuItem>
                                                        <MenuItem value="donated">
                                                            Donated
                                                        </MenuItem>
                                                        <MenuItem value="stolen">
                                                            Stolen/Lost
                                                        </MenuItem>
                                                    </TextField>

                                                    {(formData.disposal_method ===
                                                        "sold" ||
                                                        formData.disposal_method ===
                                                            "traded") && (
                                                        <TextField
                                                            name="sale_proceeds"
                                                            label="Sale/Trade-In Proceeds"
                                                            type="number"
                                                            value={
                                                                formData.sale_proceeds
                                                            }
                                                            onChange={
                                                                handleInputChange
                                                            }
                                                            fullWidth
                                                            InputProps={{
                                                                startAdornment:
                                                                    "$",
                                                            }}
                                                            inputProps={{
                                                                step: "0.01",
                                                                min: "0",
                                                            }}
                                                            helperText="Amount received from sale or trade-in. Used to compute gain/loss and potential recapture. See IRS Form 4797."
                                                        />
                                                    )}

                                                    <Box
                                                        sx={{
                                                            mt: 2,
                                                            p: 1.5,
                                                            bgcolor:
                                                                "warning.lighter",
                                                            borderRadius: 1,
                                                        }}
                                                    >
                                                        <Typography
                                                            variant="caption"
                                                            color="warning.dark"
                                                        >
                                                            <strong>
                                                                Note:
                                                            </strong>{" "}
                                                            Disposition of asset
                                                            may trigger
                                                            depreciation
                                                            recapture (IRC
                                                            §1245) and must be
                                                            reported on IRS Form
                                                            4797. Consult tax
                                                            advisor for proper
                                                            reporting.
                                                        </Typography>
                                                    </Box>
                                                </>
                                            )}
                                        </Box>
                                    )}
                                </Box>
                            </AccordionDetails>
                        </Accordion>
                        {/* End Depreciation Section */}
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
                                    placeholder="Search by name, serial, description, or location"
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
            <Dialog
                open={openReserveDialog}
                onClose={handleCloseReserveDialog}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Reserve {equipment?.name}</DialogTitle>
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
                            label="Start Time"
                            type="datetime-local"
                            value={reserveFormData.start_time}
                            onChange={(e) =>
                                setReserveFormData({
                                    ...reserveFormData,
                                    start_time: e.target.value,
                                })
                            }
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            label="End Time"
                            type="datetime-local"
                            value={reserveFormData.end_time}
                            onChange={(e) =>
                                setReserveFormData({
                                    ...reserveFormData,
                                    end_time: e.target.value,
                                })
                            }
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            label="Project Number"
                            value={reserveFormData.project_number}
                            onChange={(e) =>
                                setReserveFormData({
                                    ...reserveFormData,
                                    project_number: e.target.value,
                                })
                            }
                            fullWidth
                            required
                        />
                        <TextField
                            label="Scheduled On Behalf Of (optional)"
                            value={reserveFormData.scheduled_on_behalf_of}
                            onChange={(e) =>
                                setReserveFormData({
                                    ...reserveFormData,
                                    scheduled_on_behalf_of: e.target.value,
                                })
                            }
                            fullWidth
                        />
                        <TextField
                            label="Notes (optional)"
                            value={reserveFormData.notes}
                            onChange={(e) =>
                                setReserveFormData({
                                    ...reserveFormData,
                                    notes: e.target.value,
                                })
                            }
                            fullWidth
                            multiline
                            rows={3}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseReserveDialog}>Cancel</Button>
                    <Button
                        onClick={handleReserveSubmit}
                        variant="contained"
                        sx={{
                            backgroundColor: "lightgreen",
                            color: "black",
                            ":hover": {
                                backgroundColor: "green",
                                color: "white",
                            },
                        }}
                    >
                        Create Reservation
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default EquipmentDetails;
