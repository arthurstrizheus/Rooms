import { useTheme } from "@mui/material/styles";
import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, useMediaQuery } from "@mui/material";
import MeetingRoomOutlinedIcon from "@mui/icons-material/MeetingRoomOutlined";
import DateRangeIcon from "@mui/icons-material/DateRangeOutlined";
import TodayIcon from "@mui/icons-material/TodayOutlined";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonthOutlined";
import ViewStreamIcon from "@mui/icons-material/ViewStreamOutlined";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheckOutlined";
import AccountBoxOutlinedIcon from "@mui/icons-material/AccountBoxOutlined";
import AllInboxOutlinedIcon from "@mui/icons-material/AllInboxOutlined";
import EditCalendarOutlinedIcon from "@mui/icons-material/EditCalendarOutlined";
import FormatColorFillOutlinedIcon from "@mui/icons-material/FormatColorFillOutlined";
import CorporateFareIcon from "@mui/icons-material/CorporateFareOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import DeveloperModeIcon from "@mui/icons-material/DeveloperMode";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { isMobile } from "react-device-detect";
import "./SideBar.css";
import logo from "../../../Assets/Images/sea-logo.png";
import { useAuth } from "../../../Utilites/AuthContext";
import {
    GetMeetingApprovals,
    showSuccess,
    showWarning,
} from "../../../Utilites/Functions/ApiFunctions";
import { useSessionStorage } from "../../../hooks/useSessionStorage";
import { useSocket } from "../../../Contexts/SocketContext";
import {
    bp,
    motion as ccMotion,
    type as ccType,
} from "../../../Utilites/concourse";

/* Concourse side menu — ARBITER §10.1–§10.5.
   Colour is read as var(--cc-*) only: never palette.*, never a `mode` branch. */

const FOCUS_RING = {
    "&:focus-visible": {
        outline: "2px solid var(--cc-red)",
        outlineOffset: "2px",
    },
};

const ELLIPSIS = {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
};

const ICON_BUTTON = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "none",
    padding: 0,
    border: 0,
    borderRadius: "99px",
    background: "transparent",
    color: "var(--cc-mute)",
    cursor: "pointer",
    boxSizing: "border-box",
    ...FOCUS_RING,
};

const SideBar = ({ bannerText, onCollapse }) => {
    const location = useLocation();
    const theme = useTheme();
    // Phone width also drops Daily/Monthly View (ARBITER §9 <=620px). The
    // existing react-device-detect check stays — it drives App.js's default
    // route too — and the width rule is added on top of it.
    const isPhoneWidth = useMediaQuery(theme.breakpoints.down(bp.sheet));
    const compact = isMobile || isPhoneWidth;
    const [nav, setNav] = useState({
        page: location.pathname.split("/").splice(-1),
    });
    const { user, setUser, logout } = useAuth();
    const { socket } = useSocket();
    const [approvalCount, setApprovalCount] = useSessionStorage(
        "approvalCount",
        0
    );
    const navigate = useNavigate();
    const prevApprovalRef = useRef(null);
    const approvalIdsRef = useRef(new Set());
    const refreshApprovalCount = useCallback(
        async (source = "manual") => {
            try {
                if (!user?.id) return;
                const data = await GetMeetingApprovals(user.id);
                if (Array.isArray(data)) {
                    const newCount = data.length;
                    const prev = prevApprovalRef.current;
                    const currentIds = new Set(
                        data.map((m) => m.id).filter((id) => id != null)
                    );
                    // Determine how many truly new IDs appeared
                    let newIdsCount = 0;
                    currentIds.forEach((id) => {
                        if (!approvalIdsRef.current.has(id)) newIdsCount++;
                    });

                    if (source === "socket" && newIdsCount > 0) {
                        showWarning(
                            `${newIdsCount} new meeting approval${
                                newIdsCount === 1 ? "" : "s"
                            } pending (total ${newCount})`
                        );
                    }
                    approvalIdsRef.current = currentIds; // update known IDs
                    setApprovalCount(newCount);
                    prevApprovalRef.current = newCount;
                }
            } catch {
                /* silent */
            }
        },
        [user?.id, setApprovalCount]
    );

    const handleMenuClick = (menu) => {
        const lower = menu.toLowerCase();
        switch (lower) {
            case "day":
                setNav({ page: "day" });
                navigate("/schedule/type/day");
                break;
            case "week":
                setNav({ page: "week" });
                navigate("/schedule/type/week");
                break;
            case "month":
                setNav({ page: "month" });
                navigate("/schedule/type/month");
                break;
            case "book":
                setNav({ page: "book" });
                navigate("/book");
                break;
            case "search":
                setNav({ page: "search" });
                navigate("/search");
                break;
            case "approve":
                setNav({ page: "approve" });
                navigate("/approve");
                refreshApprovalCount(); // manual fetch when opening page
                break;
            case "report":
                setNav({ page: "report" });
                navigate("/report");
                break;
            case "account":
                setNav({ page: "account" });
                navigate("/account");
                break;
            case "settings":
                setNav({ page: "settings" });
                navigate("/settings");
                break;
            case "branding":
                setNav({ page: "brand" });
                navigate("/branding");
                break;
            case "rooms":
                setNav({ page: "rooms" });
                navigate("/manage/rooms");
                break;
            case "types":
                setNav({ page: "types" });
                navigate("/manage/types");
                break;
            case "users":
                setNav({ page: "users" });
                navigate("/manage/users");
                break;
            case "resources":
                setNav({ page: "resources" });
                navigate("/manage/rooms/resources");
                break;
            case "blocked dates":
                setNav({ page: "blocked" });
                navigate("/manage/blockeddates");
                break;
            case "admin-dashboard":
                setNav({ page: "admin-dashboard" });
                navigate("/admin-dashboard");
                break;
            case "locations": // added for Manage -> Locations menu
                setNav({ page: "locations" });
                navigate("/manage/locations");
                break;
            default:
                // Every menu entry above is a named case. Nothing to do here —
                // the old `setContent(<></>)` call was vestigial (App.js never
                // passed setContent, so hitting this branch threw).
                break;
        }
    };

    useEffect(
        () => setNav({ page: location.pathname.split("/").splice(-1) }),
        [bannerText, location.pathname]
    );

    const handleLogout = () => {
        localStorage.removeItem("user");
        const rememberMe = localStorage.getItem("rememberMe") === "true";
        if (!rememberMe) {
            localStorage.removeItem("email");
        }
        logout();
        setUser({});
        setApprovalCount(0);
    };

    // (moved refreshApprovalCount above for availability in handleMenuClick)

    useEffect(() => {
        refreshApprovalCount();
    }, [refreshApprovalCount]);

    // Listen for socket messages indicating new approvals
    useEffect(() => {
        if (!socket || !user?.id) return;
        const handler = (payload) => {
            try {
                if (!payload) return;
                const { message } = payload;
                if (
                    message === "meeting_approval_requested" ||
                    message === "meeting_reapproval_requested" ||
                    message === "meeting_approved" ||
                    message === "meeting_declined"
                ) {
                    // Re-fetch to ensure accuracy (handles duplicates, etc.)
                    refreshApprovalCount("socket");
                    if (
                        message === "meeting_declined" &&
                        payload?.data?.created_user_id === user?.id
                    ) {
                        showWarning("One of your meetings was declined");
                    } else if (
                        message === "meeting_approved" &&
                        payload?.data?.created_user_id === user?.id
                    ) {
                        const title =
                            payload?.data?.name ||
                            `Meeting #${payload?.data?.meetingId || ""}`;
                        showSuccess(`${title} was approved`);
                    }
                }
            } catch {}
        };
        socket.on("message", handler);
        return () => socket.off("message", handler);
    }, [socket, user?.id, refreshApprovalCount]);

    const canManage = user?.admin || user?.office_admin > 0;

    const roomsItems = [
        {
            name: "Monthly View",
            icon: <CalendarMonthIcon />,
            onClick: () => handleMenuClick("month"),
            selected: nav.page == "month",
        },
        {
            name: "Weekly View",
            icon: <DateRangeIcon />,
            onClick: () => handleMenuClick("week"),
            selected: nav.page == "week",
        },
        {
            name: "Daily View",
            icon: <TodayIcon />,
            onClick: () => handleMenuClick("day"),
            selected: nav.page == "day",
        },
        {
            name: "My Bookings",
            icon: <ViewStreamIcon />,
            onClick: () => handleMenuClick("book"),
            selected: nav.page == "book",
        },
        {
            name: "Approval Queue",
            icon: <PlaylistAddCheckIcon />,
            onClick: () => handleMenuClick("approve"),
            selected: nav.page == "approve",
            badge: approvalCount,
        },
        // Hidden items are removed from the DOM, not just visually (ARBITER §11).
    ].filter((itm) =>
        compact
            ? itm.name !== "Daily View" && itm.name !== "Monthly View"
            : true
    );

    const accountItems = [
        {
            name: "My Account",
            icon: <AccountBoxOutlinedIcon />,
            onClick: () => handleMenuClick("account"),
            selected: nav.page == "account",
        },
        ...(user?.admin
            ? [
                  {
                      name: "Admin Dashboard",
                      icon: <DeveloperModeIcon />,
                      onClick: () => handleMenuClick("admin-dashboard"),
                      selected: nav.page == "admin-dashboard",
                  },
              ]
            : []),
    ];

    const manageItems = [
        {
            name: "Locations",
            icon: <CorporateFareIcon />,
            onClick: () => handleMenuClick("locations"),
            selected: nav.page == "locations",
        },
        {
            name: "Rooms",
            icon: <MeetingRoomOutlinedIcon />,
            onClick: () => handleMenuClick("rooms"),
            selected: nav.page == "rooms",
        },
        {
            name: "Users/Groups",
            icon: <PeopleAltOutlinedIcon />,
            onClick: () => handleMenuClick("users"),
            selected: nav.page == "users" || nav.page == "groups",
        },
        {
            name: "Meeting Types",
            icon: <FormatColorFillOutlinedIcon />,
            onClick: () => handleMenuClick("types"),
            selected: nav.page == "types",
        },
        {
            name: "Resources",
            icon: <AllInboxOutlinedIcon />,
            onClick: () => handleMenuClick("resources"),
            selected: nav.page == "resources",
        },
        {
            name: "Blocked Dates",
            icon: <EditCalendarOutlinedIcon />,
            onClick: () => handleMenuClick("blocked dates"),
            selected: nav.page == "blockeddates",
        },
    ];

    const sections = [
        { title: "Rooms", items: roomsItems },
        { title: "Account", items: accountItems },
        // Whole section is admin / office-admin only (unchanged gating).
        ...(canManage ? [{ title: "Manage", items: manageItems }] : []),
    ];

    // Entrance stagger: 45ms x n, where n counts EVERY item across EVERY
    // section continuously — dividers do not reset it (ARBITER §8).
    let navIndex = 0;
    const staggered = sections.map((section) => ({
        ...section,
        items: section.items.map((item) => ({
            ...item,
            delay: ccMotion.delay.navStep * ++navIndex,
        })),
    }));

    const initials = [user?.first_name, user?.last_name]
        .filter(Boolean)
        .map((part) => String(part).trim().charAt(0).toUpperCase())
        .filter(Boolean)
        .slice(0, 2)
        .join("");

    return (
        <Box
            sx={{
                // Fills the drawer paper, which is exactly layout.sideWidth
                // wide; 100% avoids a 1px overflow past its border-right.
                width: "100%",
                height: "100%",
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                boxSizing: "border-box",
                background: "var(--cc-srf)",
                color: "var(--cc-ink)",
                // Each Concourse root sets the family on itself — there is no
                // global typography override (ARBITER §6 / §13-G10).
                fontFamily: "var(--cc-sans)",
                fontSize: "15px",
                lineHeight: 1.5,
            }}
        >
            {/* §10.2 header — logo + collapse */}
            <Box
                sx={{
                    flex: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "14px 12px 13px 16px",
                    borderBottom: "1px solid var(--cc-line)",
                    boxSizing: "border-box",
                }}
            >
                {/*
                 * The real SEA mark. §10.2 specifies a text logo, but that was
                 * only ever a stand-in: the design mockup was a published
                 * artifact, which cannot load external images. The asset is the
                 * approved logo, so it goes back — inside §10.2's header
                 * geometry, not the old 102px shell header.
                 *
                 * sea-logo.png is 69x102 (portrait). 32px tall keeps the header
                 * exactly the height the text mark gave it: 14 + ~31.5 + 13 + 1.
                 */}
                <Box
                    component="img"
                    src={logo}
                    alt="SEA Rooms"
                    sx={{
                        display: "block",
                        flex: "none",
                        height: "32px",
                        width: "auto",
                    }}
                />
                <Box
                    component="button"
                    type="button"
                    onClick={onCollapse}
                    aria-label="Collapse menu"
                    sx={{
                        ...ICON_BUTTON,
                        marginLeft: "auto",
                        width: "30px",
                        height: "30px",
                        transition:
                            "background 200ms, color 200ms, transform 300ms var(--cc-sp)",
                        "@media (hover: hover)": {
                            "&:hover": {
                                background: "var(--cc-srf3)",
                                color: "var(--cc-ink)",
                                transform: "translateX(-2px)",
                            },
                        },
                        "& .MuiSvgIcon-root": { fontSize: "19px" },
                    }}
                >
                    <ChevronLeftIcon />
                </Box>
            </Box>

            {/* §10.3 body */}
            <Box
                component="nav"
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    padding: "6px 10px 10px",
                    scrollbarWidth: "thin",
                    boxSizing: "border-box",
                }}
            >
                {staggered.map((section, sectionIndex) => (
                    <Box key={section.title}>
                        {sectionIndex > 0 && (
                            <Box
                                aria-hidden="true"
                                sx={{
                                    height: "1px",
                                    background: "var(--cc-line)",
                                    margin: "9px 8px",
                                }}
                            />
                        )}
                        <Box
                            sx={{
                                padding: "12px 8px 5px",
                                ...ccType.sectionLabel,
                                color: "var(--cc-mute)",
                            }}
                        >
                            {section.title}
                        </Box>
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                            }}
                        >
                            {section.items.map((item) => (
                                <NavItem key={item.name} item={item} />
                            ))}
                        </Box>
                    </Box>
                ))}
            </Box>

            {/* §10.4 footer */}
            <Box
                sx={{
                    flex: "none",
                    borderTop: "1px solid var(--cc-line)",
                    padding: "11px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    boxSizing: "border-box",
                }}
            >
                <Box
                    aria-hidden="true"
                    sx={{
                        flex: "none",
                        width: "34px",
                        height: "34px",
                        borderRadius: "99px",
                        background: "var(--cc-red)",
                        color: "var(--cc-on-red)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        ...ccType.avatar,
                    }}
                >
                    {initials}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ ...ccType.footerName, ...ELLIPSIS }}>
                        {user?.first_name} {user?.last_name}
                    </Box>
                    <Box
                        sx={{
                            ...ccType.footerMeta,
                            color: "var(--cc-mute)",
                            ...ELLIPSIS,
                        }}
                    >
                        Version &mdash; {process.env.REACT_APP_VERSION}
                    </Box>
                </Box>
                <Box
                    component="button"
                    type="button"
                    onClick={handleLogout}
                    aria-label="Log out"
                    sx={{
                        ...ICON_BUTTON,
                        marginLeft: "auto",
                        width: "32px",
                        height: "32px",
                        transition: "background 200ms, color 200ms",
                        "@media (hover: hover)": {
                            "&:hover": {
                                background: "var(--cc-wash)",
                                color: "var(--cc-red)",
                            },
                        },
                        "& .MuiSvgIcon-root": { fontSize: "18px" },
                    }}
                >
                    <LogoutOutlinedIcon />
                </Box>
            </Box>
        </Box>
    );
};

/* §10.3 item — a plain <button>, so theme.components.MuiButton's global colour
   override cannot reach it (ARBITER §14 #7). */
const NavItem = ({ item }) => {
    const selected = !!item.selected;
    return (
        <Box
            component="button"
            type="button"
            onClick={item.onClick}
            aria-current={selected ? "page" : undefined}
            sx={{
                display: "flex",
                alignItems: "center",
                gap: "11px",
                width: "100%",
                boxSizing: "border-box",
                border: 0,
                borderRadius: "13px",
                padding: "9px 11px",
                textAlign: "left",
                cursor: "pointer",
                fontFamily: "inherit",
                background: selected ? "var(--cc-red)" : "transparent",
                color: selected ? "var(--cc-on-red)" : "var(--cc-ink)",
                boxShadow: selected ? "var(--cc-glow-nav)" : "none",
                transition:
                    "background 220ms, color 220ms, transform 280ms var(--cc-sp)",
                animation: `${ccMotion.keyframes.navItem} ${ccMotion.dur.navItem}ms var(--cc-sp) both`,
                animationDelay: `${item.delay || 0}ms`,
                "@media (hover: hover)": {
                    "&:hover": {
                        // A selected item keeps its red fill; only the nudge
                        // is the hover feedback.
                        background: selected
                            ? "var(--cc-red)"
                            : "var(--cc-wash)",
                        transform: "translateX(2px)",
                    },
                },
                ...FOCUS_RING,
                "& .MuiSvgIcon-root": {
                    flex: "none",
                    fontSize: "19px",
                    opacity: selected ? 1 : 0.82,
                },
            }}
        >
            {item.icon}
            <Box
                component="span"
                sx={{ ...ccType.navItem, flex: 1, minWidth: 0, ...ELLIPSIS }}
            >
                {item.name}
            </Box>
            {item.badge > 0 && (
                <Box
                    component="span"
                    sx={{
                        flex: "none",
                        minWidth: "22px",
                        padding: "1px 7px",
                        borderRadius: "99px",
                        textAlign: "center",
                        ...ccType.badge,
                        // Inverts inside a selected item.
                        background: selected
                            ? "var(--cc-on-red)"
                            : "var(--cc-red)",
                        color: selected ? "var(--cc-red)" : "var(--cc-on-red)",
                    }}
                >
                    {item.badge}
                </Box>
            )}
        </Box>
    );
};

export default SideBar;
