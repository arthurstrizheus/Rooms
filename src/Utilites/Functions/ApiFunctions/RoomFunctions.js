import axios from "axios";
import {
  handleApiResponseError,
  showError,
  showSuccess,
} from "../ApiFunctions";

export async function PostRoom(data) {
  try {
    const resp = await axios.post(process.env.REACT_APP_API + "/rooms", data);
    const errorCheck = handleApiResponseError(resp);
    if (errorCheck.isError && errorCheck?.message) {
      showError(errorCheck.message);
      return null;
    }
    showSuccess("Room created");
    return resp.data;
  } catch (err) {
    return null;
  }
}

export async function UpdateRoom(id, data) {
  try {
    const resp = await axios.put(
      process.env.REACT_APP_API + `/rooms/${id}`,
      data
    );

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
    return false;
  }
}

export async function DeleteRoom(id) {
  try {
    const resp = await axios.delete(process.env.REACT_APP_API + `/rooms/${id}`);

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
