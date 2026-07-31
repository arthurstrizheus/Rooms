import { Box } from "@mui/material";
import {
    cc,
    Facts,
    Fact,
    Block,
} from "../../../Components/Concourse/ConcourseDialogKit";
import { type as ccType } from "../../../../Utilites/concourse";

const MQ_NARROW = "@media (max-width:620px)";

/**
 * The expanded detail for one queued meeting.
 *
 * Owned exclusively by the Approval Queue (the only import is
 * ApprovalQueue.js). Rendered inside a MUI <Collapse>, so it must never carry a
 * transform or a lift — the Collapse animates its height and any geometry
 * animation here would fight it (guide §5.4).
 *
 * `type.color` is a real fetched value (Type.color, joined in by GetTypes), so
 * it stays as the accent — but as a 3px inset edge rather than a text
 * background: an arbitrary DB hex behind ink text has no contrast guarantee.
 *
 * `sx` is applied last so the caller can re-ground the panel (the phone
 * row-card renders it on `srf` inside an `srf2` card).
 */
const RowMeeting = ({ meeting, location, room, type, row, sx }) => {
    if (!meeting?.id) {
        return null;
    }

    const longDateTime = (value) =>
        new Date(value).toLocaleDateString("en-US", {
            hour: "numeric",
            minute: "numeric",
            weekday: "long",
            month: "short",
            day: "numeric",
            year: "numeric",
        });

    return (
        <Box
            style={{ "--cc-c": type?.color || "var(--cc-red)" }}
            sx={{
                background: cc.srf2,
                boxShadow: `inset 3px 0 0 ${cc.c}`,
                padding: "12px 14px 14px",
                boxSizing: "border-box",
                width: "100%",
                ...sx,
            }}
        >
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                    alignItems: "start",
                    boxSizing: "border-box",
                    [MQ_NARROW]: { gridTemplateColumns: "1fr" },
                }}
            >
                <Box
                    sx={{
                        display: "grid",
                        gap: "8px",
                        minWidth: 0,
                        boxSizing: "border-box",
                    }}
                >
                    <Box
                        sx={{
                            ...ccType.dialogTitle,
                            color: cc.ink,
                            minWidth: 0,
                            wordBreak: "break-word",
                        }}
                    >
                        {meeting?.name}
                    </Box>
                    <Block label="Description">{meeting?.description}</Block>
                    <Facts>
                        <Fact label="Organizer">{meeting?.organizer}</Fact>
                        <Fact label="Location">{location?.Alias}</Fact>
                        <Fact label="Room">{room?.value}</Fact>
                        <Fact label="Type">{type?.value}</Fact>
                        <Fact label="Status">{meeting?.status}</Fact>
                    </Facts>
                </Box>

                <Box
                    sx={{
                        display: "grid",
                        gap: "8px",
                        minWidth: 0,
                        alignContent: "start",
                        boxSizing: "border-box",
                    }}
                >
                    <Box sx={{ ...ccType.blockLabel, color: cc.mute }}>
                        Details
                    </Box>
                    <Facts>
                        <Fact label="Start Time" mono>
                            {longDateTime(meeting.start_time)}
                        </Fact>
                        <Fact label="End Time" mono>
                            {longDateTime(meeting.end_time)}
                        </Fact>
                        <Fact label="Duration" mono>
                            {row?.duration}
                        </Fact>
                        <Fact label="Created" mono>
                            {longDateTime(meeting.createdAt)}
                        </Fact>
                        <Fact label="Repeats">
                            {meeting.repeats ? meeting.repeats : "No"}
                        </Fact>
                    </Facts>
                </Box>
            </Box>
        </Box>
    );
};

export default RowMeeting;
