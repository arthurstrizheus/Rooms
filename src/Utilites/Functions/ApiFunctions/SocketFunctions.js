import axios from "axios";
import { handleApiResponseError, showError } from "../ApiFunctions";

export async function GetConnectedUsers() {
    try {
        const resp = await axios
            .get("/api/connected-users")
            .catch((resp) => resp);
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return null;
        }
        return resp.data;
    } catch (err) {
        showError("An unexpected error occurred.", err);
        return null;
    }
}

export async function GetConnectionStatus() {
    try {
        const resp = await axios
            .get("/api/connected-users/stats")
            .catch((resp) => resp);
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return null;
        }
        return resp.data;
    } catch (err) {
        showError("An unexpected error occurred.", err);
        return null;
    }
}

// Force logout a single user
export async function ForceLogoutUser(data) {
    try {
        const resp = await axios
            .post(`/api/connected-users/logout/${data.userId}`, {
                reason: data.reason,
            })
            .catch((resp) => resp);
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return null;
        }
        return resp.data;
    } catch (err) {
        showError("An unexpected error occurred.", err);
        return null;
    }
}
