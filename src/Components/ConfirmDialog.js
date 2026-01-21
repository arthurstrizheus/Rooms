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
    HelpOutline as QuestionIcon,
    WarningAmber as WarningIcon,
    Close as CloseIcon,
} from "@mui/icons-material";

/**
 * Custom Confirmation Dialog Component
 * Replaces browser window.confirm() with a Material-UI styled dialog
 *
 * @param {Object} props
 * @param {boolean} props.open - Controls dialog visibility
 * @param {function} props.onConfirm - Callback when user confirms
 * @param {function} props.onCancel - Callback when user cancels
 * @param {string} props.title - Dialog title (optional)
 * @param {string} props.message - Main message to display
 * @param {string} props.confirmText - Text for confirm button (default: 'Confirm')
 * @param {string} props.cancelText - Text for cancel button (default: 'Cancel')
 * @param {string} props.severity - 'warning' or 'question' (default: 'question')
 */
const ConfirmDialog = ({
    open,
    onConfirm,
    onCancel,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    severity = "question",
}) => {
    const getSeverityIcon = () => {
        switch (severity) {
            case "warning":
                return <WarningIcon sx={{ fontSize: 48, color: "#ed6c02" }} />;
            case "question":
            default:
                return <QuestionIcon sx={{ fontSize: 48, color: "#0288d1" }} />;
        }
    };

    const getSeverityColor = () => {
        switch (severity) {
            case "warning":
                return "#ed6c02";
            case "question":
            default:
                return "#0288d1";
        }
    };

    const getDefaultTitle = () => {
        switch (severity) {
            case "warning":
                return "Warning";
            case "question":
            default:
                return "Confirm Action";
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onCancel}
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
                    onClick={onCancel}
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
            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                <Button
                    onClick={onCancel}
                    variant="outlined"
                    sx={{
                        minWidth: 100,
                        color: "text.secondary",
                        borderColor: "divider",
                    }}
                >
                    {cancelText}
                </Button>
                <Button
                    onClick={onConfirm}
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

export default ConfirmDialog;
