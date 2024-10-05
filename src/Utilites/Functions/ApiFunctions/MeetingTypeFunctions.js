import axios from "axios";
import {
  handleApiResponseError,
  showError,
  showSuccess,
} from "../ApiFunctions";

export async function PostMeetingType(data) {
  try {
    const resp = await axios.post(process.env.REACT_APP_API + "/types", data);
    const errorCheck = handleApiResponseError(resp);
    if (errorCheck.isError && errorCheck?.message) {
      showError(errorCheck.message);
      return null;
    }
    showSuccess("Type created");
    return resp.data;
  } catch (err) {
    return null;
  }
}

export async function DeleteMeetingType(id) {
  try {
    const resp = await axios.delete(process.env.REACT_APP_API + `/types/${id}`);

    if (resp.status === 204 || resp.status === 200) {
      showSuccess("Type deleted");
      return true; // Indicate success
    }

    const errorCheck = handleApiResponseError(resp);
    if (errorCheck.isError && errorCheck?.message) {
      showError(errorCheck.message);
      return false;
    }
    showSuccess("Type deleted");
    return true;
  } catch (err) {
    return false;
  }
}
