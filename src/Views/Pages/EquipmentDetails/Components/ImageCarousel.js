import React, { useRef, useEffect } from "react";
import { Box, Typography, IconButton, Stack, Fade } from "@mui/material";
import { Delete, ChevronLeft, ChevronRight, ZoomIn } from "@mui/icons-material";

/**
 * Equipment photos: one large hero plus a thumbnail strip.
 *
 * The previous version showed a row of equally-sized thumbnails and required a
 * double click within two seconds to enlarge — which meant most people never
 * found the full-size view. Now a thumbnail selects and the hero enlarges, so
 * each target does exactly one thing.
 *
 * Swipe works on the hero; arrows appear on hover on pointer devices and stay
 * visible on touch.
 */
const ImageCarousel = ({
    imageFiles,
    currentImageIndex,
    setCurrentImageIndex,
    setEnlargedImage,
    canEditDelete,
    handleDeleteFile,
}) => {
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);
    const stripRef = useRef(null);

    const count = imageFiles.length;
    // Guard against an index left over from a longer list.
    const index = Math.min(currentImageIndex, Math.max(count - 1, 0));
    const current = imageFiles[index];

    // Keep the active thumbnail in view as the selection moves.
    useEffect(() => {
        const strip = stripRef.current;
        const thumb = strip?.querySelector(`[data-thumb="${index}"]`);
        if (!strip || !thumb) return;
        strip.scrollTo({
            left:
                thumb.offsetLeft -
                strip.clientWidth / 2 +
                thumb.offsetWidth / 2,
            behavior: "smooth",
        });
    }, [index, count]);

    if (count === 0) return null;

    const goTo = (next) => setCurrentImageIndex((next + count) % count);
    const handlePrevious = () => goTo(index - 1);
    const handleNext = () => goTo(index + 1);

    const handleTouchEnd = () => {
        const distance = touchStartX.current - touchEndX.current;
        if (Math.abs(distance) < 50) return;
        if (distance > 0) handleNext();
        else handlePrevious();
    };

    const arrowSx = {
        position: "absolute",
        top: "50%",
        transform: "translateY(-50%)",
        width: 36,
        height: 36,
        bgcolor: "rgba(255,255,255,0.92)",
        color: "text.primary",
        boxShadow: (t) => t.shadowTokens.md,
        backdropFilter: "blur(6px)",
        opacity: { xs: 1, md: 0 },
        transition: "opacity 200ms ease, background-color 160ms ease",
        "&:hover": { bgcolor: "common.white" },
    };

    return (
        <Box>
            {/* ---- Hero ---- */}
            <Box
                onTouchStart={(e) => {
                    touchStartX.current = e.touches[0].clientX;
                    touchEndX.current = e.touches[0].clientX;
                }}
                onTouchMove={(e) => {
                    touchEndX.current = e.touches[0].clientX;
                }}
                onTouchEnd={handleTouchEnd}
                sx={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "16 / 10",
                    bgcolor: "grey.100",
                    overflow: "hidden",
                    cursor: "zoom-in",
                    touchAction: "pan-y",
                    "&:hover .carousel-arrow": { opacity: 1 },
                    "&:hover .carousel-zoom": { opacity: 1 },
                }}
                onClick={() => setEnlargedImage(current)}
            >
                {/* Keyed so each photo cross-fades instead of snapping. */}
                <Fade in key={current?.id} timeout={280}>
                    <Box
                        component="img"
                        src={`/uploads/${current?.file_path}`}
                        alt={current?.file_name || "Equipment photo"}
                        sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                        }}
                    />
                </Fade>

                {/* Zoom affordance */}
                <Box
                    className="carousel-zoom"
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
                    <ZoomIn sx={{ fontSize: 38, color: "common.white" }} />
                </Box>

                {/* Counter */}
                <Box
                    sx={{
                        position: "absolute",
                        left: 10,
                        bottom: 10,
                        px: 1,
                        py: 0.25,
                        borderRadius: 5,
                        bgcolor: "rgba(20,24,31,0.62)",
                        backdropFilter: "blur(6px)",
                    }}
                >
                    <Typography
                        variant="caption"
                        sx={{
                            color: "common.white",
                            fontWeight: 700,
                            fontVariantNumeric: "tabular-nums",
                        }}
                    >
                        {index + 1} / {count}
                    </Typography>
                </Box>

                {canEditDelete() && (
                    <IconButton
                        size="small"
                        aria-label="Delete photo"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(current.id);
                        }}
                        sx={{
                            position: "absolute",
                            top: 10,
                            right: 10,
                            bgcolor: "rgba(20,24,31,0.62)",
                            color: "common.white",
                            backdropFilter: "blur(6px)",
                            "&:hover": { bgcolor: "error.main" },
                        }}
                    >
                        <Delete sx={{ fontSize: 17 }} />
                    </IconButton>
                )}

                {count > 1 && (
                    <>
                        <IconButton
                            className="carousel-arrow"
                            aria-label="Previous photo"
                            onClick={(e) => {
                                e.stopPropagation();
                                handlePrevious();
                            }}
                            sx={{ ...arrowSx, left: 10 }}
                        >
                            <ChevronLeft />
                        </IconButton>
                        <IconButton
                            className="carousel-arrow"
                            aria-label="Next photo"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleNext();
                            }}
                            sx={{ ...arrowSx, right: 10 }}
                        >
                            <ChevronRight />
                        </IconButton>
                    </>
                )}
            </Box>

            {/* ---- Thumbnails ---- */}
            {count > 1 && (
                <Stack
                    ref={stripRef}
                    direction="row"
                    spacing={1}
                    sx={{
                        px: 2,
                        py: 1.5,
                        overflowX: "auto",
                        scrollSnapType: "x proximity",
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        "&::-webkit-scrollbar": { display: "none" },
                        scrollbarWidth: "none",
                    }}
                >
                    {imageFiles.map((file, i) => {
                        const selected = i === index;
                        return (
                            <Box
                                key={file.id}
                                data-thumb={i}
                                component="button"
                                type="button"
                                aria-label={`Show photo ${i + 1}`}
                                aria-pressed={selected}
                                onClick={() => setCurrentImageIndex(i)}
                                sx={{
                                    flexShrink: 0,
                                    width: 56,
                                    height: 56,
                                    p: 0,
                                    borderRadius: 2,
                                    overflow: "hidden",
                                    cursor: "pointer",
                                    scrollSnapAlign: "center",
                                    border: "2px solid",
                                    borderColor: selected
                                        ? "primary.main"
                                        : "transparent",
                                    opacity: selected ? 1 : 0.6,
                                    transition:
                                        "opacity 200ms ease, border-color 200ms ease, transform 200ms cubic-bezier(0.22,1,0.36,1)",
                                    "&:hover": {
                                        opacity: 1,
                                        transform: "translateY(-2px)",
                                    },
                                }}
                            >
                                <Box
                                    component="img"
                                    src={`/uploads/${file.file_path}`}
                                    alt=""
                                    sx={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                        display: "block",
                                    }}
                                />
                            </Box>
                        );
                    })}
                </Stack>
            )}
        </Box>
    );
};

export default ImageCarousel;
