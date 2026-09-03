import React from "react";
import { GetSupportStatus } from "../../../Utilites/Functions/ApiFunctions";
import SupportDialog from "./SupportDialog";

/**
 * One support dialog for the whole app, opened from anywhere.
 *
 * Mounted once in the shell. Any component can call `openSupport()` — the
 * sidebar's account menu for a general request, an equipment page to report a
 * problem with that specific asset — without threading dialog state through
 * pages that have nothing to do with it.
 *
 * `enabled` mirrors whether the server has the help desk configured; entry
 * points read it and render nothing when it's false.
 */
const SupportContext = React.createContext({
    enabled: false,
    openSupport: () => {},
});

export function SupportProvider({ children }) {
    const [enabled, setEnabled] = React.useState(false);
    const [request, setRequest] = React.useState(null);

    React.useEffect(() => {
        let cancelled = false;
        GetSupportStatus().then((value) => {
            if (!cancelled) setEnabled(value);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    /**
     * @param {object} [context]
     * @param {number} [context.equipmentId]   pre-fills the asset on the ticket
     * @param {string} [context.equipmentName] shown to the user for confidence;
     *                                         the server resolves the real name
     *                                         from the id and ignores this
     * @param {string} [context.category]
     */
    const openSupport = React.useCallback((context = {}) => {
        setRequest(context);
    }, []);

    const value = React.useMemo(
        () => ({ enabled, openSupport }),
        [enabled, openSupport],
    );

    return (
        <SupportContext.Provider value={value}>
            {children}
            <SupportDialog
                open={Boolean(request)}
                onClose={() => setRequest(null)}
                equipmentId={request?.equipmentId}
                equipmentName={request?.equipmentName}
                defaultCategory={request?.category}
            />
        </SupportContext.Provider>
    );
}

export function useSupport() {
    return React.useContext(SupportContext);
}

export default SupportContext;
