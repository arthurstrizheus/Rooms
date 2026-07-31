// RenderEventContent.jsx
//
// THE MEETING BUBBLE (ARBITER §10.12) — the one element the user explicitly
// asked to keep. Line 1 is always the meeting name, line 2 is always the room.
// Never reorder them, never collapse to one line, never drop the room.
//
// ONE measured exception, added with the wrap/shrink/ellipsis work: a time-grid
// bubble shorter than 34px (a 15-minute booking is 22.5px) hides the room LINE,
// because two lines of legible type do not fit in 22px — the alternative was
// half a clipped room line under a clipped name. The room is still in the
// `aria-label`, and the line returns the moment the booking is 34px tall. It is
// hidden by a container query, not by the markup: the element is always
// rendered, so line 1 / line 2 is intact in the DOM at every size.
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

import {
    monthCell,
    motion,
    tokens,
    type as ccType,
} from "../../../Utilites/concourse";

export const TYPE_COLOUR_FALLBACK = tokens.constant.typeFallback;

const SP = "var(--cc-sp)";

/* -------------------------------------------------------- the type wash ---*/
//
// The user asked for more colour ("More aplha"), so the rest wash doubles from
// the specced 12% to 24%. The ceiling is not taste, it is contrast, measured in
// Chrome over a 144-colour sweep (every 10 deg of hue x four lightness/chroma
// pairs) in BOTH modes, because a meeting type is a free-form hex the admin
// picks with a colour picker (backend/models/type.js) — there is no fixed
// palette to design against, so the whole space has to hold.
//
// Worst case of that sweep, name (`--cc-ink`) on the wash:
//     24%  9.87 light / 6.96 dark      32%  8.04 / 5.31      36%  7.22 / 4.66
// 40% would put dark-mode name at 4.10, under 4.5 — that is why the press step
// stops at 36 instead of continuing +10 per state.
//
// The room line is the real constraint and it was ALREADY failing before this
// change: `--cc-mute` on a bare `--cc-srf` measures 4.84 light / 5.84 dark, so
// any wash at all drops it under 4.5 (at the shipped 12% it was 3.74 / 4.13).
// The fix is to darken the room line in step with the wash — still tokens, no
// mode branch, no palette. Worst case with these pairings:
//     rest  24% + ink60  6.18 light / 4.98 dark
//     hover 32% + ink85  6.88 / 4.71
//     press 36% + ink    7.22 / 4.66
// Every state, every hue, both modes, >= 4.5.
const REST_BG = "color-mix(in srgb, var(--cc-c) 24%, var(--cc-srf))";
const HOVER_BG = "color-mix(in srgb, var(--cc-c) 32%, var(--cc-srf))";
const ACTIVE_BG = "color-mix(in srgb, var(--cc-c) 36%, var(--cc-srf))";
// The hatch's heavier stop tracks the flat wash, so the numbers above bound it.
const HATCH_BG =
    "repeating-linear-gradient(135deg," +
    "color-mix(in srgb, var(--cc-c) 24%, var(--cc-srf)) 0 7px," +
    "color-mix(in srgb, var(--cc-c) 13%, var(--cc-srf)) 7px 14px)";
const HATCH_BG_HOVER =
    "repeating-linear-gradient(135deg," +
    "color-mix(in srgb, var(--cc-c) 32%, var(--cc-srf)) 0 7px," +
    "color-mix(in srgb, var(--cc-c) 20%, var(--cc-srf)) 7px 14px)";
const HATCH_BG_ACTIVE =
    "repeating-linear-gradient(135deg," +
    "color-mix(in srgb, var(--cc-c) 36%, var(--cc-srf)) 0 7px," +
    "color-mix(in srgb, var(--cc-c) 24%, var(--cc-srf)) 7px 14px)";

// The room line, one step darker per wash step. DEVIATION from §6, which puts
// `bubbleMeta` at a flat `--cc-mute`; at 24% that reads 2.82:1.
const META_INK = "color-mix(in srgb, var(--cc-ink) 60%, var(--cc-mute))";
const META_INK_HOVER = "color-mix(in srgb, var(--cc-ink) 85%, var(--cc-mute))";
const META_INK_ACTIVE = "var(--cc-ink)";

const isPositioned = (variant) => variant === "positioned";

// THE ONE MOTION RULE FOR A TIME-GRID BUBBLE: everything that moves is a fixed
// number of pixels on a child INSIDE the bubble, and the bubble's own box never
// changes. A positioned bubble is as tall as its booking is long — 21px for a
// 15-minute slot, 2157px for a 24-hour one — so any transform on the bubble
// itself moves by a PERCENTAGE OF AN UNBOUNDED HEIGHT: 1.5% is 0.3px on the
// short one and 32px on the tall one. That is what produced both complaints
// (the title leaving the clipped column, then the body sliding on exit), and
// scaling inward instead of outward only changes the direction of the same
// problem. A 2px nudge is 2px at every height, and the bubble's own
// `overflow: hidden` means a child can never paint outside the rest box.
const MOTION = "transform 200ms ease-out"; // no overshoot, mirrors on exit
const BAR_HOVER = "scaleX(1.9)"; // 3px -> 5.7px, paints over its own gap
const BAR_ACTIVE = "scaleX(2.6)";
const BODY_HOVER = "translateX(2px)"; // into the right padding, never past it
const BODY_ACTIVE = "translateX(1px)";

// Shared so the positioned variant can add motion to these without restating
// their geometry (a duplicate key would silently drop the base rule).
const BUB_BAR = {
    width: "3px",
    flex: "none",
    alignSelf: "stretch",
    borderRadius: "0 3px 3px 0",
    background: "var(--cc-c)",
};
// `align-content: start` is load-bearing — see the note in `build`.
const BUB_BODY = {
    minWidth: 0,
    minHeight: 0,
    display: "grid",
    alignContent: "start",
    gridAutoRows: "min-content",
};

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
//
// The month bubble's padding is `monthCell.base.bubPad`, not a literal: this
// padding is part of the height FullCalendar measures back out of the bubble
// and compares against the cell's budget, and the tier ladder narrows it from
// the same table. A literal here would be a second place to edit and a silent
// way to put one tier's bubble inside another tier's budget.
const VARIANT = {
    month: { borderRadius: "11px", padding: monthCell.base.bubPad },
    positioned: {
        borderRadius: "11px",
        padding: "4px 9px 5px 0",
        height: "100%",
        // Width-driven type scaling reads the bubble's own inline size. Height
        // tiers read `ccev` — declared on `.fc-timegrid-event` in
        // CalendarStyled.jsx, because an element cannot query ITS OWN
        // container and the padding above has to shrink with the bubble.
        containerType: "inline-size",
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

/* ------------------------------------------------------------- fit rules --*/
//
// §10.12 said "nowrap + ellipsis" on both lines. The user overrode that for the
// time grid: **wrap first, shrink to a floor, ellipsise only as a last resort.**
// That is the order these rules implement, in CSS only — no JS measurement,
// because measuring inside `eventContent` re-enters FullCalendar's render pass.
//
//   wrap    `-webkit-box` + `overflow-wrap:break-word` — the name flows onto as
//           many lines as the bubble can show, and only splits a word when that
//           word cannot fit a line of its own.
//   shrink  `clamp()` driven by `cqw` (the bubble's own inline size), so a lane
//           squeezed by three neighbours gets smaller type, not less text.
//   ellipsis `-webkit-line-clamp`, stepped down by the `ccev` height tiers
//           below so the clamp always matches the number of lines that fit.
//
// FLOORS: name 9.5px, room 9px. Nothing here is smaller than type the design
// already ships — `bubbleMeta` is 9.5px and `allDayLabel` is 9px (§6) — so the
// worst case is as legible as the all-day rail label next to it.
const NAME_MIN = "9.5px";
const META_MIN = "9px";
// Knees chosen so a bubble that is NOT squeezed keeps the shipped §6 sizes: the
// name is still 11.5px at >=120px of text column (a full-width week lane
// measures 134px), and only starts shrinking when a neighbour takes the width.
// It reaches the floor at ~45px, which is the 4-concurrent worst case.
const nameFluid = (cap) => `clamp(${NAME_MIN}, calc(8.3px + 2.667cqw), ${cap})`;
const NAME_FLUID = nameFluid("11.5px");
const META_FLUID = `clamp(${META_MIN}, calc(8.5px + 0.833cqw), 9.5px)`;

// Height tiers. `ccev` is `.fc-timegrid-event` (CalendarStyled.jsx), which is
// inset:0 inside the harness, so its height IS the booking's height on the
// grid. Thresholds are (lines x 14.4px name) + 9px padding + 12.4px room line,
// i.e. the clamp only ever promises lines that actually fit. Ordered
// large -> small: every matching tier applies, the last one wins.
const FIT_TIERS = {
    // WIDTH tiers come first (height tiers below may re-set `padding`).
    // In a lane squeezed by three neighbours the bubble is ~36px wide, of which
    // the 3px bar, the 8px gap and the 9px right padding took 20px — 56% of the
    // box — leaving 16px for text. Tightening the chrome on narrow lanes is
    // worth more than any type change: it takes the text column from 16px to
    // 26px on the same bubble.
    "@container ccev (max-width: 92px)": {
        gap: "5px",
        padding: "4px 5px 5px 0",
    },
    "@container ccev (max-width: 58px)": {
        gap: "3px",
        padding: "3px 3px 4px 0",
    },
    // Each step down does BOTH things the user asked for, in her order: fewer
    // lines before the ellipsis, and a lower ceiling on the type so more words
    // reach the page before it ellipsises. The floor never moves.
    "@container ccev (max-height: 79px)": {
        "& .cc-bub-name": { WebkitLineClamp: 3, fontSize: nameFluid("11px") },
    },
    "@container ccev (max-height: 65px)": {
        "& .cc-bub-name": { WebkitLineClamp: 2, fontSize: nameFluid("10.5px") },
    },
    "@container ccev (max-height: 50px)": {
        "& .cc-bub-name": { WebkitLineClamp: 1, fontSize: nameFluid("10px") },
    },
    // A 30-minute booking (45px at the shipped 90px hour) — one name line and
    // the room line, on tightened padding.
    "@container ccev (max-height: 46px)": {
        padding: "2px 7px 2px 0",
        "& .cc-bub-name": { WebkitLineClamp: 1, fontSize: nameFluid("10px") },
        "& .cc-bub-meta": { fontSize: META_MIN },
    },
    // A 15-minute booking (22.5px). Two legible lines cannot exist in 22px;
    // the name wins and the room survives in the aria-label. DEVIATION from
    // "always two lines" — recorded in the report.
    "@container ccev (max-height: 34px)": {
        padding: "0 5px 0 0",
        "& .cc-bub-name": {
            WebkitLineClamp: 1,
            fontSize: NAME_MIN,
            lineHeight: 1.2,
        },
        "& .cc-bub-meta": { display: "none" },
    },
};

// Month cells stop scrolling and start scaling (defect 5): `ccday` is
// `.fc-daygrid-day-frame`, whose height is a sixth of the grid. The bubble
// shrinks with the cell instead of overflowing it. Same floors.
//
// THE THRESHOLDS AND THE RECIPE BOTH COME FROM `monthCell.tiers` IN
// concourse.js. They used to be hand-copied here and in CalendarStyled.jsx,
// which is a standing invitation for the bubble's height and the cell's budget
// to drift apart — and that drift is what overflowed. The height this file
// produces IS the `thickness` FullCalendar reads back out of `querySegHeights`
// and compares against `maxCoord`, so it is one half of the fit arithmetic:
//   b = verticalPadding + name(fontSize x lineHeight) + meta(fontSize x lineHeight)
//     = 35.725 / 29.825 / 23.275 / 20.35 px, tier 0 -> floor
// A size container reports its CONTENT box, which is the cell height minus the
// frame's 6px padding-TOP (there is no padding-bottom any more).
//
// EVERY MONTH BUBBLE MUST BE THE SAME HEIGHT. That is an invariant of the fit,
// not a coincidence of the current design. FullCalendar keeps a force-hidden
// entry in its level hierarchy while it packs (`findInsertion`), so a LATER,
// SHORTER bubble can legally slot in below a hidden one — and the "+N more"
// row, positioned from `leftoverMargins`, then lands below a level the budget
// never accounted for and paints past the card floor. That is the original bug,
// verbatim. Today the invariant holds because `eventDisplay="block"` sends every
// segment through the same block renderer and both `.cc-bub-name` and
// `.cc-bub-meta` are single `nowrap` lines with numeric line-heights. So: no
// conditional third line, no dropping the meta line for all-day events, no
// wrapping. If a month bubble ever needs a variable height, the fit has to be
// re-derived from the TALLEST variant — do not just add the line.
const MONTH_TIERS = Object.fromEntries(
    monthCell.tiers.map((t) => [
        `@container ccday (max-height: ${t.at}px)`,
        {
            padding: t.bubPad,
            "& .cc-bub-name": { fontSize: t.name, lineHeight: t.nameLh },
            "& .cc-bub-meta": { fontSize: t.meta, lineHeight: t.metaLh },
        },
    ])
);

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
    // The time-grid bubble's own box transitions PAINT ONLY — its geometry is
    // never a transition target, so there is nothing here that can clip. The
    // easing is deliberately not `--cc-sp`: `cubic-bezier(.34,1.4,.64,1)` has a
    // control point above 1, so it crosses PAST the target and settles back.
    // That is the right feel for a small element travelling a fixed 2px, and
    // the wrong feel for anything sized as a fraction of a 2000px element —
    // measured on the old rule, the exit crossed 2.29px past its resting
    // position before settling, which is what read as a glitch.
    transition: isPositioned(variant)
        ? "box-shadow 200ms ease-out, background 200ms ease-out"
        : `transform 280ms ${SP}, box-shadow 280ms ${SP}, background 200ms`,
    ...(animate
        ? { animation: ENTRANCE[variant] || ENTRANCE.default }
        : null),

    // §13-G5 — hover lift only where hover is real, or a tap leaves the bubble
    // permanently raised on touch.
    //
    // THE TIME-GRID BUBBLE ANIMATES, BUT ITS OWN BOX NEVER MOVES. The type bar
    // swells from 3px to 5.7px and the name/room block slides 2px right into
    // the padding it already owns — both inside a box with `overflow: hidden`,
    // so the motion is geometrically incapable of leaving the rest bounds at
    // any height or scroll position. See the MOTION block above for why the
    // bubble itself is not the thing that moves.
    // DEVIATION from §10.12's lift and `scale(.97)` press, and from §8's
    // spring easing, for the positioned variant only; month, agenda, list and
    // popover bubbles are height-bounded and keep the lift exactly as specced.
    // The room line darkens one step with every wash step — that pairing is
    // what keeps it at or above 4.5:1 for every type colour in both modes.
    "@media (hover: hover)": {
        "&:hover": isPositioned(variant)
            ? {
                  boxShadow: "var(--cc-sh1)",
                  background: allDay ? HATCH_BG_HOVER : HOVER_BG,
                  "& .cc-bub-bar": { transform: BAR_HOVER },
                  "& .cc-bub-body": { transform: BODY_HOVER },
                  "& .cc-bub-meta": { color: META_INK_HOVER },
              }
            : {
                  transform: "translateY(-2px) scale(1.02)",
                  boxShadow: "var(--cc-sh1)",
                  background: allDay ? HATCH_BG_HOVER : HOVER_BG,
                  "& .cc-bub-meta": { color: META_INK_HOVER },
              },
    },
    "&:active": isPositioned(variant)
        ? {
              background: allDay ? HATCH_BG_ACTIVE : ACTIVE_BG,
              "& .cc-bub-bar": { transform: BAR_ACTIVE },
              "& .cc-bub-body": { transform: BODY_ACTIVE },
              "& .cc-bub-meta": { color: META_INK_ACTIVE },
          }
        : {
              transform: "scale(.97)",
              "& .cc-bub-meta": { color: META_INK_ACTIVE },
          },
    "&:focus-visible": {
        outline: "2px solid var(--cc-c)",
        outlineOffset: "2px",
    },

    "& .cc-bub-bar": BUB_BAR,
    // `align-content: start` is load-bearing. A two-row grid defaults to
    // `stretch`, so in a tall week/day bubble each row took HALF the height and
    // the room line rendered at the vertical middle — measured 360px below the
    // name on a 720px booking. Packing the rows at the top puts the room
    // directly under the name, which is what line 1 / line 2 has always meant.
    "& .cc-bub-body": BUB_BODY,
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
        color: META_INK,
        transition: "color 200ms ease-out",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
    },

    // Week / day only: wrap -> shrink -> ellipsis (see FIT_TIERS above), plus
    // the in-bounds hover motion. The transitions live on the RESTING rules, so
    // enter and exit are the same 200ms ease-out in both directions — an
    // asymmetric exit was the other half of the "glitching".
    ...(variant === "positioned"
        ? {
              "& .cc-bub-bar": {
                  ...BUB_BAR,
                  transformOrigin: "left center",
                  transition: MOTION,
              },
              "& .cc-bub-body": { ...BUB_BODY, transition: MOTION },
              "& .cc-bub-name": {
                  ...ccType.bubbleName,
                  fontSize: NAME_FLUID,
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 4,
                  overflowWrap: "break-word",
                  overflow: "hidden",
                  minWidth: 0,
              },
              "& .cc-bub-meta": {
                  ...ccType.bubbleMeta,
                  fontSize: META_FLUID,
                  color: META_INK,
                  transition: "color 200ms ease-out",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
              },
              ...FIT_TIERS,
          }
        : null),

    // Month only: the grid no longer scrolls, so the bubble scales with its
    // cell (defect 5). Both lines stay — only their size changes.
    ...(variant === "month" ? MONTH_TIERS : null),
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
