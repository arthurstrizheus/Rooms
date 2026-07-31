/**
 * Users — the user directory panel of `/manage/users`.
 *
 * Concourse redesign. Visual only. Every handler, fetch, derivation and
 * permission gate below is the original, byte for byte:
 *   - `createData`, `descendingComparator`, `getComparator`, `stableSort`;
 *   - `handleSubmit`'s three branches, their `switch (action)` and every
 *     success-toast literal (including the `filteredUsers?.length > 1`
 *     pluralisation, which counts the wrong thing — recon §7.11,
 *     report-only). The branches now read the per-item results rather than
 *     the always-truthy `Promise.all` array; the three `Failed to …user(s)`
 *     literals went with the `else` that held them, which could never run
 *     because that array is truthy even when every call failed — see the
 *     comment on `handleSubmit`;
 *   - `handleRequestSort` wired to the same six sort keys, two of which are
 *     dead (`"group"`, `"login"` — recon §7.3, report-only);
 *   - `handleSelectAllClick` (still maps `users`, not `filteredUsers` — recon
 *     §7.4), `handleClick`, `handleOpenClick` (still builds its new array from
 *     `selected` — recon §7.1), `hadleEditUser`, `handleAdduser`;
 *   - the three effects, including the `officeid === 0` falsy fall-through
 *     that makes the "All" pseudo-office mean "show everyone", and the
 *     self-exclusion `usr.id !== user?.id`;
 *   - the bulk-strip gate `user?.admin || user?.office_admin ==
 *     filterLocation?.officeid` and the office-admin badge predicate, loose
 *     `==` included.
 *
 * Changed on purpose, per spec:
 *   - MUI's Table family, `TablePagination`, `ShortSelect`, `Paper` and the
 *     module-local `StyledTableCell`/`StyledTableRow` are replaced with a
 *     plain semantic `<table>` and the §4.5 footer strip. The styled cells
 *     hard-coded `white` / `common.black`, and the `!important` zebra stripe
 *     defeated the selected and hover states (recon §7.5) — removing it makes
 *     selection visible for the first time. `ShortSelect` is shared with
 *     ApprovalQueue, so only the *usage* moved to `CcSelect`.
 *   - the location filter left `position:absolute; zIndex:999` (it painted
 *     over the banner) and moved into the card toolbar, alongside the bulk
 *     actions that used to live in a bottom strip.
 *   - all four data states added: skeleton, error, empty, data.
 *   - `console.log` at the old :338 and the dead `delay()` helper are gone.
 *
 * Deliberately NOT reinstated: the Add-user button. It is commented out in
 * the original (old :415-430), so creating a user is impossible from this UI
 * today; restoring it is a behaviour change and is escalated, not taken.
 * `handleAdduser` is kept wired so that decision stays a one-line change.
 *
 * Honesty note on the error state: `GetUsers` / `GetGroups` / `GetGroupUsers`
 * / `GetLocations` each catch internally and return `[]`, so a failed fetch is
 * indistinguishable from an empty one and this branch essentially cannot fire
 * today. It is built anyway and reported — fixing the fetch layer means
 * editing `ApiFunctions.js`, which every page shares.
 */

import React, { useEffect, useState } from "react";
import {
    Box,
    Checkbox,
    Collapse,
    MenuItem,
    Tooltip,
    useMediaQuery,
} from "@mui/material";
import { bp, type as ccType } from "../../../../Utilites/concourse";
import {
    CcButton,
    CcSelect,
    focusRing,
    Tag,
} from "../../../Components/Concourse/ConcourseDialogKit";
import {
    btnReset,
    ChevronIcon,
    hover,
} from "../../../Components/Banner/Components/atoms";
import { useAuth } from "../../../../Utilites/AuthContext";
import AddNewUser from "./AddNewUser";
import ViewUser from "./ViewUser";
import {
    GetGroups,
    GetGroupUsers,
    GetLocations,
    GetUsers,
    showError,
    showSuccess,
    showWarning,
} from "../../../../Utilites/Functions/ApiFunctions";
import {
    snackbarMark,
    snackbarSpokeSince,
} from "../../../../Utilites/SnackbarContext";
import {
    ActivateUser,
    DeactivateUser,
    DeleteUser,
} from "../../../../Utilites/Functions/ApiFunctions/UserFunctions";
import DisplayGroups from "../../../Components/DisplayGroups";
import { ccTooltipSlotProps, groupChipsSx } from "./UsersConcourse";

/* ==========================================================================
 * Behaviour — unchanged from the original file
 * ========================================================================*/

function createData(
    id,
    name,
    email,
    location,
    groups,
    active,
    last_login,
    admin,
    office_admin
) {
    return {
        id,
        name,
        email,
        location,
        groups,
        active,
        last_login,
        admin,
        office_admin,
    };
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

/* ==========================================================================
 * Column contract. `sort` holds the literal each header passed to
 * `handleRequestSort` in the original and must not change — "group" and
 * "login" do not match any field on the row objects and therefore sort
 * nothing (recon §7.3, preserved).
 * ========================================================================*/

const SORT_COLUMNS = [
    { label: "Name", sort: "name" },
    { label: "Email", sort: "email" },
    { label: "Location", sort: "location" },
    { label: "Groups", sort: "group" },
    { label: "Active", sort: "active" },
    { label: "Last Login", sort: "login" },
];

/** checkbox + expand marker + the six columns above. */
const COLSPAN = SORT_COLUMNS.length + 2;

const BULK_ACTIONS = ["Activate", "Deactivate", "Remove"];
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

/* ==========================================================================
 * Concourse styles
 * ========================================================================*/

const PHONE_MQ = `@media (max-width:${bp.sheet}px)`;
const PHONE_QUERY = `(max-width:${bp.sheet}px)`;

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
    // Top inset is reduced because the tablist above already supplies one.
    padding: "12px clamp(12px,2.6vw,24px) clamp(14px,2.4vw,22px)",
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
    [PHONE_MQ]: { borderRadius: "22px" },
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

const metaLabelSx = {
    ...ccType.factKey,
    color: "var(--cc-mute)",
    whiteSpace: "nowrap",
};

const metaNumSx = { ...ccType.factValueMono, color: "var(--cc-ink)" };

const bulkGroupSx = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    minWidth: 0,
    boxSizing: "border-box",
    [PHONE_MQ]: { width: "100%" },
};

/** The single scroll region of the card. */
const scrollSx = {
    flex: 1,
    minHeight: 0,
    overflowX: "auto",
    overflowY: "auto",
    scrollbarWidth: "thin",
    overscrollBehavior: "contain",
    boxSizing: "border-box",
};

const tableSx = {
    width: "100%",
    // 700 in the original, plus the new marker cell and roomier padding.
    minWidth: "820px",
    borderCollapse: "separate",
    borderSpacing: 0,
    boxSizing: "border-box",
    "& tbody tr:last-of-type td, & tbody tr:last-of-type th": {
        borderBottom: 0,
    },
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

const checkThSx = {
    ...thSx,
    width: "44px",
    padding: "10px 0 10px 14px",
};

const markerThSx = {
    ...thSx,
    width: "34px",
    padding: "10px 0",
    textAlign: "center",
};

const sortBtnSx = {
    ...btnReset,
    display: "inline-flex",
    gap: "6px",
    alignItems: "center",
    font: "inherit",
    color: "inherit",
    letterSpacing: "inherit",
    ...hover({ color: "var(--cc-ink)" }),
    "&:focus-visible": { ...focusRing, outlineOffset: "-2px" },
};

const sortGlyphSx = {
    fontSize: "9px",
    lineHeight: 1,
    color: "var(--cc-red)",
    transition: "transform 320ms var(--cc-sp)",
};

const trSx = {
    cursor: "pointer",
    transition: "background 200ms",
    ...hover({ background: "var(--cc-wash)" }),
    "&:focus-visible": { ...focusRing, outlineOffset: "-2px" },
};

const selectedTrSx = {
    background: "var(--cc-wash)",
    "& > td:first-of-type, & > th:first-of-type": {
        boxShadow: "inset 3px 0 0 var(--cc-red)",
    },
};

const tdSx = {
    padding: "11px 14px",
    verticalAlign: "middle",
    textAlign: "left",
    fontSize: "13.5px",
    fontWeight: 400,
    color: "var(--cc-ink)",
    borderBottom: "1px solid var(--cc-line)",
    boxSizing: "border-box",
};

const checkTdSx = { ...tdSx, width: "44px", padding: "11px 0 11px 14px" };
const markerTdSx = {
    ...tdSx,
    width: "34px",
    padding: "11px 0",
    textAlign: "center",
};

const detailTdSx = {
    padding: 0,
    borderBottom: 0,
    boxSizing: "border-box",
};

const nameCellSx = {
    ...ccType.cardName,
    maxWidth: "220px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
};

const emailCellSx = {
    maxWidth: "250px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
};

const groupsCellSx = { minWidth: "200px" };

const checkboxSx = {
    color: "var(--cc-mute)",
    padding: "4px",
    "&.Mui-checked": { color: "var(--cc-red)" },
    "&.MuiCheckbox-indeterminate": { color: "var(--cc-red)" },
};

const markerSx = (open) => ({
    ...btnReset,
    width: "22px",
    height: "22px",
    borderRadius: "99px",
    boxSizing: "border-box",
    fontSize: "13px",
    lineHeight: 1,
    background: open ? "var(--cc-red)" : "var(--cc-srf2)",
    color: open ? "var(--cc-on-red)" : "var(--cc-mute)",
    transform: open ? "rotate(135deg)" : "none",
    transition:
        "transform 320ms var(--cc-sp), background 200ms, color 200ms",
});

/** §4.10 geometry, reused for the account's boolean `active` flag. */
const statusPillSx = (isActive) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    borderRadius: "99px",
    padding: "3px 10px",
    fontSize: "11px",
    fontWeight: 700,
    whiteSpace: "nowrap",
    boxSizing: "border-box",
    background: "var(--cc-srf2)",
    color: isActive ? "var(--cc-ok)" : "var(--cc-mute)",
});

const statusDotSx = {
    width: "7px",
    height: "7px",
    borderRadius: "99px",
    background: "currentColor",
    flex: "none",
};

/* ---- phone row-cards --------------------------------------------------- */

const cardListSx = {
    flex: 1,
    minHeight: 0,
    overflow: "auto",
    scrollbarWidth: "thin",
    overscrollBehavior: "contain",
    boxSizing: "border-box",
    display: "grid",
    alignContent: "start",
    gap: "8px",
    padding: "0 12px 14px",
};

const rowCardSx = {
    background: "var(--cc-srf2)",
    borderRadius: "18px",
    padding: "12px 14px",
    display: "grid",
    gap: "6px",
    boxSizing: "border-box",
};

const pairSx = {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    gap: "14px",
    alignItems: "baseline",
};

const pairValueSx = {
    ...ccType.factValue,
    color: "var(--cc-ink)",
    textAlign: "right",
    minWidth: 0,
    overflowWrap: "anywhere",
};

/* ---- footer ------------------------------------------------------------ */

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

const counterSx = {
    ...ccType.factKey,
    color: "var(--cc-mute)",
    [PHONE_MQ]: { width: "100%", order: 9 },
};

const navSx = {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    marginLeft: "auto",
    boxSizing: "border-box",
    [PHONE_MQ]: {
        marginLeft: 0,
        width: "100%",
        justifyContent: "space-between",
    },
};

/**
 * The Banner's DateSelector arrow hovers to `srf` because its arrows sit on a
 * `srf2` pill track; this pagination strip's ground IS `srf`, so `srf3` — the
 * token documented for icon-button hover (concourse.js §2) — is the fill that
 * actually reads. Reconciled by the integrator so every page's pager arrow
 * lights up the same way.
 */
const arrowSx = {
    ...btnReset,
    width: "30px",
    height: "30px",
    borderRadius: "99px",
    boxSizing: "border-box",
    color: "var(--cc-mute)",
    transition: "background 200ms, color 200ms, transform 260ms var(--cc-sp)",
    ...hover({
        background: "var(--cc-srf3)",
        color: "var(--cc-ink)",
        boxShadow: "var(--cc-sh1)",
    }),
    "&:active": { transform: "scale(.88)" },
    "&:disabled": {
        opacity: 0.4,
        cursor: "default",
        "@media (hover: hover)": {
            "&:hover": {
                background: "transparent",
                color: "var(--cc-mute)",
                boxShadow: "none",
            },
        },
    },
};

const srOnlySx = {
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

/* ==========================================================================
 * State primitives — copied from the Calendar (they are not exported)
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
        animation: "cc-shim 1400ms infinite",
    },
};

const Sk = ({ sx }) => <Box sx={{ ...skSx, ...sx }} />;

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

const SK_WIDTHS = ["70%", "45%", "85%", "55%", "60%"];
const SK_ROWS = [0, 1, 2, 3, 4, 5, 6, 7];
const SK_CARDS = [0, 1, 2, 3, 4, 5];

/* ==========================================================================
 * Page
 * ========================================================================*/

export default function Users({ setLoading }) {
    const { user } = useAuth();
    const [order, setOrder] = useState("asc");
    const [orderBy, setOrderBy] = useState("name");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [selected, setSelected] = useState([]);
    const [paginatedRows, setPaginatedRows] = useState([]);
    const [rowsOpen, setRowsOpen] = useState([]);
    const [action, setAction] = useState("Activate");
    const [users, setUsers] = useState([]);
    const [editUserOpen, setEditUserOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [filterLocation, setFilterLocation] = useState();
    const [selectedUserLocation, setSelectedUserLocation] = useState(null);
    const [update, setUpdate] = useState(0);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [locations, setLocations] = useState([]);
    const [groupUsers, setGroupUsers] = useState([]);
    // Additive, presentational: gate the first-paint skeleton and the error
    // branch. `setLoading` is the banner's prop, not page state, so it cannot
    // double as a local loading flag.
    const [hasLoaded, setHasLoaded] = useState(false);
    const [fetchError, setFetchError] = useState(false);

    const isPhone = useMediaQuery(PHONE_QUERY, { noSsr: true });

    // `Promise.all` resolves to an array, which is truthy even when every call
    // failed, so the outcome has to come from the per-item results. `DeleteUser`
    // resolves true/false and `ActivateUser` / `DeactivateUser` resolve the
    // updated user or null; none of the three rejects.
    //
    // When the server explains a refusal — the 403 office-scoping message, say
    // — those helpers have already put that wording on the shared snackbar, and
    // the snackbar holds one message at a time, so re-toasting here would
    // destroy it. That is why the `Failed to …user(s)` literals were dropped.
    // But it over-corrected: when the request never reaches the server the
    // helpers say nothing at all (`handleApiResponseError` dereferences
    // `response.response.data` on a network error, throws, and the helper's own
    // `catch` swallows it), so a dropped connection produced no feedback
    // whatsoever. `snackbarSpokeSince` distinguishes "the server already
    // explained" from "nobody said anything", so the server keeps its wording
    // and a total failure is still never silent. A partial failure always
    // speaks, because the count is information the server never sends.
    const handleSubmit = () => {
        const remove = async () => {
            const targets =
                filteredUsers?.filter((itm) => isSelected(itm.id)) || [];
            if (targets.length === 0) return;
            const mark = snackbarMark();
            const results = await Promise.all(
                targets.map((itm) => DeleteUser(itm.id))
            );
            const done = results.filter(Boolean).length;
            if (done === targets.length) {
                showSuccess(
                    `User${filteredUsers?.length > 1 ? "s" : ""} Deleted`
                );
            } else if (done > 0) {
                showWarning(`Deleted ${done} of ${targets.length} users`);
            } else {
                if (!snackbarSpokeSince(mark)) {
                    showError(`Failed to delete user${targets.length > 1 ? "s" : ""}`);
                }
                return; // nothing changed — keep the rows and the selection
            }
            setSelected([]);
            setUpdate((prev) => prev + 1);
        };

        const activate = async () => {
            const targets =
                filteredUsers?.filter((itm) => isSelected(itm.id)) || [];
            if (targets.length === 0) return;
            const mark = snackbarMark();
            const results = await Promise.all(
                targets.map((itm) => ActivateUser(itm.id))
            );
            const done = results.filter(Boolean).length;
            if (done === targets.length) {
                showSuccess(
                    `User${filteredUsers?.length > 1 ? "s" : ""} Activated`
                );
            } else if (done > 0) {
                showWarning(`Activated ${done} of ${targets.length} users`);
            } else {
                if (!snackbarSpokeSince(mark)) {
                    showError(`Failed to activate user${targets.length > 1 ? "s" : ""}`);
                }
                return; // nothing changed — keep the rows and the selection
            }
            setSelected([]);
            setUpdate((prev) => prev + 1);
        };

        const deactivate = async () => {
            const targets =
                filteredUsers?.filter((itm) => isSelected(itm.id)) || [];
            if (targets.length === 0) return;
            const mark = snackbarMark();
            const results = await Promise.all(
                targets.map((itm) => DeactivateUser(itm.id))
            );
            const done = results.filter(Boolean).length;
            if (done === targets.length) {
                showSuccess(
                    `User${filteredUsers?.length > 1 ? "s" : ""} Deactivated`
                );
            } else if (done > 0) {
                showWarning(`Deactivated ${done} of ${targets.length} users`);
            } else {
                if (!snackbarSpokeSince(mark)) {
                    showError(`Failed to deactivate user${targets.length > 1 ? "s" : ""}`);
                }
                return; // nothing changed — keep the rows and the selection
            }
            setSelected([]);
            setUpdate((prev) => prev + 1);
        };

        switch (action) {
            case "Activate":
                activate();
                break;
            case "Deactivate":
                deactivate();
                break;
            case "Remove":
                remove();
                break;
        }
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
            const newSelecteds = users?.map((n) => n.id);
            setSelected(newSelecteds);
            return;
        }
        setSelected([]);
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

    const hadleEditUser = (user, location) => {
        setSelectedUserLocation(location);
        setSelectedUser(user);
        setEditUserOpen(true);
    };

    // Kept wired although nothing calls it: the only trigger in the original
    // is inside a JSX comment, so creating a user is impossible from this UI.
    // Reinstating a button is a behaviour change and is escalated, not taken.
    const handleAdduser = () => {
        setSelectedUserLocation(filterLocation);
        setSelectedUser(null);
        setEditUserOpen(true);
    };

    const isSelected = (id) => selected.indexOf(id) !== -1;
    const isOpen = (id) => rowsOpen.indexOf(id) !== -1;

    useEffect(() => {
        const getData = async () => {
            setLoading(true);
            try {
                const lcs = await GetLocations();
                const grps = await GetGroups();
                const groupUsers = await GetGroupUsers(
                    filterLocation?.officeid || 0
                );
                const users = await GetUsers();
                setUsers(users.filter((usr) => usr.id !== user?.id));
                setGroups(grps);
                setGroupUsers(groupUsers);
                setLocations(lcs);
                setFilterLocation(
                    filterLocation?.officeid || filterLocation?.officeid === 0
                        ? filterLocation
                        : lcs?.find((lc) => lc.officeid == user?.location)
                );
                setFetchError(false);
            } catch {
                setFetchError(true);
            } finally {
                setHasLoaded(true);
                setLoading(false);
            }
        };
        getData();
    }, [update]);

    useEffect(() => {
        let usrs = [];
        if (filterLocation?.officeid) {
            usrs = users.filter(
                (usr) => usr.location === filterLocation.officeid
            );
            setFilteredUsers(usrs);
        } else {
            usrs = users;
            setFilteredUsers(users);
        }

        const data = usrs?.map((itm) => {
            const Usersgroups = groupUsers.filter((ug) => ug.user_id == itm.id);
            const usersGroupsByName = [];
            Usersgroups?.map((gp) =>
                usersGroupsByName.push(
                    groups?.find((mg) => mg.id == gp.group_id)
                )
            );
            return createData(
                itm.id,
                `${itm.first_name} ${itm.last_name}`,
                itm.email,
                locations?.find((lc) => lc.officeid == itm.location)?.Alias,
                usersGroupsByName,
                itm.active ? "True" : "False",
                itm.last_login
                    ? new Date(itm.last_login).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                      })
                    : "Has not Logged In",
                itm.admin,
                itm.office_admin
            );
        });

        const sortedRows = stableSort(data, getComparator(order, orderBy));
        setPaginatedRows(
            sortedRows.slice(
                page * rowsPerPage,
                page * rowsPerPage + rowsPerPage
            )
        );
    }, [
        filterLocation,
        users,
        update,
        page,
        rowsPerPage,
        orderBy,
        order,
        groupUsers,
    ]);

    useEffect(() => {
        const loc = async () => {
            const usrgrps = await GetGroupUsers(filterLocation?.officeid || 0);
            setGroupUsers(usrgrps);
        };
        loc();
    }, [filterLocation]);

    /* -- states ---------------------------------------------------------- */

    const isSkeleton = !hasLoaded;
    const isErrorState = !isSkeleton && fetchError;
    const isEmptyState =
        !isSkeleton && !fetchError && filteredUsers.length === 0;

    /* -- pagination bounds ----------------------------------------------- */

    const total = filteredUsers.length;
    const firstShown = total === 0 ? 0 : page * rowsPerPage + 1;
    const lastShown = Math.min(total, (page + 1) * rowsPerPage);
    const prevDisabled = page === 0;
    const nextDisabled = (page + 1) * rowsPerPage >= total;

    /* -- shared bits ----------------------------------------------------- */

    const canBulkAct =
        user?.admin || user?.office_admin == filterLocation?.officeid;

    const allLocations = locations?.find((lc) => lc.officeid === 0);

    const filterValue =
        filterLocation?.officeid === 0
            ? 0
            : filterLocation?.officeid
            ? filterLocation.officeid
            : "";

    const renderSortGlyph = () => (
        <Box
            component="span"
            aria-hidden="true"
            sx={{
                ...sortGlyphSx,
                ...(order === "desc" ? { transform: "rotate(180deg)" } : null),
            }}
        >
            ▲
        </Box>
    );

    const renderMarker = (row, isItemOpen) => (
        <Box
            component="button"
            type="button"
            aria-label="Show user details"
            aria-expanded={isItemOpen}
            aria-controls={`user-detail-${row.id}`}
            onClick={(event) => {
                // Mandatory: the row carries the same handler, so without this
                // the toggle fires twice and cancels itself.
                event.stopPropagation();
                handleOpenClick(event, row.id);
            }}
            sx={markerSx(isItemOpen)}
        >
            +
        </Box>
    );

    const renderStatusPill = (activeText) => (
        <Box component="span" sx={statusPillSx(activeText === "True")}>
            <Box component="span" aria-hidden="true" sx={statusDotSx} />
            {activeText}
        </Box>
    );

    // `tagBg` is the surface the badge SITS ON inverted: `Tag`'s resting fill
    // must differ from its container or it reads as bare text. The table cell
    // is `--cc-srf`, the phone row-card is `--cc-srf2`; both tokens are read,
    // neither is derived from the other (they invert in dark).
    const renderBadges = (row, tagBg = "var(--cc-srf2)") => (
        <>
            {row.admin && (
                <Tooltip
                    key={"Admin"}
                    arrow
                    title={`Admin Access`}
                    slotProps={ccTooltipSlotProps}
                >
                    <Box component="span" sx={{ display: "inline-flex" }}>
                        <Tag on>Admin</Tag>
                    </Box>
                </Tooltip>
            )}
            {(`${row.office_admin}` == filterLocation?.officeid ||
                (filterLocation?.officeid == "0" && row.office_admin)) && (
                <Tooltip
                    key={"Office Admin"}
                    arrow
                    title={`Admin Access For ${
                        locations?.find(
                            (lc) => lc.officeid == `${row.office_admin}`
                        )?.Alias
                    }`}
                    slotProps={ccTooltipSlotProps}
                >
                    <Box component="span" sx={{ display: "inline-flex" }}>
                        <Tag sx={{ background: tagBg }}>Office Admin</Tag>
                    </Box>
                </Tooltip>
            )}
        </>
    );

    const renderLastLogin = (row) =>
        row.last_login === "Has not Logged In" ? (
            <Box component="span" sx={{ color: "var(--cc-mute)" }}>
                {row.last_login}
            </Box>
        ) : (
            <Box
                component="span"
                sx={{ ...ccType.factValueMono, color: "var(--cc-ink)" }}
            >
                {row.last_login}
            </Box>
        );

    const renderDetail = (row, isItemOpen) => {
        const rowUser = filteredUsers?.find((mt) => mt.id === row.id);
        const location = locations?.find(
            (lc) => lc.officeid == rowUser?.location
        );
        return (
            // The id sits OUTSIDE the Collapse: `unmountOnExit` removes the
            // children while collapsed, and the row and its marker both carry
            // `aria-controls="user-detail-{id}"` in that state, so the target
            // has to exist even when the pane is shut.
            <Box id={`user-detail-${row.id}`}>
                <Collapse in={isItemOpen} timeout="auto" unmountOnExit>
                    <ViewUser
                        row={row}
                        locations={locations}
                        location={location}
                        groups={groups}
                        userGroups={groupUsers}
                        rowUser={rowUser}
                        setOpen={hadleEditUser}
                    />
                </Collapse>
            </Box>
        );
    };

    /* -- toolbar --------------------------------------------------------- */

    const toolbar = (
        <Box sx={toolbarSx}>
            <CcSelect
                ariaLabel="Filter By Location"
                displayEmpty
                value={filterValue}
                onChange={(e) => {
                    const selectedItem = locations?.find(
                        (itm) => itm.officeid === e.target.value
                    );
                    setFilterLocation(selectedItem); // Return the entire object
                }}
                renderValue={(value) =>
                    value === "" ? (
                        <Box component="span" sx={{ color: "var(--cc-mute)" }}>
                            Filter By Location
                        </Box>
                    ) : (
                        locations?.find((lc) => lc.officeid === value)?.Alias
                    )
                }
                sx={{ width: "auto", minWidth: "170px", flex: "none" }}
            >
                {locations?.map((itm, index) => (
                    <MenuItem key={index} value={itm.officeid}>
                        {itm.Alias}
                    </MenuItem>
                ))}
            </CcSelect>

            <Box sx={{ flex: 1 }} />

            {selected.length > 0 && (
                <Box sx={metaLabelSx}>
                    <Box component="span" sx={metaNumSx}>
                        {selected.length}
                    </Box>{" "}
                    selected
                </Box>
            )}

            {canBulkAct && (
                <Box sx={bulkGroupSx}>
                    <Box component="span" sx={metaLabelSx}>
                        I Want To{" "}
                    </Box>
                    <CcSelect
                        ariaLabel="Action"
                        value={action}
                        onChange={(e) => setAction(e.target.value)}
                        disabled={selected?.length == 0}
                        sx={{
                            width: "auto",
                            minWidth: "120px",
                            flex: "none",
                            [PHONE_MQ]: { flex: "1 1 140px" },
                        }}
                    >
                        {BULK_ACTIONS.map((itm) => (
                            <MenuItem key={itm} value={itm}>
                                {itm}
                            </MenuItem>
                        ))}
                    </CcSelect>
                    <Box component="span" sx={metaLabelSx}>
                        Selected
                    </Box>
                    <CcButton
                        variant={selected?.length ? "primary" : "default"}
                        onClick={handleSubmit}
                        disabled={!selected?.length}
                    >
                        Submit
                    </CcButton>
                </Box>
            )}
        </Box>
    );

    /* -- table head ------------------------------------------------------ */

    const head = (
        <Box component="thead">
            <Box component="tr">
                <Box component="th" scope="col" sx={checkThSx}>
                    <Checkbox
                        indeterminate={
                            selected.length > 0 &&
                            selected.length < filteredUsers.length
                        }
                        checked={
                            filteredUsers.length > 0 &&
                            selected.length === filteredUsers.length
                        }
                        onChange={handleSelectAllClick}
                        inputProps={{
                            "aria-label": "select all meetings",
                        }}
                        sx={checkboxSx}
                    />
                </Box>
                <Box component="th" scope="col" sx={markerThSx}>
                    <Box component="span" sx={srOnlySx}>
                        Details
                    </Box>
                </Box>
                {SORT_COLUMNS.map((col) => {
                    const active = orderBy === col.sort;
                    return (
                        <Box
                            component="th"
                            scope="col"
                            key={col.sort}
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
                                onClick={(event) =>
                                    handleRequestSort(event, col.sort)
                                }
                                sx={{
                                    ...sortBtnSx,
                                    ...(active
                                        ? { color: "var(--cc-ink)" }
                                        : null),
                                }}
                            >
                                {col.label}
                                {active ? renderSortGlyph() : null}
                            </Box>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );

    /* -- skeletons ------------------------------------------------------- */

    const tableSkeleton = (
        <Box sx={scrollSx}>
            <Box component="table" sx={tableSx} aria-label="Users">
                {head}
                <Box component="tbody">
                    {SK_ROWS.map((r) => (
                        <Box component="tr" key={r}>
                            <Box component="td" sx={checkTdSx}>
                                <Sk
                                    sx={{
                                        width: "18px",
                                        height: "18px",
                                        borderRadius: "6px",
                                        margin: "0 4px",
                                    }}
                                />
                            </Box>
                            <Box component="td" sx={markerTdSx}>
                                <Sk
                                    sx={{
                                        width: "22px",
                                        height: "22px",
                                        margin: "0 auto",
                                    }}
                                />
                            </Box>
                            {[0, 1, 2].map((c) => (
                                <Box component="td" key={c} sx={tdSx}>
                                    <Sk
                                        sx={{
                                            height: "13px",
                                            width: SK_WIDTHS[
                                                (r * 3 + c) % SK_WIDTHS.length
                                            ],
                                        }}
                                    />
                                </Box>
                            ))}
                            <Box component="td" sx={{ ...tdSx, ...groupsCellSx }}>
                                <Box
                                    sx={{
                                        display: "flex",
                                        gap: "5px",
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <Sk
                                        sx={{ height: "20px", width: "62px" }}
                                    />
                                    <Sk
                                        sx={{ height: "20px", width: "48px" }}
                                    />
                                </Box>
                            </Box>
                            <Box component="td" sx={tdSx}>
                                <Sk sx={{ height: "18px", width: "66px" }} />
                            </Box>
                            <Box component="td" sx={tdSx}>
                                <Sk
                                    sx={{
                                        height: "13px",
                                        width: SK_WIDTHS[r % SK_WIDTHS.length],
                                    }}
                                />
                            </Box>
                        </Box>
                    ))}
                </Box>
            </Box>
        </Box>
    );

    const cardSkeleton = (
        <Box sx={cardListSx}>
            {SK_CARDS.map((i) => (
                <Box key={i} sx={rowCardSx}>
                    <Sk sx={{ height: "14px", width: "55%" }} />
                    <Sk sx={{ height: "13px", width: "80%" }} />
                    <Sk sx={{ height: "13px", width: "65%" }} />
                    <Sk sx={{ height: "18px", width: "66px" }} />
                </Box>
            ))}
        </Box>
    );

    /* -- data ------------------------------------------------------------ */

    const table = (
        <Box sx={scrollSx}>
            <Box component="table" sx={tableSx} aria-label="Users">
                {head}
                <Box component="tbody">
                    {paginatedRows?.map((row, index) => {
                        const isItemSelected = isSelected(row.id);
                        const isItemOpen = isOpen(row.id);
                        return (
                            <React.Fragment key={index}>
                                <Box
                                    component="tr"
                                    tabIndex={0}
                                    aria-expanded={isItemOpen}
                                    aria-controls={`user-detail-${row.id}`}
                                    onClick={(e) =>
                                        handleOpenClick(e, row.id)
                                    }
                                    onKeyDown={(e) => {
                                        if (e.target !== e.currentTarget)
                                            return;
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            handleOpenClick(e, row.id);
                                        }
                                    }}
                                    sx={{
                                        ...trSx,
                                        ...(isItemSelected
                                            ? selectedTrSx
                                            : null),
                                    }}
                                >
                                    <Box component="td" sx={checkTdSx}>
                                        <Checkbox
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                handleClick(event, row.id);
                                            }}
                                            checked={isItemSelected}
                                            inputProps={{
                                                "aria-labelledby": `enhanced-table-checkbox-${row.id}`,
                                            }}
                                            sx={checkboxSx}
                                        />
                                    </Box>
                                    <Box component="td" sx={markerTdSx}>
                                        {renderMarker(row, isItemOpen)}
                                    </Box>
                                    <Box
                                        component="th"
                                        scope="row"
                                        id={`enhanced-table-checkbox-${row.id}`}
                                        title={row.name}
                                        sx={{ ...tdSx, ...nameCellSx }}
                                    >
                                        {row.name}
                                    </Box>
                                    <Box
                                        component="td"
                                        title={row.email}
                                        sx={{ ...tdSx, ...emailCellSx }}
                                    >
                                        {row.email}
                                    </Box>
                                    <Box component="td" sx={tdSx}>
                                        {row.location}
                                    </Box>
                                    <Box
                                        component="td"
                                        sx={{ ...tdSx, ...groupsCellSx }}
                                    >
                                        <Box sx={groupChipsSx}>
                                            <DisplayGroups
                                                groups={row.groups}
                                            />
                                            {renderBadges(row)}
                                        </Box>
                                    </Box>
                                    <Box component="td" sx={tdSx}>
                                        {renderStatusPill(row.active)}
                                    </Box>
                                    <Box component="td" sx={tdSx}>
                                        {renderLastLogin(row)}
                                    </Box>
                                </Box>
                                <Box component="tr">
                                    <Box
                                        component="td"
                                        colSpan={COLSPAN}
                                        sx={detailTdSx}
                                    >
                                        {renderDetail(row, isItemOpen)}
                                    </Box>
                                </Box>
                            </React.Fragment>
                        );
                    })}
                </Box>
            </Box>
        </Box>
    );

    const rowCards = (
        <Box sx={cardListSx}>
            {paginatedRows?.map((row, index) => {
                const isItemSelected = isSelected(row.id);
                const isItemOpen = isOpen(row.id);
                return (
                    <Box
                        key={index}
                        sx={{
                            ...rowCardSx,
                            ...(isItemSelected
                                ? {
                                      background: "var(--cc-wash)",
                                      boxShadow: "inset 3px 0 0 var(--cc-red)",
                                  }
                                : null),
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
                            <Checkbox
                                onClick={(event) => {
                                    event.stopPropagation();
                                    handleClick(event, row.id);
                                }}
                                checked={isItemSelected}
                                inputProps={{
                                    "aria-labelledby": `enhanced-table-checkbox-${row.id}`,
                                }}
                                sx={checkboxSx}
                            />
                            <Box
                                id={`enhanced-table-checkbox-${row.id}`}
                                sx={{
                                    ...ccType.cardName,
                                    color: "var(--cc-ink)",
                                    flex: 1,
                                    minWidth: 0,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                }}
                            >
                                {row.name}
                            </Box>
                            {renderMarker(row, isItemOpen)}
                        </Box>

                        <Box sx={pairSx}>
                            <Box sx={metaLabelSx}>Email</Box>
                            <Box sx={pairValueSx}>{row.email}</Box>
                        </Box>
                        <Box sx={pairSx}>
                            <Box sx={metaLabelSx}>Location</Box>
                            <Box sx={pairValueSx}>{row.location}</Box>
                        </Box>
                        <Box sx={pairSx}>
                            <Box sx={metaLabelSx}>Active</Box>
                            <Box sx={{ ...pairValueSx, textAlign: "right" }}>
                                {renderStatusPill(row.active)}
                            </Box>
                        </Box>
                        <Box sx={pairSx}>
                            <Box sx={metaLabelSx}>Last Login</Box>
                            <Box sx={pairValueSx}>{renderLastLogin(row)}</Box>
                        </Box>
                        <Box
                            sx={{
                                ...groupChipsSx,
                                "& .MuiChip-root": {
                                    ...groupChipsSx["& .MuiChip-root"],
                                    background: "var(--cc-srf)",
                                },
                            }}
                        >
                            <DisplayGroups groups={row.groups} />
                            {renderBadges(row, "var(--cc-srf)")}
                        </Box>

                        {renderDetail(row, isItemOpen)}
                    </Box>
                );
            })}
        </Box>
    );

    /* -- empty / error --------------------------------------------------- */

    const emptyState = (
        <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            <StateBlock
                icon="◍"
                title={
                    filterLocation?.officeid
                        ? `No users in ${filterLocation.Alias}`
                        : "No users to show"
                }
                body={
                    filterLocation?.officeid
                        ? "Nothing matches the current location filter."
                        : "The directory returned no other user accounts."
                }
                actions={
                    filterLocation?.officeid && allLocations ? (
                        <CcButton
                            variant="primary"
                            onClick={() => setFilterLocation(allLocations)}
                        >
                            Show all locations
                        </CcButton>
                    ) : null
                }
            />
        </Box>
    );

    const errorState = (
        <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            <StateBlock
                danger
                icon="!"
                title="We couldn't load users"
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
        </Box>
    );

    let body;
    if (isSkeleton) {
        body = isPhone ? cardSkeleton : tableSkeleton;
    } else if (isErrorState) {
        body = errorState;
    } else if (isEmptyState) {
        body = emptyState;
    } else {
        body = isPhone ? rowCards : table;
    }

    return (
        <Box sx={pageSx}>
            <AddNewUser
                open={editUserOpen}
                setOpen={setEditUserOpen}
                userLocation={selectedUserLocation}
                locations={locations}
                groups={groups}
                userGroups={groupUsers}
                selectedUser={selectedUser}
                setUpdate={setUpdate}
                filterLocation={filterLocation}
            />

            <Box sx={cardSx}>
                {toolbar}
                {body}
                <Box sx={footerSx}>
                    <Box sx={counterSx}>
                        Showing{" "}
                        <Box component="span" sx={metaNumSx}>
                            {firstShown}
                        </Box>
                        –
                        <Box component="span" sx={metaNumSx}>
                            {lastShown}
                        </Box>{" "}
                        of{" "}
                        <Box component="span" sx={metaNumSx}>
                            {total}
                        </Box>
                    </Box>
                    <Box component="nav" aria-label="Pagination" sx={navSx}>
                        <Box component="span" sx={metaLabelSx}>
                            Rows
                        </Box>
                        <CcSelect
                            value={rowsPerPage}
                            onChange={handleChangeRowsPerPage}
                            ariaLabel="Rows per page"
                            sx={{ width: "auto", minWidth: "84px" }}
                        >
                            {ROWS_PER_PAGE_OPTIONS.map((option) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </CcSelect>
                        <Box
                            component="button"
                            type="button"
                            aria-label="Previous page"
                            disabled={prevDisabled}
                            onClick={() => handleChangePage(null, page - 1)}
                            sx={arrowSx}
                        >
                            <ChevronIcon size={17} strokeWidth={2} />
                        </Box>
                        <Box
                            component="button"
                            type="button"
                            aria-label="Next page"
                            disabled={nextDisabled}
                            onClick={() => handleChangePage(null, page + 1)}
                            sx={arrowSx}
                        >
                            <ChevronIcon size={17} strokeWidth={2} flip />
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
