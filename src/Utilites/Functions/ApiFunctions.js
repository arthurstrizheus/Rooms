import axios from "axios";
import { openSnackbar } from "../../Utilites/SnackbarContext";

export function handleApiResponseError(response) {
    if (!response) {
        // No response, likely a network error
        return { isError: true, message: "No response from the server. Please check your connection." };
    }

    if (response.status >= 200 && response.status < 300) {
        // Success status codes
        return { isError: false, message: "" };
    }

    // Handle specific status codes
    switch (response.status) {
        case 404:
            return { isError: true, message: "Not Found: No data available." };
        case 500:
            return { isError: true, message: "Server Error: Please try again later." };
        default:
            return { isError: true, message: `Unexpected Error: ${response.statusText || 'An error occurred.'}` };
    }
}

export function showError(msg) {
    openSnackbar(msg, {
        severity: 'error',
        autoHideDuration: 4000,
        anchorOrigin: { vertical: 'top', horizontal: 'center' },
        alertProps: { variant: 'filled' },
        transition: 'grow', // Just pass the string 'grow', 'slide', 'fade', 'zoom', etc.
    });
}
export function showSuccess(msg) {
    openSnackbar(msg, {
        severity: 'success',
        autoHideDuration: 3000,
        anchorOrigin: { vertical: 'top', horizontal: 'center' },
        alertProps: { variant: 'filled' },
        transition: 'grow', // Just pass the string 'grow', 'slide', 'fade', 'zoom', etc.
    });
}

export async function GetLocations() {
    try {
        const resp = await axios.get('/api/locations', {
            headers: {
                'Cache-Control': 'no-cache', // Prevent caching
                Pragma: 'no-cache',
                Expires: '0',
            },
        });
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return [];
        }
        return resp.data;
    } catch (err) {
        console.log(err);
        // Handle errors such as network issues
        return [];
    }
}
export async function GetRooms(userId) {
    try {
        const resp = await axios.get( `/api/rooms/${userId}`, {
            headers: {
                'Cache-Control': 'no-cache', // Prevent caching
                Pragma: 'no-cache',
                Expires: '0',
            },
        });
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return [];
        }
        return resp.data;
    } catch (err) {
        // Handle errors such as network issues
        return [];
    }
}
export async function GetBlockedDatess() {
    try {
        const resp = await axios.get( '/api/blockeddates', {
            headers: {
                'Cache-Control': 'no-cache', // Prevent caching
                Pragma: 'no-cache',
                Expires: '0',
            },
        });
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return [];
        }
        return resp.data;
    } catch (err) {
        // Handle errors such as network issues
        return [];
    }
}
export async function GetGroups() {
    try {
        const resp = await axios.get( '/api/groups', {
            headers: {
                'Cache-Control': 'no-cache', // Prevent caching
                Pragma: 'no-cache',
                Expires: '0',
            },
        });
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return [];
        }
        return resp.data;
    } catch (err) {
        // Handle errors such as network issues
        return [];
    }
}
export async function GetGroupUsers() {
    try {
        const resp = await axios.get( '/api/groupusers', {
            headers: {
                'Cache-Control': 'no-cache', // Prevent caching
                Pragma: 'no-cache',
                Expires: '0',
            },
        });
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return [];
        }
        return resp.data;
    } catch (err) {
        // Handle errors such as network issues
        return [];
    }
}
export async function GetUserGroups(id) {
    try {
        const resp = await axios.get( `/api/groups/user/${id}`, {
            headers: {
                'Cache-Control': 'no-cache', // Prevent caching
                Pragma: 'no-cache',
                Expires: '0',
            },
        });
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            return [];
        }
        return resp.data;
    } catch {
        return [];
    }
}
export async function GetMeetingGroups() {
    try {
        const resp = await axios.get( '/api/meetinggroups', {
            headers: {
                'Cache-Control': 'no-cache', // Prevent caching
                Pragma: 'no-cache',
                Expires: '0',
            },
        });
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return [];
        }
        return resp.data;
    } catch (err) {
        // Handle errors such as network issues
        return [];
    }
}
export async function GetMeetings() {
    try {
        const resp = await axios.get( '/api/meetings', {
            headers: {
                'Cache-Control': 'no-cache', // Prevent caching
                Pragma: 'no-cache',
                Expires: '0',
            },
        });
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return [];
        }
        return resp.data;
    } catch (err) {
        // Handle errors such as network issues
        return [];
    }
}
export async function GetMeetingApprovals(id) {
    try {
        const resp = await axios.get( `/api/meetings/needsapproved/${id}`, {
            headers: {
                'Cache-Control': 'no-cache', // Prevent caching
                Pragma: 'no-cache',
                Expires: '0',
            },
        });
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return [];
        }
        return resp.data;
    } catch (err) {
        // Handle errors such as network issues
        return [];
    }
}
export async function GetMeetingsByUserId(id, data) {
    try {
        const resp = await axios.get( `/api/meetings/user/${id}`,{params: {...data}}, {
            headers: {
                'Cache-Control': 'no-cache', // Prevent caching
                Pragma: 'no-cache',
                Expires: '0',
            },
        });
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return [];
        }
        return resp.data;
    } catch (err) {
        // Handle errors such as network issues
        return [];
    }
}
export async function GetMeetingsUserCreated(id, data) {
    try {
        const resp = await axios.get( `/api/meetings/created/${id}`, {params: {...data}}, {
            headers: {
                'Cache-Control': 'no-cache', // Prevent caching
                Pragma: 'no-cache',
                Expires: '0',
            },
        });
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            return [];
        }
        return resp.data;
    } catch (err) {
        // Handle errors such as network issues
        showError(errorMessage);
        return [];
    }
}
export async function GetResources() {
    try {
        const resp = await axios.get( '/api/resources', {
            headers: {
                'Cache-Control': 'no-cache', // Prevent caching
                Pragma: 'no-cache',
                Expires: '0',
            },
        });
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return [];
        }
        return resp.data;
    } catch (err) {
        // Handle errors such as network issues
        return [];
    }
}
export async function GetRoomGroups() {
    try {
        const resp = await axios.get( '/api/roomgroups', {
            headers: {
                'Cache-Control': 'no-cache', // Prevent caching
                Pragma: 'no-cache',
                Expires: '0',
            },
        });
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return [];
        }
        return resp.data;
    } catch (err) {
        // Handle errors such as network issues
        return [];
    }
}
export async function GetRoomResources() {
    try {
        const resp = await axios.get( '/api/roomresources', {
            headers: {
                'Cache-Control': 'no-cache', // Prevent caching
                Pragma: 'no-cache',
                Expires: '0',
            },
        });
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return [];
        }
        return resp.data;
    } catch (err) {
        // Handle errors such as network issues
        return [];
    }
}
export async function GetTypes() {
    try {
        const resp = await axios.get('/api/types', {
            headers: {
                'Cache-Control': 'no-cache', // Prevent caching
                Pragma: 'no-cache',
                Expires: '0',
            },
        });
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return [];
        }
        return resp.data;
    } catch (err) {
        // Handle errors such as network issues
        return [];
    }
}
export async function GetUsers() {
    try {
        const resp = await axios.get( '/api/users', {
            headers: {
                'Cache-Control': 'no-cache', // Prevent caching
                Pragma: 'no-cache',
                Expires: '0',
            },
        });
        const errorCheck = handleApiResponseError(resp);
        if (errorCheck.isError && errorCheck?.message) {
            showError(errorCheck.message);
            return [];
        }
        return resp.data;
    } catch (err) {
        // Handle errors such as network issues
        return [];
    }
}


// ------------------ FILTERING DATA --------------------
export function UserAnyAccessRooms(GroupUsers, Groups, RoomGroups, Rooms, user){
    const usersGroups = UsersGroups(GroupUsers, Groups, user); // Only the user groups the user is in
    const roomGroups = RoomGroups.filter(rg => rg.group_id === usersGroups?.find(ug => ug.id == rg.group_id)?.id); // only the room groups the users is in
    const rooms  = Rooms.filter(rm => rm.id === roomGroups?.find(rg => rg.room_id == rm.id)?.room_id);
    return rooms;    
}
export function UserFullAccessRooms(GroupUsers, Groups, RoomGroups, Rooms, user){
    const usersGroups =  UsersFullAccessGroups(GroupUsers, Groups, user); // Only the user groups the user is in3
    const roomGroups = RoomGroups.filter(rg => rg.group_id === usersGroups?.find(ug => ug.id == rg.group_id)?.id); // only the room groups the users is in
    const rooms  = Rooms.filter(rm => rm.id === roomGroups?.find(rg => rg.room_id == rm.id)?.room_id);
    return rooms;
}
export function UserReadAccessRooms(GroupUsers, Groups, RoomGroups, Rooms, user){
    const usersGroups = UsersReadAccessGroups(GroupUsers, Groups, user); // Only the user groups the user is in
    const roomGroups = RoomGroups.filter(rg => rg.group_id === usersGroups?.find(ug => ug.id == rg.group_id)?.id); // only the room groups the users is in
    const rooms  = Rooms.filter(rm => rm.id === roomGroups?.find(rg => rg.room_id == rm.id)?.room_id);
}
export function UsersGroups(GroupUsers, Groups, user){
    const usersGroups = GroupUsers.filter(gp => gp.user_id === user?.id); // Only the user groups the user is in
    const groups = Groups.filter(gp => gp.id === usersGroups?.find(ug => ug.group_id === gp.id)?.group_id);// Only the groups the user is in
    return groups;
}
export function UsersFullAccessGroups(GroupUsers, Groups, user){
    const usersGroups = GroupUsers.filter(gp => gp.user_id === user?.id); // Only the user groups the user is in
    const groups = Groups.filter(gp => gp.id === usersGroups?.find(ug => ug.group_id === gp.id)?.group_id).filter(gp => gp.access === 'Full');// Only the groups the user is in
    return groups;
}
export function UsersReadAccessGroups(GroupUsers, Groups, user){
    const usersGroups = GroupUsers.filter(gp => gp.user_id === user?.id); // Only the user groups the user is in
    const groups = Groups.filter(gp => gp.id === usersGroups?.find(ug => ug.group_id === gp.id)?.group_id).filter(gp => gp.access === 'Read');// Only the groups the user is in
    return groups;
}