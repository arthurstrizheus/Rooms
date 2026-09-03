import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    Box,
    Stack,
    Typography,
    Divider,
    IconButton,
    Tooltip,
    Avatar,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Badge,
} from "@mui/material";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import AccountBoxOutlinedIcon from "@mui/icons-material/AccountBoxOutlined";
import SupportAgentOutlinedIcon from "@mui/icons-material/SupportAgentOutlined";
import { useAuth } from "../../../Utilites/AuthContext";
import { useSupport } from "../Support/SupportContext";
import { visibleSections } from "./navConfig";
import logo from "../../../Assets/Images/sea-logo.png";

const NAV_WIDTH = 264;

/**
 * The primary navigation rail.
 *
 * Rendered inside a permanent Drawer on desktop and a temporary one on mobile.
 * The active item is marked by a red rail that animates in from the left plus a
 * tinted background — no layout shift, just color and transform, so it stays
 * smooth on low-end devices.
 */
export default function NavSidebar({
    approvalCount = 0,
    onNavigate,
    onCollapse,
    showCollapse = false,
}) {
    const { user, logout, setUser } = useAuth();
    const { enabled: supportEnabled, openSupport } = useSupport();
    const location = useLocation();
    const navigate = useNavigate();
    const [userMenu, setUserMenu] = React.useState(null);

    const sections = visibleSections(user, { approvalCount });

    const handleClick = (item) => {
        navigate(item.path);
        onNavigate?.(item);
    };

    const handleLogout = () => {
        setUserMenu(null);
        localStorage.removeItem("user");
        if (localStorage.getItem("rememberMe") !== "true") {
            localStorage.removeItem("email");
        }
        logout();
        setUser({});
    };

    const initials =
        `${user?.first_name?.[0] || ""}${user?.last_name?.[0] || ""}`.toUpperCase() ||
        "?";

    const roleLabel = user?.admin
        ? "Administrator"
        : user?.equipment_admin
          ? "Equipment Admin"
          : user?.tax_admin
            ? "Tax Admin"
            : user?.equipment_office_admin
              ? "Office Admin"
              : "Member";

    return (
        <Box
            component="nav"
            aria-label="Main navigation"
            sx={{
                // 100%, not NAV_WIDTH. The docked drawer paper is NAV_WIDTH
                // *including* its 1px right border, so a hard-coded 264px child
                // overflowed by exactly that pixel — and because the paper
                // scrolls vertically, the browser gave it a horizontal
                // scrollbar for the trouble.
                width: "100%",
                maxWidth: NAV_WIDTH,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                overflowX: "hidden",
                bgcolor: "background.paper",
            }}
        >
            {/* ---- Brand ---- */}
            <Stack
                direction="row"
                alignItems="center"
                sx={{
                    px: 2.5,
                    py: 2,
                    pt: "calc(16px + env(safe-area-inset-top))",
                    flexShrink: 0,
                }}
            >
                <Box
                    component="img"
                    src={logo}
                    alt="S-E-A"
                    sx={{
                        height: 40,
                        width: "auto",
                        transition: "transform 300ms cubic-bezier(0.22,1,0.36,1)",
                        "&:hover": { transform: "scale(1.04)" },
                    }}
                />
                <Box sx={{ ml: 1.5, flexGrow: 1, minWidth: 0 }}>
                    <Typography
                        variant="subtitle2"
                        sx={{ lineHeight: 1.2, fontWeight: 700 }}
                    >
                        Equipment
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{ color: "text.disabled", fontSize: "0.6875rem" }}
                    >
                        Reservations
                    </Typography>
                </Box>
                {showCollapse && (
                    <Tooltip title="Collapse menu">
                        <IconButton
                            size="small"
                            onClick={onCollapse}
                            aria-label="Collapse menu"
                        >
                            <ChevronLeftIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
            </Stack>

            <Divider sx={{ flexShrink: 0 }} />

            {/* ---- Sections ---- */}
            <Box
                sx={{
                    flexGrow: 1,
                    overflowY: "auto",
                    // `overflow-x` computes to `auto` once either axis is
                    // non-visible; the active rail sits 6px outside the item
                    // box, which is enough to trip a scrollbar.
                    overflowX: "hidden",
                    overscrollBehavior: "contain",
                    px: 1.5,
                    py: 2,
                }}
            >
                {sections.map((section, sectionIndex) => (
                    <Box
                        key={section.id}
                        sx={{
                            mb: 2.5,
                            animation:
                                "seaSlideInLeft 340ms cubic-bezier(0.22,1,0.36,1) both",
                            animationDelay: `${sectionIndex * 60}ms`,
                        }}
                    >
                        <Typography
                            variant="overline"
                            sx={{
                                px: 1.5,
                                color: "text.disabled",
                                display: "block",
                                mb: 0.75,
                            }}
                        >
                            {section.label}
                        </Typography>

                        <Stack spacing={0.25}>
                            {section.items.map((item, itemIndex) => {
                                const Icon = item.icon;
                                const selected = item.match(location.pathname);
                                const badge =
                                    item.badge === "approvals"
                                        ? approvalCount
                                        : 0;

                                return (
                                    <Box
                                        key={item.id}
                                        component="button"
                                        type="button"
                                        onClick={() => handleClick(item)}
                                        aria-current={
                                            selected ? "page" : undefined
                                        }
                                        sx={{
                                            position: "relative",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1.5,
                                            width: "100%",
                                            border: 0,
                                            font: "inherit",
                                            textAlign: "left",
                                            cursor: "pointer",
                                            px: 1.5,
                                            py: 1.25,
                                            borderRadius: 2.5,
                                            color: selected
                                                ? "primary.dark"
                                                : "text.secondary",
                                            bgcolor: selected
                                                ? "primary.50"
                                                : "transparent",
                                            transition:
                                                "background-color 160ms ease, color 160ms ease",
                                            animation:
                                                "seaSlideInLeft 300ms cubic-bezier(0.22,1,0.36,1) both",
                                            animationDelay: `${sectionIndex * 60 + itemIndex * 35 + 60}ms`,

                                            // Active rail: scales in from the
                                            // left edge rather than appearing.
                                            "&::before": {
                                                content: '""',
                                                position: "absolute",
                                                left: 0,
                                                top: "50%",
                                                width: 3,
                                                height: 20,
                                                borderRadius: "0 3px 3px 0",
                                                bgcolor: "primary.main",
                                                transform: selected
                                                    ? "translate(-6px, -50%) scaleY(1)"
                                                    : "translate(-6px, -50%) scaleY(0)",
                                                transformOrigin: "center",
                                                transition:
                                                    "transform 260ms cubic-bezier(0.22,1,0.36,1)",
                                            },

                                            "@media (hover: hover)": {
                                                "&:hover": {
                                                    bgcolor: selected
                                                        ? "primary.100"
                                                        : "grey.100",
                                                    color: selected
                                                        ? "primary.dark"
                                                        : "text.primary",
                                                },
                                                "&:hover .nav-icon": {
                                                    transform:
                                                        "translateX(2px)",
                                                },
                                            },
                                            "&:active": {
                                                transform: "scale(0.985)",
                                            },
                                            "&:focus-visible": {
                                                outline: "2px solid",
                                                outlineColor: "primary.main",
                                                outlineOffset: 2,
                                            },
                                        }}
                                    >
                                        <Icon
                                            className="nav-icon"
                                            sx={{
                                                fontSize: 20,
                                                flexShrink: 0,
                                                color: selected
                                                    ? "primary.main"
                                                    : "text.disabled",
                                                transition:
                                                    "transform 220ms cubic-bezier(0.22,1,0.36,1), color 160ms ease",
                                            }}
                                        />
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                flexGrow: 1,
                                                fontWeight: selected ? 650 : 550,
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}
                                        >
                                            {item.label}
                                        </Typography>

                                        {badge > 0 && (
                                            <Box
                                                sx={{
                                                    minWidth: 20,
                                                    height: 20,
                                                    px: 0.75,
                                                    borderRadius: 5,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: "0.6875rem",
                                                    fontWeight: 700,
                                                    color: "common.white",
                                                    bgcolor: "primary.main",
                                                    animation:
                                                        "seaScaleIn 300ms cubic-bezier(0.34,1.56,0.64,1) both",
                                                }}
                                            >
                                                {badge > 99 ? "99+" : badge}
                                            </Box>
                                        )}
                                    </Box>
                                );
                            })}
                        </Stack>

                        {sectionIndex < sections.length - 1 && (
                            <Divider sx={{ mt: 2.5, mx: 1.5 }} />
                        )}
                    </Box>
                ))}
            </Box>

            {/* ---- User ---- */}
            <Divider sx={{ flexShrink: 0 }} />
            <Stack
                direction="row"
                alignItems="center"
                spacing={1.25}
                sx={{
                    position: "relative",
                    flexShrink: 0,
                    px: 2,
                    py: 1.75,
                    pb: "calc(14px + env(safe-area-inset-bottom))",
                }}
            >
                <Badge
                    overlap="circular"
                    variant="dot"
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    sx={{
                        "& .MuiBadge-dot": {
                            bgcolor: "success.main",
                            border: "2px solid",
                            borderColor: "background.paper",
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                        },
                    }}
                >
                    <Avatar sx={{ width: 34, height: 34 }}>{initials}</Avatar>
                </Badge>

                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography
                        variant="body2"
                        noWrap
                        sx={{ fontWeight: 600, lineHeight: 1.3 }}
                    >
                        {user?.first_name} {user?.last_name}
                    </Typography>
                    <Typography
                        variant="caption"
                        noWrap
                        sx={{ color: "text.disabled", display: "block" }}
                    >
                        {roleLabel}
                    </Typography>
                </Box>

                <IconButton
                    size="small"
                    aria-label="Account menu"
                    onClick={(e) => setUserMenu(e.currentTarget)}
                >
                    <MoreHorizIcon fontSize="small" />
                </IconButton>

                <Menu
                    anchorEl={userMenu}
                    open={Boolean(userMenu)}
                    onClose={() => setUserMenu(null)}
                    anchorOrigin={{ vertical: "top", horizontal: "right" }}
                    transformOrigin={{ vertical: "bottom", horizontal: "right" }}
                >
                    <MenuItem
                        onClick={() => {
                            setUserMenu(null);
                            navigate("/account");
                            onNavigate?.();
                        }}
                    >
                        <ListItemIcon>
                            <AccountBoxOutlinedIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>My Account</ListItemText>
                    </MenuItem>

                    {/* Hidden unless the server has the help desk configured,
                        so this is never a button that can only fail. */}
                    {supportEnabled && (
                        <MenuItem
                            onClick={() => {
                                setUserMenu(null);
                                openSupport();
                            }}
                        >
                            <ListItemIcon>
                                <SupportAgentOutlinedIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Get help</ListItemText>
                        </MenuItem>
                    )}

                    <Divider sx={{ my: 0.5 }} />
                    <MenuItem onClick={handleLogout}>
                        <ListItemIcon>
                            <LogoutOutlinedIcon
                                fontSize="small"
                                sx={{ color: "error.main" }}
                            />
                        </ListItemIcon>
                        <ListItemText
                            primaryTypographyProps={{ color: "error.main" }}
                        >
                            Log out
                        </ListItemText>
                    </MenuItem>
                </Menu>

                <Typography
                    variant="caption"
                    sx={{
                        position: "absolute",
                        bottom: 2,
                        right: 8,
                        fontSize: "0.5625rem",
                        color: "text.disabled",
                        opacity: 0.6,
                        pointerEvents: "none",
                    }}
                >
                    v{process.env.REACT_APP_VERSION}
                </Typography>
            </Stack>
        </Box>
    );
}

export { NAV_WIDTH };
