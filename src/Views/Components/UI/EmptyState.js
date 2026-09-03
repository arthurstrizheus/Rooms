import React from "react";
import { Box, Typography, Button, Stack } from "@mui/material";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import { RiseIn } from "./motion";

/**
 * The "nothing here" state.
 *
 * Used for empty lists, cleared filters and error fallbacks so a blank screen
 * always explains itself and offers a way forward.
 */
export default function EmptyState({
    icon,
    title = "Nothing here yet",
    description,
    /** { label, onClick, icon } */
    action,
    secondaryAction,
    /** "default" | "compact" — compact drops the illustration ring. */
    variant = "default",
    sx = {},
}) {
    const compact = variant === "compact";

    return (
        <RiseIn
            sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                px: 3,
                py: compact ? 4 : { xs: 6, sm: 9 },
                ...sx,
            }}
        >
            {!compact && (
                <Box
                    sx={{
                        width: 76,
                        height: 76,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mb: 2.5,
                        color: "primary.main",
                        bgcolor: "primary.50",
                        // Concentric ring, drawn with a spread shadow rather
                        // than an extra element.
                        boxShadow: (t) =>
                            `0 0 0 10px ${t.palette.primary[50]}55`,
                        "& svg": { fontSize: 34 },
                        animation:
                            "seaScaleIn 420ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
                    }}
                >
                    {icon || <InboxOutlinedIcon />}
                </Box>
            )}

            <Typography variant="h5" sx={{ mb: description ? 0.75 : 0 }}>
                {title}
            </Typography>

            {description && (
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ maxWidth: 420 }}
                >
                    {description}
                </Typography>
            )}

            {(action || secondaryAction) && (
                <Stack
                    direction={{ xs: "column-reverse", sm: "row" }}
                    spacing={1.25}
                    sx={{ mt: 3, width: { xs: "100%", sm: "auto" }, maxWidth: 320 }}
                >
                    {secondaryAction && (
                        <Button
                            variant="outlined"
                            onClick={secondaryAction.onClick}
                            startIcon={secondaryAction.icon}
                            fullWidth
                        >
                            {secondaryAction.label}
                        </Button>
                    )}
                    {action && (
                        <Button
                            variant="contained"
                            onClick={action.onClick}
                            startIcon={action.icon}
                            fullWidth
                        >
                            {action.label}
                        </Button>
                    )}
                </Stack>
            )}
        </RiseIn>
    );
}
