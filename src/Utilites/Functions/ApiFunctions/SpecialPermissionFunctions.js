import axios from "axios";
import { handleApiResponseError, showError } from "../ApiFunctions";

export async function PostSpecialPermission(data) {
    try {
        const resp = await axios.post('/api/specialpermissions',data);
        
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

export async function GetSpecialPermissionsForMeeting(meetingId) {
    try {
        const resp = await axios.get( `/api/specialpermissions/meeting/${meetingId}`).catch(() => []);
        return resp.data;
    } catch (err) {
        return [];
    }
}

export async function DeleteSpecialPermission(id) {
    try {
        const resp = await axios.delete( `/api/specialpermissions/${id}`);
        
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

        return false;
    }
}