import React from "react";
import { Dialog, DialogContent, Box, IconButton } from "@mui/material";

const EnlargedImageDialog = ({
    enlargedImage,
    setEnlargedImage,
    imageFiles,
    currentImageIndex,
    setCurrentImageIndex,
}) => {
    const handlePrevious = () => {
        const newIndex =
            currentImageIndex === 0
                ? imageFiles.length - 1
                : currentImageIndex - 1;
        setCurrentImageIndex(newIndex);
        setEnlargedImage(imageFiles[newIndex]);
    };

    const handleNext = () => {
        const newIndex =
            currentImageIndex === imageFiles.length - 1
                ? 0
                : currentImageIndex + 1;
        setCurrentImageIndex(newIndex);
        setEnlargedImage(imageFiles[newIndex]);
    };

    return (
        <Dialog
            open={!!enlargedImage}
            onClose={() => setEnlargedImage(null)}
            maxWidth="lg"
            fullWidth
        >
            <DialogContent sx={{ p: 0, position: "relative" }}>
                {enlargedImage && (
                    <Box sx={{ position: "relative" }}>
                        <img
                            src={`${process.env.REACT_APP_SERVER_URL}/uploads/${enlargedImage.file_path}`}
                            alt={enlargedImage.file_name}
                            style={{
                                width: "100%",
                                height: "auto",
                                display: "block",
                            }}
                        />
                        <IconButton
                            sx={{
                                position: "absolute",
                                top: 8,
                                right: 8,
                                backgroundColor: "rgba(0, 0, 0, 0.6)",
                                color: "white",
                                "&:hover": {
                                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                                },
                            }}
                            onClick={() => setEnlargedImage(null)}
                        >
                            <Box component="span" sx={{ fontSize: "1.5rem" }}>
                                ×
                            </Box>
                        </IconButton>
                        {imageFiles.length > 1 && (
                            <>
                                <IconButton
                                    sx={{
                                        position: "absolute",
                                        left: 8,
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        backgroundColor: "rgba(0, 0, 0, 0.6)",
                                        color: "white",
                                        "&:hover": {
                                            backgroundColor:
                                                "rgba(0, 0, 0, 0.8)",
                                        },
                                    }}
                                    onClick={handlePrevious}
                                >
                                    <Box
                                        component="span"
                                        sx={{ fontSize: "2rem" }}
                                    >
                                        ‹
                                    </Box>
                                </IconButton>
                                <IconButton
                                    sx={{
                                        position: "absolute",
                                        right: 8,
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        backgroundColor: "rgba(0, 0, 0, 0.6)",
                                        color: "white",
                                        "&:hover": {
                                            backgroundColor:
                                                "rgba(0, 0, 0, 0.8)",
                                        },
                                    }}
                                    onClick={handleNext}
                                >
                                    <Box
                                        component="span"
                                        sx={{ fontSize: "2rem" }}
                                    >
                                        ›
                                    </Box>
                                </IconButton>
                                <Box
                                    sx={{
                                        position: "absolute",
                                        bottom: 16,
                                        left: "50%",
                                        transform: "translateX(-50%)",
                                        backgroundColor: "rgba(0, 0, 0, 0.6)",
                                        color: "white",
                                        padding: "4px 12px",
                                        borderRadius: 1,
                                        fontSize: "0.875rem",
                                    }}
                                >
                                    {currentImageIndex + 1} /{" "}
                                    {imageFiles.length}
                                </Box>
                            </>
                        )}
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default EnlargedImageDialog;
