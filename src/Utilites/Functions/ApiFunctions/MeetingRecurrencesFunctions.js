import axios from "axios";
import { showError } from "../ApiFunctions";

export async function IsMeetingParentRecurrence(id) {
    try {
        const resp = await axios.get(`/api/recurrences/isparent/${id}`);
        return resp.data;
    } catch (err) {
        // Handle errors such as network issues
        console.log(err);
        const errorMessage = err.response ? err.response.statusText : "Network Error: Unable to reach the server.";
        showError(errorMessage);
        return null;
    }
}