import React from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Box,
    Stack,
    Typography,
    Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import useResponsive from "../../../hooks/useResponsive";
import { SlideUpTransition, GrowTransition } from "./motion";

/**
 * The app's standard dialog.
 *
 * Handles the three things every dialog in this app needs to get right and
 * previously did differently in each file:
 *
 *  1. Mobile — goes full screen below `sm` and slides up from the bottom like a
 *     native sheet, instead of a cramped floating box.
 *  2. Scrolling — the title and the action bar are sticky; only the body
 *     scrolls. On a phone the action bar clears the home indicator via
 *     env(safe-area-inset-bottom).
 *  3. Chrome — consistent close button, icon slot, accent bar and subtitle.
 *
 * Props beyond the documented ones are forwarded to MUI's <Dialog>.
 */
export default function ResponsiveDialog({
    open,
    onClose,
    title,
    subtitle,
    icon,
    /** Node rendered in the action bar. Omit for a dialog with no footer. */
    actions,
    children,
    maxWidth = "sm",
    fullWidth = true,
    /** Force full screen regardless of viewport. */
    fullScreen: fullScreenProp,
    /** Accent color for the header rule: theme palette key or a raw color. */
    accent = "primary",
    /** Hide the top-right close button (e.g. a destructive confirm). */
    hideClose = false,
    /** Extra node rendered to the left of the close button. */
    headerAction,
    /** Applied to DialogContent. */
    contentSx = {},
    /** Set false when the body manages its own padding (e.g. a full-bleed image). */
    padded = true,
    ...rest
}) {
    const { isMobile } = useResponsive();
    const fullScreen = fullScreenProp ?? isMobile;

    const accentColor = (theme) => {
        const fromPalette = theme.palette?.[accent]?.main;
        return fromPalette || accent;
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth={maxWidth}
            fullWidth={fullWidth}
            fullScreen={fullScreen}
            TransitionComponent={
                fullScreen ? SlideUpTransition : GrowTransition
            }
            PaperProps={{
                sx: {
                    display: "flex",
                    flexDirection: "column",
                    // A hairline of brand color across the top ties every
                    // dialog in the app together.
                    "&::before": {
                        content: '""',
                        position: "absolute",
                        insetInline: 0,
                        top: 0,
                        height: 3,
                        backgroundColor: accentColor,
                        zIndex: 1,
                    },
                },
            }}
            {...rest}
        >
            {(title || !hideClose) && (
                <>
                    <DialogTitle
                        component="div"
                        sx={{
                            flexShrink: 0,
                            pt: fullScreen ? "calc(18px + env(safe-area-inset-top))" : 2.5,
                        }}
                    >
                        <Stack
                            direction="row"
                            alignItems="flex-start"
                            spacing={1.5}
                        >
                            {icon && (
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                        width: 38,
                                        height: 38,
                                        borderRadius: 2,
                                        bgcolor: (t) =>
                                            t.palette[accent]?.light ||
                                            t.palette.grey[100],
                                        color: accentColor,
                                        animation:
                                            "seaScaleIn 320ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
                                        animationDelay: "60ms",
                                    }}
                                >
                                    {icon}
                                </Box>
                            )}

                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                <Typography
                                    variant="h5"
                                    component="h2"
                                    sx={{
                                        lineHeight: 1.35,
                                        wordBreak: "break-word",
                                    }}
                                >
                                    {title}
                                </Typography>
                                {subtitle && (
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ mt: 0.25 }}
                                    >
                                        {subtitle}
                                    </Typography>
                                )}
                            </Box>

                            <Stack
                                direction="row"
                                spacing={0.5}
                                sx={{ flexShrink: 0, mt: -0.5, mr: -1 }}
                            >
                                {headerAction}
                                {!hideClose && onClose && (
                                    <IconButton
                                        aria-label="Close"
                                        onClick={onClose}
                                        size="small"
                                        sx={{ color: "text.secondary" }}
                                    >
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                )}
                            </Stack>
                        </Stack>
                    </DialogTitle>
                    <Divider sx={{ flexShrink: 0 }} />
                </>
            )}

            <DialogContent
                sx={{
                    flex: "1 1 auto",
                    overflowY: "auto",
                    WebkitOverflowScrolling: "touch",
                    overscrollBehavior: "contain",
                    px: padded ? { xs: 2, sm: 3 } : 0,
                    py: padded ? 2.5 : 0,
                    ...contentSx,
                }}
            >
                {children}
            </DialogContent>

            {actions && (
                <>
                    <Divider sx={{ flexShrink: 0 }} />
                    <DialogActions
                        sx={{
                            flexShrink: 0,
                            px: { xs: 2, sm: 3 },
                            pt: 1.75,
                            pb: {
                                xs: "calc(14px + env(safe-area-inset-bottom))",
                                sm: 2.25,
                            },
                            bgcolor: "background.paper",
                            // On a phone, stack the buttons full width and put
                            // the primary action on top where the thumb is.
                            flexDirection: { xs: "column-reverse", sm: "row" },
                            alignItems: { xs: "stretch", sm: "center" },
                            gap: 1,
                            "& .MuiButton-root": {
                                width: { xs: "100%", sm: "auto" },
                            },
                        }}
                    >
                        {actions}
                    </DialogActions>
                </>
            )}
        </Dialog>
    );
}
