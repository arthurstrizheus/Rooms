import React, { useState, useEffect, useMemo } from "react";
import {
    Box,
    Checkbox,
    Collapse,
    Dialog,
    MenuItem,
    useMediaQuery,
} from "@mui/material";
import AddNewRoom from "./Components/AddNewRoom";
import RowRoom from "./Components/RowRoom";
import { ColorSwatch, Sk, StateBlock } from "./Components/RoomsAtoms";
import {
    GetGroups,
    GetLocations,
    GetRoomGroups,
    GetRooms,
    showError,
    showSuccess,
    showWarning,
} from "../../../Utilites/Functions/ApiFunctions";
import {
    snackbarMark,
    snackbarSpokeSince,
} from "../../../Utilites/SnackbarContext";
import { useAuth } from "../../../Utilites/AuthContext";
import { DeleteRoom } from "../../../Utilites/Functions/ApiFunctions/RoomFunctions";
import DisplayGroups from "../../Components/DisplayGroups";
import {
    cc,
    CcButton,
    CcSelect,
    Fact,
    Facts,
    AlertBlock,
    DialogSurface,
    DialogHeader,
    DialogBody,
    DialogFooter,
    Spacer,
    scopeDialogProps,
} from "../../Components/Concourse/ConcourseDialogKit";
import {
    btnReset,
    hover,
    ChevronIcon,
} from "../../Components/Banner/Components/atoms";
import { bp, type as ccType, v } from "../../../Utilites/concourse";

/* ==========================================================================
 * Tokens / geometry
 *
 * Guide §6: page chrome uses the raw `bp.sheet` number, never `sm`/`md`.
 * ========================================================================*/

const MQ_PHONE = `@media (max-width:${bp.sheet}px)`;
const SP = "var(--cc-sp)";

/** Guide §3.2 page shell. */
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

/**
 * Guide §3.3 card, in its `fillHeight` shape: the table scrolls inside the
 * card so the pagination strip can pin to the card's bottom edge.
 * `flex` is written after `flexShrink` on purpose — the shorthand resets it.
 */
const cardSx = {
    background: cc.srf,
    borderRadius: "26px",
    boxShadow: cc.sh2,
    overflow: "hidden",
    boxSizing: "border-box",
    flexShrink: 0,
    animation: `cc-rise 500ms ${SP} 80ms both`,
    [MQ_PHONE]: { borderRadius: "22px" },
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
};

/** Guide §3.5 card toolbar. */
const toolbarSx = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    flexShrink: 0,
    padding: "13px 16px 11px",
    boxSizing: "border-box",
};

const scrollAreaSx = {
    overflowX: "auto",
    overflowY: "auto",
    scrollbarWidth: "thin",
    boxSizing: "border-box",
    flex: 1,
    minHeight: 0,
};

/** Guide §4.1 table. `separate` so the sticky head keeps its border on scroll. */
const tableSx = {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    boxSizing: "border-box",
    minWidth: "700px",
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
    borderBottom: `1px solid ${cc.line}`,
    boxSizing: "border-box",
};

const checkboxCellSx = {
    width: "44px",
    padding: "11px 0 11px 14px",
    boxSizing: "border-box",
};

/** Guide §4.1 checkbox restyle — the only MUI control left on the row. */
const checkboxSx = {
    color: cc.mute,
    padding: "4px",
    "&.Mui-checked": { color: cc.red },
    "&.MuiCheckbox-indeterminate": { color: cc.red },
    ...hover({ background: cc.wash }),
};

const sortBtnSx = {
    ...btnReset,
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontFamily: "inherit",
    fontSize: "inherit",
    fontWeight: "inherit",
    letterSpacing: "inherit",
    textTransform: "inherit",
    color: "inherit",
    transition: "color 200ms",
    ...hover({ color: cc.ink }),
    "&[data-active='true']": { color: cc.ink },
};

/** Guide §4.1 expandable-row marker — the `Disclosure` `+` at 22px. */
const markerSx = {
    ...btnReset,
    width: "22px",
    height: "22px",
    borderRadius: "99px",
    background: cc.srf2,
    color: cc.ink,
    fontSize: "13px",
    lineHeight: 1,
    boxSizing: "border-box",
    transition: `transform 320ms ${SP}, background 200ms, color 200ms`,
    "&[aria-expanded='true']": {
        background: cc.red,
        color: cc.onRed,
        transform: "rotate(135deg)",
    },
};

/** Guide §4.5 pagination strip. */
const paginationSx = {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    flexWrap: "wrap",
    flexShrink: 0,
    padding: "11px 16px",
    borderTop: `1px solid ${cc.line}`,
    background: cc.srf,
    boxSizing: "border-box",
};

/**
 * Guide §4.5 arrow — the `DateSelector` recipe, with one deliberate
 * substitution. The Banner hovers to `srf` because its arrows sit on a `srf2`
 * pill track; `paginationSx` above is itself `srf`, so `srf3` — the token
 * documented for icon-button hover (concourse.js §2) — is the fill that
 * actually reads. Reconciled by the integrator so every page's pager arrow
 * lights up the same way.
 */
const arrowSx = {
    ...btnReset,
    width: "30px",
    height: "30px",
    borderRadius: "99px",
    boxSizing: "border-box",
    color: cc.mute,
    transition: `background 200ms, color 200ms, transform 260ms ${SP}`,
    // `:not(:disabled)` so an end-of-range arrow has no hover at all.
    "@media (hover: hover)": {
        "&:hover:not(:disabled)": {
            background: cc.srf3,
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
    transition: `background 200ms, color 200ms, transform 280ms ${SP}`,
    ...hover({ background: cc.wash, transform: "translateY(-2px)" }),
    "&[aria-current='page']": {
        background: cc.red,
        color: cc.onRed,
        boxShadow: v("glow-pill"),
        transform: "none",
    },
};

const monoSx = { ...ccType.factValueMono, color: cc.ink };

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

/* ==========================================================================
 * Data helpers — unchanged from the pre-redesign file.
 * ========================================================================*/

function createData(id, room, location, capacity, color, image_url) {
    return { id, room, location, capacity, color, image_url };
}

/**
 * Capacity as a rank. A room's `capacity` is a nullable INTEGER, and AddNewRoom
 * posts the field's empty string when it is left blank, so a row can hold a
 * number, a numeric string, "" or null — hence the normalisation:
 *
 *   - unknown (null / undefined / "" / not a number) -> lowest. The column
 *     prints "N/A" for these; an unknown is not a size, so it cannot rank
 *     among the sizes. Ascending lists them first, descending last.
 *   - `0` -> highest. Across this app 0 reads "No limit" (`formatCapacity`,
 *     ConcourseDialogKit) — an unbounded room, which is larger than any
 *     numbered one. Ascending lists it last, descending first.
 *   - `>= 1000` -> its own value. "Large" is a display bucket, not a rank:
 *     1200 still sorts above 900.
 */
function capacityRank(value) {
    const n =
        typeof value === "number"
            ? value
            : typeof value === "string" && value.trim() !== ""
            ? Number(value)
            : NaN;
    if (!Number.isFinite(n)) return -Infinity;
    return n === 0 ? Infinity : n;
}

/** Text keys compare as strings; a missing one is "", never a throw. */
function textKey(value) {
    return value === null || value === undefined ? "" : String(value);
}

/**
 * The value a column sorts on, which has to be the value the column SHOWS.
 * `location` on a room row is the office id, not the office — the cell prints
 * `location.Alias`, so that is what the key resolves to via `aliasOf`.
 */
function sortValue(row, orderBy, aliasOf) {
    if (orderBy === "capacity") return capacityRank(row.capacity);
    if (orderBy === "location") return textKey(aliasOf(row.location));
    return textKey(row[orderBy]);
}

function descendingComparator(a, b, orderBy, aliasOf) {
    const av = sortValue(a, orderBy, aliasOf);
    const bv = sortValue(b, orderBy, aliasOf);
    if (typeof av === "number" && typeof bv === "number") {
        // Compared, not subtracted: `Infinity - Infinity` is NaN, and a NaN
        // from the comparator leaves rows in an arbitrary order.
        if (av === bv) return 0;
        return av < bv ? 1 : -1;
    }
    // Typed by `sortValue`, so this only ever sees two strings — the old
    // `typeof a[orderBy]` test read one side only and called `localeCompare`
    // on the other, which threw on a room with no colour.
    return String(bv).localeCompare(String(av));
}

function getComparator(order, orderBy, aliasOf) {
    return order === "desc"
        ? (a, b) => descendingComparator(a, b, orderBy, aliasOf)
        : (a, b) => -descendingComparator(a, b, orderBy, aliasOf);
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

/**
 * The four sortable heads. Every property here is a field `createData` actually
 * produces: `Location` used to pass "organizer", which no room row has, so the
 * comparator returned 0 for every pair and the rows never moved; `Capacity`
 * used to pass "room", so it sorted by room name and lit the Room head up at
 * the same time. Both heads claimed a sort the table was not doing.
 */
const SORTABLE_COLUMNS = [
    { label: "Room", property: "room" },
    { label: "Color", property: "color" },
    { label: "Location", property: "location" },
    { label: "Capacity", property: "capacity" },
];

/** Numbered page pills with an ellipsis window. */
function buildPageList(current, total) {
    if (total <= 7) {
        return Array.from({ length: total }, (unused, i) => i);
    }
    const wanted = [0, total - 1, current, current - 1, current + 1];
    const kept = [...new Set(wanted)]
        .filter((p) => p >= 0 && p < total)
        .sort((a, b) => a - b);
    const out = [];
    let prev = null;
    kept.forEach((p) => {
        if (prev !== null && p - prev > 1) out.push(`gap-${p}`);
        out.push(p);
        prev = p;
    });
    return out;
}

/** ≤620px key/value line (Guide §4.1 row-card). */
const Kv = ({ label, children, mono }) => (
    <Box
        sx={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "14px",
            alignItems: "baseline",
        }}
    >
        <Box
            sx={{ ...ccType.factKey, color: cc.mute, whiteSpace: "nowrap" }}
        >
            {label}
        </Box>
        <Box
            sx={{
                textAlign: "right",
                minWidth: 0,
                ...(mono ? monoSx : ccType.factValue),
            }}
        >
            {children}
        </Box>
    </Box>
);

export default function Rooms({ setLoading }) {
    const { user } = useAuth();
    const [order, setOrder] = useState("asc");
    const [orderBy, setOrderBy] = useState("room");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [selected, setSelected] = useState([]);
    const [rowsOpen, setRowsOpen] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [filterLocation, setFilterLocation] = useState();
    const [locations, setLocations] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [groups, setGroups] = useState([]);
    const [roomGroups, setRoomGroups] = useState([]);
    const [update, setUpdate] = useState(0);
    const [selectedRoomLocation, setSelectedRoomLocation] = useState("");
    const [selectedRoom, setSelectedRoom] = useState(null);
    // Redesign-only state: the four data states (Guide §3.7) and the
    // destructive-action confirm (Guide §4.7). None of it touches a payload.
    const [hasLoaded, setHasLoaded] = useState(false);
    const [busy, setBusy] = useState(false);
    const [fetchError, setFetchError] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deletePending, setDeletePending] = useState(false);

    const isPhone = useMediaQuery(`(max-width:${bp.sheet}px)`);

    // Unified with Users / BlockedDates / MeetingTypes / Groups / ApprovalQueue:
    // total success -> success, partial -> warning naming the counts, total
    // failure -> an error that always appears.
    //
    // `Promise.all` resolves to an array that is truthy even when every delete
    // failed, so the outcome has to come from the per-item results — and the
    // old `.map` over ALL rooms returned `null` for every unselected row, so
    // the resolved array could not be counted either. Filtering to the targets
    // first makes `results` line up 1:1 with what was actually attempted.
    //
    // `DeleteRoom` raises its own "Room deleted" per item and the server's own
    // wording on a refusal it explains (403 office scoping); the snackbar holds
    // one message at a time, so the aggregate below lands last and wins. On a
    // total failure it must NOT overwrite the server's explanation with generic
    // text — but it must also not go quiet when nothing was said at all, which
    // is what a dropped connection produces (`handleApiResponseError` throws on
    // `response.response.data` and `DeleteRoom`'s `catch` swallows it).
    // `snackbarSpokeSince` is what tells those two apart.
    const handleDeleteSelected = () => {
        const remove = async () => {
            const targets =
                filteredRooms?.filter((itm) => isSelected(itm.id)) || [];
            if (targets.length === 0) {
                setDeletePending(false);
                return;
            }
            const mark = snackbarMark();
            const results = await Promise.all(
                targets.map((itm) => DeleteRoom(itm.id))
            );
            const deleted = results.filter(Boolean).length;
            // Must run on EVERY path, failure included. `deletePending` gates
            // the confirm dialog's "Delete rooms" button and is otherwise only
            // cleared by the load effect's `finally` — which is keyed on
            // `update`, and the total-failure branch below deliberately does
            // not bump `update`. Clearing it only there would leave the button
            // permanently disabled after a failed delete, so the user could
            // never retry without reloading the page.
            setDeletePending(false);
            if (deleted === targets.length) {
                showSuccess(`Room${targets.length > 1 ? "s" : ""} Deleted`);
            } else if (deleted > 0) {
                showWarning(`Deleted ${deleted} of ${targets.length} rooms`);
            } else {
                if (!snackbarSpokeSince(mark)) {
                    showError(
                        `Failed to delete room${targets.length > 1 ? "s" : ""}`
                    );
                }
                // Nothing changed — leave the table and the selection alone so
                // the page cannot imply a delete it did not perform.
                return;
            }
            setSelected([]);
            setUpdate((prev) => prev + 1);
        };
        remove();
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
            // The rows this location filter left on the table, not the whole
            // fetch: select-all used to tick every room in every office, and
            // the toolbar then counted rooms the table was not showing.
            const newSelecteds = filteredRooms?.map((n) => n.id) || [];
            setSelected(newSelecteds);
            return;
        }
        setSelected([]);
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

    const handleRoomEdit = (room, location) => {
        setSelectedRoomLocation(location);
        setSelectedRoom(room);
        setOpenDialog(true);
    };

    const handleAddRoom = () => {
        setSelectedRoom(null);
        setSelectedRoomLocation(filterLocation);
        setOpenDialog(true);
    };

    const isSelected = (id) => selected.indexOf(id) !== -1;
    const isOpen = (id) => rowsOpen.indexOf(id) !== -1;

    useEffect(() => {
        const getData = async () => {
            setLoading(true);
            // Local mirror of the app-wide banner flag: `setLoading` drives the
            // banner bar (which must keep being called) but is not readable
            // here, and Guide §3.7's precedence needs a boolean.
            setBusy(true);
            // try/catch/finally is the redesign's only change to this effect:
            // it is what lets the page render an error state at all. The shared
            // API layer swallows HTTP errors and returns `[]`, so this only
            // fires on a genuine throw — stated in the build report.
            try {
                setFetchError(false);
                const rms = await GetRooms(user.id);
                const lcs = await GetLocations();
                const grps = await GetGroups();
                const rmgps = await GetRoomGroups();

                setRoomGroups(rmgps);
                setLocations(lcs);
                setGroups(grps);
                setFilterLocation(
                    filterLocation?.officeid || filterLocation?.officeid === 0
                        ? filterLocation
                        : lcs?.find((lc) => lc.officeid == user?.location)
                );
                setRooms(rms);
            } catch (err) {
                setFetchError(true);
            } finally {
                setHasLoaded(true);
                setDeletePending(false);
                setBusy(false);
                setLoading(false);
            }
        };
        if (user?.id) {
            getData();
        }
        getData();
    }, [update, user]);

    /**
     * Derived during render, not stored. These were `useState` written from an
     * effect, which left them one render behind `rooms`: the render that
     * committed a successful fetch (`busy` false, `hasLoaded` true, rooms
     * present) still read the previous, empty slice, so the empty state painted
     * for a frame before the rows appeared. Computing them here keeps them in
     * step with `rooms` — same filter, sort and slice as before.
     */
    const filteredRooms = useMemo(() => {
        if (!rooms?.length) return [];
        return filterLocation?.officeid
            ? rooms.filter((rm) => rm.location === filterLocation.officeid)
            : rooms;
    }, [rooms, filterLocation]);

    /**
     * office id -> the Alias the Location cell prints. Matched with `===` on
     * `officeid`, exactly as the row model's own lookup does, so the sort key
     * and the rendered text always come from the same office. "" for an office
     * this fetch did not return, so the key is defined for every row.
     */
    const locationAlias = useMemo(() => {
        const byOfficeId = new Map(
            (locations || []).map((lc) => [lc.officeid, lc.Alias])
        );
        return (officeid) => byOfficeId.get(officeid) ?? "";
    }, [locations]);

    const paginatedRows = useMemo(() => {
        if (!filteredRooms.length) return [];
        const data = filteredRooms.map((itm) =>
            createData(
                itm.id,
                itm.value,
                itm.location,
                itm.capacity,
                itm.color,
                itm.image_url
            )
        );
        const sortedRows = stableSort(
            data,
            getComparator(order, orderBy, locationAlias)
        );
        return sortedRows.slice(
            page * rowsPerPage,
            page * rowsPerPage + rowsPerPage
        );
    }, [filteredRooms, page, rowsPerPage, orderBy, order, locationAlias]);

    /* ------------------------------------------------------------ states --- */

    /**
     * Gated on load completion, not on `user` being resolved: before `hasLoaded`
     * flips there is nothing to be empty about. `hasLoaded` is set in the
     * fetch's `finally`, which runs on every path, so this cannot stick.
     */
    const isSkeleton = busy || !hasLoaded;
    const isErrorState = !isSkeleton && fetchError;
    const isEmptyState =
        !isSkeleton && !fetchError && (paginatedRows?.length || 0) === 0;

    const totalCount = filteredRooms.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));
    /**
     * `page` is never reset when the location filter changes (pre-existing —
     * only `handleChangeRowsPerPage` resets it), so the slice can land past the
     * end of the filtered set. That is NOT "no rooms match": rooms exist, this
     * page just does not hold any. Distinguished so the empty copy never claims
     * something the data contradicts.
     */
    const isPastEnd =
        isEmptyState && totalCount > 0 && (rooms?.length || 0) > 0;
    const from =
        totalCount === 0 || page * rowsPerPage >= totalCount
            ? 0
            : page * rowsPerPage + 1;
    const to = Math.min((page + 1) * rowsPerPage, totalCount);
    const selectedInFilter =
        filteredRooms?.filter((rm) => isSelected(rm.id)).length || 0;

    /* ------------------------------------------------------- row models ---- */

    const rowModels = (paginatedRows || []).map((row) => {
        const roomGroup = roomGroups.filter((rgrp) => rgrp.room_id === row.id);
        const roomGroupIds = roomGroup.map((rg) => rg.group_id);
        const accessGroups = groups.filter((grp) =>
            roomGroupIds.includes(grp.id)
        );
        const location = locations?.find((lc) => lc.officeid === row.location);
        const rowRoom = filteredRooms?.find((fr) => fr.id === row.id);
        return { row, accessGroups, location, rowRoom };
    });

    /* --------------------------------------------------------- fragments --- */

    const selectAllCheckbox = (
        <Checkbox
            sx={checkboxSx}
            // The box has to describe the rows underneath it. Measured against
            // the raw fetch it never reached "checked" once a filter was on,
            // and it read "indeterminate" for rooms the table was not showing.
            indeterminate={
                selectedInFilter > 0 && selectedInFilter < filteredRooms.length
            }
            checked={
                filteredRooms.length > 0 &&
                selectedInFilter === filteredRooms.length
            }
            onChange={handleSelectAllClick}
            inputProps={{
                "aria-label": "select all rooms",
            }}
        />
    );

    const sortButton = (label, property) => {
        const active = orderBy === property;
        return (
            <Box
                component="button"
                type="button"
                data-active={active ? "true" : "false"}
                onClick={(event) => handleRequestSort(event, property)}
                sx={sortBtnSx}
            >
                {label}
                {active ? (
                    <Box
                        component="span"
                        aria-hidden="true"
                        sx={{
                            fontSize: "9px",
                            lineHeight: 1,
                            color: cc.red,
                            display: "inline-block",
                            transition: `transform 320ms ${SP}`,
                            transform:
                                order === "desc" ? "rotate(180deg)" : "none",
                        }}
                    >
                        ▲
                    </Box>
                ) : null}
            </Box>
        );
    };

    const ariaSort = (property) =>
        orderBy === property
            ? order === "asc"
                ? "ascending"
                : "descending"
            : "none";

    const expandMarker = (row, isItemOpen, detailId) => (
        <Box
            component="button"
            type="button"
            aria-expanded={isItemOpen}
            aria-controls={detailId}
            aria-label={`Toggle details for ${row.room}`}
            onClick={(event) => {
                // The whole row is clickable; without this the marker would
                // toggle the Collapse twice.
                event.stopPropagation();
                handleOpenClick(event, row.id);
            }}
            sx={markerSx}
        >
            +
        </Box>
    );

    const rowDetail = (model) => (
        <RowRoom
            location={model.location}
            row={model.row}
            groups={groups}
            roomgroups={roomGroups}
            setOpen={handleRoomEdit}
            rowRoom={model.rowRoom}
        />
    );

    /* ----------------------------------------------------------- desktop --- */

    const tableSkeleton = (
        <Box component="table" sx={tableSx}>
            <Box component="thead">
                <Box component="tr">
                    <Box component="th" sx={{ ...thSx, ...checkboxCellSx }} />
                    <Box component="th" sx={{ ...thSx, width: "34px" }} />
                    <Box component="th" sx={thSx}>
                        Room
                    </Box>
                    <Box component="th" sx={thSx}>
                        Groups
                    </Box>
                    <Box component="th" sx={thSx}>
                        Color
                    </Box>
                    <Box component="th" sx={thSx}>
                        Location
                    </Box>
                    <Box component="th" sx={{ ...thSx, textAlign: "right" }}>
                        Capacity
                    </Box>
                </Box>
            </Box>
            <Box component="tbody">
                {Array.from({ length: 8 }, (unused, i) => (
                    <Box component="tr" key={i}>
                        <Box component="td" sx={{ ...tdSx, ...checkboxCellSx }}>
                            <Sk
                                sx={{
                                    width: "18px",
                                    height: "18px",
                                    borderRadius: "6px",
                                }}
                            />
                        </Box>
                        <Box component="td" sx={{ ...tdSx, width: "34px" }}>
                            <Sk
                                sx={{
                                    width: "22px",
                                    height: "22px",
                                    borderRadius: "99px",
                                }}
                            />
                        </Box>
                        <Box component="td" sx={tdSx}>
                            <Sk sx={{ height: "13px", width: "70%" }} />
                        </Box>
                        <Box component="td" sx={tdSx}>
                            <Sk sx={{ height: "13px", width: "45%" }} />
                        </Box>
                        <Box component="td" sx={tdSx}>
                            <Sk
                                sx={{
                                    width: "34px",
                                    height: "20px",
                                    borderRadius: "7px",
                                }}
                            />
                        </Box>
                        <Box component="td" sx={tdSx}>
                            <Sk sx={{ height: "13px", width: "55%" }} />
                        </Box>
                        <Box component="td" sx={{ ...tdSx, textAlign: "right" }}>
                            <Sk
                                sx={{
                                    height: "13px",
                                    width: "60%",
                                    marginLeft: "auto",
                                }}
                            />
                        </Box>
                    </Box>
                ))}
            </Box>
        </Box>
    );

    const table = (
        <Box component="table" sx={tableSx}>
            <Box component="thead">
                <Box component="tr">
                    <Box component="th" sx={{ ...thSx, ...checkboxCellSx }}>
                        {selectAllCheckbox}
                    </Box>
                    <Box component="th" sx={{ ...thSx, width: "34px" }} />
                    <Box component="th" sx={thSx} aria-sort={ariaSort("room")}>
                        {sortButton("Room", "room")}
                    </Box>
                    <Box component="th" sx={thSx}>
                        Groups
                    </Box>
                    <Box component="th" sx={thSx} aria-sort={ariaSort("color")}>
                        {sortButton("Color", "color")}
                    </Box>
                    <Box
                        component="th"
                        sx={thSx}
                        aria-sort={ariaSort("location")}
                    >
                        {sortButton("Location", "location")}
                    </Box>
                    <Box
                        component="th"
                        sx={{ ...thSx, textAlign: "right" }}
                        aria-sort={ariaSort("capacity")}
                    >
                        {sortButton("Capacity", "capacity")}
                    </Box>
                </Box>
            </Box>
            <Box component="tbody">
                {rowModels.map((model, index) => {
                    const { row, accessGroups, location } = model;
                    const isItemSelected = isSelected(row.id);
                    const isItemOpen = isOpen(row.id);
                    const isLast = index === rowModels.length - 1;
                    const cellSx = isLast
                        ? { ...tdSx, borderBottom: 0 }
                        : tdSx;
                    const detailId = `rooms-detail-${row.id}`;
                    return (
                        <React.Fragment key={row.id}>
                            {/* The row is a table row, not a control: it kept
                                `role="checkbox"` while its click handler
                                expanded the detail panel, so it announced one
                                thing and did another. The two actions each own
                                a real control inside the row — the `Checkbox`
                                below (Space toggles selection) and the
                                `expandMarker` button (Space/Enter toggle the
                                Collapse, `aria-expanded` reports it). Row click
                                stays as a pointer shortcut for the marker. */}
                            <Box
                                component="tr"
                                onClick={(e) => handleOpenClick(e, row.id)}
                                sx={{
                                    cursor: "pointer",
                                    transition: "background 200ms",
                                    ...(isItemSelected
                                        ? { background: cc.wash }
                                        : null),
                                    ...hover({ background: cc.wash }),
                                }}
                            >
                                <Box
                                    component="td"
                                    sx={{
                                        ...cellSx,
                                        ...checkboxCellSx,
                                        ...(isItemSelected
                                            ? {
                                                  boxShadow: `inset 3px 0 0 ${cc.red}`,
                                              }
                                            : null),
                                    }}
                                >
                                    <Checkbox
                                        sx={checkboxSx}
                                        onClick={(event) => {
                                            event.stopPropagation(); // Prevent the event from bubbling up
                                            handleClick(event, row.id);
                                        }}
                                        checked={isItemSelected}
                                        inputProps={{
                                            "aria-labelledby": `enhanced-table-checkbox-${row.id}`,
                                        }}
                                    />
                                </Box>
                                <Box
                                    component="td"
                                    sx={{ ...cellSx, width: "34px" }}
                                >
                                    {expandMarker(row, isItemOpen, detailId)}
                                </Box>
                                <Box
                                    component="th"
                                    scope="row"
                                    id={`enhanced-table-checkbox-${row.id}`}
                                    sx={{
                                        ...cellSx,
                                        position: "static",
                                        textAlign: "left",
                                        ...ccType.cardName,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        maxWidth: "260px",
                                    }}
                                >
                                    {row.room}
                                </Box>
                                <Box
                                    component="td"
                                    sx={{ ...cellSx, maxWidth: "280px" }}
                                >
                                    <DisplayGroups groups={accessGroups} />
                                </Box>
                                <Box component="td" sx={cellSx}>
                                    {row.color ? (
                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                            }}
                                        >
                                            <ColorSwatch color={row.color} />
                                            <Box
                                                component="span"
                                                sx={{
                                                    ...ccType.factValueMono,
                                                    color: cc.mute,
                                                }}
                                            >
                                                {row.color}
                                            </Box>
                                        </Box>
                                    ) : null}
                                </Box>
                                <Box
                                    component="td"
                                    sx={{ ...cellSx, ...ccType.factValue }}
                                >
                                    {location?.Alias}
                                </Box>
                                <Box
                                    component="td"
                                    sx={{
                                        ...cellSx,
                                        textAlign: "right",
                                        ...ccType.factValueMono,
                                        color: row.capacity ? cc.ink : cc.mute,
                                    }}
                                >
                                    {row.capacity ? row.capacity : "N/A"}
                                </Box>
                            </Box>
                            <Box component="tr">
                                <Box
                                    component="td"
                                    id={detailId}
                                    colSpan={7}
                                    sx={{
                                        padding: 0,
                                        border: 0,
                                        boxSizing: "border-box",
                                    }}
                                >
                                    <Collapse
                                        in={isItemOpen}
                                        timeout="auto"
                                        unmountOnExit
                                    >
                                        <Box sx={{ padding: "0 14px 12px" }}>
                                            {rowDetail(model)}
                                        </Box>
                                    </Collapse>
                                </Box>
                            </Box>
                        </React.Fragment>
                    );
                })}
            </Box>
        </Box>
    );

    /* ------------------------------------------------------------- phone --- */

    const phoneControls = (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "0 12px 10px",
                overflowX: "auto",
                scrollbarWidth: "thin",
                boxSizing: "border-box",
                ...ccType.blockLabel,
                color: cc.mute,
            }}
        >
            {selectAllCheckbox}
            {SORTABLE_COLUMNS.map((col) => (
                <Box component="span" key={col.label} sx={{ flex: "none" }}>
                    {sortButton(col.label, col.property)}
                </Box>
            ))}
        </Box>
    );

    const cardList = (
        <Box
            sx={{
                display: "grid",
                gap: "8px",
                padding: "0 12px 14px",
                boxSizing: "border-box",
            }}
        >
            {rowModels.map((model) => {
                const { row, accessGroups, location } = model;
                const isItemSelected = isSelected(row.id);
                const isItemOpen = isOpen(row.id);
                const detailId = `rooms-detail-card-${row.id}`;
                return (
                    <Box
                        key={row.id}
                        sx={{
                            background: cc.srf2,
                            borderRadius: "18px",
                            padding: "12px 14px",
                            display: "grid",
                            gap: "6px",
                            boxSizing: "border-box",
                            ...(isItemSelected
                                ? { boxShadow: `inset 3px 0 0 ${cc.red}` }
                                : null),
                        }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                minWidth: 0,
                            }}
                        >
                            <Checkbox
                                sx={checkboxSx}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    handleClick(event, row.id);
                                }}
                                checked={isItemSelected}
                                inputProps={{
                                    "aria-labelledby": `rooms-card-name-${row.id}`,
                                }}
                            />
                            <Box
                                id={`rooms-card-name-${row.id}`}
                                sx={{
                                    ...ccType.cardName,
                                    minWidth: 0,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {row.room}
                            </Box>
                        </Box>
                        <Kv label="Location">{location?.Alias}</Kv>
                        <Kv label="Capacity" mono>
                            <Box
                                component="span"
                                sx={{
                                    color: row.capacity ? cc.ink : cc.mute,
                                }}
                            >
                                {row.capacity ? row.capacity : "N/A"}
                            </Box>
                        </Kv>
                        {row.color ? (
                            <Kv label="Color">
                                <ColorSwatch color={row.color} />
                            </Kv>
                        ) : null}
                        {accessGroups.length > 0 ? (
                            <Box
                                sx={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: "2px",
                                }}
                            >
                                <DisplayGroups groups={accessGroups} />
                            </Box>
                        ) : null}
                        <Box
                            component="button"
                            type="button"
                            aria-expanded={isItemOpen}
                            aria-controls={detailId}
                            onClick={(event) =>
                                handleOpenClick(event, row.id)
                            }
                            sx={{
                                ...btnReset,
                                justifyContent: "flex-start",
                                gap: "10px",
                                width: "100%",
                                marginTop: "4px",
                                ...ccType.discSummary,
                                color: cc.ink,
                            }}
                        >
                            <Box
                                component="span"
                                aria-hidden="true"
                                sx={{
                                    width: "22px",
                                    height: "22px",
                                    flex: "none",
                                    borderRadius: "99px",
                                    boxSizing: "border-box",
                                    display: "grid",
                                    placeItems: "center",
                                    fontSize: "13px",
                                    lineHeight: 1,
                                    // The card is `srf2`, so the marker rests
                                    // on `srf` — the kit's own inversion.
                                    background: isItemOpen ? cc.red : cc.srf,
                                    color: isItemOpen ? cc.onRed : cc.ink,
                                    transform: isItemOpen
                                        ? "rotate(135deg)"
                                        : "none",
                                    transition: `transform 320ms ${SP}, background 200ms, color 200ms`,
                                }}
                            >
                                +
                            </Box>
                            Details
                        </Box>
                        <Box id={detailId}>
                            <Collapse
                                in={isItemOpen}
                                timeout="auto"
                                unmountOnExit
                            >
                                {rowDetail(model)}
                            </Collapse>
                        </Box>
                    </Box>
                );
            })}
        </Box>
    );

    const cardSkeleton = (
        <Box
            sx={{
                display: "grid",
                gap: "8px",
                padding: "0 12px 14px",
                boxSizing: "border-box",
            }}
        >
            {Array.from({ length: 6 }, (unused, i) => (
                <Box
                    key={i}
                    sx={{
                        background: cc.srf2,
                        borderRadius: "18px",
                        padding: "12px 14px",
                        display: "grid",
                        gap: "8px",
                        boxSizing: "border-box",
                    }}
                >
                    <Sk sx={{ height: "14px", width: "70%" }} />
                    <Sk sx={{ height: "12px", width: "45%" }} />
                    <Sk sx={{ height: "12px", width: "60%" }} />
                </Box>
            ))}
        </Box>
    );

    /* ------------------------------------------------------------ render --- */

    const body = isSkeleton ? (
        isPhone ? (
            cardSkeleton
        ) : (
            tableSkeleton
        )
    ) : isErrorState ? (
        <StateBlock
            icon="!"
            danger
            title="We couldn't load rooms"
            body="The service didn't answer. Nothing was changed. Try again, or reload the page."
            actions={
                <CcButton
                    variant="primary"
                    onClick={() => setUpdate((prev) => prev + 1)}
                >
                    Try again
                </CcButton>
            }
        />
    ) : isPastEnd ? (
        // The filtered set is not empty — the current page index is simply
        // past its end. Says only that, and offers the way back.
        <StateBlock
            icon="🚪"
            title="Nothing on this page"
            body="This page sits past the end of the list. Go back to the first page to see the rooms."
            actions={
                <CcButton variant="primary" onClick={() => setPage(0)}>
                    Go to first page
                </CcButton>
            }
        />
    ) : isEmptyState ? (
        <StateBlock
            icon="🚪"
            title={
                rooms?.length
                    ? filterLocation?.Alias
                        ? `No rooms in ${filterLocation.Alias}`
                        : "No rooms match this filter"
                    : "No rooms yet"
            }
            body={
                rooms?.length
                    ? // Backed: `rooms.length > 0` while the filtered set is
                      // empty means rooms exist under another office id.
                      "Rooms exist in other locations. Change the location filter, or add one here."
                    : // Deliberately makes no claim about who will see it —
                      // room visibility is driven by access groups, not by
                      // location, and this page never resolves that.
                      "Add a room and it will appear in this list."
            }
            actions={
                <CcButton variant="primary" onClick={handleAddRoom}>
                    Add room
                </CcButton>
            }
        />
    ) : isPhone ? (
        <React.Fragment>
            {phoneControls}
            {cardList}
        </React.Fragment>
    ) : (
        table
    );

    return (
        <React.Fragment>
            <AddNewRoom
                open={openDialog}
                setOpen={setOpenDialog}
                selectedRoom={selectedRoom}
                roomLocation={selectedRoomLocation}
                roomGroups={roomGroups}
                locations={locations}
                groups={groups}
                setUpdate={setUpdate}
            />

            {/* Guide §4.7 — delete-selected used to fire straight off a bare
                30x30 glyph with no confirmation at all. */}
            <Dialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                {...scopeDialogProps(480)}
            >
                <DialogSurface accent="var(--cc-red)">
                    <DialogHeader
                        title="Delete selected rooms?"
                        onClose={() => setConfirmOpen(false)}
                    />
                    <DialogBody>
                        <AlertBlock
                            title="This cannot be undone"
                            body="The rooms are removed from the picker."
                        />
                        <Facts>
                            <Fact label="Rooms" mono>
                                {selectedInFilter}
                            </Fact>
                        </Facts>
                    </DialogBody>
                    <DialogFooter>
                        <CcButton
                            variant="danger"
                            disabled={deletePending}
                            onClick={() => {
                                setDeletePending(true);
                                setConfirmOpen(false);
                                handleDeleteSelected();
                            }}
                        >
                            Delete rooms
                        </CcButton>
                        <Spacer />
                        <CcButton onClick={() => setConfirmOpen(false)}>
                            Keep them
                        </CcButton>
                    </DialogFooter>
                </DialogSurface>
            </Dialog>

            {/* `--cc-c` defaults to the meeting-type green; this page has no
                per-record accent, so pin it to red (Guide §7.5). */}
            <Box sx={pageSx} style={{ "--cc-c": "var(--cc-red)" }}>
                <Box sx={cardSx}>
                    <Box sx={toolbarSx}>
                        {/* Delete only removes rows the current filter left on
                            the table, so this has to count the same set —
                            `selected.length` advertised out-of-filter ids that
                            the delete would silently skip. */}
                        {selectedInFilter > 0 ? (
                            <Box
                                sx={{
                                    ...ccType.factKey,
                                    color: cc.mute,
                                    display: "flex",
                                    alignItems: "baseline",
                                    gap: "5px",
                                }}
                            >
                                <Box component="span" sx={monoSx}>
                                    {selectedInFilter}
                                </Box>
                                selected
                            </Box>
                        ) : null}
                        <Box sx={{ flex: 1 }} />
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                minWidth: 0,
                                [MQ_PHONE]: { flex: "1 1 140px" },
                            }}
                        >
                            <Box
                                sx={{
                                    ...ccType.factKey,
                                    color: cc.mute,
                                    whiteSpace: "nowrap",
                                }}
                            >
                                Filter By Location
                            </Box>
                            <CcSelect
                                ariaLabel="Filter By Location"
                                value={
                                    filterLocation?.officeid === 0
                                        ? 0
                                        : filterLocation?.officeid
                                        ? filterLocation.officeid
                                        : ""
                                }
                                onChange={(e) => {
                                    const selectedItem = locations?.find(
                                        (itm) => itm.officeid === e.target.value
                                    );
                                    setFilterLocation(selectedItem); // Return the entire object
                                }}
                                sx={{
                                    width: "auto",
                                    minWidth: "170px",
                                    flex: "none",
                                    [MQ_PHONE]: { flex: 1, minWidth: 0 },
                                }}
                            >
                                {locations?.map((itm, index) => (
                                    <MenuItem key={index} value={itm.officeid}>
                                        {itm.Alias}
                                    </MenuItem>
                                ))}
                            </CcSelect>
                        </Box>
                        {selectedInFilter > 0 && (
                            <CcButton
                                variant="danger"
                                aria-label="Delete selected"
                                onClick={() => setConfirmOpen(true)}
                                sx={{
                                    padding: "6px 13px",
                                    fontSize: "12.5px",
                                }}
                            >
                                Delete selected
                            </CcButton>
                        )}
                        <CcButton
                            variant="primary"
                            aria-label="Add room"
                            onClick={handleAddRoom}
                            sx={{
                                [MQ_PHONE]: { flex: "1 1 100%", order: 9 },
                            }}
                        >
                            Add room
                        </CcButton>
                    </Box>

                    <Box sx={scrollAreaSx}>{body}</Box>

                    <Box sx={paginationSx}>
                        <Box
                            sx={{
                                ...ccType.factKey,
                                color: cc.mute,
                                display: "flex",
                                alignItems: "baseline",
                                gap: "5px",
                                [MQ_PHONE]: { width: "100%", order: 9 },
                            }}
                        >
                            Showing
                            <Box component="span" sx={monoSx}>
                                {from === 0 ? "0" : `${from}–${to}`}
                            </Box>
                            of
                            <Box component="span" sx={monoSx}>
                                {totalCount}
                            </Box>
                        </Box>
                        <Box
                            component="nav"
                            aria-label="Pagination"
                            sx={{
                                marginLeft: "auto",
                                display: "flex",
                                alignItems: "center",
                                gap: "9px",
                                flexWrap: "wrap",
                                [MQ_PHONE]: {
                                    marginLeft: 0,
                                    width: "100%",
                                    justifyContent: "space-between",
                                },
                            }}
                        >
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "7px",
                                }}
                            >
                                <Box
                                    component="span"
                                    sx={{
                                        ...ccType.factKey,
                                        color: cc.mute,
                                    }}
                                >
                                    Rows
                                </Box>
                                <CcSelect
                                    ariaLabel="Rows per page"
                                    mono
                                    value={rowsPerPage}
                                    onChange={handleChangeRowsPerPage}
                                    sx={{ width: "auto", minWidth: "84px" }}
                                >
                                    {ROWS_PER_PAGE_OPTIONS.map((opt) => (
                                        <MenuItem key={opt} value={opt}>
                                            {opt}
                                        </MenuItem>
                                    ))}
                                </CcSelect>
                            </Box>
                            <Box
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
                                {buildPageList(page, totalPages).map((p) =>
                                    typeof p === "number" ? (
                                        <Box
                                            component="button"
                                            type="button"
                                            key={p}
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
                                    ) : (
                                        <Box
                                            component="span"
                                            key={p}
                                            aria-hidden="true"
                                            sx={{
                                                fontSize: "12.5px",
                                                color: cc.mute,
                                                padding: "0 2px",
                                            }}
                                        >
                                            …
                                        </Box>
                                    )
                                )}
                                <Box
                                    component="button"
                                    type="button"
                                    aria-label="Next page"
                                    disabled={page >= totalPages - 1}
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
                </Box>
            </Box>
        </React.Fragment>
    );
}
