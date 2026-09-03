import { useMediaQuery, useTheme } from "@mui/material";

/**
 * Viewport-based responsive flags.
 *
 * The app previously branched on `isMobile` from react-device-detect, which
 * sniffs the user agent. That gets a narrow desktop window wrong, gets an iPad
 * wrong, and can't respond to rotation or resize. These flags come from real
 * media queries, so layout follows the viewport it actually has.
 *
 *   isMobile   < 600px   phones
 *   isTablet   600-899   small tablets / split view
 *   isDesktop  >= 900px
 *   isCompact  < 900px   "give me the stacked layout"
 *   isTouch    coarse pointer, no hover — hide hover-only affordances
 */
export default function useResponsive() {
    const theme = useTheme();

    const isMobile = useMediaQuery(theme.breakpoints.down("sm"), {
        noSsr: true,
    });
    const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"), {
        noSsr: true,
    });
    const isDesktop = useMediaQuery(theme.breakpoints.up("md"), {
        noSsr: true,
    });
    const isCompact = useMediaQuery(theme.breakpoints.down("md"), {
        noSsr: true,
    });
    const isWide = useMediaQuery(theme.breakpoints.up("lg"), { noSsr: true });
    const isTouch = useMediaQuery("(hover: none) and (pointer: coarse)", {
        noSsr: true,
    });
    const prefersReducedMotion = useMediaQuery(
        "(prefers-reduced-motion: reduce)",
        { noSsr: true },
    );

    return {
        isMobile,
        isTablet,
        isDesktop,
        isCompact,
        isWide,
        isTouch,
        prefersReducedMotion,
    };
}

export { useResponsive };
