import { useState, useCallback } from "react";

/**
 * Custom hook for using ConfirmDialog
 * Provides a simple interface similar to window.confirm() but with a custom dialog
 *
 * @returns {Object} { showConfirm, confirmState, hideConfirm }
 *
 * Usage:
 * const { showConfirm, confirmState, hideConfirm } = useConfirmDialog();
 *
 * // In your JSX:
 * <ConfirmDialog
 *     open={confirmState.open}
 *     onConfirm={confirmState.onConfirm}
 *     onCancel={hideConfirm}
 *     message={confirmState.message}
 *     title={confirmState.title}
 *     severity={confirmState.severity}
 *     confirmText={confirmState.confirmText}
 *     cancelText={confirmState.cancelText}
 * />
 *
 * // To show a confirmation:
 * showConfirm(
 *     "Are you sure?",
 *     () => { console.log("confirmed"); },
 *     "warning"
 * );
 */
const useConfirmDialog = () => {
    const [confirmState, setConfirmState] = useState({
        open: false,
        message: "",
        title: "",
        severity: "question",
        confirmText: "Confirm",
        cancelText: "Cancel",
        onConfirm: () => {},
    });

    const showConfirm = useCallback(
        (
            message,
            onConfirm,
            severity = "question",
            title = "",
            confirmText = "Confirm",
            cancelText = "Cancel"
        ) => {
            setConfirmState({
                open: true,
                message,
                title,
                severity,
                confirmText,
                cancelText,
                onConfirm: () => {
                    onConfirm();
                    hideConfirm();
                },
            });
        },
        []
    );

    const hideConfirm = useCallback(() => {
        setConfirmState((prev) => ({ ...prev, open: false }));
    }, []);

    return {
        showConfirm,
        hideConfirm,
        confirmState,
    };
};

export default useConfirmDialog;
