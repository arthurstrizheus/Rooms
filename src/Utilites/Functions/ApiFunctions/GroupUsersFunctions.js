import axios from "axios";
import { handleApiResponseError, showError } from "../ApiFunctions";

export async function PostGroupUser(data) {
  try {
    const resp = await axios.post(
      process.env.REACT_APP_API + "/groupusers",
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

export async function DeleteGroupUser(id) {
  try {
    const resp = await axios.delete(
      process.env.REACT_APP_API + `/groupusers/${id}`
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

export async function DeleteGroupUserById(data) {
  try {
    const resp = await axios.delete(process.env.REACT_APP_API + `/groupusers`, {
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
