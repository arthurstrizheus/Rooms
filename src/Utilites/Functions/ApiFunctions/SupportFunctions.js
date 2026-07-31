import axios from "axios";
import {
    handleApiResponseError,
    showError,
    showSuccess,
} from "../ApiFunctions";
import { FORM } from "../../../Views/Components/Clippy/clippyCopy";

/**
 * Files a Clippy support ticket. Emails IT and records any badge the click count
 * earned; nothing else is persisted.
 *
 * Follows this folder's convention exactly (see RoomFunctions.js): never throws,
 * raises its own snackbar, and returns a falsy value on failure. The caller uses
 * that only to decide whether to close the form — the user has already been told
 * what happened either way.
 *
 * Copy is imported from the Clippy module rather than written here so the
 * assistant's voice stays in one file; `clippyCopy` is plain strings with no
 * React in it, so this costs nothing.
 */
export async function PostSupportRequest(data) {
    try {
        const resp = await axios
            .post("/api/support/clippy", data)
            .catch((resp) => resp);

        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError) {
            // The server explains its own refusals (429 throttle, 400 validation)
            // in wording meant for the user, so prefer it over Clippy's line.
            showError(errorCheck.message || FORM.failed);
            return false;
        }

        // The server reports only the badges written just now, so this never
        // congratulates someone on ones they already had. Reaching a high count
        // awards every tier below it too, so this is routinely more than one.
        const earned = resp.data?.newBadges || [];
        showSuccess(
            earned.length === 0
                ? FORM.sent
                : earned.length === 1
                ? `${FORM.sent} You also unlocked "${earned[0].name}".`
                : `${FORM.sent} You also unlocked ${earned.length} badges, up to "${
                      earned[earned.length - 1].name
                  }".`
        );
        return true;
    } catch (err) {
        showError(FORM.failed);
        return false;
    }
}

/**
 * The signed-in user's badge collection — the whole catalogue, each entry
 * flagged earned or not. Scoped to the JWT server-side; there is no id to pass.
 *
 * Returns `null` (not `[]`) when the read fails, so My Account can tell "you
 * have no badges yet" apart from "we could not find out". Silent by design —
 * a joke achievement list failing to load must not throw a red toast over a
 * page the user came to for something else.
 */
export async function GetClippyBadges() {
    try {
        const resp = await axios
            .get(`/api/support/badges?_=${new Date().getTime()}`, {
                headers: {
                    "Cache-Control": "no-cache",
                    Pragma: "no-cache",
                    Expires: "0",
                },
            })
            .catch((resp) => resp);

        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError) return null;
        return resp.data?.catalog || [];
    } catch (err) {
        return null;
    }
}
