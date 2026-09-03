import { createTheme } from "@mui/material/styles";

// ============================================================================
// S-E-A Equipment — Design System
// ----------------------------------------------------------------------------
// One source of truth for color, type, radius, elevation and motion.
// Pages should read from the theme rather than hardcoding hex values, so a
// change here propagates to every page and dialog in the app.
//
// The brand red (#C8102E, PANTONE 186 C) is the company color and is fixed.
// Everything around it is deliberately near-neutral so the red reads as an
// accent instead of competing with the UI.
// ============================================================================

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

const brand = {
    50: "#FEF2F3",
    100: "#FCE4E7",
    200: "#F8C4CB",
    300: "#F09AA6",
    400: "#E15C71",
    500: "#C8102E", // S-E-A Red — the company color
    600: "#B00D28",
    700: "#93272C",
    800: "#761C22",
    900: "#4F1216",
};

// Cool-leaning neutrals. Slightly desaturated so the red never looks muddy
// next to them.
const neutral = {
    0: "#FFFFFF",
    25: "#FCFCFD",
    50: "#F7F8FA",
    100: "#F1F2F5",
    200: "#E5E7EB",
    300: "#D3D7DE",
    400: "#A6ADBA",
    500: "#78808F",
    600: "#565E6C",
    700: "#3B424E",
    800: "#252A33",
    900: "#14181F",
};

const success = {
    light: "#E6F6EC",
    main: "#1E9E52",
    dark: "#14713A",
    contrastText: "#FFFFFF",
};

const warning = {
    light: "#FEF4E2",
    main: "#C77700",
    dark: "#8F5600",
    contrastText: "#FFFFFF",
};

const info = {
    light: "#E8F1FD",
    main: "#1F6FD0",
    dark: "#15508F",
    contrastText: "#FFFFFF",
};

const danger = {
    light: brand[100],
    main: brand[500],
    dark: brand[700],
    contrastText: "#FFFFFF",
};

// ---------------------------------------------------------------------------
// Elevation — soft, layered, low-alpha. Never the default MUI grey slabs.
// ---------------------------------------------------------------------------

const shadow = {
    xs: "0 1px 2px rgba(20, 24, 31, 0.05)",
    sm: "0 1px 3px rgba(20, 24, 31, 0.07), 0 1px 2px rgba(20, 24, 31, 0.04)",
    md: "0 4px 12px rgba(20, 24, 31, 0.07), 0 2px 4px rgba(20, 24, 31, 0.04)",
    lg: "0 12px 28px rgba(20, 24, 31, 0.10), 0 4px 8px rgba(20, 24, 31, 0.04)",
    xl: "0 24px 56px rgba(20, 24, 31, 0.14), 0 8px 16px rgba(20, 24, 31, 0.05)",
    brand: "0 6px 20px rgba(200, 16, 46, 0.24)",
    brandSm: "0 2px 8px rgba(200, 16, 46, 0.20)",
    focus: `0 0 0 3px ${brand[100]}`,
};

// ---------------------------------------------------------------------------
// Motion — a small, opinionated set. Reused everywhere so animation across the
// app feels like one hand made it.
// ---------------------------------------------------------------------------

const motion = {
    // Decelerate hard at the end: the "expensive" feel.
    emphasized: "cubic-bezier(0.22, 1, 0.36, 1)",
    standard: "cubic-bezier(0.4, 0, 0.2, 1)",
    exit: "cubic-bezier(0.4, 0, 1, 1)",
    spring: "cubic-bezier(0.34, 1.56, 0.64, 1)", // slight overshoot
    duration: {
        instant: 90,
        fast: 160,
        normal: 240,
        slow: 360,
        slower: 520,
    },
};

const radius = {
    xs: 6,
    sm: 8,
    md: 10,
    lg: 14,
    xl: 18,
    xxl: 24,
    pill: 999,
};

const fontStack = [
    "Inter",
    "-apple-system",
    "BlinkMacSystemFont",
    '"Segoe UI Variable Text"',
    '"Segoe UI"',
    "Roboto",
    '"Helvetica Neue"',
    "Arial",
    "sans-serif",
].join(",");

const monoStack = [
    '"SF Mono"',
    '"JetBrains Mono"',
    '"Cascadia Mono"',
    "Menlo",
    "Consolas",
    "monospace",
].join(",");

// ---------------------------------------------------------------------------
// Legacy palette keys
// ---------------------------------------------------------------------------
// Existing pages read theme.palette.background.fill.*, theme.palette.border.*,
// theme.palette.alert.* and primary.selected / primary.lightHover / primary.text.
// These are kept and re-pointed at the new ramp so older screens stay coherent
// with the redesign instead of breaking.

const fills = {
    light: {
        main: neutral[100],
        light: neutral[0],
        dark: neutral[400],
        lightHover: neutral[50],
    },
    dark: {
        main: neutral[800],
        light: neutral[600],
        dark: neutral[900],
        secondary: brand[700],
    },
    alert: {
        success: success.main,
        successLight: success.light,
        successDark: success.dark,
        error: danger.main,
        errorLight: danger.light,
        errorDark: danger.dark,
        warning: warning.main,
        warningLight: warning.light,
        warningDark: warning.dark,
    },
};

const borders = {
    main: brand[500],
    secondary: neutral[700],
    light: neutral[200],
};

const alerts = {
    error: danger.main,
    warning: warning.main,
    success: success.main,
    info: info.main,
};

// ---------------------------------------------------------------------------
// Global keyframes + resets, injected once via CssBaseline.
// ---------------------------------------------------------------------------

const globalStyles = `
  @keyframes seaFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes seaRiseIn {
    from { opacity: 0; transform: translate3d(0, 12px, 0); }
    to   { opacity: 1; transform: translate3d(0, 0, 0); }
  }
  @keyframes seaScaleIn {
    from { opacity: 0; transform: scale(0.96); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes seaSlideInLeft {
    from { opacity: 0; transform: translate3d(-16px, 0, 0); }
    to   { opacity: 1; transform: translate3d(0, 0, 0); }
  }
  @keyframes seaShimmer {
    from { background-position: -400px 0; }
    to   { background-position: 400px 0; }
  }
  @keyframes seaPulseRing {
    0%   { box-shadow: 0 0 0 0 rgba(200, 16, 46, 0.35); }
    70%  { box-shadow: 0 0 0 10px rgba(200, 16, 46, 0); }
    100% { box-shadow: 0 0 0 0 rgba(200, 16, 46, 0); }
  }
  @keyframes seaSpin {
    to { transform: rotate(360deg); }
  }

  html { -webkit-text-size-adjust: 100%; }

  body {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    overscroll-behavior-y: none;
  }

  /* Slim, unobtrusive scrollbars that match the surface palette. */
  * {
    scrollbar-width: thin;
    scrollbar-color: ${neutral[300]} transparent;
  }
  *::-webkit-scrollbar { width: 10px; height: 10px; }
  *::-webkit-scrollbar-track { background: transparent; }
  *::-webkit-scrollbar-thumb {
    background-color: ${neutral[300]};
    border-radius: ${radius.pill}px;
    border: 3px solid transparent;
    background-clip: content-box;
  }
  *::-webkit-scrollbar-thumb:hover { background-color: ${neutral[400]}; }

  /* Never trap a tap on mobile behind a hover-only affordance. */
  @media (hover: none) {
    *:hover { -webkit-tap-highlight-color: transparent; }
  }

  /* Respect the OS setting. Everything below degrades to an instant state
     change rather than disappearing entirely. */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
`;

// ---------------------------------------------------------------------------
// Theme factory
// ---------------------------------------------------------------------------

const theme = (mode = "light") => {
    const base = createTheme({
        palette: {
            mode: "light",
            primary: {
                50: brand[50],
                100: brand[100],
                200: brand[200],
                300: brand[300],
                400: brand[400],
                500: brand[500],
                600: brand[600],
                700: brand[700],
                800: brand[800],
                900: brand[900],
                lighter: brand[50],
                light: brand[100],
                lightHover: brand[50],
                main: brand[500],
                dark: brand[700],
                darker: brand[900],
                selected: brand[500],
                darkSelected: brand[800],
                text: {
                    main: "#FFFFFF",
                    light: brand[200],
                    dark: brand[400],
                },
                contrastText: "#FFFFFF",
            },
            secondary: {
                lighter: neutral[50],
                light: neutral[200],
                lightHover: neutral[100],
                main: neutral[700],
                dark: neutral[900],
                selected: neutral[900],
                text: {
                    main: "#FFFFFF",
                    light: neutral[300],
                    dark: neutral[500],
                },
                contrastText: "#FFFFFF",
            },
            error: danger,
            warning,
            info,
            success,
            grey: neutral,
            neutral,
            divider: neutral[200],
            background: {
                // The canvas is a hair darker than paper so cards separate
                // without needing heavy borders.
                default: neutral[50],
                paper: neutral[0],
                subtle: neutral[100],
                canvas: neutral[50],
                elevated: neutral[0],
                inverse: neutral[900],
                fill: fills,
            },
            border: borders,
            alert: alerts,
            text: {
                primary: neutral[900],
                secondary: neutral[600],
                tertiary: neutral[500],
                disabled: neutral[400],
                inverse: neutral[0],
            },
            action: {
                hover: "rgba(20, 24, 31, 0.04)",
                selected: brand[50],
                disabledBackground: neutral[100],
                disabled: neutral[400],
                focus: brand[100],
            },
        },

        shape: {
            borderRadius: radius.md,
        },

        // Custom scales, available as theme.radius / theme.shadowTokens /
        // theme.motion anywhere in the app.
        radius,
        shadowTokens: shadow,
        motion,

        typography: {
            fontFamily: fontStack,
            fontFamilyMono: monoStack,
            // Display / headings run tight tracking; body stays neutral.
            h1: {
                fontSize: "2.25rem",
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: "-0.025em",
            },
            h2: {
                fontSize: "1.75rem",
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: "-0.021em",
            },
            h3: {
                fontSize: "1.4rem",
                fontWeight: 650,
                lineHeight: 1.25,
                letterSpacing: "-0.017em",
            },
            h4: {
                fontSize: "1.15rem",
                fontWeight: 650,
                lineHeight: 1.3,
                letterSpacing: "-0.012em",
            },
            h5: {
                fontSize: "1rem",
                fontWeight: 650,
                lineHeight: 1.4,
                letterSpacing: "-0.008em",
            },
            h6: {
                fontSize: "0.9375rem",
                fontWeight: 650,
                lineHeight: 1.45,
                letterSpacing: "-0.005em",
            },
            subtitle1: { fontSize: "0.9375rem", fontWeight: 600, lineHeight: 1.5 },
            subtitle2: { fontSize: "0.8125rem", fontWeight: 600, lineHeight: 1.5 },
            body1: { fontSize: "0.9375rem", fontWeight: 400, lineHeight: 1.6 },
            body2: { fontSize: "0.8125rem", fontWeight: 400, lineHeight: 1.55 },
            caption: {
                fontSize: "0.75rem",
                fontWeight: 500,
                lineHeight: 1.45,
                color: neutral[600],
            },
            overline: {
                fontSize: "0.6875rem",
                fontWeight: 700,
                lineHeight: 1.4,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
            },
            button: {
                fontSize: "0.875rem",
                fontWeight: 600,
                letterSpacing: "0.005em",
                textTransform: "none",
            },
        },

        transitions: {
            easing: {
                easeInOut: motion.standard,
                easeOut: motion.emphasized,
                easeIn: motion.exit,
                sharp: motion.standard,
            },
            duration: {
                shortest: motion.duration.instant,
                shorter: motion.duration.fast,
                short: motion.duration.normal,
                standard: motion.duration.normal,
                complex: motion.duration.slow,
                enteringScreen: motion.duration.normal,
                leavingScreen: motion.duration.fast,
            },
        },

        zIndex: {
            appBar: 1100,
            drawer: 1200,
            modal: 1300,
            snackbar: 1400,
            tooltip: 1500,
        },
    });

    // Replace the default MUI elevation ramp with the soft token set so any
    // `elevation={n}` in existing code lands on the new system.
    base.shadows = [
        "none",
        shadow.xs,
        shadow.sm,
        shadow.sm,
        shadow.md,
        shadow.md,
        shadow.md,
        shadow.lg,
        shadow.lg,
        shadow.lg,
        shadow.lg,
        shadow.lg,
        shadow.xl,
        shadow.xl,
        shadow.xl,
        shadow.xl,
        shadow.xl,
        shadow.xl,
        shadow.xl,
        shadow.xl,
        shadow.xl,
        shadow.xl,
        shadow.xl,
        shadow.xl,
        shadow.xl,
    ];

    return createTheme(base, {
        components: {
            // ---------------------------------------------------------------
            MuiCssBaseline: {
                styleOverrides: globalStyles,
            },

            // --- Buttons ---------------------------------------------------
            MuiButton: {
                defaultProps: {
                    disableElevation: true,
                },
                styleOverrides: {
                    root: {
                        borderRadius: radius.md,
                        fontWeight: 600,
                        paddingInline: 16,
                        position: "relative",
                        // Tap targets stay >=40px so mobile stays comfortable.
                        minHeight: 40,
                        transition: `background-color ${motion.duration.fast}ms ${motion.standard}, box-shadow ${motion.duration.normal}ms ${motion.emphasized}, transform ${motion.duration.fast}ms ${motion.emphasized}, border-color ${motion.duration.fast}ms ${motion.standard}, color ${motion.duration.fast}ms ${motion.standard}`,
                        "&:active": {
                            transform: "scale(0.975)",
                        },
                        "&.Mui-focusVisible": {
                            boxShadow: shadow.focus,
                        },
                    },
                    sizeSmall: {
                        minHeight: 32,
                        paddingInline: 12,
                        fontSize: "0.8125rem",
                        borderRadius: radius.sm,
                    },
                    sizeLarge: {
                        minHeight: 48,
                        paddingInline: 24,
                        fontSize: "0.9375rem",
                    },
                    contained: {
                        boxShadow: shadow.xs,
                        "&:hover": { boxShadow: shadow.brandSm },
                    },
                    containedPrimary: {
                        backgroundColor: brand[500],
                        "&:hover": { backgroundColor: brand[600] },
                        "&:active": { backgroundColor: brand[700] },
                    },
                    containedSecondary: {
                        backgroundColor: neutral[800],
                        "&:hover": { backgroundColor: neutral[900] },
                    },
                    outlined: {
                        borderColor: neutral[300],
                        color: neutral[700],
                        backgroundColor: neutral[0],
                        "&:hover": {
                            borderColor: neutral[400],
                            backgroundColor: neutral[50],
                        },
                    },
                    outlinedPrimary: {
                        borderColor: brand[200],
                        color: brand[600],
                        "&:hover": {
                            borderColor: brand[400],
                            backgroundColor: brand[50],
                        },
                    },
                    text: {
                        "&:hover": { backgroundColor: neutral[100] },
                    },
                    textPrimary: {
                        "&:hover": { backgroundColor: brand[50] },
                    },
                },
            },

            MuiIconButton: {
                styleOverrides: {
                    root: {
                        borderRadius: radius.sm,
                        transition: `background-color ${motion.duration.fast}ms ${motion.standard}, color ${motion.duration.fast}ms ${motion.standard}, transform ${motion.duration.fast}ms ${motion.spring}`,
                        "&:hover": { transform: "scale(1.06)" },
                        "&:active": { transform: "scale(0.94)" },
                        "&.Mui-focusVisible": { boxShadow: shadow.focus },
                    },
                },
            },

            MuiToggleButton: {
                styleOverrides: {
                    root: {
                        borderRadius: radius.md,
                        borderColor: neutral[300],
                        textTransform: "none",
                        fontWeight: 600,
                        transition: `all ${motion.duration.fast}ms ${motion.standard}`,
                        "&.Mui-selected": {
                            backgroundColor: brand[500],
                            color: "#FFFFFF",
                            "&:hover": { backgroundColor: brand[600] },
                        },
                    },
                },
            },

            MuiFab: {
                styleOverrides: {
                    root: {
                        boxShadow: shadow.lg,
                        transition: `transform ${motion.duration.normal}ms ${motion.spring}, box-shadow ${motion.duration.normal}ms ${motion.emphasized}`,
                        "&:hover": {
                            transform: "translateY(-2px) scale(1.03)",
                            boxShadow: shadow.xl,
                        },
                        "&:active": { transform: "scale(0.96)" },
                    },
                },
            },

            // --- Surfaces --------------------------------------------------
            MuiPaper: {
                defaultProps: { elevation: 0 },
                styleOverrides: {
                    root: {
                        backgroundImage: "none",
                    },
                    rounded: { borderRadius: radius.lg },
                    outlined: {
                        borderColor: neutral[200],
                    },
                },
            },

            MuiCard: {
                defaultProps: { elevation: 0 },
                styleOverrides: {
                    root: {
                        borderRadius: radius.lg,
                        border: `1px solid ${neutral[200]}`,
                        backgroundColor: neutral[0],
                        overflow: "hidden",
                        transition: `box-shadow ${motion.duration.normal}ms ${motion.emphasized}, transform ${motion.duration.normal}ms ${motion.emphasized}, border-color ${motion.duration.normal}ms ${motion.standard}`,
                    },
                },
            },

            MuiCardHeader: {
                styleOverrides: {
                    root: { padding: "18px 20px 12px" },
                    title: {
                        fontSize: "1rem",
                        fontWeight: 650,
                        letterSpacing: "-0.008em",
                    },
                    subheader: { fontSize: "0.8125rem", color: neutral[600] },
                },
            },

            MuiCardContent: {
                styleOverrides: {
                    root: {
                        padding: "20px",
                        "&:last-child": { paddingBottom: 20 },
                    },
                },
            },

            MuiCardActionArea: {
                styleOverrides: {
                    root: {
                        "& .MuiCardActionArea-focusHighlight": { opacity: 0 },
                    },
                },
            },

            MuiAccordion: {
                defaultProps: { elevation: 0, disableGutters: true },
                styleOverrides: {
                    root: {
                        border: `1px solid ${neutral[200]}`,
                        borderRadius: radius.lg,
                        overflow: "hidden",
                        "&:before": { display: "none" },
                        "& + &": { marginTop: 8 },
                        transition: `box-shadow ${motion.duration.normal}ms ${motion.emphasized}`,
                        "&.Mui-expanded": { boxShadow: shadow.sm },
                    },
                },
            },

            MuiAccordionSummary: {
                styleOverrides: {
                    root: {
                        minHeight: 52,
                        transition: `background-color ${motion.duration.fast}ms ${motion.standard}`,
                        "&:hover": { backgroundColor: neutral[50] },
                    },
                    expandIconWrapper: {
                        transition: `transform ${motion.duration.normal}ms ${motion.emphasized}`,
                    },
                },
            },

            // --- Dialogs ---------------------------------------------------
            MuiDialog: {
                defaultProps: {
                    scroll: "paper",
                },
                styleOverrides: {
                    paper: {
                        borderRadius: radius.xl,
                        boxShadow: shadow.xl,
                        backgroundImage: "none",
                        // Never let a dialog exceed the viewport on a phone.
                        maxHeight: "calc(100% - 32px)",
                    },
                    paperFullScreen: {
                        borderRadius: 0,
                        maxHeight: "100%",
                    },
                },
            },

            MuiDialogTitle: {
                styleOverrides: {
                    root: {
                        fontSize: "1.0625rem",
                        fontWeight: 650,
                        letterSpacing: "-0.01em",
                        padding: "20px 24px 12px",
                    },
                },
            },

            MuiDialogContent: {
                styleOverrides: {
                    root: {
                        padding: "8px 24px 20px",
                    },
                    dividers: {
                        borderColor: neutral[200],
                        padding: "20px 24px",
                    },
                },
            },

            MuiDialogActions: {
                styleOverrides: {
                    root: {
                        padding: "12px 24px 20px",
                        gap: 8,
                        "& > :not(style) ~ :not(style)": { marginLeft: 0 },
                    },
                },
            },

            MuiBackdrop: {
                styleOverrides: {
                    root: {
                        backgroundColor: "rgba(20, 24, 31, 0.45)",
                        backdropFilter: "blur(3px)",
                    },
                    invisible: {
                        backgroundColor: "transparent",
                        backdropFilter: "none",
                    },
                },
            },

            // --- Inputs ----------------------------------------------------
            MuiTextField: {
                defaultProps: { size: "small", variant: "outlined" },
            },

            MuiOutlinedInput: {
                styleOverrides: {
                    root: {
                        borderRadius: radius.md,
                        backgroundColor: neutral[0],
                        transition: `box-shadow ${motion.duration.fast}ms ${motion.standard}, background-color ${motion.duration.fast}ms ${motion.standard}`,
                        "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: neutral[300],
                            transition: `border-color ${motion.duration.fast}ms ${motion.standard}`,
                        },
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: neutral[400],
                        },
                        "&.Mui-focused": {
                            boxShadow: shadow.focus,
                            "& .MuiOutlinedInput-notchedOutline": {
                                borderColor: brand[500],
                                borderWidth: 1,
                            },
                        },
                        "&.Mui-disabled": {
                            backgroundColor: neutral[50],
                        },
                    },
                    input: {
                        // 16px on mobile stops iOS Safari zooming the viewport
                        // when a field takes focus.
                        "@media (max-width: 899.95px)": { fontSize: "16px" },
                    },
                    inputSizeSmall: { padding: "10px 12px" },
                },
            },

            MuiFilledInput: {
                styleOverrides: {
                    root: {
                        borderRadius: radius.md,
                        backgroundColor: neutral[100],
                        "&:before, &:after": { display: "none" },
                        "&:hover": { backgroundColor: neutral[200] },
                        "&.Mui-focused": {
                            backgroundColor: neutral[100],
                            boxShadow: shadow.focus,
                        },
                    },
                },
            },

            MuiInputLabel: {
                styleOverrides: {
                    root: {
                        fontSize: "0.875rem",
                        "&.Mui-focused": { color: brand[600] },
                    },
                },
            },

            MuiFormHelperText: {
                styleOverrides: {
                    root: { marginLeft: 2, fontSize: "0.75rem" },
                },
            },

            MuiSelect: {
                defaultProps: { size: "small" },
                styleOverrides: {
                    icon: {
                        transition: `transform ${motion.duration.normal}ms ${motion.emphasized}`,
                    },
                },
            },

            MuiCheckbox: {
                styleOverrides: {
                    root: {
                        borderRadius: radius.xs,
                        transition: `transform ${motion.duration.fast}ms ${motion.spring}, color ${motion.duration.fast}ms ${motion.standard}`,
                        "&:active": { transform: "scale(0.88)" },
                    },
                },
            },

            MuiRadio: {
                styleOverrides: {
                    root: {
                        transition: `transform ${motion.duration.fast}ms ${motion.spring}`,
                        "&:active": { transform: "scale(0.88)" },
                    },
                },
            },

            MuiSwitch: {
                styleOverrides: {
                    root: {
                        width: 42,
                        height: 24,
                        padding: 0,
                        overflow: "visible",
                    },
                    switchBase: {
                        padding: 2,
                        transition: `transform ${motion.duration.normal}ms ${motion.emphasized}`,
                        "&.Mui-checked": {
                            transform: "translateX(18px)",
                            color: "#FFFFFF",
                            "& + .MuiSwitch-track": {
                                backgroundColor: brand[500],
                                opacity: 1,
                            },
                        },
                    },
                    thumb: {
                        width: 20,
                        height: 20,
                        boxShadow: shadow.sm,
                    },
                    track: {
                        borderRadius: radius.pill,
                        backgroundColor: neutral[300],
                        opacity: 1,
                        transition: `background-color ${motion.duration.normal}ms ${motion.standard}`,
                    },
                },
            },

            MuiSlider: {
                styleOverrides: {
                    thumb: {
                        transition: `box-shadow ${motion.duration.fast}ms ${motion.standard}, transform ${motion.duration.fast}ms ${motion.spring}`,
                        "&:hover, &.Mui-focusVisible": {
                            boxShadow: `0 0 0 8px ${brand[50]}`,
                        },
                        "&.Mui-active": { transform: "scale(1.15)" },
                    },
                },
            },

            MuiAutocomplete: {
                styleOverrides: {
                    paper: {
                        borderRadius: radius.lg,
                        boxShadow: shadow.lg,
                        border: `1px solid ${neutral[200]}`,
                        marginTop: 6,
                    },
                    option: {
                        borderRadius: radius.sm,
                        margin: "2px 6px",
                        transition: `background-color ${motion.duration.instant}ms ${motion.standard}`,
                        '&[aria-selected="true"]': {
                            backgroundColor: `${brand[50]} !important`,
                        },
                    },
                },
            },

            // --- Navigation / overlays -------------------------------------
            MuiMenu: {
                styleOverrides: {
                    paper: {
                        borderRadius: radius.lg,
                        boxShadow: shadow.lg,
                        border: `1px solid ${neutral[200]}`,
                        marginTop: 6,
                        minWidth: 180,
                    },
                    list: { padding: 6 },
                },
            },

            MuiMenuItem: {
                styleOverrides: {
                    root: {
                        borderRadius: radius.sm,
                        minHeight: 40,
                        fontSize: "0.875rem",
                        transition: `background-color ${motion.duration.instant}ms ${motion.standard}, color ${motion.duration.instant}ms ${motion.standard}`,
                        "&:hover": { backgroundColor: neutral[100] },
                        "&.Mui-selected": {
                            backgroundColor: brand[50],
                            color: brand[700],
                            "&:hover": { backgroundColor: brand[100] },
                        },
                    },
                },
            },

            MuiListItemButton: {
                styleOverrides: {
                    root: {
                        borderRadius: radius.md,
                        transition: `background-color ${motion.duration.fast}ms ${motion.standard}, color ${motion.duration.fast}ms ${motion.standard}`,
                        "&.Mui-selected": {
                            backgroundColor: brand[50],
                            color: brand[700],
                            "&:hover": { backgroundColor: brand[100] },
                            "& .MuiListItemIcon-root": { color: brand[600] },
                        },
                    },
                },
            },

            MuiListItemIcon: {
                styleOverrides: {
                    root: { minWidth: 36, color: neutral[500] },
                },
            },

            MuiDrawer: {
                styleOverrides: {
                    paper: {
                        backgroundColor: neutral[0],
                        borderRight: `1px solid ${neutral[200]}`,
                        backgroundImage: "none",
                    },
                },
            },

            MuiAppBar: {
                defaultProps: { elevation: 0, color: "inherit" },
                styleOverrides: {
                    root: {
                        backgroundColor: "rgba(255, 255, 255, 0.82)",
                        backdropFilter: "blur(12px) saturate(180%)",
                        WebkitBackdropFilter: "blur(12px) saturate(180%)",
                        borderBottom: `1px solid ${neutral[200]}`,
                        color: neutral[900],
                    },
                },
            },

            MuiTabs: {
                styleOverrides: {
                    root: { minHeight: 44 },
                    indicator: {
                        height: 2.5,
                        borderRadius: radius.pill,
                        backgroundColor: brand[500],
                        transition: `all ${motion.duration.normal}ms ${motion.emphasized}`,
                    },
                    scrollButtons: {
                        "&.Mui-disabled": { opacity: 0.25 },
                    },
                },
            },

            MuiTab: {
                styleOverrides: {
                    root: {
                        minHeight: 44,
                        textTransform: "none",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        color: neutral[600],
                        transition: `color ${motion.duration.fast}ms ${motion.standard}`,
                        "&:hover": { color: neutral[900] },
                        "&.Mui-selected": { color: brand[600] },
                    },
                },
            },

            MuiTooltip: {
                defaultProps: {
                    arrow: true,
                    enterDelay: 400,
                    enterNextDelay: 200,
                },
                styleOverrides: {
                    tooltip: {
                        backgroundColor: neutral[900],
                        color: neutral[0],
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        borderRadius: radius.sm,
                        padding: "6px 10px",
                        boxShadow: shadow.md,
                    },
                    arrow: { color: neutral[900] },
                },
            },

            // --- Data display ----------------------------------------------
            MuiChip: {
                styleOverrides: {
                    root: {
                        borderRadius: radius.pill,
                        fontWeight: 600,
                        fontSize: "0.75rem",
                        height: 26,
                        transition: `background-color ${motion.duration.fast}ms ${motion.standard}, transform ${motion.duration.fast}ms ${motion.spring}, box-shadow ${motion.duration.fast}ms ${motion.standard}`,
                    },
                    clickable: {
                        "&:active": { transform: "scale(0.95)" },
                    },
                    sizeSmall: { height: 22, fontSize: "0.6875rem" },
                    outlined: { borderColor: neutral[300] },
                    deleteIcon: {
                        transition: `opacity ${motion.duration.fast}ms ${motion.standard}`,
                        opacity: 0.6,
                        "&:hover": { opacity: 1 },
                    },
                },
            },

            MuiAvatar: {
                styleOverrides: {
                    root: {
                        fontSize: "0.8125rem",
                        fontWeight: 650,
                        backgroundColor: brand[50],
                        color: brand[700],
                    },
                },
            },

            MuiBadge: {
                styleOverrides: {
                    badge: {
                        fontWeight: 700,
                        fontSize: "0.6875rem",
                        minWidth: 18,
                        height: 18,
                    },
                },
            },

            MuiDivider: {
                styleOverrides: {
                    root: { borderColor: neutral[200] },
                },
            },

            MuiTableHead: {
                styleOverrides: {
                    root: {
                        "& .MuiTableCell-head": {
                            backgroundColor: neutral[50],
                            color: neutral[600],
                            fontWeight: 650,
                            fontSize: "0.75rem",
                            letterSpacing: "0.02em",
                            textTransform: "uppercase",
                            borderBottom: `1px solid ${neutral[200]}`,
                            whiteSpace: "nowrap",
                        },
                    },
                },
            },

            MuiTableCell: {
                styleOverrides: {
                    root: {
                        borderBottom: `1px solid ${neutral[200]}`,
                        fontSize: "0.875rem",
                        padding: "12px 16px",
                    },
                },
            },

            MuiTableRow: {
                styleOverrides: {
                    root: {
                        transition: `background-color ${motion.duration.fast}ms ${motion.standard}`,
                        "&:last-child .MuiTableCell-root": { borderBottom: 0 },
                    },
                    hover: {
                        "&:hover": { backgroundColor: `${neutral[50]} !important` },
                    },
                },
            },

            MuiDataGrid: {
                styleOverrides: {
                    root: {
                        border: `1px solid ${neutral[200]}`,
                        borderRadius: radius.lg,
                        backgroundColor: neutral[0],
                        "--DataGrid-rowBorderColor": neutral[200],
                        "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within":
                            { outline: "none" },
                        "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within":
                            { outline: "none" },
                    },
                    columnHeaders: {
                        backgroundColor: neutral[50],
                        borderBottom: `1px solid ${neutral[200]}`,
                    },
                    columnHeader: {
                        backgroundColor: neutral[50],
                    },
                    columnHeaderTitle: {
                        fontWeight: 650,
                        fontSize: "0.75rem",
                        letterSpacing: "0.02em",
                        textTransform: "uppercase",
                        color: neutral[600],
                    },
                    row: {
                        transition: `background-color ${motion.duration.fast}ms ${motion.standard}`,
                        "&:hover": { backgroundColor: neutral[50] },
                        "&.Mui-selected": {
                            backgroundColor: brand[50],
                            "&:hover": { backgroundColor: brand[100] },
                        },
                    },
                    cell: {
                        borderBottom: `1px solid ${neutral[200]}`,
                        fontSize: "0.875rem",
                    },
                    footerContainer: {
                        borderTop: `1px solid ${neutral[200]}`,
                        minHeight: 48,
                    },
                    overlay: { backgroundColor: "rgba(255,255,255,0.7)" },
                },
            },

            MuiLinearProgress: {
                styleOverrides: {
                    root: {
                        height: 3,
                        borderRadius: radius.pill,
                        backgroundColor: brand[100],
                    },
                    bar: {
                        backgroundColor: brand[500],
                        borderRadius: radius.pill,
                    },
                },
            },

            MuiCircularProgress: {
                styleOverrides: {
                    circle: { strokeLinecap: "round" },
                },
            },

            MuiSkeleton: {
                defaultProps: { animation: "wave" },
                styleOverrides: {
                    root: {
                        backgroundColor: neutral[100],
                        borderRadius: radius.sm,
                    },
                },
            },

            MuiAlert: {
                styleOverrides: {
                    root: {
                        borderRadius: radius.md,
                        fontSize: "0.875rem",
                        alignItems: "center",
                        boxShadow: shadow.md,
                    },
                    standardSuccess: {
                        backgroundColor: success.light,
                        color: success.dark,
                    },
                    standardError: {
                        backgroundColor: danger.light,
                        color: danger.dark,
                    },
                    standardWarning: {
                        backgroundColor: warning.light,
                        color: warning.dark,
                    },
                    standardInfo: {
                        backgroundColor: info.light,
                        color: info.dark,
                    },
                },
            },

            MuiSnackbar: {
                styleOverrides: {
                    root: {
                        "@media (max-width: 599.95px)": {
                            // Clear the iOS home indicator.
                            bottom: "calc(16px + env(safe-area-inset-bottom))",
                        },
                    },
                },
            },

            MuiPopover: {
                styleOverrides: {
                    paper: {
                        borderRadius: radius.lg,
                        boxShadow: shadow.lg,
                        border: `1px solid ${neutral[200]}`,
                    },
                },
            },

            MuiTouchRipple: {
                styleOverrides: {
                    child: { backgroundColor: "currentColor" },
                },
            },

            MuiLink: {
                defaultProps: { underline: "hover" },
                styleOverrides: {
                    root: {
                        color: brand[600],
                        fontWeight: 500,
                        transition: `color ${motion.duration.fast}ms ${motion.standard}`,
                        "&:hover": { color: brand[700] },
                    },
                },
            },
        },
    });
};

export { brand, neutral, shadow, motion, radius };
export default theme;
