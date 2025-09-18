import { createStorageHook } from "./useStorageBase";

// sessionStorage-backed state hook (API mirrors useState)
export const useSessionStorage = createStorageHook(
    typeof window !== "undefined" ? window.sessionStorage : undefined
);

export default useSessionStorage;
