import React, { useRef, useEffect } from "react";
import {
    Box,
    Typography,
    IconButton,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import { Delete, ChevronLeft, ChevronRight, ZoomIn } from "@mui/icons-material";

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
    const containerRef = useRef(null);
    const lastClickTime = useRef(0);
    const lastClickIndex = useRef(null);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    // Center the current image on mount and when currentImageIndex changes
    useEffect(() => {
        const timer = setTimeout(() => {
            const element = document.getElementById(
                `carousel-img-${currentImageIndex}`
            );
            const container = document.getElementById(
                "carousel-scroll-container"
            );
            if (element && container) {
                const scrollLeft =
                    element.offsetLeft -
                    container.clientWidth / 2 +
                    element.offsetWidth / 2;
                container.scrollTo({
                    left: scrollLeft,
                    behavior: "auto", // Instant scroll on mount
                });
            }
        }, 200);
        return () => clearTimeout(timer);
    }, [currentImageIndex, imageFiles.length]);

    if (imageFiles.length === 0) return null;

    const handlePrevious = () => {
        const newIndex =
            currentImageIndex === 0
                ? imageFiles.length - 1
                : currentImageIndex - 1;
        setCurrentImageIndex(newIndex);
        setTimeout(() => {
            const element = document.getElementById(`carousel-img-${newIndex}`);
            const container = document.getElementById(
                "carousel-scroll-container"
            );
            if (element && container) {
                const scrollLeft =
                    element.offsetLeft -
                    container.clientWidth / 2 +
                    element.offsetWidth / 2;
                container.scrollTo({
                    left: scrollLeft,
                    behavior: "smooth",
                });
            }
        }, 100);
    };

    const handleNext = () => {
        const newIndex =
            currentImageIndex === imageFiles.length - 1
                ? 0
                : currentImageIndex + 1;
        setCurrentImageIndex(newIndex);
        setTimeout(() => {
            const element = document.getElementById(`carousel-img-${newIndex}`);
            const container = document.getElementById(
                "carousel-scroll-container"
            );
            if (element && container) {
                const scrollLeft =
                    element.offsetLeft -
                    container.clientWidth / 2 +
                    element.offsetWidth / 2;
                container.scrollTo({
                    left: scrollLeft,
                    behavior: "smooth",
                });
            }
        }, 100);
    };

    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e) => {
        touchEndX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
        const swipeThreshold = 50; // minimum distance for a swipe
        const swipeDistance = touchStartX.current - touchEndX.current;

        if (Math.abs(swipeDistance) > swipeThreshold) {
            if (swipeDistance > 0) {
                // Swiped left - go to next
                handleNext();
            } else {
                // Swiped right - go to previous
                handlePrevious();
            }
        }
    };

    const handleImageClick = (file, index) => {
        const now = Date.now();
        const timeSinceLastClick = now - lastClickTime.current;

        // If clicking the same image within 2 seconds, enlarge it
        if (lastClickIndex.current === index && timeSinceLastClick < 2000) {
            setEnlargedImage(file);
            lastClickTime.current = 0; // Reset to prevent triple-click issues
            lastClickIndex.current = null;
        } else {
            // First click or different image = select and center
            lastClickTime.current = now;
            lastClickIndex.current = index;
            setCurrentImageIndex(index);

            // Center the clicked image
            setTimeout(() => {
                const element = document.getElementById(
                    `carousel-img-${index}`
                );
                const container = document.getElementById(
                    "carousel-scroll-container"
                );
                if (element && container) {
                    const scrollLeft =
                        element.offsetLeft -
                        container.clientWidth / 2 +
                        element.offsetWidth / 2;
                    container.scrollTo({
                        left: scrollLeft,
                        behavior: "smooth",
                    });
                }
            }, 100);
        }
    };

    return (
        <Box sx={{ mb: 1 }}>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <Typography
                    variant="subtitle2"
                    sx={{
                        color: "text.secondary",
                        fontWeight: 600,
                    }}
                >
                    Images ({currentImageIndex + 1} of {imageFiles.length})
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <ZoomIn sx={{ fontSize: 16, color: "text.secondary" }} />
                    <Typography variant="caption" color="text.secondary">
                        Click image to enlarge
                    </Typography>
                </Box>
            </Box>

            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                }}
            >
                {!isMobile && (
                    <IconButton
                        onClick={handlePrevious}
                        disabled={imageFiles.length <= 1}
                        sx={{
                            flexShrink: 0,
                            width: 44,
                            height: 44,
                            bgcolor: "primary.main",
                            color: "white",
                            boxShadow: 2,
                            "&:hover": {
                                bgcolor: "primary.dark",
                                boxShadow: 4,
                                transform: "scale(1.05)",
                            },
                            "&:active": {
                                transform: "scale(0.95)",
                            },
                            "&.Mui-disabled": {
                                bgcolor: "grey.300",
                                color: "grey.500",
                            },
                            transition: "all 0.2s ease",
                        }}
                    >
                        <ChevronLeft sx={{ fontSize: 28 }} />
                    </IconButton>
                )}

                <Box
                    ref={containerRef}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    sx={{
                        position: "relative",
                        flex: 1,
                        overflow: "hidden",
                        height: 140,
                        touchAction: "pan-y", // Allow vertical scrolling but handle horizontal
                    }}
                >
                    {/* Image container */}
                    <Box
                        id="carousel-scroll-container"
                        sx={{
                            display: "flex",
                            gap: 1.5,
                            overflowX: "auto",
                            scrollBehavior: "smooth",
                            height: "100%",
                            alignItems: "center",
                            "&::-webkit-scrollbar": {
                                display: "none",
                            },
                            msOverflowStyle: "none",
                            scrollbarWidth: "none",
                        }}
                    >
                        {/* Spacer to allow first image to center */}
                        <Box
                            sx={{ flexShrink: 0, width: "calc(50% - 60px)" }}
                        />

                        {imageFiles.map((file, index) => {
                            const isSelected = currentImageIndex === index;
                            return (
                                <Box
                                    key={file.id}
                                    id={`carousel-img-${index}`}
                                    onClick={() =>
                                        handleImageClick(file, index)
                                    }
                                    sx={{
                                        position: "relative",
                                        flexShrink: 0,
                                        width: isSelected ? 120 : 90,
                                        height: isSelected ? 120 : 90,
                                        border: isSelected
                                            ? "3px solid"
                                            : "2px solid",
                                        borderColor: isSelected
                                            ? "primary.main"
                                            : "grey.300",
                                        borderRadius: 2,
                                        overflow: "hidden",
                                        cursor: "pointer",
                                        transition:
                                            "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                        opacity: isSelected ? 1 : 0.6,
                                        transform: isSelected
                                            ? "scale(1)"
                                            : "scale(0.9)",
                                        boxShadow: isSelected
                                            ? "0 8px 24px rgba(25, 118, 210, 0.25)"
                                            : "0 2px 8px rgba(0,0,0,0.1)",
                                        bgcolor: "white",
                                        "&:hover": {
                                            opacity: 1,
                                            transform: isSelected
                                                ? "scale(1.02)"
                                                : "scale(0.92)",
                                            boxShadow: isSelected
                                                ? "0 12px 32px rgba(25, 118, 210, 0.3)"
                                                : "0 4px 16px rgba(0,0,0,0.15)",
                                            borderColor: isSelected
                                                ? "primary.dark"
                                                : "grey.400",
                                        },
                                        "&:active": {
                                            transform: "scale(0.98)",
                                        },
                                    }}
                                >
                                    <img
                                        src={`${process.env.REACT_APP_SERVER_URL}/uploads/${file.file_path}`}
                                        alt={file.file_name}
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                        }}
                                    />
                                    {isSelected && (
                                        <Box
                                            sx={{
                                                position: "absolute",
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                                bgcolor: "rgba(0, 0, 0, 0)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                opacity: 0,
                                                transition: "opacity 0.2s ease",
                                                "&:hover": {
                                                    opacity: 1,
                                                    bgcolor:
                                                        "rgba(0, 0, 0, 0.4)",
                                                },
                                            }}
                                        >
                                            <ZoomIn
                                                sx={{
                                                    fontSize: 40,
                                                    color: "white",
                                                    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
                                                }}
                                            />
                                        </Box>
                                    )}
                                    {canEditDelete() && isSelected && (
                                        <IconButton
                                            size="small"
                                            sx={{
                                                position: "absolute",
                                                top: 6,
                                                right: 6,
                                                width: 32,
                                                height: 32,
                                                backgroundColor:
                                                    "rgba(0, 0, 0, 0.7)",
                                                color: "white",
                                                boxShadow: 2,
                                                "&:hover": {
                                                    backgroundColor:
                                                        "error.main",
                                                    transform: "scale(1.1)",
                                                },
                                                transition: "all 0.2s ease",
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteFile(file.id);
                                            }}
                                        >
                                            <Delete sx={{ fontSize: 18 }} />
                                        </IconButton>
                                    )}
                                </Box>
                            );
                        })}

                        {/* Spacer to allow last image to center */}
                        <Box
                            sx={{ flexShrink: 0, width: "calc(50% - 60px)" }}
                        />
                    </Box>
                </Box>

                {!isMobile && (
                    <IconButton
                        onClick={handleNext}
                        disabled={imageFiles.length <= 1}
                        sx={{
                            flexShrink: 0,
                            width: 44,
                            height: 44,
                            bgcolor: "primary.main",
                            color: "white",
                            boxShadow: 2,
                            "&:hover": {
                                bgcolor: "primary.dark",
                                boxShadow: 4,
                                transform: "scale(1.05)",
                            },
                            "&:active": {
                                transform: "scale(0.95)",
                            },
                            "&.Mui-disabled": {
                                bgcolor: "grey.300",
                                color: "grey.500",
                            },
                            transition: "all 0.2s ease",
                        }}
                    >
                        <ChevronRight sx={{ fontSize: 28 }} />
                    </IconButton>
                )}
            </Box>
        </Box>
    );
};

export default ImageCarousel;
