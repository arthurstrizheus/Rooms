import React from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    IconButton,
} from "@mui/material";
import {
    ErrorOutline as ErrorIcon,
    WarningAmber as WarningIcon,
    Info as InfoIcon,
    CheckCircleOutline as SuccessIcon,
    Close as CloseIcon,
} from "@mui/icons-material";

/**
 * Custom Alert Dialog Component
 * Replaces browser alert() with a Material-UI styled dialog
 *
 * @param {Object} props
 * @param {boolean} props.open - Controls dialog visibility
 * @param {function} props.onClose - Callback when dialog closes
 * @param {string} props.title - Dialog title (optional)
 * @param {string} props.message - Main message to display
 * @param {string} props.severity - Type: 'error', 'warning', 'info', 'success' (default: 'info')
 * @param {string} props.confirmText - Text for confirm button (default: 'OK')
 */
const AlertDialog = ({
    open,
    onClose,
    title,
    message,
    severity = "info",
    confirmText = "OK",
}) => {
    const getSeverityIcon = () => {
        switch (severity) {
            case "error":
                return <ErrorIcon sx={{ fontSize: 48, color: "#d32f2f" }} />;
            case "warning":
                return <WarningIcon sx={{ fontSize: 48, color: "#ed6c02" }} />;
            case "success":
                return <SuccessIcon sx={{ fontSize: 48, color: "#2e7d32" }} />;
            case "info":
            default:
                return <InfoIcon sx={{ fontSize: 48, color: "#0288d1" }} />;
        }
    };

    const getSeverityColor = () => {
        switch (severity) {
            case "error":
                return "#d32f2f";
            case "warning":
                return "#ed6c02";
            case "success":
                return "#2e7d32";
            case "info":
            default:
                return "#0288d1";
        }
    };

    const getDefaultTitle = () => {
        switch (severity) {
            case "error":
                return "Error";
            case "warning":
                return "Warning";
            case "success":
                return "Success";
            case "info":
            default:
                return "Information";
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    boxShadow: 3,
                },
            }}
        >
            <DialogTitle
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    pb: 1,
                    borderBottom: `2px solid ${getSeverityColor()}`,
                }}
            >
                <Typography
                    variant="h6"
                    component="div"
                    sx={{ fontWeight: 600 }}
                >
                    {title || getDefaultTitle()}
                </Typography>
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    size="small"
                    sx={{
                        color: (theme) => theme.palette.grey[500],
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 3, pb: 2 }}>
                <div
                    style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "16px",
                    }}
                >
                    <div style={{ flexShrink: 0 }}>{getSeverityIcon()}</div>
                    <Typography
                        variant="body1"
                        sx={{
                            pt: 1,
                            color: "text.primary",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                        }}
                    >
                        {message}
                    </Typography>
                </div>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button
                    onClick={onClose}
                    variant="contained"
                    sx={{
                        minWidth: 100,
                        backgroundColor: getSeverityColor(),
                        "&:hover": {
                            backgroundColor: getSeverityColor(),
                            filter: "brightness(0.9)",
                        },
                    }}
                    autoFocus
                >
                    {confirmText}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AlertDialog;
