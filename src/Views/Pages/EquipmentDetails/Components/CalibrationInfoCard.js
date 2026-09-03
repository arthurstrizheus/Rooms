import React from "react";
import {
    Typography,
    Grid,
    Box,
    IconButton,
    Tooltip,
    Button,
    Stack,
    Divider,
} from "@mui/material";
import {
    Delete,
    Download,
    History,
    StraightenOutlined,
    FolderOutlined,
    InsertDriveFileOutlined,
} from "@mui/icons-material";
import { format } from "date-fns";
import AlertDialog from "../../../../Components/AlertDialog";
import useAlertDialog from "../../../../hooks/useAlertDialog";
import SectionCard from "../../../Components/UI/SectionCard";
import DetailField from "../../../Components/UI/DetailField";

/**
 * Calibration status plus the latest file in each document category.
 *
 * The three file groups (manuals, certificates, other) previously repeated the
 * same ~150-line block three times with only the array swapped. They now share
 * one `FileGroup`, so a change to the row layout happens in one place.
 */

const CALIBRATION_TONES = {
    unknown: {
        color: "text.secondary",
        bg: "grey.100",
        border: "rgba(20, 24, 31, 0.10)",
    },
    good: {
        color: "success.dark",
        bg: "success.light",
        border: "rgba(30, 158, 82, 0.24)",
    },
    soon: {
        color: "warning.dark",
        bg: "warning.light",
        border: "rgba(199, 119, 0, 0.24)",
    },
    overdue: {
        color: "error.dark",
        bg: "error.light",
        border: "rgba(200, 16, 46, 0.24)",
    },
};

const CalibrationInfoCard = ({
    equipment,
    manualFiles = [],
    certFiles = [],
    otherFiles = [],
    canEditDelete,
    handleDeleteFile,
    onViewHistory,
}) => {
    const { showAlert, alertState, hideAlert } = useAlertDialog();

    const handleDownload = async (fileId, fileName) => {
        try {
            const token = localStorage.getItem("authToken");
            const response = await fetch(
                `/api/equipment-files/download/${fileId}`,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            if (!response.ok) throw new Error("Download failed");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error downloading file:", error);
            showAlert("Error downloading file", "error");
        }
    };

    const calculateDueDate = () => {
        if (
            !equipment.last_calibration_date ||
            !equipment.calibration_interval_value
        ) {
            return null;
        }
        const dueDate = new Date(equipment.last_calibration_date);
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
            default:
                break;
        }
        return dueDate;
    };

    const dueDate = calculateDueDate();

    const getCalibrationStatus = () => {
        if (!dueDate) {
            return {
                label:
                    !equipment.calibration_interval_value &&
                    equipment.last_calibration_date
                        ? "No calibration interval set"
                        : "No calibration data",
                tone: CALIBRATION_TONES.unknown,
            };
        }

        const now = new Date();
        const twoMonthsOut = new Date();
        twoMonthsOut.setMonth(twoMonthsOut.getMonth() + 2);

        if (now > dueDate) {
            return {
                label: "Out of calibration",
                tone: CALIBRATION_TONES.overdue,
            };
        }
        if (dueDate <= twoMonthsOut) {
            return {
                label: "Calibration due soon",
                tone: CALIBRATION_TONES.soon,
            };
        }
        return { label: "In calibration", tone: CALIBRATION_TONES.good };
    };

    const calibrationStatus = getCalibrationStatus();

    // ---- One row, reused by every file group -----------------------------

    // A render function rather than an inner component, so the rows aren't
    // remounted every time the parent re-renders.
    const renderFileGroup = ({
        label,
        files,
        historyTitle,
        showCalibrationDate,
    }) => {
        if (files.length === 0) return null;
        const latest = files[0];

        return (
            <Box>
                <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ mb: 1 }}
                >
                    <Typography
                        variant="overline"
                        sx={{ color: "primary.main", flexGrow: 1 }}
                    >
                        {label}
                    </Typography>
                    {files.length > 1 && (
                        <Button
                            size="small"
                            variant="text"
                            startIcon={<History sx={{ fontSize: 16 }} />}
                            onClick={() => onViewHistory(historyTitle, files)}
                        >
                            All {files.length}
                        </Button>
                    )}
                </Stack>

                <Stack
                    direction="row"
                    spacing={1.25}
                    alignItems="center"
                    sx={{
                        p: 1.25,
                        borderRadius: 2.5,
                        border: "1px solid",
                        borderColor: "divider",
                        transition:
                            "background-color 160ms ease, border-color 160ms ease",
                        "&:hover": {
                            bgcolor: "grey.50",
                            borderColor: "grey.300",
                        },
                    }}
                >
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 30,
                            height: 30,
                            borderRadius: 1.75,
                            flexShrink: 0,
                            bgcolor: "grey.100",
                            color: "text.secondary",
                        }}
                    >
                        <InsertDriveFileOutlined sx={{ fontSize: 16 }} />
                    </Box>

                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                            {latest.file_name}
                        </Typography>
                        {latest.description && (
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: "block", fontStyle: "italic" }}
                                noWrap
                            >
                                {latest.description}
                            </Typography>
                        )}
                        <Typography
                            variant="caption"
                            color="text.disabled"
                            sx={{ display: "block" }}
                        >
                            {showCalibrationDate && latest.calibration_date
                                ? `Calibrated ${new Date(
                                      latest.calibration_date,
                                  ).toLocaleDateString()}`
                                : `Uploaded ${new Date(
                                      latest.upload_date,
                                  ).toLocaleDateString()}`}
                        </Typography>
                    </Box>

                    <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                        <Tooltip title="Download">
                            <IconButton
                                size="small"
                                aria-label={`Download ${latest.file_name}`}
                                onClick={() =>
                                    handleDownload(latest.id, latest.file_name)
                                }
                            >
                                <Download sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                        {canEditDelete && canEditDelete() && (
                            <Tooltip title="Delete">
                                <IconButton
                                    size="small"
                                    aria-label={`Delete ${latest.file_name}`}
                                    onClick={() => handleDeleteFile(latest.id)}
                                    sx={{ color: "error.main" }}
                                >
                                    <Delete sx={{ fontSize: 18 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Stack>
                </Stack>
            </Box>
        );
    };

    const hasFiles =
        manualFiles.length > 0 ||
        certFiles.length > 0 ||
        otherFiles.length > 0;

    return (
        <>
            <Stack spacing={{ xs: 2, md: 2.5 }}>
                <SectionCard
                    title="Calibration"
                    icon={<StraightenOutlined />}
                    accent={calibrationStatus.tone.color}
                >
                    <Grid container spacing={2.5}>
                        <Grid item xs={12} sm={6}>
                            <DetailField label="Calibration status">
                                <Box
                                    sx={{
                                        mt: 0.5,
                                        display: "inline-flex",
                                        px: 1.25,
                                        py: 0.5,
                                        borderRadius: 5,
                                        bgcolor: calibrationStatus.tone.bg,
                                        border: "1px solid",
                                        borderColor:
                                            calibrationStatus.tone.border,
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: calibrationStatus.tone.color,
                                            fontWeight: 650,
                                        }}
                                    >
                                        {calibrationStatus.label}
                                    </Typography>
                                </Box>
                            </DetailField>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <DetailField
                                label="Last calibration"
                                value={
                                    equipment.last_calibration_date
                                        ? format(
                                              new Date(
                                                  equipment.last_calibration_date,
                                              ),
                                              "PPP",
                                          )
                                        : null
                                }
                                hideEmpty
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <DetailField
                                label="Due date"
                                value={dueDate ? format(dueDate, "PPP") : null}
                                hideEmpty
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <DetailField
                                label="Interval"
                                value={
                                    equipment.calibration_interval_value
                                        ? `${equipment.calibration_interval_value} ${equipment.calibration_interval_unit}`
                                        : null
                                }
                                hideEmpty
                            />
                        </Grid>
                    </Grid>
                </SectionCard>

                {hasFiles && (
                    <SectionCard
                        title="Files & documents"
                        icon={<FolderOutlined />}
                    >
                        {/* Filtered before rendering so Stack's dividers only
                            land between groups that actually have files. */}
                        <Stack spacing={2.5} divider={<Divider flexItem />}>
                            {[
                                {
                                    label: "Manuals",
                                    historyTitle: "Manuals",
                                    files: manualFiles,
                                },
                                {
                                    label: "Calibration certificates",
                                    historyTitle: "Calibration Certificates",
                                    files: certFiles,
                                    showCalibrationDate: true,
                                },
                                {
                                    label: "Other files",
                                    historyTitle: "Other Files",
                                    files: otherFiles,
                                },
                            ]
                                .filter((group) => group.files.length > 0)
                                .map((group) => (
                                    <React.Fragment key={group.label}>
                                        {renderFileGroup(group)}
                                    </React.Fragment>
                                ))}
                        </Stack>
                    </SectionCard>
                )}
            </Stack>

            <AlertDialog
                open={alertState.open}
                onClose={hideAlert}
                message={alertState.message}
                title={alertState.title}
                severity={alertState.severity}
                confirmText={alertState.confirmText}
            />
        </>
    );
};

export default CalibrationInfoCard;
