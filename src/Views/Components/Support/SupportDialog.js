import React from "react";
import {
    Button,
    Stack,
    TextField,
    MenuItem,
    Chip,
    Typography,
    Alert,
    CircularProgress,
} from "@mui/material";
import SupportAgentOutlinedIcon from "@mui/icons-material/SupportAgentOutlined";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import SendIcon from "@mui/icons-material/Send";
import { useLocation } from "react-router-dom";
import ResponsiveDialog from "../UI/ResponsiveDialog";
import { CreateSupportTicket, showSuccess } from "../../../Utilites/Functions/ApiFunctions";

/**
 * Raise a help desk ticket without leaving the app.
 *
 * The categories mirror the server's list in `supportController.CATEGORIES` —
 * an unknown value there falls back to "other", so the two drifting apart
 * degrades quietly rather than failing.
 */
const CATEGORIES = [
    { value: "equipment-issue", label: "Equipment damaged, broken or missing" },
    { value: "calibration", label: "Calibration or certification problem" },
    { value: "booking", label: "Problem with a reservation" },
    { value: "access", label: "Access or permissions" },
    { value: "other", label: "Something else" },
];

const MAX_DETAILS = 4000;

export default function SupportDialog({
    open,
    onClose,
    equipmentId,
    equipmentName,
    defaultCategory,
}) {
    const location = useLocation();

    const [category, setCategory] = React.useState("other");
    const [subject, setSubject] = React.useState("");
    const [details, setDetails] = React.useState("");
    const [sending, setSending] = React.useState(false);
    const [error, setError] = React.useState("");

    // Reset on each open so a previous request never bleeds into the next one.
    React.useEffect(() => {
        if (!open) return;
        setCategory(
            defaultCategory ||
                (equipmentId ? "equipment-issue" : "other"),
        );
        setSubject("");
        setDetails("");
        setError("");
        setSending(false);
    }, [open, defaultCategory, equipmentId]);

    const canSend = subject.trim() && details.trim() && !sending;

    const handleSend = async () => {
        setSending(true);
        setError("");

        const result = await CreateSupportTicket({
            category,
            subject: subject.trim(),
            details: details.trim(),
            equipmentId,
            // Where they were when it went wrong is usually the first thing IT
            // asks for, and the user shouldn't have to describe it.
            pageUrl: `${window.location.origin}${location.pathname}${location.search}`,
        });

        setSending(false);

        if (!result.ok) {
            setError(result.message);
            return;
        }

        showSuccess(result.message);
        onClose?.();
    };

    return (
        <ResponsiveDialog
            open={open}
            onClose={sending ? undefined : onClose}
            title={equipmentName ? "Report a problem" : "Get help"}
            subtitle={
                equipmentName
                    ? "This goes to the IT help desk with the equipment details attached."
                    : "This creates a ticket with the IT help desk. They'll reply by email."
            }
            icon={
                equipmentName ? (
                    <BuildOutlinedIcon />
                ) : (
                    <SupportAgentOutlinedIcon />
                )
            }
            maxWidth="sm"
            actions={
                <>
                    <Button onClick={onClose} disabled={sending}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSend}
                        disabled={!canSend}
                        startIcon={
                            sending ? (
                                <CircularProgress size={16} color="inherit" />
                            ) : (
                                <SendIcon />
                            )
                        }
                    >
                        {sending ? "Sending…" : "Send request"}
                    </Button>
                </>
            }
        >
            <Stack spacing={2.5}>
                {error && (
                    <Alert severity="error" onClose={() => setError("")}>
                        {error}
                    </Alert>
                )}

                {equipmentName && (
                    <Stack spacing={0.75}>
                        <Typography variant="overline" color="text.disabled">
                            About this equipment
                        </Typography>
                        <Chip
                            label={equipmentName}
                            color="primary"
                            variant="outlined"
                            sx={{ alignSelf: "flex-start", fontWeight: 600 }}
                        />
                    </Stack>
                )}

                <TextField
                    select
                    label="What's wrong?"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    fullWidth
                >
                    {CATEGORIES.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                            {option.label}
                        </MenuItem>
                    ))}
                </TextField>

                <TextField
                    label="Summary"
                    placeholder="One line — this becomes the ticket subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    fullWidth
                    required
                    inputProps={{ maxLength: 150 }}
                />

                <TextField
                    label="What happened?"
                    placeholder="What you were doing, what you expected, and what happened instead."
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    fullWidth
                    required
                    multiline
                    minRows={4}
                    inputProps={{ maxLength: MAX_DETAILS }}
                    helperText={`${details.length} / ${MAX_DETAILS}`}
                />

                <Typography variant="caption" color="text.disabled">
                    Your name, email and the page you're on are attached
                    automatically.
                </Typography>
            </Stack>
        </ResponsiveDialog>
    );
}
