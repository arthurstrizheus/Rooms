import axios from "axios";
import { handleApiResponseError, showError } from "../ApiFunctions";

export async function PostResource(resource) {
  try {
    const resp = await axios.post(
      process.env.REACT_APP_API + "/resources",
      resource
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

export async function DeleteResource(resource_id) {
  try {
    const resp = await axios.delete(
      process.env.REACT_APP_API + `/resources/${resource_id}`
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

export async function PostRoomResource(resource) {
  try {
    const resp = await axios.post(
      process.env.REACT_APP_API + "/roomresources",
      resource
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

export async function GetRoomResources(roomId) {
  try {
    const resp = await axios.get(
      process.env.REACT_APP_API +
        `/roomresources/${roomId}?_=${new Date().getTime()}`,
      {
        headers: {
          "Cache-Control": "no-cache", // Prevent caching
          Pragma: "no-cache",
          Expires: "0",
        },
      }
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

export async function DeleteRoomResource(resource_id) {
  try {
    const resp = await axios.delete(
      process.env.REACT_APP_API + `/roomresources/${resource_id}`
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
