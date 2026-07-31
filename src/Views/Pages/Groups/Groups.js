import React, { useState, useEffect } from "react";
import { Checkbox, MenuItem, Dialog, useMediaQuery } from "@mui/material";
import { Box } from "@mui/system";
import { useAuth } from "../../../Utilites/AuthContext";
import {
    GetGroups,
    GetLocations,
    showError,
    showSuccess,
    showWarning,
} from "../../../Utilites/Functions/ApiFunctions";
import {
    snackbarMark,
    snackbarSpokeSince,
} from "../../../Utilites/SnackbarContext";
import AddNewGroup from "./Components/AddNewGroup";
import { DeleteGroup } from "../../../Utilites/Functions/ApiFunctions/GroupFunctions";
import { bp, type as ccType } from "../../../Utilites/concourse";
import {
    btnReset,
    hover,
    focusRing,
    ChevronIcon,
} from "../../Components/Banner/Components/atoms";
import {
    CcButton,
    CcSelect,
    Tag,
    Facts,
    Fact,
    AlertBlock,
    DialogSurface,
    DialogHeader,
    DialogBody,
    DialogFooter,
    Spacer,
    scopeDialogProps,
} from "../../Components/Concourse/ConcourseDialogKit";

/* ------------------------------------------------------------------ notes ---
 * Concourse adoption of the Groups table. Visual only:
 * every handler, effect, fetch, payload, enum value and validation string is
 * carried over unchanged from the MUI-table implementation. The three things
 * that are NEW are all additive UI — a delete confirmation (guide §4.7 makes it
 * mandatory), a skeleton, and two empty states. No error state exists because
 * GetGroups/GetLocations swallow failures and return [] (see the report).
 * -------------------------------------------------------------------------- */

/** §6 — page chrome uses the raw breakpoint number, never MUI's `sm`. */
const PHONE_MQ = `@media (max-width:${bp.sheet}px)`;
const PHONE_QUERY = `(max-width:${bp.sheet}px)`;

/** guide §3.2 — plus boxSizing (§7.1: the app mounts no CssBaseline). */
const pageSx = (embedded) => ({
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    overflowX: "hidden",
    scrollbarWidth: "thin",
    boxSizing: "border-box",
    color: "var(--cc-ink)",
    fontFamily: "var(--cc-sans)",
    fontSize: "15px",
    lineHeight: 1.5,
    // When this component is a tab panel inside Users the host owns the ground
    // and the padding; doubling either reads as a nested page.
    ...(embedded
        ? null
        : {
              background: "var(--cc-grd)",
              padding:
                  "clamp(14px,2.4vw,22px) clamp(12px,2.6vw,24px) clamp(14px,2.4vw,22px)",
          }),
});

/** guide §3.3, `fillHeight` form — the table scrolls inside, the footer pins. */
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
    [PHONE_MQ]: { borderRadius: "22px" },
};

/** guide §3.5 */
const toolbarSx = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    flexShrink: 0,
    padding: "13px 16px 11px",
    boxSizing: "border-box",
};

const scrollerSx = {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    overflowX: "auto",
    scrollbarWidth: "thin",
    overscrollBehavior: "contain",
    boxSizing: "border-box",
};

/**
 * guide §4.1 — `separate`, or the sticky head loses its border on scroll.
 * `fixed` is what keeps the skeleton and the data table on the same grid: under
 * auto layout the columns are sized from cell content, so the skeleton's
 * percentage-width bars and the real group names produce different column
 * boundaries and the table visibly re-flows the moment the fetch lands
 * (measured: the Access column stepped 450px right in a 1400px card). It also
 * pins the Name column's left edge, which the two tables' differing check-cell
 * padding otherwise offsets by 2px. It does not change truncation: the Name
 * cell's ellipsis already fired under auto layout, and `width:100%` meant a
 * long name never grew the table or side-scrolled the row (measured in Chrome
 * at 1400px and 800px: scrollWidth === clientWidth under both layouts).
 */
const tableSx = {
    width: "100%",
    tableLayout: "fixed",
    borderCollapse: "separate",
    borderSpacing: 0,
    boxSizing: "border-box",
    minWidth: "520px",
};

/** Both tables declare it, so the column lands in one place in both. */
const ACCESS_COL_WIDTH = "150px";

const headCellSx = {
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

const bodyCellSx = {
    padding: "11px 14px",
    verticalAlign: "middle",
    fontSize: "13.5px",
    fontWeight: 400,
    textAlign: "left",
    color: "var(--cc-ink)",
    borderBottom: "1px solid var(--cc-line)",
    boxSizing: "border-box",
};

const checkCellSx = {
    width: "44px",
    padding: "11px 0 11px 14px",
    borderBottom: "1px solid var(--cc-line)",
    boxSizing: "border-box",
};

/** guide §4.1 — the one MUI control kept; restyled through `sx` only. */
const checkboxSx = {
    color: "var(--cc-mute)",
    padding: "4px",
    "&.Mui-checked": { color: "var(--cc-red)" },
    "&.MuiCheckbox-indeterminate": { color: "var(--cc-red)" },
    "&.Mui-focusVisible": focusRing,
};

const sortBtnSx = {
    ...btnReset,
    display: "inline-flex",
    gap: "6px",
    color: "inherit",
    font: "inherit",
    letterSpacing: "inherit",
    textTransform: "inherit",
    transition: "color 200ms",
    ...hover({ color: "var(--cc-ink)" }),
    "&:focus-visible": { ...focusRing, outlineOffset: "-2px" },
};

/** guide §4.5 */
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
 * The DateSelector arrow recipe (DateSelector.js:50-67), with one deliberate
 * substitution: the Banner hovers to `srf` because its arrows sit on a `srf2`
 * pill track, whereas this pagination strip's ground IS `srf`. `srf3` is the
 * token documented for icon-button hover (concourse.js §2). Reconciled by the
 * integrator so every page's pager arrow lights up the same way.
 */
const arrowSx = {
    ...btnReset,
    width: "30px",
    height: "30px",
    borderRadius: "99px",
    boxSizing: "border-box",
    color: "var(--cc-mute)",
    transition:
        "background 200ms, color 200ms, transform 260ms var(--cc-sp)",
    // A disabled arrow keeps no hover, so `hover()` is inlined with :not().
    "@media (hover: hover)": {
        "&:hover:not(:disabled)": {
            background: "var(--cc-srf3)",
            color: "var(--cc-ink)",
            boxShadow: "var(--cc-sh1)",
        },
    },
    "&:active:not(:disabled)": { transform: "scale(.88)" },
    "&:disabled": { opacity: 0.4, cursor: "default", boxShadow: "none" },
    "&:focus-visible": { ...focusRing, outlineOffset: "-2px" },
};

/** guide §3.7 skeleton primitive. */
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

/** guide §3.7 — copied in because the Calendar does not export it. */
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

/** The sort affordance — a plain <button>, never MUI's TableSortLabel. */
const SortButton = ({ label, active, order, onClick }) => (
    <Box component="button" type="button" onClick={onClick} sx={sortBtnSx}>
        <Box component="span" sx={{ color: active ? "var(--cc-ink)" : "inherit" }}>
            {label}
        </Box>
        {active ? (
            <Box
                component="span"
                aria-hidden="true"
                sx={{
                    fontSize: "9px",
                    lineHeight: 1,
                    color: "var(--cc-red)",
                    transition: "transform 320ms var(--cc-sp)",
                    transform:
                        order === "desc" ? "rotate(180deg)" : "rotate(0deg)",
                }}
            >
                ▲
            </Box>
        ) : null}
    </Box>
);

/**
 * The Access column. `Full` / `Read` are backend enum values and are rendered
 * verbatim — never remapped, never title-cased.
 * `Tag`'s resting fill is `srf`, which is also this row's ground, so the neutral
 * form takes the guide's §2.7 inversion onto `srf2`. On the ≤620px row-cards the
 * ground is already `srf2`, so the override is dropped there.
 */
const AccessTag = ({ access, onSurface2 }) =>
    access === "Full" ? (
        <Tag on>{access}</Tag>
    ) : (
        <Tag sx={onSurface2 ? undefined : { background: "var(--cc-srf2)" }}>
            {access}
        </Tag>
    );

const SK_WIDTHS = ["70%", "45%", "85%", "55%", "60%"];

function createData(id, group_name, access) {
    return { id, group_name, access };
}

function descendingComparator(a, b, orderBy) {
    if (typeof a[orderBy] === "string") {
        return b[orderBy].localeCompare(a[orderBy]);
    } else if (typeof a[orderBy] === "number") {
        return b[orderBy] - a[orderBy];
    } else if (a[orderBy] instanceof Date) {
        return new Date(b[orderBy]) - new Date(a[orderBy]);
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

/**
 * `embedded` defaults to false so the standalone route (`Routes.js:243`) and the
 * Users tab panel (`Users/index.js:66`) both keep working with no edit. The
 * Users page can opt in later to drop the doubled ground + padding.
 */
export default function Groups({ setLoading, embedded = false }) {
    const { user } = useAuth();
    const [order, setOrder] = useState("desc");
    const [orderBy, setOrderBy] = useState("group_name");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [selected, setSelected] = useState([]);
    const [paginatedRows, setPaginatedRows] = useState([]);
    const [groups, setGroups] = useState([]);
    const [filteredGroups, setFilteredGroups] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [filterLocation, setFilterLocation] = useState();
    const [update, setUpdate] = useState(0);
    const [locations, setLocations] = useState([]);
    // New, presentation-only state.
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    const isPhone = useMediaQuery(PHONE_QUERY, { noSsr: true });

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
            // The rows this filter left on the table, not the whole fetch —
            // same scope as ApprovalQueue's select-all and as the delete below,
            // which iterates filteredGroups. Reading `groups` here ticked ids
            // for locations the table never rendered, and those ids survived a
            // filter change: the next location came up fully pre-checked with
            // no user gesture, and Delete selected would then take it.
            const newSelecteds = filteredGroups?.map((n) => n.id);
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

    // Unified with the other five bulk pages: total success -> success, partial
    // -> warning naming the counts, total failure -> an error that always
    // appears. Still iterates `filteredGroups`, so the set sent is the set the
    // confirm dialog named (`selectedGroups`), not the wider `selected` bag.
    //
    // `Promise.all` resolves to a truthy array even when every delete failed,
    // and the old `.map` over all groups put `null` in every unselected slot,
    // so neither the array nor its contents could report an outcome. Filtering
    // to the targets first makes `results` line up with what was attempted.
    //
    // `DeleteGroup` already raises "Group deleted" per item and the server's
    // wording on a refusal it explains; the snackbar holds one message, so the
    // aggregate lands last. A total failure must not replace the server's
    // explanation with generic text, but must not be silent when nothing was
    // said at all (a dropped connection) — `snackbarSpokeSince` separates them.
    const handleDeleteSelected = () => {
        const remove = async () => {
            const targets =
                filteredGroups?.filter((itm) => isSelected(itm.id)) || [];
            if (targets.length === 0) return;
            const mark = snackbarMark();
            const results = await Promise.all(
                targets.map((itm) => DeleteGroup(itm.id))
            );
            const deleted = results.filter(Boolean).length;
            if (deleted === targets.length) {
                showSuccess(`Group${targets.length > 1 ? "s" : ""} Deleted`);
            } else if (deleted > 0) {
                showWarning(`Deleted ${deleted} of ${targets.length} groups`);
            } else {
                if (!snackbarSpokeSince(mark)) {
                    showError(
                        `Failed to delete group${targets.length > 1 ? "s" : ""}`
                    );
                }
                // Nothing changed — leave the table and the selection alone.
                return;
            }
            setSelected([]);
            setUpdate((prev) => prev + 1);
        };
        remove();
    };

    const isSelected = (id) => selected.indexOf(id) !== -1;

    useEffect(() => {
        const getData = async () => {
            setLoading(true);
            setFetching(true);
            const locations = await GetLocations();
            const groups = await GetGroups();

            setFilterLocation(
                filterLocation?.officeid || filterLocation?.officeid === 0
                    ? filterLocation
                    : locations?.find((lc) => lc.officeid == user?.location)
            );
            setLocations(locations);
            setGroups(groups);
            setLoading(false);
            setFetching(false);
            setHasLoaded(true);
        };
        getData();
    }, [update]);

    useEffect(() => {
        let grps = [];
        if (filterLocation?.officeid) {
            grps = groups.filter(
                (grp) => grp.location === filterLocation.officeid
            );
            setFilteredGroups(grps);
        } else {
            grps = groups;
            setFilteredGroups(grps);
        }

        const data = grps?.map((itm) => {
            return createData(itm.id, itm.group_name, itm.access);
        });

        const sortedRows = stableSort(data, getComparator(order, orderBy));
        setPaginatedRows(
            sortedRows.slice(
                page * rowsPerPage,
                page * rowsPerPage + rowsPerPage
            )
        );
    }, [groups, filterLocation, update, page, rowsPerPage, orderBy, order]);

    /* --------------------------------------------------------- view state --- */

    // Guide §3.7 precedence, minus the error state: GetGroups/GetLocations both
    // swallow every failure and return [], so "the server failed" is not
    // distinguishable from "there are no groups" without editing the shared API
    // layer. Three of four states ship; the gap is in the report.
    const isSkeleton = fetching || !hasLoaded;
    // Keyed to filteredGroups, never paginatedRows: `page` is not reset when the
    // location filter changes, so paginatedRows can legitimately be [] while
    // groups exist, and an empty state there would be a lie.
    const isEmpty = !isSkeleton && filteredGroups.length === 0;

    const total = filteredGroups.length;
    const rangeStart = page * rowsPerPage + 1;
    const rangeEnd = Math.min((page + 1) * rowsPerPage, total);

    // `selected` is a bag of ids that outlives the location filter: select-all
    // is scoped to the filtered rows now, but switching location still does not
    // clear it, so a row ticked by hand can outlive the filter that showed it.
    // The set that is actually on screen — and the set handleDeleteSelected will
    // send, since it iterates filteredGroups — is this one. Every count, every
    // checkbox state and the delete affordance read it, never `selected`.
    const selectedGroups = filteredGroups.filter((g) => isSelected(g.id));
    const selectedCount = selectedGroups.length;
    const shownGroups = selectedGroups.slice(0, 8);
    const hiddenCount = selectedGroups.length - shownGroups.length;

    const filterAlias = filterLocation?.Alias;
    // Groups exist, but none survive the location filter.
    const hasGroupsElsewhere = groups.length > 0;

    // Deliberately the bare setter, exactly as the old floating + icon bound it
    // (Groups.js:227 before this change): the click event lands in state and
    // AddNewGroup reads `open={!!open}`, so the rendered result is identical.
    // Correcting it to `() => setOpenDialog(true)` is a behaviour change and is
    // reported as bug B2 rather than applied here.
    const openAddDialog = setOpenDialog;
    const closeConfirm = () => setConfirmOpen(false);

    /* ------------------------------------------------------------ fragments -- */

    const filterSelect = (
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
            displayEmpty
            renderValue={(val) =>
                val === "" ? (
                    <Box component="span" sx={{ color: "var(--cc-mute)" }}>
                        Filter By Location
                    </Box>
                ) : (
                    locations?.find((l) => l.officeid === val)?.Alias
                )
            }
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
    );

    const headCheckbox = (
        <Checkbox
            indeterminate={
                selectedCount > 0 && selectedCount < filteredGroups.length
            }
            checked={
                filteredGroups.length > 0 &&
                selectedCount === filteredGroups.length
            }
            onChange={handleSelectAllClick}
            inputProps={{
                "aria-label": "select all meetings",
            }}
            sx={checkboxSx}
        />
    );

    const rowCheckbox = (row, isItemSelected) => (
        <Checkbox
            onClick={(event) => handleClick(event, row.id)}
            checked={isItemSelected}
            inputProps={{
                "aria-labelledby": `enhanced-table-checkbox-${row.id}`,
            }}
            sx={checkboxSx}
        />
    );

    const skeletonTable = (
        <Box sx={scrollerSx}>
            <Box component="table" sx={tableSx}>
                <Box component="thead">
                    <Box component="tr">
                        <Box component="th" scope="col" sx={{ ...headCellSx, ...checkCellSx, borderBottom: "1px solid var(--cc-line)" }} />
                        <Box component="th" scope="col" sx={headCellSx}>
                            Name
                        </Box>
                        <Box
                            component="th"
                            scope="col"
                            sx={{ ...headCellSx, width: ACCESS_COL_WIDTH }}
                        >
                            Access
                        </Box>
                    </Box>
                </Box>
                <Box component="tbody">
                    {/* No stagger — guide §5.5: rows arrive together. */}
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Box component="tr" key={i}>
                            <Box component="td" sx={checkCellSx}>
                                <Sk
                                    sx={{
                                        width: "18px",
                                        height: "18px",
                                        borderRadius: "6px",
                                    }}
                                />
                            </Box>
                            <Box component="td" sx={bodyCellSx}>
                                <Sk
                                    sx={{
                                        height: "13px",
                                        width: SK_WIDTHS[i % SK_WIDTHS.length],
                                    }}
                                />
                            </Box>
                            <Box component="td" sx={bodyCellSx}>
                                <Sk
                                    sx={{
                                        height: "18px",
                                        width: "54px",
                                        borderRadius: "99px",
                                    }}
                                />
                            </Box>
                        </Box>
                    ))}
                </Box>
            </Box>
        </Box>
    );

    const skeletonCards = (
        <Box sx={scrollerSx}>
            <Box
                sx={{
                    display: "grid",
                    gap: "8px",
                    padding: "0 12px 14px",
                    boxSizing: "border-box",
                }}
            >
                {Array.from({ length: 8 }).map((_, i) => (
                    <Box
                        key={i}
                        sx={{
                            background: "var(--cc-srf2)",
                            borderRadius: "18px",
                            padding: "12px 14px",
                            display: "grid",
                            gap: "8px",
                            boxSizing: "border-box",
                        }}
                    >
                        <Sk
                            sx={{
                                height: "14px",
                                width: SK_WIDTHS[i % SK_WIDTHS.length],
                            }}
                        />
                        <Sk
                            sx={{
                                height: "18px",
                                width: "54px",
                                borderRadius: "99px",
                                justifySelf: "end",
                            }}
                        />
                    </Box>
                ))}
            </Box>
        </Box>
    );

    const dataTable = (
        <Box sx={scrollerSx}>
            <Box
                component="table"
                sx={{
                    ...tableSx,
                    "& tbody tr:last-of-type td, & tbody tr:last-of-type th": {
                        borderBottom: 0,
                    },
                }}
            >
                <Box component="thead">
                    <Box component="tr">
                        <Box
                            component="th"
                            scope="col"
                            sx={{
                                ...headCellSx,
                                width: "44px",
                                padding: "6px 0 6px 14px",
                            }}
                        >
                            {headCheckbox}
                        </Box>
                        <Box
                            component="th"
                            scope="col"
                            aria-sort={
                                orderBy === "group_name"
                                    ? order === "asc"
                                        ? "ascending"
                                        : "descending"
                                    : "none"
                            }
                            sx={headCellSx}
                        >
                            <SortButton
                                label="Name"
                                active={orderBy === "group_name"}
                                order={order}
                                onClick={(event) =>
                                    handleRequestSort(event, "group_name")
                                }
                            />
                        </Box>
                        <Box
                            component="th"
                            scope="col"
                            aria-sort={
                                orderBy === "access"
                                    ? order === "asc"
                                        ? "ascending"
                                        : "descending"
                                    : "none"
                            }
                            sx={{ ...headCellSx, width: ACCESS_COL_WIDTH }}
                        >
                            <SortButton
                                label="Access"
                                active={orderBy === "access"}
                                order={order}
                                onClick={(event) =>
                                    handleRequestSort(event, "access")
                                }
                            />
                        </Box>
                    </Box>
                </Box>
                <Box component="tbody">
                    {paginatedRows?.map((row) => {
                        const isItemSelected = isSelected(row.id);
                        return (
                            <Box
                                component="tr"
                                key={row.id}
                                role="checkbox"
                                aria-checked={isItemSelected}
                                tabIndex={-1}
                                sx={{
                                    background: isItemSelected
                                        ? "var(--cc-wash)"
                                        : "transparent",
                                    transition: "background 200ms",
                                    // No transform on a table row — guide §5.4.
                                    ...hover({
                                        background: "var(--cc-wash)",
                                    }),
                                }}
                            >
                                <Box
                                    component="td"
                                    sx={{
                                        ...checkCellSx,
                                        boxShadow: isItemSelected
                                            ? "inset 3px 0 0 var(--cc-red)"
                                            : "none",
                                    }}
                                >
                                    {/* The 12 / 13 guard mirrors groupController.js:124 */}
                                    {row.id != 12 &&
                                        row.id != 13 &&
                                        rowCheckbox(row, isItemSelected)}
                                </Box>
                                <Box
                                    component="th"
                                    scope="row"
                                    sx={{
                                        ...bodyCellSx,
                                        ...ccType.cardName,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        maxWidth: "320px",
                                    }}
                                >
                                    {row.group_name}
                                </Box>
                                <Box component="td" sx={bodyCellSx}>
                                    <AccessTag access={row.access} />
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            </Box>
        </Box>
    );

    const dataCards = (
        <Box sx={scrollerSx}>
            {/* Select-all keeps its binding at this width, in a slim strip. */}
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "0 14px 8px",
                    boxSizing: "border-box",
                    ...ccType.blockLabel,
                    color: "var(--cc-mute)",
                }}
            >
                {headCheckbox}
                <Box component="span">Select all</Box>
            </Box>
            <Box
                sx={{
                    display: "grid",
                    gap: "8px",
                    padding: "0 12px 14px",
                    boxSizing: "border-box",
                }}
            >
                {paginatedRows?.map((row) => {
                    const isItemSelected = isSelected(row.id);
                    return (
                        <Box
                            key={row.id}
                            /* No `role="checkbox"` here. The desktop <tr> keeps
                               it because that markup is the original's; this
                               row-card is new, and `checkbox` is a
                               children-presentational role — it would prune the
                               real <input> below out of the accessibility tree
                               while itself being unfocusable and inoperable. */
                            sx={{
                                background: "var(--cc-srf2)",
                                borderRadius: "18px",
                                padding: "12px 14px",
                                display: "grid",
                                gap: "6px",
                                boxSizing: "border-box",
                                boxShadow: isItemSelected
                                    ? "inset 3px 0 0 var(--cc-red)"
                                    : "none",
                            }}
                        >
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    minWidth: 0,
                                }}
                            >
                                {row.id != 12 &&
                                    row.id != 13 &&
                                    rowCheckbox(row, isItemSelected)}
                                <Box
                                    sx={{
                                        ...ccType.cardName,
                                        minWidth: 0,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                    }}
                                >
                                    {row.group_name}
                                </Box>
                            </Box>
                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: "auto 1fr",
                                    gap: "14px",
                                    alignItems: "center",
                                }}
                            >
                                <Box
                                    sx={{
                                        ...ccType.factKey,
                                        color: "var(--cc-mute)",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    Access
                                </Box>
                                <Box sx={{ justifySelf: "end" }}>
                                    <AccessTag access={row.access} onSurface2 />
                                </Box>
                            </Box>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );

    const emptyState = (
        <StateBlock
            icon="◇"
            title={
                hasGroupsElsewhere
                    ? filterAlias
                        ? `No groups in ${filterAlias}`
                        : "No groups"
                    : "No groups yet"
            }
            body={
                hasGroupsElsewhere
                    ? "Pick another location, or add a group here."
                    : "Create a group to control who can see and book rooms."
            }
            actions={
                <CcButton variant="primary" onClick={openAddDialog}>
                    Add group
                </CcButton>
            }
        />
    );

    /* ------------------------------------------------------------- render --- */

    return (
        <Box
            style={embedded ? undefined : { "--cc-c": "var(--cc-red)" }}
            sx={pageSx(embedded)}
        >
            <AddNewGroup
                open={openDialog}
                setOpen={setOpenDialog}
                location={filterLocation}
                locations={locations}
                setUpdate={setUpdate}
            />

            <Box sx={cardSx}>
                <Box sx={toolbarSx}>
                    {selectedCount > 0 ? (
                        <Box
                            sx={{
                                ...ccType.factKey,
                                color: "var(--cc-mute)",
                                whiteSpace: "nowrap",
                            }}
                        >
                            <Box
                                component="span"
                                sx={{ ...ccType.factValueMono }}
                            >
                                {selectedCount}
                            </Box>{" "}
                            selected
                        </Box>
                    ) : null}
                    {/* Gated on the on-screen selection, not on `selected`:
                        with the off-filter ids the confirm could open naming no
                        group at all and still promise "this cannot be undone",
                        then delete nothing. */}
                    {selectedCount > 0 && (
                        <CcButton
                            variant="danger"
                            onClick={() => setConfirmOpen(true)}
                            sx={{ padding: "6px 13px", fontSize: "12.5px" }}
                        >
                            Delete selected
                        </CcButton>
                    )}
                    <Box sx={{ flex: 1 }} />
                    {filterSelect}
                    <CcButton
                        variant="primary"
                        onClick={openAddDialog}
                        sx={{ [PHONE_MQ]: { flex: "1 1 100%", order: 9 } }}
                    >
                        Add group
                    </CcButton>
                </Box>

                {isSkeleton
                    ? isPhone
                        ? skeletonCards
                        : skeletonTable
                    : isEmpty
                    ? emptyState
                    : isPhone
                    ? dataCards
                    : dataTable}

                {/* Mounted during the skeleton too. It is 66px tall, so
                    unmounting it while a fetch is in flight — the first load,
                    and again after every add or delete — lifted the table 66px
                    and dropped it back. Its controls are inert and its count is
                    a bar, not a number the page does not have yet. */}
                {isSkeleton || total > 0 ? (
                    <Box sx={footerSx}>
                        <Box
                            sx={{
                                ...ccType.factKey,
                                color: "var(--cc-mute)",
                                [PHONE_MQ]: { width: "100%", order: 9 },
                            }}
                        >
                            {isSkeleton ? (
                                <Sk sx={{ width: "116px", height: "12px" }} />
                            ) : paginatedRows.length > 0 ? (
                                <>
                                    Showing{" "}
                                    <Box
                                        component="span"
                                        sx={{ ...ccType.factValueMono }}
                                    >
                                        {rangeStart}–{rangeEnd}
                                    </Box>{" "}
                                    of{" "}
                                    <Box
                                        component="span"
                                        sx={{ ...ccType.factValueMono }}
                                    >
                                        {total}
                                    </Box>
                                </>
                            ) : (
                                <>
                                    <Box
                                        component="span"
                                        sx={{ ...ccType.factValueMono }}
                                    >
                                        {total}
                                    </Box>{" "}
                                    {total === 1 ? "group" : "groups"}
                                </>
                            )}
                        </Box>
                        <Box
                            component="nav"
                            aria-label="Pagination"
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: "9px",
                                marginLeft: "auto",
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
                                disabled={isSkeleton}
                                sx={{ width: "auto", minWidth: "84px" }}
                            >
                                <MenuItem value={10}>10</MenuItem>
                                <MenuItem value={25}>25</MenuItem>
                                <MenuItem value={50}>50</MenuItem>
                                <MenuItem value={100}>100</MenuItem>
                            </CcSelect>
                            <Box
                                component="button"
                                type="button"
                                aria-label="Previous page"
                                disabled={isSkeleton || page === 0}
                                onClick={() => handleChangePage(null, page - 1)}
                                sx={arrowSx}
                            >
                                <ChevronIcon size={17} strokeWidth={2} />
                            </Box>
                            <Box
                                component="button"
                                type="button"
                                aria-label="Next page"
                                disabled={
                                    isSkeleton ||
                                    (page + 1) * rowsPerPage >= total
                                }
                                onClick={() => handleChangePage(null, page + 1)}
                                sx={arrowSx}
                            >
                                <ChevronIcon size={17} strokeWidth={2} flip />
                            </Box>
                        </Box>
                    </Box>
                ) : null}
            </Box>

            {/* guide §4.7 — always a dialog, never an unguarded click. */}
            <Dialog
                open={confirmOpen}
                onClose={closeConfirm}
                {...scopeDialogProps(480)}
            >
                <DialogSurface accent="var(--cc-red)">
                    <DialogHeader
                        title="Delete selected groups?"
                        onClose={closeConfirm}
                    />
                    <DialogBody>
                        <AlertBlock
                            title="This cannot be undone"
                            body="The groups are removed from this list. The users in them are not deleted."
                        />
                        {shownGroups.length > 0 ? (
                            // Built from the same array handleDeleteSelected
                            // iterates, so it names exactly what will be sent.
                            <Facts>
                                {shownGroups.map((grp) => (
                                    <Fact key={grp.id} label="Group">
                                        {grp.group_name}
                                    </Fact>
                                ))}
                                {hiddenCount > 0 ? (
                                    <Fact label="And" mono>
                                        {hiddenCount} more
                                    </Fact>
                                ) : null}
                            </Facts>
                        ) : null}
                    </DialogBody>
                    <DialogFooter>
                        <CcButton
                            variant="danger"
                            onClick={() => {
                                setConfirmOpen(false);
                                handleDeleteSelected();
                            }}
                        >
                            Delete groups
                        </CcButton>
                        <Spacer />
                        <CcButton autoFocus onClick={closeConfirm}>
                            Keep them
                        </CcButton>
                    </DialogFooter>
                </DialogSurface>
            </Dialog>
        </Box>
    );
}
