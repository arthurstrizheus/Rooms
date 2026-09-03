/**
 * Per-equipment colors for the comparison calendars.
 *
 * Shared by the in-app compare view and the embeddable one so the same piece of
 * equipment gets the same color in both. Chosen to stay distinguishable side by
 * side and to hold enough contrast for white event text.
 */
export const EQUIPMENT_PALETTE = [
    "#C8102E", // brand red
    "#1F6FD0", // blue
    "#1E9E52", // green
    "#8A4FBF", // violet
    "#C77700", // amber
    "#0F8B8D", // teal
    "#B5306B", // magenta
    "#4C6EF5", // indigo
    "#7A6B22", // olive
    "#6B7A8F", // slate
];

/** Color for the nth item in a comparison, wrapping when the list is long. */
export const equipmentColor = (index) =>
    EQUIPMENT_PALETTE[index % EQUIPMENT_PALETTE.length];

export default EQUIPMENT_PALETTE;
