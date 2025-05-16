import React from "react";
import { Box, Typography, SvgIcon } from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

const NotFoundPage = () => {
  return (
    <Box
      sx={{
        width: "100%", // Full viewport width
        height: "100%", // Full viewport height
        display: "flex",
        justifyContent: "center", // Center content horizontally
        alignItems: "center", // Center content vertically
        backgroundColor: "#f0f4f8", // Soft blue-gray background
        position: "relative", // For positioning accents
        margin: 0,
        padding: 0,
      }}
    >
      <Box textAlign="center">
        {/* Central Illustration */}
        <ErrorOutlineIcon sx={{ fontSize: "8rem", color: "#90a4ae" }} />
        {/* Heading */}
        <Typography variant="h1" gutterBottom sx={{ color: "#37474f" }}>
          Oops! We can't find that page.
        </Typography>
        {/* Subtext */}
        <Typography variant="h5" component="p" sx={{ color: "#607d8b" }}>
          The webpage you are trying to access does not exist or has been moved.
        </Typography>
      </Box>
      {/* Graphical Accents */}
      <SvgIcon
        component={HelpOutlineIcon}
        sx={{
          position: "absolute",
          top: "15%",
          left: "5%",
          fontSize: "4rem",
          color: "#cfd8dc",
        }}
      />
      <SvgIcon
        component={HelpOutlineIcon}
        sx={{
          position: "absolute",
          top: "25%",
          right: "10%",
          fontSize: "3rem",
          color: "#cfd8dc",
        }}
      />
    </Box>
  );
};

export default NotFoundPage;
