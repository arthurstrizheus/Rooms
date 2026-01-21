import React, { useState } from "react";
import {
    Card,
    CardContent,
    Typography,
    Divider,
    Grid,
    Box,
    IconButton,
    Tooltip,
    Button,
} from "@mui/material";
import { Delete, Download, History } from "@mui/icons-material";
import { format } from "date-fns";
import AlertDialog from "../../../../Components/AlertDialog";
import useAlertDialog from "../../../../hooks/useAlertDialog";

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
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Download failed");
            }

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

    const calibrationItems = [
        {
            label: "Last Calibration Date",
            value: equipment.last_calibration_date
                ? format(new Date(equipment.last_calibration_date), "PPP")
                : "N/A",
        },
        {
            label: "Calibration Due Date",
            value: equipment.calibration_due_date
                ? format(new Date(equipment.calibration_due_date), "PPP")
                : "N/A",
        },
        {
            label: "Calibration Interval",
            value: equipment.calibration_interval_days
                ? `${equipment.calibration_interval_days} days`
                : "N/A",
        },
    ];

    return (
        <>
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Calibration Information
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    <Grid container spacing={2}>
                        {calibrationItems.map((item, index) => (
                            <Grid item xs={12} sm={6} key={index}>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    {item.label}
                                </Typography>
                                <Typography variant="body1" sx={{ mt: 0.5 }}>
                                    {item.value}
                                </Typography>
                            </Grid>
                        ))}
                    </Grid>

                    {/* Files & Documents */}
                    {(manualFiles.length > 0 ||
                        certFiles.length > 0 ||
                        otherFiles.length > 0) && (
                        <Box sx={{ mt: 3 }}>
                            <Typography
                                variant="subtitle1"
                                sx={{ mb: 1, fontWeight: 600 }}
                            >
                                Files & Documents
                            </Typography>
                            <Divider sx={{ mb: 2 }} />

                            {manualFiles.length > 0 && (
                                <Box sx={{ mb: 2 }}>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            mb: 1,
                                        }}
                                    >
                                        <Typography
                                            variant="subtitle2"
                                            color="primary"
                                            sx={{ fontWeight: 600 }}
                                        >
                                            Manuals
                                        </Typography>
                                        {manualFiles.length > 1 && (
                                            <Button
                                                size="small"
                                                startIcon={<History />}
                                                onClick={() =>
                                                    onViewHistory(
                                                        "Manuals",
                                                        manualFiles
                                                    )
                                                }
                                                variant="outlined"
                                            >
                                                View All ({manualFiles.length})
                                            </Button>
                                        )}
                                    </Box>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            py: 1,
                                            borderBottom: "1px solid",
                                            borderColor: "divider",
                                        }}
                                    >
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="body2" noWrap>
                                                {manualFiles[0].file_name}
                                            </Typography>
                                            {manualFiles[0].description && (
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    sx={{ fontStyle: "italic" }}
                                                >
                                                    {manualFiles[0].description}
                                                </Typography>
                                            )}
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                display="block"
                                            >
                                                Uploaded:{" "}
                                                {new Date(
                                                    manualFiles[0].upload_date
                                                ).toLocaleDateString()}
                                            </Typography>
                                        </Box>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                gap: 1,
                                                ml: 1,
                                            }}
                                        >
                                            <Tooltip title="Download">
                                                <IconButton
                                                    size="small"
                                                    onClick={() =>
                                                        handleDownload(
                                                            manualFiles[0].id,
                                                            manualFiles[0]
                                                                .file_name
                                                        )
                                                    }
                                                    sx={{
                                                        bgcolor: "primary.main",
                                                        color: "white",
                                                        "&:hover": {
                                                            bgcolor:
                                                                "primary.dark",
                                                        },
                                                    }}
                                                >
                                                    <Download fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            {canEditDelete &&
                                                canEditDelete() && (
                                                    <Tooltip title="Delete">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() =>
                                                                handleDeleteFile(
                                                                    manualFiles[0]
                                                                        .id
                                                                )
                                                            }
                                                            sx={{
                                                                bgcolor:
                                                                    "error.main",
                                                                color: "white",
                                                                "&:hover": {
                                                                    bgcolor:
                                                                        "error.dark",
                                                                },
                                                            }}
                                                        >
                                                            <Delete fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                        </Box>
                                    </Box>
                                </Box>
                            )}

                            {certFiles.length > 0 && (
                                <Box sx={{ mb: 2 }}>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            mb: 1,
                                        }}
                                    >
                                        <Typography
                                            variant="subtitle2"
                                            color="primary"
                                            sx={{ fontWeight: 600 }}
                                        >
                                            Calibration Certificates
                                        </Typography>
                                        {certFiles.length > 1 && (
                                            <Button
                                                size="small"
                                                startIcon={<History />}
                                                onClick={() =>
                                                    onViewHistory(
                                                        "Calibration Certificates",
                                                        certFiles
                                                    )
                                                }
                                                variant="outlined"
                                            >
                                                View All ({certFiles.length})
                                            </Button>
                                        )}
                                    </Box>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            py: 1,
                                            borderBottom: "1px solid",
                                            borderColor: "divider",
                                        }}
                                    >
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="body2" noWrap>
                                                {certFiles[0].file_name}
                                            </Typography>
                                            {certFiles[0].description && (
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    sx={{ fontStyle: "italic" }}
                                                >
                                                    {certFiles[0].description}
                                                </Typography>
                                            )}
                                            {certFiles[0].calibration_date && (
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    display="block"
                                                >
                                                    Calibration Date:{" "}
                                                    {new Date(
                                                        certFiles[0].calibration_date
                                                    ).toLocaleDateString()}
                                                </Typography>
                                            )}
                                        </Box>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                gap: 1,
                                                ml: 1,
                                            }}
                                        >
                                            <Tooltip title="Download">
                                                <IconButton
                                                    size="small"
                                                    onClick={() =>
                                                        handleDownload(
                                                            certFiles[0].id,
                                                            certFiles[0]
                                                                .file_name
                                                        )
                                                    }
                                                    sx={{
                                                        bgcolor: "primary.main",
                                                        color: "white",
                                                        "&:hover": {
                                                            bgcolor:
                                                                "primary.dark",
                                                        },
                                                    }}
                                                >
                                                    <Download fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            {canEditDelete &&
                                                canEditDelete() && (
                                                    <Tooltip title="Delete">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() =>
                                                                handleDeleteFile(
                                                                    certFiles[0]
                                                                        .id
                                                                )
                                                            }
                                                            sx={{
                                                                bgcolor:
                                                                    "error.main",
                                                                color: "white",
                                                                "&:hover": {
                                                                    bgcolor:
                                                                        "error.dark",
                                                                },
                                                            }}
                                                        >
                                                            <Delete fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                        </Box>
                                    </Box>
                                </Box>
                            )}

                            {otherFiles.length > 0 && (
                                <Box>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            mb: 1,
                                        }}
                                    >
                                        <Typography
                                            variant="subtitle2"
                                            color="primary"
                                            sx={{ fontWeight: 600 }}
                                        >
                                            Other Files
                                        </Typography>
                                        {otherFiles.length > 1 && (
                                            <Button
                                                size="small"
                                                startIcon={<History />}
                                                onClick={() =>
                                                    onViewHistory(
                                                        "Other Files",
                                                        otherFiles
                                                    )
                                                }
                                                variant="outlined"
                                            >
                                                View All ({otherFiles.length})
                                            </Button>
                                        )}
                                    </Box>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            py: 1,
                                            borderBottom: "1px solid",
                                            borderColor: "divider",
                                        }}
                                    >
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="body2" noWrap>
                                                {otherFiles[0].file_name}
                                            </Typography>
                                            {otherFiles[0].description && (
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    sx={{ fontStyle: "italic" }}
                                                >
                                                    {otherFiles[0].description}
                                                </Typography>
                                            )}
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                display="block"
                                            >
                                                Uploaded:{" "}
                                                {new Date(
                                                    otherFiles[0].upload_date
                                                ).toLocaleDateString()}
                                            </Typography>
                                        </Box>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                gap: 1,
                                                ml: 1,
                                            }}
                                        >
                                            <Tooltip title="Download">
                                                <IconButton
                                                    size="small"
                                                    onClick={() =>
                                                        handleDownload(
                                                            otherFiles[0].id,
                                                            otherFiles[0]
                                                                .file_name
                                                        )
                                                    }
                                                    sx={{
                                                        bgcolor: "primary.main",
                                                        color: "white",
                                                        "&:hover": {
                                                            bgcolor:
                                                                "primary.dark",
                                                        },
                                                    }}
                                                >
                                                    <Download fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            {canEditDelete &&
                                                canEditDelete() && (
                                                    <Tooltip title="Delete">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() =>
                                                                handleDeleteFile(
                                                                    otherFiles[0]
                                                                        .id
                                                                )
                                                            }
                                                            sx={{
                                                                bgcolor:
                                                                    "error.main",
                                                                color: "white",
                                                                "&:hover": {
                                                                    bgcolor:
                                                                        "error.dark",
                                                                },
                                                            }}
                                                        >
                                                            <Delete fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                        </Box>
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    )}
                </CardContent>
            </Card>
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
