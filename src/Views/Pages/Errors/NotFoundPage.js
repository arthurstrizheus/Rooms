import React from "react";
import { Box, Typography, Button, Stack } from "@mui/material";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import { useNavigate } from "react-router-dom";

/**
 * 404 / not-authorized fallback.
 *
 * Also rendered when a route exists but the signed-in user lacks the role for
 * it, so the copy deliberately covers both cases.
 */
const NotFoundPage = () => {
    const navigate = useNavigate();

    return (
        <Box
            sx={{
                flexGrow: 1,
                minHeight: "60vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                px: 3,
                py: 6,
                position: "relative",
                overflow: "hidden",
            }}
        >
            {/* Soft brand wash behind the numerals. */}
            <Box
                aria-hidden
                sx={{
                    position: "absolute",
                    width: 460,
                    height: 460,
                    borderRadius: "50%",
                    bgcolor: "primary.50",
                    opacity: 0.55,
                    filter: "blur(8px)",
                    pointerEvents: "none",
                }}
            />

            <Stack alignItems="center" sx={{ position: "relative" }}>
                <Typography
                    aria-hidden
                    sx={{
                        fontSize: { xs: "5.5rem", sm: "8rem" },
                        fontWeight: 800,
                        lineHeight: 1,
                        letterSpacing: "-0.05em",
                        color: "primary.main",
                        opacity: 0.16,
                        animation:
                            "seaScaleIn 600ms cubic-bezier(0.22, 1, 0.36, 1) both",
                    }}
                >
                    404
                </Typography>

                <Typography
                    variant="h2"
                    align="center"
                    sx={{
                        mt: -2,
                        fontSize: { xs: "1.5rem", sm: "1.875rem" },
                        animation:
                            "seaRiseIn 520ms cubic-bezier(0.22, 1, 0.36, 1) both",
                        animationDelay: "80ms",
                    }}
                >
                    We can't find that page
                </Typography>

                <Typography
                    variant="body1"
                    color="text.secondary"
                    align="center"
                    sx={{
                        mt: 1.5,
                        maxWidth: 460,
                        animation:
                            "seaRiseIn 520ms cubic-bezier(0.22, 1, 0.36, 1) both",
                        animationDelay: "150ms",
                    }}
                >
                    The page may have moved, or you may not have access to it.
                    Check the address, or head back to the equipment catalog.
                </Typography>

                <Stack
                    direction={{ xs: "column-reverse", sm: "row" }}
                    spacing={1.25}
                    sx={{
                        mt: 4,
                        width: { xs: "100%", sm: "auto" },
                        maxWidth: 340,
                        animation:
                            "seaRiseIn 520ms cubic-bezier(0.22, 1, 0.36, 1) both",
                        animationDelay: "220ms",
                    }}
                >
                    <Button
                        variant="outlined"
                        startIcon={<ArrowBackIosNewIcon sx={{ fontSize: 14 }} />}
                        onClick={() => navigate(-1)}
                        fullWidth
                    >
                        Go back
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<HomeOutlinedIcon />}
                        onClick={() => navigate("/equipment")}
                        fullWidth
                    >
                        Equipment
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
};

export default NotFoundPage;
