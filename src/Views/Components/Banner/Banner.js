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
        false,
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
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            width: "100%",
                            position: "relative",
                        }}
                    >
                        <Box
                            sx={{
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
                        </Box>
                        {bannerText === "Equipment" && (
                            <Box
                                sx={{
                                    position: "absolute",
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: "text.secondary",
                                        fontSize: "0.7rem",
                                    }}
                                >
                                    Full listing:{" "}
                                    <a
                                        href="https://sealimited.softlinkliberty.net/liberty/libraryHome.do"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            color: theme.palette.primary.main,
                                            textDecoration: "none",
                                        }}
                                    >
                                        library website
                                    </a>
                                </Typography>
                            </Box>
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
                            position: "relative",
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

                        {bannerText === "Equipment" && (
                            <Box
                                sx={{
                                    position: "absolute",
                                    left: "50%",
                                    top: "50%",
                                    transform: "translate(-50%, -50%)",
                                }}
                            >
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: "text.secondary",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    Full equipment listing available on the{" "}
                                    <a
                                        href="https://sealimited.softlinkliberty.net/liberty/libraryHome.do"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            color: theme.palette.primary.main,
                                            textDecoration: "none",
                                        }}
                                    >
                                        library website
                                    </a>
                                    .
                                </Typography>
                            </Box>
                        )}
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
