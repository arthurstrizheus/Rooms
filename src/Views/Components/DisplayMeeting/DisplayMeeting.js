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
            setShowParentWarning(true);
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

    const handleEditOnlyParent = () => {
        setUpdateMode("current");
        setShowParentWarning(false);
        handleUpdateEvent();
    };
    const handleEditFollowingParent = () => {
        setUpdateMode("next");
        setShowParentWarning(false);
        handleUpdateEvent();
    };
    const handleEditALL = () => {
        setUpdateMode("all");
        setShowParentWarning(false);
        handleUpdateEvent();
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
                onClose={() => setShowParentWarning(false)}
                {...scopeDialogProps(480)}
            >
                <DialogSurface accent={color || TYPE_FALLBACK}>
                    <DialogHeader
                        badge={repeatWord ? `↻ Repeats ${repeatWord}` : null}
                        title="Change which meetings?"
                        sub={scopeSub}
                        onClose={() => setShowParentWarning(false)}
                    />
                    <DialogBody>
                        <ScopeList>
                            <ScopeOption
                                glyph="1"
                                title="Just this one"
                                desc={`Only ${shortDate} changes. The rest of the series is left alone.`}
                                onClick={handleEditOnlyParent}
                            />
                            <ScopeOption
                                glyph="→"
                                title="This one and everything after"
                                desc={`${shortDate} and every later meeting in the series change.`}
                                onClick={handleEditFollowingParent}
                            />
                            <ScopeOption
                                glyph="↻"
                                title="The whole series"
                                desc="Every meeting in the series changes, past ones included."
                                onClick={handleEditALL}
                            />
                        </ScopeList>
                    </DialogBody>
                    <DialogFooter>
                        <Spacer />
                        <CcButton onClick={() => setShowParentWarning(false)}>
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

                    <PersonRow
                        name={meeting.organizer}
                        role={
                            meeting.UpdatedUser
                                ? `Booker · last changed by ${meeting.UpdatedUser.first_name} ${meeting.UpdatedUser.last_name}`
                                : "Booker"
                        }
                    />

                    <Facts>
                        <Fact label="Type">{type}</Fact>
                        {meeting.repeats ? (
                            <Fact label="Repeats">{meeting.repeats}</Fact>
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
