import React from "react";
import { Button, Typography } from "@mui/material";
import {
    HelpOutline as QuestionIcon,
    WarningAmber as WarningIcon,
    DeleteOutline as DeleteIcon,
} from "@mui/icons-material";
import ResponsiveDialog from "../Views/Components/UI/ResponsiveDialog";

/**
 * Replacement for browser confirm().
 *
 * `severity` picks the accent and the confirm button's color, so a destructive
 * confirmation reads as destructive rather than as another blue OK.
 *
 * @param {boolean} open
 * @param {function} onConfirm
 * @param {function} onCancel
 * @param {string} title
 * @param {string} message
 * @param {string} confirmText
 * @param {string} cancelText
 * @param {'question'|'warning'|'danger'} severity
 */
const SEVERITY = {
    question: { accent: "info", Icon: QuestionIcon, title: "Confirm Action" },
    warning: { accent: "warning", Icon: WarningIcon, title: "Warning" },
    danger: { accent: "error", Icon: DeleteIcon, title: "Are you sure?" },
};

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
    const { accent, Icon, title: fallbackTitle } =
        SEVERITY[severity] || SEVERITY.question;

    return (
        <ResponsiveDialog
            open={open}
            onClose={onCancel}
            title={title || fallbackTitle}
            icon={<Icon />}
            accent={accent}
            maxWidth="sm"
            fullScreen={false}
            actions={
                <>
                    <Button onClick={onCancel} variant="outlined">
                        {cancelText}
                    </Button>
                    <Button
                        onClick={onConfirm}
                        variant="contained"
                        color={accent}
                        autoFocus
                        sx={{ minWidth: 108 }}
                    >
                        {confirmText}
                    </Button>
                </>
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

export default ConfirmDialog;
