import React from "react";
import { Box, Card, Skeleton, Stack, Grid } from "@mui/material";

// ============================================================================
// Loading placeholders
// ----------------------------------------------------------------------------
// Shaped like the content they replace, so the page doesn't reflow when data
// lands. Prefer these over a centered spinner: a spinner tells the user
// nothing about what's coming.
// ============================================================================

export function CardSkeleton({ height = 220 }) {
    return (
        <Card sx={{ p: 0, overflow: "hidden" }}>
            <Skeleton variant="rectangular" height={height * 0.55} />
            <Box sx={{ p: 2 }}>
                <Skeleton width="70%" height={22} />
                <Skeleton width="45%" height={18} sx={{ mt: 0.5 }} />
                <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                    <Skeleton variant="rounded" width={64} height={22} />
                    <Skeleton variant="rounded" width={48} height={22} />
                </Stack>
            </Box>
        </Card>
    );
}

export function CardGridSkeleton({ count = 8, height = 220 }) {
    return (
        <Grid container spacing={{ xs: 2, sm: 2.5 }}>
            {Array.from({ length: count }).map((_, i) => (
                <Grid
                    item
                    xs={12}
                    sm={6}
                    md={4}
                    lg={3}
                    key={i}
                    sx={{
                        animation: "seaFadeIn 300ms ease both",
                        animationDelay: `${i * 35}ms`,
                    }}
                >
                    <CardSkeleton height={height} />
                </Grid>
            ))}
        </Grid>
    );
}

export function RowSkeleton({ count = 6, height = 60 }) {
    return (
        <Stack spacing={1}>
            {Array.from({ length: count }).map((_, i) => (
                <Skeleton
                    key={i}
                    variant="rounded"
                    height={height}
                    sx={{
                        animation: "seaFadeIn 300ms ease both",
                        animationDelay: `${i * 45}ms`,
                    }}
                />
            ))}
        </Stack>
    );
}

export function StatRowSkeleton({ count = 4 }) {
    return (
        <Grid container spacing={2}>
            {Array.from({ length: count }).map((_, i) => (
                <Grid item xs={6} md={12 / count} key={i}>
                    <Skeleton variant="rounded" height={104} />
                </Grid>
            ))}
        </Grid>
    );
}

export function DetailSkeleton() {
    return (
        <Stack spacing={2.5}>
            <Skeleton variant="rounded" height={180} />
            <Grid container spacing={2.5}>
                <Grid item xs={12} md={7}>
                    <Skeleton variant="rounded" height={280} />
                </Grid>
                <Grid item xs={12} md={5}>
                    <Stack spacing={2.5}>
                        <Skeleton variant="rounded" height={130} />
                        <Skeleton variant="rounded" height={130} />
                    </Stack>
                </Grid>
            </Grid>
        </Stack>
    );
}
