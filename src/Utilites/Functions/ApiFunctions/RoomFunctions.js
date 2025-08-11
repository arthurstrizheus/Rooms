import axios from "axios";
import {
    handleApiResponseError,
    showError,
    showSuccess,
} from "../ApiFunctions";

export async function PostRoom(data) {
    try {
        const resp = await axios
            .post("/api/rooms", data, {
                headers: {
                    "Content-Type": "multipart/form-data", // Ensure correct header for file uploads
                },
            })
            .catch((resp) => resp);
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return null;
        }
        showSuccess("Room created");
        return resp.data;
    } catch (err) {
        showError("Failed to create room");
        return null;
    }
}

export async function UpdateRoom(id, data) {
    try {
        const resp = await axios
            .put(`/api/rooms/${id}`, data, {
                headers: {
                    "Content-Type": "multipart/form-data", // Ensure correct header for file uploads
                },
            })
            .catch((resp) => resp);

        if (resp.status === 204 || resp.status === 200) {
            showSuccess("Room updated");
            return true; // Indicate success
        }

        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return false;
        }
        showSuccess("Room updated");
        return true;
    } catch (err) {
        showError("Failed to update room");
        return false;
    }
}

export async function DeleteRoom(id) {
    try {
        const resp = await axios
            .delete(`/api/rooms/${id}`)
            .catch((resp) => resp);

        if (resp.status === 204 || resp.status === 200) {
            showSuccess("Room deleted");
            return true; // Indicate success
        }

        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return false;
        }
        showSuccess("Room deleted");
        return true;
    } catch (err) {
        return false;
    }
}

export async function GetRoomImage(filename) {
    try {
        const resp = await axios.get(`/api/rooms/image/${filename}`, {
            responseType: "blob", // Ensure the response is treated as a binary file
        });

        if (resp.status === 200) {
            return URL.createObjectURL(resp.data); // Create a URL for the image blob
        }

        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return null;
        }
        return null;
    } catch (err) {
        return null;
    }
}
