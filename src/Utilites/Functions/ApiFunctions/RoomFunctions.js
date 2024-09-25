import axios from "axios";
import { handleApiResponseError, showError, showSuccess } from "../ApiFunctions";

export async function PostRoom(data) {
    try {
        const resp = await axios.post('/api/rooms',data);
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError) {
            showError(errorCheck.message);
            return null;  
        }
        showSuccess('Room created');
        return resp.data;
    } catch (err) {
        // Handle errors such as network issues
        const errorMessage = err.response ? err.response.statusText : "Network Error: Unable to reach the server.";
        showError(errorMessage);
        return null;
    }
}

export async function UpdateRoom(id, data) {
    try {
        const resp = await axios.put( `/api/rooms/${id}`, data);
        
        if (resp.status === 204 || resp.status === 200) {
            showSuccess('Room updated');
            return true; // Indicate success
        }
        
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError) {
            showError(errorCheck.message);
            return false;
        }
        showSuccess('Room updated');
        return true;
    } catch (err) {
        const errorMessage = err.response ? err.response.statusText : "Network Error: Unable to reach the server.";
        showError(errorMessage);
        return false;
    }
}

export async function DeleteRoom(id) {
    try {
        const resp = await axios.delete( `/api/rooms/${id}`);
        
        if (resp.status === 204 || resp.status === 200) {
            showSuccess('Room deleted');
            return true; // Indicate success
        }
        
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError) {
            showError(errorCheck.message);
            return false;
        }
        showSuccess('Room deleted');
        return true;
    } catch (err) {
        const errorMessage = err.response ? err.response.statusText : "Network Error: Unable to reach the server.";
        showError(errorMessage);
        return false;
    }
}