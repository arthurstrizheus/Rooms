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
import BuildIcon from "@mui/icons-material/BuildOutlined";
import AssignmentIcon from "@mui/icons-material/AssignmentOutlined";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheckOutlined";
import AccountBoxOutlinedIcon from "@mui/icons-material/AccountBoxOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import DeveloperModeIcon from "@mui/icons-material/DeveloperMode";
import { isMobile } from "react-device-detect";
import "./SideBar.css";
import { useAuth } from "../../../Utilites/AuthContext";
import {
    GetCheckoutApprovals,
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
        0,
    );
    const navigate = useNavigate();
    const prevApprovalRef = useRef(null);
    const approvalIdsRef = useRef(new Set());
    const refreshApprovalCount = useCallback(
        async (source = "manual") => {
            try {
                if (!user?.id) return;
                const data = await GetCheckoutApprovals();
                if (Array.isArray(data)) {
                    const newCount = data.length;
                    const prev = prevApprovalRef.current;
                    const currentIds = new Set(
                        data.map((c) => c.id).filter((id) => id != null),
                    );
                    // Determine how many truly new IDs appeared
                    let newIdsCount = 0;
                    currentIds.forEach((id) => {
                        if (!approvalIdsRef.current.has(id)) newIdsCount++;
                    });

                    if (source === "socket" && newIdsCount > 0) {
                        showWarning(
                            `${newIdsCount} new reservation approval${
                                newIdsCount === 1 ? "" : "s"
                            } pending (total ${newCount})`,
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
        [user?.id, setApprovalCount],
    );

    const handleMenuClick = (menu) => {
        const lower = menu.toLowerCase();
        switch (lower) {
            case "equipment":
                setNav({ page: "equipment" });
                navigate("/equipment");
                break;
            case "reservations":
                setNav({ page: "reservations" });
                navigate("/reservations");
                break;
            case "approve":
                setNav({ page: "approve" });
                navigate("/approve");
                refreshApprovalCount(); // manual fetch when opening page
                break;
            case "account":
                setNav({ page: "account" });
                navigate("/account");
                break;
            case "users":
                setNav({ page: "users" });
                navigate("/manage/users");
                break;
            case "admin-dashboard":
                setNav({ page: "admin-dashboard" });
                navigate("/admin-dashboard");
                break;
            default:
                setContent(<></>);
                break;
        }
    };

    useEffect(
        () => setNav({ page: location.pathname.split("/").splice(-1) }),
        [bannderText, location.pathname],
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
                    message === "checkout_approval_requested" ||
                    message === "checkout_reapproval_requested" ||
                    message === "checkout_approved" ||
                    message === "checkout_declined"
                ) {
                    // Re-fetch to ensure accuracy (handles duplicates, etc.)
                    refreshApprovalCount("socket");
                    if (
                        message === "checkout_declined" &&
                        payload?.data?.user_id === user?.id
                    ) {
                        showWarning("One of your reservations was declined");
                    } else if (
                        message === "checkout_approved" &&
                        payload?.data?.user_id === user?.id
                    ) {
                        const title =
                            payload?.data?.equipment_name ||
                            `Reservation #${payload?.data?.checkoutId || ""}`;
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
                        title="Equipment"
                        icon={<></>}
                        items={[
                            {
                                name: "All Equipment",
                                icon: <BuildIcon />,
                                onClick: () => handleMenuClick("equipment"),
                                selected: nav.page == "equipment",
                            },
                            {
                                name: "My Reservations",
                                icon: <AssignmentIcon />,
                                onClick: () => handleMenuClick("reservations"),
                                selected: nav.page == "reservations",
                            },
                        ]}
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
                                                  "admin-dashboard",
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
                    {(user?.admin ||
                        user?.equipment_admin ||
                        user?.equipment_office_admin) && (
                        <>
                            <Divider />
                            <MenuItem
                                title="Admin"
                                icon={<></>}
                                items={[
                                    {
                                        name: "Users",
                                        icon: <PeopleAltOutlinedIcon />,
                                        onClick: () => handleMenuClick("users"),
                                        selected: nav.page == "users",
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
