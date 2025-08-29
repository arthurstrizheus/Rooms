import { useTheme } from "@mui/material/styles";
import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    Grid,
    Stack,
    Tooltip,
    Typography,
    Divider,
    IconButton,
    Button,
    Box,
} from "@mui/material";
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
import { isMobile } from "react-device-detect";
import "./SideBar.css";
import { useAuth } from "../../../Utilites/AuthContext";
import {
    GetMeetingApprovals,
    showSuccess,
    showWarning,
} from "../../../Utilites/Functions/ApiFunctions";
import { useSessionStorage } from "../../../hooks/useSessionStorage";
import { useSocket } from "../../../Contexts/SocketContext";

const SideBar = ({ setBannerText, setContent, bannderText }) => {
    const location = useLocation();
    const theme = useTheme();
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
                setContent(<></>);
                break;
        }
    };

    useEffect(
        () => setNav({ page: location.pathname.split("/").splice(-1) }),
        [bannderText, location.pathname]
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

    return (
        <Grid
            container
            direction="column"
            wrap="nowrap"
            sx={{
                height: "100%",
                backgroundColor: theme.palette.background.paper,
            }}
        >
            <Grid
                item
                sx={{
                    flexGrow: 1,
                    overflowY: "auto",
                }}
            >
                <Box
                    sx={{
                        paddingLeft: "10px",
                        paddingRight: "10px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "start",
                        flexGrow: 1,
                    }}
                >
                    <MenuItem
                        title="Rooms"
                        icon={<></>}
                        items={[
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
                                _rawName: "Approval Queue",
                            },
                        ].filter((itm) => {
                            if (isMobile) {
                                return (
                                    itm.name !== "Daily View" &&
                                    itm.name !== "Monthly View"
                                );
                            }
                            return true;
                        })}
                        approvalCount={approvalCount}
                    />
                    <Divider />
                    <MenuItem
                        title="Account"
                        icon={<></>}
                        items={
                            user?.admin
                                ? [
                                      {
                                          name: "My Account",
                                          icon: <AccountBoxOutlinedIcon />,
                                          onClick: () =>
                                              handleMenuClick("account"),
                                          selected: nav.page == "account",
                                      },
                                      {
                                          name: "Admin Dashboard",
                                          icon: <DeveloperModeIcon />,
                                          onClick: () =>
                                              handleMenuClick(
                                                  "admin-dashboard"
                                              ),
                                          selected:
                                              nav.page == "admin-dashboard",
                                      },
                                  ]
                                : [
                                      {
                                          name: "My Account",
                                          icon: <AccountBoxOutlinedIcon />,
                                          onClick: () =>
                                              handleMenuClick("account"),
                                          selected: nav.page == "account",
                                      },
                                  ]
                        }
                    />
                    {(user?.admin || user?.office_admin > 0) && (
                        <>
                            <Divider />
                            <MenuItem
                                title="Manage"
                                icon={<></>}
                                items={[
                                    {
                                        name: "Locations",
                                        icon: <CorporateFareIcon />,
                                        onClick: () =>
                                            handleMenuClick("locations"),
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
                                        selected:
                                            nav.page == "users" ||
                                            nav.page == "groups",
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
                                        onClick: () =>
                                            handleMenuClick("resources"),
                                        selected: nav.page == "resources",
                                    },
                                    {
                                        name: "Blocked Dates",
                                        icon: <EditCalendarOutlinedIcon />,
                                        onClick: () =>
                                            handleMenuClick("blocked dates"),
                                        selected: nav.page == "blockeddates",
                                    },
                                ]}
                            />
                        </>
                    )}
                </Box>
                <Divider />
                <Grid item sx={{ padding: 2 }}>
                    <Stack
                        direction="row"
                        justifyContent="left"
                        alignItems="center"
                        spacing={1}
                    >
                        <Tooltip title="Log Out" arrow>
                            <IconButton onClick={handleLogout}>
                                <LogoutOutlinedIcon
                                    sx={{ color: theme.palette.error.main }}
                                />
                            </IconButton>
                        </Tooltip>
                        <Stack
                            direction="column"
                            justifyContent="center"
                            alignItems="flex-start"
                            spacing={0.5}
                        >
                            <Typography
                                variant="body2"
                                color={theme.palette.text.primary}
                                sx={{ fontWeight: 500 }}
                            >
                                {user?.first_name} {user?.last_name}
                            </Typography>
                            <Box
                                sx={{
                                    backgroundColor: "transparent",
                                    color: theme.palette.text.secondary,
                                    px: 0.5,
                                    py: 0.125,
                                    borderRadius: 0.5,
                                    fontSize: "0.6rem",
                                    fontWeight: "normal",
                                    alignSelf: "flex-start",
                                    opacity: 0.7,
                                }}
                            >
                                Version - {process.env.REACT_APP_VERSION}
                            </Box>
                        </Stack>
                    </Stack>
                </Grid>
            </Grid>
        </Grid>
    );
};

const MenuItem = ({ title, icon, onToggle, items, approvalCount }) => {
    const theme = useTheme();
    return (
        <>
            <Grid
                item
                sx={{
                    padding: 1,
                    cursor: "default",
                    transition: "background-color 0.3s ease",
                    marginTop: "10px",
                }}
                onClick={onToggle}
            >
                <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                >
                    <Stack direction="row" alignItems="center" spacing={2}>
                        {/* {icon} */}
                        <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: "bold" }}
                        >
                            {title}
                        </Typography>
                    </Stack>
                </Stack>
            </Grid>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {items.map((item, index) => (
                    <Button
                        startIcon={item.icon}
                        fullWidth
                        key={index}
                        sx={{
                            paddingTop: 1.5,
                            paddingBottom: 1.5,
                            paddingLeft: 0,
                            paddingLeft: 3,
                            cursor: "pointer",
                            backgroundColor: item.selected
                                ? theme.palette.primary.selected
                                : theme.palette.background.paper,
                            transition: "background-color 0.4s ease",
                            "&:hover": {
                                backgroundColor:
                                    theme.palette.primary.lightHover,
                            },
                        }}
                        onClick={item.onClick}
                    >
                        <Typography
                            variant="subtitle1"
                            sx={{
                                width: "100%",
                                textAlign: "left",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                            }}
                        >
                            <span>{item._rawName || item.name}</span>
                            {item._rawName === "Approval Queue" &&
                                approvalCount > 0 && (
                                    <span
                                        style={{
                                            backgroundColor: item.selected
                                                ? "white"
                                                : "#d32f2f",
                                            color: item.selected
                                                ? "black"
                                                : "white",
                                            borderRadius: "12px",
                                            padding: "0 8px",
                                            fontSize: "0.75rem",
                                            fontWeight: 600,
                                            lineHeight: 1.6,
                                            minWidth: "24px",
                                            textAlign: "center",
                                        }}
                                    >
                                        {approvalCount}
                                    </span>
                                )}
                        </Typography>
                    </Button>
                ))}
            </Box>
        </>
    );
};

export default SideBar;
