/**
 * Concourse — design tokens for the Rooms calendar redesign.
 *
 * ADDITIVE MODULE. Nothing here changes existing behaviour until a component
 * imports it. Every value is transcribed verbatim from the approved mockup
 * `scratchpad/cal-2-concourse.html`. Do not "improve" a value here — the
 * mockup is the source of visual truth and this file is its machine copy.
 *
 * Two ways to read a token, and you need both (see ARBITER-concourse.md §2):
 *
 *   1. CSS custom properties on :root — emitted once by <GlobalStyles> in
 *      App.js via `concourseGlobalStyles(mode)`. Because they live on
 *      document.documentElement, EVERY portalled node (MUI Dialog, Menu,
 *      Popover, Snackbar — all children of document.body) inherits them.
 *      Read with `v("srf")` -> "var(--cc-srf)".
 *
 *   2. Plain JS values via `concourse(mode)`, mounted on the MUI theme as
 *      `theme.concourse`. Read in `sx` callbacks: (t) => t.concourse.srf.
 *
 * NEVER scope --cc-* to a page wrapper. That is exactly the bug that made
 * dialogs transparent last time: a Dialog portals out of the page tree, so a
 * wrapper is not its ancestor and the var resolves to nothing.
 *
 * Naming: every custom property is prefixed `--cc-` so it cannot collide with
 * FullCalendar's `--fc-*` or anything already in the app.
 */

/* ============================================================================
 * 1. COLOUR TOKENS  (mockup: `.cc` and `[data-scheme="dark"] .cc`)
 * ==========================================================================*/

const LIGHT = {
    grd: "#F1EEF0", // app ground behind cards
    srf: "#FFFFFF", // primary surface: side menu, banner, calendar card, dialog
    srf2: "#F9F6F8", // recessed: day cells, inputs, pills, agenda blocks
    srf3: "#F4F0F3", // third surface: icon-button hover, loading-bar track
    ink: "#231A1D", // primary text
    mute: "#7C6E73", // secondary text, resting icons
    line: "#E7E0E3", // hairlines, dividers, control borders
    red: "#C8102E", // brand accent (S-E-A red): primary action, today, selection
    wash: "#FBF0F2", // red-tinted hover / soft-danger fill
    ok: "#2F7D52", // success / "Free"
    // Warning / partial success. Same construction as `red` -> `wash`: an accent
    // plus a 6.5% tint of it over the surface (mix(warn,6.5,srf) === warnWash),
    // so the amber joins the palette rather than arriving from outside it.
    // Measured (see ARBITER note in SnackbarContext): as an ICON/graphic colour
    // it clears WCAG 1.4.11 at 3.06:1 on warnWash and separates from `red` by
    // dE2000 15.0 under deuteranopia / 25.6 under protanopia — both above the
    // 12.5 this palette's own red-vs-ok pair achieves. It is NOT usable as body
    // text: no amber that reads as amber clears 4.5:1 here (ceiling dE 9.0, and
    // it reads brown), so warning copy uses `ink`, exactly as success does.
    warn: "#C77E00", // amber accent: warning icon, partial-success marker
    warnWash: "#FBF7EE", // amber-tinted soft-warning fill  = mix(warn,6.5,srf)
    sh1: "0 1px 2px rgba(35,26,29,.05),0 8px 20px -12px rgba(35,26,29,.16)",
    sh2: "0 2px 4px rgba(35,26,29,.06),0 20px 44px -18px rgba(35,26,29,.3)",
};

const DARK = {
    grd: "#161215",
    srf: "#211C1F",
    // NOTE: in dark, srf2 is DARKER than srf. The light/dark relationship is
    // inverted. Never compute srf2 from srf — always read the token.
    srf2: "#1B1719",
    srf3: "#262023",
    ink: "#F4EFF1",
    mute: "#A2959A",
    line: "#312A2E",
    red: "#FF5266",
    wash: "#2C1A1E",
    ok: "#6FD79B",
    // Dark amber is softened the same way `red` and `ok` are in this scheme.
    // warnWash follows dark's own recipe — the accent at 11% over `grd`, which
    // is how `wash` relates to `red` here (NOT over `srf`; dark inverts that).
    // Measured: icon 8.16:1 on warnWash, ink 13.30:1, dE2000 vs red 14.6
    // (deuteranopia) / 27.5 (protanopia).
    warn: "#F5B23F",
    warnWash: "#2F241A", // = mix(warn,11,grd)
    sh1: "0 1px 2px rgba(0,0,0,.4),0 8px 20px -12px rgba(0,0,0,.6)",
    sh2: "0 2px 4px rgba(0,0,0,.5),0 20px 44px -18px rgba(0,0,0,.78)",
};

/**
 * Scheme-invariant values. The mockup hard-codes these in BOTH schemes —
 * the red glows keep the light-red rgba(200,16,46,…) even in dark mode, and
 * the dialog/popover shadows keep pure black. Transcribed as-is.
 */
const CONSTANT = {
    onRed: "#FFFFFF", // text/icon on any red fill
    glowNav: "0 2px 4px rgba(200,16,46,.2),0 10px 22px -12px rgba(200,16,46,.7)", // selected side-menu item
    glowCta: "0 2px 4px rgba(200,16,46,.2),0 10px 22px -12px rgba(200,16,46,.65)", // "Book a room"
    glowBtn: "0 2px 4px rgba(200,16,46,.2),0 10px 22px -10px rgba(200,16,46,.6)", // primary button
    glowPill: "0 2px 9px -3px rgba(200,16,46,.8)", // current month in picker
    glowDot: "0 2px 9px -2px rgba(200,16,46,.75)", // today's date number in a month cell
    shDialog: "0 40px 90px -28px rgba(0,0,0,.55)",
    shPop: "0 30px 70px -22px rgba(0,0,0,.5)",
    knobShadow: "0 1px 3px rgba(0,0,0,.3)", // switch knob
    typeFallback: "#91E041", // MeetingForum.jsx:706 fallback meeting-type colour
};

/* ============================================================================
 * 2. COLOUR MATH  (mockup uses CSS color-mix(); these are the JS equivalents)
 * ==========================================================================*/

const hexToRgb = (hex) => {
    let h = String(hex).trim().replace(/^#/, "");
    if (h.length === 3)
        h = h
            .split("")
            .map((c) => c + c)
            .join("");
    if (h.length === 8) h = h.slice(0, 6);
    if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return null;
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const clamp255 = (x) => Math.max(0, Math.min(255, Math.round(x)));

const rgbToHex = (rgb) =>
    "#" +
    rgb
        .map((x) => clamp255(x).toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();

/**
 * mix(a, pct, b) === CSS `color-mix(in srgb, a pct%, b)`.
 * pct is how much of `a` survives. Falls back to a live color-mix() string if
 * either input is not a parseable hex (e.g. already a var() reference), so the
 * helper is always safe to call with runtime data.
 */
export const mix = (a, pct, b) => {
    const A = hexToRgb(a);
    const B = hexToRgb(b);
    if (!A || !B) return `color-mix(in srgb, ${a} ${pct}%, ${b})`;
    const p = Math.max(0, Math.min(100, pct)) / 100;
    return rgbToHex([0, 1, 2].map((i) => A[i] * p + B[i] * (1 - p)));
};

/** alpha(hex, a) === CSS `color-mix(in srgb, hex (a*100)%, transparent)`. */
export const alpha = (hex, a) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return `color-mix(in srgb, ${hex} ${Math.round(a * 100)}%, transparent)`;
    return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
};

/* ============================================================================
 * 3. SCALES
 * ==========================================================================*/

/** Radius. The mockup is not on a rounded scale — these are its literal values. */
export const radius = {
    bar: "0 3px 3px 0", // bubble's 3px type bar (right side only)
    xs: 11, // bubble (month/time grid), burger, pick-footer button
    sm: 12, // roomcard thumb, scope marker
    nav: 13, // side-menu item
    md: 14, // input, bubble (agenda + popover)
    cell: 15, // month day cell, time-grid column
    opt: 17, // room option row
    lg: 18, // facts / block / people / disclosure / alert / scope button
    room: 19, // room card
    xl: 20, // agenda day block, empty/error state icon
    pop: 22, // picker panel, +N more popover, calendar card <=620px
    card: 26, // calendar card, dialog
    pill: 99, // every pill and circle
};

/**
 * Spacing. Also literal — the mockup is 1px-precise, not on an 8pt grid.
 * Use these numbers directly (px), not MUI's spacing() multiplier.
 */
export const space = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 26];

export const border = {
    hairline: "1px", // dividers, card edges (--cc-line)
    control: "1.5px", // input, type chip, room option, scope button
    focus: "2px", // focus-visible outline
    focusOffset: "2px",
    typeBar: "3px", // bubble accent bar
    nowline: "2px",
    loadingBar: "3px",
    grabber: "4px", // bottom-sheet grab handle height
};

/**
 * In-page stacking. Dialogs/menus/snackbars portal to body and keep MUI's own
 * layers (modal 1300, snackbar 1400, tooltip 1500) — do not renumber those.
 */
export const zIndex = {
    nowline: 6,
    banner: 20,
    sideScrim: 24,
    sideOverlay: 25,
    picker: 26,
};

export const layout = {
    sideWidth: 246, // mockup .side  (current App.js Drawer is 240 — see ARBITER §14)
    sideClosed: 0, // collapse is width:0, NOT an icon rail
    hourRow: 44, // time-grid hour height (px)
    dayStart: 7, // H0 — first hour rendered
    dayEnd: 19, // H1 — last hour rendered
    monthCellMinHeight: 104, // design target: C = 104 - 6 = 98 -> tier 2, which
                             // needs 95, so 2 bubbles + "+N more" fit. Live use
                             // is the loading skeleton only (index.jsx:410) —
                             // the grid itself has no floor (frame minHeight 0,
                             // and FC's cellMinHeight is null below 7 rows).
    monthEventsShown: 2, // then "+N more"  (mockup cap = 2)
    weekStartsOn: 0, // Sunday — matches WeekPicker + the FullCalendar grid
    timeStepMinutes: 15,
    dialogWidth: {
        details: 548, // default (--dw)
        book: 560,
        edit: 560,
        conflict: 530,
        scope: 480, // editScope / cancelScope / dragScope
        popover: 310, // +N more
    },
};

/**
 * MONTH CELL GEOMETRY — the single source of truth for the month grid's
 * vertical budget. Consumed by CalendarStyled.jsx (the row tracks, the tiers)
 * and RenderEventContent.jsx (the bubble recipe). They MUST NOT be duplicated:
 * the bubble's rendered height IS the `thickness` FullCalendar measures back
 * out of `querySegHeights`, so if the two files disagree a cell renders one
 * tier's bubble inside another tier's budget and the fit arithmetic breaks.
 *
 * THE INVARIANT (proved in CalendarStyled.jsx's MONTH GRID comment):
 *   maxCoord (FullCalendar's budget) = C - disc - gap
 *   T (harness thickness)            = round(bubbleHeight + gap)
 *   capacity for "2 bubbles + N more" requires  C >= 3T + disc + gap
 * where C = the frame's CONTENT height = cell height - framePad (there is no
 * padding-bottom), and C is exactly what `@container ccday (max-height:)` tests.
 *
 * `at` is the container-query threshold. Each is (3T + disc + gap) rounded up
 * with a >=2px guard for sub-pixel row heights:
 *   tier 0 (no query) needs 147, applies above 149
 *   at 149 needs 122 | at 124 needs 95 | at 97 needs 80
 */
export const monthCell = {
    // The 5px inter-card gutter is carried ENTIRELY as the <td>'s padding-top,
    // so the <td>'s bottom edge coincides with the card's painted bottom edge —
    // which is the level `computeMaxContentHeight` measures to.
    gutter: 5,
    halfGutter: 2.5, // <td> padding left/right; horizontal is never measured
    framePad: 6, // frame padding: `6px 6px 0` — NO padding-bottom, ever

    // Tier 0 (no container query). `bub`/`name`/`meta` are documentation of the
    // recipe VARIANT.month already ships; they are what makes b = 35.725.
    base: {
        disc: 23,
        discFont: 12,
        gap: 4,
        link: 10.5,
        linkPad: "2px 8px",
        bubPad: "4px 9px 5px 0",
        name: "11.5px",
        nameLh: 1.25,
        meta: "9.5px",
        metaLh: 1.3,
    },

    // Ordered widest -> narrowest. Emitted in this order so later blocks win
    // on source order against the identical-specificity base rules.
    tiers: [
        {
            at: 149,
            disc: 20,
            discFont: 11,
            gap: 3,
            link: 10,
            linkPad: "1px 7px",
            bubPad: "2px 7px 3px 0",
            name: "10.5px",
            nameLh: 1.25,
            meta: "9px",
            metaLh: 1.3,
        },
        {
            at: 124,
            disc: 18,
            discFont: 10.5,
            gap: 2,
            link: 9.5,
            linkPad: "0 6px",
            bubPad: "1px 6px 1px 0",
            name: "9.5px",
            nameLh: 1.15,
            meta: "9px",
            metaLh: 1.15,
        },
        {
            at: 97,
            disc: 16,
            discFont: 10,
            gap: 1,
            link: 9,
            linkPad: "0 5px",
            bubPad: "0 5px 0 0",
            name: "9.5px",
            nameLh: 1.1,
            meta: "9px",
            metaLh: 1.1,
        },
    ],
};

/** Breakpoints, in px, exactly as the mockup's container queries. */
export const bp = {
    sheet: 620, // dialogs become bottom sheets; grids collapse to agenda
    stackNav: 700, // date switcher + CTA go full width
    rail: 980, // side menu becomes an overlay with a scrim
};

/* ============================================================================
 * 4. TYPOGRAPHY
 * ==========================================================================*/

export const font = {
    sans: '"Segoe UI Variable Text","Segoe UI",system-ui,-apple-system,sans-serif',
    mono: '"Cascadia Mono",ui-monospace,Consolas,"SF Mono",Menlo,monospace',
    base: { fontSize: "15px", lineHeight: 1.5 },
    tabular: { fontVariantNumeric: "tabular-nums" },
};

const t = (fontSize, fontWeight, letterSpacing, extra) => ({
    fontSize,
    fontWeight,
    ...(letterSpacing ? { letterSpacing } : null),
    ...extra,
});

const MONO = { fontFamily: font.mono, fontVariantNumeric: "tabular-nums" };
const CAPS = { textTransform: "uppercase" };

/** Every type role in the mockup, keyed by where it is used. */
export const type = {
    /* side menu */
    logo: t("21px", 800, "-.04em"),
    logoTag: { ...t("12px", 500, ".14em"), ...CAPS },
    sectionLabel: { ...t("10.5px", 750, ".14em"), ...CAPS },
    navItem: t("13.5px", 600, "-.012em"),
    badge: { ...t("11px", 750), ...font.tabular },
    footerName: t("13px", 650, "-.014em"),
    footerMeta: { ...MONO, fontSize: "9.5px" },
    avatar: t("12.5px", 750),

    /* banner + date switcher */
    pageTitle: t("clamp(19px,2.4vw,25px)", 700, "-.028em"),
    dateTitle: { ...MONO, ...t("14px", 600, ".01em") },
    todayBtn: t("12.5px", 650),
    cta: t("13.5px", 700),
    pickerLabel: t("13.5px", 700, "-.018em"),
    pickerMonth: t("12.5px", 650),
    pickerDow: { ...t("10px", 750, ".06em"), ...CAPS },
    pickerDay: { ...t("12.5px", 600), ...font.tabular },

    /* calendar */
    modeToggle: t("12.5px", 650),
    dowHeader: { ...t("11px", 700, ".07em"), ...CAPS },
    dayNumber: { ...t("12px", 700), ...font.tabular },
    bubbleName: { ...t("11.5px", 650, "-.015em"), lineHeight: 1.25 },
    bubbleMeta: { ...MONO, fontSize: "9.5px", lineHeight: 1.3 },
    bubbleMark: { fontSize: "10px" },
    moreLink: t("10.5px", 700),
    colDow: { ...t("10.5px", 700, ".07em"), ...CAPS },
    colDayNum: { ...t("17px", 700, "-.02em"), ...font.tabular },
    hourLabel: { ...MONO, fontSize: "10px" },
    allDayLabel: { ...MONO, ...t("9px", 400, ".08em"), ...CAPS },

    /* agenda */
    agendaRing: { ...t("15px", 700), lineHeight: 1, ...font.tabular },
    agendaDay: t("13.5px", 700, "-.016em"),
    agendaSub: t("11.5px", 400),
    agendaFree: { ...MONO, fontSize: "11px" },
    agendaTime: { ...MONO, fontSize: "11px" },
    agendaBubbleName: { fontSize: "13.5px" },
    agendaBubbleMeta: { fontSize: "11px" },

    /* states */
    stateTitle: t("19px", 700, "-.024em"),
    stateBody: { fontSize: "13.5px", maxWidth: "46ch" },

    /* dialogs */
    dialogTitle: { ...t("22px", 700, "-.03em"), lineHeight: 1.1, textWrap: "balance" },
    dialogSub: { fontSize: "13.5px" },
    dialogBadge: t("11.5px", 700),
    heroTime: { ...t("26px", 700, "-.032em"), ...font.tabular },
    heroChip: t("12.5px", 650),
    fieldLabel: t("12px", 700),
    required: { ...t("10px", 700, ".05em"), ...CAPS },
    input: { fontSize: "14px" },
    hint: { fontSize: "11.5px" },
    errorText: t("11.5px", 650),
    factKey: t("12px", 650),
    factValue: { fontSize: "13.5px" },
    factValueMono: { ...MONO, fontSize: "12.5px" },
    cardName: t("14.5px", 700, "-.018em"),
    cardMeta: { ...MONO, fontSize: "11px" },
    personName: t("14.5px", 700, "-.016em"),
    personRole: { fontSize: "12px" },
    tag: t("10.5px", 600),
    blockLabel: { ...t("10.5px", 700, ".06em"), ...CAPS },
    blockBody: { fontSize: "13.5px" },
    typeChip: t("12.5px", 600),
    optName: t("13.5px", 700, "-.016em"),
    optMeta: { ...MONO, fontSize: "10.5px" },
    optStatus: t("11px", 700),
    scopeTitle: t("14px", 700, "-.017em"),
    scopeDesc: { fontSize: "12.5px" },
    switchLabel: t("13.5px", 650),
    discSummary: t("13.5px", 700),
    discCount: t("11.5px", 500),
    alertTitle: t("13.5px", 700),
    alertBody: { fontSize: "12.5px" },
    popTitle: t("14px", 700, "-.018em"),
    popCount: t("11px", 650),
    button: t("13.5px", 650),
};

/* ============================================================================
 * 5. MOTION
 * ==========================================================================*/

export const motion = {
    /** The one easing that carries the whole design. Overshoots — that is the point. */
    spring: "cubic-bezier(.34,1.4,.64,1)",
    ease: "ease",
    easeInOut: "ease-in-out",

    /** Durations in ms, named by the thing that uses them. */
    dur: {
        colour: 200, // background/color/border-color on every control
        bgSpring: 250, // .cell, .modes button background
        arrow: 260, // date-arrow + picker-month transform
        lift: 280, // hover-lift on bubble, btn, roomopt, typerow, scope
        chevron: 300, // date-title chevron rotate, close-button rotate, .plus scale
        picker: 320, // picker panel entrance
        knob: 320, // switch knob travel, disclosure marker rotate
        navItem: 340, // side-menu item slide-in
        posBubble: 340, // time-grid bubble slide-in
        dialogStagger: 340, // dialog body children
        popover: 340, // +N more popover entrance
        bubble: 380, // month/agenda bubble pop-in
        dialog: 380, // dialog scale-up
        side: 400, // side-menu width collapse/expand
        sheet: 420, // phone bottom-sheet slide-up
        card: 500, // calendar card rise
        overlay: 260, // dialog scrim fade
        scrim: 240, // side-menu scrim fade
        shimmer: 1400, // skeleton sweep (infinite)
        loadingBar: 1300, // indeterminate bar (infinite)
        nowPulse: 2400, // now-line pulse (infinite)
    },

    /** Delays. Every stagger pattern in the mockup, verbatim. */
    delay: {
        card: 80, // .cal rise delay
        navStep: 45, // side-menu item n => 45 * n ms, cumulative across sections
        monthRowStep: 70, // month grid: +70ms per ROW of 7 cells
        monthBubbleStep: 50, // + 50ms per bubble inside a cell
        timeBase: 80, // time-grid positioned bubbles: 80 + 45*index per column
        timeStep: 45,
        allDayBase: 40, // all-day strip: 40 + 40*index
        allDayStep: 40,
        agendaStep: 60, // agenda rows: 60 * index
        popStep: 50, // +N more list: 50 * index
        dialogBase: 70, // dialog body child: 70 + 45*index
        dialogStep: 45,
    },

    /** Keyframe names as emitted by concourseGlobalStyles(). */
    keyframes: {
        navItem: "cc-slide-in", // side-menu item
        fade: "cc-fade", // scrims
        picker: "cc-pick-in", // picker panel
        loadingBar: "cc-bar", // indeterminate bar
        card: "cc-rise", // calendar card
        bubble: "cc-pop", // month/agenda/popover bubble
        posBubble: "cc-slidein", // absolutely positioned time-grid bubble
        nowPulse: "cc-pulse",
        shimmer: "cc-shim",
        dialog: "cc-dialog-in",
        stagger: "cc-stag", // dialog body children, disclosure inner
        sheet: "cc-sheet", // phone bottom sheet
    },
};

/**
 * `animation` shorthand builders, so recipes stay one line.
 *
 * EVERY ONE OF THESE IS `backwards`, NOT `both`. An entrance animation needs the
 * BACKWARDS half — the `from` state held during the delay, so the element does
 * not flash at its final appearance before playing — and nothing else. The
 * FORWARDS half is what causes damage: it keeps the `to` keyframe applied for
 * the life of the element as an ANIMATED value, and an animated
 * `transform: none` computes to `matrix(1, 0, 0, 1, 0, 0)` rather than the
 * keyword `none`. That is enough to make the element a permanent CONTAINING
 * BLOCK for `position: fixed` descendants and a permanent stacking context.
 *
 * That is not hypothetical. It put FullCalendar's drag ghost — a `fixed` clone
 * positioned with viewport coordinates — 270px to the right of the pointer for
 * every drag in the month grid, because the calendar card sat above it with a
 * `both` fill. See the comment on the card in Calendar/index.jsx.
 *
 * It is free to do this here because every entrance keyframe below ends at
 * `opacity: 1; transform: none`, which IS each element's resting style — so the
 * forwards fill was never rendering anything the element would not render on its
 * own. Anything that genuinely needs to REST somewhere other than its natural
 * style must say `forwards` itself, and own the consequence.
 */
export const anim = {
    navItem: (delayMs = 0) =>
        `${motion.keyframes.navItem} ${motion.dur.navItem}ms ${motion.spring} ${delayMs}ms backwards`,
    bubble: (delayMs = 0) =>
        `${motion.keyframes.bubble} ${motion.dur.bubble}ms ${motion.spring} ${delayMs}ms backwards`,
    posBubble: (delayMs = 0) =>
        `${motion.keyframes.posBubble} ${motion.dur.posBubble}ms ${motion.spring} ${delayMs}ms backwards`,
    card: () =>
        `${motion.keyframes.card} ${motion.dur.card}ms ${motion.spring} ${motion.delay.card}ms backwards`,
    picker: () =>
        `${motion.keyframes.picker} ${motion.dur.picker}ms ${motion.spring} backwards`,
    dialog: () =>
        `${motion.keyframes.dialog} ${motion.dur.dialog}ms ${motion.spring} backwards`,
    sheet: () =>
        `${motion.keyframes.sheet} ${motion.dur.sheet}ms ${motion.spring} backwards`,
    stagger: (index = 0) =>
        `${motion.keyframes.stagger} ${motion.dur.dialogStagger}ms ${motion.spring} ${
            motion.delay.dialogBase + motion.delay.dialogStep * index
        }ms backwards`,
};

/* ============================================================================
 * 6. DERIVED RECIPES  (the color-mix() expressions in the mockup)
 * ==========================================================================*/

const derive = (p) => ({
    /** Meeting bubble at rest: 12% of the type colour over the primary surface. */
    bubbleBg: (c) => mix(c || CONSTANT.typeFallback, 12, p.srf),
    /** Meeting bubble on hover: 22%. */
    bubbleBgHover: (c) => mix(c || CONSTANT.typeFallback, 22, p.srf),
    /** All-day bubble: 135deg hatch alternating 13% / 7% every 7px. */
    allDayBg: (c) => {
        const hi = mix(c || CONSTANT.typeFallback, 13, p.srf);
        const lo = mix(c || CONSTANT.typeFallback, 7, p.srf);
        return `repeating-linear-gradient(135deg,${hi} 0 7px,${lo} 7px 14px)`;
    },
    /** Dialog header wash: 11% of the type colour, fading to the surface. */
    dialogHeaderBg: (c) =>
        `linear-gradient(180deg,${mix(c || CONSTANT.typeFallback, 11, p.srf)},${p.srf})`,
    /** Type badge inside a dialog header: 17%. */
    badgeBg: (c) => mix(c || CONSTANT.typeFallback, 17, p.srf),
    /** Selected meeting-type chip: 14%. */
    typeChipBg: (c) => mix(c || CONSTANT.typeFallback, 14, p.srf),
    /** Modal + side-menu scrim: 34% ink. */
    scrim: alpha(p.ink, 0.34),
    /** Focus ring on an input: 4px of 13% red. */
    inputRing: `0 0 0 4px ${alpha(p.red, 0.13)}`,
    /** Out-of-month day number in the picker: 55% mute. */
    outsideDay: alpha(p.mute, 0.55),
    /** Skeleton fill: ink at 8%. */
    skeleton: alpha(p.ink, 0.08),
    /** Skeleton sweep. */
    skeletonSweep: "linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent)",
    /** Generic ink tint (harness `.seg button:hover` uses 6%). */
    inkTint: (pct) => alpha(p.ink, pct / 100),
});

/* ============================================================================
 * 7. CSS CUSTOM PROPERTIES  (the only path that reaches portalled dialogs)
 * ==========================================================================*/

/** Token name -> `var(--cc-name)`. Use everywhere a CSS string is needed. */
export const v = (name) => `var(--cc-${name})`;

/** The flat var map for one mode. */
export const cssVars = (mode = "light") => {
    const p = mode === "dark" ? DARK : LIGHT;
    return {
        "--cc-grd": p.grd,
        "--cc-srf": p.srf,
        "--cc-srf2": p.srf2,
        "--cc-srf3": p.srf3,
        "--cc-ink": p.ink,
        "--cc-mute": p.mute,
        "--cc-line": p.line,
        "--cc-red": p.red,
        "--cc-wash": p.wash,
        "--cc-ok": p.ok,
        "--cc-warn": p.warn,
        "--cc-warn-wash": p.warnWash,
        "--cc-sh1": p.sh1,
        "--cc-sh2": p.sh2,
        "--cc-sp": motion.spring,
        "--cc-on-red": CONSTANT.onRed,
        "--cc-glow-nav": CONSTANT.glowNav,
        "--cc-glow-cta": CONSTANT.glowCta,
        "--cc-glow-btn": CONSTANT.glowBtn,
        "--cc-glow-pill": CONSTANT.glowPill,
        "--cc-glow-dot": CONSTANT.glowDot,
        "--cc-sh-dialog": CONSTANT.shDialog,
        "--cc-sh-pop": CONSTANT.shPop,
        "--cc-scrim": alpha(p.ink, 0.34),
        "--cc-sans": font.sans,
        "--cc-mono": font.mono,
        /* per-item runtime colour: overridden inline on the element that owns it
           (bubble, dialog, room option). Fallback = the app's own type fallback. */
        "--cc-c": CONSTANT.typeFallback,
    };
};

const KEYFRAMES = {
    "@keyframes cc-slide-in": {
        from: { opacity: 0, transform: "translateX(-10px)" },
        to: { opacity: 1, transform: "none" },
    },
    "@keyframes cc-fade": { from: { opacity: 0 }, to: { opacity: 1 } },
    "@keyframes cc-pick-in": {
        from: { opacity: 0, transform: "scale(.94) translateY(-8px)" },
        to: { opacity: 1, transform: "none" },
    },
    "@keyframes cc-bar": { "0%": { left: "-40%" }, "100%": { left: "100%" } },
    "@keyframes cc-rise": {
        from: { opacity: 0, transform: "translateY(12px) scale(.98)" },
        to: { opacity: 1, transform: "none" },
    },
    "@keyframes cc-pop": {
        from: { opacity: 0, transform: "scale(.86) translateY(5px)" },
        to: { opacity: 1, transform: "none" },
    },
    "@keyframes cc-slidein": {
        from: { opacity: 0, transform: "translateY(-6px) scale(.97)" },
        to: { opacity: 1, transform: "none" },
    },
    "@keyframes cc-pulse": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.45 } },
    "@keyframes cc-shim": { to: { transform: "translateX(100%)" } },
    "@keyframes cc-dialog-in": {
        from: { opacity: 0, transform: "scale(.93) translateY(20px)" },
        to: { opacity: 1, transform: "none" },
    },
    "@keyframes cc-stag": {
        from: { opacity: 0, transform: "translateY(9px)" },
        to: { opacity: 1, transform: "none" },
    },
    "@keyframes cc-sheet": {
        from: { transform: "translateY(100%)" },
        to: { transform: "none" },
    },
};

/**
 * Everything that must exist at document level, exactly once.
 * Mount in App.js INSIDE the ThemeProvider:
 *
 *   <GlobalStyles styles={concourseGlobalStyles(mode)} />
 *
 * Deliberately a plain object (not a theme callback) so it does not depend on
 * which ThemeProvider is in play — App.js currently uses @emotion/react's.
 */
export const concourseGlobalStyles = (mode = "light") => ({
    ":root": cssVars(mode),
    ...KEYFRAMES,
    "@media (prefers-reduced-motion: reduce)": {
        "*, *::before, *::after": {
            animationDuration: "0.001ms !important",
            animationIterationCount: "1 !important",
            transitionDuration: "0.001ms !important",
        },
    },
});

/* ============================================================================
 * 8. THE THEME EXTENSION
 * ==========================================================================*/

/**
 * The object the integrator mounts as `theme.concourse`. Read it in sx:
 *   sx={(t) => ({ background: t.concourse.srf, borderRadius: t.concourse.radius.card + "px" })}
 * Or take the CSS-var route for anything that must survive a portal: v("srf").
 */
export const concourse = (mode = "light") => {
    const p = mode === "dark" ? DARK : LIGHT;
    return {
        mode,
        ...p,
        ...CONSTANT,
        radius,
        space,
        border,
        zIndex,
        layout,
        bp,
        font,
        type,
        motion,
        anim,
        ...derive(p),
        mix,
        alpha,
        v,
        vars: cssVars(mode),
    };
};

export const tokens = { light: LIGHT, dark: DARK, constant: CONSTANT };

export default concourse;
