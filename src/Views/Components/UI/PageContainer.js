import React from "react";
import { Box } from "@mui/material";

/**
 * Scroll container + max-width gutter for a page body.
 *
 * Every page previously rolled its own padding, which is why margins drifted
 * from screen to screen. Padding here is responsive (16 / 24 / 32px) and the
 * bottom gutter clears the iOS home indicator.
 */
export default function PageContainer({
    children,
    /** false = full bleed (calendars, data grids that manage their own width) */
    maxWidth = 1440,
    /** Remove horizontal padding — for edge-to-edge tables. */
    disableGutters = false,
    /** Page body fills the height and manages its own internal scrolling. */
    fill = false,
    sx = {},
    ...rest
}) {
    return (
        <Box
            component="main"
            sx={{
                width: "100%",
                flexGrow: 1,
                // `min-height: auto` is load-bearing. This is a flex item inside
                // the shell's scroll viewport; pinning it to 0 let it shrink to
                // the viewport, which squashed the cards inside it (MUI Card
                // clips) and left the page unable to scroll. Only `fill` pages —
                // which manage their own internal scrolling — want the clamp.
                ...(fill ? { minHeight: 0, overflow: "hidden" } : {}),
                display: "flex",
                flexDirection: "column",
                px: disableGutters ? 0 : { xs: 2, sm: 3, md: 4 },
                pb: fill
                    ? 0
                    : {
                          xs: "calc(24px + env(safe-area-inset-bottom))",
                          sm: 4,
                      },
                mx: "auto",
                maxWidth: maxWidth === false ? "none" : maxWidth,
                ...sx,
            }}
            {...rest}
        >
            {children}
        </Box>
    );
}
