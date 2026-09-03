import React from "react";
import { Dialog, Box, IconButton, Typography, Fade } from "@mui/material";
import { Close, ChevronLeft, ChevronRight } from "@mui/icons-material";
import { FadeTransition } from "../../../Components/UI/motion";

/**
 * Full-size photo lightbox.
 *
 * Chromeless by design: the image sits on a dimmed backdrop with the controls
 * floating over it, rather than inside a white dialog card. Arrow keys are
 * handled by the parent page.
 */
const EnlargedImageDialog = ({
    enlargedImage,
    setEnlargedImage,
    imageFiles,
    currentImageIndex,
    setCurrentImageIndex,
}) => {
    const step = (delta) => {
        const next =
            (currentImageIndex + delta + imageFiles.length) % imageFiles.length;
        setCurrentImageIndex(next);
        setEnlargedImage(imageFiles[next]);
    };

    const controlSx = {
        position: "absolute",
        bgcolor: "rgba(20,24,31,0.55)",
        color: "common.white",
        backdropFilter: "blur(8px)",
        "&:hover": { bgcolor: "rgba(20,24,31,0.78)" },
    };

    return (
        <Dialog
            open={Boolean(enlargedImage)}
            onClose={() => setEnlargedImage(null)}
            maxWidth={false}
            TransitionComponent={FadeTransition}
            PaperProps={{
                sx: {
                    bgcolor: "transparent",
                    boxShadow: "none",
                    m: { xs: 1, sm: 3 },
                    maxWidth: "min(1400px, 96vw)",
                    maxHeight: "94vh",
                    overflow: "visible",
                    "&::before": { display: "none" },
                },
            }}
            slotProps={{
                backdrop: {
                    sx: {
                        bgcolor: "rgba(10,12,16,0.88)",
                        backdropFilter: "blur(6px)",
                    },
                },
            }}
        >
            {enlargedImage && (
                <Box sx={{ position: "relative", lineHeight: 0 }}>
                    <Fade in key={enlargedImage.id} timeout={240}>
                        <Box
                            component="img"
                            src={`/uploads/${enlargedImage.file_path}`}
                            alt={enlargedImage.file_name}
                            sx={{
                                display: "block",
                                width: "100%",
                                height: "auto",
                                maxHeight: "90vh",
                                objectFit: "contain",
                                borderRadius: 2,
                            }}
                        />
                    </Fade>

                    <IconButton
                        aria-label="Close"
                        onClick={() => setEnlargedImage(null)}
                        sx={{ ...controlSx, top: 10, right: 10 }}
                    >
                        <Close />
                    </IconButton>

                    {imageFiles.length > 1 && (
                        <>
                            <IconButton
                                aria-label="Previous photo"
                                onClick={() => step(-1)}
                                sx={{
                                    ...controlSx,
                                    left: 10,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                }}
                            >
                                <ChevronLeft sx={{ fontSize: 26 }} />
                            </IconButton>
                            <IconButton
                                aria-label="Next photo"
                                onClick={() => step(1)}
                                sx={{
                                    ...controlSx,
                                    right: 10,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                }}
                            >
                                <ChevronRight sx={{ fontSize: 26 }} />
                            </IconButton>

                            <Box
                                sx={{
                                    ...controlSx,
                                    bottom: 14,
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                    px: 1.5,
                                    py: 0.5,
                                    borderRadius: 5,
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontWeight: 700,
                                        fontVariantNumeric: "tabular-nums",
                                    }}
                                >
                                    {currentImageIndex + 1} /{" "}
                                    {imageFiles.length}
                                </Typography>
                            </Box>
                        </>
                    )}
                </Box>
            )}
        </Dialog>
    );
};

export default EnlargedImageDialog;
