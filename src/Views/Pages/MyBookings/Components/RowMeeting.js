/**
 * Expanded booking detail — the panel that opens under a row on My Bookings.
 *
 * Concourse §3.9: two `Facts` groups under `blockLabel` headers, in a 2-up grid
 * that collapses to one column at 860px. Every label and every value producer
 * is byte-identical to what this file rendered before; only the container
 * changed. Lookups that miss render no row at all — never an em dash.
 */

import { Box } from "@mui/material";
import { type as ccType } from "../../../../Utilites/concourse";
import {
    Block,
    Facts,
    Fact,
    PHONE,
    Tag,
} from "../../../Components/Concourse/ConcourseDialogKit";
import StatusPill from "./StatusPill";

/** The exact option object this panel has always used. Do not change it. */
const longDateTime = (value) =>
    new Date(value).toLocaleDateString("en-US", {
        hour: "numeric",
        minute: "numeric",
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
    });

const columnSx = { display: "grid", gap: "8px", minWidth: 0 };
const headingSx = { ...ccType.blockLabel, color: "var(--cc-mute)" };

const RowMeeting = ({ meeting, location, room, type, row }) => (
    <Box
        // Real data: `Type.color` from GetTypes. Used only as an accent dot on
        // the Type tag — never as a text background, which had no contrast
        // control at all in the previous design.
        style={{ "--cc-c": type?.color || "var(--cc-red)" }}
        sx={{
            padding: "12px 14px 14px",
            boxSizing: "border-box",
            display: "grid",
            gap: "12px",
            gridTemplateColumns: "1fr 1fr",
            "@media (max-width:860px)": { gridTemplateColumns: "1fr" },
            [PHONE]: { gridTemplateColumns: "1fr", padding: "8px 0 2px" },
        }}
    >
        <Box sx={columnSx}>
            <Box sx={headingSx}>Booking</Box>
            <Facts>
                {meeting?.organizer ? (
                    <Fact label="Organizer">{meeting.organizer}</Fact>
                ) : null}
                {location?.Alias ? (
                    <Fact label="Location">{location.Alias}</Fact>
                ) : null}
                {room?.value ? <Fact label="Room">{room.value}</Fact> : null}
                {type?.value ? (
                    <Fact label="Type">
                        <Tag sx={{ background: "var(--cc-srf)" }}>
                            <Box
                                component="span"
                                aria-hidden="true"
                                sx={{
                                    width: "8px",
                                    height: "8px",
                                    borderRadius: "99px",
                                    background: "var(--cc-c)",
                                    flex: "none",
                                }}
                            />
                            {type.value}
                        </Tag>
                    </Fact>
                ) : null}
                {meeting?.status ? (
                    <Fact label="Status">
                        <StatusPill status={meeting.status} onRecessed />
                    </Fact>
                ) : null}
            </Facts>
        </Box>

        <Box sx={columnSx}>
            <Box sx={headingSx}>Details</Box>
            <Facts>
                <Fact label="Start Time" mono>
                    {longDateTime(meeting?.start_time)}
                </Fact>
                <Fact label="End Time" mono>
                    {longDateTime(meeting?.end_time)}
                </Fact>
                <Fact label="Duration" mono>
                    {row?.duration}
                </Fact>
                <Fact label="Created" mono>
                    {longDateTime(meeting?.createdAt)}
                </Fact>
                <Fact label="Repeats">
                    {meeting?.repeats ? meeting?.repeats : "No"}
                </Fact>
                {meeting?.UpdatedUser ? (
                    <Fact label="Updated User">
                        {`${meeting.UpdatedUser.first_name} ${meeting.UpdatedUser.last_name}`}
                    </Fact>
                ) : null}
            </Facts>
        </Box>

        {meeting?.description ? (
            <Box sx={{ gridColumn: "1 / -1", minWidth: 0 }}>
                <Block label="Description">{meeting.description}</Block>
            </Box>
        ) : null}
    </Box>
);

export default RowMeeting;
