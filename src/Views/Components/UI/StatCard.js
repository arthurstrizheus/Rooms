import React from "react";
import { Card, Box, Stack, Typography, Skeleton } from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { useTheme } from "@mui/material/styles";
import { hoverLift } from "./motion";

/**
 * A single headline number — dashboards, usage reports, approval counts.
 *
 * The value animates up on mount so a row of these reads as one motion, and
 * `trend` renders a signed delta with the sensible color (down is not always
 * bad, hence `invertTrend`).
 */
export default function StatCard({
    label,
    value,
    /** Small text under the value (e.g. "vs. last month"). */
    hint,
    icon,
    /** Palette key used to tint the icon chip: primary | success | warning | info | error */
    tone = "primary",
    /** Signed number; renders an arrow + percentage. */
    trend,
    /** For metrics where a decrease is good (e.g. overdue items). */
    invertTrend = false,
    loading = false,
    onClick,
    sx = {},
}) {
    const theme = useTheme();
    const clickable = Boolean(onClick);

    const trendPositive = trend > 0;
    const trendGood = invertTrend ? !trendPositive : trendPositive;
    const trendColor =
        trend === 0 || trend == null
            ? "text.secondary"
            : trendGood
              ? "success.main"
              : "error.main";

    return (
        <Card
            onClick={onClick}
            sx={{
                position: "relative",
                p: { xs: 2, sm: 2.5 },
                height: "100%",
                cursor: clickable ? "pointer" : "default",
                overflow: "hidden",
                ...(clickable ? hoverLift(theme) : {}),
                // Faint accent wash bleeding in from the top-right.
                "&::after": {
                    content: '""',
                    position: "absolute",
                    top: -40,
                    right: -40,
                    width: 130,
                    height: 130,
                    borderRadius: "50%",
                    background: theme.palette[tone]?.main || tone,
                    opacity: 0.05,
                    pointerEvents: "none",
                },
                ...sx,
            }}
        >
            <Stack
                direction="row"
                alignItems="flex-start"
                justifyContent="space-between"
                spacing={1.5}
            >
                <Box sx={{ minWidth: 0 }}>
                    <Typography
                        variant="overline"
                        sx={{
                            color: "text.secondary",
                            display: "block",
                            mb: 0.75,
                            lineHeight: 1.3,
                        }}
                    >
                        {label}
                    </Typography>

                    {loading ? (
                        <Skeleton width={92} height={38} />
                    ) : (
                        <Typography
                            sx={{
                                fontSize: { xs: "1.65rem", sm: "1.875rem" },
                                fontWeight: 700,
                                lineHeight: 1.1,
                                letterSpacing: "-0.03em",
                                // Numerals line up in a column of cards.
                                fontVariantNumeric: "tabular-nums",
                                animation:
                                    "seaRiseIn 420ms cubic-bezier(0.22, 1, 0.36, 1) both",
                            }}
                        >
                            {value}
                        </Typography>
                    )}

                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={0.5}
                        sx={{ mt: 0.75, minHeight: 18 }}
                    >
                        {trend != null && !loading && (
                            <>
                                {trendPositive ? (
                                    <ArrowUpwardIcon
                                        sx={{ fontSize: 14, color: trendColor }}
                                    />
                                ) : (
                                    <ArrowDownwardIcon
                                        sx={{ fontSize: 14, color: trendColor }}
                                    />
                                )}
                                <Typography
                                    variant="caption"
                                    sx={{ color: trendColor, fontWeight: 700 }}
                                >
                                    {Math.abs(trend)}%
                                </Typography>
                            </>
                        )}
                        {hint && (
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                noWrap
                            >
                                {hint}
                            </Typography>
                        )}
                    </Stack>
                </Box>

                {icon && (
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 40,
                            height: 40,
                            borderRadius: 2.25,
                            flexShrink: 0,
                            color: `${tone}.main`,
                            bgcolor: theme.palette[tone]?.light || "grey.100",
                            "& svg": { fontSize: 21 },
                            animation:
                                "seaScaleIn 380ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
                            animationDelay: "80ms",
                        }}
                    >
                        {icon}
                    </Box>
                )}
            </Stack>
        </Card>
    );
}
