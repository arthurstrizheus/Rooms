import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Persisted state hook backed by sessionStorage.
 * API mirrors useState: const [value, setValue] = useSessionStorage(key, defaultValue);
 * - Lazy initialize
 * - JSON serialize/deserialize
 * - Safe for SSR (guards window)
 */
export function useSessionStorage(key, defaultValue) {
    const isFirst = useRef(true);
    const [value, setValue] = useState(() => {
        if (typeof window === "undefined")
            return typeof defaultValue === "function"
                ? defaultValue()
                : defaultValue;
        try {
            const raw = window.sessionStorage.getItem(key);
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
                    window.sessionStorage.removeItem(key);
                } else {
                    window.sessionStorage.setItem(
                        key,
                        JSON.stringify(resolved)
                    );
                }
            } catch {
                // silent
            }
        },
        [key, value]
    );

    // Avoid writing initial value twice
    useEffect(() => {
        if (isFirst.current) {
            isFirst.current = false;
            return;
        }
        try {
            if (value === undefined) {
                window.sessionStorage.removeItem(key);
            } else {
                window.sessionStorage.setItem(key, JSON.stringify(value));
            }
        } catch {}
    }, [key, value]);

    return [value, writeStorage];
}

export default useSessionStorage;
