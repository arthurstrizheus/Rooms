import React from "react";
import { Box } from "@mui/material";

/**
 * Page body: a fixed-height region under the page header.
 *
 * The window never scrolls. The shell gives this component whatever height is
 * left below the top bar and the page header, and it clamps to exactly that —
 * so headers, filters and floating action bars stay put no matter how long the
 * content is.
 *
 * Two modes:
 *
 *   default   the body is the scroll region. Stacked cards and forms scroll
 *             inside the page, not the window.
 *   fill      the body hands its height straight to the children and scrolls
 *             nothing. For pages whose content is one table or calendar that
 *             manages its own scrolling — give that child `flexGrow: 1` and
 *             `minHeight: 0` and it will size itself, no `calc(100dvh - N)`
 *             guesswork about how tall the chrome above it happens to be.
 *
 * Padding is responsive (16 / 24 / 32px) and the bottom gutter clears the iOS
 * home indicator. `sx` lands on the body, so callers can override padding —
 * e.g. to leave room for a floating selection bar.
 */
export default function PageContainer({
    children,
    /** false = full bleed (calendars, data grids that manage their own width) */
    maxWidth = 1440,
    /** Remove horizontal padding — for edge-to-edge tables. */
    disableGutters = false,
    /** Children own the remaining height and do their own scrolling. */
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
                overflow: "hidden",
                mx: "auto",
                maxWidth: maxWidth === false ? "none" : maxWidth,
            }}
            {...rest}
        >
            <Box
                sx={{
                    flexGrow: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    overflowY: fill ? "hidden" : "auto",
                    overflowX: "hidden",
                    // A flex item whose overflow is not `visible` gets an
                    // automatic minimum size of 0 — which is every MUI Card.
                    // In a scrolling body that means cards silently squash and
                    // clip instead of pushing the scroll height down.
                    ...(fill ? {} : { "& > *": { flexShrink: 0 } }),
                    WebkitOverflowScrolling: "touch",
                    overscrollBehaviorY: "contain",
                    px: disableGutters ? 0 : { xs: 2, sm: 3, md: 4 },
                    pt: 0.25,
                    pb: fill
                        ? { xs: 2, sm: 3 }
                        : {
                              xs: "calc(24px + env(safe-area-inset-bottom))",
                              sm: 4,
                          },
                    ...sx,
                }}
            >
                {children}
            </Box>
        </Box>
    );
}
