import {
    cc,
    CcButton,
    DialogBody,
    DialogFooter,
    DialogHeader,
    DialogSurface,
    Fact,
    Facts,
    fmt12,
    ScopeList,
    ScopeOption,
    Spacer,
    TYPE_FALLBACK,
} from "../../Components/Concourse/ConcourseDialogKit";
import { Box } from "@mui/material";

const LONG_DATE = {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
};
const SHORT_DATE = { weekday: "short", month: "short", day: "numeric" };

const MeetingUpdateWarning = ({
    selectedEvent,
    room,
    location,
    color,
    handleExit,
}) => {
    if (!selectedEvent) {
        return <></>;
    }

    const handleUpdate = (mode) => {
        handleExit(true, mode);
    };

    const props = selectedEvent.extendedProps || {};
    const repeats = props.repeats;
    const newStart = selectedEvent.start;
    const newEnd = selectedEvent.end;
    // extendedProps carries the meeting exactly as the API returned it, so it
    // still holds the times the meeting had before it was dragged.
    const oldStart = props.start_time ? new Date(props.start_time) : null;
    const oldEnd = props.end_time ? new Date(props.end_time) : null;

    const span = (start, end) => {
        if (!start) return "—";
        const day = new Date(start).toLocaleDateString("en-US", SHORT_DATE);
        if (!end) return `${day} · ${fmt12(start)}`;
        return `${day} · ${fmt12(start)} – ${fmt12(end)}`;
    };

    const movedDay = newStart
        ? new Date(newStart).toLocaleDateString("en-US", SHORT_DATE)
        : "this day";

    return (
        <DialogSurface accent={color || TYPE_FALLBACK}>
            <DialogHeader
                badge={
                    repeats
                        ? `Dragged · repeats ${String(repeats).toLowerCase()}`
                        : "Dragged"
                }
                title="Move which meetings?"
                sub={[
                    props.name,
                    newStart
                        ? new Date(newStart).toLocaleDateString(
                              "en-US",
                              LONG_DATE
                          )
                        : null,
                    location && room ? `SEA ${location} / ${room}` : null,
                ]
                    .filter(Boolean)
                    .join(" · ")}
                onClose={() => handleExit(false)}
            />
            <DialogBody>
                <Facts>
                    <Fact label="Was" mono>
                        {span(oldStart, oldEnd)}
                    </Fact>
                    <Fact label="Moves to" mono strong>
                        {span(newStart, newEnd)}
                    </Fact>
                </Facts>
                <ScopeList>
                    <ScopeOption
                        glyph="1"
                        title="Move this one"
                        desc={`Only ${movedDay} moves. The rest of the series stays where it is.`}
                        onClick={() => handleUpdate("current")}
                    />
                    <ScopeOption
                        glyph="→"
                        title="Move this and all following"
                        desc={`${movedDay} and every later meeting in the series move.`}
                        onClick={() => handleUpdate("next")}
                    />
                    <ScopeOption
                        glyph="↻"
                        title="Move the whole series"
                        desc="Every meeting in the series moves, including the ones already past."
                        onClick={() => handleUpdate("all")}
                    />
                </ScopeList>
                <Box sx={{ fontSize: "11.5px", color: cc.mute }}>
                    Closing this puts the meeting back where it was.
                </Box>
            </DialogBody>
            <DialogFooter>
                <Spacer />
                <CcButton onClick={() => handleExit(false)}>
                    Put it back
                </CcButton>
            </DialogFooter>
        </DialogSurface>
    );
};

export default MeetingUpdateWarning;
