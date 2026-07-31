/**
 * Concourse presentation primitives that are local to the Resources page.
 *
 * Everything here is *presentation only* — no fetch, no handler, no payload.
 * The two tabs (`RoomResources.js`, `Resources.js`) are structurally identical
 * data tables, so their chrome lives here once instead of twice.
 *
 * None of this belongs in `src/Views/Components/Concourse/**` yet: the kit is
 * read-only to this lane. `StateBlock`, `Sk`, the data-table style set and the
 * pagination strip are the obvious promotion candidates once several pages
 * have landed — see the build report.
 *
 * Rules honoured here (PAGE-ADOPTION-GUIDE §0):
 *  - tokens are read from `--cc-*`, never derived, never branched on `mode`
 *  - no MUI `Button` / `IconButton` (theme.js force-sets `color`)
 *  - `boxSizing: "border-box"` on everything that is sized (no CssBaseline)
 *  - every hover rule sits inside `@media (hover: hover)`
 *  - in-page `z-index` stays <= 5
 */

import { Box, Dialog, MenuItem } from "@mui/material";
import {
    bp,
    motion as ccMotion,
    type as ccType,
} from "../../../../Utilites/concourse";
import {
    btnReset,
    ChevronIcon,
} from "../../../Components/Banner/Components/atoms";
import {
    AlertBlock,
    CcButton,
    CcSelect,
    DialogBody,
    DialogFooter,
    DialogHeader,
    DialogSurface,
    focusRing,
    scopeDialogProps,
    Spacer,
} from "../../../Components/Concourse/ConcourseDialogKit";

/** The spring easing, as a string for building `transition` shorthands. */
const SP = "var(--cc-sp)";

/** Page chrome uses `bp.sheet` (guide §6); the kit's `PHONE` is dialog-only. */
export const PHONE_Q = `@media (max-width:${bp.sheet}px)`;

/** Guide §0 / §5.6 — a tap must not leave an element stuck in :hover. */
export const HOVER_Q = "@media (hover: hover)";

/* ==========================================================================
 * Skeleton primitive (guide §3.7, copied from Calendar index.jsx:349-367,
 * which does not export it).
 * ========================================================================*/

export const skSx = {
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

export const Sk = ({ sx }) => <Box sx={{ ...skSx, ...sx }} />;

/* ==========================================================================
 * Empty / error state (guide §3.7, copied from Calendar index.jsx:503-543).
 * ========================================================================*/

export const StateBlock = ({ icon, danger, title, body, actions }) => (
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

/** The card fills the page, so a state block centres in the leftover height. */
export const stateWrapSx = {
    flex: 1,
    minHeight: 0,
    display: "grid",
    placeItems: "center",
    overflowY: "auto",
    scrollbarWidth: "thin",
    boxSizing: "border-box",
};

/* ==========================================================================
 * Card toolbar + segmented control (guide §3.5 / §3.6).
 * ========================================================================*/

export const toolbarSx = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    flexShrink: 0,
    padding: "13px 16px 11px",
    boxSizing: "border-box",
};

/**
 * Two short labels => segmented control, not underline tabs (guide §4.3).
 * `aria-pressed` + `role="group"` is the shipped idiom (Calendar index.jsx:1740).
 * The panel ids stay on the buttons via `id` / `aria-controls` so the existing
 * `simple-tab-N` / `simple-tabpanel-N` relationship survives.
 */
export const SegmentedControl = ({ label, options, value, onChange }) => (
    <Box
        role="group"
        aria-label={label}
        sx={{
            display: "flex",
            background: "var(--cc-srf2)",
            borderRadius: "99px",
            padding: "3px",
            gap: "2px",
            boxSizing: "border-box",
            [PHONE_Q]: { width: "100%" },
        }}
    >
        {options.map((opt) => (
            <Box
                key={opt.value}
                component="button"
                type="button"
                id={opt.id}
                aria-controls={opt.controls}
                aria-pressed={value === opt.value}
                onClick={(event) => onChange(event, opt.value)}
                sx={{
                    border: 0,
                    background: "transparent",
                    borderRadius: "99px",
                    padding: "6px 15px",
                    cursor: "pointer",
                    fontFamily: "var(--cc-sans)",
                    boxSizing: "border-box",
                    ...ccType.modeToggle,
                    color: "var(--cc-mute)",
                    transition: `color ${ccMotion.dur.colour}ms, background ${ccMotion.dur.bgSpring}ms ${SP}`,
                    "&[aria-pressed='true']": {
                        background: "var(--cc-srf)",
                        color: "var(--cc-ink)",
                        boxShadow: "var(--cc-sh1)",
                    },
                    "&:focus-visible": focusRing,
                    [PHONE_Q]: { flex: 1 },
                }}
            >
                {opt.label}
            </Box>
        ))}
    </Box>
);

/** Toolbar selection read-out. `count` is `selected.length` — a real local. */
export const SelectionSummary = ({ count }) => (
    <Box
        sx={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            whiteSpace: "nowrap",
            ...ccType.factKey,
            color: "var(--cc-mute)",
        }}
    >
        <Box
            component="span"
            sx={{ ...ccType.factValueMono, color: "var(--cc-ink)" }}
        >
            {count}
        </Box>
        selected
    </Box>
);

/* ==========================================================================
 * Data table (guide §4.1). No zebra striping, no transform on a row.
 * ========================================================================*/

export const tableWrapSx = {
    flex: 1,
    minHeight: 0,
    overflowX: "auto",
    overflowY: "auto",
    scrollbarWidth: "thin",
    boxSizing: "border-box",
};

export const tableSx = {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    boxSizing: "border-box",
};

export const thSx = {
    position: "sticky",
    top: 0,
    // In-page stacking stays <= 5 (guide §7.6).
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

export const thCheckboxSx = {
    ...thSx,
    width: "44px",
    padding: "6px 0 6px 14px",
};

export const tdSx = {
    padding: "11px 14px",
    verticalAlign: "middle",
    fontSize: "13.5px",
    color: "var(--cc-ink)",
    borderBottom: "1px solid var(--cc-line)",
    boxSizing: "border-box",
};

export const tdCheckboxSx = {
    ...tdSx,
    width: "44px",
    padding: "11px 0 11px 14px",
};

/** The record's identity column. */
export const nameCellSx = {
    ...tdSx,
    ...ccType.cardName,
    textAlign: "left",
    maxWidth: "280px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
};

/** Secondary text. */
export const muteCellSx = { ...tdSx, color: "var(--cc-mute)" };

/**
 * Row states, guide §4.1: background only — never a transform (§5.4), and the
 * selected marker is an inset shadow on the first cell, never a border-left.
 */
export const rowSx = (isSelected) => ({
    transition: `background ${ccMotion.dur.colour}ms`,
    ...(isSelected ? { background: "var(--cc-wash)" } : null),
    [HOVER_Q]: { "&:hover": { background: "var(--cc-wash)" } },
    ...(isSelected
        ? {
              // `:first-child`, NOT `:first-of-type` — the identity column is a
              // `<th scope="row">`, so `th:first-of-type` would match it too and
              // paint a second red bar in the middle of the row.
              "& > td:first-child, & > th:first-child": {
                  boxShadow: "inset 3px 0 0 var(--cc-red)",
              },
          }
        : null),
    "&:last-of-type > td, &:last-of-type > th": { borderBottom: 0 },
});

/** MUI Checkbox is kept and restyled — it is not a Button/IconButton. */
export const checkboxSx = {
    color: "var(--cc-mute)",
    padding: "4px",
    borderRadius: "99px",
    "&.Mui-checked": { color: "var(--cc-red)" },
    "&.MuiCheckbox-indeterminate": { color: "var(--cc-red)" },
    "&.Mui-focusVisible": focusRing,
    [HOVER_Q]: { "&:hover": { background: "var(--cc-wash)" } },
};

const SK_WIDTHS = ["70%", "45%", "85%", "55%", "60%"];

/** Same column template as the loaded table, so nothing jumps on arrival. */
export const TableSkeleton = ({ columns, rows = 8 }) => (
    <Box
        component="tbody"
        sx={{ "& tr:last-of-type td": { borderBottom: 0 } }}
    >
        {Array.from({ length: rows }).map((_, r) => (
            <Box component="tr" key={r}>
                <Box component="td" sx={tdCheckboxSx}>
                    <Sk
                        sx={{
                            width: "18px",
                            height: "18px",
                            borderRadius: "6px",
                            margin: "0 5px",
                        }}
                    />
                </Box>
                {Array.from({ length: columns }).map((__, c) => (
                    <Box component="td" key={c} sx={tdSx}>
                        <Sk
                            sx={{
                                height: "13px",
                                width: SK_WIDTHS[(r + c * 2) % SK_WIDTHS.length],
                            }}
                        />
                    </Box>
                ))}
            </Box>
        ))}
    </Box>
);

/* ==========================================================================
 * <=620px: every data table becomes a list of row-cards (guide §4.1).
 * ========================================================================*/

export const rowCardListSx = {
    display: "grid",
    gap: "8px",
    padding: "0 12px 14px",
    boxSizing: "border-box",
    overflowY: "auto",
    scrollbarWidth: "thin",
    flex: 1,
    minHeight: 0,
};

export const RowCardList = ({ children }) => (
    <Box sx={rowCardListSx}>{children}</Box>
);

const rowCardBaseSx = {
    background: "var(--cc-srf2)",
    borderRadius: "18px",
    padding: "12px 14px",
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    gap: "10px",
    alignItems: "start",
    boxSizing: "border-box",
};

/**
 * The select-all control has no header row to live in on a phone, so it gets a
 * strip of its own above the cards. Without it the control disappears below
 * 620px, which would be a loss of function, not a redesign.
 */
export const SelectAllStrip = ({ children }) => (
    <Box
        sx={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "0 2px",
            boxSizing: "border-box",
        }}
    >
        {children}
        <Box sx={{ ...ccType.blockLabel, color: "var(--cc-mute)" }}>
            Select all
        </Box>
    </Box>
);

export const RowCard = ({ name, facts, checkbox, selected }) => (
    <Box
        sx={{
            ...rowCardBaseSx,
            ...(selected
                ? { boxShadow: "inset 3px 0 0 var(--cc-red)" }
                : null),
        }}
    >
        <Box sx={{ marginTop: "-3px", marginLeft: "-4px" }}>{checkbox}</Box>
        <Box sx={{ display: "grid", gap: "6px", minWidth: 0 }}>
            <Box
                sx={{
                    ...ccType.cardName,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                }}
            >
                {name}
            </Box>
            {facts.map((fact) => (
                <Box
                    key={fact.label}
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
                        {fact.label}
                    </Box>
                    <Box
                        sx={{
                            ...ccType.factValue,
                            textAlign: "right",
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {fact.value}
                    </Box>
                </Box>
            ))}
        </Box>
    </Box>
);

export const RowCardListSkeleton = ({ rows = 5, facts = 2 }) => (
    <RowCardList>
        {Array.from({ length: rows }).map((_, i) => (
            <Box key={i} sx={rowCardBaseSx}>
                <Sk
                    sx={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "6px",
                        marginTop: "2px",
                    }}
                />
                <Box sx={{ display: "grid", gap: "8px", minWidth: 0 }}>
                    <Sk
                        sx={{
                            height: "14px",
                            width: SK_WIDTHS[i % SK_WIDTHS.length],
                        }}
                    />
                    {Array.from({ length: facts }).map((__, f) => (
                        <Sk
                            key={f}
                            sx={{
                                height: "12px",
                                width: SK_WIDTHS[(i + f + 1) % SK_WIDTHS.length],
                            }}
                        />
                    ))}
                </Box>
            </Box>
        ))}
    </RowCardList>
);

/* ==========================================================================
 * Pagination footer strip (guide §4.5).
 *
 * Rebuilt rather than restyling MUI `TablePagination`, so no MUI `IconButton`
 * lands on a Concourse surface and nothing needs `backgroundImage:"none"`.
 * `count` is a real client-side total (`filteredResources.length`), so the
 * "Showing X-Y of N" read-out is not invented data.
 * ========================================================================*/

export const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export const paginationSx = {
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
    [HOVER_Q]: {
        "&:hover:not(:disabled)": {
            // The strip's own ground is `srf`, so the neutral icon-button
            // hover fill is `srf3` (guide §4.1), not the banner's `srf`.
            background: "var(--cc-srf3)",
            color: "var(--cc-ink)",
            boxShadow: "var(--cc-sh1)",
        },
    },
    "&:active:not(:disabled)": { transform: "scale(.88)" },
    "&:disabled": { opacity: 0.4, cursor: "default" },
};

export const PaginationBar = ({
    count,
    page,
    rowsPerPage,
    onPageChange,
    onRowsPerPageChange,
    loading,
}) => {
    const pageCount = rowsPerPage > 0 ? Math.ceil(count / rowsPerPage) : 0;
    const from = count === 0 ? 0 : page * rowsPerPage + 1;
    const to = Math.min(count, (page + 1) * rowsPerPage);
    const monoSx = { ...ccType.factValueMono, color: "var(--cc-ink)" };

    return (
        <Box sx={paginationSx}>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    whiteSpace: "nowrap",
                    ...ccType.factKey,
                    color: "var(--cc-mute)",
                    [PHONE_Q]: { width: "100%", order: 9 },
                }}
            >
                {loading ? (
                    <Sk sx={{ width: "132px", height: "13px" }} />
                ) : (
                    <>
                        Showing
                        <Box component="span" sx={monoSx}>
                            {from}&ndash;{to}
                        </Box>
                        of
                        <Box component="span" sx={monoSx}>
                            {count}
                        </Box>
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
                    [PHONE_Q]: {
                        marginLeft: 0,
                        width: "100%",
                        justifyContent: "space-between",
                    },
                }}
            >
                <Box
                    sx={{ display: "flex", alignItems: "center", gap: "7px" }}
                >
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
                        ariaLabel="Rows per page"
                        value={rowsPerPage}
                        onChange={onRowsPerPageChange}
                        sx={{ width: "auto", minWidth: "84px" }}
                    >
                        {ROWS_PER_PAGE_OPTIONS.map((n) => (
                            <MenuItem key={n} value={n}>
                                {n}
                            </MenuItem>
                        ))}
                    </CcSelect>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <Box
                        component="button"
                        type="button"
                        aria-label="Previous page"
                        disabled={loading || page <= 0}
                        onClick={(event) => onPageChange(event, page - 1)}
                        sx={arrowSx}
                    >
                        <ChevronIcon size={17} strokeWidth={2} />
                    </Box>
                    <Box
                        component="button"
                        type="button"
                        aria-label="Next page"
                        disabled={loading || page >= pageCount - 1}
                        onClick={(event) => onPageChange(event, page + 1)}
                        sx={arrowSx}
                    >
                        <ChevronIcon size={17} strokeWidth={2} flip />
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

/* ==========================================================================
 * Destructive-action confirm (guide §4.7).
 *
 * NOTE: this dialog is NEW. Both bulk deletes used to fire immediately from a
 * bare red icon. §4.7 mandates a dialog; it is nevertheless a real interaction
 * change and is called out in the build report.
 * ========================================================================*/

export const ConfirmDeleteDialog = ({
    open,
    onClose,
    onConfirm,
    title,
    alertTitle,
    alertBody,
    confirmLabel,
    dismissLabel,
}) => (
    <Dialog open={open} onClose={onClose} {...scopeDialogProps(480)}>
        <DialogSurface accent="var(--cc-red)">
            <DialogHeader title={title} onClose={onClose} />
            <DialogBody>
                <AlertBlock title={alertTitle} body={alertBody} />
            </DialogBody>
            <DialogFooter>
                <CcButton variant="danger" onClick={onConfirm}>
                    {confirmLabel}
                </CcButton>
                <Spacer />
                {/* Focus lands on the dismiss button, not the destructive one. */}
                <CcButton autoFocus onClick={onClose}>
                    {dismissLabel}
                </CcButton>
            </DialogFooter>
        </DialogSurface>
    </Dialog>
);
