import axios from "axios";
import { openSnackbar } from "../../Utilites/SnackbarContext";

export function handleApiResponseError(response) {
    if (!response) {
        // No response, likely a network error
        return {
            isError: true,
            message:
                "No response from the server. Please check your connection.",
        };
    }

    if (response.status >= 200 && response.status < 300) {
        // Success status codes
        return { isError: false, message: "" };
    }
    // Handle specific status codes
    switch (response.status) {
        case 404:
            return { isError: true, message: "Not Found: No data available." };
        case 500:
            return {
                isError: true,
                message: "Server Error: Please try again later.",
            };
        case 409:
            return {
                isError: true,
                message: response.response.data.message,
            };
        default:
            return {
                isError: true,
                message:
                    response.response.data.message ||
                    `Unexpected Error: ${
                        response.statusText || "An error occurred."
                    }`,
            };
    }
}
export function showError(msg) {
    openSnackbar(msg, {
        severity: "error",
        autoHideDuration: 4000,
        anchorOrigin: { vertical: "top", horizontal: "center" },
        alertProps: { variant: "filled" },
        transition: "grow", // Just pass the string 'grow', 'slide', 'fade', 'zoom', etc.
    });
}
export function showSuccess(msg) {
    openSnackbar(msg, {
        severity: "success",
        autoHideDuration: 3000,
        anchorOrigin: { vertical: "top", horizontal: "center" },
        alertProps: { variant: "filled" },
        transition: "grow", // Just pass the string 'grow', 'slide', 'fade', 'zoom', etc.
    });
}
export function showWarning(msg) {
    openSnackbar(msg, {
        severity: "warning",
        autoHideDuration: 4000,
        anchorOrigin: { vertical: "top", horizontal: "center" },
        alertProps: { variant: "filled" },
        transition: "grow", // Just pass the string 'grow', 'slide', 'fade', 'zoom', etc.
    });
}

// ------------------ GETTING DATA --------------------
export async function GetLocations() {
    try {
        const resp = await axios.get(
            `/api/locations?_=${new Date().getTime()}`,
            {
                headers: {
                    "Cache-Control": "no-cache", // Prevent caching
                    Pragma: "no-cache",
                    Expires: "0",
                },
            }
        );
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return [];
        }
        return resp.data;
    } catch (err) {
        console.log(err);
        // Handle errors such as network issues
        return [];
    }
}

export async function GetCheckoutApprovals() {
    try {
        const token = localStorage.getItem("authToken");
        const resp = await axios.get(`/api/checkouts/pending-approvals`, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Cache-Control": "no-cache",
                Pragma: "no-cache",
                Expires: "0",
            },
        });
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return [];
        }
        return resp.data;
    } catch (err) {
        console.log(err);
        return [];
    }
}

export async function GetUsers() {
    try {
        const resp = await axios.get(`/api/users?_=${new Date().getTime()}`, {
            headers: {
                "Cache-Control": "no-cache", // Prevent caching
                Pragma: "no-cache",
                Expires: "0",
            },
        });
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return [];
        }
        return resp.data;
    } catch (err) {
        // Handle errors such as network issues
        return [];
    }
}
export async function RunMatterManagerMonthlyGroupReport() {
    try {
        console.log("Running report");
        const resp = await axios.get(`/api/mattermanager/full`, {
            headers: {
                "Cache-Control": "no-cache", // Prevent caching
                Pragma: "no-cache",
                Expires: "0",
            },
        });
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return [];
        }
        showSuccess("Monthly Report Ran Successfully!");
    } catch (err) {
        // Handle errors such as network issues
        return [];
    }
}

// ------------------ CALENDAR (.ICS) --------------------

/**
 * Downloads a reservation as an .ics file so it can be added to Outlook,
 * Google Calendar, Apple Calendar, etc. Cancelled reservations come back as a
 * cancellation, which removes the event from the calendar instead.
 *
 * @param {string|number} checkoutId - Checkout id, or a recurring occurrence id ("12_3")
 * @returns {Promise<boolean>} true when the file was downloaded
 */
export async function DownloadCheckoutIcs(checkoutId) {
    if (checkoutId === null || checkoutId === undefined) {
        showError("Reservation not found");
        return false;
    }

    try {
        const token = localStorage.getItem("authToken");
        const resp = await axios.get(
            `/api/calendar/checkout/${encodeURIComponent(checkoutId)}.ics`,
            {
                headers: { Authorization: `Bearer ${token}` },
                responseType: "blob",
            }
        );

        const url = URL.createObjectURL(
            new Blob([resp.data], { type: "text/calendar;charset=utf-8" })
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = "equipment-reservation.ics";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return true;
    } catch (err) {
        console.log(err);
        showError("Failed to download calendar file");
        return false;
    }
}

// ------------------ EQUIPMENT ALERTS --------------------

/**
 * Get current user's alert subscriptions
 */
export async function GetMyAlerts() {
    try {
        const token = localStorage.getItem("authToken");
        const resp = await axios.get(`/api/equipment-alerts/my-alerts`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return [];
        }
        return resp.data;
    } catch (err) {
        console.log(err);
        showError("Failed to fetch alerts");
        return [];
    }
}

/**
 * Get alerts for a specific equipment
 */
export async function GetAlertsByEquipment(equipmentId) {
    try {
        const token = localStorage.getItem("authToken");
        const resp = await axios.get(
            `/api/equipment-alerts/equipment/${equipmentId}`,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return [];
        }
        return resp.data;
    } catch (err) {
        console.log(err);
        showError("Failed to fetch equipment alerts");
        return [];
    }
}

/**
 * Subscribe to equipment alert
 */
export async function SubscribeToAlert(
    equipmentId,
    alertType,
    notificationDaysBefore = 7
) {
    try {
        const token = localStorage.getItem("authToken");
        const resp = await axios.post(
            `/api/equipment-alerts/subscribe`,
            {
                equipment_id: equipmentId,
                alert_type: alertType,
                notification_days_before: notificationDaysBefore,
            },
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return null;
        }
        showSuccess(`Subscribed to ${alertType.replace(/_/g, " ")} alerts`);
        return resp.data;
    } catch (err) {
        console.log(err);
        showError("Failed to subscribe to alert");
        return null;
    }
}

/**
 * Unsubscribe from alert
 */
export async function UnsubscribeFromAlert(alertId) {
    try {
        const token = localStorage.getItem("authToken");
        const resp = await axios.patch(
            `/api/equipment-alerts/unsubscribe/${alertId}`,
            {},
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return false;
        }
        showSuccess("Unsubscribed from alert");
        return true;
    } catch (err) {
        console.log(err);
        showError("Failed to unsubscribe from alert");
        return false;
    }
}

/**
 * Delete alert subscription
 */
export async function DeleteAlert(alertId) {
    try {
        const token = localStorage.getItem("authToken");
        const resp = await axios.delete(`/api/equipment-alerts/${alertId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return false;
        }
        showSuccess("Alert deleted");
        return true;
    } catch (err) {
        console.log(err);
        showError("Failed to delete alert");
        return false;
    }
}

/**
 * Update alert settings
 */
export async function UpdateAlert(alertId, enabled, notificationDaysBefore) {
    try {
        const token = localStorage.getItem("authToken");
        const resp = await axios.patch(
            `/api/equipment-alerts/${alertId}`,
            {
                enabled,
                notification_days_before: notificationDaysBefore,
            },
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return null;
        }
        showSuccess("Alert settings updated");
        return resp.data;
    } catch (err) {
        console.log(err);
        showError("Failed to update alert");
        return null;
    }
}

// ------------------ SUPPORT ------------------------
/**
 * Is the help desk integration configured on the server?
 *
 * The support entry points stay hidden when it is not, so nobody is offered a
 * button whose only possible outcome is an error.
 */
export async function GetSupportStatus() {
    try {
        const token = localStorage.getItem("authToken");
        const resp = await axios.get(`/api/support/status`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return Boolean(resp?.data?.enabled);
    } catch (err) {
        // Not reachable means not usable. Fail quiet: this runs on mount and a
        // snackbar about a feature the user hasn't asked for is just noise.
        return false;
    }
}

/**
 * File a help desk ticket.
 *
 * Unlike its neighbours this returns the server's own message instead of
 * swallowing it, because every failure here is one the user needs the specifics
 * of: how long the rate limit has left, or that the help desk itself is down
 * and they should send an email instead.
 *
 * @returns {Promise<{ok: boolean, message: string, ticketId?: number}>}
 */
export async function CreateSupportTicket(payload) {
    try {
        const token = localStorage.getItem("authToken");
        const resp = await axios.post(`/api/support/ticket`, payload, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return {
            ok: true,
            message: resp?.data?.message || "Your request has been sent.",
            ticketId: resp?.data?.ticketId,
        };
    } catch (err) {
        return {
            ok: false,
            message:
                err?.response?.data?.message ||
                "Could not send your request. Please check your connection and try again.",
        };
    }
}

// ------------------ ACTIVE DIRECTORY ------------------------
/**
 * Search Active Directory groups by name.
 *
 * Fails silently on purpose: this runs from a debounced keystroke handler, so a
 * snackbar per failed lookup would bury the screen. The caller shows the empty
 * result as "no groups match" instead.
 *
 * `signal` lets the caller abort a superseded request — the server returns the
 * whole matching set, so a slow early query is pure waste once it is stale.
 *
 * @param {string} search  at least 2 characters; the server returns [] below that
 * @param {{signal?: AbortSignal}} options
 * @returns {Promise<Array<{name: string, dn: string, description: string}>>}
 */
export async function SearchAdGroups(search, { signal } = {}) {
    try {
        const token = localStorage.getItem("authToken");
        const resp = await axios.get(`/api/users/ad/groups`, {
            params: { search },
            headers: { Authorization: `Bearer ${token}` },
            signal,
        });
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError) return { configured: true, groups: [] };

        // The endpoint answers with { configured, groups }; a bare array is
        // accepted too so this keeps working either way.
        //
        // `configured` is passed through rather than discarded: without it, a
        // server with no LDAP set up is indistinguishable from a search that
        // simply matched nothing, and the picker would tell an admin "no
        // groups match" forever while they tried different spellings.
        if (Array.isArray(resp.data)) {
            return { configured: true, groups: resp.data };
        }
        return {
            configured: resp.data?.configured !== false,
            groups: Array.isArray(resp.data?.groups) ? resp.data.groups : [],
        };
    } catch (err) {
        // A failed call is not evidence the directory is unconfigured, so
        // don't claim it is — that would be a misleading message on a blip.
        return { configured: true, groups: [] };
    }
}
