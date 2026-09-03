import React from "react";
import {
    AppBar,
    Toolbar,
    IconButton,
    Typography,
    Box,
    LinearProgress,
    Fade,
    Tooltip,
    Avatar,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../Utilites/AuthContext";
import useResponsive from "../../../hooks/useResponsive";

/**
 * Slim translucent top bar.
 *
 * Replaces the old 112px banner. It carries the page title, the menu trigger
 * when the sidebar is hidden, and the global loading bar — which now sits flush
 * on the bottom edge of the bar rather than pushing the page down a few pixels
 * every time a request starts.
 */
export default function TopBar({
    title,
    loading = false,
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

                {/* Keyed so the title cross-fades on route change. */}
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Fade in key={title} timeout={260}>
                        <Typography
                            variant="h6"
                            component="h1"
                            noWrap
                            sx={{
                                fontSize: { xs: "1rem", md: "1.0625rem" },
                                letterSpacing: "-0.012em",
                            }}
                        >
                            {title}
                        </Typography>
                    </Fade>
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

            {/* Sits in the border, so showing it never shifts the layout. */}
            <Fade in={loading} timeout={{ enter: 120, exit: 320 }}>
                <LinearProgress
                    sx={{
                        position: "absolute",
                        bottom: -1,
                        left: 0,
                        right: 0,
                        height: 2,
                        borderRadius: 0,
                        bgcolor: "transparent",
                    }}
                />
            </Fade>
        </AppBar>
    );
}
