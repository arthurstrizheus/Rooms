import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import theme from "./Utilites/theme";
import { useEffect, useState } from "react";
import { useAuth } from "./Utilites/AuthContext";
import { ThemeProvider } from "@emotion/react";
import { SnackbarProvider } from "./Utilites/SnackbarContext";
import { Box, Stack, useMediaQuery } from "@mui/material";
import GlobalStyles from "@mui/material/GlobalStyles";
import SideBar from "./Views/Components/SideBar/SideBar";
import Banner from "./Views/Components/Banner/Banner";
import AppRoutes from "./Routes/Routes";
import Drawer from "@mui/material/Drawer";
import { isMobile } from "react-device-detect";
import { SocketProvider } from "./Contexts/SocketContext";
import {
    bp,
    concourseGlobalStyles,
    layout,
    motion as ccMotion,
} from "./Utilites/concourse";

// Concourse side-menu width (ARBITER §14 #8: 240 -> 246, from the token).
const drawerWidth = layout.sideWidth;

// The side menu leaves the flow and becomes an overlay below this width
// (ARBITER §9). Same number MUI's breakpoints.down(980) would emit.
const OVERLAY_QUERY = `(max-width:${bp.rail - 0.05}px)`;

const SHELL_EASE = `${ccMotion.dur.side}ms var(--cc-sp)`;

// The calendar the app lands on: the month grid on a desktop, the week view on
// a phone. ONE copy of that choice — the post-login redirects below and the
// Banner's "Book a room" CTA all route here.
const DEFAULT_CALENDAR_PATH = isMobile
    ? "/schedule/type/week"
    : "/schedule/type/month";

// The three calendar routes (Routes.js). Only these mount the booking dialog.
const isCalendarPath = (pathname) =>
    String(pathname || "").startsWith("/schedule/type");

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function App() {
    const [mode, setMode] = useState("light");
    const [bannerText, setBannerText] = useState("Month Schedule");
    const [loading, setLoading] = useState(false);
    const [update, setUpdate] = useState(0);
    const [selectedDate, setSelectedDate] = useState(new Date());
    // Banner "Book a room" CTA -> Calendar. A counter rather than a boolean so
    // repeat clicks re-open the dialog; the Calendar owns the dialog, App only
    // carries the signal. The Banner renders the CTA only when it is handed an
    // `onBookRoom`, so this is what makes the button exist at all.
    const [bookIntent, setBookIntent] = useState(0);
    const { isAuthenticated, setUser, login, user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [open, setOpen] = useState(
        isMobile ? false : isAuthenticated ? true : false
    );
    const isOverlay = useMediaQuery(OVERLAY_QUERY);
    // Both depend only on `mode`. Memoised so App's other state changes do not
    // rebuild the theme or re-serialise the :root token block every render.
    const appTheme = React.useMemo(() => theme(mode), [mode]);
    const tokenStyles = React.useMemo(() => concourseGlobalStyles(mode), [mode]);

    const handleDrawerOpen = () => setOpen(true);
    const handleDrawerClose = () => setOpen(false);

    const onCalendar = isCalendarPath(location.pathname);

    // The Banner's CTA is app-wide but the booking dialog is the Calendar's, so
    // from anywhere else the click has to take the user there first. The intent
    // survives the navigation in state, and the Calendar consumes it as it
    // mounts — one click, one dialog. On a calendar route we only raise the
    // intent, so the user keeps the view they are on.
    const handleBookRoom = () => {
        setBookIntent((n) => n + 1);
        if (!onCalendar) navigate(DEFAULT_CALENDAR_PATH);
    };

    // An intent only means anything while the Calendar is mounted to consume
    // it. Dropping it on the way out is what keeps a click that has already
    // been served from re-opening the dialog the next time the user walks back
    // onto the calendar — the Calendar remounts there, and its de-dupe ref
    // starts from zero again.
    useEffect(() => {
        if (!onCalendar) setBookIntent(0);
    }, [onCalendar]);

    useEffect(() => {
        delay(120000).then(() => setUpdate((prev) => prev + 1));
    }, [update]);

    useEffect(() => {
        if (
            !isAuthenticated &&
            location.pathname !== "/login" &&
            location.pathname !== "/signup"
        ) {
            const fullPath = location.pathname + location.search;
            localStorage.setItem("lastLocation", fullPath);
            // If approval link with meetingId, persist it early before redirect
            if (location.pathname.startsWith("/approve") && location.search) {
                try {
                    const params = new URLSearchParams(location.search);
                    const mid = params.get("meetingId");
                    if (mid) {
                        localStorage.setItem("approvalMeetingId", mid);
                    }
                } catch {}
            }
            setOpen(false);
            navigate("/login");
        } else if (location.pathname === "") {
            const user = JSON.parse(localStorage.getItem("user"));
            const token = localStorage.getItem("authToken");
            if (user && token) {
                setUser(user);
                login(user, token);
                navigate(DEFAULT_CALENDAR_PATH);
                setOpen(isMobile ? false : true);
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
            setOpen(isMobile ? false : true);
            if (localStorage.getItem("lastLocation") === "/") {
                navigate(DEFAULT_CALENDAR_PATH);
            } else {
                navigate(localStorage.getItem("lastLocation"));
            }
        }
    }, [isAuthenticated, user]);

    return (
        <div
            className="Rooms"
            style={{
                height: "100vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
            }}
        >
            <ThemeProvider theme={appTheme}>
                {/* SEAM 1: emits --cc-* on :root (so portalled dialogs inherit
                    them), the Concourse keyframes, and the global
                    prefers-reduced-motion rule. See ARBITER §2 / §3-I2. */}
                <GlobalStyles styles={tokenStyles} />
                <SnackbarProvider>
                    <SocketProvider>
                        <Box
                            sx={{
                                flexGrow: 1,
                                display: "flex",
                                flexDirection: "column",
                                overflow: "hidden",
                                transition: `margin-left ${SHELL_EASE}`,
                                // Content is only pushed while the menu is
                                // in-flow; as an overlay it floats over it.
                                marginLeft:
                                    open && !isOverlay
                                        ? `${drawerWidth}px`
                                        : 0, // key line
                            }}
                        >
                            {/* Side menu. >=980px it is in-flow (persistent);
                                below that it overlays with a scrim
                                (ARBITER §9). Collapsed is width 0 — there is
                                no icon rail (§13-G2). */}
                            {isAuthenticated && (
                                <Drawer
                                    variant={
                                        isOverlay ? "temporary" : "persistent"
                                    }
                                    anchor="left"
                                    open={open}
                                    onClose={handleDrawerClose}
                                    transitionDuration={{
                                        enter: ccMotion.dur.side,
                                        exit: ccMotion.dur.side,
                                    }}
                                    SlideProps={{
                                        easing: {
                                            enter: ccMotion.spring,
                                            exit: ccMotion.spring,
                                        },
                                    }}
                                    BackdropProps={{
                                        sx: {
                                            backgroundColor: "var(--cc-scrim)",
                                            backdropFilter: "blur(3px)",
                                        },
                                    }}
                                    // keepMounted: in overlay mode the Drawer
                                    // is a Modal, which would otherwise unmount
                                    // SideBar while closed and silence its
                                    // socket-driven approval badge/toasts.
                                    ModalProps={{ keepMounted: true }}
                                    sx={{
                                        // No width on the root in overlay mode:
                                        // there the root IS the modal and must
                                        // stay full-bleed for the scrim.
                                        ...(isOverlay
                                            ? null
                                            : {
                                                  width: drawerWidth,
                                                  flexShrink: 0,
                                              }),
                                        "& .MuiDrawer-paper": {
                                            width: drawerWidth,
                                            boxSizing: "border-box",
                                            display: "flex",
                                            flexDirection: "column", // required to divide header/body
                                            overflow: "hidden", // only the menu body scrolls
                                            backgroundColor: "var(--cc-srf)",
                                            backgroundImage: "none",
                                            color: "var(--cc-ink)",
                                            borderRight:
                                                "1px solid var(--cc-line)",
                                            boxShadow: isOverlay
                                                ? "var(--cc-sh2)"
                                                : "none",
                                        },
                                    }}
                                >
                                    <SideBar
                                        bannerText={bannerText}
                                        onCollapse={handleDrawerClose}
                                    />
                                </Drawer>
                            )}

                            {/* Main Content */}
                            <Box
                                sx={{
                                    flexGrow: 1,
                                    display: "flex",
                                    flexDirection: "column",
                                    overflow: "hidden",
                                }}
                            >
                                {/* Banner (with drawer toggle) */}
                                {isAuthenticated && (
                                    <Banner
                                        bannerText={bannerText}
                                        loading={loading}
                                        selectedDate={selectedDate}
                                        setSelectedDate={setSelectedDate}
                                        onOpenDrawer={handleDrawerOpen}
                                        drawerOpen={open}
                                        onBookRoom={handleBookRoom}
                                    />
                                )}

                                {/* Scrollable route area */}
                                <Box
                                    sx={{
                                        flexGrow: 1,
                                        overflowY: "auto",
                                        overflowX: "auto",
                                    }}
                                >
                                    {isAuthenticated ? (
                                        <Box
                                            sx={{
                                                height: "100%",
                                                flexGrow: 1,
                                                display: "flex",
                                                flexDirection: "column",
                                                minHeight: 0, // REQUIRED
                                                overflow: "auto",
                                            }}
                                        >
                                            <AppRoutes
                                                setLoading={setLoading}
                                                setBannerText={setBannerText}
                                                selectedDate={selectedDate}
                                                setSelectedDate={
                                                    setSelectedDate
                                                }
                                                loading={loading}
                                                bookIntent={bookIntent}
                                            />
                                        </Box>
                                    ) : (
                                        <Stack
                                            direction="column"
                                            height="100%"
                                            width="100%"
                                        >
                                            <AppRoutes
                                                setLoading={setLoading}
                                                setBannerText={setBannerText}
                                                selectedDate={selectedDate}
                                                setSelectedDate={
                                                    setSelectedDate
                                                }
                                                loading={loading}
                                                drawerOpen={open}
                                                setDrawerOpen={setOpen}
                                            />
                                        </Stack>
                                    )}
                                </Box>
                            </Box>
                        </Box>
                    </SocketProvider>
                </SnackbarProvider>
            </ThemeProvider>
        </div>
    );
}

export default App;
