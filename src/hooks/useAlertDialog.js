import { useState, useCallback } from "react";

/**
 * Custom hook for using AlertDialog
 * Provides a simple interface similar to alert() but with a custom dialog
 *
 * @returns {Object} { showAlert, AlertDialogComponent }
 *
 * Usage:
 * const { showAlert, AlertDialogComponent } = useAlertDialog();
 *
 * // In your JSX:
 * <AlertDialogComponent />
 *
 * // To show an alert:
 * showAlert("Your message here", "error");
 * showAlert("Success message", "success", "Done!");
 */
const useAlertDialog = () => {
    const [alertState, setAlertState] = useState({
        open: false,
        message: "",
        title: "",
        severity: "info",
        confirmText: "OK",
    });

    const showAlert = useCallback(
        (message, severity = "info", title = "", confirmText = "OK") => {
            setAlertState({
                open: true,
                message,
                title,
                severity,
                confirmText,
            });
        },
        []
    );

    const hideAlert = useCallback(() => {
        setAlertState((prev) => ({ ...prev, open: false }));
    }, []);

    return {
        showAlert,
        hideAlert,
        alertState,
        setAlertOpen: (open) => setAlertState((prev) => ({ ...prev, open })),
    };
};

export default useAlertDialog;
