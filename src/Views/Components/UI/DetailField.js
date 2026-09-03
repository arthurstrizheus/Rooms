import React from "react";
import { Box, Typography, Stack } from "@mui/material";

/**
 * A label/value pair.
 *
 * Detail pages were repeating a two-Typography block dozens of times with
 * slightly different spacing each time. This is that block, once: uppercase
 * micro-label above, value below, em dash when there's nothing to show.
 */
export default function DetailField({
    label,
    value,
    icon,
    /** Rendered instead of the value text — chips, links, custom nodes. */
    children,
    /** Monospaced value, for serials and codes. */
    mono = false,
    /** Hide entirely when there's no value. */
    hideEmpty = false,
    sx = {},
}) {
    const isEmpty =
        !children && (value === null || value === undefined || value === "");

    if (hideEmpty && isEmpty) return null;

    return (
        <Box sx={{ minWidth: 0, ...sx }}>
            <Stack direction="row" spacing={0.75} alignItems="center">
                {icon && (
                    <Box
                        sx={{
                            display: "flex",
                            color: "text.disabled",
                            "& svg": { fontSize: 14 },
                        }}
                    >
                        {icon}
                    </Box>
                )}
                <Typography
                    variant="overline"
                    sx={{
                        color: "text.secondary",
                        fontSize: "0.6875rem",
                        letterSpacing: "0.06em",
                        lineHeight: 1.4,
                    }}
                >
                    {label}
                </Typography>
            </Stack>

            {children || (
                <Typography
                    variant="body2"
                    sx={{
                        mt: 0.25,
                        fontWeight: 550,
                        color: isEmpty ? "text.disabled" : "text.primary",
                        wordBreak: "break-word",
                        ...(mono && {
                            fontFamily: (t) => t.typography.fontFamilyMono,
                            fontSize: "0.8125rem",
                        }),
                    }}
                >
                    {isEmpty ? "—" : value}
                </Typography>
            )}
        </Box>
    );
}
