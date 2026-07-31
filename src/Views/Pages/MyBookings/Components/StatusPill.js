/**
 * Booking status pill — Concourse §4.10 geometry.
 *
 * The five status strings are the ones the backend actually writes
 * (`meetingControler.js`): Approved, Waiting on Approval, Canceled (one L),
 * Declined, Deleted. Nothing is invented here — an unrecognised string falls
 * back to the neutral tone and is rendered verbatim, and an absent status
 * renders nothing at all rather than an empty pill.
 *
 * Local to the MyBookings page. Candidate for promotion into the kit once the
 * ApprovalQueue lane lands its own copy (see the report).
 */

import { Box } from "@mui/material";

/** §4.10 — colour is a text colour; there is no `ok` surface in this system. */
export const STATUS_TONE = {
    Approved: { color: "var(--cc-ok)", background: "var(--cc-srf2)" },
    "Waiting on Approval": {
        color: "var(--cc-mute)",
        background: "var(--cc-srf2)",
    },
    Canceled: { color: "var(--cc-mute)", background: "var(--cc-srf2)" },
    Declined: { color: "var(--cc-red)", background: "var(--cc-wash)" },
    // `Deleted` is a real, shipped fifth value. It means the same thing as
    // `Canceled` — "this booking no longer exists" — so it takes the same
    // treatment rather than a new colour. No new token, no new idiom.
    Deleted: { color: "var(--cc-mute)", background: "var(--cc-srf2)" },
};

const NEUTRAL = STATUS_TONE["Waiting on Approval"];

/**
 * @param {string}  status      the raw status string, rendered verbatim
 * @param {boolean} onRecessed  true when the pill sits on a `srf2` ground, so
 *                              the neutral fill inverts to `srf` (the same
 *                              inversion `Tag` uses) and does not vanish
 */
export const StatusPill = ({ status, onRecessed, sx }) => {
    if (!status) return null;
    const tone = STATUS_TONE[status] || NEUTRAL;
    const background =
        onRecessed && tone.background === "var(--cc-srf2)"
            ? "var(--cc-srf)"
            : tone.background;

    return (
        <Box
            component="span"
            sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                borderRadius: "99px",
                padding: "3px 10px",
                boxSizing: "border-box",
                fontSize: "11px",
                fontWeight: 700,
                whiteSpace: "nowrap",
                color: tone.color,
                background,
                ...sx,
            }}
        >
            <Box
                component="span"
                aria-hidden="true"
                sx={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "99px",
                    background: "currentColor",
                    flex: "none",
                }}
            />
            {status}
        </Box>
    );
};

export default StatusPill;
