import { useState, useEffect } from "react";
import { Box, Checkbox, Dialog, MenuItem, useMediaQuery } from "@mui/material";
import AddNewType from "./Components/AddNewType";
import ColorChip from "./Components/ColorChip";
import {
  GetTypes,
  showError,
  showSuccess,
  showWarning,
} from "../../../Utilites/Functions/ApiFunctions";
import {
  snackbarMark,
  snackbarSpokeSince,
} from "../../../Utilites/SnackbarContext";
import { DeleteMeetingType } from "../../../Utilites/Functions/ApiFunctions/MeetingTypeFunctions";
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
  focusRing,
  scopeDialogProps,
} from "../../Components/Concourse/ConcourseDialogKit";
import {
  ChevronIcon,
  btnReset,
  hover,
} from "../../Components/Banner/Components/atoms";
import { bp, type as ccType } from "../../../Utilites/concourse";

/* ==========================================================================
 * Page chrome (Concourse page-adoption guide §3.2 / §3.3 / §3.5)
 * ========================================================================*/

const MQ_PHONE = `@media (max-width:${bp.sheet}px)`;

const pageSx = {
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  overflowY: "auto",
  overflowX: "hidden",
  scrollbarWidth: "thin",
  // The app mounts no CssBaseline outside Login/Signup, so box-sizing is the
  // initial `content-box`. Every sized box on this page restates it.
  boxSizing: "border-box",
  background: "var(--cc-grd)",
  color: "var(--cc-ink)",
  fontFamily: "var(--cc-sans)",
  fontSize: "15px",
  lineHeight: 1.5,
  padding: "clamp(14px,2.4vw,22px) clamp(12px,2.6vw,24px) clamp(14px,2.4vw,22px)",
};

// The fill-height card variant: the table scrolls inside the card, exactly as
// the TableContainer did before, so the card claims the page's height.
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
  [MQ_PHONE]: { borderRadius: "22px" },
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

/* ==========================================================================
 * Table primitives (guide §4.1)
 * ========================================================================*/

const tableWrapSx = {
  overflowX: "auto",
  overflowY: "auto",
  flex: 1,
  minHeight: 0,
  scrollbarWidth: "thin",
  boxSizing: "border-box",
};

const tableSx = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  boxSizing: "border-box",
  minWidth: "520px",
  "& tbody tr:last-of-type td, & tbody tr:last-of-type th": { borderBottom: 0 },
};

const thSx = {
  position: "sticky",
  top: 0,
  // In-page stacking stays <= 5; the shell owns 6/20/24/25/26.
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

const thCheckSx = { ...thSx, width: "44px", padding: "11px 0 11px 14px" };

const tdSx = {
  padding: "11px 14px",
  verticalAlign: "middle",
  fontSize: "13.5px",
  color: "var(--cc-ink)",
  borderBottom: "1px solid var(--cc-line)",
  boxSizing: "border-box",
};

const tdCheckSx = { ...tdSx, width: "44px", padding: "11px 0 11px 14px" };

// A row shares its hairlines with its neighbours and its height is data-driven,
// so it never transforms — background only (guide §5.4).
const rowSx = (isSel) => ({
  transition: "background 200ms",
  background: isSel ? "var(--cc-wash)" : "transparent",
  [HOVER]: { "&:hover": { background: "var(--cc-wash)" } },
  ...(isSel
    ? { "& > td:first-of-type": { boxShadow: "inset 3px 0 0 var(--cc-red)" } }
    : null),
});

const checkboxSx = {
  color: "var(--cc-mute)",
  padding: "4px",
  "&.Mui-checked": { color: "var(--cc-red)" },
  "&.MuiCheckbox-indeterminate": { color: "var(--cc-red)" },
  "&.Mui-focusVisible": focusRing,
  [HOVER]: { "&:hover": { background: "var(--cc-wash)" } },
};

const sortBtnSx = (active) => ({
  ...btnReset,
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  font: "inherit",
  color: active ? "var(--cc-ink)" : "inherit",
  transition: "color 200ms",
  ...hover({ color: "var(--cc-ink)" }),
});

const SortButton = ({ active, direction, onClick, children }) => (
  <Box component="button" type="button" onClick={onClick} sx={sortBtnSx(active)}>
    {children}
    {active ? (
      <Box
        aria-hidden="true"
        component="span"
        sx={{
          fontSize: "9px",
          lineHeight: 1,
          color: "var(--cc-red)",
          transition: "transform 320ms var(--cc-sp)",
          transform: direction === "desc" ? "rotate(180deg)" : "none",
        }}
      >
        ▲
      </Box>
    ) : null}
  </Box>
);

const ariaSort = (orderBy, order, key) =>
  orderBy === key ? (order === "desc" ? "descending" : "ascending") : "none";

/* ==========================================================================
 * Data states (guide §3.7). This page had none of them.
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

// Widths cycle so the skeleton reads as data rather than a uniform block.
const SK_NAME_WIDTHS = ["70%", "45%", "85%", "55%", "60%"];

/* ==========================================================================
 * Pagination (guide §4.5)
 * ========================================================================*/

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
  display: "flex",
  alignItems: "baseline",
  gap: "5px",
  [MQ_PHONE]: { width: "100%", order: 9 },
};

const navSx = {
  display: "flex",
  alignItems: "center",
  gap: "5px",
  flexWrap: "wrap",
  marginLeft: "auto",
  boxSizing: "border-box",
  [MQ_PHONE]: { marginLeft: 0, width: "100%", justifyContent: "space-between" },
};

// The banner's own arrow recipe (DateSelector.js:52-60), with one deliberate
// substitution: the banner hovers to `srf` because its arrows sit on a `srf2`
// pill track, whereas this pagination strip's ground IS `srf`. `srf3` is the
// token documented for icon-button hover (concourse.js §2). Reconciled by the
// integrator so every page's pager arrow lights up the same way.
const arrowSx = {
  ...btnReset,
  width: "30px",
  height: "30px",
  borderRadius: "99px",
  boxSizing: "border-box",
  color: "var(--cc-mute)",
  transition: "background 200ms, color 200ms, transform 260ms var(--cc-sp)",
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
  boxSizing: "border-box",
  borderRadius: "99px",
  ...ccType.pickerDay,
  background: current ? "var(--cc-red)" : "var(--cc-srf2)",
  color: current ? "var(--cc-on-red)" : "var(--cc-ink)",
  boxShadow: current ? "var(--cc-glow-pill)" : "none",
  transition: "background 200ms, color 200ms, transform 280ms var(--cc-sp)",
  ...(current
    ? null
    : hover({ background: "var(--cc-wash)", transform: "translateY(-2px)" })),
});

/** first / last / current +- 1, with ellipses. Indices are zero-based pages. */
const buildPageItems = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const items = [0];
  const start = Math.max(1, current - 1);
  const end = Math.min(total - 2, current + 1);
  if (start > 1) items.push("gap-start");
  for (let i = start; i <= end; i += 1) items.push(i);
  if (end < total - 2) items.push("gap-end");
  items.push(total - 1);
  return items;
};

/* ==========================================================================
 * Sort / paginate pipeline — unchanged from the previous implementation.
 * ========================================================================*/

function createData(id, value, color) {
  return { id, value, color };
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

export default function MeetingTypes({ setLoading, loading }) {
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("name");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selected, setSelected] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [types, setTypes] = useState([]);
  const [paginatedRows, setPaginatedRows] = useState([]);
  const [update, setUpdate] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Snapshot of what the confirm dialog is about, taken when it opens. The
  // delete clears `selected` in the same batch that closes the dialog, so
  // reading `selected` live would repaint the header as "Delete 0 meeting
  // types?" with an empty Facts list for the length of MUI's closing Fade.
  const [confirmTypes, setConfirmTypes] = useState([]);

  const isPhone = useMediaQuery(`(max-width:${bp.sheet}px)`);

  // Unified with the other five bulk pages: total success -> success, partial
  // -> warning naming the counts, total failure -> an error that always
  // appears.
  //
  // `Promise.all` resolves to a truthy array even when every delete failed, and
  // the old `.map` over all types put `null` in every unselected slot, so the
  // outcome could not be read from it. Filtering to the targets first makes
  // `results` line up 1:1 with what was attempted.
  //
  // `DeleteMeetingType` raises "Type deleted" per item and the server's own
  // wording on a refusal it explains; the snackbar holds one message at a time
  // so the aggregate lands last. A total failure must not overwrite the
  // server's explanation with generic text, but must not stay silent when
  // nothing was said at all (a dropped connection makes
  // `handleApiResponseError` throw and the helper's `catch` swallow it) —
  // `snackbarSpokeSince` distinguishes the two.
  //
  // `setDeleting(false)` / `setConfirmOpen(false)` run on EVERY path, failure
  // included: they are the confirm dialog's pending affordance, and skipping
  // them on failure would strand it reading "Deleting…" forever.
  const handleDeleteSelected = () => {
    const remove = async () => {
      const targets = (types ?? []).filter((itm) => isSelected(itm.id));
      if (targets.length === 0) {
        setDeleting(false);
        setConfirmOpen(false);
        return;
      }
      const mark = snackbarMark();
      const results = await Promise.all(
        targets.map((itm) => DeleteMeetingType(itm.id))
      );
      const deleted = results.filter(Boolean).length;
      setDeleting(false);
      setConfirmOpen(false);
      if (deleted === targets.length) {
        showSuccess(`Type${targets.length > 1 ? "s" : ""} Deleted`);
      } else if (deleted > 0) {
        showWarning(`Deleted ${deleted} of ${targets.length} types`);
      } else {
        if (!snackbarSpokeSince(mark)) {
          showError(`Failed to delete type${targets.length > 1 ? "s" : ""}`);
        }
        // Nothing changed — leave the table and the selection alone.
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
      const newSelecteds = types?.map((n) => n.id);
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

  useEffect(() => {
    const getData = async () => {
      setLoading(true);
      const typs = await GetTypes();

      setTypes(typs);
      setLoading(false);
      // `!hasLoaded` is what stops the empty state flashing on first paint.
      setHasLoaded(true);
    };
    getData();
  }, [update]);

  useEffect(() => {
    if (types?.length) {
      const data = types?.map((itm) => {
        return createData(itm.id, itm.value, itm.color);
      });

      const sortedRows = stableSort(data, getComparator(order, orderBy));
      setPaginatedRows(
        sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
      );
    } else {
      setPaginatedRows([]);
    }
  }, [types, update, page, rowsPerPage, orderBy, order]);

  /* --------------------------------------------------------------- states --
   * Three of the four. There is deliberately no error state: GetTypes
   * (ApiFunctions.js:370-388) swallows every failure and returns `[]`, so a
   * dead network and an empty table are byte-identical at the call site.
   * Inferring an error from `[]` would put "we couldn't load meeting types" in
   * front of a brand-new deployment that simply has none yet. The failure is
   * not silent — GetTypes fires the shared error snackbar. Escalated to the
   * integrator; not faked here.
   * ----------------------------------------------------------------------*/
  const isSkeleton = loading || !hasLoaded;
  const isEmptyState = !isSkeleton && types.length === 0;

  const selectedTypes = (types ?? []).filter((t) => isSelected(t.id));
  const pageCount = Math.max(1, Math.ceil(types.length / rowsPerPage));
  const rangeFrom = types.length === 0 ? 0 : page * rowsPerPage + 1;
  const rangeTo = Math.min((page + 1) * rowsPerPage, types.length);
  const allChecked = types.length > 0 && selected.length === types.length;
  const someChecked = selected.length > 0 && selected.length < types.length;

  // Escape and the backdrop stay live while the delete is in flight — the
  // disabled footer buttons are the pending affordance, not a trapped dialog.
  const closeConfirm = () => setConfirmOpen(false);

  const openConfirm = () => {
    setConfirmTypes(selectedTypes);
    setConfirmOpen(true);
  };

  const confirmDelete = () => {
    setDeleting(true);
    handleDeleteSelected();
  };

  const renderSelectAll = (label) => (
    <Checkbox
      indeterminate={someChecked}
      checked={allChecked}
      onChange={handleSelectAllClick}
      sx={checkboxSx}
      inputProps={{ "aria-label": label }}
    />
  );

  const renderRowCheckbox = (row) => (
    <Checkbox
      onClick={(event) => handleClick(event, row.id)}
      checked={isSelected(row.id)}
      sx={checkboxSx}
      inputProps={{ "aria-label": `Select ${row.value}` }}
    />
  );

  return (
    <Box sx={pageSx}>
      <AddNewType
        open={openDialog}
        setOpen={setOpenDialog}
        setUpdate={setUpdate}
      />

      <Box sx={cardSx}>
        {/* ---------------------------------------------------- toolbar --- */}
        <Box sx={toolbarSx}>
          {selected.length > 0 ? (
            <Box
              sx={{
                ...ccType.factKey,
                color: "var(--cc-mute)",
                display: "flex",
                alignItems: "baseline",
                gap: "5px",
              }}
            >
              <Box
                component="span"
                sx={{ ...ccType.factValueMono, color: "var(--cc-ink)" }}
              >
                {selected.length}
              </Box>
              selected
            </Box>
          ) : null}
          <Box sx={{ flex: 1 }} />
          {selected.length > 0 ? (
            <CcButton
              variant="danger"
              onClick={openConfirm}
              sx={{ [MQ_PHONE]: { flex: "1 1 100%" } }}
            >
              Delete selected
            </CcButton>
          ) : null}
          <CcButton
            variant="primary"
            onClick={() => setOpenDialog(true)}
            sx={{ [MQ_PHONE]: { flex: "1 1 100%" } }}
          >
            Add type
          </CcButton>
        </Box>

        {/* ------------------------------------------------------ body ---- */}
        {isSkeleton ? (
          isPhone ? (
            <Box
              sx={{
                display: "grid",
                gap: "8px",
                padding: "0 12px 14px",
                boxSizing: "border-box",
              }}
            >
              {Array.from({ length: 6 }, (_, i) => (
                <Box
                  key={i}
                  sx={{
                    background: "var(--cc-srf2)",
                    borderRadius: "18px",
                    padding: "12px 14px",
                    display: "grid",
                    gap: "10px",
                    boxSizing: "border-box",
                  }}
                >
                  <Sk
                    sx={{
                      height: "14px",
                      width: SK_NAME_WIDTHS[i % SK_NAME_WIDTHS.length],
                    }}
                  />
                  <Sk
                    sx={{
                      height: "28px",
                      width: "128px",
                      borderRadius: "11px",
                      justifySelf: "end",
                    }}
                  />
                </Box>
              ))}
            </Box>
          ) : (
            <Box sx={tableWrapSx}>
              <Box component="table" sx={tableSx}>
                <Box component="thead">
                  <Box component="tr">
                    <Box component="th" scope="col" sx={thCheckSx}>
                      {renderSelectAll("select all meeting types")}
                    </Box>
                    <Box component="th" scope="col" sx={thSx}>
                      Type
                    </Box>
                    <Box component="th" scope="col" sx={thSx}>
                      Color
                    </Box>
                  </Box>
                </Box>
                <Box component="tbody">
                  {Array.from({ length: 8 }, (_, i) => (
                    <Box component="tr" key={i}>
                      <Box component="td" sx={tdCheckSx}>
                        <Sk
                          sx={{
                            width: "20px",
                            height: "20px",
                            borderRadius: "6px",
                            margin: "6px 0",
                          }}
                        />
                      </Box>
                      <Box component="td" sx={tdSx}>
                        <Sk
                          sx={{
                            height: "13px",
                            width: SK_NAME_WIDTHS[i % SK_NAME_WIDTHS.length],
                            maxWidth: "320px",
                          }}
                        />
                      </Box>
                      <Box component="td" sx={tdSx}>
                        <Sk
                          sx={{
                            width: "128px",
                            height: "28px",
                            borderRadius: "11px",
                          }}
                        />
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          )
        ) : isEmptyState ? (
          <StateBlock
            icon="🏷"
            title="No meeting types yet"
            body="Meeting types color the event chips on the calendar. Add one to start."
            actions={
              <CcButton variant="primary" onClick={() => setOpenDialog(true)}>
                Add type
              </CcButton>
            }
          />
        ) : isPhone ? (
          /* ------------------------------------ <=620px: row-cards ------ */
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              scrollbarWidth: "thin",
              boxSizing: "border-box",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "0 12px 8px",
                boxSizing: "border-box",
              }}
            >
              {renderSelectAll("select all meeting types")}
              <Box sx={{ ...ccType.factKey, color: "var(--cc-mute)" }}>
                Select all
              </Box>
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
                    sx={{
                      background: "var(--cc-srf2)",
                      borderRadius: "18px",
                      padding: "12px 14px",
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: "6px",
                      boxSizing: "border-box",
                      overflow: "hidden",
                      transition: "background 200ms",
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
                        gridColumn: 1,
                        gridRow: 1,
                        ...ccType.cardName,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.value}
                    </Box>
                    <Box
                      sx={{
                        gridColumn: 2,
                        gridRow: "1 / span 2",
                        alignSelf: "start",
                        justifySelf: "end",
                      }}
                    >
                      {renderRowCheckbox(row)}
                    </Box>
                    <Box
                      sx={{
                        gridColumn: 1,
                        gridRow: 2,
                        display: "grid",
                        gridTemplateColumns: "auto 1fr",
                        gap: "14px",
                        alignItems: "center",
                        minWidth: 0,
                      }}
                    >
                      <Box
                        sx={{
                          ...ccType.factKey,
                          color: "var(--cc-mute)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Color
                      </Box>
                      <ColorChip
                        color={row.color}
                        sx={{ justifySelf: "end", maxWidth: "100%" }}
                      />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        ) : (
          /* ------------------------------------------------- the table --- */
          <Box sx={tableWrapSx}>
            <Box component="table" sx={tableSx}>
              <Box component="thead">
                <Box component="tr">
                  <Box component="th" scope="col" sx={thCheckSx}>
                    {renderSelectAll("select all meeting types")}
                  </Box>
                  <Box
                    component="th"
                    scope="col"
                    sx={thSx}
                    aria-sort={ariaSort(orderBy, order, "value")}
                  >
                    <SortButton
                      active={orderBy === "value"}
                      direction={orderBy === "value" ? order : "asc"}
                      onClick={(event) => handleRequestSort(event, "value")}
                    >
                      Type
                    </SortButton>
                  </Box>
                  <Box
                    component="th"
                    scope="col"
                    sx={thSx}
                    aria-sort={ariaSort(orderBy, order, "color")}
                  >
                    <SortButton
                      active={orderBy === "color"}
                      direction={orderBy === "color" ? order : "asc"}
                      onClick={(event) => handleRequestSort(event, "color")}
                    >
                      Color
                    </SortButton>
                  </Box>
                </Box>
              </Box>
              <Box component="tbody">
                {paginatedRows?.map((row) => {
                  const isItemSelected = isSelected(row.id);
                  return (
                    <Box component="tr" key={row.id} sx={rowSx(isItemSelected)}>
                      <Box component="td" sx={tdCheckSx}>
                        {renderRowCheckbox(row)}
                      </Box>
                      {/* The name is the row's header — MUI's TableCell used
                          to emit `th scope="row"` here, so keep the semantic. */}
                      <Box
                        component="th"
                        scope="row"
                        sx={{
                          ...tdSx,
                          ...ccType.cardName,
                          textAlign: "left",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: "320px",
                        }}
                      >
                        {row.value}
                      </Box>
                      <Box component="td" sx={tdSx}>
                        <ColorChip color={row.color} sx={{ width: "128px" }} />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>
        )}

        {/* ------------------------------------------------ pagination ---- */}
        {isEmptyState ? null : (
          <Box sx={footerSx}>
            <Box sx={counterSx}>
              {isSkeleton ? (
                // Before the first fetch resolves `types.length` is 0, and
                // "Showing 0–0 of 0" would assert a total the page does not
                // have yet. A bar says "not known yet" honestly.
                <Sk sx={{ width: "116px", height: "12px" }} />
              ) : (
                <>
                  Showing
                  <Box component="span" sx={{ ...ccType.factValueMono }}>
                    {rangeFrom}–{rangeTo}
                  </Box>
                  of
                  <Box component="span" sx={{ ...ccType.factValueMono }}>
                    {types.length}
                  </Box>
                </>
              )}
            </Box>

            <Box component="nav" aria-label="Pagination" sx={navSx}>
              <Box
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
                disabled={isSkeleton || page <= 0}
                onClick={(event) => handleChangePage(event, page - 1)}
                sx={arrowSx}
              >
                <ChevronIcon size={17} strokeWidth={2} />
              </Box>

              {buildPageItems(page, pageCount).map((item) =>
                typeof item === "number" ? (
                  <Box
                    key={item}
                    component="button"
                    type="button"
                    aria-label={`Page ${item + 1}`}
                    aria-current={item === page ? "page" : undefined}
                    disabled={isSkeleton}
                    onClick={(event) => handleChangePage(event, item)}
                    sx={pagePillSx(item === page)}
                  >
                    {item + 1}
                  </Box>
                ) : (
                  <Box
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
                disabled={isSkeleton || page >= pageCount - 1}
                onClick={(event) => handleChangePage(event, page + 1)}
                sx={arrowSx}
              >
                <ChevronIcon size={17} strokeWidth={2} flip />
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      {/* ------------------------------------------- delete confirmation --- */}
      <Dialog
        open={confirmOpen}
        onClose={closeConfirm}
        {...scopeDialogProps(480)}
      >
        <DialogSurface accent="var(--cc-red)">
          <DialogHeader
            title={
              confirmTypes.length === 1
                ? "Delete this meeting type?"
                : `Delete ${confirmTypes.length} meeting types?`
            }
            sub={confirmTypes.length === 1 ? confirmTypes[0]?.value : undefined}
            onClose={closeConfirm}
          />
          <DialogBody>
            <AlertBlock
              title="This cannot be undone"
              body="Meetings already booked with this type keep their record, but they lose its color on the calendar."
            />
            <Facts>
              {confirmTypes.map((t) => (
                <Fact key={t.id} label="Type">
                  {t.value}
                </Fact>
              ))}
            </Facts>
          </DialogBody>
          <DialogFooter>
            <CcButton
              variant="danger"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting
                ? "Deleting…"
                : confirmTypes.length === 1
                ? "Delete type"
                : "Delete types"}
            </CcButton>
            <Spacer />
            <CcButton onClick={closeConfirm} disabled={deleting} autoFocus>
              Keep them
            </CcButton>
          </DialogFooter>
        </DialogSurface>
      </Dialog>
    </Box>
  );
}
