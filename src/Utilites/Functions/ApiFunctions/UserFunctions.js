import axios from "axios";
import {
    handleApiResponseError,
    showError,
    showSuccess,
} from "../ApiFunctions";

export async function PostUser(data) {
    try {
        const resp = await axios.post("/api/users", data);
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
        const resp = await axios
            .delete(`/api/users/${id}`)
            .catch((resp) => resp);

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
        const resp = await axios
            .put(`/api/users/${id}`, data)
            .catch((resp) => resp);

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
        const resp = await axios.put(`/api/users/details/${id}`, data);

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
        const resp = await axios.put(`/api/users/password/${id}`, data);

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
        const resp = await axios.post("/api/users/login", data).catch((err) => {
            console.log(err);
            showError(err.response.data.message);
            return null;
        });
        return resp?.data;
    } catch (err) {
        return null;
    }
}

export async function AuthenticateUserAD(data) {
    try {
        console.log("🔐 Making AD authentication request");
        const resp = await axios.post("/api/users/loginAd", data);
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return null;
        }

        console.log("✅ AD authentication successful:", resp.data);

        // Return both user data and token
        return {
            user: resp.data.user,
            token: resp.data.token,
        };
    } catch (err) {
        console.error("Authentication error:", err);
        return null;
    }
}

export async function UserExistsInAD(data) {
    try {
        console.log("🔍 Checking if user exists in AD");
        const resp = await axios.post("/api/users/adhasuser", data);
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return false;
        }

        console.log("✅ AD user check result:", resp.data.exists);
        return resp.data.exists;
    } catch (err) {
        console.error("AD user check error:", err);
        return false;
    }
}

export async function AuthenticatePassword(data) {
    try {
        const resp = await axios.post("/api/users/login", data).catch((err) => {
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
        const resp = await axios
            .put(`/api/users/activate/${data}`)
            .catch((resp) => resp);
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
        const resp = await axios
            .put(`/api/users/deactivate/${data}`)
            .catch((resp) => resp);
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
