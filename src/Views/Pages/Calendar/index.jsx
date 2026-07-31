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
    eachDayOfInterval,
    endOfDay,
    endOfMonth,
    endOfWeek,
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
    // fits, top-clamped when it does not. The Paper is now bounded to the
    // container, so the container never actually scrolls — the dialog BODY does
    // (ConcourseDialogKit's scroll contract). `overflow-y: auto` stays only as a
    // backstop (§10.17).
    "& .MuiDialog-container": {
        // MANDATORY. The app mounts no CssBaseline, so box-sizing is the
        // initial `content-box`: MUI's `height:100%` plus the padding below
        // makes this box up to 104px TALLER than the window, and `margin:auto`
        // then centres the Paper on a box whose middle sits up to 76px below
        // the middle of the window — which is why the dialog looked off-centre
        // and its footer was clipped by the bottom edge. It also made the
        // container's own `overflow-y:auto` mint a real scrollbar, which ate
        // 15px off the right and shifted the Paper half that far left.
        boxSizing: "border-box",
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
    // Bounded to the container's content box (i.e. the window minus the clamped
    // overlay padding). This is what lets ConcourseDialogKit make DialogBody the
    // one scroll region: the frame can never outgrow the window, so the header
    // and footer never move and the footer is never clipped. `maxHeight:"none"`
    // was the reason a tall Book/Edit form ran off the bottom edge.
    maxHeight: "100%",
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
    // The Advanced two-column expansion (§8 "Side menu (width) → 400ms sp").
    // MeetingForum's SidePane stamps `data-cc-pane="open"|"closed"` on itself,
    // so the frame widens itself from the content with no prop drilling and no
    // state lifted out of the form. 980px is the same number
    // ConcourseDialogKit's SIDE_PANE_MIN uses — THE TWO MUST MOVE TOGETHER.
    // 560 (form) + 340 (pane) = 900, + 2 x 18px overlay padding = 936 <= 980.
    transition: `max-width ${ccMotion.dur.side}ms ${SP}`,
    "@media (min-width:980px)": {
        '&:has([data-cc-pane="open"])': {
            maxWidth: "var(--cc-dw-wide, var(--cc-dw, 548px))",
        },
    },
    [PHONE]: {
        maxWidth: "none",
        margin: "auto 0 0",
        borderRadius: "26px 26px 0 0",
        maxHeight: "100%",
        // Was `overflowY: "auto"`, which scrolled the whole sheet. The sheet
        // frame now stays put and its body scrolls internally, which is what
        // the user asked for on mobile. The bottom-sheet geometry above
        // (margin/radius/maxHeight/cc-sheet) is untouched.
        overflow: "hidden",
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
            // The Paper is `display:flex; flex-direction:column` and is now
            // capped at `maxHeight:100%`, so its shrinkable children are shared
            // out proportionally when the form overflows. Without this the
            // handle collapses from 4px to <2px (measured) on the phone sheet.
            flexShrink: 0,
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
const framePaperProps = (width, color, wideWidth) => ({
    style: {
        "--cc-dw": `${width}px`,
        // Only the booking / edit frame passes this: the width the frame grows
        // to when MeetingForum's Advanced pane opens beside the form.
        // 560 (form column, = --cc-dw) + 340 (SIDE_PANE_WIDTH) = 900.
        ...(wideWidth ? { "--cc-dw-wide": `${wideWidth}px` } : null),
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

/* The agenda used to end each day header with a free-time reading —
 * "3h 15m free", or "fully booked" when the meetings the CURRENT USER can see
 * happened to cover 7am-7pm. Both readings were untrue. `GetMeetingsByUserId`
 * returns one user's meetings, not the building's bookings, so a day with one
 * long meeting in one room claimed every room was taken. There is no
 * room-availability endpoint to compute a real figure from, so the claim is
 * gone rather than reworded — the same call that was already made about the
 * rejected "free right now" strip. The "N meetings" count carries the density
 * signal on its own.
 * ========================================================================*/

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

/**
 * The agenda's day header doubles as that day's "book here" control.
 *
 * THE HEADER, NOT THE WHOLE CARD. The meetings below it are buttons of their
 * own: wrapping the card would nest one control inside another (invalid, and
 * unusable from the keyboard) and would put a day-level handler in every
 * bubble's bubbling path — which is precisely how the injected timeGrid
 * day-cell listener used to hijack meeting clicks and open the booking form
 * against a bare range (plan.md "Root cause 1"). Header and bubbles are
 * siblings here, so the two can never collide.
 */
const agendaDayBtnSx = {
    appearance: "none",
    border: 0,
    margin: 0,
    width: "100%",
    font: "inherit",
    color: "inherit",
    textAlign: "left",
    cursor: "pointer",
    background: "transparent",
    display: "flex",
    alignItems: "center",
    gap: "11px",
    padding: "11px 14px 9px",
    transition: `background ${ccMotion.dur.colour}ms`,
    // Inset ring: the card clips (`overflow: hidden`), so the usual 2px
    // outline OFFSET would be sliced off along the card's top edge.
    "&:focus-visible": {
        outline: "2px solid var(--cc-red)",
        outlineOffset: "-2px",
    },
    [HOVER]: {
        "&:hover": {
            background: "var(--cc-wash)",
            "& .cc-agenda-book": { color: "var(--cc-red)" },
        },
    },
};

/** Always visible, not hover-only: the agenda is the phone layout (§9). */
const agendaBookHintSx = {
    marginLeft: "auto",
    flex: "none",
    paddingLeft: "8px",
    color: "var(--cc-mute)",
    transition: `color ${ccMotion.dur.colour}ms`,
    ...ccType.agendaSub,
    fontWeight: 700,
};

/* Hoisted out of the render loop. A month agenda draws every day of the month,
 * so these recipes are built ~31 times per render if they live inline — and
 * emotion re-serialises each one. Only the ring has two variants. */
const agendaCardSx = {
    background: "var(--cc-srf2)",
    borderRadius: "20px",
    overflow: "hidden",
};

const agendaRingSx = {
    width: "38px",
    height: "38px",
    borderRadius: "99px",
    display: "grid",
    placeItems: "center",
    flex: "none",
    boxShadow: "var(--cc-sh1)",
    background: "var(--cc-srf)",
    color: "var(--cc-ink)",
    ...ccType.agendaRing,
};

/** Today keeps the red ring — the one thing that has to stay findable now
 *  that the list is a whole month long. */
const agendaRingTodaySx = {
    ...agendaRingSx,
    background: "var(--cc-red)",
    color: "var(--cc-on-red)",
};

const agendaTextColSx = { minWidth: 0 };
const agendaDaySx = { ...ccType.agendaDay };
const agendaSubSx = { ...ccType.agendaSub, color: "var(--cc-mute)" };

/**
 * A day with nothing on it: one quiet line, indented to the day name's column
 * (14px padding + 38px ring + 11px gap).
 *
 * The wording is deliberate. `GetMeetingsByUserId` returns ONE USER'S
 * meetings, not the building's bookings, so "free" or "available" would be a
 * fifth untrue availability claim on this page. This line says only what is
 * true: nothing of yours is on this day.
 */
const agendaEmptySx = {
    padding: "0 14px 12px 63px",
    ...ccType.agendaSub,
    color: "var(--cc-mute)",
};

const agendaListSx = { display: "grid", gap: "5px", padding: "0 10px 11px" };

const agendaRowSx = {
    display: "grid",
    gridTemplateColumns: "112px 1fr",
    gap: "10px",
    alignItems: "center",
    [PHONE]: { gridTemplateColumns: "1fr", gap: "3px" },
};

const agendaTimeSx = {
    ...ccType.agendaTime,
    color: "var(--cc-mute)",
    textAlign: "right",
    [PHONE]: { textAlign: "left", paddingLeft: "2px" },
};

// The entrance stagger restarts inside every day card, so a month-long list
// cannot crawl on its own. Capped anyway: one very busy day would otherwise
// hold its last bubble back by 60ms x N.
const AGENDA_STAGGER_CAP = 6;

const Agenda = ({ events, rooms, types, days, onOpenEvent, onBookDay }) => {
    const rows = useMemo(() => {
        const map = new Map();
        const at = (date) => {
            const key = format(date, "yyyy-MM-dd");
            if (!map.has(key)) {
                map.set(key, { key, date: startOfDay(date), items: [] });
            }
            return map.get(key);
        };
        // EVERY day of the period first. A day with nothing on it is exactly
        // the day you want to book, and below 620px the agenda is the only
        // view there is (§9) — with no card there was no way to reach one.
        const period = days || [];
        period.forEach(at);
        // Then the meetings, CLIPPED to the period. `GetAllUserCanSee` widens
        // its query by a week on each side, and listing those days would put a
        // 32-day list under a banner reading "26 – 01 Aug". The grid for this
        // view does not offer them either: the week and day grids stop at
        // their own edges, and the month grid's spill cells are `isOther`, so
        // they get no quick-add `+`. The agenda now covers exactly the days
        // this view lets you book. (With no period — a malformed date — it
        // falls back to the days the meetings themselves name, so nothing can
        // vanish.)
        (events || []).forEach((ev) => {
            const start = new Date(ev.start);
            if (Number.isNaN(start.getTime())) return;
            const row = period.length
                ? map.get(format(start, "yyyy-MM-dd"))
                : at(start);
            if (row) row.items.push(ev);
        });
        return Array.from(map.values())
            .sort((a, b) => a.date - b.date)
            .map((d) => ({
                ...d,
                items: d.items
                    .slice()
                    .sort((a, b) => new Date(a.start) - new Date(b.start)),
            }));
    }, [days, events]);

    return (
        <Box sx={{ padding: "0 12px 14px", display: "grid", gap: "12px" }}>
            {rows.map((day) => {
                const today = isSameDay(day.date, new Date());
                const count = day.items.length;
                return (
                    <Box key={day.key} sx={agendaCardSx}>
                        <Box
                            component="button"
                            type="button"
                            aria-label={`Book on ${format(
                                day.date,
                                "EEEE d MMM"
                            )}`}
                            onClick={() => onBookDay?.(day.date)}
                            sx={agendaDayBtnSx}
                        >
                            <Box sx={today ? agendaRingTodaySx : agendaRingSx}>
                                {getDate(day.date)}
                            </Box>
                            <Box sx={agendaTextColSx}>
                                <Box sx={agendaDaySx}>
                                    {format(day.date, "EEEE")}
                                    {today ? " · today" : ""}
                                </Box>
                                <Box sx={agendaSubSx}>
                                    {count
                                        ? `${format(day.date, "MMM yyyy")} · ${count} ${
                                              count === 1
                                                  ? "meeting"
                                                  : "meetings"
                                          }`
                                        : format(day.date, "MMM yyyy")}
                                </Box>
                            </Box>
                            <Box
                                component="span"
                                className="cc-agenda-book"
                                aria-hidden="true"
                                sx={agendaBookHintSx}
                            >
                                + Book
                            </Box>
                        </Box>

                        {count === 0 ? (
                            <Box sx={agendaEmptySx}>
                                Nothing on your calendar
                            </Box>
                        ) : (
                            <Box sx={agendaListSx}>
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
                                        <Box key={ev.id} sx={agendaRowSx}>
                                            <Box sx={agendaTimeSx}>
                                                {ev.allDay
                                                    ? "all day"
                                                    : `${displayTime(
                                                          ev.start
                                                      )} – ${displayTime(
                                                          ev.end
                                                      )}`}
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
                                                    Math.min(
                                                        index,
                                                        AGENDA_STAGGER_CAP
                                                    )
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
                        )}
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
    // Printing needs a DIFFERENT event cap — see the `views` prop below.
    const [isPrinting, setIsPrinting] = useState(false);
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

    /**
     * The days the agenda lists: EXACTLY the period the banner's date switcher
     * is showing, derived from the same route `range` and `selectedDate` the
     * fetch above uses — month -> that calendar month, week -> that
     * Sunday-first week, day -> the one day. `formatPeriod` in
     * Banner/Components/period.js builds its label from `startOfMonth` /
     * `startOfWeek(WEEK_STARTS_ON = 0)` / the day itself, so the two read the
     * same period by construction. `layout.weekStartsOn` and that
     * `WEEK_STARTS_ON` are both Sunday and MUST move together.
     *
     * Weekends are included and past days stay bookable, because that is what
     * the month grid already allows — it renders `weekends`, puts its quick-add
     * `+` on every day of the month including days gone by, and sets no
     * `validRange`. The server (`CanUserBook`) remains the authority on what
     * may actually be booked; a client-side rule here and nowhere else would
     * just make the two entry points disagree.
     */
    const periodDays = useMemo(() => {
        const anchor = new Date(selectedDate);
        if (Number.isNaN(anchor.getTime())) return [];
        if (range === "Month") {
            return eachDayOfInterval({
                start: startOfMonth(anchor),
                end: endOfMonth(anchor),
            });
        }
        if (range === "Week") {
            const opts = { weekStartsOn: layout.weekStartsOn };
            return eachDayOfInterval({
                start: startOfWeek(anchor, opts),
                end: endOfWeek(anchor, opts),
            });
        }
        return [startOfDay(anchor)];
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

    // The effect that used to scroll `containerRef` to the 7am slat is gone.
    // It only existed because `height="auto"` set `isHeightAuto`, which makes
    // FullCalendar's ScrollGrid non-liquid — it owned no scroller, so its own
    // `scrollTime` was inert and the page container had to be scrolled by hand.
    // The calendar now takes a definite height (`height="100%"` below), so
    // FullCalendar owns a real scroller again and `scrollTime` places the view
    // itself.

    // Keep FullCalendar's view in step with the route.
    //
    // The call is handed to a microtask on purpose — this is the fix for the
    // `flushSync was called from inside a lifecycle method` warning that used
    // to arrive in bursts of ~40-175 on every month/week/day switch. The chain:
    //
    //   changeView -> CalendarImpl.batchRendering -> renderRunner.resume()
    //   -> DelayedRunner.tryDrain() — which drains SYNCHRONOUSLY and ignores
    //   `rerenderDelay`, unlike every other dispatch (gotoDate included, which
    //   is why that one never warned) -> FullCalendar's inner preact render
    //   -> every ContentContainer re-registers itself through
    //   CustomRenderingStore.handle(), and `Store.set` notifies subscribers
    //   ONCE PER CONTAINER -> @fullcalendar/react answers each notification
    //   with ReactDOM.flushSync.
    //
    // React runs passive effects with CommitContext set, so a flushSync raised
    // from an effect body is refused and warned about instead of flushing.
    // Worse, the adapter only records `lastRequestTimestamp` inside the
    // setState callback, so while React is refusing it that timestamp never
    // advances — the adapter's own "one flushSync, then coalesce for 100ms"
    // fast path is defeated and EVERY container in the incoming view takes the
    // flushSync branch. Hence one warning per bubble, day cell, day header and
    // slot label, on every view change.
    //
    // Deferring by a microtask lets the commit unwind first. The adapter then
    // flushes once and coalesces the rest, exactly as it was designed to, and
    // the view still changes before paint so nothing flickers. A timeout or a
    // rAF would work too but would show the old view for a frame.
    useEffect(() => {
        const calendarApi = calendarRef.current?.getApi();
        if (!calendarApi || calendarApi.view?.type === gridView) return;
        let cancelled = false;
        queueMicrotask(() => {
            if (cancelled) return;
            const api = calendarRef.current?.getApi();
            if (api && api.view?.type !== gridView) api.changeView(gridView);
        });
        return () => {
            cancelled = true;
        };
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

    /**
     * THE MONTH GRID CANNOT USE ITS NORMAL EVENT CAP WHILE PRINTING.
     *
     * `dayMaxEvents: true` (the height-measured cap) only survives when
     * `expandRows` is on, and `Table.render` throws the cap away entirely when
     * it is not — `if (limitViaBalanced && !expandRows) { dayMaxEvents = null }`
     * (@fullcalendar/daygrid internal.js:825-833). Printing is exactly that
     * case: `isHeightAuto` is `forPrint || ...`, and `DayTableView` derives
     * `expandRows: !isHeightAuto`. So on Ctrl+P every meeting in a day would be
     * placed with no limit at all, in rows that cannot grow — the overflow this
     * whole layout exists to prevent, arriving through the one door it does not
     * cover.
     *
     * A NUMBER is immune: `limitViaBalanced` is false for a numeric cap, so the
     * branch above never fires and `maxStackCnt` survives into print. Swapping
     * to one for the duration is the whole fix. This mirrors how FullCalendar
     * tracks printing itself (`handleBeforePrint`/`handleAfterPrint`), so it is
     * as timely as the library's own print support.
     */
    useEffect(() => {
        const before = () => setIsPrinting(true);
        const after = () => setIsPrinting(false);
        window.addEventListener("beforeprint", before);
        window.addEventListener("afterprint", after);
        return () => {
            window.removeEventListener("beforeprint", before);
            window.removeEventListener("afterprint", after);
        };
    }, []);

    /* ------------------------------------------------------- booking flow --*/

    const openBooking = useCallback(
        (start, end, allDay) => {
            // Booking always wins over the month grid's pending day list, the
            // same way opening a meeting does. The quick-add "+" sits inside a
            // day cell and FullCalendar's `isValidDateDownEl` does not exclude
            // it (only `.fc-event`, `.fc-more-link`, `a[data-navlink]` and
            // `.fc-popover`), so a click on it fires `dateClick` too — which in
            // the month grid has already queued the day list by the time this
            // runs. Without this the user asks to book and gets the day list
            // stacked on top of the form they asked for.
            if (dateClickTimer.current) {
                clearTimeout(dateClickTimer.current);
                dateClickTimer.current = null;
            }
            setMorePopover(null);
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
     * `App.js`; every increment is one click, and it is raised even when the
     * click happened on another page — App navigates here and this consumes the
     * intent on mount. The ref keeps this keyed to the click and not to
     * `openBooking`'s identity, which changes whenever the view does — without
     * it, switching month/week/day would re-open the dialog. Same call as the
     * empty state's "Book a room" so the two buttons with the same label behave
     * identically.
     */
    const handledBookIntent = useRef(0);
    useEffect(() => {
        if (!bookIntent || handledBookIntent.current === bookIntent) return;
        // Consumed either way: a click that lands while the dialog is already
        // up must not re-open it, which would throw away the range the form is
        // holding.
        handledBookIntent.current = bookIntent;
        if (openMeetingDialog) return;
        openBooking(new Date(), endOfDay(new Date()), false);
    }, [bookIntent, openBooking, openMeetingDialog]);

    /**
     * Everything booked on one day, in time order, for the day list dialog. The
     * same shape the "+N more" link produces, so one dialog serves both: that
     * link passes the occurrences FullCalendar hid, this passes the whole day.
     *
     * The test is an overlap, not an equality, so an all-day or multi-day
     * booking shows on every day it covers — an all-day event's `end` is
     * exclusive, which `> dayStart` already handles.
     *
     * Re-opening the SAME day is a no-op rather than a fresh state object. A
     * month click reaches this from both `select` and `dateClick`, and handing
     * the dialog a new object would replay the staggered entrance of every
     * bubble in it for the second call.
     */
    const openDayList = useCallback(
        (date) => {
            const dayStart = startOfDay(date);
            const dayEnd = endOfDay(date);
            const items = (events || [])
                .filter((ev) => {
                    const start = new Date(ev.start);
                    if (isNaN(start.getTime())) return false;
                    const end = ev.end ? new Date(ev.end) : start;
                    return start <= dayEnd && end > dayStart;
                })
                .sort((a, b) => new Date(a.start) - new Date(b.start));
            setMorePopover((prev) =>
                prev && isSameDay(prev.date, dayStart)
                    ? prev
                    : { date: dayStart, items }
            );
        },
        [events]
    );

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
            // A PLAIN CLICK ON A MONTH CELL ALSO ARRIVES HERE, as a selection
            // of exactly that one day — FullCalendar raises `select` for it and
            // not only for a dragged range. `dateClick` fires for the same
            // click, so the two handlers have to agree on what a month click
            // means or the user gets both dialogs: this one opened the booking
            // form, and `dateClick`'s deferred day list then landed on top of
            // it. One day means the day list (it carries its own "Book a room");
            // two or more means the user drew a range and wants the form.
            if (arg.view?.type === "dayGridMonth") {
                const days = Math.round((end - start) / 86400000);
                if (days <= 1) {
                    calendarRef.current?.getApi()?.unselect();
                    openDayList(start);
                    return;
                }
            }
            if (!arg.allDay) {
                const minutes = Math.round((end - start) / 60000);
                if (minutes <= SLOT_MINUTES) {
                    end = addMinutes(start, CLICK_BOOKING_MINUTES);
                }
            }
            openBooking(start, end, arg.allDay);
        },
        [openBooking, openDayList]
    );

    /**
     * Single click on a day. FullCalendar fires `dateClick` before `select`, and
     * `select` only fires when the pointer actually moved — so the open is
     * deferred by a tick and cancelled if a real selection follows. That makes
     * both paths deterministic instead of order-dependent.
     *
     * In the MONTH grid the click opens that day's list rather than the booking
     * form: the cell is small, it can only show a couple of bookings, and going
     * straight to the form hid what was already there. The list carries its own
     * "Book a room". Everywhere else — the time grids, the agenda's day header
     * — a click still books the slot it landed on, and dragging a range in the
     * month grid still goes straight to the form.
     */
    const handleDateClick = useCallback(
        (arg) => {
            const isMonthGridClick = arg.view?.type === "dayGridMonth";
            const start = arg.date;
            const allDay = Boolean(arg.allDay);
            const end = allDay
                ? new Date(start.getTime() + 24 * 60 * 60 * 1000)
                : addMinutes(start, CLICK_BOOKING_MINUTES);
            if (dateClickTimer.current) clearTimeout(dateClickTimer.current);
            dateClickTimer.current = setTimeout(() => {
                dateClickTimer.current = null;
                if (isMonthGridClick) {
                    openDayList(start);
                } else {
                    openBooking(start, end, allDay);
                }
            }, 0);
        },
        [openBooking, openDayList]
    );

    /**
     * Agenda day header -> a booking on that day. It goes through
     * `handleDateClick` with the same argument shape FullCalendar hands it for
     * a month day cell (`date` at midnight, `allDay: true`), so the agenda and
     * the month grid cannot drift apart — and it inherits the deferral that
     * keeps `dateClick` and `select` from both firing.
     */
    const handleAgendaDayClick = useCallback(
        (date) => handleDateClick({ date: startOfDay(date), allDay: true }),
        [handleDateClick]
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
            // `arg.text`, NOT `format(arg.date, "EEE")`. When a header stands
            // for a day of the week rather than a real date, FullCalendar hands
            // us a UTC-anchored MARKER (Sun = 1970-01-04T00:00:00Z — see
            // TableDowCell in @fullcalendar/core), while date-fns reads LOCAL
            // fields. West of Greenwich that marker resolves to the previous
            // day, so every label rendered one column to the left of the dates
            // it belongs to (SAT SUN MON... over a Sunday-first grid).
            // `arg.text` is the same marker formatted by the dateEnv that laid
            // the columns out, so label and column can never disagree — and it
            // follows `firstDay`/locale on its own.
            return <span className="cc-dow">{arg.text}</span>;
        }
        // Week/day headers stand for real dates, and there FullCalendar passes
        // `dateEnv.toDate(marker)` — a genuine local Date. Formatting it with
        // date-fns is correct.
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
            // Built from the day, not from `arg.allSegs`: the link and a click
            // on the cell itself then open the same list from the same source,
            // and it cannot inherit FullCalendar's own idea of which segments
            // belong to which cell.
            openDayList(arg.date);
            // Truthy and not a view name => FullCalendar's own popover never
            // opens, which is why the MutationObserver that used to reposition
            // it is gone.
            return true;
        },
        [openDayList]
    );

    /* ------------------------------------------------------------- render --*/

    const isSkeleton = loading || (!hasLoaded && Boolean(user?.id));
    const isErrorState = !isSkeleton && fetchError;
    // The agenda has no empty screen any more: it lists every day of the
    // period, so "no meetings" reads as a column of quiet, bookable day cards.
    // That is deliberate — below 620px the agenda is the only view (§9), and
    // the state block's single CTA could only ever book TODAY. The grid keeps
    // its state block, having no such affordance.
    const isEmptyState =
        !isSkeleton &&
        !fetchError &&
        (events?.length || 0) === 0 &&
        layoutMode !== "agenda";

    const meetingColour = (event) =>
        meetingTypes?.find((tp) => tp?.id === event?.extendedProps?.type)
            ?.color;

    /**
     * Does the card take the whole page instead of hugging its content?
     *
     * Only the grid needs it, and only the grid gets it: giving FullCalendar a
     * definite height is what stops the month grid from overflowing the page
     * (the scroll moves INSIDE the calendar) and what gives week/day a scroller
     * `scrollTime` can drive. The agenda is an open-ended list that should keep
     * scrolling the page, and the empty/error cards should keep hugging. The
     * skeleton is included so the card does not resize when the data lands.
     */
    const fillHeight = layoutMode === "grid" && !isErrorState && !isEmptyState;

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
                title={`Nothing on your calendar for ${periodLabel}`}
                body="Drag across any day to claim a slot, or start from here."
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
                days={periodDays}
                onOpenEvent={openDetails}
                onBookDay={handleAgendaDayClick}
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
                    // A DEFINITE height, not "auto". "auto" made the grid grow
                    // past the viewport and push the page into a scrollbar, and
                    // it set `isHeightAuto`, which leaves FullCalendar without
                    // a scroller of its own. "100%" resolves against
                    // CalendarStyled (a definite-height flex item all the way
                    // up to App.js's 100vh shell), so: the card fits the page,
                    // month rows expand to fill it — `DayTableView` derives its
                    // own `expandRows` from `!isHeightAuto`, and `cellMinHeight`
                    // stays null below 7 rows, so a month row is exactly a
                    // sixth of the card and nothing imposes a floor on it (the
                    // @container tiers are what keep a short row usable) — and
                    // week/day get a real internal scroller that `scrollTime`
                    // can place.
                    height="100%"
                    expandRows={false}
                    rerenderDelay={10}
                    initialDate={selectedDate}
                    initialView={gridView}
                    firstDay={layout.weekStartsOn}
                    fixedWeekCount
                    // The all-day rails in week/day view: a fixed cap, because
                    // those rails are not height-constrained the way a month
                    // cell is. The month grid overrides this — see `views`.
                    dayMaxEvents={layout.monthEventsShown}
                    // THE MONTH GRID COUNTS BY HEIGHT, NOT BY EVENTS (§10.11).
                    //
                    // `true` is the ONLY value that consults cell height. A
                    // NUMBER sets `maxStackCnt`, leaves `hiddenConsumes` false
                    // and never even computes `maxContentHeight`
                    // (`limitByContentHeight`, daygrid/internal.js:659) — so it
                    // caps by count and reserves nothing for the link. `false`
                    // removes FullCalendar's fit decision altogether and puts
                    // the body in unbalanced mode. Neither is what we want.
                    //
                    // WHY IT NOW FITS EXACTLY. FullCalendar's only overflow
                    // guard is `levelCoord + thickness <= maxCoord`
                    // (core/internal-common.js:5843), where `maxCoord` is
                    // `td.bottom - dayEvents.top` and `thickness` is the
                    // harness's measured rect. Both edges are now the design's
                    // own edges, in CalendarStyled.jsx:
                    //   * the <td> has NO padding-bottom and the frame has NO
                    //     padding-bottom, so `td.bottom` IS the card's painted
                    //     bottom edge;
                    //   * the card's bottom inset is a `margin-bottom` on
                    //     `.fc-daygrid-event`, INSIDE the harness, so it is part
                    //     of `thickness`.
                    // Therefore every bubble ends exactly one gap above the card
                    // floor, with zero residual, and the "+N more" row — whose
                    // slot is freed by `hiddenConsumes` force-hiding one entry —
                    // clears it by (harness height - link height), which is
                    // 25.5 / 21 / 15.5 / 12px across the four tiers.
                    //
                    // `dayMaxEvents: true` needs `expandRows`, which the month
                    // view derives for itself (`expandRows: !isHeightAuto` in
                    // DayTableView, daygrid/internal.js:933) — the definite
                    // `height="100%"` above is what makes that true, and it is
                    // why the `expandRows={false}` prop does not reach this grid.
                    //
                    // There is NO cell floor: the frame is `minHeight: 0` and
                    // FullCalendar's `cellMinHeight` is null below 7 rows. Two
                    // bubbles + the link is delivered by the @container tier
                    // ladder, whose thresholds are solved from that fit — see
                    // `monthCell` in concourse.js.
                    //
                    // ...except while printing, where the measured cap is
                    // discarded by the library and a numeric one is not. See
                    // the `beforeprint` effect above.
                    views={{
                        dayGridMonth: {
                            dayMaxEvents: isPrinting
                                ? layout.monthEventsShown
                                : true,
                        },
                    }}
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
                    // instead. `scrollTime` only bites when FullCalendar owns a
                    // scroller, which the definite `height` above restores.
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
                // A column so the card below can claim the leftover height.
                // `overflowY` stays as the safety valve for the states that
                // still hug their content (agenda, empty, error) and for
                // viewports too short for the grid's own floor.
                display: "flex",
                flexDirection: "column",
                overflowY: "auto",
                overflowX: "hidden",
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
                        meetingColour(selectedEvent),
                        // 560 (form) + 340 (ConcourseDialogKit SIDE_PANE_WIDTH)
                        // — the width this frame grows to when Advanced opens
                        // as a second column at >= 980px.
                        layout.dialogWidth.book + 340
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
                    // Never let the flex parent squash the states that hug
                    // their content — they scroll the page instead.
                    flexShrink: 0,
                    animation: `${ccMotion.keyframes.card} ${ccMotion.dur.card}ms ${SP} ${ccMotion.delay.card}ms both`,
                    [PHONE]: { borderRadius: "22px" },
                    // `flex` after `flexShrink` on purpose: the shorthand resets
                    // it. In grid mode the card takes exactly the page height.
                    ...(fillHeight
                        ? {
                              flex: 1,
                              minHeight: 0,
                              display: "flex",
                              flexDirection: "column",
                          }
                        : null),
                }}
            >
                {/* Toolbar holds the mode toggle only — the banner owns the
                    date and the title (§10.10 / §15 #10).

                    At <=620px (`bp.sheet`, the same breakpoint that pins
                    `layoutMode` to "agenda") the grid is not rendered at all,
                    so the toggle has exactly one reachable option. It used to
                    render with "Grid" disabled, which offers the user a control
                    they cannot use. The whole toolbar row goes with it — hiding
                    only the group would leave its 13/11px padding behind as an
                    empty strip above the agenda. `isPhone` rather than the
                    PHONE media query on purpose: a display:none element would
                    still occupy the toolbar's flex layout at the edge case
                    where the two disagree. */}
                {!isPhone && (
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            flexWrap: "wrap",
                            flexShrink: 0,
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
                                        "&:focus-visible": FOCUS_RING,
                                    }}
                                >
                                    {item.label}
                                </Box>
                            ))}
                        </Box>
                    </Box>
                )}

                {/* In grid mode this is the definite-height box FullCalendar's
                    `height="100%"` resolves against, and the only thing that
                    scrolls if a very busy month still will not fit. Left
                    unstyled otherwise so the agenda and the state cards behave
                    exactly as before — except on the phone, where it now also
                    supplies the top inset the removed toolbar used to provide.
                    Without it the first agenda day sits flush against the
                    card's rounded top edge. 12px matches the agenda's own
                    gutter and row gap. */}
                <Box
                    sx={{
                        ...(isPhone ? { paddingTop: "12px" } : null),
                        ...(fillHeight
                            ? {
                                  flex: 1,
                                  minHeight: 0,
                                  overflowY: "auto",
                                  overflowX: "hidden",
                                  scrollbarWidth: "thin",
                              }
                            : null),
                    }}
                >
                    {body}
                </Box>
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
                                padding: "0 11px 3px",
                                display: "grid",
                                gap: "5px",
                                maxHeight: "min(320px, 48vh)",
                                overflowY: "auto",
                            }}
                        >
                            {morePopover.items.length === 0 ? (
                                <Box
                                    sx={{
                                        padding: "10px 4px 14px",
                                        color: "var(--cc-mute)",
                                        ...ccType.popCount,
                                    }}
                                >
                                    Nothing booked on this day yet.
                                </Box>
                            ) : null}
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
                        {/* The way out of the list and into a booking on the
                            day it is showing. All-day range, same call the
                            cell's quick-add "+" makes, so the form opens on
                            that day and nowhere else. */}
                        <Box
                            sx={{
                                display: "flex",
                                padding: "0 15px 14px",
                            }}
                        >
                            <Box
                                component="button"
                                type="button"
                                onClick={() => {
                                    const day = startOfDay(morePopover.date);
                                    setMorePopover(null);
                                    openBooking(
                                        day,
                                        new Date(
                                            day.getTime() + 24 * 60 * 60 * 1000
                                        ),
                                        true
                                    );
                                }}
                                sx={{ ...btnPrimary, width: "100%" }}
                            >
                                {`Book a room on ${format(
                                    morePopover.date,
                                    "MMM d"
                                )}`}
                            </Box>
                        </Box>
                    </>
                )}
            </Dialog>
        </Box>
    );
};

export default Calendar;
