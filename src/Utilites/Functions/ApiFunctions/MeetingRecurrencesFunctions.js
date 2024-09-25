import axios from "axios";
import { showError } from "../ApiFunctions";

export async function IsMeetingParentRecurrence(id) {
    try {
        const resp = await axios.get( `/api/recurrences/isparent/${id}`);
        return resp.data;
    } catch (err) {
        return null;
    }
}