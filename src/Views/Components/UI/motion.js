import React, { forwardRef } from "react";
import { Box, Slide, Grow, Fade } from "@mui/material";

// ============================================================================
// Motion primitives
// ----------------------------------------------------------------------------
// Small wrappers over the keyframes defined in the theme's CssBaseline, so
// entrance animation is one import instead of a bespoke sx block per page.
// Everything here is CSS-driven and respects prefers-reduced-motion via the
// global media query in the theme.
// ============================================================================

/**
 * Fades + rises its children in on mount.
 *
 * @param {number} delay  ms to wait before starting
 * @param {number} y      px to travel (default 12)
 */
export const RiseIn = forwardRef(function RiseIn(
    { children, delay = 0, duration = 380, sx = {}, ...rest },
    ref,
) {
    return (
        <Box
            ref={ref}
            sx={{
                animation: `seaRiseIn ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) both`,
                animationDelay: `${delay}ms`,
                ...sx,
            }}
            {...rest}
        >
            {children}
        </Box>
    );
});

export const FadeIn = forwardRef(function FadeIn(
    { children, delay = 0, duration = 300, sx = {}, ...rest },
    ref,
) {
    return (
        <Box
            ref={ref}
            sx={{
                animation: `seaFadeIn ${duration}ms ease both`,
                animationDelay: `${delay}ms`,
                ...sx,
            }}
            {...rest}
        >
            {children}
        </Box>
    );
});

export const ScaleIn = forwardRef(function ScaleIn(
    { children, delay = 0, duration = 320, sx = {}, ...rest },
    ref,
) {
    return (
        <Box
            ref={ref}
            sx={{
                animation: `seaScaleIn ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) both`,
                animationDelay: `${delay}ms`,
                ...sx,
            }}
            {...rest}
        >
            {children}
        </Box>
    );
});

/**
 * Staggers the entrance of its direct children.
 *
 * Uses a CSS nth-child selector rather than cloning elements, so it works with
 * `.map()` output, fragments and virtualised rows without extra wrappers. The
 * stagger is capped so a 500-row list doesn't take 30 seconds to appear.
 */
export function Stagger({
    children,
    step = 40,
    delay = 0,
    max = 12,
    animation = "seaRiseIn",
    duration = 380,
    sx = {},
    ...rest
}) {
    const childRules = {};
    for (let i = 1; i <= max; i += 1) {
        childRules[`& > *:nth-of-type(${i})`] = {
            animationDelay: `${delay + (i - 1) * step}ms`,
        };
    }
    // Anything past `max` shares the final delay so it still animates in.
    childRules[`& > *:nth-of-type(n + ${max + 1})`] = {
        animationDelay: `${delay + (max - 1) * step}ms`,
    };

    return (
        <Box
            sx={{
                "& > *": {
                    animation: `${animation} ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) both`,
                },
                ...childRules,
                ...sx,
            }}
            {...rest}
        >
            {children}
        </Box>
    );
}

/** Slide-up transition — used for dialogs and sheets on mobile. */
export const SlideUpTransition = forwardRef(function SlideUpTransition(
    props,
    ref,
) {
    return <Slide direction="up" ref={ref} timeout={300} {...props} />;
});

/** Grow transition with a touch of overshoot — desktop dialogs. */
export const GrowTransition = forwardRef(function GrowTransition(props, ref) {
    return <Grow ref={ref} timeout={260} {...props} />;
});

export const FadeTransition = forwardRef(function FadeTransition(props, ref) {
    return <Fade ref={ref} timeout={240} {...props} />;
});

/**
 * Hover lift for cards and tiles. Spread into an `sx` prop.
 * Disabled automatically where there's no real hover (touch screens).
 */
export const hoverLift = (theme, { y = -3, shadow = "lg" } = {}) => ({
    transition: `transform 240ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 240ms cubic-bezier(0.22, 1, 0.36, 1), border-color 240ms ease`,
    "@media (hover: hover)": {
        "&:hover": {
            transform: `translateY(${y}px)`,
            boxShadow: theme.shadowTokens?.[shadow],
            borderColor: theme.palette.grey[300],
        },
    },
    "&:active": { transform: "translateY(0) scale(0.995)" },
});

/** Shimmering placeholder background, for custom skeletons. */
export const shimmer = (theme) => ({
    background: `linear-gradient(90deg, ${theme.palette.grey[100]} 25%, ${theme.palette.grey[50]} 37%, ${theme.palette.grey[100]} 63%)`,
    backgroundSize: "800px 100%",
    animation: "seaShimmer 1.4s linear infinite",
});
