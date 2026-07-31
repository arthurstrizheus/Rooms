/**
 * Locations — the office directory (`/manage/locations`).
 *
 * Concourse redesign. Visual only: every handler, the fetch, the sort helpers
 * and the state shape are byte-for-byte the originals. MUI's Table family and
 * TablePagination were replaced with a plain semantic <table> and the §4.5
 * footer strip because `StyledTableCell` hard-coded `white` / `common.black`
 * and MUI's IconButtons are force-coloured by theme.js's global MuiButton
 * override.
 *
 * Three data states ship: skeleton, empty, data. There is deliberately NO
 * error state — `GetLocations` swallows every failure and returns `[]`, so the
 * page cannot tell "the fetch failed" from "there are no offices". The global
 * snackbar already fires from inside `GetLocations` on a non-2xx.
 *
 * `setLoading` / `loading` are passed by Routes.js and deliberately still not
 * accepted: the effect refetches on every sort click and page change, so the
 * banner bar would blink on each one.
 */

import React, { useEffect, useState } from "react";
import { Box, MenuItem, useMediaQuery } from "@mui/material";
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
import { GetLocations } from "../../../Utilites/Functions/ApiFunctions";

/* ==========================================================================
 * Behaviour — unchanged from the original file
 * ========================================================================*/

function createData(id, city, number, saddress, state, zip, airport, alias) {
    return { id, city, number, saddress, state, zip, airport, alias };
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
 * Column contract — label, sort property literal and row field, in render
 * order. The `sort` strings are the literals the original passed to
 * handleRequestSort and must not change (note position 5: label "Address",
 * sort property "address", field `saddress` — reported as bug B2, not fixed).
 * ========================================================================*/

const MONO_CELL = { ...ccType.factValueMono, color: "var(--cc-ink)" };

const COLUMNS = [
    {
        label: "Alias",
        sort: "alias",
        field: "alias",
        cellSx: {
            ...ccType.cardName,
            color: "var(--cc-ink)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "200px",
        },
    },
    { label: "City", sort: "city", field: "city", cellSx: null },
    { label: "State", sort: "state", field: "state", cellSx: MONO_CELL },
    { label: "Zip", sort: "zip", field: "zip", cellSx: MONO_CELL },
    {
        label: "Address",
        sort: "address",
        field: "saddress",
        cellSx: { minWidth: "200px" },
    },
    { label: "Airport", sort: "airport", field: "airport", cellSx: MONO_CELL },
];

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
    padding:
        "clamp(14px,2.4vw,22px) clamp(12px,2.6vw,24px) clamp(14px,2.4vw,22px)",
};

const cardSx = {
    background: "var(--cc-srf)",
    borderRadius: "26px",
    boxShadow: "var(--cc-sh2)",
    overflow: "hidden",
    boxSizing: "border-box",
    animation: "cc-rise 500ms var(--cc-sp) 80ms both",
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    [PHONE_MQ]: { borderRadius: "22px" },
};

/** The single scroll region of the card. */
const scrollSx = {
    flex: 1,
    minHeight: 0,
    overflow: "auto",
    scrollbarWidth: "thin",
    overscrollBehavior: "contain",
    boxSizing: "border-box",
};

const tableSx = {
    width: "100%",
    minWidth: "700px",
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
    ...ccType.blockLabel,
    color: "var(--cc-mute)",
    boxSizing: "border-box",
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
    transition: "background 200ms",
    ...hover({ background: "var(--cc-wash)" }),
};

const tdSx = {
    padding: "11px 14px",
    verticalAlign: "middle",
    textAlign: "left",
    fontSize: "13.5px",
    color: "var(--cc-ink)",
    borderBottom: "1px solid var(--cc-line)",
    boxSizing: "border-box",
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
};

const pairKeySx = {
    ...ccType.factKey,
    color: "var(--cc-mute)",
    whiteSpace: "nowrap",
};

/* ---- toolbar + footer -------------------------------------------------- */

const toolbarSx = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    flexShrink: 0,
    padding: "13px 16px 11px",
    boxSizing: "border-box",
};

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

const counterNumSx = { ...ccType.factValueMono, color: "var(--cc-ink)" };

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

export default function Locations() {
    const [order, setOrder] = useState("asc");
    const [orderBy, setOrderBy] = useState("name");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [locations, setLocations] = useState([]);
    const [paginatedRows, setPaginatedRows] = useState([]);
    // Additive, presentational: gates the first-paint skeleton and lets the
    // empty state re-run the existing fetch with the existing arguments.
    const [hasLoaded, setHasLoaded] = useState(false);
    const [reloadNonce, setReloadNonce] = useState(0);

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

    useEffect(() => {
        GetLocations()
            .then((resp) => {
                const data = resp?.map((itm) => {
                    return createData(
                        itm.officeid,
                        itm.City,
                        itm.Number,
                        itm.SAddress,
                        itm.state,
                        itm.Zip,
                        itm.Airport,
                        itm.Alias
                    );
                });
                setLocations(resp);
                const sortedRows = stableSort(
                    data,
                    getComparator(order, orderBy)
                );
                setPaginatedRows(
                    sortedRows.slice(
                        page * rowsPerPage,
                        page * rowsPerPage + rowsPerPage
                    )
                );
            })
            .finally(() => setHasLoaded(true));
    }, [page, rowsPerPage, orderBy, order, reloadNonce]);

    /* -- states ---------------------------------------------------------- */
    // Deliberately gated on `!hasLoaded` alone, not on a per-fetch flag: the
    // effect above refetches on every sort click and page change, so a
    // per-fetch gate would flash the whole table on each one.
    const isSkeleton = !hasLoaded;
    const isEmpty = !isSkeleton && locations.length === 0;

    /* -- pagination bounds ----------------------------------------------- */
    const total = locations.length;
    const firstShown = page * rowsPerPage + 1;
    const lastShown = Math.min((page + 1) * rowsPerPage, total);
    const prevDisabled = page === 0;
    const nextDisabled = (page + 1) * rowsPerPage >= total;

    /* -- phone sort control ---------------------------------------------- */
    const activeColumn = COLUMNS.find((col) => col.sort === orderBy);
    // `orderBy` starts as "name", which is not a column (bug B1, preserved),
    // so the Select would be out of range. "" keeps MUI quiet and the
    // renderValue reads as a placeholder.
    const sortValue = activeColumn ? orderBy : "";

    const renderSortGlyph = () => (
        <Box
            component="span"
            aria-hidden="true"
            sx={{
                ...sortGlyphSx,
                ...(order === "desc"
                    ? { transform: "rotate(180deg)" }
                    : null),
            }}
        >
            ▲
        </Box>
    );

    const phoneToolbar = (
        <Box sx={toolbarSx}>
            <CcSelect
                value={sortValue}
                displayEmpty
                renderValue={(value) =>
                    COLUMNS.find((col) => col.sort === value)?.label ||
                    "Sort by"
                }
                onChange={(event) =>
                    handleRequestSort(event, event.target.value)
                }
                ariaLabel="Sort by"
                sx={{ width: "auto", minWidth: "150px", flex: "none" }}
            >
                {COLUMNS.map((col) => (
                    <MenuItem key={col.sort} value={col.sort}>
                        {col.label}
                    </MenuItem>
                ))}
            </CcSelect>
            <CcButton
                onClick={(event) => handleRequestSort(event, orderBy)}
                sx={{ padding: "6px 13px", fontSize: "12.5px" }}
            >
                {order === "desc" ? "Descending" : "Ascending"}
                {renderSortGlyph()}
            </CcButton>
        </Box>
    );

    /* -- the table ------------------------------------------------------- */

    const head = (
        <Box component="thead">
            <Box component="tr">
                {COLUMNS.map((col) => {
                    const active = orderBy === col.sort;
                    return (
                        <Box
                            component="th"
                            key={col.sort}
                            scope="col"
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

    const tableSkeleton = (
        <Box sx={scrollSx}>
            <Box component="table" sx={tableSx} aria-label="Offices">
                {head}
                <Box component="tbody">
                    {SK_ROWS.map((r) => (
                        <Box component="tr" key={r}>
                            {COLUMNS.map((col, c) => (
                                <Box
                                    component="td"
                                    key={col.sort}
                                    sx={tdSx}
                                >
                                    <Sk
                                        sx={{
                                            height: "13px",
                                            borderRadius: "99px",
                                            width: SK_WIDTHS[
                                                (r * COLUMNS.length + c) %
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

    const cardSkeleton = (
        <Box sx={cardListSx}>
            {SK_CARDS.map((i) => (
                <Box key={i} sx={rowCardSx}>
                    <Sk sx={{ height: "13px", width: "55%" }} />
                    <Sk sx={{ height: "13px", width: "80%" }} />
                    <Sk sx={{ height: "13px", width: "65%" }} />
                </Box>
            ))}
        </Box>
    );

    const table = (
        <Box sx={scrollSx}>
            <Box component="table" sx={tableSx} aria-label="Offices">
                {head}
                <Box component="tbody">
                    {paginatedRows?.map((row) => (
                        <Box component="tr" key={row.id} sx={trSx}>
                            {COLUMNS.map((col, i) => (
                                <Box
                                    component={i === 0 ? "th" : "td"}
                                    scope={i === 0 ? "row" : undefined}
                                    key={col.sort}
                                    sx={{ ...tdSx, ...col.cellSx }}
                                >
                                    {row[col.field]}
                                </Box>
                            ))}
                        </Box>
                    ))}
                </Box>
            </Box>
        </Box>
    );

    const rowCards = (
        <Box sx={cardListSx}>
            {paginatedRows?.map((row) => (
                <Box key={row.id} sx={rowCardSx}>
                    <Box sx={{ ...ccType.cardName, color: "var(--cc-ink)" }}>
                        {row.alias}
                    </Box>
                    {COLUMNS.slice(1).map((col) => (
                        <Box key={col.sort} sx={pairSx}>
                            <Box sx={pairKeySx}>{col.label}</Box>
                            <Box
                                sx={{
                                    ...ccType.factValue,
                                    ...(col.cellSx === MONO_CELL
                                        ? ccType.factValueMono
                                        : null),
                                    color: "var(--cc-ink)",
                                    textAlign: "right",
                                }}
                            >
                                {row[col.field]}
                            </Box>
                        </Box>
                    ))}
                </Box>
            ))}
        </Box>
    );

    const emptyState = (
        <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            <StateBlock
                icon="▦"
                title="No offices to show"
                body="Nothing came back for the office directory. Reload to try again."
                actions={
                    <CcButton
                        variant="primary"
                        onClick={() => setReloadNonce((n) => n + 1)}
                    >
                        Reload
                    </CcButton>
                }
            />
        </Box>
    );

    let body;
    if (isSkeleton) {
        body = isPhone ? cardSkeleton : tableSkeleton;
    } else if (isEmpty) {
        body = emptyState;
    } else {
        body = isPhone ? rowCards : table;
    }

    return (
        <Box sx={pageSx}>
            <Box sx={cardSx}>
                {isPhone ? phoneToolbar : null}
                {body}
                <Box sx={footerSx}>
                    {total > 0 ? (
                        <Box sx={counterSx}>
                            Showing{" "}
                            <Box component="span" sx={counterNumSx}>
                                {firstShown}
                            </Box>
                            –
                            <Box component="span" sx={counterNumSx}>
                                {lastShown}
                            </Box>{" "}
                            of{" "}
                            <Box component="span" sx={counterNumSx}>
                                {total}
                            </Box>
                        </Box>
                    ) : null}
                    <Box component="nav" aria-label="Pagination" sx={navSx}>
                        <Box
                            component="span"
                            sx={{
                                ...ccType.factKey,
                                color: "var(--cc-mute)",
                                whiteSpace: "nowrap",
                            }}
                        >
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
                            disabled={nextDisabled}
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
    );
}
