import axios from "axios";
import { handleApiResponseError, showError, showSuccess } from "../ApiFunctions";

export async function PostRoomGroup(data) {
    try {
        console.log('data', data);
        const resp = await axios.post('/api/roomgroups',data);
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

export async function DeleteRoomGroup(id) {
    try {
        const resp = await axios.delete( `/api/roomgroups/${id}`);
        
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

export async function DeleteRoomGroupByRoomId(data) {
    try {
        const resp = await axios.delete( `/api/roomgroups`, {data:data});
        
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