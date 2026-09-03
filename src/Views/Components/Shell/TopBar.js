import React from "react";
import {
    AppBar,
    Toolbar,
    IconButton,
    Typography,
    Box,
    Tooltip,
    Avatar,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../Utilites/AuthContext";
import useResponsive from "../../../hooks/useResponsive";
import logo from "../../../Assets/Images/sea-logo.png";

/**
 * Slim translucent top bar.
 *
 * Deliberately does NOT carry the page title. PageHeader owns that — it has the
 * subtitle, the breadcrumbs and the actions to go with it, and since pages no
 * longer scroll it is always on screen. Rendering the title here as well gave
 * every page two titles and two `<h1>`s.
 *
 * What's left is navigation chrome: the menu trigger when the sidebar is
 * hidden, brand on small screens where the sidebar isn't visible, and the
 * account shortcut. The shell skips this bar entirely when none of that
 * applies, which buys the page back 60px.
 */
export default function TopBar({
    onOpenMenu,
    showMenuButton = false,
    /** Node rendered on the right (page-specific controls). */
    actions,
}) {
    const { user } = useAuth();
    const { isCompact } = useResponsive();
    const navigate = useNavigate();

    const initials =
        `${user?.first_name?.[0] || ""}${user?.last_name?.[0] || ""}`.toUpperCase() ||
        "?";

    return (
        <AppBar
            position="sticky"
            sx={{
                flexShrink: 0,
                zIndex: (t) => t.zIndex.appBar,
                pt: "env(safe-area-inset-top)",
            }}
        >
            <Toolbar
                variant="dense"
                sx={{
                    minHeight: { xs: 56, md: 60 },
                    px: { xs: 1, sm: 2, md: 3 },
                    gap: 1,
                }}
            >
                {showMenuButton && (
                    <IconButton
                        edge="start"
                        onClick={onOpenMenu}
                        aria-label="Open navigation menu"
                        sx={{ mr: 0.5 }}
                    >
                        <MenuIcon />
                    </IconButton>
                )}

                <Box
                    sx={{
                        flexGrow: 1,
                        minWidth: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                    }}
                >
                    {/* The sidebar carries the brand on desktop; on a phone it's
                        behind the drawer, so it belongs here instead. */}
                    {isCompact && (
                        <>
                            <Box
                                component="img"
                                src={logo}
                                alt="S-E-A"
                                sx={{ height: 26, width: "auto" }}
                            />
                            <Typography
                                variant="subtitle2"
                                noWrap
                                sx={{ fontWeight: 700 }}
                            >
                                Equipment
                            </Typography>
                        </>
                    )}
                </Box>

                {actions}

                {isCompact && (
                    <Tooltip title="My account">
                        <IconButton
                            onClick={() => navigate("/account")}
                            aria-label="My account"
                            sx={{ p: 0.5 }}
                        >
                            <Avatar sx={{ width: 30, height: 30 }}>
                                {initials}
                            </Avatar>
                        </IconButton>
                    </Tooltip>
                )}
            </Toolbar>
        </AppBar>
    );
}
