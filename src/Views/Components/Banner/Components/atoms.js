/**
 * Shared primitives for the Concourse banner.
 *
 * ARBITER-concourse.md §7 (iconography), §11 (focus), §13-G5 (hover guard).
 * Line icons only: 24x24 box, `stroke: currentColor`, no fill, round caps —
 * the stroke widths are per-icon and come straight from §7.
 */

/** §11 — every interactive element gets this ring on :focus-visible. */
export const focusRing = {
    outline: "2px solid var(--cc-red)",
    outlineOffset: "2px",
};

/**
 * Neutralises UA + MUI button chrome.
 * We never use MUI <Button>/<IconButton> on a Concourse surface: theme.js's
 * `MuiButton.styleOverrides.root` forces `color` and a hover `color`
 * (ARBITER §14 conflict 7), and we must not touch theme.js to undo it.
 */
export const btnReset = {
    appearance: "none",
    WebkitAppearance: "none",
    border: 0,
    margin: 0,
    padding: 0,
    background: "transparent",
    color: "inherit",
    fontFamily: "inherit",
    textAlign: "center",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "none",
    "&:focus-visible": focusRing,
    "&:disabled": { cursor: "default" },
};

/**
 * §13-G5 — hover rules must be gated on a real hover device, or a tap leaves
 * the element stuck in its hover state on touch.
 */
export const hover = (styles) => ({
    "@media (hover: hover)": { "&:hover": styles },
});

const Line = ({ size, strokeWidth, style, children }) => (
    <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        aria-hidden="true"
        focusable="false"
        style={{
            display: "block",
            fill: "none",
            stroke: "currentColor",
            strokeWidth,
            strokeLinecap: "round",
            strokeLinejoin: "round",
            ...style,
        }}
    >
        {children}
    </svg>
);

/**
 * Chevron pointing left. "Next" is the *same* glyph mirrored with
 * `scaleX(-1)` (§7) — there is no separate right-chevron in the design.
 */
export const ChevronIcon = ({ size = 17, strokeWidth = 2, flip = false }) => (
    <Line
        size={size}
        strokeWidth={strokeWidth}
        style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
        <path d="M14.5 5 8 12l6.5 7" />
    </Line>
);

/** The date-title disclosure chevron (§7: 14 / 2). */
export const ChevronDownIcon = ({ size = 14, strokeWidth = 2 }) => (
    <Line size={size} strokeWidth={strokeWidth}>
        <path d="M5 9l7 7 7-7" />
    </Line>
);

/** The banner burger (§7: 19 / 1.8). */
export const BurgerIcon = ({ size = 19, strokeWidth = 1.8 }) => (
    <Line size={size} strokeWidth={strokeWidth}>
        <path d="M4 7h16M4 12h16M4 17h16" />
    </Line>
);
