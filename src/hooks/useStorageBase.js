// A small internal helper to create storage-backed state hooks
import { useEffect, useRef, useState } from "react";

function getInitial(initialValue) {
    return typeof initialValue === "function" ? initialValue() : initialValue;
}

export function createStorageHook(storage) {
    return function useStorage(key, initialValue) {
        const read = () => {
            try {
                const raw = storage?.getItem?.(key);
                return raw !== null && raw !== undefined
                    ? JSON.parse(raw)
                    : getInitial(initialValue);
            } catch {
                return getInitial(initialValue);
            }
        };

        const [value, setValue] = useState(read);
        const mounted = useRef(false);

        // Persist when local state changes
        useEffect(() => {
            if (!mounted.current) {
                mounted.current = true;
                return;
            }
            try {
                if (value === undefined) {
                    storage?.removeItem?.(key);
                } else {
                    storage?.setItem?.(key, JSON.stringify(value));
                }
                // best-effort notify within tab
                try {
                    const newValue =
                        value === undefined ? null : JSON.stringify(value);
                    window.dispatchEvent(
                        new StorageEvent("storage", { key, newValue })
                    );
                } catch {}
            } catch {}
        }, [key, value]);

        // Sync across tabs/windows
        useEffect(() => {
            const onStorage = (e) => {
                if (e.key !== key) return;
                try {
                    setValue(e.newValue ? JSON.parse(e.newValue) : undefined);
                } catch {}
            };
            window.addEventListener("storage", onStorage);
            return () => window.removeEventListener("storage", onStorage);
        }, [key]);

        return [value, setValue];
    };
}

export default createStorageHook;
