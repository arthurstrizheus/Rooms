import React, { useState } from "react";
import { Dialog, IconButton, Box } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import { FadeTransition } from "../Views/Components/UI/motion";

/**
 * An image that opens full size in a lightbox when clicked.
 *
 * Matches the equipment photo lightbox: the enlarged image sits on a dimmed
 * backdrop with a floating close button, rather than inside a white card.
 */
const ImageViewer = ({ src, alt, style, clickable = true }) => {
    const [dialogOpen, setDialogOpen] = useState(false);

    return (
        <>
            <Box
                sx={{
                    position: "relative",
                    display: "inline-flex",
                    overflow: "hidden",
                    cursor: clickable ? "zoom-in" : "default",
                    "&:hover .image-viewer-overlay": { opacity: 1 },
                }}
                onClick={() => clickable && setDialogOpen(true)}
            >
                <Box
                    component="img"
                    src={src}
                    alt={alt}
                    sx={{
                        display: "block",
                        transition: "transform 320ms cubic-bezier(0.22,1,0.36,1)",
                        ...(clickable && {
                            "&:hover": { transform: "scale(1.02)" },
                        }),
                        ...style,
                    }}
                />

                {clickable && (
                    <Box
                        className="image-viewer-overlay"
                        sx={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: "rgba(20,24,31,0.28)",
                            opacity: 0,
                            transition: "opacity 220ms ease",
                            pointerEvents: "none",
                        }}
                    >
                        <ZoomInIcon
                            sx={{ fontSize: 28, color: "common.white" }}
                        />
                    </Box>
                )}
            </Box>

            {clickable && (
                <Dialog
                    open={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                    maxWidth={false}
                    TransitionComponent={FadeTransition}
                    PaperProps={{
                        sx: {
                            bgcolor: "transparent",
                            boxShadow: "none",
                            m: { xs: 1, sm: 3 },
                            maxWidth: "min(1200px, 96vw)",
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
                    <Box sx={{ position: "relative", lineHeight: 0 }}>
                        <Box
                            component="img"
                            src={src}
                            alt={`${alt} — full size`}
                            sx={{
                                display: "block",
                                width: "100%",
                                height: "auto",
                                maxHeight: "90vh",
                                objectFit: "contain",
                                borderRadius: 2,
                            }}
                        />
                        <IconButton
                            aria-label="Close"
                            onClick={() => setDialogOpen(false)}
                            sx={{
                                position: "absolute",
                                top: 10,
                                right: 10,
                                bgcolor: "rgba(20,24,31,0.55)",
                                color: "common.white",
                                backdropFilter: "blur(8px)",
                                "&:hover": { bgcolor: "rgba(20,24,31,0.78)" },
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </Dialog>
            )}
        </>
    );
};

export default ImageViewer;
