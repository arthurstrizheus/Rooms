import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Persisted state hook backed by localStorage.
 * API mirrors useState: const [value, setValue] = useLocalStorage(key, defaultValue);
 * - Lazy initialize
 * - JSON serialize/deserialize
 * - Safe for SSR (guards window)
 * - Handles storage events (multi-tab sync)
 */
export function useLocalStorage(key, defaultValue) {
    const isFirst = useRef(true);
    const [value, setValue] = useState(() => {
        if (typeof window === "undefined")
            return typeof defaultValue === "function"
                ? defaultValue()
                : defaultValue;
        try {
            const raw = window.localStorage.getItem(key);
            if (raw === null)
                return typeof defaultValue === "function"
                    ? defaultValue()
                    : defaultValue;
            return JSON.parse(raw);
        } catch {
            return typeof defaultValue === "function"
                ? defaultValue()
                : defaultValue;
        }
    });

    const writeStorage = useCallback(
        (val) => {
            try {
                const resolved = typeof val === "function" ? val(value) : val;
                setValue(resolved);
                if (resolved === undefined) {
                    window.localStorage.removeItem(key);
                } else {
                    window.localStorage.setItem(key, JSON.stringify(resolved));
                }
            } catch {
                // silent
            }
        },
        [key, value]
    );

    // Sync external storage changes (other tabs)
    useEffect(() => {
        const handler = (e) => {
            if (e.key === key) {
                try {
                    const newVal =
                        e.newValue === null
                            ? undefined
                            : JSON.parse(e.newValue);
                    setValue(newVal);
                } catch {}
            }
        };
        window.addEventListener("storage", handler);
        return () => window.removeEventListener("storage", handler);
    }, [key]);

    // Avoid writing initial value twice
    useEffect(() => {
        if (isFirst.current) {
            isFirst.current = false;
            return;
        }
        try {
            if (value === undefined) {
                window.localStorage.removeItem(key);
            } else {
                window.localStorage.setItem(key, JSON.stringify(value));
            }
        } catch {}
    }, [key, value]);

    return [value, writeStorage];
}

export default useLocalStorage;
