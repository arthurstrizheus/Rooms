import axios from "axios";
import { handleApiResponseError, showError, showSuccess } from "../ApiFunctions";

export async function PostMeeting(data) {
    try {
        const resp = await axios.post('/api/meetings',data);
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError) {
            showError(errorCheck.message);
            return null;  
        }
        showSuccess('Meeting created');
        return resp.data;
    } catch (err) {
        // Handle errors such as network issues
        const errorMessage = err.response ? err.response.statusText : "Network Error: Unable to reach the server.";
        showError(errorMessage);
        return null;
    }
}

export async function CheckPostMeeting(userId, data) {
    try {
        const resp = await axios.post(`/api/meetings/canbook/${userId}`,data).catch(resp => resp?.response?.data?.message ? showError(resp?.response?.data.message) : console.log(resp));
        return resp.data;
    } catch (err) {
        // Handle errors such as network issues
        const errorMessage = err.response ? err.response.statusText : "Network Error: Unable to reach the server.";
        return null;
    }
}

export async function DeleteMeeting(data) {
    try {
        const resp = await axios.delete(`/api/meetings`, {data:data}).catch(resp => resp?.response?.data?.message ? showError(resp?.response?.data.message) : console.log(resp));
        
        if (resp.status === 204 || resp.status === 200) {
            showSuccess('Meeting deleted');
            return true; // Indicate success
        }
        
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError) {
            showError(errorCheck.message);
            return false;
        }
        showSuccess('Meeting deleted');
        return true;
    } catch (err) {
        const errorMessage = err.response ? err.response.statusText : "Network Error: Unable to reach the server.";
        showError(errorMessage);
        return false;
    }
}
export async function DeleteOnlyParentMeeting(data) {
    try {
        const resp = await axios.delete(`/api/meetings/onlyparent`, {data:data}).catch(resp => resp?.response?.data?.message ? showError(resp?.response?.data.message) : console.log(resp));
        
        if (resp.status === 204 || resp.status === 200) {
            showSuccess('Meeting deleted');
            return true; // Indicate success
        }
        
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError) {
            showError(errorCheck.message);
            return false;
        }
        showSuccess('Meeting deleted');
        return true;
    } catch (err) {
        const errorMessage = err.response ? err.response.statusText : "Network Error: Unable to reach the server.";
        showError(errorMessage);
        return false;
    }
}

export async function UpdateMeeting(id,data) {
    try {
        const resp = await axios.put(`/api/meetings/${id}`, data).catch(resp => resp?.response?.data?.message ? showError(resp?.response?.data.message) : console.log(resp));
        
        if (resp.status === 204 || resp.status === 200) {
            showSuccess('Meeting updated');
            return resp.data; // Indicate success
        }
        showSuccess('Meeting updated');
        return true;
    } catch (err) {
        return false;
    }
}

export async function UpdateAllNextMeetingsInRecurrence(id,data) {
    try {
        const resp = await axios.put(`/api/meetings/updatenext/${id}`, data).catch(resp => resp?.response?.data?.message ? showError(resp?.response?.data.message) : console.log(resp));
        
        if (resp.status === 204 || resp.status === 200) {
            showSuccess('Meetings updated');
            return resp.data; // Indicate success
        }
        
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError) {
            showError(errorCheck.message);
            return resp.data;
        }
        showSuccess('Meetings updated');
        return true;
    } catch (err) {
        return false;
    }
}

export async function UpdateAllMeetingsInRecurrence(id,data) {
    try {
        const resp = await axios.put(`/api/meetings/updateall/${id}`, data).catch(resp => resp?.response?.data?.message ? showError(resp?.response?.data.message) : console.log(resp));
        
        if (resp.status === 204 || resp.status === 200) {
            showSuccess('Meetings updated');
            return resp.data; // Indicate success
        }
        
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError) {
            showError(errorCheck.message);
            return false;
        }
        showSuccess('Meetings updated');
        return resp.data;
    } catch (err) {
        return false;
    }
}

export async function CancelFollowingMeetingsInRecurrence(data) {
    try {
        const resp = await axios.delete(`/api/meetings/cancelnext`, {data:data});
        
        if (resp.status === 204 || resp.status === 200) {
            showSuccess('Recurrence updated');
            return true; // Indicate success
        }
        
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError) {
            showError(errorCheck.message);
            return false;
        }
        showSuccess('Recurrence updated');
        return true;
    } catch (err) {
        const errorMessage = err.response ? err.response.statusText : "Network Error: Unable to reach the server.";
        showError(errorMessage);
        return false;
    }
}

export async function CancelAllMeetingsInRecurrence(data) {
    try {
        const resp = await axios.delete(`/api/meetings/cancelall`, {data:data});
        
        if (resp.status === 204 || resp.status === 200) {
            showSuccess('Recurrence updated');
            return true; // Indicate success
        }
        
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError) {
            showError(errorCheck.message);
            return false;
        }
        showSuccess('Recurrence updated');
        return true;
    } catch (err) {
        const errorMessage = err.response ? err.response.statusText : "Network Error: Unable to reach the server.";
        showError(errorMessage);
        return false;
    }
}


export async function UpdateMeetingStatus(id,data) {
    try {
        const resp = await axios.put(`/api/meetings/status/${id}`, data);
        
        if (resp.status === 204 || resp.status === 200) {
            return true; // Indicate success
        }
        
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError) {
            return false;
        }
        return true;
    } catch (err) {
        const errorMessage = err.response ? err.response.statusText : "Network Error: Unable to reach the server.";
        return false;
    }
}

export async function UpdateParentOnlyMeeting(id,data) {
    try {
        const resp = await axios.put(`/api/meetings/parentonly/${id}`, data).catch(err => showError(err.message));
        
        if (resp.status === 204 || resp.status === 200) {
            return resp.data; // Indicate success
        }
        
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError) {
            return showError(errorCheck.me);
        }
        return resp.data;
    } catch (err) {
        const errorMessage = err.response ? err.response.statusText : "Network Error: Unable to reach the server.";
        return false;
    }
}