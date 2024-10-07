import axios from "axios";
import {
  handleApiResponseError,
  showError,
  showSuccess,
} from "../ApiFunctions";

export async function PostLocation(data) {
  try {
    const resp = await axios.post(
      process.env.REACT_APP_API + "/locations",
      data
    );
    const errorCheck = handleApiResponseError(resp);
    if (errorCheck.isError && errorCheck?.message) {
      showError(errorCheck.message);
      return null;
    }
    showSuccess("Location created");
    return resp.data;
  } catch (err) {
    return null;
  }
}

export async function UpdateLocation(id, data) {
  try {
    const resp = await axios.put(
      process.env.REACT_APP_API + `/locations/${id}`,
      data
    );

    if (resp.status === 204 || resp.status === 200) {
      showSuccess("Location updated");
      return true; // Indicate success
    }

    const errorCheck = handleApiResponseError(resp);
    if (errorCheck.isError && errorCheck?.message) {
      showError(errorCheck.message);
      return false;
    }
    showSuccess("Location updated");
    return true;
  } catch (err) {
    return false;
  }
}

export async function DeleteLocation(id) {
  try {
    const resp = await axios.delete(
      process.env.REACT_APP_API + `/locations/${id}`
    );

    if (resp.status === 204 || resp.status === 200) {
      showSuccess("Location deleted");
      return true; // Indicate success
    }

    const errorCheck = handleApiResponseError(resp);
    if (errorCheck.isError && errorCheck?.message) {
      showError(errorCheck.message);
      return false;
    }
    showSuccess("Location deleted");
    return true;
  } catch (err) {
    return false;
  }
}
