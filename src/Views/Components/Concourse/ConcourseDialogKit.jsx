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
 * Colour is read as `var(--cc-*)`, which resolves in a portal because the vars
 * are emitted at :root. The one runtime accent, `--cc-c`, is set inline on the
 * element that owns it (the dialog surface, a type chip, a room row).
 */

import React from "react";
import { Box } from "@mui/material";
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
    if (capacity >= 1000) return "Large";
    return `${capacity} people`;
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
 * the Concourse font stack; owns NO geometry.
 */
export const DialogSurface = ({ accent, children, sx, ...rest }) => (
    <Box
        style={{ "--cc-c": accent || TYPE_FALLBACK }}
        sx={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            minWidth: 0,
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

/** §10.17 close button — 32px circle, rotates on hover. */
export const CloseButton = ({ onClick, label = "Close" }) => (
    <Box
        component="button"
        type="button"
        aria-label={label}
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
 */
export const DialogBody = ({ children, sx }) => {
    const items = React.Children.toArray(children);
    return (
        <Box
            sx={{
                padding: "4px 22px 20px",
                display: "grid",
                gap: "13px",
                minWidth: 0,
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

/** §10.17 footer. Destructive left, confirm right, `Spacer` between. */
export const DialogFooter = ({ children, sx }) => (
    <Box
        sx={{
            display: "flex",
            gap: "9px",
            padding: "13px 22px 19px",
            flexWrap: "wrap",
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

/** §10.26 disclosure. */
export const Disclosure = ({ open, onToggle, summary, count, children }) => (
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
        {open ? (
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
                overflowY: "auto",
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
            padding: "clamp(28px,9vh,76px) 18px 28px",
            [PHONE]: { padding: 0, alignItems: "flex-end" },
        },
    },
});
