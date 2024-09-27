import axios from "axios";

export async function IsMeetingParentRecurrence(id) {
    try {
        const resp = await axios.get( `/api/recurrences/isparent/${id}`, {
            headers: {
                'Cache-Control': 'no-cache', // Prevent caching
                Pragma: 'no-cache',
                Expires: '0',
            },
        });
        return resp.data;
    } catch (err) {
        return null;
    }
}