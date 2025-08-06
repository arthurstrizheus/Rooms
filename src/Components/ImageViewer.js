import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  IconButton,
  Box,
  Stack,
  useMediaQuery,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const ImageViewer = ({ src, alt, style }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const downMD = useMediaQuery((theme) => theme.breakpoints.down("md"));

  const handleImageClick = () => {
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      setDialogOpen(false);
    }
  };

  return (
    <>
      <img
        src={src}
        alt={alt}
        style={{
          ...style,
          cursor: "pointer",
          transition: "opacity 0.2s",
        }}
        onClick={handleImageClick}
        onMouseEnter={(e) => (e.target.style.opacity = "0.8")}
        onMouseLeave={(e) => (e.target.style.opacity = "1")}
      />

      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          style: {
            backgroundColor: "transparent",
            boxShadow: "none",
          },
        }}
      >
        <DialogContent
          sx={{
            padding: 2,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
          }}
          onClick={handleBackdropClick}
        >
          <Stack direction={"column"}>
            <IconButton
              onClick={handleDialogClose}
              size="small"
              sx={{
                right: 0,
                top: 10,
                color: "white",
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                width: 24,
                height: 24,
                zIndex: 1,
                justifySelf: "right",
                "&:hover": {
                  backgroundColor: "rgba(0, 0, 0, 0.9)",
                },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
            <Box
              sx={{
                backgroundColor: "white",
                borderRadius: "8px",
                padding: "16px",
                minWidth: downMD ? "70vw" : "30vw",
                minHeight: downMD ? "70vw" : "30vh",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={src}
                alt={`${alt} - full size`}
                style={{
                  width: "100%",
                  height: "auto",
                  maxWidth: "80vw",
                  maxHeight: "75vh",
                  objectFit: "contain",
                  borderRadius: "4px",
                  display: "block",
                }}
              />
            </Box>
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ImageViewer;
