import { Box } from "@mui/material";
import { type as ccType } from "../../../../Utilites/concourse";

/**
 * The meeting-type colour swatch.
 *
 * These colours ARE the Calendar's palette — `Calendar/index.jsx:300` feeds
 * `type.color` straight into the event bubble as `--cc-c` — so this chip is a
 * byte-faithful copy of the shipped bubble rather than a new invention. What
 * you see here is what the Calendar will paint. Every number is transcribed
 * from `src/Views/Pages/Calendar/RenderEventContent.jsx`:
 *
 *   :30       REST_BG  — `color-mix(in srgb, var(--cc-c) 12%, var(--cc-srf))`
 *   :68-74    BUB_BAR  — 3px wide, `border-radius: 0 3px 3px 0`, `align-self: stretch`
 *   :114      `month` variant — `border-radius: 11px`, `padding: 4px 9px 5px 0`
 *   :262-267  `display:flex; gap:8px; align-items:stretch; box-sizing:border-box; overflow:hidden`
 *
 * If the Calendar lane moves those numbers, move these with them.
 *
 * `--cc-c` is set inline on the one element that owns the accent — never at
 * `:root` (adoption guide §1.3).
 */
const ColorChip = ({ color, label, sx }) => (
  <Box
    style={{ "--cc-c": color }}
    sx={{
      display: "flex",
      alignItems: "stretch",
      gap: "8px",
      boxSizing: "border-box",
      borderRadius: "11px",
      padding: "4px 9px 5px 0",
      overflow: "hidden",
      background: "color-mix(in srgb, var(--cc-c) 12%, var(--cc-srf))",
      ...sx,
    }}
  >
    <Box
      aria-hidden="true"
      sx={{
        width: "3px",
        flex: "none",
        alignSelf: "stretch",
        borderRadius: "0 3px 3px 0",
        background: "var(--cc-c)",
      }}
    />
    {label ? (
      <Box
        sx={{
          ...ccType.cardName,
          color: "var(--cc-ink)",
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </Box>
    ) : null}
    <Box
      sx={{
        ...ccType.factValueMono,
        color: "var(--cc-mute)",
        flex: "none",
        marginLeft: label ? "auto" : 0,
      }}
    >
      {color}
    </Box>
  </Box>
);

export default ColorChip;
