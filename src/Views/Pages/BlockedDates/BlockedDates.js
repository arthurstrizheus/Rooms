import React, { useState, useEffect } from "react";
import {
    Box,
    Checkbox,
    Dialog,
    MenuItem,
    useMediaQuery,
} from "@mui/material";
import AddIcon from "@mui/icons-material/AddOutlined";
import { useAuth } from "../../../Utilites/AuthContext";
import { getDateAmPm } from "../../../Utilites/Functions/CommonFunctions";
import AddBlockedDate from "./Components/AddBlockedDate";
import {
    GetBlockedDatess,
    GetGroups,
    GetGroupUsers,
    GetLocations,
    GetRoomGroups,
    GetRooms,
    showError,
    showSuccess,
    showWarning,
    UserAnyAccessRooms,
    UserFullAccessRooms,
} from "../../../Utilites/Functions/ApiFunctions";
import {
    snackbarMark,
    snackbarSpokeSince,
} from "../../../Utilites/SnackbarContext";
import { DeleteBlockedDate } from "../../../Utilites/Functions/ApiFunctions/BlockedDatesFunctions";
import {
    bp,
    motion as ccMotion,
    type as ccType,
    v,
} from "../../../Utilites/concourse";
import {
    AlertBlock,
    CcButton,
    CcSelect,
    DialogBody,
    DialogFooter,
    DialogHeader,
    DialogSurface,
    Fact,
    Facts,
    HOVER,
    Spacer,
    scopeDialogProps,
} from "../../Components/Concourse/ConcourseDialogKit";
import { btnReset, ChevronIcon, hover } from "../../Components/Banner/Components/atoms";

/* ==========================================================================
 * Concourse recipes used by this page
 * ========================================================================*/

const SP = ccMotion.spring;
const PHONE_MQ = `@media (max-width:${bp.sheet}px)`;

/** §3.2 page shell — verbatim, plus the border-box the app's missing
 *  CssBaseline makes mandatory (§7.1). */
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

/** §3.3 card, in its `fillHeight` shape — the table scrolls inside it. */
const cardSx = {
    background: "var(--cc-srf)",
    borderRadius: "26px",
    boxShadow: "var(--cc-sh2)",
    overflow: "hidden",
    boxSizing: "border-box",
    flexShrink: 0,
    animation: `${ccMotion.keyframes.card} ${ccMotion.dur.card}ms ${SP} ${ccMotion.delay.card}ms both`,
    [PHONE_MQ]: { borderRadius: "22px" },
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
};

/** §3.5 card toolbar. */
const toolbarSx = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    flexShrink: 0,
    padding: "13px 16px 11px",
    boxSizing: "border-box",
};

/** §4.1 table wrapper — the one internal scroll region. */
const tableWrapSx = {
    overflowX: "auto",
    overflowY: "auto",
    scrollbarWidth: "thin",
    boxSizing: "border-box",
    flex: 1,
    minHeight: 0,
};

const tableSx = {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    boxSizing: "border-box",
    minWidth: "760px",
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

const thCheckboxSx = {
    ...thSx,
    width: "44px",
    padding: "6px 0 6px 14px",
};

const tdSx = {
    padding: "11px 14px",
    verticalAlign: "middle",
    fontSize: "13.5px",
    color: "var(--cc-ink)",
    borderBottom: "1px solid var(--cc-line)",
    boxSizing: "border-box",
};

const tdCheckboxSx = {
    ...tdSx,
    width: "44px",
    padding: "11px 0 11px 14px",
};

/** §4.1 — hover is background only; a row must never transform (§5.4). */
const trSx = (isItemSelected) => ({
    transition: `background ${ccMotion.dur.colour}ms`,
    ...(isItemSelected ? { background: "var(--cc-wash)" } : null),
    [HOVER]: { "&:hover": { background: "var(--cc-wash)" } },
    ...(isItemSelected
        ? {
              "& > td:first-of-type, & > th:first-of-type": {
                  boxShadow: "inset 3px 0 0 var(--cc-red)",
              },
          }
        : null),
    "&:last-of-type > td, &:last-of-type > th": { borderBottom: 0 },
});

const checkboxSx = {
    color: "var(--cc-mute)",
    "&.Mui-checked": { color: "var(--cc-red)" },
    "&.MuiCheckbox-indeterminate": { color: "var(--cc-red)" },
    padding: "4px",
};

const ellipsisSx = {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
};

/** §4.5 pagination footer strip. */
const footerSx = {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    flexWrap: "wrap",
    flexShrink: 0,
    padding: "11px 16px",
    borderTop: "1px solid var(--cc-line)",
    background: "var(--cc-srf)",
    boxSizing: "border-box",
};

/**
 * The `DateSelector` arrow (§4.5), with one deliberate substitution. The Banner's
 * recipe hovers to `srf` because its arrows sit on a `srf2` pill track; this
 * pagination strip's own ground IS `srf`, so `srf` would be an invisible fill.
 * `srf3` is the token documented for icon-button hover (concourse.js §2) and is
 * what MyBookings/Resources already use on the same strip. Reconciled by the
 * integrator so every page's pager arrow lights up the same way.
 */
const arrowSx = {
    ...btnReset,
    width: "30px",
    height: "30px",
    borderRadius: "99px",
    boxSizing: "border-box",
    color: "var(--cc-mute)",
    transition: [
        `background ${ccMotion.dur.colour}ms`,
        `color ${ccMotion.dur.colour}ms`,
        `transform ${ccMotion.dur.arrow}ms ${SP}`,
    ].join(", "),
    // §4.5: "&:disabled -> opacity:.4; cursor:default with NO hover". A
    // disabled <button> still matches :hover, so the guard has to be in the
    // selector — otherwise the greyed-out arrow at either end of the range
    // lights up as though it were actionable.
    [HOVER]: {
        "&:hover:not(:disabled)": {
            background: "var(--cc-srf3)",
            color: "var(--cc-ink)",
            boxShadow: "var(--cc-sh1)",
        },
    },
    "&:active:not(:disabled)": { transform: "scale(.88)" },
    "&:disabled": { opacity: 0.4, cursor: "default" },
};

const pagePillSx = (current) => ({
    ...btnReset,
    width: "27px",
    height: "27px",
    borderRadius: "99px",
    boxSizing: "border-box",
    background: current ? "var(--cc-red)" : "var(--cc-srf2)",
    color: current ? "var(--cc-on-red)" : "var(--cc-ink)",
    ...ccType.pickerDay,
    ...(current ? { boxShadow: v("glow-pill") } : null),
    transition: [
        `background ${ccMotion.dur.colour}ms`,
        `color ${ccMotion.dur.colour}ms`,
        `transform ${ccMotion.dur.lift}ms ${SP}`,
    ].join(", "),
    ...(current
        ? null
        : hover({
              background: "var(--cc-wash)",
              transform: "translateY(-2px)",
          })),
});

/** §4.1 phone row-card. */
const rowCardListSx = {
    display: "grid",
    gap: "8px",
    padding: "0 12px 14px",
    boxSizing: "border-box",
    overflowY: "auto",
    scrollbarWidth: "thin",
    flex: 1,
    minHeight: 0,
};

const rowCardSx = (isItemSelected) => ({
    background: "var(--cc-srf2)",
    borderRadius: "18px",
    padding: "12px 14px",
    display: "grid",
    gap: "6px",
    boxSizing: "border-box",
    ...(isItemSelected ? { boxShadow: "inset 3px 0 0 var(--cc-red)" } : null),
});

const pairSx = {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    gap: "14px",
    alignItems: "baseline",
};

const pairKeySx = {
    ...ccType.factKey,
    color: "var(--cc-mute)",
    whiteSpace: "nowrap",
};

const pairValueSx = { ...ccType.factValue, textAlign: "right", minWidth: 0 };

/* ==========================================================================
 * Skeleton (§3.7)
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

const SK_WIDTHS = ["70%", "45%", "85%", "55%", "60%"];
const SK_ROWS = [0, 1, 2, 3, 4, 5, 6, 7];

/* ==========================================================================
 * Empty / error state (§3.7)
 * ========================================================================*/

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
                boxShadow: "var(--cc-sh1)",
                boxSizing: "border-box",
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
 * Column model — one source of truth for the head, the body and the skeleton
 * ========================================================================*/

const COLUMNS = [
    { key: "name", label: "Name" },
    { key: "description", label: "Description" },
    { key: "room", label: "Room" },
    { key: "date", label: "Date" },
    { key: "start", label: "Start Time" },
    { key: "end", label: "End Time" },
    { key: "repeats", label: "Repeats" },
];

/**
 * The page holds the whole filtered set client-side, so the total is real and
 * a numbered strip is honest (§4.5 / spec §5.8). Windowed to 7 slots.
 */
const buildPageList = (current, count) => {
    if (count <= 7) return Array.from({ length: count }, (_, i) => i);
    const around = [current - 1, current, current + 1].filter(
        (n) => n > 0 && n < count - 1
    );
    const shown = [...new Set([0, ...around, count - 1])].sort((a, b) => a - b);
    const out = [];
    shown.forEach((n, i) => {
        if (i > 0 && n - shown[i - 1] > 1) out.push(`gap-${n}`);
        out.push(n);
    });
    return out;
};

function createData(
    id,
    name,
    description,
    room_id,
    start_time,
    end_time,
    repeats
) {
    return { id, name, description, room_id, start_time, end_time, repeats };
}

export default function BlockedDates({ setLoading }) {
    const { user } = useAuth();
    const isPhone = useMediaQuery(`(max-width:${bp.sheet}px)`);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [filterLocation, setFilterLocation] = useState();
    const [paginatedRows, setPaginatedRows] = useState([]);
    const [filteredDates, setFilteredDates] = useState([]);
    const [selected, setSelected] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [locations, setLocations] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [blockedDates, setBlockedDates] = useState([]);
    const [fullAccessRoms, setFullAccessRoms] = useState([]);
    const [update, setUpdate] = useState(0);

    // §3.7 — the page's own load flags. Deliberately NOT the shared `loading`
    // prop, which is app-global and set by other pages.
    const [hasLoaded, setHasLoaded] = useState(false);
    const [busy, setBusy] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleDeleteSelected = () => {
        const remove = async () => {
            const targets =
                filteredDates?.filter((itm) => isSelected(itm.id)) || [];
            if (targets.length === 0) return;
            // `Promise.all` resolves to an array, which is truthy even when
            // every delete failed, so the outcome has to come from the per-item
            // results. `DeleteBlockedDate` resolves true/false and never
            // rejects.
            //
            // Where the server explains a refusal — the 403 for a room outside
            // your office — the helper has ALREADY raised that wording, and the
            // snackbar holds one message at a time, so a generic toast here
            // would replace the server's words. But when the request never
            // reaches the server the helper says nothing at all:
            // `handleApiResponseError` dereferences `response.response.data` on
            // a network error, throws, and the helper's own `catch` swallows it
            // and returns false. Those two cases are identical from the return
            // value, which is why the earlier fix went silent on both.
            // `snackbarSpokeSince` separates them: the server keeps its wording
            // where it spoke, and a total failure still always speaks.
            const mark = snackbarMark();
            const results = await Promise.all(
                targets.map((itm) => DeleteBlockedDate(itm.id))
            );
            const deleted = results.filter(Boolean).length;
            if (deleted === targets.length) {
                showSuccess("Items Deleted");
            } else if (deleted > 0) {
                showWarning(`Deleted ${deleted} of ${targets.length} items`);
            } else {
                if (!snackbarSpokeSince(mark)) {
                    showError(
                        `Could not delete ${
                            targets.length > 1 ? "the selected items" : "the item"
                        }.`
                    );
                }
                // Nothing was deleted, so the table must not change. Refetching
                // here is what produced the false empty state: `GetBlockedDatess`
                // returns [] when the request fails just as it does when there
                // is genuinely nothing, and the page renders "No blocked dates"
                // off `paginatedRows.length === 0` — reading as though every
                // delete had worked. Keep the rows and the selection so the
                // user can see what still exists and retry.
                return;
            }
            setSelected([]);
            setUpdate((prev) => prev + 1);
        };
        // `return` added so the confirm dialog can show a pending state; the
        // body is otherwise byte-identical and nothing else consumes it.
        return remove();
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
            const newSelecteds = filteredDates?.map((n) => n.id);
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

    const isSelected = (id) => selected.indexOf(id) !== -1;

    const closeConfirm = () => setConfirmOpen(false);

    const onConfirmDelete = async () => {
        setDeleting(true);
        try {
            await handleDeleteSelected();
        } finally {
            setDeleting(false);
            setConfirmOpen(false);
        }
    };

    useEffect(() => {
        const getData = async () => {
            setLoading(true);
            setBusy(true);
            const lcs = await GetLocations();
            const rms = await GetRooms(user.id);
            const rmgps = await GetRoomGroups();
            const blc = await GetBlockedDatess();
            const usrgrps = await GetGroupUsers(filterLocation?.officeid || 0);
            const grps = await GetGroups();

            setLocations(lcs);
            setRooms(UserAnyAccessRooms(usrgrps, grps, rmgps, rms, user));
            setFullAccessRoms(
                UserFullAccessRooms(usrgrps, grps, rmgps, rms, user)
            );
            setBlockedDates(blc);
            setFilterLocation(lcs?.find((lc) => lc.officeid == user?.location));
            setLoading(false);
            setBusy(false);
            setHasLoaded(true);
        };
        if (user?.id) {
            getData();
        }
    }, [update, user]);

    useEffect(() => {
        if (blockedDates?.length) {
            // `filterLocation` is undefined until the load effect resolves, and
            // stays undefined when GetLocations returns [] or returns a list
            // with no entry for the user's own location. This read used to
            // dereference it unguarded and threw for the whole page. No
            // location scope means no location narrowing — the rooms list is
            // already permission-scoped — which is what the other filtered
            // pages do. `== null` so officeid 0 still scopes as before.
            const filteredBlockedDates = blockedDates?.filter((bd) =>
                rooms?.find(
                    (fr) =>
                        fr.id == bd.room_id &&
                        (filterLocation?.officeid == null ||
                            fr.location === filterLocation.officeid)
                )
            );

            setFilteredDates(filteredBlockedDates);
            const data = filteredBlockedDates?.map((itm) => {
                return createData(
                    itm.id,
                    itm.name,
                    itm.description,
                    itm.room_id,
                    itm.start_time,
                    itm.end_time,
                    itm.repeats
                );
            });

            setPaginatedRows(
                data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            );
        } else {
            setPaginatedRows([]);
        }
    }, [filterLocation, rooms, blockedDates, page, rowsPerPage, update]);

    useEffect(() => {
        const loc = async () => {
            const usrgrps = await GetGroupUsers(filterLocation?.officeid || 0);
            const grps = await GetGroups();
            const rmgps = await GetRoomGroups();
            const rms = await GetRooms(user.id);
            setRooms(UserAnyAccessRooms(usrgrps, grps, rmgps, rms, user));
            setFullAccessRoms(
                UserFullAccessRooms(usrgrps, grps, rmgps, rms, user)
            );
        };
        loc();
    }, [filterLocation]);

    /* ------------------------------------------------------------ states --- */

    const isSkeleton = busy || (!hasLoaded && Boolean(user?.id));
    const isEmpty = !isSkeleton && paginatedRows.length === 0;
    // No error state: every fetch helper on this page swallows failures, fires
    // its own snackbar and returns [], so an empty array is indistinguishable
    // from a failed load. Claiming "we couldn't load" here would be a claim the
    // data cannot back (§7.4). The helpers' snackbar stays the error surface.

    const total = filteredDates.length;
    const pageCount = Math.max(1, Math.ceil(total / rowsPerPage));
    const showFooter = !isSkeleton && total > 0;
    // Keyed off what is actually on screen, not off `total`: Effect B's else
    // branch leaves `filteredDates` at its previous value when `blockedDates`
    // empties out (pre-existing — reported, not changed), and `page` is never
    // clamped after a delete, so `paginatedRows` can be empty while `total` is
    // still positive. Reading `total` here produced the malformed range
    // "Showing 1–0 of 12".
    const firstShown = paginatedRows.length === 0 ? 0 : page * rowsPerPage + 1;
    const lastShown = Math.min(total, page * rowsPerPage + paginatedRows.length);

    /** Every read-only string a row renders. Unchanged from the original. */
    const deriveRow = (row) => {
        const room = rooms?.find((rm) => rm.id == row.room_id);
        const start = new Date(row.start_time);
        const end = new Date(row.end_time);
        const startString = new Date(row.start_time).toLocaleDateString(
            "en-US",
            {
                weekday: "long",
                month: "short",
                day: "numeric",
                year: "numeric",
            }
        );
        const endString = new Date(row.end_time).toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
            year: "numeric",
        });
        return {
            room,
            dateText:
                start.getDate() < end.getDate()
                    ? `${startString} - ${endString}`
                    : startString,
            startText: `${
                start.getHours() % 12 ? start.getHours() % 12 : 12
            }:${String(start.getMinutes()).padStart(2, "0")}${getDateAmPm(
                start
            )}m`,
            endText: `${end.getHours() % 12 ? end.getHours() % 12 : 12}:${String(
                end.getMinutes()
            ).padStart(2, "0")}${getDateAmPm(end)}m`,
        };
    };

    const roomCell = (room) => (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                minWidth: 0,
            }}
        >
            {room?.color ? (
                <Box
                    aria-hidden="true"
                    sx={{
                        width: "9px",
                        height: "9px",
                        borderRadius: "99px",
                        flex: "none",
                        boxSizing: "border-box",
                        background: room.color,
                    }}
                />
            ) : null}
            <Box component="span" sx={{ ...ellipsisSx }}>
                {room.value}
            </Box>
        </Box>
    );

    const repeatsCell = (repeats) =>
        repeats ? (
            <Box component="span" sx={{ ...ccType.factValue }}>
                {repeats}
            </Box>
        ) : (
            <Box component="span" sx={{ color: "var(--cc-mute)" }}>
                No
            </Box>
        );

    /* ------------------------------------------------------------ render --- */

    return (
        <Box style={{ "--cc-c": "var(--cc-red)" }} sx={pageSx}>
            <AddBlockedDate
                open={openDialog}
                setOpen={setOpenDialog}
                /* Same guard as the filter effect, and this is the read that
                   actually crashed the page on mount: the rooms-refetch effect
                   below chains four awaits against the load effect's six, so it
                   commits `fullAccessRoms` while `filterLocation` is still
                   undefined and the callback runs. */
                rooms={
                    filterLocation?.officeid == null
                        ? fullAccessRoms
                        : fullAccessRoms.filter(
                              (rm) => rm.location == filterLocation.officeid
                          )
                }
                location={filterLocation}
                setUpdate={setUpdate}
            />

            {/* §4.7 destructive confirm — the delete itself is unchanged. */}
            <Dialog
                open={confirmOpen}
                onClose={closeConfirm}
                {...scopeDialogProps(480)}
            >
                <DialogSurface accent="var(--cc-red)">
                    <DialogHeader
                        title="Delete selected blocked dates?"
                        onClose={closeConfirm}
                    />
                    <DialogBody>
                        <AlertBlock
                            title="This cannot be undone"
                            body="The blocked window is removed and the room becomes bookable for that time again."
                        />
                        <Facts>
                            <Fact label="Blocks" mono>
                                {selected.length}
                            </Fact>
                        </Facts>
                    </DialogBody>
                    <DialogFooter>
                        <CcButton
                            variant="danger"
                            onClick={onConfirmDelete}
                            disabled={deleting}
                        >
                            {deleting ? "Deleting…" : "Delete blocked dates"}
                        </CcButton>
                        <Spacer />
                        <CcButton onClick={closeConfirm} disabled={deleting}>
                            Keep them
                        </CcButton>
                    </DialogFooter>
                </DialogSurface>
            </Dialog>

            <Box sx={cardSx}>
                {/* -------------------------------------------- toolbar --- */}
                <Box sx={toolbarSx}>
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
                            [PHONE_MQ]: { flex: "1 1 140px", minWidth: 0 },
                        }}
                    >
                        {locations?.map((itm, index) => (
                            <MenuItem key={index} value={itm.officeid}>
                                {itm.Alias}
                            </MenuItem>
                        ))}
                    </CcSelect>

                    {/* Select-all, phone only. The header checkbox that carries
                        it lives in the <thead>, and below 620px the table is
                        replaced by row-cards, which have no header — so under
                        that width there was no way to select more than one
                        block at a time. Same handler and same checked /
                        indeterminate expressions as the header checkbox, so the
                        scope is identical: it selects every row in the current
                        location filter, not just the visible page. Rendered
                        only when isPhone so the desktop table's header checkbox
                        is never duplicated in the accessibility tree. */}
                    {isPhone && !isSkeleton && !isEmpty && (
                        <Box
                            component="label"
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: "2px",
                                cursor: "pointer",
                                boxSizing: "border-box",
                                ...ccType.factKey,
                                color: "var(--cc-mute)",
                            }}
                        >
                            <Checkbox
                                indeterminate={
                                    selected.length > 0 &&
                                    selected.length < filteredDates.length
                                }
                                checked={
                                    filteredDates.length > 0 &&
                                    selected.length === filteredDates.length
                                }
                                onChange={handleSelectAllClick}
                                sx={checkboxSx}
                            />
                            Select all
                        </Box>
                    )}

                    <Box sx={{ flex: 1, [PHONE_MQ]: { display: "none" } }} />

                    {selected?.length > 0 && (
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "baseline",
                                gap: "5px",
                            }}
                        >
                            <Box
                                component="span"
                                sx={{ ...ccType.factValueMono }}
                            >
                                {selected.length}
                            </Box>
                            <Box
                                component="span"
                                sx={{
                                    ...ccType.factKey,
                                    color: "var(--cc-mute)",
                                }}
                            >
                                selected
                            </Box>
                        </Box>
                    )}

                    {selected?.length > 0 && (
                        <CcButton
                            variant="danger"
                            onClick={() => setConfirmOpen(true)}
                            sx={{ padding: "6px 13px", fontSize: "12.5px" }}
                        >
                            Delete selected
                        </CcButton>
                    )}

                    <CcButton
                        variant="primary"
                        onClick={() => setOpenDialog(true)}
                        sx={{ [PHONE_MQ]: { flex: "1 1 100%", order: 9 } }}
                    >
                        <AddIcon
                            sx={{
                                width: "16px",
                                height: "16px",
                                opacity: 0.82,
                            }}
                        />
                        Add Item
                    </CcButton>
                </Box>

                {/* ------------------------------------------- skeleton --- */}
                {isSkeleton ? (
                    isPhone ? (
                        <Box sx={rowCardListSx}>
                            {SK_ROWS.map((r) => (
                                <Box key={r} sx={rowCardSx(false)}>
                                    <Sk sx={{ height: "13px", width: "60%" }} />
                                    <Sk sx={{ height: "13px", width: "80%" }} />
                                    <Sk sx={{ height: "13px", width: "45%" }} />
                                </Box>
                            ))}
                        </Box>
                    ) : (
                        <Box sx={tableWrapSx}>
                            <Box component="table" sx={tableSx}>
                                <Box component="thead">
                                    <Box component="tr">
                                        <Box
                                            component="th"
                                            scope="col"
                                            sx={thCheckboxSx}
                                        />
                                        {COLUMNS.map((col) => (
                                            <Box
                                                component="th"
                                                scope="col"
                                                key={col.key}
                                                sx={thSx}
                                            >
                                                {col.label}
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                                <Box component="tbody">
                                    {SK_ROWS.map((r) => (
                                        <Box component="tr" key={r}>
                                            <Box
                                                component="td"
                                                sx={tdCheckboxSx}
                                            >
                                                <Sk
                                                    sx={{
                                                        width: "18px",
                                                        height: "18px",
                                                        borderRadius: "6px",
                                                    }}
                                                />
                                            </Box>
                                            {COLUMNS.map((col, c) => (
                                                <Box
                                                    component="td"
                                                    key={col.key}
                                                    sx={tdSx}
                                                >
                                                    <Sk
                                                        sx={{
                                                            height: "13px",
                                                            width: SK_WIDTHS[
                                                                (r + c) %
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
                    )
                ) : isEmpty ? (
                    <StateBlock
                        icon="🗓"
                        title={
                            filterLocation?.Alias
                                ? `No blocked dates in ${filterLocation.Alias}`
                                : "No blocked dates"
                        }
                        body="Blocked time takes a room off the booking grid for a fixed window."
                        actions={
                            <CcButton
                                variant="primary"
                                onClick={() => setOpenDialog(true)}
                            >
                                Add Item
                            </CcButton>
                        }
                    />
                ) : isPhone ? (
                    /* ------------------------------ phone row-cards --- */
                    <Box sx={rowCardListSx}>
                        {paginatedRows?.map((row) => {
                            const isItemSelected = isSelected(row.id);
                            const d = deriveRow(row);
                            return (
                                <Box
                                    key={row.id}
                                    sx={rowCardSx(isItemSelected)}
                                >
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                        }}
                                    >
                                        {/* The id the row checkbox's
                                            aria-labelledby points at. Without
                                            it that reference resolves to
                                            nothing and the checkbox has no
                                            accessible name at all. */}
                                        <Box
                                            component="span"
                                            id={`enhanced-table-checkbox-${row.id}`}
                                            sx={{
                                                ...ccType.cardName,
                                                ...ellipsisSx,
                                                flex: 1,
                                                minWidth: 0,
                                            }}
                                        >
                                            {row.name}
                                        </Box>
                                        <Checkbox
                                            onClick={(event) =>
                                                handleClick(event, row.id)
                                            }
                                            checked={isItemSelected}
                                            inputProps={{
                                                "aria-labelledby": `enhanced-table-checkbox-${row.id}`,
                                            }}
                                            sx={checkboxSx}
                                        />
                                    </Box>
                                    <Box sx={pairSx}>
                                        <Box sx={pairKeySx}>Room</Box>
                                        <Box sx={pairValueSx}>
                                            {d.room.value}
                                        </Box>
                                    </Box>
                                    <Box sx={pairSx}>
                                        <Box sx={pairKeySx}>Date</Box>
                                        <Box
                                            sx={{
                                                ...pairValueSx,
                                                ...ccType.factValueMono,
                                            }}
                                        >
                                            {d.dateText}
                                        </Box>
                                    </Box>
                                    <Box sx={pairSx}>
                                        <Box sx={pairKeySx}>Start Time</Box>
                                        <Box
                                            sx={{
                                                ...pairValueSx,
                                                ...ccType.factValueMono,
                                            }}
                                        >
                                            {d.startText}
                                        </Box>
                                    </Box>
                                    <Box sx={pairSx}>
                                        <Box sx={pairKeySx}>End Time</Box>
                                        <Box
                                            sx={{
                                                ...pairValueSx,
                                                ...ccType.factValueMono,
                                            }}
                                        >
                                            {d.endText}
                                        </Box>
                                    </Box>
                                    <Box sx={pairSx}>
                                        <Box sx={pairKeySx}>Repeats</Box>
                                        <Box sx={pairValueSx}>
                                            {repeatsCell(row.repeats)}
                                        </Box>
                                    </Box>
                                    {row.description ? (
                                        <Box sx={pairSx}>
                                            <Box sx={pairKeySx}>
                                                Description
                                            </Box>
                                            <Box
                                                sx={{
                                                    ...pairValueSx,
                                                    color: "var(--cc-mute)",
                                                }}
                                            >
                                                {row.description}
                                            </Box>
                                        </Box>
                                    ) : null}
                                </Box>
                            );
                        })}
                    </Box>
                ) : (
                    /* ----------------------------------- the table --- */
                    <Box sx={tableWrapSx}>
                        <Box component="table" sx={tableSx}>
                            <Box component="thead">
                                <Box component="tr">
                                    <Box
                                        component="th"
                                        scope="col"
                                        sx={thCheckboxSx}
                                    >
                                        <Checkbox
                                            indeterminate={
                                                selected.length > 0 &&
                                                selected.length <
                                                    filteredDates.length
                                            }
                                            checked={
                                                filteredDates.length > 0 &&
                                                selected.length ===
                                                    filteredDates.length
                                            }
                                            onChange={handleSelectAllClick}
                                            inputProps={{
                                                "aria-label":
                                                    "select all meetings",
                                            }}
                                            sx={checkboxSx}
                                        />
                                    </Box>
                                    {COLUMNS.map((col) => (
                                        <Box
                                            component="th"
                                            scope="col"
                                            key={col.key}
                                            sx={thSx}
                                        >
                                            {col.label}
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                            <Box component="tbody">
                                {paginatedRows?.map((row) => {
                                    const isItemSelected = isSelected(row.id);
                                    const d = deriveRow(row);
                                    return (
                                        <Box
                                            component="tr"
                                            key={row.id}
                                            role="checkbox"
                                            aria-checked={isItemSelected}
                                            tabIndex={-1}
                                            sx={trSx(isItemSelected)}
                                        >
                                            <Box
                                                component="td"
                                                sx={tdCheckboxSx}
                                            >
                                                <Checkbox
                                                    onClick={(event) =>
                                                        handleClick(
                                                            event,
                                                            row.id
                                                        )
                                                    }
                                                    checked={isItemSelected}
                                                    inputProps={{
                                                        "aria-labelledby": `enhanced-table-checkbox-${row.id}`,
                                                    }}
                                                    sx={checkboxSx}
                                                />
                                            </Box>
                                            {/* Target of the row checkbox's
                                                aria-labelledby — see the
                                                phone row-card above. */}
                                            <Box
                                                component="th"
                                                scope="row"
                                                id={`enhanced-table-checkbox-${row.id}`}
                                                sx={{
                                                    ...tdSx,
                                                    ...ccType.cardName,
                                                    ...ellipsisSx,
                                                    maxWidth: "220px",
                                                    textAlign: "left",
                                                }}
                                            >
                                                {row.name}
                                            </Box>
                                            <Box
                                                component="td"
                                                title={row.description}
                                                sx={{
                                                    ...tdSx,
                                                    ...ellipsisSx,
                                                    maxWidth: "260px",
                                                    color: "var(--cc-mute)",
                                                }}
                                            >
                                                {row.description}
                                            </Box>
                                            <Box
                                                component="td"
                                                sx={{
                                                    ...tdSx,
                                                    ...ccType.factValue,
                                                    maxWidth: "200px",
                                                }}
                                            >
                                                {roomCell(d.room)}
                                            </Box>
                                            <Box
                                                component="td"
                                                sx={{
                                                    ...tdSx,
                                                    ...ccType.factValueMono,
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {d.dateText}
                                            </Box>
                                            <Box
                                                component="td"
                                                sx={{
                                                    ...tdSx,
                                                    ...ccType.factValueMono,
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {d.startText}
                                            </Box>
                                            <Box
                                                component="td"
                                                sx={{
                                                    ...tdSx,
                                                    ...ccType.factValueMono,
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {d.endText}
                                            </Box>
                                            <Box component="td" sx={tdSx}>
                                                {repeatsCell(row.repeats)}
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>
                    </Box>
                )}

                {/* ----------------------------------------- pagination --- */}
                {showFooter && (
                    <Box sx={footerSx}>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "baseline",
                                gap: "5px",
                                ...ccType.factKey,
                                color: "var(--cc-mute)",
                                [PHONE_MQ]: { width: "100%", order: 9 },
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
                                {firstShown}–{lastShown}
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

                        <Box
                            component="nav"
                            aria-label="Pagination"
                            sx={{
                                marginLeft: "auto",
                                display: "flex",
                                alignItems: "center",
                                gap: "9px",
                                flexWrap: "wrap",
                                [PHONE_MQ]: {
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
                                sx={{ width: "auto", minWidth: "84px" }}
                            >
                                <MenuItem value={10}>10</MenuItem>
                                <MenuItem value={25}>25</MenuItem>
                                <MenuItem value={50}>50</MenuItem>
                                <MenuItem value={100}>100</MenuItem>
                            </CcSelect>

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
                                    disabled={page <= 0}
                                    onClick={() =>
                                        handleChangePage(null, page - 1)
                                    }
                                    sx={arrowSx}
                                >
                                    <ChevronIcon size={17} strokeWidth={2} />
                                </Box>

                                {buildPageList(page, pageCount).map((item) =>
                                    typeof item === "number" ? (
                                        <Box
                                            component="button"
                                            type="button"
                                            key={item}
                                            aria-label={`Page ${item + 1}`}
                                            aria-current={
                                                item === page
                                                    ? "page"
                                                    : undefined
                                            }
                                            onClick={() =>
                                                handleChangePage(null, item)
                                            }
                                            sx={pagePillSx(item === page)}
                                        >
                                            {item + 1}
                                        </Box>
                                    ) : (
                                        <Box
                                            component="span"
                                            key={item}
                                            aria-hidden="true"
                                            sx={{
                                                fontSize: "12.5px",
                                                color: "var(--cc-mute)",
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
                                    disabled={page >= pageCount - 1}
                                    onClick={() =>
                                        handleChangePage(null, page + 1)
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
                )}
            </Box>
        </Box>
    );
}
