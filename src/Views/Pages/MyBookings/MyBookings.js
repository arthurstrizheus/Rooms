import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Collapse, MenuItem, useMediaQuery } from "@mui/material";
import {
    getDateAmPm,
    getDuration,
} from "../../../Utilites/Functions/CommonFunctions";
import { useAuth } from "../../../Utilites/AuthContext";
import RowMeeting from "./Components/RowMeeting";
import StatusPill from "./Components/StatusPill";
import {
    GetLocations,
    GetMeetingsUserCreated,
    GetRooms,
    GetTypes,
    showWarning,
} from "../../../Utilites/Functions/ApiFunctions";
import { useSocket } from "../../../Contexts/SocketContext";
import { bp, type as ccType } from "../../../Utilites/concourse";
import {
    CcButton,
    CcSelect,
    focusRing,
} from "../../Components/Concourse/ConcourseDialogKit";
import {
    btnReset,
    hover,
    ChevronIcon,
} from "../../Components/Banner/Components/atoms";

/* ------------------------------------------------------------ geometry --- */

const PHONE_Q = `@media (max-width:${bp.sheet}px)`;

const pageSx = {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    overflowX: "hidden",
    scrollbarWidth: "thin",
    boxSizing: "border-box",
    background: "var(--cc-grd)",
    color: "var(--cc-ink)",
    fontFamily: "var(--cc-sans)",
    fontSize: "15px",
    lineHeight: 1.5,
    padding:
        "clamp(14px,2.4vw,22px) clamp(12px,2.6vw,24px) clamp(14px,2.4vw,22px)",
};

const cardSx = {
    background: "var(--cc-srf)",
    borderRadius: "26px",
    boxShadow: "var(--cc-sh2)",
    overflow: "hidden",
    boxSizing: "border-box",
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    animation: "cc-rise 500ms var(--cc-sp) 80ms both",
    [PHONE_Q]: { borderRadius: "22px" },
};

const toolbarSx = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    flexShrink: 0,
    padding: "13px 16px 11px",
    boxSizing: "border-box",
};

const scrollSx = {
    flex: 1,
    minHeight: 0,
    overflow: "auto",
    overflowX: "auto",
    scrollbarWidth: "thin",
    overscrollBehavior: "contain",
    boxSizing: "border-box",
};

const tableSx = {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    boxSizing: "border-box",
    minWidth: "860px",
    // Two <tr> per record: the data row, then its (possibly collapsed) detail
    // row. `nth-last-of-type(2)` is therefore the last *data* row.
    "& tbody tr:nth-last-of-type(2) td": { borderBottom: 0 },
};

const thSx = {
    position: "sticky",
    top: 0,
    zIndex: 2,
    background: "var(--cc-srf)",
    borderBottom: "1px solid var(--cc-line)",
    padding: "10px 14px",
    textAlign: "left",
    whiteSpace: "nowrap",
    boxSizing: "border-box",
    ...ccType.blockLabel,
    color: "var(--cc-mute)",
};

const markerCellSx = { width: "1%", padding: "10px 0 10px 14px" };

const tdSx = {
    padding: "11px 14px",
    verticalAlign: "middle",
    boxSizing: "border-box",
    fontSize: "13.5px",
    color: "var(--cc-ink)",
    borderBottom: "1px solid var(--cc-line)",
};

/** Machine values never wrap — a date broken over three lines is not a value.
 *  The wrapper scrolls horizontally instead; measured, see the report. */
const monoTdSx = {
    ...tdSx,
    ...ccType.factValueMono,
    whiteSpace: "nowrap",
};

const srOnly = {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: 0,
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0 0 0 0)",
    whiteSpace: "nowrap",
    border: 0,
};

const footerSx = {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    flexWrap: "wrap",
    flexShrink: 0,
    padding: "11px 16px",
    boxSizing: "border-box",
    borderTop: "1px solid var(--cc-line)",
    background: "var(--cc-srf)",
};

const arrowSx = {
    ...btnReset,
    width: "30px",
    height: "30px",
    borderRadius: "99px",
    boxSizing: "border-box",
    color: "var(--cc-mute)",
    transition:
        "background 200ms, color 200ms, transform 260ms var(--cc-sp)",
    // The banner's own arrow recipe hovers to `srf`, but it sits on a `srf2`
    // pill track. This strip *is* `srf`, so the neutral icon-button hover from
    // guide §4.1 (`srf3`) is the one that actually reads here.
    ...hover({
        background: "var(--cc-srf3)",
        color: "var(--cc-ink)",
        boxShadow: "var(--cc-sh1)",
    }),
    "&:active:not(:disabled)": { transform: "scale(.88)" },
    "&:disabled": { opacity: 0.4, cursor: "default" },
};

/** §3.8 — the `Disclosure` marker, verbatim. Decorative; the row owns the ARIA. */
const markerSx = (open) => ({
    width: "22px",
    height: "22px",
    borderRadius: "99px",
    flex: "none",
    display: "grid",
    placeItems: "center",
    boxSizing: "border-box",
    background: "var(--cc-srf3)",
    color: "var(--cc-mute)",
    fontSize: "13px",
    lineHeight: 1,
    transition:
        "transform 320ms var(--cc-sp), background 200ms, color 200ms",
    ...(open && {
        transform: "rotate(135deg)",
        background: "var(--cc-red)",
        color: "var(--cc-on-red)",
    }),
});

/* ----------------------------------------------------------- skeleton --- */

const skSx = {
    position: "relative",
    overflow: "hidden",
    background: "currentColor",
    opacity: 0.08,
    color: "var(--cc-ink)",
    borderRadius: "99px",
    boxSizing: "border-box",
    "&::after": {
        content: '""',
        position: "absolute",
        inset: 0,
        transform: "translateX(-100%)",
        background:
            "linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent)",
        animation: "cc-shim 1400ms infinite",
    },
};

const Sk = ({ sx }) => <Box sx={{ ...skSx, ...sx }} />;

const SK_WIDTHS = ["70%", "45%", "85%", "55%", "60%"];

/* ------------------------------------------------------ empty / error --- */

const StateBlock = ({ icon, danger, title, body, actions }) => (
    <Box
        sx={{
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            padding: "52px 26px",
            gap: "11px",
            boxSizing: "border-box",
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
                boxSizing: "border-box",
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

/* -------------------------------------------------------------- table --- */

/** Column order and labels are contract — do not touch. Every `key` must name
 *  a row field produced by `createData` AND have an entry in `SORT_VALUES`;
 *  `start` did neither, so sorting by it silently applied nothing while the
 *  header still announced itself as sorted. */
const COLUMNS = [
    { key: "name", label: "Title" },
    { key: "organizer", label: "Organizer" },
    { key: "room", label: "Room" },
    { key: "date", label: "Date" },
    { key: "start_time", label: "Start Time" },
    { key: "duration", label: "Duration" },
    { key: "requested", label: "Requested Date" },
    { key: "status", label: "Status" },
];

/** Columns kept on a phone row-card. Organizer is the constant "Me" and
 *  Requested Date lives on in the expanded panel as `Created`. */
const PHONE_FIELDS = [
    { label: "Room", mono: false, get: (row) => row.room },
    { label: "Date", mono: true, get: (row) => longDate(row.date) },
    { label: "Start Time", mono: true, get: (row) => row.start_time },
    { label: "Duration", mono: true, get: (row) => row.duration },
];

/** The exact option object this page has always used. Do not change it. */
function longDate(value) {
    return value.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

const isInactive = (status) => status === "Canceled" || status === "Deleted";

const KeyValue = ({ label, mono, children }) => (
    <Box
        sx={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "14px",
            alignItems: "baseline",
        }}
    >
        <Box
            sx={{
                ...ccType.factKey,
                color: "var(--cc-mute)",
                whiteSpace: "nowrap",
            }}
        >
            {label}
        </Box>
        <Box
            sx={{
                ...(mono ? ccType.factValueMono : ccType.factValue),
                textAlign: "right",
                minWidth: 0,
                overflowWrap: "anywhere",
            }}
        >
            {children}
        </Box>
    </Box>
);

/* ------------------------------------------------------------- helpers --- */

function createData(
    id,
    name,
    organizer,
    room,
    date,
    start_time,
    duration,
    requested,
    status,
    meeting,
    duration_minutes
) {
    return {
        id,
        name,
        organizer,
        room,
        date,
        start_time,
        duration,
        requested,
        status,
        meeting,
        duration_minutes,
    };
}

/** The one comparator set both control sets read: the desktop column headers
 *  and the phone select both dispatch a `COLUMNS` key into here, so they
 *  cannot disagree. Two columns display a *formatted* value that does not sort
 *  the way it reads, so they map to the number behind the text:
 *   - `start_time` renders "9:30am"; lexically "10:00am" < "9:30am" and every
 *     pm time sorts among the am ones. Sorted as minutes past midnight, which
 *     is what the column shows (the Date column already sorts the calendar).
 *   - `duration` renders "9h 05m" / "45m"; lexically "10h 00m" < "1h 30m" <
 *     "2h 00m" < "30m". Sorted as the total minutes it was built from.
 *  A key that is absent here is a key with no ordering — see `resolveSortKey`. */
const SORT_VALUES = {
    name: (row) => row.name,
    organizer: (row) => row.organizer,
    room: (row) => row.room,
    date: (row) => row.date,
    start_time: (row) => minutesOfDay(row.date),
    duration: (row) =>
        Number.isFinite(row.duration_minutes) ? row.duration_minutes : null,
    requested: (row) => row.requested,
    status: (row) => row.status,
};

function minutesOfDay(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    return date.getHours() * 60 + date.getMinutes();
}

/** `null` when nothing orderable is applied, so `aria-sort` can say "none"
 *  rather than announce a column the comparator never touched. */
function resolveSortKey(orderBy) {
    return SORT_VALUES[orderBy] ? orderBy : null;
}

function descendingComparator(a, b, orderBy) {
    const get = SORT_VALUES[orderBy];
    // No comparator for this key => no ordering, for every pair. `stableSort`
    // then leaves the rows exactly as they came in, and `resolveSortKey` keeps
    // the header from claiming otherwise.
    if (!get) return 0;
    const av = get(a);
    const bv = get(b);
    // `room` is a lookup into the rooms this user can still see, so it is
    // legitimately absent for a booking in a room they lost access to. Sorting
    // by Room used to be unreachable, so `b[orderBy].localeCompare` never got
    // to throw on it; it is reachable now. Absent values sort to one end
    // instead of crashing the page.
    if (av == null || bv == null) {
        if (av == null && bv == null) return 0;
        return av == null ? 1 : -1;
    }
    if (typeof av === "string" && typeof bv === "string") {
        return bv.localeCompare(av);
    } else if (typeof av === "number" && typeof bv === "number") {
        return bv - av;
    } else if (av instanceof Date && bv instanceof Date) {
        return new Date(bv) - new Date(av);
    }
    return 0;
}

function getComparator(order, orderBy) {
    return order === "desc"
        ? (a, b) => descendingComparator(a, b, orderBy)
        : (a, b) => -descendingComparator(a, b, orderBy);
}

function stableSort(array, comparator) {
    const stabilizedThis = array?.map((el, index) => [el, index]);
    stabilizedThis.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        if (order !== 0) return order;
        return a[1] - b[1];
    });
    return stabilizedThis?.map((el) => el[0]);
}

/* ================================================================ page === */

export default function MyBookings({ setLoading, loading }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const isPhone = useMediaQuery(`(max-width:${bp.sheet}px)`, {
        noSsr: true,
    });
    const [order, setOrder] = useState("asc");
    const [orderBy, setOrderBy] = useState("date");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    // Read by `handleOpenClick` and never written — see bug B5 in the report.
    // It is permanently `[]`, which is what makes the expander behave as a
    // single-open accordion. Preserved verbatim; do not "tidy" it away.
    const [selected] = useState([]);
    const [rowsOpen, setRowsOpen] = useState([]);
    const [paginatedRows, setPaginatedRows] = useState([]);
    const [update, setUpdate] = useState(0);
    const [meetings, setMeetings] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [locations, setLocations] = useState([]);
    const [types, setTypes] = useState([]);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [fetchError, setFetchError] = useState(false);
    const { socket } = useSocket();

    const handleRequestSort = (event, property) => {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleOpenClick = (event, id) => {
        const openIndex = rowsOpen.indexOf(id);
        let neOpen = [];

        if (openIndex === -1) {
            neOpen = neOpen.concat(selected, id);
        } else if (openIndex === 0) {
            neOpen = neOpen.concat(selected.slice(1));
        } else if (openIndex === selected.length - 1) {
            neOpen = neOpen.concat(selected.slice(0, -1));
        } else if (openIndex > 0) {
            neOpen = neOpen.concat(
                selected.slice(0, openIndex),
                selected.slice(openIndex + 1)
            );
        }

        setRowsOpen(neOpen);
    };

    const handleRowKeyDown = (event, index) => {
        if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
            if (event.key !== "Enter") event.preventDefault();
            handleOpenClick(event, index);
        }
    };

    const isOpen = (id) => rowsOpen.indexOf(id) !== -1;

    useEffect(() => {
        let cancelled = false;
        const data = async () => {
            try {
                const mts = await GetMeetingsUserCreated(user?.id, {
                    date: new Date(),
                    range: "Month",
                });
                const tps = await GetTypes();
                const rms = await GetRooms(user.id);
                const lcs = await GetLocations();
                if (cancelled) return;
                setMeetings(mts);
                setRooms(rms);
                setLocations(lcs);
                setTypes(tps);
                setFetchError(false);
            } catch {
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
    }, [user, update]);

    // Live update handler (approval / decline)
    const applyStatusUpdate = useCallback((meetingId, newStatus) => {
        if (!meetingId) return;
        setMeetings((prev) =>
            prev.map((m) =>
                m.id === meetingId
                    ? {
                          ...m,
                          status: newStatus,
                          UpdatedUser: { ...(m.UpdatedUser || {}) },
                      }
                    : m
            )
        );
    }, []);

    useEffect(() => {
        if (!socket || !user?.id) return;
        const handler = (payload) => {
            try {
                if (!payload) return;
                const { message, data } = payload;
                if (
                    message === "meeting_approved" ||
                    message === "meeting_declined"
                ) {
                    const meetingId = data?.meetingId;
                    // Update local status first
                    applyStatusUpdate(
                        meetingId,
                        message === "meeting_approved" ? "Approved" : "Declined"
                    );
                    if (message === "meeting_declined") {
                        const mtg = meetings.find((m) => m.id === meetingId);
                        const title =
                            mtg?.name || `Meeting #${meetingId || ""}`;
                        showWarning(`${title} was declined`);
                    }
                }
            } catch {}
        };
        socket.on("message", handler);
        return () => socket.off("message", handler);
    }, [socket, user?.id, meetings, applyStatusUpdate]);

    useEffect(() => {
        if (meetings?.length) {
            const data = meetings?.map((itm) => {
                const start = new Date(itm.start_time);
                const duration = getDuration(start, new Date(itm.end_time));
                let durationString = duration.hours
                    ? `${duration.hours}h ${String(duration.minutes).padStart(
                          2,
                          "0"
                      )}m`
                    : `${String(duration.minutes).padStart(2, "0")}m`;

                return createData(
                    itm.id,
                    itm.name,
                    "Me",
                    rooms?.find((rm) => rm.id == itm.room)?.value,
                    start,
                    `${
                        start.getHours() % 12 ? start.getHours() % 12 : 12
                    }:${String(start.getMinutes()).padStart(
                        2,
                        "0"
                    )}${getDateAmPm(start)}m`,
                    durationString,
                    new Date(itm.createdAt),
                    itm.status,
                    itm,
                    // The number `durationString` was rendered from, kept so
                    // Duration sorts by length instead of by spelling.
                    duration.hours * 60 + duration.minutes
                );
            });

            const sortedRows = stableSort(data, getComparator(order, orderBy));
            setPaginatedRows(
                sortedRows.slice(
                    page * rowsPerPage,
                    page * rowsPerPage + rowsPerPage
                )
            );
        } else {
            setPaginatedRows([]);
        }
        // `order` / `orderBy` are the comparator's only inputs, so they belong
        // here: without them every sort control on the page — the desktop
        // column headers and the phone select + direction pair — moved state
        // that nothing re-derived, and the rows never moved. Both views drive
        // this one effect through this one comparator, so they cannot disagree.
    }, [meetings, page, rowsPerPage, update, order, orderBy]);

    /* ---------------------------------------------------------- states --- */

    const isSkeleton = loading || (!hasLoaded && Boolean(user?.id));
    const isErrorState = !isSkeleton && fetchError;
    // `hasLoaded` is required here, not just in `isSkeleton`. On a hard load of
    // /book the AuthContext restores `user` from localStorage in an effect, so
    // the first commit runs with `user === null`: `isSkeleton` is false (its
    // guard is `Boolean(user?.id)`) and `meetings` is still `[]`. Without this
    // term the page asserts "You haven't booked anything yet" to a user who has
    // bookings, until auth resolves. With it, that window renders the (empty)
    // table instead, which claims nothing.
    const isEmptyState =
        !isSkeleton && !fetchError && hasLoaded && (meetings?.length || 0) === 0;
    const isData = !isSkeleton && !isErrorState && !isEmptyState;

    const total = meetings?.length || 0;
    const from = total === 0 ? 0 : page * rowsPerPage + 1;
    const to = Math.min(total, page * rowsPerPage + rowsPerPage);
    const pageCount = Math.max(1, Math.ceil(total / rowsPerPage));
    const showFooter = isSkeleton || isData;
    // What the comparator will actually order by — `null` when the current
    // `orderBy` has no comparator, so the header announces "none" instead of
    // claiming a sort the rows never received.
    const sortKey = resolveSortKey(orderBy);

    /* ------------------------------------------------------- fragments --- */

    const renderHead = (disabled) => (
        <Box component="thead">
            <Box component="tr">
                <Box component="th" scope="col" sx={{ ...thSx, ...markerCellSx }}>
                    <Box component="span" sx={srOnly}>
                        Details
                    </Box>
                </Box>
                {COLUMNS.map((col) => {
                    const active = sortKey === col.key;
                    return (
                        <Box
                            component="th"
                            scope="col"
                            key={col.key}
                            aria-sort={
                                active
                                    ? order === "asc"
                                        ? "ascending"
                                        : "descending"
                                    : "none"
                            }
                            sx={thSx}
                        >
                            <Box
                                component="button"
                                type="button"
                                disabled={disabled}
                                onClick={(event) =>
                                    handleRequestSort(event, col.key)
                                }
                                sx={{
                                    ...btnReset,
                                    display: "inline-flex",
                                    gap: "6px",
                                    alignItems: "center",
                                    font: "inherit",
                                    letterSpacing: "inherit",
                                    textTransform: "inherit",
                                    color: active
                                        ? "var(--cc-ink)"
                                        : "inherit",
                                    transition: "color 200ms",
                                    ...hover({ color: "var(--cc-ink)" }),
                                }}
                            >
                                {col.label}
                                {active ? (
                                    <Box
                                        component="span"
                                        aria-hidden="true"
                                        sx={{
                                            display: "inline-block",
                                            fontSize: "9px",
                                            lineHeight: 1,
                                            color: "var(--cc-red)",
                                            transition:
                                                "transform 320ms var(--cc-sp)",
                                            transform:
                                                order === "desc"
                                                    ? "rotate(180deg)"
                                                    : "none",
                                        }}
                                    >
                                        ▲
                                    </Box>
                                ) : null}
                            </Box>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );

    const renderDetail = (row) => (
        <RowMeeting
            meeting={row.meeting}
            location={locations?.find(
                (lc) => lc.officeid === row.meeting.location
            )}
            room={rooms?.find((rm) => rm.id == row.meeting.room)}
            type={types?.find((tp) => tp.id === row.meeting.type)}
            row={row}
        />
    );

    const tableView = (
        <Box sx={scrollSx}>
            <Box component="table" sx={tableSx} aria-label="Your bookings">
                {renderHead(false)}
                <Box component="tbody">
                    {paginatedRows?.map((row, index) => {
                        const isItemOpen = isOpen(index);
                        const inactive = isInactive(row.status);
                        const detailId = `cc-booking-detail-${index}`;
                        return (
                            <React.Fragment key={index}>
                                <Box
                                    component="tr"
                                    tabIndex={0}
                                    aria-expanded={isItemOpen}
                                    aria-controls={detailId}
                                    onClick={(e) => handleOpenClick(e, index)}
                                    onKeyDown={(e) =>
                                        handleRowKeyDown(e, index)
                                    }
                                    sx={{
                                        cursor: "pointer",
                                        transition: "background 200ms",
                                        // A spent booking is de-emphasised with
                                        // the secondary *text* token, not with
                                        // `opacity`. Opacity composited the text
                                        // and its ground together: measured
                                        // 3.83:1 for the ink cells, 2.15:1 for
                                        // the mute ones and 2.07:1 for the pill
                                        // in light. `mute` on `srf` measures
                                        // 4.84:1 light / 5.84:1 dark, and the
                                        // pill keeps its own colour. The row you
                                        // opened is the row you are reading, so
                                        // it drops back to `ink` — which is also
                                        // the only way to clear 4.5:1 over the
                                        // `wash` ground an open row takes.
                                        ...(inactive &&
                                            !isItemOpen && {
                                                "& td": {
                                                    color: "var(--cc-mute)",
                                                },
                                            }),
                                        ...(isItemOpen && {
                                            background: "var(--cc-wash)",
                                        }),
                                        ...hover({
                                            background: "var(--cc-wash)",
                                        }),
                                        "&:focus-visible": {
                                            ...focusRing,
                                            outlineOffset: "-2px",
                                        },
                                        ...(isItemOpen && {
                                            "& > td:first-of-type": {
                                                boxShadow:
                                                    "inset 3px 0 0 var(--cc-red)",
                                            },
                                        }),
                                    }}
                                >
                                    <Box
                                        component="td"
                                        sx={{
                                            ...tdSx,
                                            ...markerCellSx,
                                            padding: "11px 0 11px 14px",
                                        }}
                                    >
                                        <Box
                                            aria-hidden="true"
                                            sx={markerSx(isItemOpen)}
                                        >
                                            +
                                        </Box>
                                    </Box>
                                    <Box
                                        component="td"
                                        sx={{
                                            ...tdSx,
                                            maxWidth: "280px",
                                        }}
                                    >
                                        <Box
                                            component="span"
                                            sx={{
                                                display: "block",
                                                maxWidth: "280px",
                                                ...ccType.cardName,
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                ...(inactive && {
                                                    textDecoration:
                                                        "line-through",
                                                }),
                                            }}
                                        >
                                            {row.name}
                                        </Box>
                                    </Box>
                                    <Box
                                        component="td"
                                        sx={{
                                            ...tdSx,
                                            color: "var(--cc-mute)",
                                        }}
                                    >
                                        {row.organizer}
                                    </Box>
                                    <Box component="td" sx={tdSx}>
                                        {row.room}
                                    </Box>
                                    <Box component="td" sx={monoTdSx}>
                                        {longDate(row.date)}
                                    </Box>
                                    <Box component="td" sx={monoTdSx}>
                                        {row.start_time}
                                    </Box>
                                    <Box component="td" sx={monoTdSx}>
                                        {row.duration}
                                    </Box>
                                    <Box
                                        component="td"
                                        sx={{
                                            ...monoTdSx,
                                            color: "var(--cc-mute)",
                                        }}
                                    >
                                        {longDate(row.requested)}
                                    </Box>
                                    <Box
                                        component="td"
                                        sx={{ ...tdSx, whiteSpace: "nowrap" }}
                                    >
                                        <StatusPill status={row.status} />
                                    </Box>
                                </Box>
                                <Box component="tr">
                                    <Box
                                        component="td"
                                        id={detailId}
                                        colSpan={9}
                                        sx={{
                                            padding: 0,
                                            boxSizing: "border-box",
                                            overflow: "hidden",
                                            background: "var(--cc-srf2)",
                                            borderBottom: isItemOpen
                                                ? "1px solid var(--cc-line)"
                                                : 0,
                                        }}
                                    >
                                        <Collapse
                                            in={isItemOpen}
                                            timeout="auto"
                                            unmountOnExit
                                        >
                                            {renderDetail(row)}
                                        </Collapse>
                                    </Box>
                                </Box>
                            </React.Fragment>
                        );
                    })}
                </Box>
            </Box>
        </Box>
    );

    const cardsView = (
        <Box sx={{ ...scrollSx, overflowX: "hidden" }}>
            <Box
                sx={{
                    display: "grid",
                    gap: "8px",
                    padding: "0 12px 14px",
                    boxSizing: "border-box",
                }}
            >
                {paginatedRows?.map((row, index) => {
                    const isItemOpen = isOpen(index);
                    const inactive = isInactive(row.status);
                    const detailId = `cc-booking-card-detail-${index}`;
                    return (
                        <Box
                            key={index}
                            role="button"
                            tabIndex={0}
                            // Without this the button's accessible name is
                            // computed from its contents — the whole card, and
                            // the entire detail panel once it is open. The name
                            // is the booking it toggles; `aria-expanded` already
                            // carries the state.
                            aria-label={
                                row.name
                                    ? `${row.name}, booking details`
                                    : "Booking details"
                            }
                            aria-expanded={isItemOpen}
                            aria-controls={detailId}
                            onClick={(e) => handleOpenClick(e, index)}
                            onKeyDown={(e) => handleRowKeyDown(e, index)}
                            sx={{
                                background: "var(--cc-srf2)",
                                borderRadius: "18px",
                                padding: "12px 14px",
                                display: "grid",
                                gap: "6px",
                                boxSizing: "border-box",
                                cursor: "pointer",
                                transition: "background 200ms",
                                // Same trade as the table row: `opacity` dimmed
                                // the card's own `srf2` ground along with its
                                // text (measured 3.73:1 ink / 2.07:1 mute in
                                // light). `mute` on `srf2` measures 4.51:1 light
                                // / 6.17:1 dark and leaves the pill alone. Open
                                // returns to `ink` — the card *and* the detail
                                // panel it contains, which desktop never dimmed
                                // either since there the detail is a sibling row.
                                ...(inactive &&
                                    !isItemOpen && { color: "var(--cc-mute)" }),
                                ...(isItemOpen && {
                                    background: "var(--cc-wash)",
                                }),
                                ...hover({ background: "var(--cc-wash)" }),
                                "&:focus-visible": {
                                    ...focusRing,
                                    outlineOffset: "-2px",
                                },
                            }}
                        >
                            <Box
                                sx={{
                                    ...ccType.cardName,
                                    ...(inactive && {
                                        textDecoration: "line-through",
                                    }),
                                }}
                            >
                                {row.name}
                            </Box>
                            <Box>
                                <StatusPill status={row.status} onRecessed />
                            </Box>
                            {PHONE_FIELDS.map((f) => (
                                <KeyValue
                                    key={f.label}
                                    label={f.label}
                                    mono={f.mono}
                                >
                                    {f.get(row)}
                                </KeyValue>
                            ))}
                            {/* The detail lives inside the toggle here (on a
                                phone the card *is* the toggle), so its clicks
                                must not bubble back up and collapse it — on
                                desktop the detail is a sibling <tr> and never
                                could. */}
                            <Box
                                id={detailId}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Collapse
                                    in={isItemOpen}
                                    timeout="auto"
                                    unmountOnExit
                                >
                                    {renderDetail(row)}
                                </Collapse>
                            </Box>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );

    const tableSkeleton = (
        <Box sx={scrollSx}>
            <Box component="table" sx={tableSx} aria-label="Loading bookings">
                {renderHead(true)}
                <Box component="tbody" aria-hidden="true">
                    {Array.from({ length: 8 }).map((_, r) => (
                        <Box component="tr" key={r}>
                            <Box
                                component="td"
                                sx={{
                                    ...tdSx,
                                    ...markerCellSx,
                                    padding: "11px 0 11px 14px",
                                }}
                            >
                                <Sk
                                    sx={{
                                        width: "22px",
                                        height: "22px",
                                    }}
                                />
                            </Box>
                            {COLUMNS.map((col, i) => (
                                <Box component="td" key={col.key} sx={tdSx}>
                                    {col.key === "status" ? (
                                        <Sk
                                            sx={{
                                                width: "78px",
                                                height: "18px",
                                            }}
                                        />
                                    ) : (
                                        <Sk
                                            sx={{
                                                height: "13px",
                                                width: SK_WIDTHS[
                                                    (r + i) % SK_WIDTHS.length
                                                ],
                                            }}
                                        />
                                    )}
                                </Box>
                            ))}
                        </Box>
                    ))}
                </Box>
            </Box>
        </Box>
    );

    const cardsSkeleton = (
        <Box sx={{ ...scrollSx, overflowX: "hidden" }} aria-hidden="true">
            <Box
                sx={{
                    display: "grid",
                    gap: "8px",
                    padding: "0 12px 14px",
                    boxSizing: "border-box",
                }}
            >
                {Array.from({ length: 6 }).map((_, r) => (
                    <Box
                        key={r}
                        sx={{
                            background: "var(--cc-srf2)",
                            borderRadius: "18px",
                            padding: "12px 14px",
                            display: "grid",
                            gap: "8px",
                            boxSizing: "border-box",
                        }}
                    >
                        <Sk sx={{ height: "15px", width: "62%" }} />
                        <Sk sx={{ height: "18px", width: "78px" }} />
                        {[0, 1, 2].map((i) => (
                            <Sk
                                key={i}
                                sx={{
                                    height: "13px",
                                    width: SK_WIDTHS[
                                        (r + i) % SK_WIDTHS.length
                                    ],
                                }}
                            />
                        ))}
                    </Box>
                ))}
            </Box>
        </Box>
    );

    /* ---------------------------------------------------------- render --- */

    return (
        <Box sx={pageSx}>
            <Box sx={cardSx}>
                {isPhone && (isSkeleton || isData) ? (
                    <Box sx={toolbarSx}>
                        <CcSelect
                            value={orderBy}
                            disabled={isSkeleton}
                            onChange={(event) =>
                                handleRequestSort(event, event.target.value)
                            }
                            ariaLabel="Sort by"
                            sx={{
                                width: "auto",
                                minWidth: "150px",
                                flex: "1 1 auto",
                            }}
                        >
                            {COLUMNS.map((col) => (
                                <MenuItem key={col.key} value={col.key}>
                                    {col.label}
                                </MenuItem>
                            ))}
                        </CcSelect>
                        <Box
                            component="button"
                            type="button"
                            disabled={isSkeleton}
                            aria-label={
                                order === "asc"
                                    ? "Sort descending"
                                    : "Sort ascending"
                            }
                            onClick={(event) =>
                                handleRequestSort(event, orderBy)
                            }
                            sx={{
                                ...arrowSx,
                                background: "var(--cc-srf2)",
                                ...hover({
                                    background: "var(--cc-srf3)",
                                    color: "var(--cc-ink)",
                                    boxShadow: "var(--cc-sh1)",
                                }),
                            }}
                        >
                            <Box
                                component="span"
                                aria-hidden="true"
                                sx={{
                                    fontSize: "10px",
                                    lineHeight: 1,
                                    transition:
                                        "transform 320ms var(--cc-sp)",
                                    transform:
                                        order === "desc"
                                            ? "rotate(180deg)"
                                            : "none",
                                }}
                            >
                                ▲
                            </Box>
                        </Box>
                    </Box>
                ) : null}

                {isSkeleton ? (
                    isPhone ? (
                        cardsSkeleton
                    ) : (
                        tableSkeleton
                    )
                ) : isErrorState ? (
                    <StateBlock
                        danger
                        icon="!"
                        title="We couldn't load your bookings"
                        body="The service didn't answer. Nothing was changed — your bookings are safe. Try again in a moment."
                        actions={
                            <>
                                <CcButton
                                    variant="primary"
                                    onClick={() => setUpdate((n) => n + 1)}
                                >
                                    Try again
                                </CcButton>
                                <CcButton
                                    onClick={() =>
                                        navigate("/schedule/type/month")
                                    }
                                >
                                    Go to schedule
                                </CcButton>
                            </>
                        }
                    />
                ) : isEmptyState ? (
                    // `GetMeetingsUserCreated` returns `[]` on a real empty
                    // account AND on every swallowed API/network failure, so
                    // `isEmptyState` cannot tell them apart and `fetchError`
                    // stays false. The title therefore states only what the
                    // page knows — that it has nothing to show — instead of
                    // asserting the user has never booked. Integrator ruling;
                    // matches Locations' "No offices to show". The real fix is
                    // to surface failure out of ApiFunctions.js (reported).
                    <StateBlock
                        icon="📋"
                        title="No bookings to show"
                        body="Bookings you create show up here with their approval status. Open the schedule to claim a slot."
                        actions={
                            <CcButton
                                variant="primary"
                                onClick={() =>
                                    navigate("/schedule/type/month")
                                }
                            >
                                Book a room
                            </CcButton>
                        }
                    />
                ) : isPhone ? (
                    cardsView
                ) : (
                    tableView
                )}

                {showFooter ? (
                    <Box sx={footerSx}>
                        {isSkeleton ? (
                            <Sk sx={{ height: "13px", width: "132px" }} />
                        ) : (
                            <Box
                                sx={{
                                    ...ccType.factKey,
                                    color: "var(--cc-mute)",
                                    display: "inline-flex",
                                    alignItems: "baseline",
                                    gap: "5px",
                                    [PHONE_Q]: { width: "100%", order: 9 },
                                }}
                            >
                                Showing
                                <Box
                                    component="span"
                                    sx={{
                                        ...ccType.factValueMono,
                                        color: "var(--cc-ink)",
                                    }}
                                >
                                    {from}–{to}
                                </Box>
                                of
                                <Box
                                    component="span"
                                    sx={{
                                        ...ccType.factValueMono,
                                        color: "var(--cc-ink)",
                                    }}
                                >
                                    {total}
                                </Box>
                            </Box>
                        )}
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: "9px",
                                marginLeft: "auto",
                                [PHONE_Q]: {
                                    marginLeft: 0,
                                    width: "100%",
                                    justifyContent: "space-between",
                                },
                            }}
                        >
                            <Box
                                component="span"
                                sx={{
                                    ...ccType.factKey,
                                    color: "var(--cc-mute)",
                                }}
                            >
                                Rows
                            </Box>
                            <CcSelect
                                value={rowsPerPage}
                                disabled={isSkeleton}
                                onChange={handleChangeRowsPerPage}
                                ariaLabel="Rows per page"
                                sx={{ width: "auto", minWidth: "84px" }}
                            >
                                {[10, 25, 50, 100].map((n) => (
                                    <MenuItem key={n} value={n}>
                                        {n}
                                    </MenuItem>
                                ))}
                            </CcSelect>
                            <Box
                                component="nav"
                                aria-label="Pagination"
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                }}
                            >
                                <Box
                                    component="button"
                                    type="button"
                                    aria-label="Previous page"
                                    disabled={isSkeleton || page <= 0}
                                    onClick={(event) =>
                                        handleChangePage(event, page - 1)
                                    }
                                    sx={arrowSx}
                                >
                                    <ChevronIcon size={17} strokeWidth={2} />
                                </Box>
                                <Box
                                    component="button"
                                    type="button"
                                    aria-label="Next page"
                                    disabled={
                                        isSkeleton || page + 1 >= pageCount
                                    }
                                    onClick={(event) =>
                                        handleChangePage(event, page + 1)
                                    }
                                    sx={arrowSx}
                                >
                                    <ChevronIcon
                                        size={17}
                                        strokeWidth={2}
                                        flip
                                    />
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                ) : null}
            </Box>
        </Box>
    );
}
