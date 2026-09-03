import React from "react";
import { Button, Typography } from "@mui/material";
import {
    ErrorOutline as ErrorIcon,
    WarningAmber as WarningIcon,
    InfoOutlined as InfoIcon,
    CheckCircleOutline as SuccessIcon,
} from "@mui/icons-material";
import ResponsiveDialog from "../Views/Components/UI/ResponsiveDialog";

/**
 * Replacement for browser alert().
 *
 * Now built on ResponsiveDialog, so it inherits the app's dialog chrome:
 * full screen with a slide-up on phones, sticky footer, safe-area padding.
 * Severity drives the accent color from the theme palette rather than the
 * hardcoded hex values this used to carry.
 *
 * @param {boolean} open
 * @param {function} onClose
 * @param {string} title      Optional; defaults per severity.
 * @param {string} message
 * @param {'error'|'warning'|'info'|'success'} severity
 * @param {string} confirmText
 */
const SEVERITY = {
    error: { accent: "error", Icon: ErrorIcon, title: "Error" },
    warning: { accent: "warning", Icon: WarningIcon, title: "Warning" },
    success: { accent: "success", Icon: SuccessIcon, title: "Success" },
    info: { accent: "info", Icon: InfoIcon, title: "Information" },
};

const AlertDialog = ({
    open,
    onClose,
    title,
    message,
    severity = "info",
    confirmText = "OK",
}) => {
    const { accent, Icon, title: fallbackTitle } =
        SEVERITY[severity] || SEVERITY.info;

    return (
        <ResponsiveDialog
            open={open}
            onClose={onClose}
            title={title || fallbackTitle}
            icon={<Icon />}
            accent={accent}
            maxWidth="sm"
            // A one-button acknowledgement doesn't need to eat a whole phone
            // screen the way a form does.
            fullScreen={false}
            actions={
                <Button
                    onClick={onClose}
                    variant="contained"
                    color={accent}
                    autoFocus
                    sx={{ minWidth: 108 }}
                >
                    {confirmText}
                </Button>
            }
        >
            <Typography
                variant="body1"
                sx={{
                    color: "text.primary",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                }}
            >
                {message}
            </Typography>
        </ResponsiveDialog>
    );
};

export default AlertDialog;
