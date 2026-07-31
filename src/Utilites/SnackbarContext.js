import { createContext, useState, useCallback } from 'react';
import { Slide, Grow, Fade, Zoom, Snackbar, Alert, Grid } from '@mui/material';

const SnackbarContext = createContext();

/**
 * ARBITER §10.29 — the snackbar Alert, restyled from Concourse tokens so a
 * conflict raised through `openSnackbar` reads as the same event as the alert
 * block inside a dialog. API and transport are untouched.
 *
 * The Snackbar portals to `document.body`, so the tokens can only reach it via
 * `:root` (App.js mounts `concourseGlobalStyles` there). Nothing here may read
 * a theme object or a page-scoped class. `backgroundImage: none` because MUI's
 * Alert is a Paper and its elevation gradient would muddy `--cc-srf`.
 */
const alertSxFor = (severity) => {
    const base = {
        width: "100%",
        borderRadius: "18px",
        padding: "12px 14px",
        fontSize: "13.5px",
        fontFamily: "var(--cc-sans)",
        boxShadow: "var(--cc-sh2)",
        alignItems: "flex-start",
        backgroundImage: "none",
    };
    if (severity === "success") {
        return {
            ...base,
            backgroundColor: "var(--cc-srf)",
            color: "var(--cc-ink)",
            border: "1px solid var(--cc-line)",
            "& .MuiAlert-icon": { color: "var(--cc-ok)" },
        };
    }
    if (severity === "warning") {
        // Amber, and deliberately shaped like `success` rather than like
        // `error`: the message is `ink`, the ACCENT is carried by the icon and
        // the wash. Measured on --cc-warn-wash — light: ink 15.88:1, icon
        // 3.06:1; dark: ink 13.30:1, icon 8.16:1. No amber that still reads as
        // amber clears 4.5:1 as text here, so amber body text is not an option.
        //
        // Colour is not the only channel and must not be: MUI's default icon
        // mapping gives warning a TRIANGLE (ReportProblemOutlined) against
        // error's circle and success's check, which is what carries the
        // distinction for the residual deuteranope case.
        return {
            ...base,
            backgroundColor: "var(--cc-warn-wash)",
            color: "var(--cc-ink)",
            border: "1px solid var(--cc-line)",
            "& .MuiAlert-icon": { color: "var(--cc-warn)" },
        };
    }
    if (severity === "info") {
        return {
            ...base,
            backgroundColor: "var(--cc-srf)",
            color: "var(--cc-ink)",
            "& .MuiAlert-icon": { color: "var(--cc-mute)" },
        };
    }
    // error
    return {
        ...base,
        backgroundColor: "var(--cc-wash)",
        color: "var(--cc-red)",
        "& .MuiAlert-icon": { color: "var(--cc-red)" },
    };
};

let showSnackbarExternal;

/**
 * How many messages this snackbar has raised, ever. Monotonic, module-scoped.
 *
 * Bulk operations need to answer one question that nothing else can answer:
 * "did the API layer already speak?" The delete helpers in
 * `Functions/ApiFunctions/*` call `showError(...)` themselves when the server
 * explains a refusal (403 office scoping, 409, 500), but they stay completely
 * silent when the request never reached the server — `handleApiResponseError`
 * dereferences `response.response.data` on a network error, throws a
 * TypeError, and the helper's own `catch` swallows it and returns `false`.
 *
 * So `false` from a delete helper means either "the user has already been told"
 * or "nobody told the user anything", and the two are indistinguishable from
 * the return value alone. Sampling this counter around the operation tells them
 * apart, which is what lets a caller guarantee a total failure is never silent
 * WITHOUT overwriting the server's own wording with generic text.
 */
let snackbarSeq = 0;

/** Sample before a bulk operation. Opaque — only compare via `snackbarSpokeSince`. */
export const snackbarMark = () => snackbarSeq;

/** Did any snackbar appear since `mark` was taken? */
export const snackbarSpokeSince = (mark) => snackbarSeq > mark;

const transitionComponents = {
    slide: Slide,
    grow: Grow,
    fade: Fade,
    zoom: Zoom,
};

export const SnackbarProvider = ({ children }) => {
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'info',
        autoHideDuration: 6000,
        anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
        onClose: () => {},
        alertProps: {},
        snackbarProps: {},
    });

    const showSnackbar = useCallback((message, options = {}) => {
        const {
            severity = 'info',
            autoHideDuration = 6000,
            anchorOrigin = { vertical: 'bottom', horizontal: 'center' },
            onClose = () => {},
            alertProps = {},
            snackbarProps = {},
            transition = 'slide', // Default transition
        } = options;

        const TransitionComponent = transitionComponents[transition.toLowerCase()] || Slide;

        snackbarSeq += 1;

        setSnackbar({
            open: true,
            message,
            severity,
            autoHideDuration,
            anchorOrigin,
            onClose,
            alertProps,
            snackbarProps: { ...snackbarProps, TransitionComponent },
        });
    }, []);

    const closeSnackbar = useCallback(() => {
        setSnackbar((prevSnackbar) => ({
            ...prevSnackbar,
            open: false,
        }));
        snackbar.onClose();
    }, [snackbar]);

    showSnackbarExternal = showSnackbar;

    return (
        <SnackbarContext.Provider value={showSnackbar}>
            {children}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={snackbar.autoHideDuration}
                onClose={closeSnackbar}
                anchorOrigin={snackbar.anchorOrigin}
                TransitionComponent={snackbar.snackbarProps.TransitionComponent}
                {...snackbar.snackbarProps}
            >
                <Alert
                    onClose={closeSnackbar}
                    severity={snackbar.severity}
                    sx={alertSxFor(snackbar.severity)}
                    {...snackbar.alertProps}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </SnackbarContext.Provider>
    );
};

// Export the showSnackbar function directly
export const openSnackbar = (message, options) => {
    showSnackbarExternal?.(message, options);
};
