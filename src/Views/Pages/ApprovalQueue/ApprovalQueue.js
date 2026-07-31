import React, { useEffect, useState, useCallback, useRef } from "react";
import {
    Box,
    Checkbox,
    Collapse,
    MenuItem,
    useMediaQuery,
} from "@mui/material";
import {
    getDateAmPm,
    getDuration,
} from "../../../Utilites/Functions/CommonFunctions";
import { useAuth } from "../../../Utilites/AuthContext";
import RowMeeting from "./Components/RowMeeting";
import {
    GetLocations,
    GetMeetingApprovals,
    GetRooms,
    GetTypes,
    showError,
    showSuccess,
    showWarning,
} from "../../../Utilites/Functions/ApiFunctions";
import {
    snackbarMark,
    snackbarSpokeSince,
} from "../../../Utilites/SnackbarContext";
import { UpdateMeetingStatus } from "../../../Utilites/Functions/ApiFunctions/MeetingFunctions";
import {
    useSearchParams,
    useParams,
    useNavigate,
    useLocation,
} from "react-router-dom";
import { useSocket } from "../../../Contexts/SocketContext";
import {
    cc,
    sp,
    focusRing,
    CcButton,
    CcSelect,
    Field,
    Tag,
} from "../../Components/Concourse/ConcourseDialogKit";
import {
    btnReset,
    hover,
    ChevronIcon,
} from "../../Components/Banner/Components/atoms";
import { type as ccType } from "../../../Utilites/concourse";

/* ------------------------------------------------------------------ chrome --
 * Concourse page shell. Guide §3.2 / §3.3 verbatim, plus the explicit
 * `boxSizing` the app needs because it mounts no CssBaseline (guide §7.1).
 * The banner owns the "Approval Queue" title (Routes.js:60-61) — this page
 * must not render one.
 */
const MQ_PHONE = "@media (max-width:620px)";

const pageSx = {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflowX: "hidden",
    boxSizing: "border-box",
    background: cc.grd,
    color: cc.ink,
    fontFamily: cc.sans,
    fontSize: "15px",
    lineHeight: 1.5,
    padding:
        "clamp(14px,2.4vw,22px) clamp(12px,2.6vw,24px) clamp(14px,2.4vw,22px)",
};

const cardSx = {
    background: cc.srf,
    borderRadius: "26px",
    boxShadow: cc.sh2,
    overflow: "hidden",
    boxSizing: "border-box",
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    animation: `cc-rise 500ms ${sp} 80ms both`,
    [MQ_PHONE]: { borderRadius: "22px" },
};

/* Guide §4.3 underline tablist. One tab reads as a section header, which is
 * what "Need Approved" is; a one-item segmented control reads as a dead toggle. */
const tablistSx = {
    display: "flex",
    gap: "2px",
    flexWrap: "wrap",
    borderBottom: `1px solid ${cc.line}`,
    padding: "0 16px",
    flexShrink: 0,
    boxSizing: "border-box",
    [MQ_PHONE]: { overflowX: "auto", scrollbarWidth: "thin", flexWrap: "nowrap" },
};

const tabSx = {
    ...btnReset,
    padding: "10px 14px",
    borderRadius: "13px 13px 0 0",
    ...ccType.modeToggle,
    color: cc.mute,
    position: "relative",
    flex: "none",
    transition: "color 200ms, background 200ms",
    ...hover({ background: cc.wash, color: cc.ink }),
    "&:focus-visible": { ...focusRing, outlineOffset: "-2px" },
    "&[aria-selected='true']": {
        color: cc.ink,
        "&::after": {
            content: '""',
            position: "absolute",
            left: "14px",
            right: "14px",
            bottom: "-1px",
            height: "2px",
            borderRadius: "99px",
            background: cc.red,
        },
    },
};

/* Guide §3.5 card toolbar. The old filter was position:absolute / top:60 /
 * zIndex:999 and floated over the banner; it lives here now. */
const toolbarSx = {
    display: "flex",
    alignItems: "flex-end",
    gap: "10px",
    flexWrap: "wrap",
    flexShrink: 0,
    padding: "13px 16px 11px",
    boxSizing: "border-box",
};

const panelSx = {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    "&:focus-visible": { ...focusRing, outlineOffset: "-2px" },
};

const tableWrapSx = {
    flex: 1,
    minHeight: 0,
    overflowX: "auto",
    overflowY: "auto",
    scrollbarWidth: "thin",
    boxSizing: "border-box",
};

const tableSx = {
    width: "100%",
    minWidth: "700px",
    borderCollapse: "separate",
    borderSpacing: 0,
    boxSizing: "border-box",
};

const thSx = {
    position: "sticky",
    top: 0,
    zIndex: 2,
    background: cc.srf,
    borderBottom: `1px solid ${cc.line}`,
    padding: "10px 14px",
    textAlign: "left",
    whiteSpace: "nowrap",
    boxSizing: "border-box",
    ...ccType.blockLabel,
    color: cc.mute,
};

const tdSx = {
    padding: "11px 14px",
    verticalAlign: "middle",
    fontSize: "13.5px",
    color: cc.ink,
    boxSizing: "border-box",
};

const checkboxSx = {
    color: cc.mute,
    padding: "4px",
    "&.Mui-checked": { color: cc.red },
    "&.MuiCheckbox-indeterminate": { color: cc.red },
    ...hover({ background: cc.wash }),
};

/* Guide §4.5 pagination arrow — the DateSelector recipe. */
const arrowSx = {
    ...btnReset,
    width: "30px",
    height: "30px",
    borderRadius: "99px",
    boxSizing: "border-box",
    color: cc.mute,
    transition: `background 200ms, color 200ms, transform 260ms ${sp}`,
    "@media (hover: hover)": {
        "&:hover:not(:disabled)": {
            background: cc.srf,
            color: cc.ink,
            boxShadow: cc.sh1,
        },
    },
    "&:active:not(:disabled)": { transform: "scale(.88)" },
    "&:disabled": { opacity: 0.4, cursor: "default" },
};

const pagePillSx = {
    ...btnReset,
    width: "27px",
    height: "27px",
    borderRadius: "99px",
    boxSizing: "border-box",
    background: cc.srf2,
    color: cc.ink,
    ...ccType.pickerDay,
    transition: `background 200ms, color 200ms, transform 280ms ${sp}, box-shadow 280ms ${sp}`,
    ...hover({ background: cc.wash, transform: "translateY(-2px)" }),
    "&[aria-current='page']": {
        background: cc.red,
        color: cc.onRed,
        boxShadow: "var(--cc-glow-pill)",
    },
};

/* Guide §3.7 skeleton primitive. */
const skSx = {
    position: "relative",
    overflow: "hidden",
    background: "currentColor",
    opacity: 0.08,
    color: cc.ink,
    borderRadius: "99px",
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

/* Guide §3.7 empty / error block. Copied in — it is not exported by the kit. */
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
                boxSizing: "border-box",
                display: "grid",
                placeItems: "center",
                fontSize: "23px",
                boxShadow: cc.sh1,
                background: danger ? cc.wash : cc.srf2,
                color: danger ? cc.red : cc.ink,
            }}
        >
            {icon}
        </Box>
        <Box sx={{ ...ccType.stateTitle }}>{title}</Box>
        <Box sx={{ ...ccType.stateBody, color: cc.mute }}>{body}</Box>
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

/* Guide §4.10 status pill. Mapped from the live status string — the app's four
 * statuses only. An unrecognised value renders as plain text; we never invent a
 * fifth status. */
const STATUS_TONE = {
    Approved: { color: cc.ok, background: cc.srf2 },
    "Waiting on Approval": { color: cc.mute, background: cc.srf2 },
    Canceled: { color: cc.mute, background: cc.srf2 },
    Declined: { color: cc.red, background: cc.wash },
};

const StatusPill = ({ status, onRecessed }) => {
    const tone = STATUS_TONE[status];
    if (!tone) {
        return <Box component="span">{status}</Box>;
    }
    return (
        <Box
            component="span"
            sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                borderRadius: "99px",
                padding: "3px 10px",
                fontSize: "11px",
                fontWeight: 700,
                whiteSpace: "nowrap",
                boxSizing: "border-box",
                color: tone.color,
                background:
                    onRecessed && tone.background === cc.srf2
                        ? cc.srf
                        : tone.background,
            }}
        >
            <Box
                component="span"
                aria-hidden="true"
                sx={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "99px",
                    background: "currentColor",
                    flex: "none",
                }}
            />
            {status}
        </Box>
    );
};

/* The Disclosure marker (kit :1437) reused as the row's expand affordance.
 * The row itself owns the click and carries aria-expanded, so this is decorative. */
const RowMarker = ({ open }) => (
    <Box
        component="span"
        aria-hidden="true"
        sx={{
            width: "22px",
            height: "22px",
            flex: "none",
            borderRadius: "99px",
            boxSizing: "border-box",
            background: open ? cc.red : cc.srf2,
            color: open ? cc.onRed : cc.ink,
            display: "grid",
            placeItems: "center",
            fontSize: "13px",
            lineHeight: 1,
            transform: open ? "rotate(135deg)" : "none",
            transition: `transform 320ms ${sp}, background 200ms, color 200ms`,
        }}
    >
        +
    </Box>
);

/* Guide §4.1 sort control — a plain <button> on btnReset, not TableSortLabel. */
const SortButton = ({ label, active, order, onClick, sx }) => (
    <Box
        component="button"
        type="button"
        onClick={onClick}
        sx={{
            ...btnReset,
            display: "inline-flex",
            gap: "6px",
            font: "inherit",
            letterSpacing: "inherit",
            textTransform: "inherit",
            color: active ? cc.ink : "inherit",
            ...hover({ color: cc.ink }),
            "&:focus-visible": { ...focusRing, outlineOffset: "-2px" },
            ...sx,
        }}
    >
        {label}
        <Box
            component="span"
            aria-hidden="true"
            sx={{
                fontSize: "9px",
                lineHeight: 1,
                color: cc.red,
                opacity: active ? 1 : 0,
                transform: active && order === "desc" ? "rotate(180deg)" : "none",
                transition: `transform 320ms ${sp}`,
            }}
        >
            ▲
        </Box>
    </Box>
);

/* The eight sortable columns, in order. Every `key` must name a field produced
 * by `createData` AND have an entry in `SORT_VALUES`; `start` did neither, so
 * sorting by Start Time silently applied nothing to the rows while the header
 * still announced itself as sorted. Same key, same fix as MyBookings.js:275. */
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

const SK_WIDTHS = ["70%", "45%", "85%", "55%", "60%"];
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

/** Page numbers to show, with "…" gaps. Total is known (we count the filtered,
 *  sorted array), so numbered pills are legitimate here — guide §4.5. */
const pageWindow = (current, count) => {
    if (count <= 7) return Array.from({ length: count }, (_, i) => i);
    const out = [0];
    const start = Math.max(1, current - 1);
    const end = Math.min(count - 2, current + 1);
    if (start > 1) out.push("…");
    for (let i = start; i <= end; i += 1) out.push(i);
    if (end < count - 2) out.push("…");
    out.push(count - 1);
    return out;
};

function a11yProps(index) {
    return {
        id: `simple-tab-${index}`,
        "aria-controls": `simple-tabpanel-${index}`,
    };
}

/* `date`, `start_time`, `duration` and `requested` are built for the eye and
 * cannot be sorted as written, so each one now also carries the value it was
 * rendered from. The display fields are untouched — the table, the row-cards
 * and RowMeeting still read exactly the strings they read before. */
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
    date_value,
    requested_value,
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
        date_value,
        requested_value,
        duration_minutes,
    };
}

/** A valid Date, or null for anything that is not one. `new Date(itm.createdAt)`
 *  is Invalid Date for a missing/garbage timestamp, and an Invalid Date
 *  subtraction yields NaN — which the spec folds to "equal" and which therefore
 *  orders those rows arbitrarily. Null instead, so they land at one end. */
function dateValue(value) {
    return value instanceof Date && !Number.isNaN(value.getTime())
        ? value
        : null;
}

/** Minutes past midnight, which is what the Start Time column shows. */
function minutesOfDay(date) {
    const d = dateValue(date);
    return d ? d.getHours() * 60 + d.getMinutes() : null;
}

/** The one comparator set both control sets read: the desktop column headers
 *  and the phone sort chips dispatch the same `COLUMNS` key in here, so they
 *  cannot disagree. Four columns display a *formatted* value that does not sort
 *  the way it reads, so they map to the value behind the text:
 *   - `date` / `requested` render "Friday, Aug 7, 2026"; as text that sorts by
 *     weekday name — Friday before Monday before Sunday before Wednesday, in
 *     every week of every year. Sorted as the Date they were formatted from.
 *   - `start_time` renders "9:30am"; lexically "10:00am" < "9:30am" and every
 *     pm time sorts in among the am ones. Sorted as minutes past midnight.
 *   - `duration` renders "9h 05m" / "45m"; lexically "10h 00m" < "1h 30m" <
 *     "2h 00m" < "30m". Sorted as the total minutes it was built from.
 *  A key that is absent here is a key with no ordering, not a crash. */
const SORT_VALUES = {
    name: (row) => row?.name,
    organizer: (row) => row?.organizer,
    room: (row) => row?.room,
    date: (row) => dateValue(row?.date_value),
    start_time: (row) => minutesOfDay(row?.date_value),
    duration: (row) =>
        Number.isFinite(row?.duration_minutes) ? row.duration_minutes : null,
    requested: (row) => dateValue(row?.requested_value),
    status: (row) => row?.status,
};

function descendingComparator(a, b, orderBy) {
    const get = SORT_VALUES[orderBy];
    // No comparator for this key => no ordering, for every pair; `stableSort`
    // then leaves the rows exactly as they came in.
    if (!get) return 0;
    const av = get(a);
    const bv = get(b);
    // `organizer`, `name` and `status` are all `allowNull: true` on the Meeting
    // model, and a queue holding one null organizer used to take the whole app
    // down the moment someone sorted by that column: this read
    // `b[orderBy].localeCompare(...)` off the null, threw, and — there being no
    // error boundary anywhere in src/ — React unmounted every page, not just
    // this table. Absent values sort to one end instead.
    if (av == null || bv == null) {
        if (av == null && bv == null) return 0;
        return av == null ? 1 : -1;
    }
    if (typeof av === "string" && typeof bv === "string") {
        return bv.localeCompare(av);
    } else if (typeof av === "number" && typeof bv === "number") {
        return bv - av;
    } else if (av instanceof Date && bv instanceof Date) {
        return bv.getTime() - av.getTime();
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

export default function ApprovalQueue({ setLoading, loading }) {
    const { user } = useAuth();
    const { socket } = useSocket();
    // Support both query string (?meetingId=123) and optional path param (:meetingId)
    const [searchParams] = useSearchParams();
    const { meetingId: meetingIdParam } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const isPhone = useMediaQuery("(max-width:620px)");
    const MEETING_ID_STORAGE_KEY = "approvalMeetingId";
    const storedFromStorage = () => {
        try {
            return (
                localStorage.getItem(MEETING_ID_STORAGE_KEY) ||
                sessionStorage.getItem(MEETING_ID_STORAGE_KEY)
            );
        } catch {
            return null;
        }
    };
    const initialMeetingId =
        searchParams.get("meetingId") || meetingIdParam || storedFromStorage();
    const [meetingId, setMeetingId] = useState(initialMeetingId);
    const [order, setOrder] = useState("asc");
    const [orderBy, setOrderBy] = useState("name");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [selected, setSelected] = useState([]);
    const [rowsOpen, setRowsOpen] = useState([]);
    const [paginatedRows, setPaginatedRows] = useState([]);
    // The number of rows the filter actually left us. TablePagination used to be
    // handed `meetings.length` (every office, every page), so it advertised pages
    // that were empty. This is the same array the slice comes from.
    const [filteredCount, setFilteredCount] = useState(0);
    // The ids of those same rows. Select-all, Submit and the header checkbox are
    // scoped to exactly this set: they used to run over the raw `meetings`
    // fetch, so one click on "select all meetings" ticked — and Submit then
    // approved — requests for offices and groups the filter never rendered.
    const [filteredIds, setFilteredIds] = useState([]);
    const [action, setAction] = useState("Approve");
    const [meetings, setMeetings] = useState([]);
    const [filterLocation, setFilterLocation] = useState();
    const [locations, setLocations] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [update, setUpdate] = useState(0);
    const [meetingTypes, setMeetingTypes] = useState([]);
    // Flipped in the initial fetch's finally — stops the empty state flashing
    // before the first load resolves (guide §3.7).
    const [hasLoaded, setHasLoaded] = useState(false);
    const fetchingRef = useRef(false);

    const refreshApprovals = useCallback(async () => {
        if (!user?.id || fetchingRef.current) return;
        fetchingRef.current = true;
        try {
            const mtgs = await GetMeetingApprovals(user.id);
            setMeetings(mtgs);
        } catch (e) {
            // silent
        } finally {
            fetchingRef.current = false;
        }
    }, [user?.id]);

    // Remove meetingId from the URL query string (leave other params intact)
    const removeMeetingIdFromUrl = () => {
        const params = new URLSearchParams(location.search);
        if (params.has("meetingId")) {
            params.delete("meetingId");
            const newSearch = params.toString();
            navigate(
                {
                    pathname: location.pathname,
                    search: newSearch ? `?${newSearch}` : "",
                },
                { replace: true }
            );
        }
    };

    // Clear focused meeting completely (used after approve/decline)
    const clearStoredMeetingId = () => {
        try {
            localStorage.removeItem(MEETING_ID_STORAGE_KEY);
            sessionStorage.removeItem(MEETING_ID_STORAGE_KEY);
        } catch {}
        removeMeetingIdFromUrl();
        setMeetingId(null);
        setRowsOpen([]);
        setSelected([]);
    };

    // Clear focus only (when user manually unselects) without wiping other selections
    const clearFocusedMeetingId = () => {
        try {
            localStorage.removeItem(MEETING_ID_STORAGE_KEY);
            sessionStorage.removeItem(MEETING_ID_STORAGE_KEY);
        } catch {}
        removeMeetingIdFromUrl();
        const idNum = Number(meetingId);
        setMeetingId(null);
        setRowsOpen((prev) => prev.filter((id) => id !== idNum));
        setSelected((prev) => prev.filter((id) => id !== idNum));
    };

    // Capture meetingId from query/path once and persist so it survives navigation / param stripping
    useEffect(() => {
        const fromUrl = searchParams.get("meetingId") || meetingIdParam;
        if (fromUrl && fromUrl !== meetingId) {
            setMeetingId(fromUrl);
            try {
                localStorage.setItem(MEETING_ID_STORAGE_KEY, fromUrl);
                sessionStorage.setItem(MEETING_ID_STORAGE_KEY, fromUrl);
            } catch {}
        }
    }, [searchParams, meetingIdParam]);

    // Restore if lost after auth re-init
    useEffect(() => {
        if (!meetingId) {
            const s = storedFromStorage();
            if (s) setMeetingId(s);
        }
    }, [meetingId]);

    const handleSubmit = () => {
        // Nothing outside the filtered table can be actioned, whatever else is
        // sitting in `selected` (a stale selection from a previous filter, or a
        // deep-linked meeting this location filter excludes).
        const visibleIds = new Set(filteredIds);
        // Unified with the other five bulk pages: total success -> success,
        // partial -> warning naming the counts, total failure -> an error that
        // always appears.
        //
        // `Promise.all` resolves to a truthy array even when every call failed,
        // and the old `.map` over ALL meetings put `null` in every slot the
        // filter excluded, so the resolved array could report nothing.
        // Filtering to the targets first — same `visibleIds` + `isSelected`
        // predicate, so exactly the same rows are actioned as before — makes
        // `results` line up 1:1 with what was attempted.
        //
        // `UpdateMeetingStatus` raises "Meeting Updated" per item and shows the
        // server's wording when the server explains a refusal. It is silent on
        // the rest: its `.catch` returns `undefined` when the error carries no
        // message, the following `resp.status` read then throws, and its own
        // `catch` swallows that and returns false. So a total failure can leave
        // nothing on screen at all — `snackbarSpokeSince` is what lets the
        // aggregate speak only when nothing else did, preserving the server's
        // own message where there is one.
        const statusChange = async () => {
            const targets = (meetings ?? []).filter(
                (itm) => visibleIds.has(itm.id) && isSelected(itm.id)
            );
            if (targets.length === 0) return;
            const mark = snackbarMark();
            const results = await Promise.all(
                targets.map((itm) =>
                    UpdateMeetingStatus(itm.id, {
                        status: `${action}d`,
                        userId: user?.id,
                        meeting: itm.id === -1 ? itm : null,
                    })
                )
            );
            const done = results.filter(Boolean).length;
            if (done === targets.length) {
                showSuccess(
                    `Meeting${targets.length > 1 ? "s" : ""} ${action}d`
                );
            } else if (done > 0) {
                showWarning(
                    `${action}d ${done} of ${targets.length} meetings`
                );
            } else {
                if (!snackbarSpokeSince(mark)) {
                    showError(
                        `Failed to ${action.toLowerCase()} ${
                            targets.length > 1 ? "the meetings" : "the meeting"
                        }`
                    );
                }
                // Nothing changed — keep the queue and the selection as they
                // are rather than refetching into a state that reads as done.
                return;
            }
            // If focused meeting processed, clear stored id
            if (meetingId && selected.includes(Number(meetingId))) {
                clearStoredMeetingId();
            } else {
                setSelected([]);
            }
            setUpdate((prev) => prev + 1);
        };
        statusChange();
    };

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

    const handleSelectAllClick = (event) => {
        if (event.target.checked) {
            // The rows this filter left on the table, not the whole fetch.
            const newSelecteds = [...filteredIds];
            setSelected(newSelecteds);
            return;
        }
        setSelected([]);
        clearFocusedMeetingId();
        clearStoredMeetingId();
        removeMeetingIdFromUrl();
    };

    const handleClick = (event, id) => {
        const selectedIndex = selected.indexOf(id);
        let newSelected = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selected, id);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selected.slice(1));
        } else if (selectedIndex === selected.length - 1) {
            newSelected = newSelected.concat(selected.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selected.slice(0, selectedIndex),
                selected.slice(selectedIndex + 1)
            );
        }

        setSelected(newSelected);
        // If user just unselected the focused meeting, clear stored meetingId & URL
        if (
            meetingId &&
            id === Number(meetingId) &&
            newSelected.indexOf(id) === -1
        ) {
            clearFocusedMeetingId();
        }
    };

    const handleOpenClick = (event, id) => {
        const openIndex = rowsOpen.indexOf(id);
        let neOpen = [];

        // `openIndex` indexes `rowsOpen`, so every branch has to splice
        // `rowsOpen` too — reading `selected` here made expanding one row
        // replace the open set with the selected set.
        if (openIndex === -1) {
            neOpen = neOpen.concat(rowsOpen, id);
        } else if (openIndex === 0) {
            neOpen = neOpen.concat(rowsOpen.slice(1));
        } else if (openIndex === rowsOpen.length - 1) {
            neOpen = neOpen.concat(rowsOpen.slice(0, -1));
        } else if (openIndex > 0) {
            neOpen = neOpen.concat(
                rowsOpen.slice(0, openIndex),
                rowsOpen.slice(openIndex + 1)
            );
        }

        setRowsOpen(neOpen);
    };

    const isSelected = (id) => selected.indexOf(id) !== -1;
    const isOpen = (id) => rowsOpen.indexOf(id) !== -1;

    const handleRowKeyDown = (event, id) => {
        // Only the row itself answers Enter/Space. Without this guard the
        // keydown that bubbles up from the row's own checkbox is
        // preventDefault()ed here, which cancels the checkbox's activation —
        // Space would expand the row and never tick the box, leaving bulk
        // approve/decline unreachable from the keyboard.
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleOpenClick(event, id);
        }
    };

    useEffect(() => {
        const getData = async () => {
            setLoading(true);
            try {
                const [rms, lcs, mtgs, typs] = await Promise.all([
                    GetRooms(user.id),
                    GetLocations(),
                    GetMeetingApprovals(user?.id),
                    GetTypes(),
                ]);
                setMeetingTypes(typs);
                setLocations(lcs);
                setRooms(rms);
                setMeetings(mtgs);
                setFilterLocation(
                    lcs?.find((lc) => lc.officeid == user?.location)
                );
            } finally {
                setHasLoaded(true);
                setLoading(false);
            }
        };
        if (user?.id) getData();
    }, [user, update]);

    // Real-time: listen for new approval-related socket events and refresh list
    useEffect(() => {
        if (!socket || !user?.id) return;
        const handler = (payload) => {
            const msg = payload?.message;
            if (
                msg === "meeting_approval_requested" ||
                msg === "meeting_reapproval_requested" ||
                msg === "meeting_approved" ||
                msg === "meeting_declined"
            ) {
                // Only refresh if we remain on approval route
                refreshApprovals();
            }
        };
        socket.on("message", handler);
        return () => socket.off("message", handler);
    }, [socket, user?.id, refreshApprovals]);

    useEffect(() => {
        if (meetings?.length) {
            // `filterLocation` has no value until the initial fetch resolves, and
            // it can stay undefined for good: GetLocations() returns [] on a
            // failure as well as on a genuinely empty list, and even a populated
            // list may hold no office matching `user.location`. Rows can also
            // arrive first — the socket handler calls refreshApprovals(), which
            // sets `meetings` on its own while this is still undefined.
            // Dereferencing it threw here, and the app mounts no error boundary,
            // so React unmounted the whole page until a reload. No usable
            // location filter therefore means no narrowing by location — the
            // same reading of a missing filter the other filtered pages use
            // (Users.js:809-818), and `officeid === 0` keeps meaning "all".
            const officeId = filterLocation?.officeid;
            const noLocationFilter = officeId === undefined || officeId === null;
            const itms = meetings?.filter(
                (mt) =>
                    mt?.group === user?.status_group &&
                    (noLocationFilter ||
                        officeId === 0 ||
                        mt?.location === officeId)
            );
            const data = itms?.map((itm) => {
                const start = new Date(itm?.start_time);
                const requestedAt = new Date(itm.createdAt);
                const duration = getDuration(start, new Date(itm?.end_time));
                let durationString = duration.hours
                    ? `${duration.hours}h ${String(duration.minutes).padStart(
                          2,
                          "0"
                      )}m`
                    : `${String(duration.minutes).padStart(2, "0")}m`;
                return createData(
                    itm.id,
                    itm.name,
                    itm.organizer,
                    rooms?.find((rm) => rm.id == itm.room)?.value ||
                        "Unknown room",
                    start.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                    }),
                    `${
                        start.getHours() % 12 ? start.getHours() % 12 : 12
                    }:${String(start.getMinutes()).padStart(
                        2,
                        "0"
                    )}${getDateAmPm(start)}m`,
                    durationString,
                    requestedAt.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                    }),
                    itm.status,
                    // The values the four formatted columns above were rendered
                    // from, carried so they sort by what they mean rather than
                    // by how they read. Nothing renders these.
                    start,
                    requestedAt,
                    duration.hours * 60 + duration.minutes
                );
            });

            const sortedRows = stableSort(data, getComparator(order, orderBy));
            setFilteredCount(sortedRows.length);
            setFilteredIds(sortedRows.map((rw) => rw.id));
            setPaginatedRows(
                sortedRows.slice(
                    page * rowsPerPage,
                    page * rowsPerPage + rowsPerPage
                )
            );
        } else {
            setFilteredCount(0);
            setFilteredIds([]);
            setPaginatedRows([]);
        }
    }, [meetings, filterLocation, update, page, rowsPerPage, orderBy, order]);

    // Auto-expand / focus meeting from meetingId if provided
    useEffect(() => {
        if (!meetingId || !meetings?.length) {
            return;
        } else if (!meetings.find((mt) => mt.id === meetingId)) {
            removeMeetingIdFromUrl();
        }

        const idNum = Number(meetingId);
        if (Number.isNaN(idNum)) return;
        // Open the row
        setRowsOpen((prev) => (prev.includes(idNum) ? prev : [...prev, idNum]));
        // Optionally select it for quick action
        setSelected((prev) => (prev.includes(idNum) ? prev : [...prev, idNum]));
        // If it's on a different page, navigate to the page containing it
        const index = meetings.findIndex((m) => m.id === idNum);
        if (index !== -1) {
            const targetPage = Math.floor(index / rowsPerPage);
            if (targetPage !== page) setPage(targetPage);
        }
    }, [meetingId, meetings, rowsPerPage, page]);

    /* ------------------------------------------------------------- states --- */

    // `user` is null on the first commit — AuthContext restores the session from
    // localStorage in an effect (AuthContext.js:11-20) — so gating this on
    // `Boolean(user?.id)` let the empty state paint before the fetch was even
    // attempted, i.e. "Nothing is waiting on your approval" on every hard
    // refresh of /approve. `hasLoaded` alone is the honest guard.
    const isSkeleton = loading || !hasLoaded;
    const totalFetched = meetings?.length || 0;
    // Nothing at all is waiting on this user.
    const isEmptyQueue = !isSkeleton && totalFetched === 0;
    // Rows exist, but the location filter excludes every one of them.
    const isEmptyFilter = !isSkeleton && totalFetched > 0 && filteredCount === 0;
    // There is deliberately no error state: every fetch in this page's data path
    // swallows its own failure and resolves to [], so the page genuinely cannot
    // tell "empty" from "the server did not answer". Reported to the integrator.

    const pageCount = Math.max(1, Math.ceil(filteredCount / rowsPerPage) || 1);
    // Count what is actually on screen. `page` can outlive the array it indexes
    // (the deep-link effect pages by an index into the UNFILTERED meetings, and
    // changing the location filter does not reset the page), and deriving the
    // range from `page * rowsPerPage` alone printed impossible strings like
    // "Showing 26–10 of 10" over an empty table.
    const shownCount = paginatedRows?.length || 0;
    const firstShown = shownCount === 0 ? 0 : page * rowsPerPage + 1;
    const lastShown = shownCount === 0 ? 0 : page * rowsPerPage + shownCount;

    // The box has to describe the rows underneath it. Measured against the raw
    // fetch it never reached "checked" once a filter was on, and it read
    // "indeterminate" for selections the table was not showing at all.
    const selectedIdSet = new Set(selected);
    const selectedVisibleCount = filteredIds.reduce(
        (total, id) => (selectedIdSet.has(id) ? total + 1 : total),
        0
    );

    const selectAll = (
        <Checkbox
            indeterminate={
                selectedVisibleCount > 0 &&
                selectedVisibleCount < filteredIds.length
            }
            checked={
                filteredIds.length > 0 &&
                selectedVisibleCount === filteredIds.length
            }
            onChange={handleSelectAllClick}
            inputProps={{
                "aria-label": "select all meetings",
            }}
            sx={checkboxSx}
        />
    );

    const detailFor = (row, sx) => {
        const meeting = meetings?.find((mt) => mt.id === row?.id);
        return (
            <RowMeeting
                meeting={meeting}
                location={locations?.find(
                    (lc) => lc?.officeid === meeting?.location
                )}
                room={rooms?.find((rm) => rm?.id === meeting?.room)}
                type={meetingTypes?.find((tp) => tp?.id === meeting?.type)}
                row={row}
                sx={sx}
            />
        );
    };

    /* -------------------------------------------------------------- table --- */

    const head = (
        <Box component="thead">
            <Box component="tr">
                <Box
                    component="th"
                    scope="col"
                    sx={{ ...thSx, width: "44px", padding: "6px 0 6px 14px" }}
                >
                    {selectAll}
                </Box>
                {COLUMNS.map((col) => (
                    <Box
                        component="th"
                        scope="col"
                        key={col.key}
                        aria-sort={
                            orderBy === col.key
                                ? order === "asc"
                                    ? "ascending"
                                    : "descending"
                                : "none"
                        }
                        sx={thSx}
                    >
                        <SortButton
                            label={col.label}
                            active={orderBy === col.key}
                            order={order}
                            onClick={(event) =>
                                handleRequestSort(event, col.key)
                            }
                        />
                    </Box>
                ))}
            </Box>
        </Box>
    );

    // Same column template as the loaded table so nothing jumps, but with no
    // interactive elements — the whole block is aria-hidden while it stands in.
    const skeletonHead = (
        <Box component="thead">
            <Box component="tr">
                <Box
                    component="th"
                    scope="col"
                    sx={{ ...thSx, width: "44px", padding: "10px 0 10px 14px" }}
                >
                    <Sk
                        sx={{
                            width: "16px",
                            height: "16px",
                            borderRadius: "5px",
                        }}
                    />
                </Box>
                {COLUMNS.map((col) => (
                    <Box component="th" scope="col" key={col.key} sx={thSx}>
                        {col.label}
                    </Box>
                ))}
            </Box>
        </Box>
    );

    const skeletonTable = (
        <Box sx={tableWrapSx} aria-hidden="true">
            <Box component="table" sx={tableSx}>
                {skeletonHead}
                <Box component="tbody">
                    {Array.from({ length: 8 }).map((_, rowIndex) => (
                        <Box component="tr" key={rowIndex}>
                            <Box
                                component="td"
                                sx={{
                                    ...tdSx,
                                    width: "44px",
                                    padding: "11px 0 11px 14px",
                                    borderBottom: `1px solid ${cc.line}`,
                                }}
                            >
                                <Sk
                                    sx={{
                                        width: "16px",
                                        height: "16px",
                                        borderRadius: "5px",
                                    }}
                                />
                            </Box>
                            {COLUMNS.map((col, colIndex) => (
                                <Box
                                    component="td"
                                    key={col.key}
                                    sx={{
                                        ...tdSx,
                                        borderBottom: `1px solid ${cc.line}`,
                                    }}
                                >
                                    <Sk
                                        sx={{
                                            height: "13px",
                                            width: SK_WIDTHS[
                                                (rowIndex + colIndex) %
                                                    SK_WIDTHS.length
                                            ],
                                        }}
                                    />
                                </Box>
                            ))}
                        </Box>
                    ))}
                </Box>
            </Box>
        </Box>
    );

    const dataTable = (
        <Box sx={tableWrapSx}>
            <Box component="table" sx={tableSx} aria-label="customized table">
                {head}
                <Box component="tbody">
                    {paginatedRows?.map((row, index) => {
                        const isItemSelected = isSelected(row.id);
                        const isItemOpen = isOpen(row.id);
                        const isLast = index === paginatedRows.length - 1;
                        const cellBorder = isLast
                            ? "0"
                            : `1px solid ${cc.line}`;
                        const strike = (canceled) => ({
                            textDecoration: canceled ? "line-through" : "none",
                        });
                        return (
                            <React.Fragment key={row?.id ?? index}>
                                <Box
                                    component="tr"
                                    role="checkbox"
                                    aria-checked={isItemSelected}
                                    aria-expanded={isItemOpen}
                                    tabIndex={0}
                                    onClick={(e) =>
                                        handleOpenClick(e, row?.id)
                                    }
                                    onKeyDown={(e) =>
                                        handleRowKeyDown(e, row?.id)
                                    }
                                    sx={{
                                        cursor: "pointer",
                                        background: isItemSelected
                                            ? cc.wash
                                            : "transparent",
                                        transition: "background 200ms",
                                        ...hover({ background: cc.wash }),
                                        "&:focus-visible": {
                                            ...focusRing,
                                            outlineOffset: "-2px",
                                        },
                                        "& > td": {
                                            borderBottom: isItemOpen
                                                ? `1px solid ${cc.line}`
                                                : cellBorder,
                                        },
                                        ...(isItemSelected
                                            ? {
                                                  "& > td:first-of-type": {
                                                      boxShadow: `inset 3px 0 0 ${cc.red}`,
                                                  },
                                              }
                                            : null),
                                    }}
                                >
                                    <Box
                                        component="td"
                                        sx={{
                                            ...tdSx,
                                            width: "44px",
                                            padding: "11px 0 11px 14px",
                                        }}
                                    >
                                        <Checkbox
                                            onClick={(event) => {
                                                event.stopPropagation(); // Prevent the event from bubbling up
                                                handleClick(event, row?.id);
                                            }}
                                            checked={isItemSelected}
                                            inputProps={{
                                                "aria-labelledby": `enhanced-table-checkbox-${row?.id}`,
                                            }}
                                            sx={checkboxSx}
                                        />
                                    </Box>
                                    <Box component="td" sx={tdSx}>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "10px",
                                                minWidth: 0,
                                            }}
                                        >
                                            <RowMarker open={isItemOpen} />
                                            <Box
                                                component="span"
                                                sx={{
                                                    ...ccType.cardName,
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    maxWidth: "260px",
                                                    ...strike(
                                                        row?.status ==
                                                            "Canceled"
                                                    ),
                                                }}
                                            >
                                                {row?.name}
                                            </Box>
                                        </Box>
                                    </Box>
                                    <Box
                                        component="td"
                                        sx={{
                                            ...tdSx,
                                            ...strike(
                                                row?.status === "Canceled"
                                            ),
                                        }}
                                    >
                                        {row?.organizer}
                                    </Box>
                                    <Box
                                        component="td"
                                        sx={{
                                            ...tdSx,
                                            ...strike(
                                                row?.status === "Canceled"
                                            ),
                                        }}
                                    >
                                        {row?.room}
                                    </Box>
                                    <Box
                                        component="td"
                                        sx={{
                                            ...tdSx,
                                            ...ccType.factValueMono,
                                            color: cc.ink,
                                            whiteSpace: "nowrap",
                                            ...strike(
                                                row?.status === "Canceled"
                                            ),
                                        }}
                                    >
                                        {row?.date}
                                    </Box>
                                    <Box
                                        component="td"
                                        sx={{
                                            ...tdSx,
                                            ...ccType.factValueMono,
                                            color: cc.ink,
                                            whiteSpace: "nowrap",
                                            ...strike(
                                                row?.status === "Canceled"
                                            ),
                                        }}
                                    >
                                        {row?.start_time}
                                    </Box>
                                    <Box
                                        component="td"
                                        sx={{
                                            ...tdSx,
                                            ...ccType.factValueMono,
                                            color: cc.ink,
                                            whiteSpace: "nowrap",
                                            ...strike(
                                                row?.status === "Canceled"
                                            ),
                                        }}
                                    >
                                        {row?.duration}
                                    </Box>
                                    <Box
                                        component="td"
                                        sx={{
                                            ...tdSx,
                                            ...ccType.factValueMono,
                                            color: cc.ink,
                                            whiteSpace: "nowrap",
                                            ...strike(
                                                row?.status === "Canceled"
                                            ),
                                        }}
                                    >
                                        {row?.requested}
                                    </Box>
                                    <Box component="td" sx={tdSx}>
                                        <StatusPill status={row.status} />
                                    </Box>
                                </Box>
                                <Box component="tr">
                                    <Box
                                        component="td"
                                        colSpan={9}
                                        sx={{
                                            padding: 0,
                                            boxSizing: "border-box",
                                            borderBottom:
                                                isItemOpen && !isLast
                                                    ? `1px solid ${cc.line}`
                                                    : 0,
                                        }}
                                    >
                                        <Collapse
                                            in={isItemOpen}
                                            timeout="auto"
                                            unmountOnExit
                                        >
                                            {detailFor(row)}
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

    // ≤620px the loaded state is row-cards, so the skeleton has to be
    // card-shaped too — the 700px-wide table skeleton overflowed the card
    // horizontally on a phone and was then replaced by a different layout
    // (guide §3.7: the skeleton must have the shape of the thing that
    // replaces it).
    const skeletonCards = (
        <Box
            aria-hidden="true"
            sx={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                scrollbarWidth: "thin",
                boxSizing: "border-box",
                display: "grid",
                gap: "8px",
                alignContent: "start",
                padding: "0 12px 14px",
            }}
        >
            {Array.from({ length: 8 }).map((_, cardIndex) => (
                <Box
                    key={cardIndex}
                    sx={{
                        background: cc.srf2,
                        borderRadius: "18px",
                        padding: "12px 14px",
                        display: "grid",
                        gap: "6px",
                        boxSizing: "border-box",
                    }}
                >
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                        }}
                    >
                        <Sk
                            sx={{
                                width: "22px",
                                height: "22px",
                                flex: "none",
                            }}
                        />
                        <Sk sx={{ height: "14px", flex: 1 }} />
                        <Sk
                            sx={{
                                width: "16px",
                                height: "16px",
                                borderRadius: "5px",
                                flex: "none",
                            }}
                        />
                    </Box>
                    {[0, 1, 2, 3].map((pairIndex) => (
                        <Box
                            key={pairIndex}
                            sx={{
                                display: "grid",
                                gridTemplateColumns: "auto 1fr",
                                gap: "14px",
                                alignItems: "center",
                            }}
                        >
                            <Sk sx={{ height: "11px", width: "62px" }} />
                            <Sk
                                sx={{
                                    height: "11px",
                                    width: SK_WIDTHS[
                                        (cardIndex + pairIndex) %
                                            SK_WIDTHS.length
                                    ],
                                    justifySelf: "end",
                                }}
                            />
                        </Box>
                    ))}
                </Box>
            ))}
        </Box>
    );

    /* --------------------------------------------------- phone: row cards --- */

    const cardPair = (label, value, mono) => (
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
                    color: cc.mute,
                    whiteSpace: "nowrap",
                }}
            >
                {label}
            </Box>
            <Box
                sx={{
                    textAlign: "right",
                    minWidth: 0,
                    ...(mono
                        ? { ...ccType.factValueMono }
                        : { ...ccType.factValue }),
                }}
            >
                {value}
            </Box>
        </Box>
    );

    const cardList = (
        <Box
            sx={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                scrollbarWidth: "thin",
                boxSizing: "border-box",
                display: "grid",
                gap: "8px",
                alignContent: "start",
                padding: "0 12px 14px",
            }}
        >
            {/* The row-card layout has no column headers, so the same eight sort
                controls move into a scrolling chip strip. Same handler, same keys. */}
            <Box
                role="group"
                aria-label="Sort"
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    overflowX: "auto",
                    scrollbarWidth: "thin",
                    padding: "0 2px 2px",
                    ...ccType.blockLabel,
                    color: cc.mute,
                }}
            >
                {COLUMNS.map((col) => (
                    <SortButton
                        key={col.key}
                        label={col.label}
                        active={orderBy === col.key}
                        order={order}
                        onClick={(event) => handleRequestSort(event, col.key)}
                        sx={{
                            padding: "6px 11px",
                            borderRadius: "99px",
                            background: orderBy === col.key ? cc.wash : cc.srf2,
                            whiteSpace: "nowrap",
                            boxSizing: "border-box",
                        }}
                    />
                ))}
            </Box>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0 2px 2px",
                }}
            >
                {selectAll}
            </Box>
            {paginatedRows?.map((row, index) => {
                const isItemSelected = isSelected(row.id);
                const isItemOpen = isOpen(row.id);
                return (
                    <Box
                        key={row?.id ?? index}
                        role="checkbox"
                        aria-checked={isItemSelected}
                        aria-expanded={isItemOpen}
                        tabIndex={0}
                        onClick={(e) => handleOpenClick(e, row?.id)}
                        onKeyDown={(e) => handleRowKeyDown(e, row?.id)}
                        sx={{
                            background: cc.srf2,
                            borderRadius: "18px",
                            padding: "12px 14px",
                            display: "grid",
                            gap: "6px",
                            boxSizing: "border-box",
                            cursor: "pointer",
                            transition: "background 200ms",
                            ...(isItemSelected
                                ? { boxShadow: `inset 3px 0 0 ${cc.red}` }
                                : null),
                            "&:focus-visible": focusRing,
                        }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                minWidth: 0,
                            }}
                        >
                            <RowMarker open={isItemOpen} />
                            <Box
                                component="span"
                                sx={{
                                    ...ccType.cardName,
                                    minWidth: 0,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    textDecoration:
                                        row?.status == "Canceled"
                                            ? "line-through"
                                            : "none",
                                }}
                            >
                                {row?.name}
                            </Box>
                            <Box
                                sx={{
                                    marginLeft: "auto",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    flex: "none",
                                }}
                            >
                                <StatusPill status={row.status} onRecessed />
                                <Checkbox
                                    onClick={(event) => {
                                        event.stopPropagation(); // Prevent the event from bubbling up
                                        handleClick(event, row?.id);
                                    }}
                                    checked={isItemSelected}
                                    inputProps={{
                                        "aria-labelledby": `enhanced-table-checkbox-${row?.id}`,
                                    }}
                                    sx={checkboxSx}
                                />
                            </Box>
                        </Box>
                        {cardPair("Organizer", row?.organizer)}
                        {cardPair("Room", row?.room)}
                        {cardPair("Date", row?.date, true)}
                        {cardPair("Start Time", row?.start_time, true)}
                        <Collapse in={isItemOpen} timeout="auto" unmountOnExit>
                            {/* The detail sits INSIDE the clickable card here
                                (on desktop it is a sibling <tr>), so without
                                this the first tap on the panel collapses it. */}
                            <Box
                                sx={{ paddingTop: "8px" }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {detailFor(row, {
                                    background: cc.srf,
                                    borderRadius: "14px",
                                    padding: "10px 12px 12px",
                                })}
                            </Box>
                        </Collapse>
                    </Box>
                );
            })}
        </Box>
    );

    /* ------------------------------------------------------------- render --- */

    return (
        <Box sx={pageSx} style={{ "--cc-c": "var(--cc-red)" }}>
            <Box sx={cardSx}>
                <Box role="tablist" aria-label="Approvals" sx={tablistSx}>
                    <Box
                        component="button"
                        type="button"
                        role="tab"
                        aria-selected="true"
                        tabIndex={0}
                        sx={tabSx}
                        {...a11yProps(0)}
                    >
                        Need Approved
                    </Box>
                </Box>

                <Box sx={toolbarSx}>
                    <Box sx={{ flex: 1 }} />
                    <Box sx={{ flex: "none", minWidth: 0 }}>
                        <Field label="Filter By Location">
                            <CcSelect
                                ariaLabel="Filter By Location"
                                value={filterLocation?.officeid || ""}
                                onChange={(e) => {
                                    const selectedItem = locations?.find(
                                        (itm) => itm.officeid === e.target.value
                                    );
                                    setFilterLocation(selectedItem); // Return the entire object
                                }}
                                sx={{
                                    width: "auto",
                                    minWidth: "160px",
                                    flex: "none",
                                }}
                            >
                                {locations?.map((itm, index) => (
                                    <MenuItem key={index} value={itm.officeid}>
                                        {itm.Alias}
                                    </MenuItem>
                                ))}
                            </CcSelect>
                        </Field>
                    </Box>
                </Box>

                <Box
                    role="tabpanel"
                    id="simple-tabpanel-0"
                    aria-labelledby="simple-tab-0"
                    tabIndex={0}
                    sx={panelSx}
                >
                    {isSkeleton ? (
                        isPhone ? (
                            skeletonCards
                        ) : (
                            skeletonTable
                        )
                    ) : isEmptyQueue ? (
                        <StateBlock
                            icon="✓"
                            title="Nothing is waiting on your approval"
                            body="New requests appear here as soon as they're submitted."
                        />
                    ) : isEmptyFilter ? (
                        <StateBlock
                            icon="⌕"
                            title="No requests in this location"
                            body="Change the location filter to see the rest of the queue."
                        />
                    ) : isPhone ? (
                        cardList
                    ) : (
                        dataTable
                    )}
                </Box>

                {/* Footer: actions + pagination */}
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: "9px",
                        flexWrap: "wrap",
                        flexShrink: 0,
                        padding: "11px 16px",
                        borderTop: `1px solid ${cc.line}`,
                        background: cc.srf,
                        boxSizing: "border-box",
                    }}
                >
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: "9px",
                            flexWrap: "wrap",
                        }}
                    >
                        <Box
                            sx={{
                                ...ccType.factKey,
                                color: cc.mute,
                                whiteSpace: "nowrap",
                            }}
                        >
                            I Want To
                        </Box>
                        <CcSelect
                            ariaLabel="Action"
                            value={action}
                            onChange={(e) => setAction(e.target.value)}
                            disabled={selectedVisibleCount === 0}
                            sx={{
                                width: "auto",
                                minWidth: "120px",
                                flex: "none",
                            }}
                        >
                            <MenuItem value="Decline">Decline</MenuItem>
                            <MenuItem value="Approve">Approve</MenuItem>
                        </CcSelect>
                        <Box
                            sx={{
                                ...ccType.factKey,
                                color: cc.mute,
                                whiteSpace: "nowrap",
                            }}
                        >
                            Selected
                        </Box>
                        <CcButton
                            variant="primary"
                            onClick={handleSubmit}
                            disabled={selectedVisibleCount === 0}
                        >
                            Submit
                        </CcButton>
                        {meetingId && (
                            <CcButton onClick={clearFocusedMeetingId}>
                                Clear Focus
                            </CcButton>
                        )}
                        {/* Submit only actions rows the current filter left on
                            the table, so this has to count the same set —
                            `selected.length` advertised stale/out-of-filter
                            ids that Submit would silently skip. */}
                        {selectedVisibleCount > 0 && (
                            <Tag on sx={{ background: cc.srf2 }}>
                                {selectedVisibleCount} selected
                            </Tag>
                        )}
                    </Box>

                    <Box
                        sx={{
                            marginLeft: "auto",
                            ...ccType.factKey,
                            color: cc.mute,
                            whiteSpace: "nowrap",
                            [MQ_PHONE]: {
                                marginLeft: 0,
                                width: "100%",
                                order: 9,
                            },
                        }}
                    >
                        Showing{" "}
                        <Box
                            component="span"
                            sx={{ ...ccType.factValueMono, color: cc.ink }}
                        >
                            {firstShown}
                        </Box>
                        –
                        <Box
                            component="span"
                            sx={{ ...ccType.factValueMono, color: cc.ink }}
                        >
                            {lastShown}
                        </Box>{" "}
                        of{" "}
                        <Box
                            component="span"
                            sx={{ ...ccType.factValueMono, color: cc.ink }}
                        >
                            {filteredCount}
                        </Box>
                    </Box>

                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: "9px",
                            [MQ_PHONE]: {
                                marginLeft: 0,
                                width: "100%",
                                justifyContent: "space-between",
                            },
                        }}
                    >
                        <CcSelect
                            ariaLabel="Rows"
                            value={rowsPerPage}
                            onChange={handleChangeRowsPerPage}
                            sx={{
                                width: "auto",
                                minWidth: "84px",
                                flex: "none",
                            }}
                        >
                            {ROWS_PER_PAGE_OPTIONS.map((opt) => (
                                <MenuItem key={opt} value={opt}>
                                    {opt}
                                </MenuItem>
                            ))}
                        </CcSelect>
                        <Box
                            component="nav"
                            aria-label="Pagination"
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                            }}
                        >
                            <Box
                                component="button"
                                type="button"
                                aria-label="Previous page"
                                disabled={page === 0}
                                onClick={(event) =>
                                    handleChangePage(event, page - 1)
                                }
                                sx={arrowSx}
                            >
                                <ChevronIcon size={17} strokeWidth={2} />
                            </Box>
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    [MQ_PHONE]: { display: "none" },
                                }}
                            >
                                {pageWindow(page, pageCount).map((p, i) =>
                                    p === "…" ? (
                                        <Box
                                            key={`gap-${i}`}
                                            component="span"
                                            aria-hidden="true"
                                            sx={{
                                                fontSize: "12.5px",
                                                color: cc.mute,
                                                padding: "0 2px",
                                            }}
                                        >
                                            …
                                        </Box>
                                    ) : (
                                        <Box
                                            key={p}
                                            component="button"
                                            type="button"
                                            aria-label={`Page ${p + 1}`}
                                            aria-current={
                                                p === page ? "page" : undefined
                                            }
                                            onClick={(event) =>
                                                handleChangePage(event, p)
                                            }
                                            sx={pagePillSx}
                                        >
                                            {p + 1}
                                        </Box>
                                    )
                                )}
                            </Box>
                            <Box
                                component="button"
                                type="button"
                                aria-label="Next page"
                                disabled={page >= pageCount - 1}
                                onClick={(event) =>
                                    handleChangePage(event, page + 1)
                                }
                                sx={arrowSx}
                            >
                                <ChevronIcon size={17} strokeWidth={2} flip />
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
