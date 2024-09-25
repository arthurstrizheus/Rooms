import axios from "axios";
import { handleApiResponseError, showError } from "../ApiFunctions";

export async function PostBlockedDate(data) {
    try {
        const resp = await axios.post('/api/blockeddates',data);
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError) {
            showError(errorCheck.message);
            return null;  
        }
        return resp.data;
    } catch (err) {
        // Handle errors such as network issues
        const errorMessage = err.response ? err.response.statusText : "Network Error: Unable to reach the server.";
        showError(errorMessage);
        return null;
    }
}

export async function DeleteBlockedDate(id) {
    try {
        const resp = await axios.delete( `/api/blockeddates/${id}`);
        
        if (resp.status === 204 || resp.status === 200) {
            return true; // Indicate success
        }
        
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError) {
            showError(errorCheck.message);
            return false;
        }
        
        return true;
    } catch (err) {
        const errorMessage = err.response ? err.response.statusText : "Network Error: Unable to reach the server.";
        showError(errorMessage);
        return false;
    }
}