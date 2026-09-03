import React from "react";
import { Box, Chip } from "@mui/material";

// ============================================================================
// Status vocabulary
// ----------------------------------------------------------------------------
// Reservation and equipment status was previously colored ad hoc in each page,
// so "Approved" was three different greens. This is the single mapping.
// Each entry is [tone, label]. Tone drives color; label is the display text.
// ============================================================================

const TONES = {
    success: {
        fg: "success.dark",
        bg: "success.light",
        dot: "success.main",
        border: "rgba(30, 158, 82, 0.24)",
    },
    warning: {
        fg: "warning.dark",
        bg: "warning.light",
        dot: "warning.main",
        border: "rgba(199, 119, 0, 0.24)",
    },
    error: {
        fg: "error.dark",
        bg: "error.light",
        dot: "error.main",
        border: "rgba(200, 16, 46, 0.24)",
    },
    info: {
        fg: "info.dark",
        bg: "info.light",
        dot: "info.main",
        border: "rgba(31, 111, 208, 0.24)",
    },
    neutral: {
        fg: "text.secondary",
        bg: "grey.100",
        dot: "grey.400",
        border: "rgba(20, 24, 31, 0.10)",
    },
};

const STATUS_MAP = {
    // Reservation lifecycle
    approved: ["success", "Approved"],
    active: ["success", "Active"],
    available: ["success", "Available"],
    complete: ["neutral", "Complete"],
    completed: ["neutral", "Completed"],
    returned: ["neutral", "Returned"],
    pending: ["warning", "Pending"],
    "pending approval": ["warning", "Pending Approval"],
    requested: ["warning", "Requested"],
    upcoming: ["info", "Upcoming"],
    reserved: ["info", "Reserved"],
    "checked out": ["info", "Checked Out"],
    "in use": ["info", "In Use"],
    declined: ["error", "Declined"],
    denied: ["error", "Denied"],
    rejected: ["error", "Rejected"],
    cancelled: ["neutral", "Cancelled"],
    canceled: ["neutral", "Cancelled"],
    overdue: ["error", "Overdue"],
    late: ["error", "Late"],

    // Equipment condition
    "out of service": ["error", "Out of Service"],
    maintenance: ["warning", "Maintenance"],
    calibration: ["warning", "Calibration Due"],
    "calibration due": ["warning", "Calibration Due"],
    "calibration expired": ["error", "Calibration Expired"],
    retired: ["neutral", "Retired"],
    inactive: ["neutral", "Inactive"],
};

export function statusTone(status) {
    if (!status) return "neutral";
    return STATUS_MAP[String(status).trim().toLowerCase()]?.[0] || "neutral";
}

export function statusLabel(status) {
    if (!status) return "—";
    const key = String(status).trim().toLowerCase();
    return (
        STATUS_MAP[key]?.[1] ||
        // Fall back to Title Case of whatever the backend sent.
        String(status).replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    );
}

/**
 * Status pill with a leading dot.
 *
 * @param {string} status  Any status string; unknown values fall back to neutral.
 * @param {string} tone    Override the derived tone.
 * @param {string} label   Override the derived label.
 * @param {boolean} pulse  Animate the dot — use sparingly, for live states.
 */
export default function StatusChip({
    status,
    tone: toneProp,
    label: labelProp,
    size = "small",
    pulse = false,
    icon,
    sx = {},
    ...rest
}) {
    const tone = TONES[toneProp || statusTone(status)] || TONES.neutral;
    const label = labelProp ?? statusLabel(status);

    return (
        <Chip
            size={size}
            label={label}
            icon={
                icon || (
                    <Box
                        component="span"
                        sx={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            bgcolor: tone.dot,
                            flexShrink: 0,
                            ml: "8px !important",
                            mr: "-2px !important",
                            animation: pulse
                                ? "seaPulseRing 2s ease-out infinite"
                                : "none",
                        }}
                    />
                )
            }
            sx={{
                color: tone.fg,
                bgcolor: tone.bg,
                border: "1px solid",
                borderColor: tone.border,
                fontWeight: 600,
                letterSpacing: "0.005em",
                "& .MuiChip-label": { px: 1 },
                ...sx,
            }}
            {...rest}
        />
    );
}
