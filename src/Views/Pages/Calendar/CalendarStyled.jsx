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
    monthCell,
    motion,
    zIndex as ccZIndex,
} from "../../../Utilites/concourse";

const SP = "var(--cc-sp)";
const PHONE = `@media (max-width:${bp.sheet}px)`;
const HOVER = "@media (hover: hover)";

// One hour of the time grid, and the 15-minute slat that builds it.
const HOUR = layout.hourRow; // 44
const SLAT = HOUR / 4; // 11 — slotDuration is 00:15

// Half of the 5px inter-cell gutter. Still used by the column headers and the
// week/day all-day rail. The MONTH grid no longer splits the gutter — see the
// `.fc-dayGridMonth-view .fc-daygrid-day` rule below.
const HALF_GAP = monthCell.halfGutter;

// One @container ccday block. `t.gap` is written in BOTH places it matters —
// the events box's top margin and the bubble's bottom margin — because the
// budget and the card's bottom inset must move together or the arithmetic
// stops balancing. Generating both from one number makes that impossible to
// get wrong. NOTE what is deliberately ABSENT: no `.fc-daygrid-event-harness`
// margin and no `.fc-daygrid-day-bottom` margin. FullCalendar writes a numeric
// inline `margin-top` on both (daygrid/internal.js:236 and :606-612) and preact
// serialises the number 0 as "0px", so an emotion class can never win there.
const monthTierBlock = (t) => ({
    "& .fc .cc-daynum": {
        width: `${t.disc}px`,
        height: `${t.disc}px`,
        fontSize: `${t.discFont}px`,
    },
    "& .fc-dayGridMonth-view .fc-daygrid-day-events": { marginTop: `${t.gap}px` },
    "& .fc-dayGridMonth-view .fc-daygrid-day-events .fc-daygrid-event": {
        marginBottom: `${t.gap}px`,
    },
    "& .fc .fc-daygrid-more-link": {
        fontSize: `${t.link}px`,
        padding: t.linkPad,
    },
});

const CalendarStyled = styled("div")({
    minWidth: 0,
    // §10.11 / §10.13 — the grid's own 9px side gutter and 12px bottom gutter.
    padding: `0 9px 12px`,
    // FullCalendar is mounted with `height="100%"`, and a percentage height is
    // only a height if its container has one. index.jsx makes every ancestor
    // from App.js's 100vh shell down to here a definite-height flex item, so
    // this is where the chain lands: border-box, or the 12px bottom gutter
    // would push the grid past the page again.
    height: "100%",
    boxSizing: "border-box",
    // Floor, not a layout value. If that chain is ever broken the percentage
    // would resolve to `auto` and FullCalendar's liquid ScrollGrid — which
    // positions its scroller with `inset:0` — would collapse to nothing. This
    // guarantees a usable grid rather than a blank card.
    minHeight: "240px",

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
        // Kept in step with the `.fc-highlight` rule below, so anything that
        // reads FullCalendar's own variable gets the same visible selection.
        "--fc-highlight-color": "color-mix(in srgb, var(--cc-red) 20%, transparent)",
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
    // The month grid now carries its whole 5px gutter as the first row's
    // padding-top (was 2.5px), which would grow the DOW-row-to-first-card gap
    // from 6.5px to 9px. Give the 2.5px back here. (0,4,0) beats the shared
    // (0,3,0) rule above without depending on source order.
    "& .fc .fc-dayGridMonth-view .fc-col-header-cell": { paddingBottom: "1.5px" },
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
    // THE ENTIRE 5px VERTICAL GUTTER IS THE TD'S PADDING-TOP, AND THE TD HAS NO
    // PADDING-BOTTOM. This is the load-bearing half of the fix.
    // `TableRow.computeMaxContentHeight()` (@fullcalendar/daygrid internal.js:
    // 679-684) is literally
    //     cellEl.getBoundingClientRect().bottom - dayEvents.getBoundingClientRect().top
    // with cellEl = THIS <td>. Anything between the card's painted floor and
    // the td's border-box bottom is counted as usable space and reappears as
    // content hanging into the row below. Driving it to zero makes the level
    // FullCalendar refuses to cross (`levelCoord + thickness <= maxCoord`,
    // core/internal-common.js:5843) identical to the card's bottom edge.
    // Total vertical padding is unchanged at 5px, so ROW HEIGHTS AND THE CARD
    // HEIGHT ARE BIT-IDENTICAL to before — only where the gutter sits moves.
    // Horizontal padding is untouched, so `framePositions` (internal.js:643-655)
    // and the column headers still line up exactly.
    "& .fc-dayGridMonth-view .fc-daygrid-day": {
        padding: `${monthCell.gutter}px ${monthCell.halfGutter}px 0`,
    },
    // THE MONTH GRID DOES NOT SCROLL (user, defect 5). Three rules do it:
    //   1. the body table takes the scroller's full height (below), so the six
    //      rows of a `fixedWeekCount` month divide the height that exists
    //      instead of adding up to whatever their content wants;
    //   2. the cell is `height:100%` of its row with NO min-height — the
    //      `layout.monthCellMinHeight` (104px) floor is what used to force the
    //      overflow: six 104px rows plus gutters need ~690px and the card is
    //      ~590px at a 900px viewport, which is exactly the 98px of scroll that
    //      was measured. 104px is still what a cell GETS whenever the card is
    //      tall enough — it is a design target now, not a hard floor;
    //   3. `container: ccday / size` publishes the cell height so the day
    //      number, the bubbles and the `+N more` link scale down with it (see
    //      the `@container ccday` tiers at the end of this file and in
    //      RenderEventContent.jsx).
    //
    // THE FRAME MUST NOT CLIP. It used to carry `overflow: hidden` as a
    // backstop for content below the smallest tier, and that silently broke
    // drag-selection: FullCalendar renders ONE `.fc-highlight` per week-row
    // segment, inside the segment's FIRST cell, sized to span the whole
    // segment — measured at 1127px wide inside a 156.7px frame. `hidden` cut it
    // to the one cell, which is exactly the "only the start and the beginning
    // of each new line" the user saw. The backstop moved to
    // `.fc-daygrid-day-events` below, which is where the content that can
    // overflow actually lives.
    // NO TRANSFORM ON HOVER. FullCalendar decides how many bubbles fit by
    // measuring each `.fc-daygrid-event-harness` with `getBoundingClientRect()`
    // (`querySegHeights`, @fullcalendar/daygrid internal.js), and a rect is
    // reported through any ANCESTOR transform. A `scale()` here therefore
    // reported every bubble in the hovered cell ~1% taller, which flipped
    // whether the last one fit; the re-render re-measured, the measurement
    // changed again, and the row oscillated — bubbles blinking in and out,
    // duplicates, and the "+N more" link flickering under the cursor. The
    // hover now changes paint only, which measurement cannot see.
    //
    // One ancestor transform does survive and is harmless: the calendar card's
    // `cc-rise` entrance animation in index.jsx scales the whole card from .98
    // for 500ms, which covers the first `updateSizing`. It does not corrupt the
    // fit because BOTH terms of the comparison are measured through the same
    // scale — the budget and every bubble shrink together, so the decision is
    // identical. The only residual is the `Math.round` on thickness, under half
    // a pixel, and it is corrected on the next sizing pass. A transform that
    // covered only PART of the measured tree — a hovered cell, one bubble —
    // would not have that property, which is why one is a bug and one is not.
    //
    // NO PADDING-BOTTOM, EVER. The frame's bottom 6px used to sit between the
    // events box and `td.bottom`, so `computeMaxContentHeight` counted it as
    // usable: together with the td's old 2.5px that was 8.5px of phantom budget
    // per cell, per row. The card's bottom inset now lives INSIDE the box
    // FullCalendar measures — see the `.fc-daygrid-event` margin-bottom below.
    //
    // `containerType: "size"` STAYS. It computes to `contain: size layout style`,
    // so the frame is sized as if empty: the tier a cell selects depends only on
    // the row height, never on what got placed in it. That is what makes the
    // measure -> re-render -> re-measure loop (updateSizing on every
    // componentDidUpdate, internal.js:549-556) settle in one pass instead of
    // oscillating. It also means `@container ccday (max-height: N)` tests the
    // frame's CONTENT box, which is now cell height MINUS 6px (not 12px).
    "& .fc-dayGridMonth-view .fc-daygrid-day-frame": {
        position: "relative",
        background: "var(--cc-srf2)",
        borderRadius: "15px",
        height: "100%",
        minHeight: 0,
        containerType: "size",
        containerName: "ccday",
        padding: `${monthCell.framePad}px ${monthCell.framePad}px 0`, // 6px 6px 0
        transition: `background 250ms ${SP}, box-shadow 250ms ${SP}`,
    },
    "& .fc-dayGridMonth-view .fc-daygrid-body": { height: "100%" },
    "& .fc-dayGridMonth-view .fc-daygrid-body > table": { height: "100%" },
    // FullCalendar writes `overflow` inline on its scrollers, so this has to be
    // important to win. The page-level scroller in index.jsx is untouched and
    // still catches viewports below the smallest tier.
    "& .fc-dayGridMonth-view .fc-scroller": { overflow: "hidden !important" },
    "& .fc-dayGridMonth-view .fc-day-other .fc-daygrid-day-frame": {
        background: "transparent",
    },
    "& .fc-dayGridMonth-view .fc-daygrid-day-top": {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
    },
    // FullCalendar renders `dayCellContent` INSIDE this anchor, and its own
    // stylesheet gives the anchor `position:relative; z-index:4`. That makes it
    // the containing block for the absolutely-positioned quick-add "+", which
    // is why the button used to land on top of the date number instead of in a
    // corner of the cell. Stretching the anchor across the day-top row moves
    // the "+" to the cell's top-right without taking `position:relative` away
    // — the anchor's z-index is what keeps the date number legible above the
    // drag-selection `.fc-highlight` (z-index 3).
    "& .fc-dayGridMonth-view .fc-daygrid-day-number": {
        flex: 1,
        padding: 0,
        margin: 0,
        color: "inherit",
        textDecoration: "none",
    },
    // Tier 0 comes from `monthCell.base`, not from literals. The disc's height
    // is subtracted from the cell to get FullCalendar's budget, so a number
    // typed here and a number typed in concourse.js are two numbers that can
    // disagree — which is the drift the tier ladder was rebuilt to close. The
    // tier blocks below narrow the same properties from the same source.
    "& .fc .cc-daynum": {
        width: `${monthCell.base.disc}px`,
        height: `${monthCell.base.disc}px`,
        borderRadius: "99px",
        display: "grid",
        placeItems: "center",
        flex: "none",
        fontSize: `${monthCell.base.discFont}px`,
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
    // `overflow: hidden` here clips NOTHING VERTICALLY and that is fine. In
    // balanced mode FullCalendar's own CSS makes this box
    // `position:absolute; left:0; right:0` with height:auto (daygrid/internal.js
    // :982), so it shrink-wraps its flow content and there is never vertical
    // overflow to hide.
    //
    // WHAT IT ACTUALLY DOES IS CONFINE A MULTI-DAY BAR TO ITS FIRST DAY, and
    // that is a limitation, not a safeguard. A segment spanning several days is
    // rendered ONCE, in its first cell, as an `-abs` harness with an inline
    // `left: 0` and a NEGATIVE `right` — `rights[firstCol] - rights[lastCol]`
    // (daygrid/internal.js:598), where `rights` are measured from a common
    // origin (core/internal-common.js:5612). A negative `right` is how
    // FullCalendar STRETCHES the bar past its own cell and across the span; this
    // clip cuts it back to the first card. Removing the clip does not by itself
    // make multi-day bookings span, because the opaque `--cc-srf2` frames of the
    // later cells paint over the bar anyway — that is a second, independent
    // thing to solve. Until both are solved, leave it: a bar amputated at a card
    // edge reads as a normal one-day bubble, a bar half-painted under the next
    // three cards does not.
    //
    // Do NOT give this box a definite height, a flex layout, or
    // `margin-top: auto` — a definite height is exactly what gives this clip
    // teeth on the vertical axis, and it then hides the "+N more" link entirely.
    "& .fc-dayGridMonth-view .fc-daygrid-day-events": {
        // Same `base.gap` the bubbles carry as `margin-bottom`. The two are the
        // top and the bottom of one rhythm and must move together — see the
        // tier block generator at the top of this file.
        marginTop: `${monthCell.base.gap}px`,
        marginBottom: 0,
        minHeight: 0,
        overflow: "hidden",
    },
    // Balanced mode positions this box against the FRAME'S PADDING BOX, so
    // `left:0/right:0` land on the card's border edges and the bubbles ran 12px
    // wider than the day number above them. (0,4,0) beats FullCalendar's
    // `.fc .fc-daygrid-body-balanced .fc-daygrid-day-events` (0,3,0)
    // deterministically, without depending on emotion's injection order.
    "& .fc-dayGridMonth-view .fc-daygrid-body-balanced .fc-daygrid-day-events": {
        left: `${monthCell.framePad}px`,
        right: `${monthCell.framePad}px`,
    },
    // Paint order inside a month cell, bottom to top: cell surface -> selection
    // tint (3) -> date number (4, FullCalendar's own) -> bubbles (5). The tint
    // needs a POSITIVE z-index or the opaque `--cc-srf2` frames of the cells
    // after it in DOM order paint straight over it — that is the second half of
    // the coverage bug, and it survives even once the clipping is gone. Lifting
    // the bubbles to 5 keeps bookings readable through a selection.
    "& .fc-dayGridMonth-view .fc-daygrid-bg-harness": { zIndex: 3 },
    // NEVER DECLARE `position` HERE. This selector is (0,3,0); FullCalendar's
    // `.fc .fc-daygrid-event-harness-abs{left:0;position:absolute;right:0;top:0}`
    // is (0,2,0), so ANY position value written here out-ranks it. Every seg
    // behind "+N more" is rendered as an `-abs` harness with `visibility:hidden`
    // (daygrid/internal.js:340-346 pushes it, :606-612 renders it) and relies on
    // `position:absolute` to take NO flow space — `visibility:hidden` does not
    // remove an element from flow. Forced to `relative`, each hidden bubble took
    // its full height in flow and pushed `.fc-daygrid-day-bottom` (the LAST
    // in-flow child of the events box) down by hiddenCount x harness height:
    // four hidden bubbles is ~160px of displacement in a ~90px cell, which put
    // the link a full row lower, under the NEXT day's number, while
    // `moreLinkClick`'s `arg.date` still correctly reported the upper day.
    // The base rule `.fc .fc-daygrid-event-harness{position:relative}` already
    // positions in-flow harnesses, so the override was pure redundancy on
    // visible segs and pure poison on hidden ones.
    //
    // NO `marginTop` EITHER. FullCalendar writes an inline `margin-top` on every
    // in-flow harness (`marginTop: isAbsolute ? '' : placement.marginTop`, a
    // number preact serialises as "0px"), so it was dead code — and on `-abs`
    // harnesses, where FullCalendar clears the inline margin and positions with
    // an exact inline `top`, it would have displaced the bar. The inter-bubble
    // gap lives on `.fc-daygrid-event` instead (next rule), INSIDE the box
    // `querySegHeights` measures.
    //
    // `zIndex` is layout-inert and stays: it keeps the bubble above the
    // `.fc-daygrid-bg-harness` drag-selection tint (z-index 3) that precedes it.
    "& .fc-dayGridMonth-view .fc-daygrid-event-harness": { zIndex: 5 },
    // THE OTHER HALF OF THE FIX — the card's bottom inset and the inter-bubble
    // rhythm, expressed where FullCalendar can SEE them.
    // `.fc-daygrid-event` is the `<a>` inside the harness and is `display:block`.
    // Its bottom margin does not collapse out, because the harness's own
    // `:after{clear:both;content:"";display:table}` (daygrid/internal.js:982) is
    // the last in-flow child — the exact mechanism FullCalendar uses for its own
    // `.fc .fc-daygrid-event{margin-top:1px}`. So the margin is INSIDE the rect
    // `querySegHeights` reads back as `thickness`, which makes
    //     levelCoord + thickness <= maxCoord
    // equivalent to
    //     painted bubble bottom <= card floor - gap
    // with ZERO residual. Selector is (0,4,0) so it beats both
    // `& .fc .fc-daygrid-event` (0,3,0) below and FullCalendar's
    // `.fc-direction-ltr .fc-daygrid-event.fc-event-start` family (0,3,0),
    // regardless of stylesheet injection order.
    "& .fc-dayGridMonth-view .fc-daygrid-day-events .fc-daygrid-event": {
        marginBottom: `${monthCell.base.gap}px`,
    },
    // `.fc-daygrid-day-bottom` is rendered in EVERY cell, even when moreCnt is 0
    // (only the `<a>` inside it is conditional), and FullCalendar always writes
    // an inline `margin-top` on it (`style={{ marginTop: props.moreMarginTop }}`,
    // daygrid/internal.js:236, fed from `leftoverMargins` at :360). That margin
    // is load-bearing — it is how the link clears absolutely-positioned
    // multi-day bars — so DO NOT DECLARE `marginTop` HERE. It would be dead code
    // anyway: inline beats any emotion class. Only the side margins are ours;
    // FullCalendar's own `margin: 0 2px` would put the link 8px from the card
    // edge while the bubbles sit at 6px.
    "& .fc-dayGridMonth-view .fc-daygrid-day-bottom": {
        padding: 0,
        marginLeft: 0,
        marginRight: 0,
    },

    // Quick-add "+" (§10.11). Invisible until the cell is hovered, or until the
    // button itself is keyboard-focused (§11).
    //
    // Pinned to the top-RIGHT of the cell, opposite the date number, which owns
    // the top-left. `top/bottom:0` + `margin:auto 0` centres it on the day-top
    // row, so it stays clear of the date at every width and cannot drift into
    // the bubbles or the "+N more" link below however tall the cell gets.
    "& .fc .cc-plus": {
        position: "absolute",
        top: 0,
        bottom: 0,
        right: 0,
        margin: "auto 0",
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
        // Paint only — see the day-frame rule above for why a transform here
        // makes the row's bubbles oscillate.
        "& .fc-dayGridMonth-view .fc-daygrid-day:not(.fc-day-other):hover .fc-daygrid-day-frame":
            {
                background: "var(--cc-wash)",
                boxShadow: "var(--cc-sh1)",
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
    // Concurrent bookings sit CLOSER TOGETHER, WITH MORE OVERLAP (user,
    // defect 3). FullCalendar's `slotEventOverlap` (on by default) already
    // doubles each lane's width so lanes overlap; what was undoing it was this
    // element's own 3px side margins — 6px of dead gutter per bubble, which on
    // a 149px week column is 4% of the width thrown away per lane and turns the
    // overlap back into visibly separate strips. Horizontal margin goes to
    // zero (lanes touch and genuinely overlap); 1px top/bottom is kept so
    // back-to-back bookings still read as two bubbles.
    "& .fc .fc-timegrid-event": {
        margin: "1px 0",
        boxShadow: "none",
        borderRadius: "11px",
        // `ccev` — the height query container for the bubble's fit tiers. This
        // element is `inset:0` inside its harness, so its box IS the booking's
        // slot on the grid. Named, because the bubble declares its own unnamed
        // inline-size container for width-driven type scaling.
        containerType: "size",
        containerName: "ccev",
    },
    // FullCalendar adds a 20px inline right margin to any seg that has another
    // seg stacked in front of it ("a guesstimate of the resizer icon's width").
    // On a 149px column that is 13% of the width, and it is the single biggest
    // cause of the narrow strips the user complained about. The resizer that
    // margin protects is the bottom edge one, which is not covered by a
    // forward-stacked neighbour anyway.
    "& .fc .fc-timegrid-event-harness": { marginRight: "0 !important" },
    "& .fc .fc-timegrid-event .fc-event-main": { padding: 0 },
    // DRAG SELECTION. `--cc-wash` was measured at rgb(251,240,242) — a 1.06:1
    // difference from the `--cc-srf2` cell it sits on, i.e. invisible, which is
    // why the user could not tell a drag was happening. This is a real fill
    // plus a ring: the fill carries the selection across the range, the ring
    // makes the edges legible even where a cell already has bubbles in it.
    // Red is the brand accent and reads as "active", not "error", because it is
    // translucent and ringed rather than a solid alert block — the same red
    // already marks today's date disc and the now-line.
    // `color-mix(... , transparent)` keeps it translucent, so it works over the
    // cell surface, over `--cc-wash` on today, and in both modes without
    // branching.
    //
    // Measured, composited against the `--cc-srf2` cell, light / dark:
    //   old `--cc-wash` fill      1.04 / —     (the entire old cue)
    //   20% fill                  1.41 / 1.31
    //   85% ring                  4.62 / 4.37  <- the indicator that carries it
    //   date number on the fill   3.19 / 4.70  (stays legible; 24% fill would
    //                                          drop the light one to 2.97)
    // The ring is what clears the 3:1 a non-text state indicator needs, in both
    // modes, and the fill is capped by keeping the date number readable.
    "& .fc .fc-highlight": {
        background: "color-mix(in srgb, var(--cc-red) 20%, transparent)",
        boxShadow:
            "inset 0 0 0 2px color-mix(in srgb, var(--cc-red) 85%, transparent)",
        borderRadius: "11px",
    },

    // ======================================= MONTH CELL FIT TIERS (§10.11) ==
    // `ccday` is the day frame. A size container reports its CONTENT box, so
    // these thresholds are the CARD height MINUS 6px of frame padding-top (the
    // frame has no padding-bottom). Every threshold is SOLVED, not tuned:
    // it is the smallest content height at which its tier can fit THREE
    // harnesses — `C >= 3T + disc + gap` — because FullCalendar's
    // `hiddenConsumes` force-hides one entry to make room for the "+N more"
    // link, so three must fit for two to show. See concourse.js `monthCell`
    // and the arithmetic in the MONTH GRID comment above.
    //   at 149 needs 147 | at 124 needs 122 | at 97 needs 95 | floor needs 80
    // The same `tiers` array drives RenderEventContent.jsx's MONTH_TIERS, so
    // the bubble's rendered height and the budget it is measured against can
    // never drift apart.
    //
    // These run LAST so identical-specificity selectors are decided by source
    // order, exactly as before.
    ...Object.fromEntries(
        monthCell.tiers.map((t) => [
            `@container ccday (max-height: ${t.at}px)`,
            monthTierBlock(t),
        ])
    ),

    // -------------------------------------------------------- phone (§9) ---
    // At <=620px the grids are not rendered at all (index.jsx forces Agenda),
    // but keep the guard so a stray mount cannot show a squeezed grid.
    [PHONE]: {
        "& .fc-dayGridMonth-view, & .fc-timegrid": { display: "none" },
    },
});

export default CalendarStyled;
