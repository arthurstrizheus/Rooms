import axios from "axios";
import { handleApiResponseError, showError, showSuccess } from "../ApiFunctions";

export async function PostGroup(data) {
    try {
        const resp = await axios.post('/api/groups',data);
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError) {
            showError(errorCheck.message);
            return null;  
        }
        showSuccess('Group created');
        return resp.data;
    } catch (err) {
        // Handle errors such as network issues
        const errorMessage = err.response ? err.response.statusText : "Network Error: Unable to reach the server.";
        showError(errorMessage);
        return null;
    }
}

export async function DeleteGroup(id) {
    try {
        const resp = await axios.delete(`/api/groups/${id}`);
        
        if (resp.status === 204 || resp.status === 200) {
            showSuccess('Group deleted');
            return true; // Indicate success
        }
        
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError) {
            showError(errorCheck.message);
            return false;
        }
        showSuccess('Group deleted');
        return true;
    } catch (err) {
        const errorMessage = err.response ? err.response.statusText : "Network Error: Unable to reach the server.";
        showError(errorMessage);
        return false;
    }
}