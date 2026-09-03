/**
 * Reservation status colors for calendar events.
 *
 * FullCalendar needs literal colors rather than theme palette paths, so these
 * mirror the semantic palette in the theme. Shared by the in-app calendar and
 * the embeddable one so an event is the same color in both.
 */
export const CHECKOUT_STATUS_COLORS = {
    "auto-approved": "#1E9E52", // success.main
    pending: "#C77700", // warning.main
    reserved: "#1F6FD0", // info.main
    returned: "#A6ADBA", // grey 400
    cancelled: "#C8102E", // brand red
};

/** Falls back to a neutral grey for statuses we don't have a color for. */
export const checkoutStatusColor = (status) =>
    CHECKOUT_STATUS_COLORS[status] || "#78808F";

export default CHECKOUT_STATUS_COLORS;
