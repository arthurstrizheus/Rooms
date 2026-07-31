/**
 * Concourse atoms local to the Rooms page.
 *
 * These three are NOT in `ConcourseDialogKit.jsx`:
 *   - `Sk` / `StateBlock` are copied verbatim from the reference implementation
 *     (`src/Views/Pages/Calendar/index.jsx:349-367` and `:503-543`), which does
 *     not export them. Page Adoption Guide §3.7 says to copy them.
 *   - `ColorSwatch` has no kit equivalent — nothing in the kit paints an
 *     arbitrary per-record hex. It is `controlBox`'s border colour + the
 *     radius ladder, nothing new.
 *
 * All three are candidates for promotion into the kit — flagged for the
 * integrator. Nothing here reads `theme.palette.*` or branches on `mode`.
 */

import { Box } from "@mui/material";
import { type as ccType } from "../../../../Utilites/concourse";

/* --------------------------------------------------------------- skeleton --- */

/** Guide §3.7 skeleton primitive, verbatim from `Calendar/index.jsx:349-367`. */
export const skSx = {
    position: "relative",
    overflow: "hidden",
    background: "currentColor",
    opacity: 0.08,
    color: "var(--cc-ink)",
    borderRadius: "99px",
    boxSizing: "border-box",
    "&::after": {
        content: '""',
        position: "absolute",
        inset: 0,
        transform: "translateX(-100%)",
        background:
            "linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent)",
        animation: "cc-shim 1400ms infinite",
    },
};

export const Sk = ({ sx }) => <Box sx={{ ...skSx, ...sx }} />;

/* -------------------------------------------------------- empty / error ---- */

/** Guide §3.7 `StateBlock`, verbatim from `Calendar/index.jsx:503-543`. */
export const StateBlock = ({ icon, danger, title, body, actions }) => (
    <Box
        sx={{
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            padding: "52px 26px",
            gap: "11px",
            boxSizing: "border-box",
        }}
    >
        <Box
            aria-hidden="true"
            sx={{
                width: "56px",
                height: "56px",
                borderRadius: "20px",
                display: "grid",
                placeItems: "center",
                fontSize: "23px",
                boxSizing: "border-box",
                boxShadow: "var(--cc-sh1)",
                background: danger ? "var(--cc-wash)" : "var(--cc-srf2)",
                color: danger ? "var(--cc-red)" : "var(--cc-ink)",
            }}
        >
            {icon}
        </Box>
        <Box sx={{ ...ccType.stateTitle }}>{title}</Box>
        <Box sx={{ ...ccType.stateBody, color: "var(--cc-mute)" }}>{body}</Box>
        <Box
            sx={{
                display: "flex",
                gap: "9px",
                flexWrap: "wrap",
                justifyContent: "center",
                marginTop: "4px",
            }}
        >
            {actions}
        </Box>
    </Box>
);

/* ------------------------------------------------------------- colour bit --- */

/**
 * A room's stored `color` (`backend/models/room.js`) painted as a rounded
 * rect. `Room.color` is `allowNull: true`, so a falsy colour renders NOTHING
 * rather than an empty box or a placeholder dash (Guide §7.4).
 */
export const ColorSwatch = ({ color, width = 34, height = 20 }) =>
    color ? (
        <Box
            role="img"
            aria-label={color}
            sx={{
                display: "inline-block",
                width: `${width}px`,
                height: `${height}px`,
                flex: "none",
                borderRadius: "7px",
                border: "1px solid var(--cc-line)",
                boxSizing: "border-box",
                background: color,
            }}
        />
    ) : null;
