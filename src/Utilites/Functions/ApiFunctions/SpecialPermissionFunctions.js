import axios from "axios";
import { handleApiResponseError, showError } from "../ApiFunctions";

export async function PostSpecialPermission(data) {
    try {
        const resp = await axios.post('/api/specialpermissions',data);
        
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
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return false;
        }
        
        return true;
    } catch (err) {
        return false;
    }
}