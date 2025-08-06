import { useTheme } from "@emotion/react";
import MenuIcon from "@mui/icons-material/Menu";
import IconButton from "@mui/material/IconButton";
import { LinearProgress, Typography, Stack, Box } from "@mui/material";
import DateSelector from "./Components/DateSelector";
import { isMobile } from "react-device-detect";

const Banner = ({
  bannerText,
  loading,
  selectedDate,
  setSelectedDate,
  onOpenDrawer,
  drawerOpen,
}) => {
  const theme = useTheme();

  return (
    <Stack direction="column" width="100%">
      <Stack
        sx={{
          backgroundColor: theme.palette.background.default,
          padding: "20px",
        }}
        direction="row"
        alignItems="center"
      >
        {isMobile && (
          <Box sx={{ width: "30%", display: "flex", flexDirection: "row" }}>
            {!drawerOpen && (
              <IconButton onClick={onOpenDrawer} sx={{ mr: 2 }}>
                <MenuIcon />
              </IconButton>
            )}

            {(bannerText === "Month Schedule" ||
              bannerText === "Week Schedule" ||
              bannerText === "Day Schedule") && (
              <DateSelector
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
              />
            )}
          </Box>
        )}
        {/* Drawer toggle button */}
        {!isMobile && (
          <Box sx={{ display: "flex", flexDirection: "row", flexGrow: 1 }}>
            <Box sx={{ width: "30%", display: "flex", flexDirection: "row" }}>
              {!drawerOpen && (
                <IconButton onClick={onOpenDrawer} sx={{ mr: 2 }}>
                  <MenuIcon />
                </IconButton>
              )}

              <Typography
                sx={{
                  fontSize: "2rem",
                  fontFamily: "Calibri",
                  fontWeight: "light",
                  letterSpacing: "0.05em",
                  color: "inherit",
                }}
              >
                {bannerText}
              </Typography>
            </Box>
            <Box sx={{ width: "30%", display: "flex", flexDirection: "row" }}>
              {(bannerText === "Month Schedule" ||
                bannerText === "Week Schedule" ||
                bannerText === "Day Schedule") && (
                <DateSelector
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                />
              )}
            </Box>
          </Box>
        )}
      </Stack>

      {loading && (
        <LinearProgress
          sx={{
            "& .MuiLinearProgress-bar": {
              backgroundColor: theme.palette.secondary.light,
            },
            width: "100%",
          }}
        />
      )}
    </Stack>
  );
};

export default Banner;
