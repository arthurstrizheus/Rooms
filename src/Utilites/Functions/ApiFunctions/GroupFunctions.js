import axios from "axios";
import {
  handleApiResponseError,
  showError,
  showSuccess,
} from "../ApiFunctions";

export async function PostGroup(data) {
  try {
    const resp = await axios.post(process.env.REACT_APP_API + "/groups", data);
    const errorCheck = handleApiResponseError(resp);
    if (errorCheck.isError && errorCheck?.message) {
      showError(errorCheck.message);
      return null;
    }
    showSuccess("Group created");
    return resp.data;
  } catch (err) {
    return null;
  }
}

export async function DeleteGroup(id) {
  try {
    const resp = await axios.delete(
      process.env.REACT_APP_API + `/groups/${id}`
    );

    if (resp.status === 204 || resp.status === 200) {
      showSuccess("Group deleted");
      return true; // Indicate success
    }

    const errorCheck = handleApiResponseError(resp);
    if (errorCheck.isError && errorCheck?.message) {
      showError(errorCheck.message);
      return false;
    }
    showSuccess("Group deleted");
    return true;
  } catch (err) {
    return false;
  }
}
