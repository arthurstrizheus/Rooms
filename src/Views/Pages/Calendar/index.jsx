import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// material-ui
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import useMediaQuery from "@mui/material/useMediaQuery";

// third-party
import FullCalendar from "@fullcalendar/react";
import listPlugin from "@fullcalendar/list";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
    addMinutes,
    endOfDay,
    format,
    getDate,
    getMonth,
    getSeconds,
    getYear,
    getHours,
    getMinutes,
    isSameDay,
    startOfDay,
    startOfMonth,
    startOfWeek,
} from "date-fns";

// project imports
import CalendarStyled from "./CalendarStyled";
import RenderEventContent, {
    MeetingBubble,
    TYPE_COLOUR_FALLBACK,
    bubbleAriaLabel,
    bubbleMeta,
    compactTime,
    displayTime,
} from "./RenderEventContent";
import {
    bp,
    layout,
    motion as ccMotion,
    type as ccType,
} from "../../../Utilites/concourse";

// assets
import DisplayMeeting from "../../Components/DisplayMeeting/DisplayMeeting";
import { useAuth } from "../../../Utilites/AuthContext";
import {
    GetLocations,
    GetMeetingsByUserId,
    GetResources,
    GetRoomResources,
    GetRooms,
    GetTypes,
    showError,
    showSuccess,
} from "../../../Utilites/Functions/ApiFunctions";
import MeetingFourm from "./MeetingForum";
import MeetingUpdateWarning from "./MeetingUpdateWarning";
import {
    CheckPostMeeting,
    UpdateAllMeetingsInRecurrence,
    UpdateAllNextMeetingsInRecurrence,
    UpdateCurrentOnlyMeeting,
    UpdateMeeting,
    UpdateParentOnlyMeeting,
} from "../../../Utilites/Functions/ApiFunctions/MeetingFunctions";

import { IsMeetingParentRecurrence } from "../../../Utilites/Functions/ApiFunctions/MeetingRecurrencesFunctions";
import { useSocket } from "../../../Contexts/SocketContext";

/* ==========================================================================
 * Concourse constants
 * ========================================================================*/

const SP = "var(--cc-sp)";
const PHONE = `@media (max-width:${bp.sheet}px)`;
const HOVER = "@media (hover: hover)";

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// The window the time grid renders and the agenda measures "free" against
// (ARBITER §10.13 / §10.14 — layout.dayStart 7 -> layout.dayEnd 19).
const DAY_START_HOUR = layout.dayStart;
const DAY_END_HOUR = layout.dayEnd;
const SLOT_MINUTES = layout.timeStepMinutes; // 15

// A bare click has no drag distance, so FullCalendar's `select` either reports a
// single slot or does not fire at all. Both paths are normalised to this length
// so click-to-book is deterministic. NOT specified by the ARBITER — see report.
const CLICK_BOOKING_MINUTES = 30;

/* ==========================================================================
 * Shared button recipes (§10.18). Plain <button>s, not MUI Buttons: theme.js
 * has a global MuiButton override that forces `color`, which would fight every
 * Concourse surface (§14 #7).
 * ========================================================================*/

const FOCUS_RING = {
    outline: "2px solid var(--cc-red)",
    outlineOffset: "2px",
};

const btnBase = {
    border: 0,
    cursor: "pointer",
    borderRadius: "99px",
    padding: "9px 17px",
    fontFamily: "var(--cc-sans)",
    ...ccType.button,
    transition: `transform 280ms ${SP}, background 200ms, box-shadow 280ms ${SP}`,
    "&:focus-visible": FOCUS_RING,
    "&:active": { transform: "scale(.97)" },
    "&:disabled": { opacity: 0.4, cursor: "default", transform: "none" },
};

const btnDefault = {
    ...btnBase,
    background: "var(--cc-srf2)",
    color: "var(--cc-ink)",
    [HOVER]: {
        "&:hover:not(:disabled)": {
            background: "var(--cc-wash)",
            transform: "translateY(-1px)",
            boxShadow: "var(--cc-sh1)",
        },
    },
};

const btnPrimary = {
    ...btnBase,
    background: "var(--cc-red)",
    color: "var(--cc-on-red)",
    boxShadow: "var(--cc-glow-btn)",
    [HOVER]: {
        "&:hover:not(:disabled)": {
            filter: "brightness(1.06)",
            transform: "translateY(-1px)",
        },
    },
};

/* ==========================================================================
 * Dialog frame — SEAM 2 (§2, §10.17, §9)
 *
 * Lane C owns the frame; Lane D owns everything inside it.
 *
 * Every value below is either a `--cc-*` custom property (emitted at :root by
 * <GlobalStyles> in App.js, so it resolves inside a portal) or a literal. No
 * rule here depends on a class or a var set anywhere in the page tree — that is
 * exactly what made dialogs render transparent last time. `backgroundImage:
 * "none"` is mandatory: MUI paints an elevation gradient on Paper that would
 * otherwise muddy --cc-srf.
 * ========================================================================*/

const dialogFrameSx = {
    // `align-items: flex-start` + `margin: auto` on the Paper = centred when it
    // fits, top-clamped when it does not. The container is what scrolls, so a
    // tall dialog can never overlap the top of the page (§10.17).
    "& .MuiDialog-container": {
        alignItems: "flex-start",
        padding: "clamp(28px, 9vh, 76px) 18px 28px",
        overflowY: "auto",
        [PHONE]: { alignItems: "flex-end", padding: 0 },
    },
    "& .MuiBackdrop-root": {
        backgroundColor: "var(--cc-scrim)",
        backdropFilter: "blur(8px) saturate(.9)",
        [PHONE]: { backdropFilter: "blur(5px)" },
    },
};

const dialogPaperSx = {
    width: "100%",
    maxWidth: "var(--cc-dw, 548px)",
    margin: "auto",
    maxHeight: "none",
    overflow: "hidden",
    position: "relative",
    backgroundColor: "var(--cc-srf)",
    backgroundImage: "none",
    color: "var(--cc-ink)",
    borderRadius: "26px",
    boxShadow: "var(--cc-sh-dialog)",
    fontFamily: "var(--cc-sans)",
    fontSize: "15px",
    lineHeight: 1.5,
    // No `both` fill: MUI's Fade owns opacity on exit, and a forwards fill
    // would pin opacity at 1 and kill the closing transition.
    animation: `${ccMotion.keyframes.dialog} ${ccMotion.dur.dialog}ms ${SP}`,
    [PHONE]: {
        maxWidth: "none",
        margin: "auto 0 0",
        borderRadius: "26px 26px 0 0",
        maxHeight: "100%",
        overflowY: "auto",
        animation: `${ccMotion.keyframes.sheet} ${ccMotion.dur.sheet}ms ${SP}`,
    },
};

const DIALOG_TRANSITION = {
    enter: ccMotion.dur.overlay,
    exit: 200,
};

/** Bottom-sheet grab handle (§10.17). Frame furniture, so it lives here. */
const GrabHandle = () => (
    <Box
        aria-hidden="true"
        sx={{
            width: "38px",
            height: "4px",
            borderRadius: "99px",
            background: "var(--cc-line)",
            margin: "9px auto 0",
        }}
    />
);

/**
 * Props for one dialog frame. `width` becomes `--cc-dw`; `color` becomes
 * `--cc-c` so Lane D's header wash and type badge can read the meeting's type
 * colour through the portal.
 */
const framePaperProps = (width, color) => ({
    style: {
        "--cc-dw": `${width}px`,
        "--cc-c": color || TYPE_COLOUR_FALLBACK,
    },
    sx: dialogPaperSx,
});

/* ==========================================================================
 * Data shaping
 * ========================================================================*/

const transposeMeetingToEvent = (meetings, meetingTypes, rooms) => {
    return (meetings || []).map((meeting, idx) => {
        const type = meetingTypes.find((tp) => tp.id === meeting.type);
        const room = rooms.find((rm) => rm.id === meeting.room);
        const roomName = room
            ? room.value
                  ?.replace("Conference", "CR")
                  ?.replace("Training Room", "TR")
            : "Unknown room";

        return {
            id: meeting.id === -1 ? `meeting-${idx}` : meeting.id,
            title: meeting.name, // just the name here
            start: meeting.start_time,
            end: meeting.end_time,
            allDay: meeting.all_day,
            // Kept only as the carrier for the type colour: the bubble reads it
            // as `--cc-c` and FullCalendar's own paint is cleared in
            // `eventDidMount`. `textColor` is deliberately gone — a saturated
            // fill with black text is unreadable and breaks in dark (§14 #11).
            backgroundColor: type?.color,
            extendedProps: {
                ...meeting,
                roomName: roomName,
            },
        };
    });
};

function isMultipleDayMeeting(meeting) {
    if (!meeting?.start || !meeting?.end) {
        // There is no meeting we can all go home
        return false;
    }
    const start = new Date(meeting.start);
    const end = new Date(meeting.end);

    if (meeting.all_day || meeting.allDay) {
        // For allDay events, end is exclusive. Nothing makes sense, so check for >1 day.
        const diff = (end - start) / (1000 * 60 * 60 * 24);
        return diff > 1;
    } else {
        // Compare local calendar days, like civilized people do.
        return (
            getYear(start) !== getYear(end) ||
            getMonth(start) !== getMonth(end) ||
            (getDate(start) !== getDate(end) &&
                getHours(end) != 0 &&
                getMinutes(end) != 0 &&
                getSeconds(end) != 0)
        );
    }
}

/** Minutes of the 7am–7pm span that no timed meeting covers (§10.14). */
const freeMinutesForDay = (day, items) => {
    const spanStart = new Date(day);
    spanStart.setHours(DAY_START_HOUR, 0, 0, 0);
    const spanEnd = new Date(day);
    spanEnd.setHours(DAY_END_HOUR, 0, 0, 0);
    const total = (spanEnd - spanStart) / 60000;

    const intervals = (items || [])
        .filter((ev) => !ev.allDay)
        .map((ev) => {
            const s = Math.max(
                new Date(ev.start).getTime(),
                spanStart.getTime()
            );
            const e = Math.min(
                new Date(ev.end || ev.start).getTime(),
                spanEnd.getTime()
            );
            return [s, e];
        })
        .filter(([s, e]) => e > s)
        .sort((a, b) => a[0] - b[0]);

    let busyMs = 0;
    let cur = null;
    intervals.forEach(([s, e]) => {
        if (!cur) {
            cur = [s, e];
        } else if (s <= cur[1]) {
            cur[1] = Math.max(cur[1], e);
        } else {
            busyMs += cur[1] - cur[0];
            cur = [s, e];
        }
    });
    if (cur) busyMs += cur[1] - cur[0];

    return Math.max(0, Math.round(total - busyMs / 60000));
};

const formatFree = (minutes) => {
    if (minutes <= 0) return "fully booked";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h && m) return `${h}h ${m}m free`;
    if (h) return `${h}h free`;
    return `${m}m free`;
};

/* ==========================================================================
 * Skeleton (§10.16)
 * ========================================================================*/

const skSx = {
    position: "relative",
    overflow: "hidden",
    background: "currentColor",
    opacity: 0.08,
    color: "var(--cc-ink)",
    borderRadius: "99px",
    "&::after": {
        content: '""',
        position: "absolute",
        inset: 0,
        transform: "translateX(-100%)",
        background:
            "linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent)",
        animation: `${ccMotion.keyframes.shimmer} ${ccMotion.dur.shimmer}ms infinite`,
    },
};

const Sk = ({ sx }) => <Box sx={{ ...skSx, ...sx }} />;

const MonthSkeleton = () => (
    <Box sx={{ padding: "0 9px 12px" }}>
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: "repeat(7,1fr)",
                padding: "0 0 4px",
            }}
        >
            {DOW_LABELS.map((d) => (
                <Box
                    key={d}
                    sx={{
                        textAlign: "center",
                        color: "var(--cc-mute)",
                        ...ccType.dowHeader,
                    }}
                >
                    {d}
                </Box>
            ))}
        </Box>
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: "repeat(7,1fr)",
                gap: "5px",
            }}
        >
            {/* 42 cells — the same shape as the loaded grid, so nothing jumps
                when the data lands (§13-G7). */}
            {Array.from({ length: 42 }).map((_, i) => {
                const bars = ((i % 7) + Math.floor(i / 7)) % 3;
                return (
                    <Box
                        key={i}
                        sx={{
                            background: "var(--cc-srf2)",
                            borderRadius: "15px",
                            minHeight: `${layout.monthCellMinHeight}px`,
                            padding: "6px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                        }}
                    >
                        <Sk sx={{ width: "23px", height: "23px" }} />
                        {Array.from({ length: bars }).map((__, b) => (
                            <Sk
                                key={b}
                                sx={{ height: "26px", borderRadius: "11px" }}
                            />
                        ))}
                    </Box>
                );
            })}
        </Box>
    </Box>
);

/**
 * Week / day loading shape. The ARBITER specifies a month skeleton and an
 * agenda skeleton only (§10.16); this keeps §13-G7's rule — the skeleton must
 * have the shape of the grid that replaces it — for the time grid too.
 */
const TimeGridSkeleton = ({ columns }) => (
    <Box sx={{ padding: "0 9px 12px" }}>
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: `52px repeat(${columns},1fr)`,
                gap: "5px",
                paddingBottom: "7px",
            }}
        >
            <Box />
            {Array.from({ length: columns }).map((_, i) => (
                <Sk key={i} sx={{ height: "34px", borderRadius: "11px" }} />
            ))}
        </Box>
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: `52px repeat(${columns},1fr)`,
                gap: "5px",
            }}
        >
            <Box />
            {Array.from({ length: columns }).map((_, i) => (
                <Sk
                    key={i}
                    sx={{
                        height: `${
                            (DAY_END_HOUR - DAY_START_HOUR) * layout.hourRow
                        }px`,
                        borderRadius: "15px",
                    }}
                />
            ))}
        </Box>
    </Box>
);

const AgendaSkeleton = () => (
    <Box sx={{ padding: "0 12px 14px", display: "grid", gap: "12px" }}>
        {Array.from({ length: 3 }).map((_, i) => (
            <Box
                key={i}
                sx={{
                    background: "var(--cc-srf2)",
                    borderRadius: "20px",
                    padding: "12px",
                }}
            >
                <Sk sx={{ width: "38px", height: "38px" }} />
                <Box
                    sx={{
                        display: "grid",
                        gap: "6px",
                        marginTop: "10px",
                    }}
                >
                    <Sk sx={{ height: "34px", borderRadius: "14px" }} />
                    <Sk sx={{ height: "34px", borderRadius: "14px" }} />
                </Box>
            </Box>
        ))}
    </Box>
);

/* ==========================================================================
 * Empty / error state (§10.15)
 * ========================================================================*/

const StateBlock = ({ icon, danger, title, body, actions }) => (
    <Box
        sx={{
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            padding: "52px 26px",
            gap: "11px",
        }}
    >
        <Box
            aria-hidden="true"
            sx={{
                width: "56px",
                height: "56px",
                borderRadius: "20px",
                display: "grid",
                placeItems: "center",
                fontSize: "23px",
                boxShadow: "var(--cc-sh1)",
                background: danger ? "var(--cc-wash)" : "var(--cc-srf2)",
                color: danger ? "var(--cc-red)" : "var(--cc-ink)",
            }}
        >
            {icon}
        </Box>
        <Box sx={{ ...ccType.stateTitle }}>{title}</Box>
        <Box sx={{ ...ccType.stateBody, color: "var(--cc-mute)" }}>{body}</Box>
        <Box
            sx={{
                display: "flex",
                gap: "9px",
                flexWrap: "wrap",
                justifyContent: "center",
                marginTop: "4px",
            }}
        >
            {actions}
        </Box>
    </Box>
);

/* ==========================================================================
 * Agenda (§10.14) — hand-rolled, because FullCalendar's list view cannot
 * express the date ring, the meeting count or the free-time reading, and the
 * agenda needs no drag/drop. Grid interaction stays with FullCalendar.
 * ========================================================================*/

const Agenda = ({ events, rooms, types, onOpenEvent }) => {
    const days = useMemo(() => {
        const map = new Map();
        (events || []).forEach((ev) => {
            const start = new Date(ev.start);
            if (Number.isNaN(start.getTime())) return;
            const key = format(start, "yyyy-MM-dd");
            if (!map.has(key)) {
                map.set(key, { key, date: startOfDay(start), items: [] });
            }
            map.get(key).items.push(ev);
        });
        return Array.from(map.values())
            .sort((a, b) => a.date - b.date)
            .map((d) => ({
                ...d,
                items: d.items
                    .slice()
                    .sort((a, b) => new Date(a.start) - new Date(b.start)),
            }));
    }, [events]);

    return (
        <Box sx={{ padding: "0 12px 14px", display: "grid", gap: "12px" }}>
            {days.map((day) => {
                const today = isSameDay(day.date, new Date());
                const count = day.items.length;
                return (
                    <Box
                        key={day.key}
                        sx={{
                            background: "var(--cc-srf2)",
                            borderRadius: "20px",
                            overflow: "hidden",
                        }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: "11px",
                                padding: "11px 14px 9px",
                            }}
                        >
                            <Box
                                sx={{
                                    width: "38px",
                                    height: "38px",
                                    borderRadius: "99px",
                                    display: "grid",
                                    placeItems: "center",
                                    flex: "none",
                                    boxShadow: "var(--cc-sh1)",
                                    background: today
                                        ? "var(--cc-red)"
                                        : "var(--cc-srf)",
                                    color: today
                                        ? "var(--cc-on-red)"
                                        : "var(--cc-ink)",
                                    ...ccType.agendaRing,
                                }}
                            >
                                {getDate(day.date)}
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                                <Box sx={{ ...ccType.agendaDay }}>
                                    {format(day.date, "EEEE")}
                                    {today ? " · today" : ""}
                                </Box>
                                <Box
                                    sx={{
                                        ...ccType.agendaSub,
                                        color: "var(--cc-mute)",
                                    }}
                                >
                                    {`${format(day.date, "MMM yyyy")} · ${count} ${
                                        count === 1 ? "meeting" : "meetings"
                                    }`}
                                </Box>
                            </Box>
                            <Box
                                sx={{
                                    marginLeft: "auto",
                                    flex: "none",
                                    ...ccType.agendaFree,
                                    color: "var(--cc-mute)",
                                }}
                            >
                                {formatFree(
                                    freeMinutesForDay(day.date, day.items)
                                )}
                            </Box>
                        </Box>

                        <Box
                            sx={{
                                display: "grid",
                                gap: "5px",
                                padding: "0 10px 11px",
                            }}
                        >
                            {day.items.map((ev, index) => {
                                const props = ev.extendedProps || {};
                                const fullRoomName =
                                    (rooms || []).find(
                                        (rm) => rm?.id === props.room
                                    )?.value || props.roomName;
                                const typeName = (types || []).find(
                                    (tp) => tp?.id === props.type
                                )?.value;
                                return (
                                    <Box
                                        key={ev.id}
                                        sx={{
                                            display: "grid",
                                            gridTemplateColumns: "112px 1fr",
                                            gap: "10px",
                                            alignItems: "center",
                                            [PHONE]: {
                                                gridTemplateColumns: "1fr",
                                                gap: "3px",
                                            },
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                ...ccType.agendaTime,
                                                color: "var(--cc-mute)",
                                                textAlign: "right",
                                                [PHONE]: {
                                                    textAlign: "left",
                                                    paddingLeft: "2px",
                                                },
                                            }}
                                        >
                                            {ev.allDay
                                                ? "all day"
                                                : `${displayTime(
                                                      ev.start
                                                  )} – ${displayTime(ev.end)}`}
                                        </Box>
                                        <MeetingBubble
                                            as="button"
                                            variant="agenda"
                                            allDay={Boolean(ev.allDay)}
                                            color={ev.backgroundColor}
                                            name={ev.title}
                                            meta={bubbleMeta({
                                                variant: "agenda",
                                                roomName: props.roomName,
                                            })}
                                            repeats={Boolean(
                                                props.recurrence_id
                                            )}
                                            itSupport={Boolean(
                                                props.it_support
                                            )}
                                            delay={
                                                ccMotion.delay.agendaStep *
                                                index
                                            }
                                            ariaLabel={bubbleAriaLabel({
                                                name: ev.title,
                                                fullRoomName,
                                                start: ev.start,
                                                end: ev.end,
                                                allDay: Boolean(ev.allDay),
                                                typeName,
                                            })}
                                            onClick={() => onOpenEvent(ev)}
                                        />
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                );
            })}
        </Box>
    );
};

/* ==========================================================================
 * APPLICATION CALENDAR
 * ========================================================================*/

const Calendar = ({
    setLoading,
    loading,
    selectedDate,
    setSelectedDate,
    defaultView,
    range,
    drawerOpen,
    bookIntent,
}) => {
    const calendarRef = useRef(null);
    const containerRef = useRef();
    const dateClickTimer = useRef(null);
    const { user } = useAuth();
    const isPhone = useMediaQuery(`(max-width:${bp.sheet}px)`);

    // fetch data
    const [meetings, setMeetings] = useState([]);
    const [meetingTypes, setMeetingTypes] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [roomResources, setRoomResources] = useState([]);
    const [resources, setResources] = useState([]);
    const [locations, setLocations] = useState([]);
    const [update, setUpdate] = useState(false);
    const [updateTrigger, setUpdateTrigger] = useState(0);
    const [updateMode, setUpdateMode] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [openMeetingDialog, setOpenMeetingDialog] = useState(false);
    const [selectedRange, setSelectedRange] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [events, setEvents] = useState([]);
    const [showParentWarning, setShowParentWarning] = useState(false);
    const [updateEvent, setUpdateEvent] = useState(null);
    const [fetchError, setFetchError] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [morePopover, setMorePopover] = useState(null);
    const [viewMode, setViewMode] = useState(
        String(defaultView || "").startsWith("list") ? "agenda" : "grid"
    );
    const { socket } = useSocket();

    // The FullCalendar view this route maps to. `Routes.js` still asks for
    // `listWeek` on small screens; Agenda is our own component now, so a list
    // view is folded into the matching time grid.
    const gridView = useMemo(() => {
        const v = String(defaultView || "");
        if (v === "listDay") return "timeGridDay";
        if (v === "listMonth") return "dayGridMonth";
        if (v.startsWith("list")) return "timeGridWeek";
        return v || "dayGridMonth";
    }, [defaultView]);

    // §9 — at <=620px the month and time grids are not rendered at all.
    const layoutMode = isPhone ? "agenda" : viewMode;
    const isMonthGrid = gridView === "dayGridMonth";

    const periodLabel = useMemo(() => {
        if (range === "Month") return format(new Date(selectedDate), "MMMM yyyy");
        if (range === "Week") return "this week";
        return "this day";
    }, [range, selectedDate]);

    const officeAlias = useMemo(() => {
        const ids = Array.from(
            new Set(
                (rooms || [])
                    .map((rm) => rm?.location)
                    .filter((v) => v !== null && v !== undefined)
            )
        );
        if (ids.length !== 1) return "";
        return (
            (locations || []).find(
                (lc) => String(lc?.officeid) === String(ids[0])
            )?.Alias || ""
        );
    }, [rooms, locations]);

    useEffect(() => {
        let cancelled = false;
        const data = async () => {
            try {
                const lcs = await GetLocations();
                const rms = await GetRooms(user?.id);
                const rrs = await GetRoomResources();
                const rec = await GetResources();
                const mts = await GetMeetingsByUserId(user?.id, {
                    date:
                        range == "Month"
                            ? startOfMonth(selectedDate)
                            : range == "Week"
                            ? startOfWeek(selectedDate, {
                                  weekStartsOn: layout.weekStartsOn,
                              })
                            : selectedDate,
                    range: range,
                });
                const tps = await GetTypes();

                if (cancelled) return;
                setRooms(rms);
                setRoomResources(rrs);
                setResources(rec);
                setMeetings(mts);
                setMeetingTypes(tps);
                setLocations(lcs);
                setFetchError(false);
            } catch (err) {
                console.error(err);
                if (!cancelled) setFetchError(true);
            } finally {
                if (!cancelled) {
                    setHasLoaded(true);
                    setLoading(false);
                }
            }
        };
        if (user?.id) {
            setLoading(true);
            setFetchError(false);
            data();
        }
        return () => {
            cancelled = true;
        };
    }, [user, selectedDate, updateTrigger, defaultView]);

    useEffect(() => {
        if (!containerRef.current || !calendarRef.current) return;

        const calendarApi = calendarRef.current.getApi();
        if (!calendarApi) return;

        const observer = new ResizeObserver(() => {
            calendarApi.updateSize();
        });

        observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, [layoutMode]);

    /**
     * Open the time grid on business hours (§10.13's real intent).
     *
     * The 7am-7pm `slotMinTime`/`slotMaxTime` clamp was dropped because it hid
     * every meeting outside it, so the grid now renders all 24 hours.
     * FullCalendar's own `scrollTime` cannot place us: `height="auto"` sets
     * `isHeightAuto`, which makes its ScrollGrid non-liquid, so FullCalendar
     * owns no scroller — the page container (`containerRef`) does. Scroll it to
     * the 7am slat ourselves, once per view/layout change. Purely additive: if
     * the slat is not there the container is left exactly where it was.
     */
    useEffect(() => {
        if (isMonthGrid) return undefined;
        const container = containerRef.current;
        if (!container) return undefined;
        const frame = requestAnimationFrame(() => {
            const slat = container.querySelector(
                `.fc-timegrid-slot[data-time="${String(
                    DAY_START_HOUR
                ).padStart(2, "0")}:00:00"]`
            );
            if (!slat) return;
            const offset =
                slat.getBoundingClientRect().top -
                container.getBoundingClientRect().top;
            container.scrollTop += offset;
        });
        return () => cancelAnimationFrame(frame);
    }, [gridView, isMonthGrid, layoutMode, loading, hasLoaded]);

    // keep FullCalendar's view in step with the route
    useEffect(() => {
        const calendarEl = calendarRef.current;
        if (!calendarEl) return;
        const calendarApi = calendarEl.getApi();
        if (calendarApi && calendarApi.view?.type !== gridView) {
            calendarApi.changeView(gridView);
        }
    }, [gridView, layoutMode]);

    useEffect(() => {
        const calendarEl = calendarRef.current;
        if (calendarEl) {
            const calendarApi = calendarEl.getApi();
            calendarApi.gotoDate(selectedDate);
        }
    }, [selectedDate, gridView, layoutMode]);

    useEffect(() => {
        if (meetingTypes?.length) {
            setEvents(transposeMeetingToEvent(meetings, meetingTypes, rooms));
        }
    }, [meetings, meetingTypes, rooms]);

    useEffect(
        () => () => {
            if (dateClickTimer.current) clearTimeout(dateClickTimer.current);
        },
        []
    );

    // Real-time meeting status changes (approved/declined) – refresh dataset
    // minimally. Newly arrived bubbles animate in on their own: they mount
    // fresh, so `eventDidMount` (grid) / the bubble's own `cc-pop` (agenda)
    // plays the entrance. Meetings that were already on screen do not re-animate.
    useEffect(() => {
        if (!socket || !user?.id) return;
        const handler = (payload) => {
            const { message } = payload || {};
            if (
                message === "meeting_approved" ||
                message === "meeting_declined"
            ) {
                setUpdateTrigger((prev) => prev + 1);
            }
        };
        socket.on("message", handler);
        return () => socket.off("message", handler);
    }, [socket, user?.id]);

    /* ------------------------------------------------------- booking flow --*/

    const openBooking = useCallback(
        (start, end, allDay) => {
            const calendarApi = calendarRef.current?.getApi();
            calendarApi?.unselect();
            const meet = { start, end, allDay, view: gridView };
            setSelectedRange({
                ...meet,
                allDay: isMultipleDayMeeting(meet),
            });
            setSelectedEvent(null);
            setUpdate(false);
            setOpenMeetingDialog(true);
        },
        [gridView]
    );

    /**
     * The Banner's "Book a room" CTA. `bookIntent` is a counter owned by
     * `App.js`; every increment is one click. The ref keeps this keyed to the
     * click and not to `openBooking`'s identity, which changes whenever the
     * view does — without it, switching month/week/day would re-open the
     * dialog. Same call as the empty state's "Book a room" so the two buttons
     * with the same label behave identically.
     */
    const handledBookIntent = useRef(0);
    useEffect(() => {
        if (!bookIntent || handledBookIntent.current === bookIntent) return;
        handledBookIntent.current = bookIntent;
        openBooking(new Date(), endOfDay(new Date()), false);
    }, [bookIntent, openBooking]);

    /**
     * FullCalendar's own drag-selection. This replaces the injected
     * `dayCellDidMount` click listener, which overrode `select` in timeGrid
     * views (the day column IS a day cell) and made every drag collapse to the
     * whole day — and leaked one listener per cell mount. See plan.md
     * "Root cause 1".
     */
    const handleRangeSelect = useCallback(
        (arg) => {
            if (dateClickTimer.current) {
                clearTimeout(dateClickTimer.current);
                dateClickTimer.current = null;
            }
            const start = arg.start;
            let end = arg.end;
            if (!arg.allDay) {
                const minutes = Math.round((end - start) / 60000);
                if (minutes <= SLOT_MINUTES) {
                    end = addMinutes(start, CLICK_BOOKING_MINUTES);
                }
            }
            openBooking(start, end, arg.allDay);
        },
        [openBooking]
    );

    /**
     * Single click to book. FullCalendar fires `dateClick` before `select`, and
     * `select` only fires when the pointer actually moved — so the open is
     * deferred by a tick and cancelled if a real selection follows. That makes
     * both paths deterministic instead of order-dependent.
     */
    const handleDateClick = useCallback(
        (arg) => {
            const start = arg.date;
            const allDay = Boolean(arg.allDay);
            const end = allDay
                ? new Date(start.getTime() + 24 * 60 * 60 * 1000)
                : addMinutes(start, CLICK_BOOKING_MINUTES);
            if (dateClickTimer.current) clearTimeout(dateClickTimer.current);
            dateClickTimer.current = setTimeout(() => {
                dateClickTimer.current = null;
                openBooking(start, end, allDay);
            }, 0);
        },
        [openBooking]
    );

    const openDetails = useCallback((event) => {
        // Opening an existing meeting always wins over a day-cell range.
        if (dateClickTimer.current) {
            clearTimeout(dateClickTimer.current);
            dateClickTimer.current = null;
        }
        setSelectedRange(null);
        setSelectedEvent(event || null);
        setMorePopover(null);
        setIsModalOpen(true);
        setOpenMeetingDialog(false);
    }, []);

    const handleEventSelect = useCallback(
        (arg) => {
            const selectEvent = arg.event.id
                ? events.find((_event) => _event.id == arg.event.id)
                : null;
            openDetails(selectEvent);
        },
        [events, openDetails]
    );

    const handleEventUpdate = async ({ event }) => {
        try {
            const isParent = await IsMeetingParentRecurrence(
                event.extendedProps.id
            );
            if (event.extendedProps.recurrence_id && isParent.parent) {
                setShowParentWarning(true);
                setSelectedEvent(event);
                setUpdateEvent(event);
            } else {
                const updatedMeeting = {
                    ...event.extendedProps,
                    start_time: new Date(event.start).toISOString(),
                    end_time: new Date(event.end).toISOString(),
                    all_day: event.allDay,
                };
                UpdateMeeting(user?.id, updatedMeeting)
                    .then((resp) => {
                        if (resp) {
                            showSuccess("Meeting has been updated");
                        }
                        setUpdateTrigger((prev) => prev + 1);
                        setLoading(false);
                    })
                    .catch(() => {
                        setLoading(false);
                        handleModalClose();
                        setUpdateTrigger((prev) => prev + 1);
                        showError("There was an error updating the meetings.");
                    });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdateEvent = async (eventId, update) => {
        // We are editing the meeting the user opened, so drop any range that
        // may still be hanging around — MeetingFourm prefers selectedRange and
        // a stale one leaves the form with no meeting id and no start_time.
        setSelectedRange(null);
        setUpdate(true);
        setOpenMeetingDialog(true);
        setIsModalOpen(false);
    };

    const handleExitWarning = (updateMeetings, mode) => {
        if (updateMeetings) {
            setLoading(true);
            const updatedMeeting = {
                ...updateEvent.extendedProps,
                new_start_time: new Date(updateEvent.start).toISOString(),
                new_end_time: new Date(updateEvent.end).toISOString(),
                allDay: updateEvent.allDay,
            };
            if (mode == "next" && user?.id) {
                UpdateAllNextMeetingsInRecurrence(user?.id, updatedMeeting)
                    .then(() => {
                        showSuccess("Meeting has been updated");
                        setUpdateTrigger((prev) => prev + 1);
                        setLoading(false);
                    })
                    .catch((err) => {
                        console.log(err);
                        setUpdateTrigger((prev) => prev + 1);
                        showError("There was an error updating the meetings.");
                        setLoading(false);
                    });
            } else if (mode == "current" && user?.id) {
                CheckPostMeeting(user?.id, updatedMeeting)
                    .then((resp) => {
                        if (resp?.book) {
                            if (updatedMeeting?.id > 0) {
                                UpdateParentOnlyMeeting(
                                    user?.id,
                                    updatedMeeting
                                )
                                    .then((resp) => {
                                        if (resp) {
                                            showSuccess(
                                                "Meeting has been updated"
                                            );
                                        }
                                        setUpdateTrigger((prev) => prev + 1);
                                        setLoading(false);
                                    })
                                    .catch((err) => {
                                        console.log(err);
                                        setLoading(false);
                                        setUpdateTrigger((prev) => prev + 1);
                                        showError(
                                            "There was an error updating the meetings."
                                        );
                                    });
                            } else {
                                UpdateCurrentOnlyMeeting(
                                    user?.id,
                                    updatedMeeting
                                )
                                    .then((resp) => {
                                        if (resp) {
                                            showSuccess(
                                                "Meeting has been updated"
                                            );
                                        }
                                        setLoading(false);
                                        setUpdateTrigger((prev) => prev + 1);
                                    })
                                    .catch((err) => {
                                        console.log(err);
                                        setLoading(false);
                                        setUpdateTrigger((prev) => prev + 1);
                                        showError(
                                            "There was an error updating the meetings."
                                        );
                                    });
                            }
                        }
                    })
                    .catch((err) => {
                        console.log(err);
                        setUpdateTrigger((prev) => prev + 1);
                        showError("There was an error updating the meetings.");
                    });
            } else if (mode == "all" && user?.id) {
                UpdateAllMeetingsInRecurrence(user?.id, updatedMeeting)
                    .then((resp) => {
                        if (resp) {
                            showSuccess("Meeting has been updated");
                        }
                        setLoading(false);
                        setUpdateTrigger((prev) => prev + 1);
                    })
                    .catch((err) => {
                        console.log(err);
                        setLoading(false);
                        setUpdateTrigger((prev) => prev + 1);
                        showError("There was an error updating the meetings.");
                    });
            } else if (user?.id) {
                CheckPostMeeting(user?.id, updatedMeeting)
                    .then((resp) => {
                        if (resp?.book) {
                            UpdateMeeting(user?.id, updatedMeeting)
                                .then((resp) => {
                                    if (resp) {
                                        showSuccess("Meeting has been updated");
                                    }
                                    setUpdateTrigger((prev) => prev + 1);
                                    setLoading(false);
                                })
                                .catch(() => {
                                    setLoading(false);
                                    handleModalClose();
                                    setUpdateTrigger((prev) => prev + 1);
                                    showError(
                                        "There was an error updating the meetings."
                                    );
                                });
                        }
                    })
                    .catch((err) => {
                        setLoading(false);
                        console.log(err);
                        showError("There was an error updating the meeting.");
                    });
            }
        } else {
            setLoading(true);
            setEvents(transposeMeetingToEvent(meetings, meetingTypes, rooms));
            setLoading(false);
        }
        setUpdateEvent(null);
        setShowParentWarning(false);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedEvent(null);
        setSelectedRange(null);
    };

    const handleCloseForm = () => {
        setSelectedEvent(null);
        setSelectedRange(null);
        setUpdate(false);
        setOpenMeetingDialog(false);
    };

    /* ------------------------------------------- FullCalendar render hooks --*/

    const renderEventContent = useCallback(
        (arg) => (
            <RenderEventContent arg={arg} rooms={rooms} types={meetingTypes} />
        ),
        [rooms, meetingTypes]
    );

    /**
     * Clears FullCalendar's own inline paint, publishes the meeting's type
     * colour as `--cc-c` (so the focus ring can take it — the only non-red ring
     * in the design), and plays the entrance with the grid stagger. The stagger
     * index only exists in the DOM, which is why it is applied here rather than
     * inside `eventContent`. This hook adds no listeners, so nothing leaks.
     */
    const handleEventDidMount = useCallback((info) => {
        const el = info.el;
        if (!el) return;
        el.style.setProperty(
            "--cc-c",
            info.event.backgroundColor || TYPE_COLOUR_FALLBACK
        );
        el.style.backgroundColor = "transparent";
        el.style.borderColor = "transparent";

        const indexIn = (selector) => {
            const harness = el.closest(selector);
            const list = harness?.parentElement;
            if (!list) return 0;
            const i = Array.prototype.indexOf.call(list.children, harness);
            return i < 0 ? 0 : i;
        };

        let name = ccMotion.keyframes.bubble;
        let duration = ccMotion.dur.bubble;
        let delay = 0;

        if (info.view.type === "dayGridMonth") {
            // 70ms per row of 7 cells, 50ms per bubble inside a cell (§8).
            const row = el.closest("tr");
            const rowIndex = row?.parentElement
                ? Math.max(
                      0,
                      Array.prototype.indexOf.call(
                          row.parentElement.children,
                          row
                      )
                  )
                : 0;
            delay =
                ccMotion.delay.monthRowStep * rowIndex +
                ccMotion.delay.monthBubbleStep *
                    indexIn(".fc-daygrid-event-harness");
        } else if (info.event.allDay) {
            delay =
                ccMotion.delay.allDayBase +
                ccMotion.delay.allDayStep * indexIn(".fc-daygrid-event-harness");
        } else {
            name = ccMotion.keyframes.posBubble;
            duration = ccMotion.dur.posBubble;
            delay =
                ccMotion.delay.timeBase +
                ccMotion.delay.timeStep *
                    indexIn(".fc-timegrid-event-harness");
        }

        el.style.animation = `${name} ${duration}ms ${ccMotion.spring} ${delay}ms both`;
    }, []);

    const renderDayHeader = useCallback((arg) => {
        if (arg.view.type === "dayGridMonth") {
            return (
                <span className="cc-dow">{format(arg.date, "EEE")}</span>
            );
        }
        return (
            <span className="cc-colhead">
                <span className="cc-colhead-dow">
                    {format(arg.date, "EEE")}
                </span>
                <span className="cc-colhead-num">{format(arg.date, "d")}</span>
            </span>
        );
    }, []);

    const renderDayCell = useCallback(
        (arg) => {
            // The hook also fires for time-grid columns and for the all-day
            // rail; only the month grid gets a day number and a quick-add.
            if (arg.view.type !== "dayGridMonth") return null;
            return (
                <>
                    <span className="cc-daynum">{arg.dayNumberText}</span>
                    {!arg.isOther && (
                        <button
                            type="button"
                            className="cc-plus"
                            aria-label={`Book on ${format(arg.date, "d MMM")}`}
                            onClick={() =>
                                openBooking(
                                    startOfDay(arg.date),
                                    new Date(
                                        startOfDay(arg.date).getTime() +
                                            24 * 60 * 60 * 1000
                                    ),
                                    true
                                )
                            }
                        >
                            +
                        </button>
                    )}
                </>
            );
        },
        [openBooking]
    );

    const handleMoreLinkClick = useCallback(
        (arg) => {
            const items = (arg.allSegs || [])
                .map((seg) =>
                    events.find((ev) => String(ev.id) === String(seg.event.id))
                )
                .filter(Boolean);
            setMorePopover({ date: arg.date, items });
            // Truthy and not a view name => FullCalendar's own popover never
            // opens, which is why the MutationObserver that used to reposition
            // it is gone.
            return true;
        },
        [events]
    );

    /* ------------------------------------------------------------- render --*/

    const isSkeleton = loading || (!hasLoaded && Boolean(user?.id));
    const isErrorState = !isSkeleton && fetchError;
    const isEmptyState =
        !isSkeleton && !fetchError && (events?.length || 0) === 0;

    const meetingColour = (event) =>
        meetingTypes?.find((tp) => tp?.id === event?.extendedProps?.type)
            ?.color;

    let body;
    if (isSkeleton) {
        body =
            layoutMode === "agenda" ? (
                <AgendaSkeleton />
            ) : isMonthGrid ? (
                <MonthSkeleton />
            ) : (
                <TimeGridSkeleton columns={gridView === "timeGridDay" ? 1 : 7} />
            );
    } else if (isErrorState) {
        body = (
            <StateBlock
                icon="!"
                danger
                title={`We couldn't load ${periodLabel}`}
                body={
                    // §10.15's copy said the agenda is "cached from your last
                    // visit". There is no cache — the agenda renders whatever
                    // the last successful fetch left in state. Reworded so the
                    // UI stops asserting something untrue.
                    "The booking service didn't answer. Nothing has changed and nothing was booked — try again, or open the agenda, which still shows the meetings from the last successful load."
                }
                actions={
                    <>
                        <Box
                            component="button"
                            type="button"
                            sx={btnPrimary}
                            onClick={() =>
                                setUpdateTrigger((prev) => prev + 1)
                            }
                        >
                            Try again
                        </Box>
                        <Box
                            component="button"
                            type="button"
                            sx={btnDefault}
                            onClick={() => setViewMode("agenda")}
                        >
                            Open agenda
                        </Box>
                    </>
                }
            />
        );
    } else if (isEmptyState) {
        body = (
            <StateBlock
                icon="🗓"
                title={`Nothing booked in ${periodLabel}`}
                body={`${["Every room in SEA", officeAlias]
                    .filter(Boolean)
                    .join(
                        " "
                    )} is free. Drag across any day to claim a slot, or start from here.`}
                actions={
                    <>
                        <Box
                            component="button"
                            type="button"
                            sx={btnPrimary}
                            onClick={() =>
                                openBooking(
                                    new Date(),
                                    endOfDay(new Date()),
                                    false
                                )
                            }
                        >
                            Book a room
                        </Box>
                        <Box
                            component="button"
                            type="button"
                            sx={btnDefault}
                            onClick={() => setSelectedDate(new Date())}
                        >
                            Back to today
                        </Box>
                    </>
                }
            />
        );
    } else if (layoutMode === "agenda") {
        body = (
            <Agenda
                events={events}
                rooms={rooms}
                types={meetingTypes}
                onOpenEvent={openDetails}
            />
        );
    } else {
        body = (
            <CalendarStyled>
                <FullCalendar
                    weekends
                    editable
                    droppable
                    selectable
                    events={events}
                    ref={calendarRef}
                    height="auto"
                    expandRows={false}
                    rerenderDelay={10}
                    initialDate={selectedDate}
                    initialView={gridView}
                    firstDay={layout.weekStartsOn}
                    fixedWeekCount
                    // 2 bubbles then "+N more" (§10.11). `dayMaxEventRows`
                    // counts the link as a row, so it is `dayMaxEvents` that
                    // yields the two bubbles the 104px cell is built for.
                    dayMaxEvents={layout.monthEventsShown}
                    eventDisplay="block"
                    headerToolbar={false}
                    nowIndicator
                    allDayText="All day"
                    allDayMaintainDuration
                    // §10.13 asked for a 7am-7pm window, but clamping
                    // `slotMinTime`/`slotMaxTime` makes any meeting outside it
                    // INVISIBLE in week and day view — a booking system that
                    // hides bookings. The full 24 hours stays reachable and the
                    // design intent is expressed as an opening scroll position
                    // instead. (`scrollTime` only bites when FullCalendar owns
                    // a scroller; with `height="auto"` the page container does,
                    // so `scrollDayStartIntoView` below finishes the job.)
                    scrollTime={`${String(DAY_START_HOUR).padStart(
                        2,
                        "0"
                    )}:00:00`}
                    slotLabelInterval="01:00"
                    slotDuration={`00:${String(SLOT_MINUTES).padStart(
                        2,
                        "0"
                    )}:00`}
                    snapDuration={`00:${String(SLOT_MINUTES).padStart(
                        2,
                        "0"
                    )}:00`}
                    eventContent={renderEventContent}
                    eventDidMount={handleEventDidMount}
                    dayHeaderContent={renderDayHeader}
                    dayCellContent={renderDayCell}
                    slotLabelContent={(arg) => (
                        <span>{compactTime(arg.date)}</span>
                    )}
                    moreLinkClick={handleMoreLinkClick}
                    eventResizableFromStart
                    select={handleRangeSelect}
                    dateClick={handleDateClick}
                    eventDrop={handleEventUpdate}
                    eventClick={handleEventSelect}
                    eventResize={handleEventUpdate}
                    plugins={[
                        listPlugin,
                        dayGridPlugin,
                        timeGridPlugin,
                        interactionPlugin,
                    ]}
                />
            </CalendarStyled>
        );
    }

    return (
        <Box
            ref={containerRef}
            sx={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                scrollbarWidth: "thin",
                background: "var(--cc-grd)",
                color: "var(--cc-ink)",
                fontFamily: "var(--cc-sans)",
                fontSize: "15px",
                lineHeight: 1.5,
                padding:
                    "clamp(14px,2.4vw,22px) clamp(12px,2.6vw,24px) clamp(14px,2.4vw,22px)",
            }}
        >
            {/* ---------------- SEAM 2: booking / edit form frame ------------ */}
            {!isModalOpen && (
                <Dialog
                    open={openMeetingDialog}
                    onClose={handleCloseForm}
                    transitionDuration={DIALOG_TRANSITION}
                    sx={dialogFrameSx}
                    PaperProps={framePaperProps(
                        layout.dialogWidth.book,
                        meetingColour(selectedEvent)
                    )}
                >
                    {isPhone && <GrabHandle />}
                    <MeetingFourm
                        date={selectedDate}
                        meeting={
                            selectedRange
                                ? selectedRange
                                : selectedEvent?.id
                                ? selectedEvent?.extendedProps
                                : selectedEvent
                        }
                        rooms={rooms}
                        roomResources={roomResources}
                        resources={resources}
                        meetingTypes={meetingTypes}
                        update={update}
                        setUpdate={setUpdate}
                        handleCloseForm={handleCloseForm}
                        setUpdateTrigger={setUpdateTrigger}
                        updateMode={updateMode}
                        onClose={handleCloseForm}
                        locations={locations}
                    />
                </Dialog>
            )}

            {/* ---------------- SEAM 2: recurrence drag-warning frame -------- */}
            <Dialog
                open={showParentWarning}
                onClose={() => setShowParentWarning(false)}
                transitionDuration={DIALOG_TRANSITION}
                sx={dialogFrameSx}
                PaperProps={framePaperProps(
                    layout.dialogWidth.scope,
                    meetingColour(selectedEvent)
                )}
            >
                {isPhone && <GrabHandle />}
                <MeetingUpdateWarning
                    selectedEvent={selectedEvent}
                    setShowParentWarning={setShowParentWarning}
                    handleExit={handleExitWarning}
                    room={
                        rooms?.find(
                            (tp) => tp?.id == selectedEvent?.extendedProps?.room
                        )?.value
                    }
                    location={
                        locations?.find(
                            (tp) =>
                                tp?.officeid ==
                                selectedEvent?.extendedProps?.location
                        )?.Alias
                    }
                    color={
                        meetingTypes?.find(
                            (tp) => tp?.id == selectedEvent?.extendedProps?.type
                        )?.color
                    }
                />
            </Dialog>

            {/* --------------------------- the calendar card (§10.9) --------- */}
            <Box
                sx={{
                    background: "var(--cc-srf)",
                    borderRadius: "26px",
                    boxShadow: "var(--cc-sh2)",
                    overflow: "hidden",
                    animation: `${ccMotion.keyframes.card} ${ccMotion.dur.card}ms ${SP} ${ccMotion.delay.card}ms both`,
                    [PHONE]: { borderRadius: "22px" },
                }}
            >
                {/* Toolbar holds the mode toggle only — the banner owns the
                    date and the title (§10.10 / §15 #10). */}
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        flexWrap: "wrap",
                        padding: "13px 16px 11px",
                    }}
                >
                    <Box
                        role="group"
                        aria-label="Calendar layout"
                        sx={{
                            display: "flex",
                            background: "var(--cc-srf2)",
                            borderRadius: "99px",
                            padding: "3px",
                            gap: "2px",
                            [PHONE]: { width: "100%" },
                        }}
                    >
                        {[
                            {
                                key: "grid",
                                label: isMonthGrid ? "Grid" : "Timeline",
                            },
                            { key: "agenda", label: "Agenda" },
                        ].map((item) => (
                            <Box
                                key={item.key}
                                component="button"
                                type="button"
                                aria-pressed={layoutMode === item.key}
                                disabled={isPhone && item.key === "grid"}
                                onClick={() => setViewMode(item.key)}
                                sx={{
                                    border: 0,
                                    background: "transparent",
                                    borderRadius: "99px",
                                    padding: "6px 15px",
                                    cursor: "pointer",
                                    fontFamily: "var(--cc-sans)",
                                    ...ccType.modeToggle,
                                    color: "var(--cc-mute)",
                                    transition: `color 200ms, background 250ms ${SP}`,
                                    "&[aria-pressed='true']": {
                                        background: "var(--cc-srf)",
                                        color: "var(--cc-ink)",
                                        boxShadow: "var(--cc-sh1)",
                                    },
                                    "&:disabled": {
                                        opacity: 0.4,
                                        cursor: "default",
                                    },
                                    "&:focus-visible": FOCUS_RING,
                                    [PHONE]: { flex: 1 },
                                }}
                            >
                                {item.label}
                            </Box>
                        ))}
                    </Box>
                </Box>

                {body}
            </Box>

            {/* --------------------- SEAM 2: details frame (§10.30) ---------- */}
            <Dialog
                open={isModalOpen}
                onClose={handleModalClose}
                transitionDuration={DIALOG_TRANSITION}
                sx={dialogFrameSx}
                PaperProps={framePaperProps(
                    layout.dialogWidth.details,
                    meetingColour(selectedEvent)
                )}
            >
                {isPhone && <GrabHandle />}
                {isModalOpen && selectedEvent && (
                    <DisplayMeeting
                        handleUpdateEvent={handleUpdateEvent}
                        handleExit={handleModalClose}
                        meeting={{
                            ...selectedEvent?.extendedProps,
                            start_time: selectedEvent.start,
                            end_time: selectedEvent.end,
                        }}
                        types={meetingTypes}
                        rooms={rooms}
                        roomResources={roomResources}
                        resources={resources}
                        locations={locations}
                        setUpdate={setUpdateTrigger}
                        setUpdateMode={setUpdateMode}
                    />
                )}
            </Dialog>

            {/* ------------------- SEAM 2: our own "+N more" popover (§10.28) - */}
            <Dialog
                open={Boolean(morePopover)}
                onClose={() => setMorePopover(null)}
                transitionDuration={DIALOG_TRANSITION}
                sx={dialogFrameSx}
                PaperProps={{
                    style: { "--cc-dw": `${layout.dialogWidth.popover}px` },
                    sx: {
                        ...dialogPaperSx,
                        maxWidth: `min(var(--cc-dw, 310px), 86vw)`,
                        borderRadius: "22px",
                        boxShadow: "var(--cc-sh-pop)",
                        animation: `${ccMotion.keyframes.dialog} ${ccMotion.dur.popover}ms ${SP}`,
                        [PHONE]: {
                            ...dialogPaperSx[PHONE],
                            maxWidth: "none",
                            width: "100%",
                        },
                    },
                }}
            >
                {morePopover && (
                    <>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: "9px",
                                padding: "13px 15px 10px",
                            }}
                        >
                            <Box sx={{ ...ccType.popTitle }}>
                                {format(morePopover.date, "EEE, MMM d")}
                            </Box>
                            <Box
                                sx={{
                                    marginLeft: "auto",
                                    ...ccType.popCount,
                                    color: "var(--cc-mute)",
                                }}
                            >
                                {`${morePopover.items.length} ${
                                    morePopover.items.length === 1
                                        ? "meeting"
                                        : "meetings"
                                }`}
                            </Box>
                            <Box
                                component="button"
                                type="button"
                                aria-label="Close"
                                onClick={() => setMorePopover(null)}
                                sx={{
                                    width: "26px",
                                    height: "26px",
                                    flex: "none",
                                    border: 0,
                                    borderRadius: "99px",
                                    background: "var(--cc-srf2)",
                                    color: "var(--cc-mute)",
                                    fontSize: "13px",
                                    cursor: "pointer",
                                    display: "grid",
                                    placeItems: "center",
                                    transition: `transform 300ms ${SP}, background 200ms, color 200ms`,
                                    [HOVER]: {
                                        "&:hover": {
                                            background: "var(--cc-wash)",
                                            color: "var(--cc-red)",
                                            transform: "rotate(90deg)",
                                        },
                                    },
                                    "&:focus-visible": FOCUS_RING,
                                }}
                            >
                                ✕
                            </Box>
                        </Box>
                        <Box
                            sx={{
                                padding: "0 11px 13px",
                                display: "grid",
                                gap: "5px",
                                maxHeight: "min(320px, 48vh)",
                                overflowY: "auto",
                            }}
                        >
                            {morePopover.items.map((ev, index) => {
                                const props = ev.extendedProps || {};
                                const fullRoomName =
                                    (rooms || []).find(
                                        (rm) => rm?.id === props.room
                                    )?.value || props.roomName;
                                const typeName = meetingTypes?.find(
                                    (tp) => tp?.id === props.type
                                )?.value;
                                return (
                                    <MeetingBubble
                                        key={ev.id}
                                        as="button"
                                        variant="popover"
                                        allDay={Boolean(ev.allDay)}
                                        color={ev.backgroundColor}
                                        name={ev.title}
                                        meta={bubbleMeta({
                                            variant: "popover",
                                            roomName: props.roomName,
                                            start: ev.start,
                                            allDay: Boolean(ev.allDay),
                                        })}
                                        repeats={Boolean(props.recurrence_id)}
                                        itSupport={Boolean(props.it_support)}
                                        delay={
                                            ccMotion.delay.popStep * index
                                        }
                                        ariaLabel={bubbleAriaLabel({
                                            name: ev.title,
                                            fullRoomName,
                                            start: ev.start,
                                            end: ev.end,
                                            allDay: Boolean(ev.allDay),
                                            typeName,
                                        })}
                                        onClick={() => openDetails(ev)}
                                    />
                                );
                            })}
                        </Box>
                    </>
                )}
            </Dialog>
        </Box>
    );
};

export default Calendar;
