import axios from "axios";
import {
  handleApiResponseError,
  showError,
  showSuccess,
} from "../ApiFunctions";

export async function PostMeeting(data) {
  try {
    const resp = await axios.post(
      process.env.REACT_APP_API + "/meetings",
      data
    );
    const errorCheck = handleApiResponseError(resp);
    if (errorCheck.isError && errorCheck?.message) {
      showError(errorCheck.message);
      return null;
    }
    showSuccess("Meeting created");
    return resp.data;
  } catch (err) {
    return null;
  }
}

export async function CheckPostMeeting(userId, data) {
  try {
    const resp = await axios
      .post(process.env.REACT_APP_API + `/meetings/canbook/${userId}`, data)
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
      .delete(process.env.REACT_APP_API + `/meetings`, { data: data })
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
      .delete(process.env.REACT_APP_API + `/meetings/onlyparent`, {
        data: data,
      })
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
      .put(process.env.REACT_APP_API + `/meetings/${id}`, data)
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
      .put(process.env.REACT_APP_API + `/meetings/updatenext/${id}`, data)
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

export async function UpdateAllMeetingsInRecurrence(id, data) {
  try {
    const resp = await axios
      .put(process.env.REACT_APP_API + `/meetings/updateall/${id}`, data)
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
      return false;
    }
    showSuccess("Meetings updated");
    return resp.data;
  } catch (err) {
    return false;
  }
}

export async function CancelFollowingMeetingsInRecurrence(data) {
  try {
    const resp = await axios.delete(
      process.env.REACT_APP_API + `/meetings/cancelnext`,
      {
        data: data,
      }
    );

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
    const resp = await axios.delete(
      process.env.REACT_APP_API + `/meetings/cancelall`,
      {
        data: data,
      }
    );

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
      .put(process.env.REACT_APP_API + `/meetings/status/${id}`, data)
      .catch((resp) =>
        resp?.response?.data?.message
          ? showError(resp?.response?.data.message)
          : console.log(resp)
      );

    if (resp.status === 204 || resp.status === 200) {
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
      .put(process.env.REACT_APP_API + `/meetings/parentonly/${id}`, data)
      .catch((err) => showError(err.message));

    if (resp.status === 204 || resp.status === 200) {
      return resp.data; // Indicate success
    }

    const errorCheck = handleApiResponseError(resp);
    if (errorCheck.isError && errorCheck?.message) {
      return showError(errorCheck.me);
    }
    return resp.data;
  } catch (err) {
    return false;
  }
}
