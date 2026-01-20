import { useTheme } from "@emotion/react";
import MenuIcon from "@mui/icons-material/Menu";
import IconButton from "@mui/material/IconButton";
import {
    LinearProgress,
    Typography,
    Stack,
    Box,
    Switch,
    FormControlLabel,
    Tooltip,
} from "@mui/material";
import DateSelector from "./Components/DateSelector";
import { isMobile } from "react-device-detect";
import useLocalStorage from "../../../hooks/useLocalStorage";

const Banner = ({
    bannerText,
    loading,
    selectedDate,
    setSelectedDate,
    onOpenDrawer,
    drawerOpen,
}) => {
    const theme = useTheme();
    const [equipmentView, setEquipmentView] = useLocalStorage(
        "calendar-equipmentView",
        false
    );

    return (
        <Stack
            direction="column"
            width="100%"
            sx={{ backgroundColor: theme.palette.background.paper }}
        >
            <Stack
                sx={{
                    backgroundColor: theme.palette.background.paper,
                    height: isMobile ? 64 : 112,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                }}
                direction="row"
                alignItems="center"
            >
                {isMobile && (
                    <Box
                        sx={{
                            width: "30%",
                            display: "flex",
                            flexDirection: "row",
                        }}
                    >
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
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "row",
                            flexGrow: 1,
                        }}
                    >
                        <Box
                            sx={{
                                width: "30%",
                                display: "flex",
                                flexDirection: "row",
                            }}
                        >
                            {!drawerOpen && (
                                <IconButton
                                    onClick={onOpenDrawer}
                                    sx={{ mr: 2 }}
                                >
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
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "row",
                                flexGrow: 1,
                                justifyContent: "space-between",
                            }}
                        >
                            <Box
                                sx={{
                                    width: "30%",
                                    display: "flex",
                                    flexDirection: "row",
                                }}
                            >
                                {(bannerText === "Month Schedule" ||
                                    bannerText === "Week Schedule" ||
                                    bannerText === "Day Schedule") && (
                                    <DateSelector
                                        selectedDate={selectedDate}
                                        setSelectedDate={setSelectedDate}
                                    />
                                )}
                            </Box>
                            {(bannerText === "Month Schedule" ||
                                bannerText === "Week Schedule" ||
                                bannerText === "Day Schedule") && (
                                <Tooltip
                                    title={
                                        equipmentView
                                            ? "Switch to Room Bookings View"
                                            : "Switch to Equipment Bookings View"
                                    }
                                >
                                    <FormControlLabel
                                        label={
                                            equipmentView
                                                ? "Equipment"
                                                : "Meetings"
                                        }
                                        sx={{ marginTop: -1 }}
                                        zIndex={1000}
                                        control={
                                            <Switch
                                                color="primary"
                                                checked={equipmentView}
                                                onChange={() =>
                                                    setEquipmentView(
                                                        !equipmentView
                                                    )
                                                }
                                            />
                                        }
                                    />
                                </Tooltip>
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
