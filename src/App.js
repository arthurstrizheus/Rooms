import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import theme from "./Utilites/theme";
import { useEffect, useState } from "react";
import { useAuth } from "./Utilites/AuthContext";
import { ThemeProvider } from "@emotion/react";
import { SnackbarProvider } from "./Utilites/SnackbarContext";
import { Box, Divider, IconButton, Stack } from "@mui/material";
import SideBar from "./Views/Components/SideBar/SideBar";
import Banner from "./Views/Components/Banner/Banner";
import AppRoutes from "./Routes/Routes";
import { styled } from "@mui/material/styles";
import Drawer from "@mui/material/Drawer";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import logo from "./Assets/Images/sea-logo.png";
import { isMobile } from "react-device-detect";

const drawerWidth = 240;

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0, 1),
  minHeight: "102px",
  paddingBottom: "5px",
  paddingTop: "5px",
  justifyContent: "flex-end",
}));

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function App() {
  const [mode, setMode] = useState("light");
  const [bannerText, setBannerText] = useState("Month Schedule");
  const [loading, setLoading] = useState(false);
  const [update, setUpdate] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { isAuthenticated, setUser, login, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(
    isMobile ? false : isAuthenticated ? true : false
  );

  const handleDrawerOpen = () => setOpen(true);
  const handleDrawerClose = () => setOpen(false);

  useEffect(() => {
    delay(120000).then(() => setUpdate((prev) => prev + 1));
  }, [update]);

  useEffect(() => {
    if (
      !isAuthenticated &&
      location.pathname !== "/login" &&
      location.pathname !== "/signup"
    ) {
      localStorage.setItem("lastLocation", location.pathname);
      setOpen(false);
      navigate("/login");
    } else if (location.pathname === "") {
      const user = JSON.parse(localStorage.getItem("user"));
      setUser(user);
      login(user);
      navigate(isMobile ? "/schedule/type/week" : "/schedule/type/month");
      setOpen(isMobile ? false : true);
    }

    const storedUser = localStorage.getItem("user");
    if (
      (JSON.parse(storedUser)?.id && !user) ||
      (JSON.parse(storedUser)?.id === user?.id &&
        !isAuthenticated &&
        user?.id !== null &&
        user?.id !== undefined)
    ) {
      const user = JSON.parse(storedUser);
      setUser(user);
      login(user);
      setOpen(isMobile ? false : true);
      if (localStorage.getItem("lastLocation") === "/") {
        navigate(isMobile ? "/schedule/type/week" : "/schedule/type/month");
      } else {
        navigate(localStorage.getItem("lastLocation"));
      }
    }
  }, [isAuthenticated, user]);

  return (
    <div
      className="Rooms"
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <ThemeProvider theme={theme(mode)}>
        <SnackbarProvider>
          <Box
            sx={{
              flexGrow: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              transition: (theme) =>
                theme.transitions.create("margin", {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.standard,
                }),
              marginLeft: open ? `${drawerWidth}px` : 0, // key line
            }}
          >
            {/* Drawer */}
            {isAuthenticated && (
              <Drawer
                variant="persistent"
                anchor="left"
                open={open}
                sx={{
                  width: drawerWidth,
                  flexShrink: 0,
                  "& .MuiDrawer-paper": {
                    width: drawerWidth,
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column", // required to divide header/body
                  },
                }}
              >
                {/* Static header: logo + close button */}
                <Box sx={{ flexShrink: 0 }}>
                  <DrawerHeader>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      sx={{ width: "100%" }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          flexGrow: 1,
                          justifyContent: "center",
                          alignItems: "center",
                          padding: 1,
                        }}
                      >
                        <img
                          src={logo}
                          alt="Logo"
                          style={{ height: "64px", width: "auto" }}
                        />
                      </Box>
                      <IconButton onClick={handleDrawerClose}>
                        <ChevronLeftIcon />
                      </IconButton>
                    </Stack>
                  </DrawerHeader>
                  <Divider />
                </Box>

                {/* Scrollable content: SideBar */}
                <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
                  <SideBar
                    setBannerText={setBannerText}
                    bannerText={bannerText}
                  />
                </Box>
              </Drawer>
            )}

            {/* Main Content */}
            <Box
              sx={{
                flexGrow: 1,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Banner (with drawer toggle) */}
              {isAuthenticated && (
                <Banner
                  bannerText={bannerText}
                  loading={loading}
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  onOpenDrawer={handleDrawerOpen}
                  drawerOpen={open}
                />
              )}

              {/* Scrollable route area */}
              <Box
                sx={{
                  flexGrow: 1,
                  overflowY: "auto",
                  overflowX: "auto",
                }}
              >
                {isAuthenticated ? (
                  <Box
                    sx={{
                      height: "100%",
                      flexGrow: 1,
                      display: "flex",
                      flexDirection: "column",
                      minHeight: 0, // REQUIRED
                      overflow: "auto",
                    }}
                  >
                    <AppRoutes
                      setLoading={setLoading}
                      setBannerText={setBannerText}
                      selectedDate={selectedDate}
                      setSelectedDate={setSelectedDate}
                      loading={loading}
                    />
                  </Box>
                ) : (
                  <Stack direction="column" height="100%" width="100%">
                    <AppRoutes
                      setLoading={setLoading}
                      setBannerText={setBannerText}
                      selectedDate={selectedDate}
                      setSelectedDate={setSelectedDate}
                      loading={loading}
                      drawerOpen={open}
                      setDrawerOpen={setOpen}
                    />
                  </Stack>
                )}
              </Box>
            </Box>
          </Box>
        </SnackbarProvider>
      </ThemeProvider>
    </div>
  );
}

export default App;
