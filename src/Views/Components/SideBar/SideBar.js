import { useTheme } from "@mui/material/styles";
import { useEffect, useState } from "react";
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

const SideBar = ({ setBannerText, setContent, bannderText }) => {
    const location = useLocation();
    const theme = useTheme();
    const [nav, setNav] = useState({
        page: location.pathname.split("/").splice(-1),
    });
    const { user, setUser, logout } = useAuth();
    const navigate = useNavigate();
    const handleMenuClick = (menu) => {
        setBannerText(menu);
        switch (menu.toLowerCase()) {
            case "day":
                nav.page = "day";
                navigate("/schedule/type/day");
                break;
            case "week":
                nav.page = "week";
                navigate("/schedule/type/week");
                break;
            case "month":
                nav.page = "month";
                navigate("/schedule/type/month");
                break;
            case "book":
                nav.page = "book";
                navigate("/book");
                break;
            case "search":
                nav.page = "search";
                navigate("/search");
                break;
            case "approve":
                nav.page = "approve";
                navigate("/approve");
                break;
            case "report":
                nav.page = "report";
                navigate("/report");
                break;
            case "account":
                nav.page = "account";
                navigate("/account");
                break;
            case "settings":
                nav.page = "settings";
                navigate("/settings");
                break;
            case "branding":
                nav.page = "brand";
                navigate("/branding");
                break;
            case "report":
                nav.page = "report";
                navigate("/reports");
                break;
            case "locations":
                nav.page = "locations";
                navigate("/manage/locations");
                break;
            case "rooms":
                nav.page = "rooms";
                navigate("/manage/rooms");
                break;
            case "types":
                nav.page = "types";
                navigate("/manage/types");
                break;
            case "users":
                nav.page = "users";
                navigate("/manage/users");
                break;
            case "resources":
                nav.page = "resources";
                navigate("/manage/rooms/resources");
                break;
            case "blocked dates":
                nav.page = "blocked";
                navigate("/manage/blockeddates");
                break;
            case "admin-dashboard":
                nav.page = "admin-dashboard";
                navigate("/admin-dashboard");
                break;
            default:
                setContent(<></>);
                break;
        }
    };

    useEffect(
        () => setNav({ page: location.pathname.split("/").splice(-1) }),
        [bannderText]
    );

    const handleLogout = () => {
        localStorage.removeItem("user");
        const rememberMe = localStorage.getItem("rememberMe") === "true";
        if (!rememberMe) {
            localStorage.removeItem("email");
        }
        logout();
        setUser({});
    };

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
                            },
                        ]?.filter((itm) => {
                            if (isMobile) {
                                return (
                                    itm.name !== "Daily View" &&
                                    itm.name !== "Monthly View"
                                );
                            }
                            return true;
                        })}
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

const MenuItem = ({ title, icon, onToggle, items }) => {
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
                            sx={{ width: "100%", textAlign: "left" }}
                        >
                            {item.name}
                        </Typography>
                    </Button>
                ))}
            </Box>
        </>
    );
};

export default SideBar;
