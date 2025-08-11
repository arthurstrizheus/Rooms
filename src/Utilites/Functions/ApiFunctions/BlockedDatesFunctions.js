import axios from "axios";
import { handleApiResponseError, showError } from "../ApiFunctions";

export async function PostBlockedDate(data) {
    try {
        const resp = await axios
            .post("/api/blockeddates", data)
            .catch((resp) => resp);
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return null;
        }
        return resp.data;
    } catch (err) {
        return null;
    }
}

export async function DeleteBlockedDate(id) {
    try {
        const resp = await axios
            .delete(`/api/blockeddates/${id}`)
            .catch((resp) => resp);

        if (resp.status === 204 || resp.status === 200) {
            return true; // Indicate success
        }

        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return false;
        }

        return true;
    } catch (err) {
        return false;
    }
}
