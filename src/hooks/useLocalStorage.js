import { createStorageHook } from "./useStorageBase";

// localStorage-backed state hook (API mirrors useState)
export const useLocalStorage = createStorageHook(
    typeof window !== "undefined" ? window.localStorage : undefined
);

export default useLocalStorage;
