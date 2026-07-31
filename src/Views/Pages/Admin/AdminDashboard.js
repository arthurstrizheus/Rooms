/**
 * Admin Dashboard — Concourse.
 *
 * Visual redesign only. Every handler, fetch, permission gate, payload shape
 * and interval is preserved verbatim from the pre-Concourse implementation:
 *
 *   - the dev gate stays `REACT_APP_DEV_IDS.split(",").includes(`${user?.id}`)`
 *     (hoisted to one const — same predicate, same loose string membership);
 *   - the tab-index contract is unchanged: dev → 0 = Dev Tools, 1 = Admin
 *     Dashboard; non-dev → 0 = Admin Dashboard. Both effects below still branch
 *     on exactly that combination, so the fetch and the poll keep firing;
 *   - the poll stays 300000ms (5 minutes) — the old comment said 30 seconds and
 *     was wrong by 10x; the interval is the truth and is left alone;
 *   - `getLocationName`'s loose `==`, the `parseInt(locationId)` on the
 *     `byLocation` keys (which yields NaN for the literal "unknown" bucket and
 *     falls through to "Unknown Location" — load-bearing), the
 *     "Admin forced logout" default reason and every toast string are untouched.
 *
 * What changed is the surface: MUI Grid/Card/Chip/Badge/Paper/Button are gone
 * (theme.js force-sets `color` on every MUI Button, and a Paper inside a card
 * stacks a second elevation), the page no longer renders its own title (the
 * banner owns it), and the table gained the skeleton / empty / error states it
 * never had.
 */

import { useEffect, useState } from "react";
import { Box, Dialog, Tooltip, useMediaQuery } from "@mui/material";
import { LogoutOutlined as LogoutIcon } from "@mui/icons-material";
import { useAuth } from "../../../Utilites/AuthContext";
import { bp, layout, type as ccType } from "../../../Utilites/concourse";
import {
    AlertBlock,
    CcButton,
    CcTextarea,
    DialogBody,
    DialogFooter,
    DialogHeader,
    DialogSurface,
    Fact,
    Facts,
    Field,
    HOVER,
    Spacer,
    Tag,
    TagRow,
    scopeDialogProps,
} from "../../Components/Concourse/ConcourseDialogKit";
import { btnReset } from "../../Components/Banner/Components/atoms";
import {
    GetLocations,
    RunMatterManagerMonthlyGroupReport,
    showError,
    showSuccess,
} from "../../../Utilites/Functions/ApiFunctions";
import {
    GetConnectedUsers,
    GetConnectionStatus,
    ForceLogoutUser,
} from "../../../Utilites/Functions/ApiFunctions/SocketFunctions";

/* ==========================================================================
 * Static style objects (module scope — nothing here reads props)
 * ========================================================================*/

/** Page chrome uses the round 620; the kit's PHONE (619.95) is dialog-only. */
const SHEET = `@media (max-width:${bp.sheet}px)`;

/**
 * Guide §3.2. `height:100vh` is deliberately NOT here: the route area in
 * App.js is already exactly the leftover viewport and scrolls itself, so the
 * old `100vh` + `p:3` under content-box made this page 48px taller than its
 * own container.
 */
const pageSx = {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    gap: "16px",
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

/** Guide §3.3. */
const cardSx = {
    background: "var(--cc-srf)",
    borderRadius: "26px",
    boxShadow: "var(--cc-sh2)",
    overflow: "hidden",
    boxSizing: "border-box",
    flexShrink: 0,
    animation: "cc-rise 500ms var(--cc-sp) 80ms both",
    [SHEET]: { borderRadius: "22px" },
};

/** Guide §3.4 header strip. */
const headerStripSx = {
    padding: "19px 22px 14px",
    display: "grid",
    gap: "8px",
    flexShrink: 0,
    boxSizing: "border-box",
};

/** Guide §3.5 toolbar. */
const toolbarSx = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    flexShrink: 0,
    padding: "13px 16px 11px",
    borderTop: "1px solid var(--cc-line)",
    boxSizing: "border-box",
};

/* -------------------------------------------------- segmented control ---- */
/* Guide §3.6, verbatim geometry. role="group" + aria-pressed is the shipped
   idiom; there is deliberately no hover state. */

const segTrackSx = {
    display: "flex",
    alignSelf: "flex-start",
    background: "var(--cc-srf2)",
    borderRadius: "99px",
    padding: "3px",
    gap: "2px",
    flexShrink: 0,
    boxSizing: "border-box",
    [SHEET]: { width: "100%", alignSelf: "stretch" },
};

const segBtnSx = {
    ...btnReset,
    borderRadius: "99px",
    padding: "6px 15px",
    fontFamily: "var(--cc-sans)",
    ...ccType.modeToggle,
    color: "var(--cc-mute)",
    boxSizing: "border-box",
    transition: "color 200ms, background 250ms var(--cc-sp)",
    "&[aria-pressed='true']": {
        background: "var(--cc-srf)",
        color: "var(--cc-ink)",
        boxShadow: "var(--cc-sh1)",
    },
    [SHEET]: { flex: 1 },
};

/* ------------------------------------------------------- setting row ----- */
/* Guide §4.8. Used by the Dev Tools card. */

const settingRowSx = {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "14px",
    alignItems: "center",
    padding: "13px 22px",
    borderTop: "1px solid var(--cc-line)",
    boxSizing: "border-box",
    "&:first-of-type": { borderTop: 0 },
    [SHEET]: {
        gridTemplateColumns: "1fr",
        gap: "9px",
        justifyItems: "start",
    },
};

/* ---------------------------------------------------------- stat tiles --- */
/* The guide has no KPI-tile pattern. This is composed rather than invented:
   `Block`'s box (srf2 / radius 18 / 12x14) carrying `HeroTime`'s value type
   (26/700/-.032em tabular) over a `blockLabel`. No icons — the old row
   repeated PersonIcon and AdminIcon twice each and carried nothing the label
   did not. No colour coding — the old primary/secondary/warning/info/success
   mapping was arbitrary and every one of those resolves through palette.*. */

const statGridSx = {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "10px",
    boxSizing: "border-box",
    "@media (max-width:980px)": {
        gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))",
    },
    [SHEET]: { gridTemplateColumns: "repeat(2,1fr)" },
};

const statTileSx = {
    background: "var(--cc-srf2)",
    borderRadius: "18px",
    padding: "12px 14px",
    boxSizing: "border-box",
    display: "grid",
    gap: "2px",
    alignContent: "center",
};

const statValueSx = {
    fontSize: "26px",
    fontWeight: 700,
    letterSpacing: "-.032em",
    fontVariantNumeric: "tabular-nums",
    color: "var(--cc-ink)",
};

const statLabelSx = { ...ccType.blockLabel, color: "var(--cc-mute)" };

/* ------------------------------------------------------------- table ----- */
/* Guide §4.1. Plain elements rather than MUI Table*: no Paper, no elevation
   gradient, no size="small" padding to fight. */

const tableWrapSx = {
    overflowX: "auto",
    overflowY: "auto",
    // The pre-Concourse table had `maxHeight: 500` on its TableContainer.
    // Kept, so scroll ownership does not change and the sticky head is real —
    // the card's own `overflow:hidden` would otherwise stop `position:sticky`
    // resolving against the page scroller.
    maxHeight: "500px",
    // No `overscrollBehavior:"contain"` here. This region is 500px tall inside
    // a page that scrolls, not a modal: containment stops the wheel chaining to
    // the page once the table hits either end, so a pointer resting over the
    // table left the rest of the page unscrollable. Containment is for surfaces
    // that own the whole viewport; this one does not.
    scrollbarWidth: "thin",
    boxSizing: "border-box",
};

const tableSx = {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    boxSizing: "border-box",
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

const tdSx = {
    padding: "11px 14px",
    verticalAlign: "middle",
    fontSize: "13.5px",
    color: "var(--cc-ink)",
    borderBottom: "1px solid var(--cc-line)",
    boxSizing: "border-box",
    // The hover fill is painted on the cells, not the row, so it sits above
    // the row background and the transition has something to run on. Declared
    // on the resting rule so the exit mirrors the entry.
    transition: "background 200ms",
};

const trSx = {
    // No transform on a table row (guide §5.4) — a row shares hairlines with
    // its neighbours and its height is data-driven.
    [HOVER]: { "&:hover > td": { background: "var(--cc-wash)" } },
    "&:last-of-type > td": { borderBottom: 0 },
};

const ellipsisSx = {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "220px",
};

/** Guide §4.1 row-action button. */
const rowActionSx = {
    ...btnReset,
    width: "30px",
    height: "30px",
    borderRadius: "99px",
    boxSizing: "border-box",
    color: "var(--cc-mute)",
    transition: "background 200ms, color 200ms",
    [HOVER]: {
        "&:hover:not(:disabled)": {
            background: "var(--cc-wash)",
            color: "var(--cc-red)",
        },
    },
    "&:disabled": { opacity: 0.4, cursor: "default" },
};

/**
 * The guide does not cover tooltips (§7.3 mentions only "Tooltip with a custom
 * Paper"). Composed from `menuPaperSx`'s own values — srf, backgroundImage
 * none, sh2, 1px line — with the radius stepped 14 → 12 for a smaller object.
 */
const tooltipSlotSx = {
    background: "var(--cc-srf)",
    backgroundImage: "none",
    color: "var(--cc-ink)",
    border: "1px solid var(--cc-line)",
    boxShadow: "var(--cc-sh2)",
    borderRadius: "12px",
    fontFamily: "var(--cc-sans)",
    fontSize: "12.5px",
    padding: "7px 10px",
};

/* ---------------------------------------------------- phone row cards ---- */

const rowCardListSx = {
    display: "grid",
    gap: "8px",
    padding: "0 12px 14px",
    boxSizing: "border-box",
};

const rowCardSx = {
    background: "var(--cc-srf2)",
    borderRadius: "18px",
    padding: "12px 14px",
    display: "grid",
    gap: "6px",
    boxSizing: "border-box",
};

const rowCardPairSx = {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    gap: "14px",
    alignItems: "baseline",
};

/* ---------------------------------------------------------- skeleton ----- */
/* Guide §3.7, copied verbatim from the reference implementation. */

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

/* ------------------------------------------------------ empty / error ---- */

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

/* ---------------------------------------------------------- constants ---- */

/** Header literals, in order. `Actions` is the row-actions cell (§4.1). */
const COLUMNS = [
    { key: "user", label: "User" },
    { key: "role", label: "Role" },
    { key: "location", label: "Location" },
    { key: "connectedTime", label: "Connected Time" },
    { key: "duration", label: "Duration" },
    { key: "socketId", label: "Socket ID" },
    { key: "actions", label: "Actions", align: "right" },
];

/** Widths cycle so the skeleton reads as data, not as a uniform block. */
const SK_WIDTHS = ["70%", "45%", "85%", "55%", "60%", "80%", "40%"];

const SKELETON_ROWS = 8;

/* ==========================================================================
 * Page
 * ========================================================================*/

const AdminDashboard = ({ setLoading }) => {
    const { user } = useAuth();

    /**
     * The dev gate, hoisted. Same expression as before, evaluated on every
     * render exactly as the nine inline copies were — `.split(",")` on the raw
     * env value, string membership on the stringified id.
     */
    const isDev = process.env.REACT_APP_DEV_IDS.split(",").includes(
        `${user?.id}`
    );

    /**
     * Index contract (unchanged):
     *   dev     → 0 = Dev Tools, 1 = Admin Dashboard  (dev lands on 1)
     *   non-dev → 0 = Admin Dashboard (the only section)
     */
    const [tabValue, setTabValue] = useState(isDev ? 1 : 0);
    const [connectedUsers, setConnectedUsers] = useState([]);
    const [connectionStats, setConnectionStats] = useState(null);
    const [locations, setLocations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [logoutDialog, setLogoutDialog] = useState({
        open: false,
        user: null,
    });
    const [logoutReason, setLogoutReason] = useState("");
    /** New — drives the four states (guide §3.7). No behaviour attached. */
    const [hasLoaded, setHasLoaded] = useState(false);
    const [fetchError, setFetchError] = useState(null);

    const isPhone = useMediaQuery(`(max-width:${bp.sheet}px)`);

    const isAdminTab = (tabValue === 1 && isDev) || (tabValue === 0 && !isDev);

    // Get location name by ID
    const getLocationName = (locationId) => {
        if (!locationId) return "Unknown Location";

        const location = locations.find((loc) => loc.officeid == locationId);
        if (location) {
            return (
                location.Alias ||
                location.city ||
                location.City ||
                `Location ${locationId}`
            );
        }

        return `Location ${locationId}`;
    };

    // Fetch locations data
    const fetchLocationData = async () => {
        try {
            const locationsData = await GetLocations();
            setLocations(locationsData || []);
        } catch (error) {
            console.error("Error fetching location data:", error);
        }
    };

    // Fetch connected users
    // Returns whether the fetch actually succeeded, so a caller can tell a
    // real refresh from a failed one. Every state write is unchanged.
    const fetchConnectedUsers = async () => {
        setIsLoading(true);
        let ok = false;
        try {
            const response = await GetConnectedUsers();
            if (response?.success) {
                setConnectedUsers(response.users || []);
                setFetchError(null);
                ok = true;
            } else {
                showError("Failed to fetch connected users");
                setFetchError("Failed to fetch connected users");
            }
        } catch (error) {
            console.error("Error fetching connected users:", error);
            showError("Error fetching connected users");
            setFetchError("Error fetching connected users");
        }
        setHasLoaded(true);
        setIsLoading(false);
        return ok;
    };

    // Fetch connection stats
    const fetchConnectionStats = async () => {
        let ok = false;
        try {
            const response = await GetConnectionStatus();
            if (response?.success) {
                setConnectionStats(response.stats);
                ok = true;
            } else {
                showError("Failed to fetch connection statistics");
            }
        } catch (error) {
            console.error("Error fetching connection stats:", error);
            showError("Error fetching connection statistics");
        }
        return ok;
    };

    // Handle force logout
    const handleForceLogout = async () => {
        if (!logoutDialog.user) return;

        setIsLoading(true);
        try {
            const response = await ForceLogoutUser({
                userId: logoutDialog.user.id,
                reason: logoutReason || "Admin forced logout",
            });

            if (response?.success) {
                showSuccess(
                    `Successfully logged out ${logoutDialog.user.username}`
                );
                fetchConnectedUsers(); // Refresh the list
                // …and the stat tiles, which are built from the same server-side
                // map. Refreshing only the list left "Admins Online", "Office
                // Admins", "Regular Users", "Locations" and the Users-by-Location
                // tags counting the person who had just been disconnected, so
                // the tile row contradicted itself (total ≠ admins + office
                // admins + regular).
                fetchConnectionStats();
            } else {
                showError("Failed to force logout user");
            }
        } catch (error) {
            console.error("Error forcing logout:", error);
            showError("Error during force logout");
        }

        setLogoutDialog({ open: false, user: null });
        setLogoutReason("");
        setIsLoading(false);
    };

    // Format time
    const formatConnectedTime = (connectedAt) => {
        const date = new Date(connectedAt);
        return date.toLocaleString();
    };

    // Get time since connected
    const getTimeSinceConnected = (connectedAt) => {
        const now = new Date();
        const connected = new Date(connectedAt);
        const diff = now - connected;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        return `${minutes}m`;
    };

    // Both requests still go out together; only the toast changed. It used to
    // fire synchronously, before either fetch had resolved, so the "Try again"
    // button in the error block reported "Dashboard refreshed" on top of the
    // failure toast it had just produced. A failed fetch already raises its own
    // error toast, so there is nothing to add on the unhappy path.
    const handleRefresh = async () => {
        const [usersOk, statsOk] = await Promise.all([
            fetchConnectedUsers(),
            fetchConnectionStats(),
        ]);
        if (usersOk && statsOk) {
            showSuccess("Dashboard refreshed");
        }
    };

    const closeLogoutDialog = () => {
        setLogoutDialog({ open: false, user: null });
        setLogoutReason("");
    };

    useEffect(() => {
        // Always fetch location data when component mounts
        fetchLocationData();
    }, []);

    useEffect(() => {
        if ((tabValue === 1 && isDev) || (tabValue === 0 && !isDev)) {
            // Admin Dashboard tab
            fetchConnectedUsers();
            fetchConnectionStats();
        }
    }, [tabValue]);

    // Auto-refresh every 5 minutes when on admin dashboard.
    // (The old comment here said 30 seconds; the interval has always been
    // 300000ms. The interval is the behaviour and is left untouched.)
    useEffect(() => {
        let interval;
        if ((tabValue === 1 && isDev) || (tabValue === 0 && !isDev)) {
            interval = setInterval(() => {
                fetchConnectedUsers();
                fetchConnectionStats();
            }, 300000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [tabValue]);

    /* ---------------------------------------------------- state machine -- */

    const isSkeleton = isLoading || (!hasLoaded && Boolean(user?.id));
    const isErrorState = !isSkeleton && Boolean(fetchError);
    const isEmptyState =
        !isSkeleton && !fetchError && connectedUsers.length === 0;

    const locationEntries =
        connectionStats?.byLocation &&
        Object.keys(connectionStats.byLocation).length > 0
            ? Object.entries(connectionStats.byLocation)
            : null;

    /* ------------------------------------------------------- row pieces -- */

    const logoutTooltip = (connectedUser) =>
        connectedUser.id === user?.id
            ? "Cannot logout yourself"
            : !user?.admin
            ? "Must be an Admin to perform this action"
            : `Force logout ${connectedUser.username}`;

    const isLogoutDisabled = (connectedUser) =>
        connectedUser.id === user?.id || !user?.admin;

    const renderLogoutButton = (connectedUser) => {
        const title = logoutTooltip(connectedUser);
        return (
            <Tooltip
                title={title}
                componentsProps={{ tooltip: { sx: tooltipSlotSx } }}
            >
                {/* The span is required so a disabled control still fires the
                    tooltip — MUI cannot attach listeners to a disabled button. */}
                <span>
                    <Box
                        component="button"
                        type="button"
                        aria-label={title}
                        onClick={() =>
                            setLogoutDialog({
                                open: true,
                                user: connectedUser,
                            })
                        }
                        disabled={isLogoutDisabled(connectedUser)}
                        sx={rowActionSx}
                    >
                        <LogoutIcon sx={{ fontSize: 18 }} />
                    </Box>
                </span>
            </Tooltip>
        );
    };

    /* ---------------------------------------------------------- table ---- */

    const tableHead = (
        <Box component="thead">
            <Box component="tr">
                {COLUMNS.map((column) => (
                    <Box
                        component="th"
                        key={column.key}
                        scope="col"
                        sx={{
                            ...thSx,
                            ...(column.align === "right"
                                ? { textAlign: "right" }
                                : null),
                        }}
                    >
                        {column.label}
                    </Box>
                ))}
            </Box>
        </Box>
    );

    const tableSkeleton = (
        <Box sx={tableWrapSx}>
            <Box component="table" sx={tableSx}>
                {tableHead}
                <Box component="tbody">
                    {Array.from({ length: SKELETON_ROWS }).map((_, rowIndex) => (
                        <Box component="tr" key={rowIndex} sx={trSx}>
                            {COLUMNS.map((column, cellIndex) => (
                                <Box
                                    component="td"
                                    key={column.key}
                                    sx={tdSx}
                                    aria-hidden="true"
                                >
                                    <Sk
                                        sx={{
                                            height: "13px",
                                            width: SK_WIDTHS[
                                                (rowIndex + cellIndex) %
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

    const rowCardSkeleton = (
        <Box sx={rowCardListSx}>
            {Array.from({ length: 5 }).map((_, index) => (
                <Box key={index} sx={rowCardSx} aria-hidden="true">
                    <Sk sx={{ height: "14px", width: "58%" }} />
                    <Sk sx={{ height: "11px", width: "80%" }} />
                    <Sk sx={{ height: "11px", width: "44%" }} />
                </Box>
            ))}
        </Box>
    );

    const dataTable = (
        <Box sx={tableWrapSx}>
            <Box component="table" sx={tableSx}>
                {tableHead}
                <Box component="tbody">
                    {connectedUsers.map((connectedUser) => (
                        <Box
                            component="tr"
                            key={connectedUser.id}
                            sx={trSx}
                        >
                            <Box component="td" sx={tdSx}>
                                <Box
                                    sx={{
                                        ...ccType.cardName,
                                        color: "var(--cc-ink)",
                                        ...ellipsisSx,
                                    }}
                                >
                                    {connectedUser.firstName}{" "}
                                    {connectedUser.lastName}
                                </Box>
                                <Box
                                    sx={{
                                        ...ccType.cardMeta,
                                        color: "var(--cc-mute)",
                                    }}
                                >
                                    @{connectedUser.username}
                                </Box>
                                <Box
                                    sx={{
                                        ...ccType.cardMeta,
                                        color: "var(--cc-mute)",
                                        ...ellipsisSx,
                                    }}
                                >
                                    {connectedUser.email}
                                </Box>
                            </Box>
                            <Box component="td" sx={tdSx}>
                                <Tag
                                    on={Boolean(connectedUser.admin)}
                                    sx={
                                        connectedUser.admin
                                            ? undefined
                                            : { background: "var(--cc-srf2)" }
                                    }
                                >
                                    {connectedUser.admin ? "Admin" : "User"}
                                </Tag>
                            </Box>
                            <Box
                                component="td"
                                sx={{ ...tdSx, ...ccType.factValue }}
                            >
                                {getLocationName(connectedUser.location)}
                            </Box>
                            <Box
                                component="td"
                                sx={{
                                    ...tdSx,
                                    ...ccType.factValueMono,
                                    color: "var(--cc-mute)",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {formatConnectedTime(connectedUser.connectedAt)}
                            </Box>
                            <Box
                                component="td"
                                sx={{
                                    ...tdSx,
                                    ...ccType.factValueMono,
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {getTimeSinceConnected(
                                    connectedUser.connectedAt
                                )}
                            </Box>
                            <Box
                                component="td"
                                sx={{
                                    ...tdSx,
                                    ...ccType.factValueMono,
                                    color: "var(--cc-mute)",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {connectedUser.socketId}
                            </Box>
                            <Box
                                component="td"
                                sx={{
                                    ...tdSx,
                                    textAlign: "right",
                                    width: "1%",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {renderLogoutButton(connectedUser)}
                            </Box>
                        </Box>
                    ))}
                </Box>
            </Box>
        </Box>
    );

    /** ≤620px — every data table becomes a list of row cards (guide §4.1). */
    const dataRowCards = (
        <Box sx={rowCardListSx}>
            {connectedUsers.map((connectedUser) => (
                <Box key={connectedUser.id} sx={rowCardSx}>
                    <Box
                        sx={{ ...ccType.cardName, color: "var(--cc-ink)" }}
                    >
                        {connectedUser.firstName} {connectedUser.lastName}
                    </Box>
                    <Box
                        sx={{
                            ...ccType.cardMeta,
                            color: "var(--cc-mute)",
                            wordBreak: "break-word",
                        }}
                    >
                        @{connectedUser.username} · {connectedUser.email}
                    </Box>
                    <Box sx={rowCardPairSx}>
                        <Box
                            sx={{
                                ...ccType.factKey,
                                color: "var(--cc-mute)",
                                whiteSpace: "nowrap",
                            }}
                        >
                            Role
                        </Box>
                        <Box sx={{ textAlign: "right" }}>
                            <Tag
                                on={Boolean(connectedUser.admin)}
                                sx={
                                    connectedUser.admin
                                        ? undefined
                                        : { background: "var(--cc-srf)" }
                                }
                            >
                                {connectedUser.admin ? "Admin" : "User"}
                            </Tag>
                        </Box>
                    </Box>
                    <Box sx={rowCardPairSx}>
                        <Box
                            sx={{
                                ...ccType.factKey,
                                color: "var(--cc-mute)",
                                whiteSpace: "nowrap",
                            }}
                        >
                            Location
                        </Box>
                        <Box
                            sx={{ ...ccType.factValue, textAlign: "right" }}
                        >
                            {getLocationName(connectedUser.location)}
                        </Box>
                    </Box>
                    <Box sx={rowCardPairSx}>
                        <Box
                            sx={{
                                ...ccType.factKey,
                                color: "var(--cc-mute)",
                                whiteSpace: "nowrap",
                            }}
                        >
                            Connected Time
                        </Box>
                        <Box
                            sx={{
                                ...ccType.factValueMono,
                                textAlign: "right",
                            }}
                        >
                            {formatConnectedTime(connectedUser.connectedAt)}
                        </Box>
                    </Box>
                    <Box sx={rowCardPairSx}>
                        <Box
                            sx={{
                                ...ccType.factKey,
                                color: "var(--cc-mute)",
                                whiteSpace: "nowrap",
                            }}
                        >
                            Duration
                        </Box>
                        <Box
                            sx={{
                                ...ccType.factValueMono,
                                textAlign: "right",
                            }}
                        >
                            {getTimeSinceConnected(connectedUser.connectedAt)}
                        </Box>
                    </Box>
                    <Box sx={rowCardPairSx}>
                        <Box
                            sx={{
                                ...ccType.factKey,
                                color: "var(--cc-mute)",
                                whiteSpace: "nowrap",
                            }}
                        >
                            Socket ID
                        </Box>
                        <Box
                            sx={{
                                ...ccType.factValueMono,
                                textAlign: "right",
                                wordBreak: "break-all",
                            }}
                        >
                            {connectedUser.socketId}
                        </Box>
                    </Box>
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "flex-end",
                            marginTop: "4px",
                        }}
                    >
                        {renderLogoutButton(connectedUser)}
                    </Box>
                </Box>
            ))}
        </Box>
    );

    let tableRegion;
    if (isSkeleton) {
        tableRegion = isPhone ? rowCardSkeleton : tableSkeleton;
    } else if (isErrorState) {
        tableRegion = (
            <StateBlock
                icon="!"
                danger
                title="We couldn't load connected users"
                // The error block REPLACES the table (guide §3.7 / §4.1), so it
                // must not claim the previous rows are still on screen — they
                // are not, and on a first-load failure there was never a
                // successful load to fall back to. Matches the shipped wording
                // on Rooms/Users/MyBookings.
                body="The connection service didn't answer. Nothing was changed, and no one was logged out. Try again in a moment."
                actions={
                    <CcButton variant="primary" onClick={handleRefresh}>
                        Try again
                    </CcButton>
                }
            />
        );
    } else if (isEmptyState) {
        tableRegion = (
            <StateBlock
                icon="👤"
                title="No users currently connected"
                body="Sockets appear here as people sign in. The list refreshes every five minutes."
                actions={
                    <CcButton variant="primary" onClick={handleRefresh}>
                        Refresh
                    </CcButton>
                }
            />
        );
    } else {
        tableRegion = isPhone ? dataRowCards : dataTable;
    }

    /* ============================================================ render == */

    return (
        // --cc-c is the runtime per-item accent and falls back to bright green
        // at :root. Nothing on this page has a per-item accent, so it is pinned
        // to the brand red for any kit component that paints it.
        <Box style={{ "--cc-c": "var(--cc-red)" }} sx={pageSx}>
            {/* Segmented control — dev only. A one-option segmented control is
                noise, and when !isDev tabValue is already 0. */}
            {isDev && (
                <Box role="group" aria-label="Admin sections" sx={segTrackSx}>
                    <Box
                        component="button"
                        type="button"
                        aria-pressed={tabValue === 0}
                        onClick={() => setTabValue(0)}
                        sx={segBtnSx}
                    >
                        Dev Tools
                    </Box>
                    <Box
                        component="button"
                        type="button"
                        aria-pressed={tabValue === 1}
                        onClick={() => setTabValue(1)}
                        sx={segBtnSx}
                    >
                        Admin Dashboard
                    </Box>
                </Box>
            )}

            {/* Dev Tools */}
            {tabValue === 0 && isDev && (
                <Box sx={cardSx}>
                    <Box sx={headerStripSx}>
                        <Box sx={{ ...ccType.dialogTitle }}>Dev Tools</Box>
                    </Box>
                    <Box sx={{ paddingBottom: "6px" }}>
                        <Box sx={settingRowSx}>
                            <Box>
                                <Box sx={{ ...ccType.scopeTitle }}>
                                    Run monthly matter manager group emails
                                </Box>
                            </Box>
                            <CcButton
                                variant="primary"
                                onClick={() =>
                                    RunMatterManagerMonthlyGroupReport()
                                }
                            >
                                Run MM Report
                            </CcButton>
                        </Box>
                        <Box sx={settingRowSx}>
                            <Box>
                                <Box sx={{ ...ccType.scopeTitle }}>
                                    Get All Connected Users
                                </Box>
                            </Box>
                            <CcButton
                                onClick={async () =>
                                    await GetConnectedUsers().then((resp) =>
                                        console.log(resp)
                                    )
                                }
                            >
                                Log Connected Users
                            </CcButton>
                        </Box>
                        <Box sx={settingRowSx}>
                            <Box>
                                <Box sx={{ ...ccType.scopeTitle }}>
                                    Get Socket Status
                                </Box>
                            </Box>
                            <CcButton
                                onClick={async () =>
                                    await GetConnectionStatus().then((resp) =>
                                        console.log(resp)
                                    )
                                }
                            >
                                Log Socket Status
                            </CcButton>
                        </Box>
                    </Box>
                </Box>
            )}

            {/* Admin Dashboard */}
            {isAdminTab && (
                <Box sx={cardSx}>
                    <Box sx={headerStripSx}>
                        <Box sx={{ ...ccType.dialogTitle }}>
                            Connected Users
                        </Box>
                    </Box>

                    {/* Stat tiles + location breakdown. The tile row stays
                        conditional on `connectionStats` exactly as before — no
                        zeros and no placeholders when it is null. */}
                    {(connectionStats || isSkeleton) && (
                        <Box
                            sx={{
                                padding: "0 22px 16px",
                                display: "grid",
                                gap: "13px",
                                boxSizing: "border-box",
                            }}
                        >
                            {/* `hasLoaded` as well as `connectionStats`: the
                                "Total Connected" tile now counts
                                `connectedUsers`, and /stats (no DB work) always
                                answers before /connected-users (one DB read per
                                socket). Rendering on `connectionStats` alone
                                therefore published "Total Connected 0" next to a
                                non-zero "Admins Online" on every load, until the
                                list arrived. The skeleton covers that gap
                                instead; after the first load `hasLoaded` stays
                                true, so a refresh never falls back to it. */}
                            {connectionStats && hasLoaded ? (
                                <Box sx={statGridSx}>
                                    {/* `connectedUsers.length`, not
                                        `connectionStats.total`. They are two
                                        reads of the same server-side map, but
                                        `total` comes from the separate /stats
                                        request, which a force logout never
                                        refetches — so it kept counting the
                                        person who had just been disconnected
                                        while the toolbar and the table below
                                        already showed one fewer. This is the
                                        count the list on this page is actually
                                        built from. */}
                                    <Box sx={statTileSx}>
                                        <Box sx={statValueSx}>
                                            {connectedUsers.length}
                                        </Box>
                                        <Box sx={statLabelSx}>
                                            Total Connected
                                        </Box>
                                    </Box>
                                    <Box sx={statTileSx}>
                                        <Box sx={statValueSx}>
                                            {connectionStats.admins}
                                        </Box>
                                        <Box sx={statLabelSx}>
                                            Admins Online
                                        </Box>
                                    </Box>
                                    <Box sx={statTileSx}>
                                        <Box sx={statValueSx}>
                                            {connectionStats.officeAdmins || 0}
                                        </Box>
                                        <Box sx={statLabelSx}>
                                            Office Admins
                                        </Box>
                                    </Box>
                                    <Box sx={statTileSx}>
                                        <Box sx={statValueSx}>
                                            {connectionStats.regular}
                                        </Box>
                                        <Box sx={statLabelSx}>
                                            Regular Users
                                        </Box>
                                    </Box>
                                    <Box sx={statTileSx}>
                                        <Box sx={statValueSx}>
                                            {
                                                Object.keys(
                                                    connectionStats.byLocation ||
                                                        {}
                                                ).length
                                            }
                                        </Box>
                                        <Box sx={statLabelSx}>Locations</Box>
                                    </Box>
                                </Box>
                            ) : (
                                <Box sx={statGridSx} aria-hidden="true">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Box key={i} sx={statTileSx}>
                                            <Sk
                                                sx={{
                                                    height: "26px",
                                                    width: "52%",
                                                    borderRadius: "99px",
                                                }}
                                            />
                                            <Sk
                                                sx={{
                                                    height: "9px",
                                                    width: "74%",
                                                    marginTop: "5px",
                                                }}
                                            />
                                        </Box>
                                    ))}
                                </Box>
                            )}

                            {locationEntries && (
                                <Box>
                                    <Box
                                        sx={{
                                            ...ccType.blockLabel,
                                            color: "var(--cc-mute)",
                                        }}
                                    >
                                        Users by Location
                                    </Box>
                                    <Box
                                        aria-hidden="true"
                                        sx={{
                                            height: "1px",
                                            background: "var(--cc-line)",
                                            margin: "9px 0",
                                        }}
                                    />
                                    <TagRow sx={{ marginTop: 0 }}>
                                        {locationEntries.map(
                                            ([locationId, count]) => (
                                                <Tag
                                                    key={locationId}
                                                    sx={{
                                                        background:
                                                            "var(--cc-srf2)",
                                                        fontVariantNumeric:
                                                            "tabular-nums",
                                                    }}
                                                >
                                                    {`${getLocationName(
                                                        parseInt(locationId)
                                                    )}: ${count}`}
                                                </Tag>
                                            )
                                        )}
                                    </TagRow>
                                </Box>
                            )}
                        </Box>
                    )}

                    {/* Toolbar */}
                    <Box sx={toolbarSx}>
                        {isSkeleton ? (
                            <Sk sx={{ height: "13px", width: "96px" }} />
                        ) : (
                            <Box
                                sx={{
                                    ...ccType.factKey,
                                    color: "var(--cc-mute)",
                                    display: "inline-flex",
                                    alignItems: "baseline",
                                    gap: "5px",
                                }}
                            >
                                <Box
                                    component="span"
                                    sx={{ ...ccType.factValueMono }}
                                >
                                    {connectedUsers.length}
                                </Box>
                                connected
                            </Box>
                        )}
                        <Box sx={{ flex: 1 }} />
                        <CcButton
                            variant="primary"
                            onClick={handleRefresh}
                            disabled={isLoading}
                            sx={{ [SHEET]: { flex: "1 1 100%" } }}
                        >
                            Refresh
                        </CcButton>
                    </Box>

                    {tableRegion}
                </Box>
            )}

            {/* Force Logout Dialog.

                Width is `layout.dialogWidth.conflict` (530) — the sanctioned
                step up from `scope` (480), because the reason field is a
                3-row textarea and 480 crowds it. Not an invented number.

                scopeDialogProps also brings backgroundImage:"none", the scrim
                + blur, boxSizing on .MuiDialog-container and the ≤620px bottom
                sheet. */}
            <Dialog
                open={logoutDialog.open}
                onClose={() => setLogoutDialog({ open: false, user: null })}
                {...scopeDialogProps(layout.dialogWidth.conflict)}
            >
                <DialogSurface accent="var(--cc-red)">
                    <DialogHeader
                        title="Force Logout User"
                        sub={logoutDialog.user?.username}
                        onClose={closeLogoutDialog}
                    />
                    {logoutDialog.user && (
                        <DialogBody>
                            <AlertBlock
                                title="Warning: Force Logout Action"
                                body={`You are about to force logout ${
                                    logoutDialog.user.username
                                } from ${getLocationName(
                                    logoutDialog.user.location
                                )}. This will immediately disconnect them from the application.`}
                            />
                            <Facts>
                                <Fact label="User">
                                    {`${logoutDialog.user.firstName} ${logoutDialog.user.lastName}`}
                                </Fact>
                                <Fact label="Socket ID" mono>
                                    {logoutDialog.user.socketId}
                                </Fact>
                            </Facts>
                            <Field
                                label="Reason for logout (optional)"
                                htmlFor="logout-reason"
                            >
                                <CcTextarea
                                    id="logout-reason"
                                    rows={3}
                                    placeholder="Enter reason for forcing logout..."
                                    value={logoutReason}
                                    onChange={(e) =>
                                        setLogoutReason(e.target.value)
                                    }
                                />
                            </Field>
                        </DialogBody>
                    )}
                    <DialogFooter>
                        <CcButton
                            variant="danger"
                            onClick={handleForceLogout}
                            disabled={isLoading}
                        >
                            Force Logout
                        </CcButton>
                        <Spacer />
                        <CcButton onClick={closeLogoutDialog} autoFocus>
                            Cancel
                        </CcButton>
                    </DialogFooter>
                </DialogSurface>
            </Dialog>
        </Box>
    );
};

export default AdminDashboard;
