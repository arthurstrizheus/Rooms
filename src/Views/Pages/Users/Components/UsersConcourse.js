/**
 * Lane-local Concourse bits for `/manage/users`.
 *
 * Two things the kit does not carry, kept in one place so the three files in
 * this lane cannot drift apart. Both are candidates for promotion into
 * `ConcourseDialogKit` — flagged for the integrator, not moved here.
 *
 *  1. `groupChipsSx` — `src/Views/Components/DisplayGroups.jsx` is shared with
 *     MyAccount, Rooms and RowRoom, so this lane may not edit it. Its MUI
 *     `Chip`s are restyled from the containing cell with a descendant
 *     selector instead, which keeps the `(F/R)` / Read / Full derivation
 *     (DisplayGroups.jsx:5-27) in exactly one place.
 *     Specificity note: `.parent .MuiChip-root` is (0,2,0) and beats the
 *     `sx` class DisplayGroups puts on the Chip itself, which is (0,1,0).
 *
 *  2. `ccTooltipSlotProps` — the guide styles portalled `Paper`s but MUI's
 *     `Tooltip` is not a `Paper`, so it has no house style yet. This is the
 *     same language (srf / line / sh-pop / 12.5 sans) written at the call
 *     site. `backgroundImage:"none"` is set anyway, per §0.5.
 */

import { type as ccType } from "../../../../Utilites/concourse";

/** Restyles any `DisplayGroups` output rendered inside this element. */
export const groupChipsSx = {
    display: "flex",
    flexWrap: "wrap",
    gap: "5px",
    alignItems: "center",
    minWidth: 0,
    "& .MuiChip-root": {
        height: "auto",
        minHeight: 0,
        margin: 0,
        border: 0,
        borderRadius: "99px",
        padding: "2px 9px",
        boxSizing: "border-box",
        background: "var(--cc-srf2)",
        color: "var(--cc-mute)",
        ...ccType.tag,
        "& .MuiChip-label": { padding: 0, overflow: "visible" },
    },
};

/** House style for the MUI tooltips this page must keep. */
export const ccTooltipSlotProps = {
    tooltip: {
        sx: {
            background: "var(--cc-srf)",
            backgroundImage: "none",
            color: "var(--cc-ink)",
            border: "1px solid var(--cc-line)",
            borderRadius: "12px",
            boxShadow: "var(--cc-sh-pop)",
            boxSizing: "border-box",
            fontFamily: "var(--cc-sans)",
            fontSize: "12.5px",
            lineHeight: 1.5,
            padding: "7px 10px",
            maxWidth: "260px",
        },
    },
    arrow: { sx: { color: "var(--cc-srf)" } },
};
