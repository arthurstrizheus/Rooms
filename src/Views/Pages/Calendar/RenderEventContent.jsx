// RenderEventContent.jsx
//
// THE MEETING BUBBLE (ARBITER §10.12) — the one element the user explicitly
// asked to keep. Line 1 is always the meeting name, line 2 is always the room.
// Never reorder them, never collapse to one line, never drop the room.
//
// Traps worth re-reading before editing:
//   * left padding is ZERO (`4px 9px 5px 0`) — the 3px type-colour bar lives
//     in that space.
//   * the focus ring is the TYPE colour (`--cc-c`), not red. It is the only
//     element in Concourse that does not focus red (§11).
//   * `--cc-c` arrives per-event as an inline custom property on the bubble
//     root, so every derived colour (bar, wash, hatch) is a plain CSS
//     `color-mix()` and the sx object stays static and cacheable.
import Box from "@mui/material/Box";

import { motion, tokens, type as ccType } from "../../../Utilites/concourse";

export const TYPE_COLOUR_FALLBACK = tokens.constant.typeFallback;

const SP = "var(--cc-sp)";
const REST_BG = "color-mix(in srgb, var(--cc-c) 12%, var(--cc-srf))";
const HOVER_BG = "color-mix(in srgb, var(--cc-c) 22%, var(--cc-srf))";
const HATCH_BG =
    "repeating-linear-gradient(135deg," +
    "color-mix(in srgb, var(--cc-c) 13%, var(--cc-srf)) 0 7px," +
    "color-mix(in srgb, var(--cc-c) 7%, var(--cc-srf)) 7px 14px)";
const HATCH_BG_HOVER =
    "repeating-linear-gradient(135deg," +
    "color-mix(in srgb, var(--cc-c) 22%, var(--cc-srf)) 0 7px," +
    "color-mix(in srgb, var(--cc-c) 14%, var(--cc-srf)) 7px 14px)";

/* ------------------------------------------------------------------ times --*/

const pad2 = (n) => String(n).padStart(2, "0");

/** Display format (§10.31): `9:00am`. */
export const displayTime = (value) => {
    if (value === null || value === undefined || value === "") return "";
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const h = d.getHours();
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${pad2(d.getMinutes())}${h < 12 ? "am" : "pm"}`;
};

/** Compact format (§10.31): `9a` / `9:30a`. */
export const compactTime = (value) => {
    if (value === null || value === undefined || value === "") return "";
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const h = d.getHours();
    const m = d.getMinutes();
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const suffix = h < 12 ? "a" : "p";
    return m === 0 ? `${h12}${suffix}` : `${h12}:${pad2(m)}${suffix}`;
};

/* ----------------------------------------------------------------- recipe --*/

// Per-variant geometry (§10.12). `month` is the base recipe.
const VARIANT = {
    month: { borderRadius: "11px", padding: "4px 9px 5px 0" },
    positioned: {
        borderRadius: "11px",
        padding: "4px 9px 5px 0",
        height: "100%",
    },
    agenda: { borderRadius: "14px", padding: "8px 12px 8px 0" },
    popover: { borderRadius: "14px", padding: "7px 11px 7px 0" },
    list: { borderRadius: "14px", padding: "8px 12px 8px 0" },
};

// Name / room-line overrides per variant (§6).
const NAME_OVERRIDE = {
    agenda: ccType.agendaBubbleName,
    list: ccType.agendaBubbleName,
    popover: { fontSize: "13px" },
};
const META_OVERRIDE = {
    agenda: ccType.agendaBubbleMeta,
    list: ccType.agendaBubbleMeta,
};

const ENTRANCE = {
    positioned: `${motion.keyframes.posBubble} ${motion.dur.posBubble}ms ${SP} var(--cc-d, 0ms) both`,
    default: `${motion.keyframes.bubble} ${motion.dur.bubble}ms ${SP} var(--cc-d, 0ms) both`,
};

const build = (variant, allDay, animate) => ({
    display: "flex",
    gap: "8px",
    alignItems: "stretch",
    textAlign: "left",
    border: 0,
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    overflow: "hidden",
    cursor: "pointer",
    fontFamily: "var(--cc-sans)",
    color: "var(--cc-ink)",
    background: allDay ? HATCH_BG : REST_BG,
    ...VARIANT[variant],
    transition: `transform 280ms ${SP}, box-shadow 280ms ${SP}, background 200ms`,
    ...(animate
        ? { animation: ENTRANCE[variant] || ENTRANCE.default }
        : null),

    // §13-G5 — hover lift only where hover is real, or a tap leaves the bubble
    // permanently raised on touch.
    "@media (hover: hover)": {
        "&:hover": {
            transform: "translateY(-2px) scale(1.02)",
            boxShadow: "var(--cc-sh1)",
            background: allDay ? HATCH_BG_HOVER : HOVER_BG,
        },
    },
    "&:active": { transform: "scale(.97)" },
    "&:focus-visible": {
        outline: "2px solid var(--cc-c)",
        outlineOffset: "2px",
    },

    "& .cc-bub-bar": {
        width: "3px",
        flex: "none",
        alignSelf: "stretch",
        borderRadius: "0 3px 3px 0",
        background: "var(--cc-c)",
    },
    "& .cc-bub-body": { minWidth: 0, display: "grid" },
    "& .cc-bub-name": {
        ...ccType.bubbleName,
        ...NAME_OVERRIDE[variant],
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
    },
    "& .cc-bub-mark": { ...ccType.bubbleMark, color: "var(--cc-red)" },
    "& .cc-bub-meta": {
        ...ccType.bubbleMeta,
        ...META_OVERRIDE[variant],
        color: "var(--cc-mute)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
    },
});

// Cache one sx object per (variant, allDay, animate) so emotion reuses the
// class instead of re-serialising on every bubble.
const SX_CACHE = {};
const bubbleSx = (variant, allDay, animate) => {
    const key = `${variant}|${allDay ? 1 : 0}|${animate ? 1 : 0}`;
    if (!SX_CACHE[key]) SX_CACHE[key] = build(variant, allDay, animate);
    return SX_CACHE[key];
};

/* ----------------------------------------------------------------- bubble --*/

/**
 * The bubble. Used three ways:
 *   1. inside FullCalendar via `eventContent` (`animate={false}` — the entrance
 *      animation is put on `.fc-event` by `eventDidMount`, which is where the
 *      grid stagger index can actually be computed);
 *   2. in the hand-rolled Agenda;
 *   3. in the custom `+N more` popover.
 */
export function MeetingBubble({
    as = "div",
    variant = "month",
    allDay = false,
    color,
    name,
    meta,
    repeats = false,
    itSupport = false,
    ariaLabel,
    delay = null,
    animate = true,
    onClick,
    title,
}) {
    const style = { "--cc-c": color || TYPE_COLOUR_FALLBACK };
    if (delay != null) style["--cc-d"] = `${delay}ms`;

    return (
        <Box
            component={as}
            {...(as === "button" ? { type: "button" } : null)}
            className="cc-bub"
            style={style}
            sx={bubbleSx(variant, allDay, animate)}
            onClick={onClick}
            aria-label={ariaLabel}
            title={title}
        >
            <i className="cc-bub-bar" aria-hidden="true" />
            <span className="cc-bub-body">
                {/* LINE 1 — meeting name. */}
                <span className="cc-bub-name">
                    {name}
                    {repeats ? (
                        <span className="cc-bub-mark" title="Repeats">
                            {" ↻"}
                        </span>
                    ) : null}
                    {itSupport ? (
                        <span className="cc-bub-mark" title="IT support">
                            {" ⌁"}
                        </span>
                    ) : null}
                </span>
                {/* LINE 2 — room. */}
                <span className="cc-bub-meta">{meta}</span>
            </span>
        </Box>
    );
}

/* ---------------------------------------------------- room-line assembly ---*/

/** Room line per context (§10.12). Never omits the room. */
export const bubbleMeta = ({ variant, roomName, start, allDay }) => {
    const room = roomName || "Unknown room";
    if (variant === "agenda") return room;
    if (allDay) return `${room} · all day`;
    return `${compactTime(start)} · ${room}`;
};

/** Full-sentence label, because the visible text is abbreviated (§10.12). */
export const bubbleAriaLabel = ({
    name,
    fullRoomName,
    start,
    end,
    allDay,
    typeName,
}) =>
    [
        name,
        fullRoomName,
        allDay ? "all day" : `${displayTime(start)} to ${displayTime(end)}`,
        typeName,
    ]
        .filter(Boolean)
        .join(", ");

/* -------------------------------------------- FullCalendar event content ---*/

/**
 * `eventContent` renderer. Four per-view variants, all two-line, all
 * name-over-room. `rooms` / `types` are threaded in from index.jsx purely so
 * the aria-label can name the room and type in full.
 */
function RenderEventContent({ arg, rooms, types }) {
    const { view, event } = arg;
    const props = event.extendedProps || {};
    const roomName = props.roomName;
    const colour = event.backgroundColor || TYPE_COLOUR_FALLBACK;
    const allDay = Boolean(event.allDay);

    const fullRoomName =
        (rooms || []).find((rm) => rm?.id === props.room)?.value || roomName;
    const typeName = (types || []).find((tp) => tp?.id === props.type)?.value;

    const shared = {
        color: colour,
        name: event.title,
        allDay,
        repeats: Boolean(props.recurrence_id),
        itSupport: Boolean(props.it_support),
        animate: false,
        ariaLabel: bubbleAriaLabel({
            name: event.title,
            fullRoomName,
            start: event.start,
            end: event.end,
            allDay,
            typeName,
        }),
    };

    // 1) MONTH.
    if (view.type === "dayGridMonth") {
        return (
            <MeetingBubble
                {...shared}
                variant="month"
                meta={bubbleMeta({
                    variant: "month",
                    roomName,
                    start: event.start,
                    allDay,
                })}
            />
        );
    }

    // 2) TIME GRID (week / day). All-day meetings ride the rail above the grid
    //    and keep the flat bubble box; timed meetings are absolutely positioned.
    if (view.type === "timeGridDay" || view.type === "timeGridWeek") {
        return (
            <MeetingBubble
                {...shared}
                variant={allDay ? "month" : "positioned"}
                meta={bubbleMeta({
                    variant: "timegrid",
                    roomName,
                    start: event.start,
                    allDay,
                })}
            />
        );
    }

    // 3) LIST views (kept for any route that still asks for one).
    if (view.type.startsWith("list")) {
        return (
            <MeetingBubble
                {...shared}
                variant="list"
                meta={bubbleMeta({ variant: "agenda", roomName })}
            />
        );
    }

    // 4) fallback for any other view.
    return (
        <MeetingBubble
            {...shared}
            variant="month"
            meta={bubbleMeta({
                variant: "month",
                roomName,
                start: event.start,
                allDay,
            })}
        />
    );
}

export default RenderEventContent;
