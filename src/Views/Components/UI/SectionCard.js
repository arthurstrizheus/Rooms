import React from "react";
import {
    Card,
    CardContent,
    Box,
    Stack,
    Typography,
    Divider,
    Collapse,
    IconButton,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useTheme } from "@mui/material/styles";
import { hoverLift } from "./motion";

/**
 * A titled content card — the workhorse surface for detail pages.
 *
 * Supersedes the old MainCard/SubCard pair: one component with an icon slot,
 * an action slot, optional collapsing and consistent internal padding.
 */
export default function SectionCard({
    title,
    subtitle,
    icon,
    /** Node rendered at the right of the header (buttons, chips, menus). */
    action,
    children,
    /** Adds a lift on hover. Only for cards that are themselves clickable. */
    interactive = false,
    /** Renders a collapse toggle in the header. */
    collapsible = false,
    defaultExpanded = true,
    /** Removes CardContent padding — for tables that go edge to edge. */
    disablePadding = false,
    /** Tint the header strip with an accent color. */
    accent,
    footer,
    sx = {},
    contentSx = {},
    ...rest
}) {
    const theme = useTheme();
    const [expanded, setExpanded] = React.useState(defaultExpanded);
    const hasHeader = Boolean(title || action || icon);

    const body = (
        <>
            {disablePadding ? (
                <Box sx={contentSx}>{children}</Box>
            ) : (
                <CardContent
                    sx={{
                        px: { xs: 2, sm: 2.5 },
                        py: { xs: 2, sm: 2.5 },
                        "&:last-child": { pb: { xs: 2, sm: 2.5 } },
                        ...contentSx,
                    }}
                >
                    {children}
                </CardContent>
            )}
            {footer && (
                <>
                    <Divider />
                    <Box
                        sx={{
                            px: { xs: 2, sm: 2.5 },
                            py: 1.5,
                            bgcolor: "grey.50",
                        }}
                    >
                        {footer}
                    </Box>
                </>
            )}
        </>
    );

    return (
        <Card
            sx={{
                display: "flex",
                flexDirection: "column",
                ...(interactive ? hoverLift(theme) : {}),
                ...sx,
            }}
            {...rest}
        >
            {hasHeader && (
                <>
                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1.5}
                        onClick={
                            collapsible ? () => setExpanded((v) => !v) : undefined
                        }
                        sx={{
                            px: { xs: 2, sm: 2.5 },
                            py: 1.75,
                            cursor: collapsible ? "pointer" : "default",
                            userSelect: collapsible ? "none" : "auto",
                            transition: "background-color 160ms ease",
                            ...(collapsible && {
                                "&:hover": { bgcolor: "grey.50" },
                            }),
                            ...(accent && {
                                borderLeft: "3px solid",
                                borderColor: accent,
                            }),
                        }}
                    >
                        {icon && (
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 32,
                                    height: 32,
                                    borderRadius: 1.75,
                                    flexShrink: 0,
                                    color: "primary.main",
                                    bgcolor: "primary.50",
                                    "& svg": { fontSize: 18 },
                                }}
                            >
                                {icon}
                            </Box>
                        )}

                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography variant="h6" noWrap>
                                {title}
                            </Typography>
                            {subtitle && (
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: "block" }}
                                >
                                    {subtitle}
                                </Typography>
                            )}
                        </Box>

                        {action && (
                            <Box
                                sx={{ flexShrink: 0 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {action}
                            </Box>
                        )}

                        {collapsible && (
                            <IconButton
                                size="small"
                                aria-label={expanded ? "Collapse" : "Expand"}
                                sx={{
                                    transition:
                                        "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)",
                                    transform: expanded
                                        ? "rotate(180deg)"
                                        : "rotate(0deg)",
                                }}
                            >
                                <ExpandMoreIcon fontSize="small" />
                            </IconButton>
                        )}
                    </Stack>
                    <Divider />
                </>
            )}

            {collapsible ? (
                <Collapse in={expanded} timeout={280} unmountOnExit>
                    {body}
                </Collapse>
            ) : (
                body
            )}
        </Card>
    );
}
