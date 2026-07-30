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
    if (severity === "info") {
        return {
            ...base,
            backgroundColor: "var(--cc-srf)",
            color: "var(--cc-ink)",
            "& .MuiAlert-icon": { color: "var(--cc-mute)" },
        };
    }
    // error / warning
    return {
        ...base,
        backgroundColor: "var(--cc-wash)",
        color: "var(--cc-red)",
        "& .MuiAlert-icon": { color: "var(--cc-red)" },
    };
};

let showSnackbarExternal;

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
