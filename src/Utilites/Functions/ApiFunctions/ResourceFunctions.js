import axios from "axios";
import { handleApiResponseError, showError } from "../ApiFunctions";

export async function PostResource(resource) {
    try {
        const resp = await axios.post('/api/resources',resource);
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

export async function DeleteResource(resource_id) {
    try {
        const resp = await axios.delete( `/api/resources/${resource_id}`);
        
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

export async function PostRoomResource(resource) {
    try {
        const resp = await axios.post('/api/roomresources',resource);
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

export async function GetRoomResources(roomId) {
    try {
        const resp = await axios.get( `/api/roomresources/${roomId}`);
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

export async function DeleteRoomResource(resource_id) {
    try {
        const resp = await axios.delete( `/api/roomresources/${resource_id}`);
        
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