import { useState } from "react";
import { Button, CircularProgress, Tooltip } from "@mui/material";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import {
    DownloadCheckoutIcs,
    showSuccess,
} from "../Utilites/Functions/ApiFunctions";

/**
 * Downloads a reservation as an .ics file the user can open to add it to their
 * calendar. Cancelled reservations download a cancellation instead, which
 * removes the event from the calendar.
 *
 * @param {object} checkout - Checkout being displayed (needs at least an id)
 */
const AddToCalendarButton = ({ checkout, ...buttonProps }) => {
    const [downloading, setDownloading] = useState(false);

    const checkoutId = checkout?.id;
    if (checkoutId === null || checkoutId === undefined) return null;

    const isCancelled = checkout?.status === "cancelled";
    const label = isCancelled ? "Remove from Calendar" : "Add to Calendar";
    const tooltip = isCancelled
        ? "Download a cancellation to remove this reservation from your calendar"
        : "Download this reservation and add it to Outlook, Google or Apple Calendar";

    const handleDownload = async () => {
        if (downloading) return;

        setDownloading(true);
        const success = await DownloadCheckoutIcs(checkoutId);
        if (success) {
            showSuccess(
                isCancelled
                    ? "Calendar file downloaded — open it to remove the reservation"
                    : "Calendar file downloaded — open it to add the reservation",
            );
        }
        setDownloading(false);
    };

    // Tooltip wraps the Button directly (rather than a span) so the button
    // stays the flex item and lines up with sibling action buttons
    return (
        <Tooltip title={tooltip}>
            <Button
                variant="outlined"
                onClick={handleDownload}
                startIcon={
                    downloading ? (
                        <CircularProgress size={16} />
                    ) : isCancelled ? (
                        <EventBusyIcon />
                    ) : (
                        <EventAvailableIcon />
                    )
                }
                {...buttonProps}
            >
                {label}
            </Button>
        </Tooltip>
    );
};

export default AddToCalendarButton;
