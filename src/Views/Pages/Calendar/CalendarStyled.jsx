// CalendarStyled.jsx
//
// Concourse skin for FullCalendar (ARBITER §10.11 month grid, §10.13 week/day
// time grid). Every colour comes from a `--cc-*` custom property emitted at
// :root by <GlobalStyles> in App.js — no `theme.palette.*` is read here, so
// this file is mode-agnostic by construction (ARBITER §12).
//
// The FullCalendar DOM is only *neutralised* here: `.fc-event` loses all of its
// own chrome so the bubble rendered by RenderEventContent.jsx owns the whole
// look. See RenderEventContent.jsx for the bubble itself.
import { styled } from "@mui/material/styles";

import {
    bp,
    layout,
    motion,
    zIndex as ccZIndex,
} from "../../../Utilites/concourse";

const SP = "var(--cc-sp)";
const PHONE = `@media (max-width:${bp.sheet}px)`;
const HOVER = "@media (hover: hover)";

// One hour of the time grid, and the 15-minute slat that builds it.
const HOUR = layout.hourRow; // 44
const SLAT = HOUR / 4; // 11 — slotDuration is 00:15

// Half of the 5px inter-cell gutter, applied as td padding on both sides.
const HALF_GAP = 2.5;

const CalendarStyled = styled("div")({
    minWidth: 0,
    // §10.11 / §10.13 — the grid's own 9px side gutter and 12px bottom gutter.
    padding: `0 9px 12px`,

    "& .fc-license-message": { display: "none" },

    // ---------------------------------------------------------------- base ---
    "& .fc": {
        // Every visible FullCalendar rule is re-drawn by us, so kill its own.
        "--fc-border-color": "transparent",
        "--fc-page-bg-color": "transparent",
        "--fc-neutral-bg-color": "transparent",
        "--fc-today-bg-color": "transparent",
        "--fc-event-bg-color": "transparent",
        "--fc-event-border-color": "transparent",
        "--fc-event-text-color": "var(--cc-ink)",
        "--fc-bg-event-opacity": 1,
        "--fc-highlight-color": "var(--cc-wash)",
        "--fc-now-indicator-color": "var(--cc-red)",
        color: "var(--cc-ink)",
        fontFamily: "var(--cc-sans)",
        fontSize: "15px",
        lineHeight: 1.5,
    },
    // Concourse separates cells with gaps, not rules, so every FullCalendar
    // border is removed outright — a transparent 1px border would still eat
    // 2px per cell and throw the 5px gutter out.
    "& .fc table, & .fc th, & .fc td, & .fc .fc-scrollgrid, & .fc .fc-scrollgrid-section > *":
        { border: 0 },
    "& .fc .fc-scroller": { scrollbarWidth: "thin" },
    // The day-cell content hook also fires for time-grid columns; we return
    // null there, but hide the wrapper too so it can never take up space.
    "& .fc .fc-timegrid-col-misc": { display: "none" },

    // ------------------------------------------------- column header cells ---
    "& .fc .fc-col-header-cell": {
        background: "transparent",
        padding: `0 ${HALF_GAP}px 4px`,
        verticalAlign: "bottom",
    },
    "& .fc .fc-col-header-cell-cushion": {
        display: "block",
        padding: 0,
        textDecoration: "none",
        color: "inherit",
    },
    // Month: three-letter day name only (§10.11).
    "& .fc .cc-dow": {
        display: "block",
        textAlign: "center",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: ".07em",
        textTransform: "uppercase",
        color: "var(--cc-mute)",
    },
    // Week / day: day name over day number (§10.13).
    "& .fc .cc-colhead": {
        display: "grid",
        justifyItems: "center",
        gap: "1px",
        paddingBottom: "3px",
    },
    "& .fc .cc-colhead-dow": {
        fontSize: "10.5px",
        fontWeight: 700,
        letterSpacing: ".07em",
        textTransform: "uppercase",
        color: "var(--cc-mute)",
    },
    "& .fc .cc-colhead-num": {
        fontSize: "17px",
        fontWeight: 700,
        letterSpacing: "-.02em",
        fontVariantNumeric: "tabular-nums",
        color: "var(--cc-ink)",
    },
    "& .fc .fc-day-today .cc-colhead-num": { color: "var(--cc-red)" },

    // ================================================== MONTH GRID (§10.11) ==
    "& .fc-dayGridMonth-view .fc-daygrid-day": { padding: `${HALF_GAP}px` },
    "& .fc-dayGridMonth-view .fc-daygrid-day-frame": {
        position: "relative",
        background: "var(--cc-srf2)",
        borderRadius: "15px",
        minHeight: `${layout.monthCellMinHeight}px`,
        padding: "6px",
        transition: `background 250ms ${SP}, transform 250ms ${SP}`,
    },
    "& .fc-dayGridMonth-view .fc-day-other .fc-daygrid-day-frame": {
        background: "transparent",
    },
    "& .fc-dayGridMonth-view .fc-daygrid-day-top": {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
    },
    "& .fc-dayGridMonth-view .fc-daygrid-day-number": {
        padding: 0,
        margin: 0,
        color: "inherit",
        textDecoration: "none",
    },
    "& .fc .cc-daynum": {
        width: "23px",
        height: "23px",
        borderRadius: "99px",
        display: "grid",
        placeItems: "center",
        flex: "none",
        fontSize: "12px",
        fontWeight: 700,
        fontVariantNumeric: "tabular-nums",
        color: "var(--cc-mute)",
    },
    "& .fc .fc-day-today .cc-daynum": {
        background: "var(--cc-red)",
        color: "var(--cc-on-red)",
        boxShadow: "var(--cc-glow-dot)",
    },
    "& .fc .fc-day-other .cc-daynum": { opacity: 0.3 },
    "& .fc-dayGridMonth-view .fc-daygrid-day-events": {
        marginTop: "4px",
        marginBottom: 0,
        minHeight: 0,
    },
    "& .fc-dayGridMonth-view .fc-daygrid-event-harness": { marginTop: "4px" },
    "& .fc-dayGridMonth-view .fc-daygrid-event-harness:first-of-type": {
        marginTop: 0,
    },
    "& .fc-dayGridMonth-view .fc-daygrid-day-bottom": {
        padding: 0,
        marginTop: "4px",
    },

    // Quick-add "+" (§10.11). Invisible until the cell is hovered, or until the
    // button itself is keyboard-focused (§11).
    "& .fc .cc-plus": {
        position: "absolute",
        bottom: "5px",
        right: "5px",
        width: "21px",
        height: "21px",
        borderRadius: "99px",
        border: 0,
        padding: 0,
        background: "var(--cc-srf)",
        color: "var(--cc-red)",
        boxShadow: "var(--cc-sh1)",
        display: "grid",
        placeItems: "center",
        fontSize: "13px",
        lineHeight: 1,
        cursor: "pointer",
        zIndex: 3,
        opacity: 0,
        transform: "scale(.6)",
        transition: `opacity 250ms ${SP}, transform 300ms ${SP}, background 200ms, color 200ms`,
    },
    "& .fc .cc-plus:hover": {
        background: "var(--cc-red)",
        color: "var(--cc-on-red)",
    },
    "& .fc .cc-plus:focus-visible": {
        opacity: 1,
        transform: "none",
        outline: "2px solid var(--cc-red)",
        outlineOffset: "2px",
    },
    [HOVER]: {
        "& .fc-dayGridMonth-view .fc-daygrid-day:not(.fc-day-other):hover .fc-daygrid-day-frame":
            {
                background: "var(--cc-wash)",
                transform: "scale(1.012)",
                cursor: "cell",
            },
        "& .fc-dayGridMonth-view .fc-daygrid-day:not(.fc-day-other):hover .cc-plus":
            { opacity: 1, transform: "none" },
    },

    // "+N more" link (§10.12). FullCalendar's own popover is suppressed in
    // index.jsx (moreLinkClick returns true); this is only the trigger.
    "& .fc .fc-daygrid-more-link, & .fc .fc-timegrid-more-link": {
        border: 0,
        background: "transparent",
        boxShadow: "none",
        margin: 0,
        padding: "2px 8px",
        borderRadius: "99px",
        fontSize: "10.5px",
        fontWeight: 700,
        color: "var(--cc-red)",
        textAlign: "left",
        textDecoration: "none",
        cursor: "pointer",
        transition: "background 200ms",
    },
    "& .fc .fc-daygrid-more-link:hover, & .fc .fc-timegrid-more-link:hover": {
        background: "var(--cc-wash)",
    },
    "& .fc .fc-daygrid-more-link:focus-visible, & .fc .fc-timegrid-more-link:focus-visible":
        { outline: "2px solid var(--cc-red)", outlineOffset: "2px" },

    // ============================================== WEEK / DAY GRID (§10.13) ==
    // "All day" rail: the same daygrid DOM as the month view, so every month
    // rule above is scoped to `.fc-dayGridMonth-view` and the rail is reset here.
    "& .fc-timegrid .fc-daygrid-day": { padding: `0 ${HALF_GAP}px 6px` },
    "& .fc-timegrid .fc-daygrid-day-frame": {
        background: "transparent",
        borderRadius: 0,
        padding: 0,
        minHeight: "6px",
    },
    // The all-day rail has no day numbers; `dayCellContent` returns null there,
    // but the wrapper FullCalendar still emits must not take up space.
    "& .fc-timegrid .fc-daygrid-day-top": { display: "none" },
    "& .fc-timegrid .fc-daygrid-day-events": { marginTop: 0, marginBottom: 0 },
    "& .fc-timegrid .fc-daygrid-event-harness": { marginTop: "4px" },
    "& .fc-timegrid .fc-daygrid-event-harness:first-of-type": { marginTop: 0 },

    // The axis (hour gutter + "All day" label).
    "& .fc .fc-timegrid-axis": { border: 0, padding: 0 },
    "& .fc .fc-timegrid-axis-cushion": {
        fontFamily: "var(--cc-mono)",
        fontSize: "9px",
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--cc-mute)",
        textAlign: "right",
        paddingRight: "8px",
        maxWidth: "none",
    },
    "& .fc .fc-timegrid-slot": { height: `${SLAT}px`, border: 0 },
    "& .fc .fc-timegrid-slot-minor": { borderTop: 0 },
    "& .fc .fc-timegrid-slot-label": { border: 0, verticalAlign: "top" },
    "& .fc .fc-timegrid-slot-label-cushion": {
        display: "block",
        fontFamily: "var(--cc-mono)",
        fontSize: "10px",
        lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
        color: "var(--cc-mute)",
        textAlign: "right",
        paddingRight: "8px",
    },

    // Columns. The hour rules are painted as a repeating gradient inside each
    // column so they are clipped by the column's own 15px radius (§10.13).
    "& .fc .fc-timegrid-col:not(.fc-timegrid-axis)": {
        padding: `0 ${HALF_GAP}px`,
        background: "transparent",
    },
    "& .fc .fc-timegrid-col:not(.fc-timegrid-axis) .fc-timegrid-col-frame": {
        backgroundColor: "var(--cc-srf2)",
        backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 ${
            HOUR - 1
        }px, var(--cc-line) ${HOUR - 1}px ${HOUR}px)`,
        borderRadius: "15px",
        overflow: "hidden",
    },
    "& .fc .fc-day-today.fc-timegrid-col .fc-timegrid-col-frame": {
        backgroundColor: "var(--cc-wash)",
    },
    // The all-day rail reuses `.fc-daygrid-*`, never `.fc-timegrid-col-frame`,
    // so the two rules above cannot collide.

    // Now-line (§10.13) — today's column only, FullCalendar renders it there.
    "& .fc .fc-timegrid-now-indicator-line": {
        border: 0,
        left: 0,
        right: 0,
        height: "2px",
        borderRadius: "99px",
        background: "var(--cc-red)",
        zIndex: ccZIndex.nowline,
        pointerEvents: "none",
        animation: `${motion.keyframes.nowPulse} ${motion.dur.nowPulse}ms ease-in-out infinite`,
    },
    "& .fc .fc-timegrid-now-indicator-line::before": {
        content: '""',
        position: "absolute",
        left: "-4px",
        top: "-3px",
        width: "8px",
        height: "8px",
        borderRadius: "99px",
        background: "var(--cc-red)",
    },
    "& .fc .fc-timegrid-now-indicator-arrow": { display: "none" },

    // ============================================ EVENT CHROME NEUTRALISED ==
    // Everything visible about a meeting is the bubble in RenderEventContent.
    "& .fc .fc-event": {
        // FullCalendar writes the event colour as an INLINE background, so this
        // has to out-rank it. The colour is not lost: the bubble reads it as
        // `--cc-c` and turns it into a 12% wash plus the 3px bar.
        backgroundColor: "transparent !important",
        borderColor: "transparent !important",
        border: 0,
        boxShadow: "none",
        padding: 0,
        margin: 0,
        borderRadius: "11px",
        color: "inherit",
        textDecoration: "none",
        outline: "none",
    },
    // The bubble is the only element in the design whose focus ring takes the
    // meeting-type colour rather than red (§10.12 / §11). `--cc-c` is put on
    // this element by `eventDidMount`.
    "& .fc .fc-event:focus-visible": {
        outline: "2px solid var(--cc-c, var(--cc-red))",
        outlineOffset: "2px",
    },
    "& .fc .fc-event .fc-event-main": { padding: 0, color: "inherit" },
    "& .fc .fc-event-selected::before, & .fc .fc-event-selected::after, & .fc .fc-event:focus::before, & .fc .fc-event:focus::after":
        { display: "none" },
    "& .fc .fc-daygrid-event": {
        marginTop: 0,
        marginBottom: 0,
        borderRadius: "11px",
    },
    "& .fc .fc-timegrid-event": {
        margin: "2px 3px",
        boxShadow: "none",
        borderRadius: "11px",
    },
    "& .fc .fc-timegrid-event .fc-event-main": { padding: 0 },
    // Drag / select feedback.
    "& .fc .fc-highlight": {
        background: "var(--cc-wash)",
        borderRadius: "11px",
    },

    // -------------------------------------------------------- phone (§9) ---
    // At <=620px the grids are not rendered at all (index.jsx forces Agenda),
    // but keep the guard so a stray mount cannot show a squeezed grid.
    [PHONE]: {
        "& .fc-dayGridMonth-view, & .fc-timegrid": { display: "none" },
    },
});

export default CalendarStyled;
