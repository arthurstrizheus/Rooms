import { Box, Dialog } from "@mui/material";
import { useAuth } from "../../../Utilites/AuthContext";
import {
    CancelAllMeetingsInRecurrence,
    CancelFollowingMeetingsInRecurrence,
    UpdateMeetingStatus,
} from "../../../Utilites/Functions/ApiFunctions/MeetingFunctions";
import { useState, useEffect } from "react";
import ImageViewer from "../../../Components/ImageViewer";
import { GetRoomImage } from "../../../Utilites/Functions/ApiFunctions/RoomFunctions";
import {
    AlertBlock,
    Block,
    cc,
    CcButton,
    DialogBody,
    DialogFooter,
    DialogHeader,
    DialogSurface,
    Fact,
    Facts,
    fmt12,
    formatDuration,
    formatRoomMeta,
    HeroTime,
    PersonRow,
    RoomCard,
    ScopeList,
    ScopeOption,
    scopeDialogProps,
    Spacer,
    TYPE_FALLBACK,
} from "../Concourse/ConcourseDialogKit";

const LONG_DATE = {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
};
const SHORT_DATE = { weekday: "short", month: "short", day: "numeric" };
const UPDATED_AT = {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
};

/**
 * A booking that has never been edited must show nothing — "updated by" on an
 * untouched meeting is noise. Sequelize stamps createdAt and updatedAt from the
 * same instant on INSERT, but `Post` follows a recurring booking's insert with
 * a second `update({ recurrence_id })` milliseconds later, so
 * `updatedAt > createdAt` alone would label every new recurring meeting as
 * edited. This tolerance is what separates "saved, then saved again
 * immediately" from a real edit.
 */
const EDIT_TOLERANCE_MS = 5000;

const DisplayMeeting = ({
    meeting,
    types,
    rooms,
    roomResources,
    resources,
    locations,
    handleExit,
    setUpdate,
    setUpdateMode,
    handleUpdateEvent,
}) => {
    const { user } = useAuth();
    const [showWarning, setShowWarning] = useState(false);
    const [showParentWarning, setShowParentWarning] = useState(false);
    // "scope" = which meetings; "split" = where a change to a PAST meeting starts.
    const [scopeStep, setScopeStep] = useState("scope");
    const [roomImage, setRoomImage] = useState(null); // State to hold the room image URL

    useEffect(() => {
        async function fetchRoomImage() {
            if (room?.image_url) {
                try {
                    const image = await GetRoomImage(room.image_url);
                    setRoomImage(image);
                } catch (error) {
                    console.error("Error fetching room image:", error);
                }
            } else {
                setRoomImage(null);
            }
        }
        fetchRoomImage();
    }, [meeting.room]);

    if (!meeting) {
        console.log("No meeting");
        return <></>;
    }
    const start = new Date(meeting?.start_time);
    const end = new Date(meeting?.end_time);
    const color = types?.find((tp) => tp?.id == meeting?.type)?.color;
    const type = types?.find((tp) => tp?.id == meeting?.type)?.value;
    const room = rooms?.find((rm) => rm?.id == meeting?.room);
    const location = locations?.find(
        (lc) => lc?.officeid == meeting?.location
    )?.Alias;

    const getRoomResources = (roomId) => {
        const roomResourceLinks =
            roomResources?.filter((rr) => rr.room_id === roomId) || [];
        return roomResourceLinks
            .map((link) => {
                const resource = resources?.find(
                    (r) => r.id === link.resource_id
                );
                return resource;
            })
            .filter(Boolean); // Remove any undefined resources
    };

    const formatColor = (color) => {
        if (!color) return "#grey";
        // If color doesn't start with #, add it
        if (color.match(/^[0-9A-Fa-f]{6}$/)) {
            return `#${color}`;
        }
        return color;
    };

    const handleEdit = () => {
        if (meeting.recurrence_id) {
            openScope();
        } else {
            setUpdateMode(null);
            handleUpdateEvent();
        }
    };

    const handleDelete = () => {
        if (meeting.recurrence_id) {
            setShowWarning(true);
        } else {
            UpdateMeetingStatus(meeting.id, {
                status: "Canceled",
                userId: user?.id,
                meeting: meeting.id === -1 ? meeting : null,
            }).then(() => {
                setUpdate((prev) => prev + 1);
                handleExit();
            });
            setShowWarning(false);
        }
    };

    const handleCancelAll = () => {
        CancelAllMeetingsInRecurrence({
            recurrence_id: meeting.recurrence_id,
            userId: user?.id,
        }).then(() => {
            setUpdate((prev) => prev + 1);
            handleExit();
        });
        setShowWarning(false);
    };
    const handleCancelAllNext = () => {
        CancelFollowingMeetingsInRecurrence({
            recurrence_id: meeting.recurrence_id,
            userId: user?.id,
            date: meeting.start_time,
        }).then(() => {
            setUpdate((prev) => prev + 1);
            handleExit();
        });
        setShowWarning(false);
    };

    const handleCancelOnlyParent = () => {
        UpdateMeetingStatus(meeting.id, {
            status: "Canceled",
            userId: user?.id,
            meeting: meeting.id === -1 ? meeting : null,
        }).then(() => {
            setUpdate((prev) => prev + 1);
            handleExit();
        });
        setShowWarning(false);
    };

    const openScope = () => {
        setScopeStep("scope");
        setShowParentWarning(true);
    };
    const closeScope = () => {
        setShowParentWarning(false);
        setScopeStep("scope");
    };

    const startEdit = (mode) => {
        setUpdateMode(mode);
        closeScope();
        handleUpdateEvent();
    };

    const handleEditOnlyParent = () => startEdit("current");

    const handleEditFollowing = () => {
        // A past occurrence is the one case where "everything after" is
        // genuinely ambiguous: it can mean "from today", leaving what already
        // happened alone, or "from that day", rewriting it. Ask instead of
        // guessing — the second reading rewrites meetings that already
        // happened, and this file's rule is that reaching backwards is a
        // deliberate act.
        if (isPastOccurrence) {
            setScopeStep("split");
            return;
        }
        startEdit("next");
    };

    /* --------------------------------------------------------- presentation --- */

    const allDay = !!(meeting?.all_day || meeting?.allDay);
    const longDate = isNaN(start.getTime())
        ? ""
        : start.toLocaleDateString("en-US", LONG_DATE);
    const shortDate = isNaN(start.getTime())
        ? "this meeting"
        : start.toLocaleDateString("en-US", SHORT_DATE);
    const repeatWord = meeting?.repeats
        ? String(meeting.repeats).toLowerCase()
        : null;
    const roomResourceList = room ? getRoomResources(room.id) : [];
    const scopeSub = [meeting?.name, longDate].filter(Boolean).join(" · ");

    const todayShort = new Date().toLocaleDateString("en-US", SHORT_DATE);
    // Compared on the calendar DAY, not the instant, and for the same reason
    // the server does: a meeting earlier TODAY is not "already happened" for
    // this purpose — "everything from today" would resolve to that very
    // occurrence, so the two choices below would be one choice wearing two
    // labels. (Not date-fns: the frontend is on v2, where `toDate`/`getTime`
    // silently return NaN for the ISO strings this component is handed.)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const occurrenceDay = new Date(start);
    occurrenceDay.setHours(0, 0, 0, 0);
    const isPastOccurrence =
        !isNaN(start.getTime()) && occurrenceDay < startOfToday;

    // Provenance costs NOTHING to fetch. Every meeting query in
    // meetingControler.js already includes `UpdatedUser` (id, first_name,
    // last_name, email) through the updated_user_id association, and a
    // generated occurrence carries it through `...meeting.toJSON()`. Do NOT add
    // a GetUsers() call to render one name — the calendar page holds no users
    // list, and one would be a whole extra request per page load.
    const updatedAt = meeting?.updatedAt ? new Date(meeting.updatedAt) : null;
    const createdAt = meeting?.createdAt ? new Date(meeting.createdAt) : null;
    const wasEdited =
        !!meeting?.updated_user_id ||
        (!!updatedAt &&
            !!createdAt &&
            !isNaN(updatedAt.getTime()) &&
            !isNaN(createdAt.getTime()) &&
            updatedAt.getTime() - createdAt.getTime() > EDIT_TOLERANCE_MS);
    const updatedByName = meeting?.UpdatedUser
        ? `${meeting.UpdatedUser.first_name || ""} ${
              meeting.UpdatedUser.last_name || ""
          }`.trim()
        : "";
    const updatedWhen =
        updatedAt && !isNaN(updatedAt.getTime())
            ? updatedAt.toLocaleDateString("en-US", UPDATED_AT)
            : "";
    // A generated occurrence has no row of its own: its audit columns are its
    // PARENT's. Say "Series" rather than claim someone edited this one day.
    // `id === -1` is the flag the whole codebase already branches on.
    const isOccurrence = meeting?.id === -1;
    const updatedLabel = updatedByName
        ? isOccurrence
            ? "Series updated by"
            : "Updated by"
        : isOccurrence
        ? "Series updated"
        : "Updated";
    const updatedValue = [updatedByName, updatedWhen].filter(Boolean).join(" · ");

    const roomName = (
        <Box sx={{ display: "flex", alignItems: "center", gap: "7px" }}>
            {room?.color ? (
                <Box
                    aria-hidden="true"
                    sx={{
                        width: "9px",
                        height: "9px",
                        flex: "none",
                        borderRadius: "99px",
                        background: formatColor(room.color),
                    }}
                />
            ) : null}
            <Box
                component="span"
                sx={{
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                }}
            >
                SEA {location} / {room?.value}
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: "flex", flexGrow: 1, minWidth: 0 }}>
            {/* Cancel scope — which meetings in the recurrence get released */}
            <Dialog
                open={showWarning}
                onClose={() => setShowWarning(false)}
                {...scopeDialogProps(480)}
            >
                <DialogSurface accent="var(--cc-red)">
                    <DialogHeader
                        badge={repeatWord ? `↻ Repeats ${repeatWord}` : null}
                        title="Cancel which meetings?"
                        sub={scopeSub}
                        onClose={() => setShowWarning(false)}
                    />
                    <DialogBody>
                        <AlertBlock
                            title="This releases the room"
                            body="Cancelled meetings leave the calendar and the room opens for anyone to take. The record of who cancelled stays."
                        />
                        <ScopeList>
                            <ScopeOption
                                glyph="1"
                                title="Just this one"
                                desc={`Only ${shortDate} is cancelled. The rest of the series stays booked.`}
                                onClick={handleCancelOnlyParent}
                            />
                            <ScopeOption
                                glyph="→"
                                title="This one and everything after"
                                desc={`${shortDate} and every later meeting in the series are cancelled.`}
                                onClick={handleCancelAllNext}
                            />
                            <ScopeOption
                                glyph="↻"
                                title="The whole series"
                                desc="Every meeting in the series is cancelled, past ones included."
                                onClick={handleCancelAll}
                            />
                        </ScopeList>
                    </DialogBody>
                    <DialogFooter>
                        <Spacer />
                        <CcButton onClick={() => setShowWarning(false)}>
                            Keep the meeting
                        </CcButton>
                    </DialogFooter>
                </DialogSurface>
            </Dialog>

            {/* Edit scope — which meetings in the recurrence the form will change */}
            <Dialog
                open={showParentWarning}
                onClose={closeScope}
                {...scopeDialogProps(480)}
            >
                <DialogSurface accent={color || TYPE_FALLBACK}>
                    <DialogHeader
                        badge={repeatWord ? `↻ Repeats ${repeatWord}` : null}
                        title={
                            scopeStep === "split"
                                ? "This meeting has already happened"
                                : "Change which meetings?"
                        }
                        sub={scopeSub}
                        onClose={closeScope}
                    />
                    <DialogBody>
                        {scopeStep === "split" ? (
                            <AlertBlock
                                key="past-alert"
                                title={`${shortDate} is in the past`}
                                body="Pick where the change starts. Nothing before that point is touched."
                            />
                        ) : null}
                        {/* DialogBody keys its stagger wrappers by the child's
                            own key and falls back to the child's INDEX, so
                            swapping one step's list for the other in the same
                            slot would reuse the DOM and the cc-stag entrance
                            would not replay. The key is what makes this read as
                            a step change instead of a flicker. */}
                        <ScopeList key={scopeStep}>
                            {scopeStep === "scope" ? (
                                <>
                                    <ScopeOption
                                        glyph="1"
                                        title="Just this one"
                                        desc={`Only ${shortDate} changes. The rest of the series is left alone.`}
                                        onClick={handleEditOnlyParent}
                                    />
                                    {/* An edit never reaches backwards by
                                        accident. Rewriting meetings that
                                        already happened is a deliberate act —
                                        it is the second step below, not a third
                                        button on this list. */}
                                    {/* For a PAST occurrence this button leads
                                        to the second step rather than acting,
                                        and one of the choices there does reach
                                        back — so it must not promise here that
                                        the past is safe. Saying so would be a
                                        promise the path behind it breaks. */}
                                    <ScopeOption
                                        glyph="→"
                                        title="This one and everything after"
                                        desc={
                                            isPastOccurrence
                                                ? `${shortDate} has already happened, so you will be asked where the change should start.`
                                                : `${shortDate} and every later meeting in the series change. Meetings already past are left as they were.`
                                        }
                                        onClick={handleEditFollowing}
                                    />
                                </>
                            ) : (
                                <>
                                    {/* NO DATE IN THIS TITLE. The change starts
                                        at the first OCCURRENCE on or after
                                        today, which the server resolves from
                                        the series' own cadence — for a Monday
                                        series read on a Friday that is next
                                        Monday, not today. A date in the title
                                        is the thing users scan and check the
                                        calendar against, and this one would
                                        have been wrong most of the time. The
                                        rule goes in the title; the date belongs
                                        to whichever meeting actually changes. */}
                                    <ScopeOption
                                        glyph="→"
                                        title="From the next meeting onward"
                                        desc={`The first meeting on or after today (${todayShort}) changes, and every one after it. The meetings that already happened keep their old time, room and details.`}
                                        onClick={() =>
                                            startEdit("nextFromToday")
                                        }
                                    />
                                    <ScopeOption
                                        glyph="←"
                                        title={`Everything from ${shortDate}`}
                                        desc={`Reaches back. ${shortDate} and every meeting since — including the ones that already happened — change too.`}
                                        onClick={() => startEdit("next")}
                                    />
                                </>
                            )}
                        </ScopeList>
                    </DialogBody>
                    <DialogFooter>
                        <Spacer />
                        <CcButton
                            onClick={
                                scopeStep === "split"
                                    ? () => setScopeStep("scope")
                                    : closeScope
                            }
                        >
                            Back
                        </CcButton>
                    </DialogFooter>
                </DialogSurface>
            </Dialog>

            {/* Details */}
            <DialogSurface accent={color || TYPE_FALLBACK}>
                <DialogHeader
                    badge={type || null}
                    title={meeting.name}
                    sub={longDate}
                    onClose={handleExit}
                />
                <DialogBody>
                    <HeroTime
                        time={
                            allDay ? "All day" : `${fmt12(start)} – ${fmt12(end)}`
                        }
                        chips={[
                            allDay ? null : formatDuration(start, end),
                            repeatWord ? `↻ repeats ${repeatWord}` : null,
                            meeting?.it_support ? "⌁ IT support" : null,
                        ]}
                    />

                    {room ? (
                        <RoomCard
                            name={roomName}
                            // What the room has, if we know of anything; how
                            // many it seats when we do not. The equipment used
                            // to sit in a TagRow below this line, so putting it
                            // here and keeping the chips would have printed the
                            // same list twice.
                            meta={formatRoomMeta(
                                roomResourceList,
                                room.capacity
                            )}
                            thumb={
                                room.image_url && roomImage ? (
                                    <ImageViewer
                                        src={roomImage}
                                        alt={`${room.value} room image`}
                                        clickable={true}
                                        style={{
                                            width: "64px",
                                            height: "48px",
                                            objectFit: "cover",
                                            display: "block",
                                        }}
                                    />
                                ) : null
                            }
                        />
                    ) : null}

                    {/* The editor used to be smuggled into this sub-line next
                        to the booker. Two different people on one line read as
                        one person with two roles; the editor now has its own
                        Fact row, with the time it happened. */}
                    <PersonRow name={meeting.organizer} role="Booker" />

                    <Facts>
                        <Fact label="Type">{type}</Fact>
                        {meeting.repeats ? (
                            <Fact label="Repeats">{meeting.repeats}</Fact>
                        ) : null}
                        {wasEdited && updatedValue ? (
                            <Fact label={updatedLabel}>{updatedValue}</Fact>
                        ) : null}
                    </Facts>

                    {meeting?.description != "" &&
                    meeting?.description != null &&
                    meeting?.description != undefined ? (
                        <Block label="Description">{meeting.description}</Block>
                    ) : null}

                    {meeting?.it_support ? (
                        <Block label="IT support">
                            {meeting?.it_support_details ? (
                                meeting.it_support_details
                            ) : (
                                <Box sx={{ color: cc.mute }}>
                                    IT support requested
                                </Box>
                            )}
                        </Block>
                    ) : null}
                </DialogBody>
                <DialogFooter>
                    <CcButton variant="danger" onClick={handleDelete}>
                        Cancel meeting
                    </CcButton>
                    <Spacer />
                    <CcButton onClick={handleExit}>Close</CcButton>
                    <CcButton variant="primary" onClick={handleEdit}>
                        Edit
                    </CcButton>
                </DialogFooter>
            </DialogSurface>
        </Box>
    );
};

export default DisplayMeeting;
