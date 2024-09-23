import { createContext, useState, useCallback } from 'react';
import { Slide, Grow, Fade, Zoom, Snackbar, Alert, Grid } from '@mui/material';

const SnackbarContext = createContext();

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
                    sx={{ width: '100%' }}
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
