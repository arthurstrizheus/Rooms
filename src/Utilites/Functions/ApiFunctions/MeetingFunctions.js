import axios from "axios";
import {
    handleApiResponseError,
    showError,
    showSuccess,
    showWarning,
} from "../ApiFunctions";

export async function PostMeeting(data) {
    try {
        const resp = await axios
            .post("/api/meetings", data)
            .catch((resp) => resp);
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return null;
        }
        if (resp?.data?.status === "Waiting on Approval") {
            showWarning("Waiting on Approval");
        } else {
            showSuccess("Meeting created");
        }

        return resp.data;
    } catch (err) {
        return null;
    }
}

export async function CheckPostMeeting(userId, data) {
    try {
        const resp = await axios
            .post(`/api/meetings/canbook/${userId}`, data)
            .catch((resp) =>
                resp?.response?.data?.message
                    ? showError(resp?.response?.data.message)
                    : console.log(resp)
            );
        return resp.data;
    } catch (err) {
        return null;
    }
}

export async function DeleteMeeting(data) {
    try {
        const resp = await axios
            .delete(`/api/meetings`, { data: data })
            .catch((resp) =>
                resp?.response?.data?.message
                    ? showError(resp?.response?.data.message)
                    : console.log(resp)
            );

        if (resp.status === 204 || resp.status === 200) {
            showSuccess("Meeting deleted");
            return true; // Indicate success
        }

        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return false;
        }
        showSuccess("Meeting deleted");
        return true;
    } catch (err) {
        return false;
    }
}
export async function DeleteOnlyParentMeeting(data) {
    try {
        const resp = await axios
            .delete(`/api/meetings/onlyparent`, { data: data })
            .catch((resp) =>
                resp?.response?.data?.message
                    ? showError(resp?.response?.data.message)
                    : console.log(resp)
            );

        if (resp.status === 204 || resp.status === 200) {
            showSuccess("Meeting deleted");
            return true; // Indicate success
        }

        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return false;
        }
        showSuccess("Meeting deleted");
        return true;
    } catch (err) {
        return false;
    }
}

export async function UpdateMeeting(id, data) {
    try {
        const resp = await axios
            .put(`/api/meetings/${id}`, data)
            .catch((resp) =>
                resp?.response?.data?.message
                    ? showError(resp?.response?.data.message)
                    : console.log(resp)
            );

        if (resp.status === 204 || resp.status === 200) {
            showSuccess("Meeting updated");
            return resp.data; // Indicate success
        }
        showSuccess("Meeting updated");
        return true;
    } catch (err) {
        return false;
    }
}

export async function UpdateAllNextMeetingsInRecurrence(id, data) {
    try {
        const resp = await axios
            .put(`/api/meetings/updatenext/${id}`, data)
            .catch((resp) =>
                resp?.response?.data?.message
                    ? showError(resp?.response?.data.message)
                    : console.log(resp)
            );

        if (resp.status === 204 || resp.status === 200) {
            showSuccess("Meetings updated");
            return resp.data; // Indicate success
        }

        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return resp.data;
        }
        showSuccess("Meetings updated");
        return true;
    } catch (err) {
        return false;
    }
}

// NOTE: there is no whole-series update call here on purpose. Editing or moving
// a recurrence only ever runs forward from the occurrence you picked, so
// meetings that already happened are never rewritten. The server still has
// PUT /api/meetings/updateall/:userId, but nothing in the app calls it.

export async function CancelFollowingMeetingsInRecurrence(data) {
    try {
        const resp = await axios
            .delete(`/api/meetings/cancelnext`, { data: data })
            .catch((resp) => resp);

        if (resp.status === 204 || resp.status === 200) {
            showSuccess("Recurrence updated");
            return true; // Indicate success
        }

        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return false;
        }
        showSuccess("Recurrence updated");
        return true;
    } catch (err) {
        return false;
    }
}

export async function CancelAllMeetingsInRecurrence(data) {
    try {
        const resp = await axios
            .delete(`/api/meetings/cancelall`, { data: data })
            .catch((resp) => resp);

        if (resp.status === 204 || resp.status === 200) {
            showSuccess("Recurrence updated");
            return true; // Indicate success
        }

        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return false;
        }
        showSuccess("Recurrence updated");
        return true;
    } catch (err) {
        return false;
    }
}

export async function UpdateMeetingStatus(id, data) {
    try {
        const resp = await axios
            .put(`/api/meetings/status/${id}`, data)
            .catch((resp) =>
                resp?.response?.data?.message
                    ? showError(resp?.response?.data.message)
                    : console.log(resp)
            );

        if (resp.status === 204 || resp.status === 200) {
            showSuccess("Meeting Updated");
            return true; // Indicate success
        }

        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            return false;
        }
        return true;
    } catch (err) {
        return false;
    }
}

export async function UpdateParentOnlyMeeting(id, data) {
    try {
        const resp = await axios
            .put(`/api/meetings/parentonly/${id}`, data)
            .catch((err) => showError(err.message));

        if (resp.status === 204 || resp.status === 200) {
            return resp.data; // Indicate success
        }

        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            return showError(errorCheck.message);
        }
        return resp.data;
    } catch (err) {
        return false;
    }
}

export async function UpdateCurrentOnlyMeeting(userId, data) {
    try {
        const resp = await axios
            .put(`/api/meetings/currentonly/${userId}`, data)
            .catch((err) => err);
        if (resp.status === 204 || resp.status === 200) {
            return resp.data; // Indicate success
        }
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck?.message);
            return false;
        }
        return resp.data;
    } catch (err) {
        return false;
    }
}
