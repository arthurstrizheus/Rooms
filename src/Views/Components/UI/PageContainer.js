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
                minHeight: 0,
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
                overflow: fill ? "hidden" : "visible",
                ...sx,
            }}
            {...rest}
        >
            {children}
        </Box>
    );
}
