import axios from "axios";
import {
  handleApiResponseError,
  showError,
  showSuccess,
} from "../ApiFunctions";

export async function PostRoomGroup(data) {
  try {
    const resp = await axios.post(
      process.env.REACT_APP_API + "/roomgroups",
      data
    );
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

export async function DeleteRoomGroup(id) {
  try {
    const resp = await axios.delete(
      process.env.REACT_APP_API + `/roomgroups/${id}`
    );

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

export async function DeleteRoomGroupByRoomId(data) {
  try {
    const resp = await axios.delete(process.env.REACT_APP_API + `/roomgroups`, {
      data: data,
    });

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
