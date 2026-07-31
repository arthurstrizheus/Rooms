/**
 * ConcourseDialogKit — the dialog-CONTENT atoms for the Concourse redesign.
 *
 * Scope: everything INSIDE a dialog frame. Header, body, fields, footers,
 * scope options, facts, blocks. Recipes transcribed from ARBITER-concourse.md
 * §10.17–§10.27 (plus §10.19 for the MUI Select menu and §10.21 for chips).
 *
 * What this file deliberately does NOT do (SEAM 2 — the frame is not ours):
 *   - it never sets a dialog width / height / margin / centering / radius,
 *   - it never touches a backdrop or scrim,
 *   - it never animates the panel's own size.
 * The single exception is `scopeDialogProps()`, which exists only for the two
 * confirm dialogs that are mounted INSIDE DisplayMeeting.js — those frames live
 * in a Lane-D file, so nobody else can reach them. Every frame that lives in
 * Calendar/index.jsx is styled by that file's owner, not here.
 *
 * SCROLL CONTRACT (the fix for "clicking Advanced scrolls the whole dialog"):
 * the frame gives the Paper a bounded height; this file makes the BODY the only
 * scroll region. `DialogSurface` is `flex:1 1 auto; min-height:0`, the header
 * and footer are `flex:none`, and `DialogBody` is `flex:1 1 auto; min-height:0;
 * overflow-y:auto`. Nothing above the body ever moves.
 *
 * `SidePane` is the second column the Advanced fields move into on a wide
 * screen. Its own width is content geometry and lives here; the FRAME's widened
 * `max-width` is still the frame owner's business — Calendar/index.jsx keys it
 * off `:has([data-cc-pane="open"])`, which `SidePane` stamps on itself.
 *
 * Colour is read as `var(--cc-*)`, which resolves in a portal because the vars
 * are emitted at :root. The one runtime accent, `--cc-c`, is set inline on the
 * element that owns it (the dialog surface, a type chip, a room row).
 */

import React from "react";
import { Box, useMediaQuery } from "@mui/material";
import Select from "@mui/material/Select";
import { mix, v } from "../../../Utilites/concourse";

/* ---------------------------------------------------------------- tokens --- */

export const cc = {
    grd: v("grd"),
    srf: v("srf"),
    srf2: v("srf2"),
    srf3: v("srf3"),
    ink: v("ink"),
    mute: v("mute"),
    line: v("line"),
    red: v("red"),
    wash: v("wash"),
    ok: v("ok"),
    sh1: v("sh1"),
    sh2: v("sh2"),
    shDialog: v("sh-dialog"),
    scrim: v("scrim"),
    onRed: v("on-red"),
    glowBtn: v("glow-btn"),
    sans: v("sans"),
    mono: v("mono"),
    /** the runtime per-item accent; set inline by whoever owns it */
    c: v("c"),
};

/** The one easing that carries the design (ARBITER §8). */
export const sp = v("sp");

/** Meeting-type colour fallback — the app's own literal (MeetingForum.jsx:706). */
export const TYPE_FALLBACK = "#91E041";

/** Breakpoints as raw media queries (ARBITER §9 — do not override theme.breakpoints). */
export const PHONE = "@media (max-width:619.95px)";
/** Hover lifts only where hover is real, or a tap leaves the row raised (§13-G5). */
export const HOVER = "@media (hover: hover)";

/* ------------------------------------------------- the Advanced side pane --- */

/**
 * Width of the Advanced column. It carries the same 14px controls as the form,
 * and 340 − 22 − 22 = 296px of control is wider than a `TwoUp` cell in the
 * 560px form column (560 − 44 = 516 ⇒ 252 per cell), so nothing in it is
 * tighter than what already ships.
 */
export const SIDE_PANE_WIDTH = 340;

/**
 * Where the two-column layout engages. The widened frame is
 * 560 (form) + 340 (pane) = 900, and the overlay keeps 18px of padding each
 * side, so the frame needs 936px of viewport to sit at full width without
 * squeezing the form column. 980 is the next number on the system's own
 * breakpoint scale (`bp.rail`, ARBITER §9) and clears it with 44px to spare —
 * it is also exactly where the side menu stops being an overlay, so
 * "two-column dialog" and "desktop with a docked side menu" mean the same
 * thing here. Below it the frame stays 560 and Advanced expands inline.
 *
 * NOTE: Calendar/index.jsx repeats this number in the frame's `:has()` rule.
 * The two must move together.
 */
export const SIDE_PANE_MIN = 980;
export const WIDE = `@media (min-width:${SIDE_PANE_MIN}px)`;

/**
 * The frame widens itself with `:has([data-cc-pane="open"])`. Where that
 * selector is not supported the frame could never grow and the pane would stay
 * clipped, so the two-column layout simply does not engage there and the
 * inline disclosure is used instead. Evaluated once — support does not change.
 */
const SUPPORTS_HAS =
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    CSS.supports("selector(:has(*))");

/** True when the Advanced fields should render as a second column. */
export const useSidePane = () =>
    useMediaQuery(`(min-width:${SIDE_PANE_MIN}px)`, { noSsr: true }) &&
    SUPPORTS_HAS;

export const focusRing = {
    outline: `2px solid ${cc.red}`,
    outlineOffset: "2px",
};

const monoText = { fontFamily: cc.mono, fontVariantNumeric: "tabular-nums" };

/* --------------------------------------------------------------- helpers --- */

/** `9:00am` — the app's read-only time format. */
export const fmt12 = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return "";
    const h24 = d.getHours();
    const h = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h}:${String(d.getMinutes()).padStart(2, "0")}${
        h24 < 12 ? "am" : "pm"
    }`;
};

/** Capacity copy is the app's own (DisplayMeeting.js:88). */
export const formatCapacity = (capacity) => {
    if (capacity === 0) return "No limit";
    if (!Number.isFinite(capacity)) return null;
    if (capacity >= 1000) return "Large";
    return `${capacity} people`;
};

/**
 * Capacity as a sentence, for the room CARD's meta line. `formatCapacity`'s
 * bare fragments do not survive a "Fits …" prefix — "Fits No limit" and "Fits
 * Large" are both nonsense — so the two special cases get their own wording
 * carrying exactly the same claim. Returns null for a capacity the room does
 * not actually have, so the card renders no line rather than "Fits undefined
 * people".
 */
export const formatCapacityLong = (capacity) => {
    if (capacity === 0) return "No capacity limit";
    if (!Number.isFinite(capacity)) return null;
    if (capacity >= 1000) return "Fits a large group";
    return `Fits ${capacity} people`;
};

/**
 * The room card's meta line: what the room HAS if we know of anything, else how
 * many it seats. Truncation is `RoomOption`'s existing idiom — first three by
 * name, then `+N` — so a long equipment list can never widen the card.
 *
 * `roomResources` here is the already-resolved list of resource objects; an
 * empty list means "this room has no equipment linked", which is a real answer,
 * not a missing one.
 */
export const formatRoomMeta = (roomResources, capacity) => {
    const list = (roomResources || []).filter(Boolean);
    if (!list.length) return formatCapacityLong(capacity);
    const shown = list
        .slice(0, 3)
        .map((r) => r.name)
        .join(", ");
    return list.length > 3 ? `${shown} +${list.length - 3}` : shown;
};

/** `1h`, `1h 30m`, `45m`. */
export const formatDuration = (start, end) => {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (!isFinite(ms) || ms <= 0) return "";
    const total = Math.round(ms / 60000);
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h && m) return `${h}h ${m}m`;
    if (h) return `${h}h`;
    return `${m}m`;
};

/** Up to two initials from a display name. */
export const initials = (name) =>
    String(name || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join("") || "?";

/* ------------------------------------------------------- dialog structure --- */

/**
 * The root element rendered inside a dialog frame. Owns the runtime accent and
 * the Concourse font stack; owns NO geometry beyond its share of the scroll
 * contract — it is the Paper's flex child, so it must be allowed to shrink
 * (`min-height:0`) or the body can never become the scroll region.
 */
export const DialogSurface = ({ accent, children, sx, ...rest }) => (
    <Box
        style={{ "--cc-c": accent || TYPE_FALLBACK }}
        sx={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            minWidth: 0,
            flex: "1 1 auto",
            minHeight: 0,
            overflow: "hidden",
            position: "relative",
            fontFamily: cc.sans,
            fontSize: "15px",
            lineHeight: 1.5,
            color: cc.ink,
            ...sx,
        }}
        {...rest}
    >
        {children}
    </Box>
);

/**
 * §10.17 close button — 32px circle, rotates on hover.
 * `sx` is applied last so a caller can re-place it (the Advanced pane puts one
 * in its own header, in flow rather than absolutely positioned), and
 * `controls`/`expanded` let it double as a disclosure control.
 */
export const CloseButton = ({
    onClick,
    label = "Close",
    controls,
    expanded,
    sx,
}) => (
    <Box
        component="button"
        type="button"
        aria-label={label}
        aria-controls={controls}
        aria-expanded={expanded}
        onClick={onClick}
        sx={{
            position: "absolute",
            top: "15px",
            right: "16px",
            [PHONE]: { top: "11px" },
            width: "32px",
            height: "32px",
            borderRadius: "99px",
            border: 0,
            background: cc.srf2,
            color: cc.mute,
            fontSize: "14px",
            lineHeight: 1,
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            padding: 0,
            fontFamily: "inherit",
            transition: `transform 300ms ${sp}, background 200ms, color 200ms`,
            [HOVER]: {
                "&:hover": {
                    background: cc.wash,
                    color: cc.red,
                    transform: "rotate(90deg)",
                },
            },
            "&:focus-visible": focusRing,
            ...sx,
        }}
    >
        ✕
    </Box>
);

/** §10.17 header. The gradient carries the type colour via `--cc-c`. */
export const DialogHeader = ({ badge, title, sub, onClose, children }) => (
    <Box
        sx={{
            flex: "none",
            padding: "19px 22px 14px",
            display: "grid",
            gap: "8px",
            position: "relative",
            background: `linear-gradient(180deg,${mix(cc.c, 11, cc.srf)},${
                cc.srf
            })`,
        }}
    >
        {badge ? (
            <Box
                sx={{
                    justifySelf: "start",
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    background: mix(cc.c, 17, cc.srf),
                    borderRadius: "99px",
                    padding: "4px 12px 4px 9px",
                    fontSize: "11.5px",
                    fontWeight: 700,
                }}
            >
                <Box
                    component="span"
                    sx={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "99px",
                        background: cc.c,
                        flex: "none",
                    }}
                />
                {badge}
            </Box>
        ) : null}
        <Box
            component="h2"
            sx={{
                margin: 0,
                fontSize: "22px",
                fontWeight: 700,
                letterSpacing: "-.03em",
                lineHeight: 1.1,
                textWrap: "balance",
                paddingRight: "38px",
            }}
        >
            {title}
        </Box>
        {sub ? (
            <Box sx={{ fontSize: "13.5px", color: cc.mute }}>{sub}</Box>
        ) : null}
        {children}
        {onClose ? <CloseButton onClick={onClose} /> : null}
    </Box>
);

/**
 * §10.17 body. Every direct child animates in with `cc-stag`, delayed
 * `70ms + 45ms × index` through `--cc-i`. Each child is wrapped so the index
 * lands on the animating element itself and so conditional children (which
 * React.Children.toArray drops) never leave a gap in the sequence.
 *
 * This is also THE scroll region of a dialog. `flex:1 1 auto` + `min-height:0`
 * + `overflow-y:auto` means a body that outgrows the frame scrolls inside it
 * while the header and footer stay pinned; `align-content:start` keeps the grid
 * rows at their natural height when the body is given more room than it needs.
 */
export const DialogBody = ({ children, sx }) => {
    const items = React.Children.toArray(children);
    return (
        <Box
            sx={{
                padding: "4px 22px 20px",
                display: "grid",
                gap: "13px",
                alignContent: "start",
                minWidth: 0,
                flex: "1 1 auto",
                minHeight: 0,
                overflowY: "auto",
                overflowX: "hidden",
                overscrollBehavior: "contain",
                scrollbarWidth: "thin",
                "& > *": {
                    minWidth: 0,
                    animation: `cc-stag 340ms ${sp} both`,
                    animationDelay: "calc(70ms + var(--cc-i, 0) * 45ms)",
                },
                ...sx,
            }}
        >
            {items.map((child, i) => (
                <div
                    key={child.key != null ? child.key : i}
                    style={{ "--cc-i": i, minWidth: 0 }}
                >
                    {child}
                </div>
            ))}
        </Box>
    );
};

/**
 * §10.17 footer. Destructive left, confirm right, `Spacer` between.
 * `flex:none` pins it below the scrolling body — it is never scrolled away.
 */
export const DialogFooter = ({ children, sx }) => (
    <Box
        sx={{
            display: "flex",
            gap: "9px",
            padding: "13px 22px 19px",
            flexWrap: "wrap",
            flex: "none",
            background: cc.srf,
            borderTop: `1px solid ${cc.line}`,
            [PHONE]: {
                position: "sticky",
                bottom: 0,
                background: cc.srf,
                "& > button": { flex: 1 },
            },
            ...sx,
        }}
    >
        {children}
    </Box>
);

export const Spacer = () => <Box sx={{ flex: 1 }} />;

/**
 * The band between the header and the footer. With `split` it becomes the
 * two-column row that holds the body and the Advanced pane; without it, it is
 * nothing at all — the body stays a direct flex child of `DialogSurface`, so
 * the single-column dialog keeps exactly the DOM it has today.
 *
 * `overflow:hidden` is what makes the expansion read as a reveal: the body is
 * pinned to the collapsed frame width and the pane is simply uncovered as the
 * frame grows, so no form field ever reflows mid-animation.
 */
export const SplitRow = ({ split, children, sx }) =>
    split ? (
        <Box
            sx={{
                display: "flex",
                flex: "1 1 auto",
                minHeight: 0,
                minWidth: 0,
                overflow: "hidden",
                ...sx,
            }}
        >
            {children}
        </Box>
    ) : (
        <>{children}</>
    );

/**
 * The Advanced column. Always mounted while the two-column layout is in play so
 * the collapse can run in reverse; `visibility` (not unmounting) takes it out
 * of the tab order and the a11y tree while it is closed, and is held until the
 * frame has finished shrinking.
 *
 * `box-sizing: border-box` is not optional. The app mounts no CssBaseline, so
 * the initial `content-box` applies: under it `flex-basis: 340px` plus the
 * 1px left rule would make the pane's OUTER width 341 (and, when the padding
 * lived on this element, 384), which is why its fields used to hang past the
 * frame's right edge and get clipped. Under border-box the pane is exactly
 * SIDE_PANE_WIDTH and 560 + 340 lands exactly on the widened frame.
 *
 * The header is pinned and only the field list scrolls, so the pane obeys the
 * same rule as the dialog body: content scrolls, chrome never moves. That also
 * keeps the close control reachable no matter how far the fields run on.
 *
 * Children use `cc-stag`'s own values — opacity 0→1, translateY(9px)→none,
 * 340ms on `--cc-sp`, 45ms per `--cc-i` — as a TRANSITION rather than the
 * keyframe, because a keyframe with `both` would only ever play once on mount.
 * The global `prefers-reduced-motion` rule (ARBITER §8/§15) collapses it to an
 * instant change; per-component reduced-motion blocks are forbidden.
 */
export const SidePane = ({ id, open, title, label, onClose, children }) => {
    const items = React.Children.toArray(children);
    const titleId = id ? `${id}-title` : undefined;
    return (
        <Box
            id={id}
            data-cc-pane={open ? "open" : "closed"}
            role="group"
            aria-labelledby={title ? titleId : undefined}
            aria-label={title ? undefined : label}
            aria-hidden={open ? undefined : true}
            sx={{
                boxSizing: "border-box",
                flexGrow: 0,
                flexShrink: 0,
                flexBasis: `${SIDE_PANE_WIDTH}px`,
                width: `${SIDE_PANE_WIDTH}px`,
                minWidth: 0,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                borderLeft: `1px solid ${cc.line}`,
                background: cc.srf,
                visibility: open ? "visible" : "hidden",
                // 400ms = the side-menu width duration (§8), the same span the
                // frame takes to widen. Held on the way out so the pane is
                // still painted while the frame shrinks over it.
                transition: open
                    ? "visibility 0s linear 0s"
                    : "visibility 0s linear 400ms",
            }}
        >
            <Box
                sx={{
                    flex: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "13px 14px 6px 22px",
                    minWidth: 0,
                }}
            >
                <Box
                    id={titleId}
                    sx={{
                        minWidth: 0,
                        fontSize: "10.5px",
                        fontWeight: 700,
                        letterSpacing: ".06em",
                        textTransform: "uppercase",
                        color: cc.mute,
                    }}
                >
                    {title}
                </Box>
                {onClose ? (
                    <CloseButton
                        onClick={onClose}
                        label={`Close ${title || label || "panel"}`}
                        controls={id}
                        expanded={!!open}
                        sx={{
                            position: "static",
                            top: "auto",
                            right: "auto",
                            marginLeft: "auto",
                            flex: "none",
                            [PHONE]: { top: "auto" },
                        }}
                    />
                ) : null}
            </Box>
            <Box
                sx={{
                    flex: "1 1 auto",
                    minHeight: 0,
                    minWidth: 0,
                    display: "grid",
                    gap: "13px",
                    alignContent: "start",
                    padding: "4px 22px 20px",
                    overflowY: "auto",
                    overflowX: "hidden",
                    overscrollBehavior: "contain",
                    scrollbarWidth: "thin",
                    "& > *": {
                        minWidth: 0,
                        opacity: open ? 1 : 0,
                        transform: open ? "none" : "translateY(9px)",
                        transition: `opacity 340ms ${sp} ${
                            open ? "calc(var(--cc-i, 0) * 45ms)" : "0ms"
                        }, transform 340ms ${sp} ${
                            open ? "calc(var(--cc-i, 0) * 45ms)" : "0ms"
                        }`,
                    },
                }}
            >
                {items.map((child, i) => (
                    <div
                        key={child.key != null ? child.key : i}
                        style={{ "--cc-i": i, minWidth: 0 }}
                    >
                        {child}
                    </div>
                ))}
            </Box>
        </Box>
    );
};

/* --------------------------------------------------------------- buttons --- */

const buttonVariants = {
    default: {
        background: cc.srf2,
        color: cc.ink,
        [HOVER]: {
            "&:hover:not(:disabled)": {
                background: cc.wash,
                transform: "translateY(-1px)",
                boxShadow: cc.sh1,
            },
        },
    },
    primary: {
        background: cc.red,
        color: cc.onRed,
        boxShadow: cc.glowBtn,
        [HOVER]: {
            "&:hover:not(:disabled)": {
                filter: "brightness(1.06)",
                transform: "translateY(-1px)",
            },
        },
    },
    danger: {
        background: cc.wash,
        color: cc.red,
        [HOVER]: {
            "&:hover:not(:disabled)": {
                background: cc.red,
                color: cc.onRed,
                transform: "translateY(-1px)",
                boxShadow: cc.sh1,
            },
        },
    },
};

/** §10.18. A plain <button> — MUI's global MuiButton colour override cannot reach it. */
export const CcButton = ({ variant = "default", children, sx, ...rest }) => (
    <Box
        component="button"
        type="button"
        sx={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            border: 0,
            borderRadius: "99px",
            padding: "9px 17px",
            fontSize: "13.5px",
            fontWeight: 650,
            fontFamily: "inherit",
            lineHeight: 1.4,
            cursor: "pointer",
            transition: `transform 280ms ${sp}, background 200ms, box-shadow 280ms ${sp}, filter 200ms`,
            ...buttonVariants[variant],
            "&:active:not(:disabled)": { transform: "scale(.97)" },
            "&:focus-visible": focusRing,
            "&:disabled": {
                opacity: 0.4,
                cursor: "default",
                transform: "none",
                filter: "none",
            },
            ...sx,
        }}
        {...rest}
    >
        {children}
    </Box>
);

/* ---------------------------------------------------------------- fields --- */

/** §10.19 field wrapper: label (+ required mark), control, then hint or error. */
export const Field = ({ label, required, hint, error, htmlFor, children }) => (
    <Box sx={{ display: "grid", gap: "5px", minWidth: 0 }}>
        {label ? (
            <Box
                component="label"
                htmlFor={htmlFor}
                sx={{
                    display: "flex",
                    gap: "7px",
                    alignItems: "center",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: cc.mute,
                }}
            >
                {label}
                {required ? (
                    <Box
                        component="span"
                        sx={{
                            fontSize: "10px",
                            fontWeight: 700,
                            letterSpacing: ".05em",
                            textTransform: "uppercase",
                            color: cc.red,
                            background: cc.wash,
                            borderRadius: "99px",
                            padding: "1px 7px",
                        }}
                    >
                        required
                    </Box>
                ) : null}
            </Box>
        ) : null}
        {children}
        {error ? (
            <Box sx={{ fontSize: "11.5px", fontWeight: 650, color: cc.red }}>
                {error}
            </Box>
        ) : hint ? (
            <Box sx={{ fontSize: "11.5px", color: cc.mute }}>{hint}</Box>
        ) : null}
    </Box>
);

/** §10.19 control box. `invalid` paints the error state, `mono` marks machine values. */
export const controlBox = (invalid, mono) => ({
    boxSizing: "border-box",
    width: "100%",
    border: `1.5px solid ${invalid ? cc.red : cc.line}`,
    background: invalid ? cc.wash : cc.srf2,
    color: cc.ink,
    borderRadius: "14px",
    padding: "10px 13px",
    fontFamily: mono ? cc.mono : "inherit",
    ...(mono ? { fontVariantNumeric: "tabular-nums" } : null),
    fontSize: "14px",
    lineHeight: 1.5,
    transition: `border-color 200ms, background 200ms, box-shadow 280ms ${sp}`,
    "&:focus": {
        outline: 0,
        borderColor: cc.red,
        background: cc.srf,
        boxShadow: `0 0 0 4px ${mix(cc.red, 13, "transparent")}`,
    },
    "&:disabled": {
        opacity: 0.5,
        cursor: "not-allowed",
        background: cc.srf3,
    },
});

export const CcInput = ({ invalid, mono, sx, ...rest }) => (
    <Box
        component="input"
        sx={{ ...controlBox(invalid, mono), ...sx }}
        {...rest}
    />
);

export const CcTextarea = ({ invalid, sx, ...rest }) => (
    <Box
        component="textarea"
        sx={{
            ...controlBox(invalid, false),
            resize: "vertical",
            minHeight: "70px",
            ...sx,
        }}
        {...rest}
    />
);

/** §10.19 / §13-G9 — the Select menu portals, so it is styled from tokens. */
export const menuPaperSx = (maxHeight = 300) => ({
    backgroundColor: cc.srf,
    backgroundImage: "none",
    color: cc.ink,
    borderRadius: "14px",
    boxShadow: cc.sh2,
    border: `1px solid ${cc.line}`,
    fontFamily: cc.sans,
    maxHeight: `${maxHeight}px`,
    "& .MuiMenuItem-root": {
        fontSize: "14px",
        fontFamily: cc.sans,
        color: cc.ink,
    },
    "& .MuiMenuItem-root:hover": { background: cc.srf2 },
    "& .MuiMenuItem-root.Mui-selected": {
        background: cc.wash,
        color: cc.red,
    },
    "& .MuiMenuItem-root.Mui-selected:hover": { background: cc.wash },
    "& .MuiMenuItem-root.Mui-focusVisible": { background: cc.srf2 },
});

/**
 * A MUI Select wearing the Concourse control box. `variant="standard"` plus
 * `disableUnderline` is used so there is no notched outline to fight.
 */
export const CcSelect = ({
    invalid,
    mono,
    maxMenuHeight = 300,
    ariaLabel,
    sx,
    children,
    ...rest
}) => (
    <Select
        variant="standard"
        disableUnderline
        inputProps={{ "aria-label": ariaLabel }}
        MenuProps={{ PaperProps: { sx: menuPaperSx(maxMenuHeight) } }}
        sx={{
            ...controlBox(invalid, mono),
            padding: 0,
            "& .MuiSelect-select": {
                padding: "10px 34px 10px 13px",
                fontSize: "14px",
                minHeight: "unset",
                lineHeight: 1.5,
                "&:focus": { background: "transparent" },
            },
            "& .MuiSelect-icon": { color: cc.mute, right: "9px" },
            "&.Mui-focused": {
                borderColor: cc.red,
                background: cc.srf,
                boxShadow: `0 0 0 4px ${mix(cc.red, 13, "transparent")}`,
            },
            "&.Mui-disabled": {
                opacity: 0.5,
                background: cc.srf3,
                cursor: "not-allowed",
            },
            ...sx,
        }}
        {...rest}
    >
        {children}
    </Select>
);

/** §10.19 two-up row; one column on a phone. */
export const TwoUp = ({ children, sx }) => (
    <Box
        sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            [PHONE]: { gridTemplateColumns: "1fr" },
            ...sx,
        }}
    >
        {children}
    </Box>
);

/** §10.20 switch. */
export const CcSwitch = ({ checked, onChange, label, disabled, id }) => (
    <Box
        component="label"
        htmlFor={id}
        sx={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: "11px",
            fontSize: "13.5px",
            fontWeight: 650,
            cursor: disabled ? "default" : "pointer",
            opacity: disabled ? 0.5 : 1,
        }}
    >
        <Box
            component="input"
            type="checkbox"
            id={id}
            checked={!!checked}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
            sx={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "40px",
                height: "23px",
                margin: 0,
                opacity: 0,
                cursor: "inherit",
                "&:focus-visible + span": focusRing,
            }}
        />
        <Box
            component="span"
            aria-hidden="true"
            sx={{
                position: "relative",
                width: "40px",
                height: "23px",
                flex: "none",
                borderRadius: "99px",
                background: checked ? cc.red : cc.line,
                transition: `background 280ms ${sp}`,
                "&::after": {
                    content: '""',
                    position: "absolute",
                    top: "3px",
                    left: "3px",
                    width: "17px",
                    height: "17px",
                    borderRadius: "99px",
                    background: "#fff",
                    boxShadow: "0 1px 3px rgba(0,0,0,.3)",
                    transition: `transform 320ms ${sp}`,
                    transform: checked ? "translateX(17px)" : "none",
                },
            }}
        />
        <Box component="span">{label}</Box>
    </Box>
);

/* ------------------------------------------------------- chips and rows ---- */

/** §10.21 tag. `on` is the active / removable form. */
export const Tag = ({ on, children, sx, ...rest }) => (
    <Box
        sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            background: on ? cc.wash : cc.srf,
            color: on ? cc.red : cc.mute,
            borderRadius: "99px",
            padding: "2px 9px",
            fontSize: "10.5px",
            fontWeight: 600,
            maxWidth: "100%",
            ...sx,
        }}
        {...rest}
    >
        {children}
    </Box>
);

export const TagRow = ({ children, sx }) => (
    <Box
        sx={{
            display: "flex",
            gap: "5px",
            flexWrap: "wrap",
            marginTop: "6px",
            ...sx,
        }}
    >
        {children}
    </Box>
);

/** §10.21 selectable meeting-type chip. Owns its own `--cc-c` (its dot). */
export const TypeChip = ({ color, selected, children, sx, ...rest }) => (
    <Box
        component="button"
        type="button"
        aria-pressed={!!selected}
        style={{ "--cc-c": color || TYPE_FALLBACK }}
        sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            border: `1.5px solid ${selected ? cc.c : cc.line}`,
            background: selected ? mix(cc.c, 14, cc.srf) : cc.srf2,
            borderRadius: "99px",
            padding: "6px 13px",
            fontSize: "12.5px",
            fontWeight: selected ? 700 : 600,
            color: cc.ink,
            fontFamily: "inherit",
            cursor: "pointer",
            transition: `transform 280ms ${sp}, border-color 200ms, background 200ms`,
            [HOVER]: {
                "&:hover:not(:disabled)": { transform: "translateY(-2px)" },
            },
            "&:focus-visible": focusRing,
            "&:disabled": { opacity: 0.4, cursor: "default", transform: "none" },
            ...sx,
        }}
        {...rest}
    >
        <Box
            component="span"
            sx={{
                width: "9px",
                height: "9px",
                borderRadius: "99px",
                background: cc.c,
                flex: "none",
            }}
        />
        {children}
    </Box>
);

/** §10.22 room option row. Owns its own `--cc-c` (the room's colour). */
export const RoomOption = ({
    color,
    selected,
    name,
    meta,
    status,
    busy,
    sx,
    ...rest
}) => (
    <Box
        component="button"
        type="button"
        aria-pressed={!!selected}
        style={{ "--cc-c": color || TYPE_FALLBACK }}
        sx={{
            display: "flex",
            gap: "11px",
            alignItems: "center",
            textAlign: "left",
            width: "100%",
            border: `1.5px solid ${selected ? cc.red : cc.line}`,
            background: selected ? cc.wash : cc.srf2,
            boxShadow: selected ? cc.sh1 : "none",
            borderRadius: "17px",
            padding: "9px 13px",
            color: cc.ink,
            fontFamily: "inherit",
            cursor: "pointer",
            opacity: busy ? 0.55 : 1,
            transition: `transform 280ms ${sp}, border-color 200ms, background 200ms, box-shadow 280ms ${sp}`,
            [HOVER]: {
                "&:hover:not(:disabled)": {
                    transform: "translateY(-2px)",
                    boxShadow: cc.sh1,
                },
            },
            "&:focus-visible": focusRing,
            "&:disabled": { opacity: 0.4, cursor: "default", transform: "none" },
            ...sx,
        }}
        {...rest}
    >
        <Box
            component="span"
            sx={{
                width: "10px",
                height: "10px",
                borderRadius: "99px",
                background: cc.c,
                flex: "none",
            }}
        />
        <Box sx={{ minWidth: 0, display: "grid" }}>
            <Box
                sx={{
                    fontSize: "13.5px",
                    fontWeight: 700,
                    letterSpacing: "-.016em",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                }}
            >
                {name}
            </Box>
            {meta ? (
                <Box
                    sx={{
                        ...monoText,
                        fontSize: "10.5px",
                        color: cc.mute,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    {meta}
                </Box>
            ) : null}
        </Box>
        {status ? (
            <Box
                sx={{
                    marginLeft: "auto",
                    flex: "none",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: busy ? cc.red : cc.ok,
                }}
            >
                {status}
            </Box>
        ) : null}
    </Box>
);

export const OptionList = ({ children, sx, ...rest }) => (
    <Box sx={{ display: "grid", gap: "7px", ...sx }} {...rest}>
        {children}
    </Box>
);

/** §10.25 room card. The thumb doubles as the photo placeholder. */
export const RoomCard = ({ name, meta, thumb, glyph = "🚪", children }) => (
    <Box
        sx={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            background: cc.srf2,
            borderRadius: "19px",
            padding: "11px 14px",
            minWidth: 0,
        }}
    >
        <Box
            sx={{
                width: "64px",
                height: "48px",
                flex: "none",
                borderRadius: "12px",
                background: cc.wash,
                display: "grid",
                placeItems: "center",
                fontSize: "20px",
                overflow: "hidden",
            }}
        >
            {thumb || glyph}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box
                sx={{
                    fontSize: "14.5px",
                    fontWeight: 700,
                    letterSpacing: "-.018em",
                }}
            >
                {name}
            </Box>
            {meta ? (
                <Box sx={{ ...monoText, fontSize: "11px", color: cc.mute }}>
                    {meta}
                </Box>
            ) : null}
            {children}
        </Box>
    </Box>
);

/** §10.25 people row. The avatar takes the dialog's accent. */
export const PersonRow = ({ name, role }) => (
    <Box
        sx={{
            display: "flex",
            gap: "11px",
            alignItems: "center",
            background: cc.srf2,
            borderRadius: "18px",
            padding: "11px 14px",
            minWidth: 0,
        }}
    >
        <Box
            sx={{
                width: "38px",
                height: "38px",
                flex: "none",
                borderRadius: "99px",
                background: cc.c,
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontSize: "13px",
                fontWeight: 700,
            }}
        >
            {initials(name)}
        </Box>
        <Box sx={{ minWidth: 0 }}>
            <Box
                sx={{
                    fontSize: "14.5px",
                    fontWeight: 700,
                    letterSpacing: "-.016em",
                }}
            >
                {name}
            </Box>
            {role ? (
                <Box sx={{ fontSize: "12px", color: cc.mute }}>{role}</Box>
            ) : null}
        </Box>
    </Box>
);

/** §10.25 hero time row. */
export const HeroTime = ({ time, chips = [] }) => (
    <Box
        sx={{
            display: "flex",
            alignItems: "baseline",
            gap: "10px",
            flexWrap: "wrap",
        }}
    >
        <Box
            sx={{
                fontSize: "26px",
                fontWeight: 700,
                letterSpacing: "-.032em",
                fontVariantNumeric: "tabular-nums",
            }}
        >
            {time}
        </Box>
        {chips.filter(Boolean).map((chip, i) => (
            <Box
                key={i}
                sx={{
                    background: cc.srf2,
                    borderRadius: "99px",
                    padding: "3px 11px",
                    fontSize: "12.5px",
                    fontWeight: 650,
                    color: cc.mute,
                }}
            >
                {chip}
            </Box>
        ))}
    </Box>
);

/* --------------------------------------------------------- read-only bits --- */

/** §10.24 facts group — the 1px gap over `line` IS the hairline. */
export const Facts = ({ children }) => (
    <Box
        sx={{
            display: "grid",
            gap: "1px",
            background: cc.line,
            borderRadius: "18px",
            overflow: "hidden",
        }}
    >
        {children}
    </Box>
);

export const Fact = ({ label, children, mono, strong }) => (
    <Box
        sx={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "14px",
            alignItems: "baseline",
            background: cc.srf2,
            padding: "10px 14px",
        }}
    >
        <Box
            sx={{
                fontSize: "12px",
                fontWeight: 650,
                color: cc.mute,
                whiteSpace: "nowrap",
            }}
        >
            {label}
        </Box>
        <Box
            sx={{
                textAlign: "right",
                minWidth: 0,
                ...(mono ? { ...monoText, fontSize: "12.5px" } : { fontSize: "13.5px" }),
                ...(strong ? { fontWeight: 700, color: cc.ink } : null),
            }}
        >
            {children}
        </Box>
    </Box>
);

/** §10.25 description block. */
export const Block = ({ label, children }) => (
    <Box
        sx={{
            background: cc.srf2,
            borderRadius: "18px",
            padding: "12px 14px",
            fontSize: "13.5px",
        }}
    >
        {label ? (
            <Box
                sx={{
                    fontSize: "10.5px",
                    fontWeight: 700,
                    letterSpacing: ".06em",
                    textTransform: "uppercase",
                    color: cc.mute,
                    marginBottom: "4px",
                }}
            >
                {label}
            </Box>
        ) : null}
        <Box sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {children}
        </Box>
    </Box>
);

/** §10.27 alert block. */
export const AlertBlock = ({ title, body, glyph = "!" }) => (
    <Box
        sx={{
            display: "flex",
            gap: "11px",
            alignItems: "flex-start",
            background: cc.wash,
            borderRadius: "18px",
            padding: "12px 14px",
        }}
    >
        <Box
            aria-hidden="true"
            sx={{
                width: "30px",
                height: "30px",
                flex: "none",
                borderRadius: "99px",
                background: cc.red,
                color: cc.onRed,
                display: "grid",
                placeItems: "center",
                fontSize: "14px",
                fontWeight: 700,
            }}
        >
            {glyph}
        </Box>
        <Box sx={{ minWidth: 0 }}>
            <Box sx={{ fontSize: "13.5px", fontWeight: 700, color: cc.red }}>
                {title}
            </Box>
            {body ? (
                <Box
                    sx={{
                        fontSize: "12.5px",
                        color: cc.mute,
                        marginTop: "2px",
                    }}
                >
                    {body}
                </Box>
            ) : null}
        </Box>
    </Box>
);

/* ------------------------------------------------------------ scope rows --- */

/** §10.23 scope option. */
export const ScopeOption = ({ glyph, title, desc, sx, ...rest }) => (
    <Box
        component="button"
        type="button"
        sx={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            textAlign: "left",
            width: "100%",
            border: `1.5px solid ${cc.line}`,
            background: cc.srf2,
            borderRadius: "18px",
            padding: "13px 15px",
            color: cc.ink,
            fontFamily: "inherit",
            cursor: "pointer",
            transition: `transform 280ms ${sp}, border-color 200ms, background 200ms, box-shadow 280ms ${sp}`,
            [HOVER]: {
                "&:hover:not(:disabled)": {
                    transform: "translateY(-2px)",
                    borderColor: cc.red,
                    background: cc.wash,
                    boxShadow: cc.sh1,
                },
            },
            "&:focus-visible": focusRing,
            "&:disabled": { opacity: 0.4, cursor: "default", transform: "none" },
            ...sx,
        }}
        {...rest}
    >
        <Box
            aria-hidden="true"
            sx={{
                width: "34px",
                height: "34px",
                flex: "none",
                borderRadius: "12px",
                background: cc.srf,
                color: cc.red,
                display: "grid",
                placeItems: "center",
                fontSize: "15px",
                fontWeight: 700,
            }}
        >
            {glyph}
        </Box>
        <Box sx={{ minWidth: 0 }}>
            <Box
                sx={{
                    fontSize: "14px",
                    fontWeight: 700,
                    letterSpacing: "-.017em",
                }}
            >
                {title}
            </Box>
            {desc ? (
                <Box sx={{ fontSize: "12.5px", color: cc.mute }}>{desc}</Box>
            ) : null}
        </Box>
    </Box>
);

export const ScopeList = ({ children }) => (
    <Box sx={{ display: "grid", gap: "8px" }}>{children}</Box>
);

/* --------------------------------------------------------------- advanced --- */

/**
 * §10.26 disclosure. With no children it is just the toggle — that is the form
 * the two-column layout uses, where the fields live in the `SidePane` instead
 * and this row only drives `open`.
 */
export const Disclosure = ({
    open,
    onToggle,
    summary,
    count,
    controls,
    children,
}) => (
    <Box
        sx={{
            background: cc.srf2,
            borderRadius: "18px",
            overflow: "hidden",
        }}
    >
        <Box
            component="button"
            type="button"
            aria-expanded={!!open}
            aria-controls={controls}
            onClick={onToggle}
            sx={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                padding: "12px 14px",
                border: 0,
                background: "transparent",
                color: cc.ink,
                fontFamily: "inherit",
                fontSize: "13.5px",
                fontWeight: 700,
                textAlign: "left",
                cursor: "pointer",
                "&:focus-visible": focusRing,
            }}
        >
            <Box
                component="span"
                aria-hidden="true"
                sx={{
                    width: "22px",
                    height: "22px",
                    flex: "none",
                    borderRadius: "99px",
                    background: open ? cc.red : cc.srf,
                    color: open ? cc.onRed : cc.ink,
                    display: "grid",
                    placeItems: "center",
                    fontSize: "13px",
                    lineHeight: 1,
                    transform: open ? "rotate(135deg)" : "none",
                    transition: `transform 320ms ${sp}, background 200ms, color 200ms`,
                }}
            >
                +
            </Box>
            <Box component="span">{summary}</Box>
            {count ? (
                <Box
                    component="span"
                    sx={{
                        marginLeft: "auto",
                        fontSize: "11.5px",
                        fontWeight: 500,
                        color: cc.mute,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    {count}
                </Box>
            ) : null}
        </Box>
        {open && React.Children.count(children) > 0 ? (
            <Box
                sx={{
                    display: "grid",
                    gap: "12px",
                    padding: "2px 14px 14px",
                    animation: `cc-stag 340ms ${sp} both`,
                }}
            >
                {children}
            </Box>
        ) : null}
    </Box>
);

/* ------------------------------------------------- nested-dialog frames ---- */

/**
 * Frame props for the two confirm dialogs mounted inside DisplayMeeting.js.
 * These <Dialog> elements live in a Lane-D file, so no other lane can style
 * them. Every dialog frame that lives in Calendar/index.jsx is deliberately
 * left alone here (SEAM 2).
 */
export const scopeDialogProps = (width = 480) => ({
    PaperProps: {
        sx: {
            backgroundColor: cc.srf,
            backgroundImage: "none",
            color: cc.ink,
            borderRadius: "26px",
            boxShadow: cc.shDialog,
            fontFamily: cc.sans,
            fontSize: "15px",
            lineHeight: 1.5,
            width: "100%",
            maxWidth: `${width}px`,
            margin: "auto",
            // Bounded, so the Paper can never grow past the overlay's clamped
            // padding and push its own footer off the bottom of the window.
            // `overflow:hidden` on every width keeps the frame still — only
            // DialogBody scrolls.
            maxHeight: "100%",
            overflow: "hidden",
            // No `both` fill: a forwards fill pins opacity at 1 and kills
            // MUI's closing Fade. Matches the outer frames in Calendar/index.jsx,
            // which omit it for the same reason.
            animation: `cc-dialog-in 380ms ${sp}`,
            [PHONE]: {
                maxWidth: "none",
                width: "100%",
                margin: "auto 0 0",
                borderRadius: "26px 26px 0 0",
                maxHeight: "100%",
                overflow: "hidden",
                animation: `cc-sheet 420ms ${sp}`,
            },
        },
    },
    BackdropProps: {
        sx: {
            backgroundColor: cc.scrim,
            backdropFilter: "blur(8px) saturate(.9)",
            [PHONE]: { backdropFilter: "blur(5px)" },
        },
    },
    sx: {
        "& .MuiDialog-container": {
            // The app mounts no CssBaseline, so box-sizing is the initial
            // `content-box`: MUI's `height:100%` plus this padding would make
            // the container 104px TALLER than the viewport and `margin:auto`
            // would centre the Paper on a box whose middle sits up to 76px
            // below the middle of the window. Border-box is the whole fix.
            boxSizing: "border-box",
            padding: "clamp(28px,9vh,76px) 18px 28px",
            [PHONE]: { padding: 0, alignItems: "flex-end" },
        },
    },
});
