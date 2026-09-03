import * as React from "react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { Box, Drawer, CssBaseline } from "@mui/material";

import theme from "./Utilites/theme";
import { useAuth } from "./Utilites/AuthContext";
import { SnackbarProvider } from "./Utilites/SnackbarContext";
import { SocketProvider } from "./Contexts/SocketContext";
import AppRoutes from "./Routes/Routes";

import NavSidebar, { NAV_WIDTH } from "./Views/Components/Shell/NavSidebar";
import TopBar from "./Views/Components/Shell/TopBar";
import BottomNav, {
    BOTTOM_NAV_HEIGHT,
} from "./Views/Components/Shell/BottomNav";
import useApprovalCount from "./Views/Components/Shell/useApprovalCount";
import { titleForPath } from "./Views/Components/Shell/navConfig";
import useResponsive from "./hooks/useResponsive";

/**
 * App shell.
 *
 * Layout is viewport-driven, not user-agent driven:
 *   >= md   permanent sidebar, collapsible, content inset by NAV_WIDTH
 *   <  md   sidebar becomes an overlay drawer; primary destinations move to a
 *           fixed bottom bar, and the content area reserves room for it
 *
 * The sidebar, bottom bar and top bar all read from Shell/navConfig, so adding
 * a page means touching one list plus Routes.js.
 */

function AppShell() {
    const { isCompact } = useResponsive();
    const { isAuthenticated, setUser, login, user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [sidebarOpen, setSidebarOpen] = useState(!isCompact);
    const { approvalCount } = useApprovalCount();

    const title = titleForPath(location.pathname);

    // Collapse the sidebar when the viewport narrows; restore it when it widens.
    useEffect(() => {
        setSidebarOpen(!isCompact);
    }, [isCompact]);

    // Close the overlay drawer after navigating on a small screen.
    useEffect(() => {
        if (isCompact) setSidebarOpen(false);
    }, [location.pathname, isCompact]);

    // ---- Session restore / auth redirect (behavior preserved) -------------
    useEffect(() => {
        if (
            !isAuthenticated &&
            location.pathname !== "/login" &&
            location.pathname !== "/signup"
        ) {
            const fullPath = location.pathname + location.search;
            localStorage.setItem("lastLocation", fullPath);
            // Persist the meeting id before redirecting, so an emailed approval
            // link still resolves after the user signs in.
            if (location.pathname.startsWith("/approve") && location.search) {
                try {
                    const mid = new URLSearchParams(location.search).get(
                        "meetingId",
                    );
                    if (mid) localStorage.setItem("approvalMeetingId", mid);
                } catch {}
            }
            navigate("/login");
        } else if (location.pathname === "") {
            const storedUser = JSON.parse(localStorage.getItem("user"));
            const token = localStorage.getItem("authToken");
            if (storedUser && token) {
                setUser(storedUser);
                login(storedUser, token);
                navigate("/equipment");
            }
        }

        const storedUser = localStorage.getItem("user");
        const storedToken = localStorage.getItem("authToken");
        if (
            (JSON.parse(storedUser)?.id && !user && storedToken) ||
            (JSON.parse(storedUser)?.id === user?.id &&
                !isAuthenticated &&
                user?.id !== null &&
                user?.id !== undefined &&
                storedToken)
        ) {
            const userData = JSON.parse(storedUser);
            setUser(userData);
            login(userData, storedToken);
            const last = localStorage.getItem("lastLocation");
            navigate(!last || last === "/" ? "/equipment" : last);
        }
        // Deliberately keyed to auth state only. Adding `location` would re-run
        // the restore on every navigation and fight the router.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, user]);

    const routes = (
        <AppRoutes
            setLoading={setLoading}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            loading={loading}
            drawerOpen={sidebarOpen}
            setDrawerOpen={setSidebarOpen}
        />
    );

    // ---- Signed out: routes render full-bleed, no chrome -------------------
    if (!isAuthenticated) {
        return (
            <Box
                sx={{
                    minHeight: "100dvh",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {routes}
            </Box>
        );
    }

    const sidebar = (
        <NavSidebar
            approvalCount={approvalCount}
            onNavigate={() => isCompact && setSidebarOpen(false)}
            onCollapse={() => setSidebarOpen(false)}
            showCollapse={!isCompact}
        />
    );

    return (
        <Box
            sx={{
                height: "100dvh",
                display: "flex",
                bgcolor: "background.default",
                overflow: "hidden",
            }}
        >
            {/* ---- Navigation ---- */}
            {isCompact ? (
                <Drawer
                    variant="temporary"
                    open={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        "& .MuiDrawer-paper": {
                            width: NAV_WIDTH,
                            boxSizing: "border-box",
                            borderRight: "none",
                            overflowX: "hidden",
                            boxShadow: (t) => t.shadowTokens.xl,
                        },
                    }}
                >
                    {sidebar}
                </Drawer>
            ) : (
                <Drawer
                    variant="persistent"
                    open={sidebarOpen}
                    sx={{
                        width: sidebarOpen ? NAV_WIDTH : 0,
                        flexShrink: 0,
                        transition: (t) =>
                            t.transitions.create("width", {
                                easing: t.transitions.easing.easeOut,
                                duration: t.transitions.duration.standard,
                            }),
                        "& .MuiDrawer-paper": {
                            width: NAV_WIDTH,
                            boxSizing: "border-box",
                            overflowX: "hidden",
                        },
                    }}
                >
                    {sidebar}
                </Drawer>
            )}

            {/* ---- Content column ---- */}
            <Box
                sx={{
                    flexGrow: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }}
            >
                <TopBar
                    title={title}
                    loading={loading}
                    showMenuButton={isCompact || !sidebarOpen}
                    onOpenMenu={() => setSidebarOpen(true)}
                />

                {/* The window never scrolls. Pages get exactly the height left
                    over here and scroll their own body, so page headers,
                    filters and action bars stay fixed. See PageContainer. */}
                <Box
                    component="div"
                    sx={{
                        flexGrow: 1,
                        minHeight: 0,
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        // Clear the fixed bottom bar on small screens.
                        pb: isCompact ? `${BOTTOM_NAV_HEIGHT}px` : 0,
                    }}
                >
                    {/* Keying on pathname replays the entrance animation on
                        every route change, so navigation always has motion. */}
                    <Box
                        key={location.pathname}
                        sx={{
                            flexGrow: 1,
                            minHeight: 0,
                            display: "flex",
                            flexDirection: "column",
                            overflow: "hidden",
                            animation:
                                "seaRiseIn 320ms cubic-bezier(0.22, 1, 0.36, 1) both",
                        }}
                    >
                        {routes}
                    </Box>
                </Box>
            </Box>

            {isCompact && <BottomNav approvalCount={approvalCount} />}
        </Box>
    );
}

/**
 * Embed routes (calendar iframes) render with no chrome at all — they're
 * dropped into other sites, so a sidebar and top bar would be wrong.
 */
function EmbedShell() {
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());

    return (
        <AppRoutes
            setLoading={setLoading}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            loading={loading}
            drawerOpen={false}
            setDrawerOpen={() => {}}
        />
    );
}

export default function App() {
    const location = useLocation();
    const isEmbedRoute = location.pathname.includes("/embed");

    // Building the theme is not cheap; it must not happen on every render.
    const appTheme = React.useMemo(() => theme("light"), []);

    return (
        <ThemeProvider theme={appTheme}>
            <CssBaseline />
            <SnackbarProvider>
                {isEmbedRoute ? (
                    <EmbedShell />
                ) : (
                    <SocketProvider>
                        <AppShell />
                    </SocketProvider>
                )}
            </SnackbarProvider>
        </ThemeProvider>
    );
}
