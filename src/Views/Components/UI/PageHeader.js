import React from "react";
import {
    Box,
    Stack,
    Typography,
    IconButton,
    Button,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Breadcrumbs,
    Link,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import { useNavigate } from "react-router-dom";
import useResponsive from "../../../hooks/useResponsive";
import { RiseIn } from "./motion";

/**
 * Page header: title, optional subtitle/eyebrow, breadcrumbs, and actions.
 *
 * Action crowding is handled for you. Pass `actions` as an array of
 * `{ key, label, icon, onClick, primary, hidden, disabled, color, render }`.
 * On desktop everything renders inline; on a narrow viewport only the items
 * marked `primary` stay visible and the rest collapse into an overflow menu,
 * so the header never wraps into a wall of buttons on a phone.
 *
 * Pass `renderActions` instead if you need full control of the action area.
 */
export default function PageHeader({
    title,
    subtitle,
    eyebrow,
    /** [{ label, to }] — the last entry is rendered as plain text. */
    breadcrumbs,
    /** Show a back chevron. `true` uses history(-1); a string navigates to it. */
    back,
    actions = [],
    renderActions,
    /** Node rendered under the title row (filters, tabs, search). */
    children,
    /** Stick to the top of the scroll container. */
    sticky = false,
    sx = {},
}) {
    const navigate = useNavigate();
    const { isCompact } = useResponsive();
    const [menuAnchor, setMenuAnchor] = React.useState(null);

    const visible = actions.filter((a) => a && !a.hidden);
    const inline = isCompact ? visible.filter((a) => a.primary) : visible;
    const overflow = isCompact ? visible.filter((a) => !a.primary) : [];

    const handleBack = () => {
        if (typeof back === "string") navigate(back);
        else navigate(-1);
    };

    const renderButton = (action) => {
        // `render` lets a caller drop in an arbitrary node (a search field, a
        // split button) and still take part in the overflow logic.
        if (action.render) return <Box key={action.key}>{action.render}</Box>;

        // Icon-only below `sm` when there are several actions, so the header
        // stays on one line on a phone.
        const iconOnly = isCompact && action.icon && inline.length > 1;

        if (iconOnly) {
            return (
                <IconButton
                    key={action.key}
                    aria-label={action.label}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    sx={{
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: action.primary ? "transparent" : "divider",
                        bgcolor: action.primary
                            ? "primary.main"
                            : "background.paper",
                        color: action.primary ? "primary.contrastText" : action.color,
                        "&:hover": {
                            bgcolor: action.primary
                                ? "primary.dark"
                                : "action.hover",
                        },
                    }}
                >
                    {action.icon}
                </IconButton>
            );
        }

        return (
            <Button
                key={action.key}
                onClick={action.onClick}
                disabled={action.disabled}
                startIcon={action.icon}
                variant={action.primary ? "contained" : "outlined"}
                color={action.color || "primary"}
                sx={{ whiteSpace: "nowrap" }}
            >
                {action.label}
            </Button>
        );
    };

    return (
        <Box
            component="header"
            sx={{
                position: sticky ? "sticky" : "static",
                top: 0,
                zIndex: 5,
                px: { xs: 2, sm: 3, md: 4 },
                pt: { xs: 2, sm: 2.5, md: 3 },
                pb: children ? { xs: 1.5, sm: 2 } : { xs: 2, sm: 2.5 },
                bgcolor: sticky ? "rgba(255,255,255,0.85)" : "transparent",
                backdropFilter: sticky ? "blur(12px) saturate(180%)" : "none",
                borderBottom: sticky ? "1px solid" : "none",
                borderColor: "divider",
                ...sx,
            }}
        >
            <RiseIn duration={340}>
                {breadcrumbs?.length > 0 && (
                    <Breadcrumbs
                        sx={{
                            mb: 0.75,
                            "& .MuiBreadcrumbs-separator": {
                                mx: 0.75,
                                color: "text.disabled",
                            },
                        }}
                    >
                        {breadcrumbs.map((crumb, i) =>
                            i === breadcrumbs.length - 1 || !crumb.to ? (
                                <Typography
                                    key={crumb.label}
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ fontWeight: 600 }}
                                >
                                    {crumb.label}
                                </Typography>
                            ) : (
                                <Link
                                    key={crumb.label}
                                    component="button"
                                    variant="caption"
                                    onClick={() => navigate(crumb.to)}
                                    sx={{
                                        fontWeight: 600,
                                        border: 0,
                                        background: "none",
                                        cursor: "pointer",
                                        p: 0,
                                    }}
                                >
                                    {crumb.label}
                                </Link>
                            ),
                        )}
                    </Breadcrumbs>
                )}

                <Stack
                    direction="row"
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    spacing={1.5}
                >
                    {back && (
                        <IconButton
                            onClick={handleBack}
                            aria-label="Go back"
                            size="small"
                            sx={{
                                mt: { xs: 0.25, sm: 0 },
                                border: "1px solid",
                                borderColor: "divider",
                                borderRadius: 2,
                                bgcolor: "background.paper",
                            }}
                        >
                            <ArrowBackIosNewIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                    )}

                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        {eyebrow && (
                            <Typography
                                variant="overline"
                                sx={{
                                    color: "primary.main",
                                    display: "block",
                                    mb: 0.25,
                                }}
                            >
                                {eyebrow}
                            </Typography>
                        )}
                        <Typography
                            variant="h2"
                            component="h1"
                            sx={{
                                fontSize: {
                                    xs: "1.375rem",
                                    sm: "1.625rem",
                                    md: "1.75rem",
                                },
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            {title}
                        </Typography>
                        {subtitle && (
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 0.5 }}
                            >
                                {subtitle}
                            </Typography>
                        )}
                    </Box>

                    <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ flexShrink: 0 }}
                    >
                        {renderActions}
                        {inline.map(renderButton)}

                        {overflow.length > 0 && (
                            <>
                                <IconButton
                                    aria-label="More actions"
                                    onClick={(e) =>
                                        setMenuAnchor(e.currentTarget)
                                    }
                                    sx={{
                                        border: "1px solid",
                                        borderColor: "divider",
                                        borderRadius: 2,
                                        bgcolor: "background.paper",
                                    }}
                                >
                                    <MoreVertIcon fontSize="small" />
                                </IconButton>
                                <Menu
                                    anchorEl={menuAnchor}
                                    open={Boolean(menuAnchor)}
                                    onClose={() => setMenuAnchor(null)}
                                    anchorOrigin={{
                                        vertical: "bottom",
                                        horizontal: "right",
                                    }}
                                    transformOrigin={{
                                        vertical: "top",
                                        horizontal: "right",
                                    }}
                                >
                                    {overflow.map((action) => (
                                        <MenuItem
                                            key={action.key}
                                            disabled={action.disabled}
                                            onClick={() => {
                                                setMenuAnchor(null);
                                                action.onClick?.();
                                            }}
                                        >
                                            {action.icon && (
                                                <ListItemIcon
                                                    sx={{
                                                        color: action.color,
                                                    }}
                                                >
                                                    {action.icon}
                                                </ListItemIcon>
                                            )}
                                            <ListItemText
                                                primaryTypographyProps={{
                                                    fontSize: "0.875rem",
                                                    fontWeight: 500,
                                                    color: action.color,
                                                }}
                                            >
                                                {action.label}
                                            </ListItemText>
                                        </MenuItem>
                                    ))}
                                </Menu>
                            </>
                        )}
                    </Stack>
                </Stack>

                {children && <Box sx={{ mt: 2 }}>{children}</Box>}
            </RiseIn>
        </Box>
    );
}
