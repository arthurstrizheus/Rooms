import axios from "axios";
import { handleApiResponseError, showError, showSuccess } from "../ApiFunctions";

export async function PostUser(data) {
    try {
        const resp = await axios.post('/api/users',data);
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

export async function DeleteUser(id) {
    try {
        const resp = await axios.delete( `/api/users/${id}`);
        
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

export async function UpdateUser(id, data) {
    try {
        const resp = await axios.put( `/api/users/${id}`, data);
        
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

export async function UpdateUserDetails(id, data) {
    try {
        const resp = await axios.put( `/api/users/details/${id}`, data);
        
        if (resp.status === 204 || resp.status === 200) {
            showSuccess("Details updated");
            return true; // Indicate success
        }
        
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return false;
        }
        showSuccess("Details updated");
        return true;
    } catch (err) {
        return false;
    }
}

export async function UpdateUserPassword(id, data) {
    try {
        const resp = await axios.put( `/api/users/password/${id}`, data);
        
        if (resp.status === 204 || resp.status === 200) {
            showSuccess("Password updated");
            return true; // Indicate success
        }
        
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return false;
        }
        showSuccess("Password updated");
        return true;
    } catch (err) {
        return false;
    }
}

export async function AuthenticateUser(data) {
    try {
        const resp = await axios.post('/api/users/login',data).catch(err => {
            console.log(err);
            showError(err.response.data.message);
            return null;
        });
        return resp?.data;
    } catch (err) {
        return null;
    }
}

export async function AuthenticatePassword(data) {
    try {
        const resp = await axios.post('/api/users/login',data).catch(err => {
            // showError(err.response.data);
            return null;
        });
        return resp?.data;
    } catch (err) {
        return null;
    }
}

export async function ActivateUser(data) {
    try {
        const resp = await axios.put( `/api/users/activate/${data}`);
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

export async function DeactivateUser(data) {
    try {
        const resp = await axios.put( `/api/users/deactivate/${data}`);
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