import { useEffect, useState, useMemo } from "react";
import {
    Grid,
    Typography,
    Button,
    TextField,
    Box,
    Tooltip,
    Chip,
    Tab,
    Tabs,
    Card,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    CircularProgress,
    Stack,
    Avatar,
    Alert,
    Divider,
} from "@mui/material";
import {
    Refresh as RefreshIcon,
    LogoutOutlined as LogoutIcon,
    PersonOutline as PersonIcon,
    AdminPanelSettings as AdminIcon,
    LocationOn as LocationIcon,
    Schedule as TimeIcon,
    Warning as WarningIcon,
    TerminalOutlined as TerminalIcon,
} from "@mui/icons-material";

import { useAuth } from "../../../Utilites/AuthContext";
import {
    GetLocations,
    RunMatterManagerMonthlyGroupReport,
    showError,
    showSuccess,
} from "../../../Utilites/Functions/ApiFunctions";
import {
    GetConnectedUsers,
    GetConnectionStatus,
    ForceLogoutUser,
} from "../../../Utilites/Functions/ApiFunctions/SocketFunctions";
import useResponsive from "../../../hooks/useResponsive";
import {
    PageHeader,
    PageContainer,
    SectionCard,
    StatCard,
    EmptyState,
    ResponsiveDialog,
    StatRowSkeleton,
    RowSkeleton,
    Stagger,
} from "../../Components/UI";

const AUTO_REFRESH_MS = 300000;

const initialsOf = (first = "", last = "") =>
    `${first[0] || ""}${last[0] || ""}`.toUpperCase() || "?";

/**
 * Live connection dashboard, plus a dev-only tools tab.
 *
 * Tabs are keyed by name rather than by index. Previously the dev tab sat at
 * index 0 for developers and the dashboard at 1, so every render of the
 * dashboard was guarded by a four-line condition comparing `tabValue` against
 * both possibilities.
 */
const AdminDashboard = () => {
    const { user } = useAuth();
    const { isCompact } = useResponsive();

    const isDeveloper = useMemo(
        () =>
            (process.env.REACT_APP_DEV_IDS || "")
                .split(",")
                .includes(`${user?.id}`),
        [user?.id],
    );

    const [tab, setTab] = useState("dashboard");
    const [connectedUsers, setConnectedUsers] = useState([]);
    const [connectionStats, setConnectionStats] = useState(null);
    const [locations, setLocations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [logoutDialog, setLogoutDialog] = useState({
        open: false,
        user: null,
    });
    const [logoutReason, setLogoutReason] = useState("");

    // ---- Data -------------------------------------------------------------

    const getLocationName = (locationId) => {
        if (!locationId) return "Unknown location";
        const location = locations.find(
            (loc) => `${loc.officeid}` === `${locationId}`,
        );
        return (
            location?.Alias ||
            location?.city ||
            location?.City ||
            `Location ${locationId}`
        );
    };

    const fetchLocationData = async () => {
        try {
            setLocations((await GetLocations()) || []);
        } catch (error) {
            console.error("Error fetching location data:", error);
        }
    };

    const fetchConnectedUsers = async () => {
        setIsLoading(true);
        try {
            const response = await GetConnectedUsers();
            if (response?.success) setConnectedUsers(response.users || []);
            else showError("Failed to fetch connected users");
        } catch (error) {
            console.error("Error fetching connected users:", error);
            showError("Error fetching connected users");
        } finally {
            setIsLoading(false);
            setFetched(true);
        }
    };

    const fetchConnectionStats = async () => {
        try {
            const response = await GetConnectionStatus();
            if (response?.success) setConnectionStats(response.stats);
            else showError("Failed to fetch connection statistics");
        } catch (error) {
            console.error("Error fetching connection stats:", error);
            showError("Error fetching connection statistics");
        }
    };

    const refreshAll = () => {
        fetchConnectedUsers();
        fetchConnectionStats();
    };

    useEffect(() => {
        fetchLocationData();
    }, []);

    useEffect(() => {
        if (tab !== "dashboard") return undefined;
        refreshAll();
        const interval = setInterval(refreshAll, AUTO_REFRESH_MS);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    const handleForceLogout = async () => {
        if (!logoutDialog.user) return;

        setIsLoading(true);
        try {
            const response = await ForceLogoutUser({
                userId: logoutDialog.user.id,
                reason: logoutReason || "Admin forced logout",
            });

            if (response?.success) {
                showSuccess(
                    `Successfully logged out ${logoutDialog.user.username}`,
                );
                fetchConnectedUsers();
            } else {
                showError("Failed to force logout user");
            }
        } catch (error) {
            console.error("Error forcing logout:", error);
            showError("Error during force logout");
        } finally {
            setLogoutDialog({ open: false, user: null });
            setLogoutReason("");
            setIsLoading(false);
        }
    };

    // ---- Formatting -------------------------------------------------------

    const formatConnectedTime = (connectedAt) =>
        new Date(connectedAt).toLocaleString();

    const getTimeSinceConnected = (connectedAt) => {
        const diff = new Date() - new Date(connectedAt);
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        return `${minutes}m`;
    };

    // ---- Panels -----------------------------------------------------------

    const devTools = (
        <Grid container spacing={2}>
            {[
                {
                    label: "Run MM report",
                    hint: "Run monthly matter manager group emails",
                    onClick: () => RunMatterManagerMonthlyGroupReport(),
                },
                {
                    label: "Log connected users",
                    hint: "Print the connected-user payload to the console",
                    onClick: () =>
                        GetConnectedUsers().then((resp) => console.log(resp)),
                },
                {
                    label: "Log socket status",
                    hint: "Print the socket status payload to the console",
                    onClick: () =>
                        GetConnectionStatus().then((resp) => console.log(resp)),
                },
            ].map((tool) => (
                <Grid item xs={12} sm={6} md={4} key={tool.label}>
                    <Card
                        sx={{
                            p: 2.5,
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        <Typography variant="subtitle2">
                            {tool.label}
                        </Typography>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mb: 2, flexGrow: 1 }}
                        >
                            {tool.hint}
                        </Typography>
                        <Button
                            variant="outlined"
                            fullWidth
                            onClick={tool.onClick}
                        >
                            Run
                        </Button>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );

    const statCards = [
        {
            label: "Total connected",
            value: connectionStats?.total ?? 0,
            icon: <PersonIcon />,
            tone: "primary",
        },
        {
            label: "Admins online",
            value: connectionStats?.admins ?? 0,
            icon: <AdminIcon />,
            tone: "error",
        },
        {
            label: "Equipment admins",
            value: connectionStats?.equipmentAdmins ?? 0,
            icon: <AdminIcon />,
            tone: "info",
        },
        {
            label: "Office admins",
            value: connectionStats?.equipmentOfficeAdmins ?? 0,
            icon: <AdminIcon />,
            tone: "warning",
        },
        {
            label: "Regular users",
            value: connectionStats?.regular ?? 0,
            icon: <PersonIcon />,
            tone: "success",
        },
        {
            label: "Locations",
            value: Object.keys(connectionStats?.byLocation || {}).length,
            icon: <LocationIcon />,
            tone: "primary",
        },
    ];

    const MobileUserCard = ({ connectedUser }) => (
        <Card sx={{ p: 2, mb: 1.5 }}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Avatar sx={{ width: 34, height: 34 }}>
                    {initialsOf(
                        connectedUser.first_name,
                        connectedUser.last_name,
                    )}
                </Avatar>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>
                        {connectedUser.first_name} {connectedUser.last_name}
                    </Typography>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block" }}
                        noWrap
                    >
                        @{connectedUser.username}
                    </Typography>
                    <Stack
                        direction="row"
                        spacing={0.75}
                        sx={{ mt: 1, flexWrap: "wrap", gap: 0.75 }}
                    >
                        <Chip
                            size="small"
                            label={connectedUser.admin ? "Admin" : "User"}
                            sx={
                                connectedUser.admin
                                    ? {
                                          bgcolor: "error.light",
                                          color: "error.dark",
                                          fontWeight: 600,
                                      }
                                    : { bgcolor: "grey.100" }
                            }
                        />
                        <Chip
                            size="small"
                            variant="outlined"
                            label={getLocationName(connectedUser.location)}
                        />
                        <Chip
                            size="small"
                            label={getTimeSinceConnected(
                                connectedUser.connectedAt,
                            )}
                            sx={{
                                bgcolor: "success.light",
                                color: "success.dark",
                                fontWeight: 600,
                            }}
                        />
                    </Stack>
                </Box>
                <Tooltip
                    title={
                        connectedUser.id === user?.id
                            ? "You can't log yourself out"
                            : !user?.admin
                              ? "Admins only"
                              : `Force logout ${connectedUser.username}`
                    }
                >
                    <span>
                        <IconButton
                            size="small"
                            onClick={() =>
                                setLogoutDialog({
                                    open: true,
                                    user: connectedUser,
                                })
                            }
                            disabled={
                                connectedUser.id === user?.id || !user?.admin
                            }
                            sx={{ color: "error.main" }}
                        >
                            <LogoutIcon fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
            </Stack>
        </Card>
    );

    const dashboard = (
        <>
            {!fetched && !connectionStats ? (
                <StatRowSkeleton count={6} />
            ) : (
                <Grid container spacing={2}>
                    {statCards.map((card) => (
                        <Grid item xs={6} sm={4} md={2} key={card.label}>
                            <StatCard {...card} />
                        </Grid>
                    ))}
                </Grid>
            )}

            {connectionStats?.byLocation &&
                Object.keys(connectionStats.byLocation).length > 0 && (
                    <SectionCard
                        title="Users by location"
                        icon={<LocationIcon />}
                        sx={{ mt: 2.5 }}
                    >
                        <Stack
                            direction="row"
                            spacing={1}
                            sx={{ flexWrap: "wrap", gap: 1 }}
                        >
                            {Object.entries(connectionStats.byLocation).map(
                                ([locationId, count]) => (
                                    <Chip
                                        key={locationId}
                                        label={`${getLocationName(
                                            parseInt(locationId, 10),
                                        )} · ${count}`}
                                        sx={{
                                            bgcolor: "primary.50",
                                            color: "primary.dark",
                                            border: "1px solid",
                                            borderColor: "primary.100",
                                        }}
                                    />
                                ),
                            )}
                        </Stack>
                    </SectionCard>
                )}

            <SectionCard
                title="Connected users"
                subtitle={`${connectedUsers.length} online · refreshes every 5 minutes`}
                icon={<PersonIcon />}
                sx={{ mt: 2.5 }}
                disablePadding={!isCompact}
                contentSx={isCompact ? { p: 2 } : {}}
            >
                {isLoading && !fetched ? (
                    <Box sx={{ p: 2 }}>
                        <RowSkeleton count={4} height={56} />
                    </Box>
                ) : connectedUsers.length === 0 ? (
                    <EmptyState
                        variant="compact"
                        icon={<PersonIcon />}
                        title="No users currently connected"
                        description="Sessions appear here as people sign in."
                    />
                ) : isCompact ? (
                    <Stagger step={35} max={12}>
                        {connectedUsers.map((connectedUser) => (
                            <MobileUserCard
                                key={connectedUser.id}
                                connectedUser={connectedUser}
                            />
                        ))}
                    </Stagger>
                ) : (
                    <TableContainer sx={{ maxHeight: 520 }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>User</TableCell>
                                    <TableCell>Role</TableCell>
                                    <TableCell>Location</TableCell>
                                    <TableCell>Connected</TableCell>
                                    <TableCell>Duration</TableCell>
                                    <TableCell>Socket ID</TableCell>
                                    <TableCell align="center">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {connectedUsers.map((connectedUser, index) => (
                                    <TableRow
                                        key={connectedUser.id}
                                        hover
                                        sx={{
                                            animation:
                                                "seaFadeIn 240ms ease both",
                                            animationDelay: `${Math.min(index, 20) * 16}ms`,
                                        }}
                                    >
                                        <TableCell>
                                            <Stack
                                                direction="row"
                                                spacing={1.25}
                                                alignItems="center"
                                            >
                                                <Avatar
                                                    sx={{
                                                        width: 28,
                                                        height: 28,
                                                        fontSize: "0.6875rem",
                                                    }}
                                                >
                                                    {initialsOf(
                                                        connectedUser.first_name,
                                                        connectedUser.last_name,
                                                    )}
                                                </Avatar>
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ fontWeight: 600 }}
                                                    >
                                                        {
                                                            connectedUser.first_name
                                                        }{" "}
                                                        {connectedUser.last_name}
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.disabled"
                                                    >
                                                        @
                                                        {connectedUser.username}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </TableCell>

                                        <TableCell>
                                            <Chip
                                                size="small"
                                                icon={
                                                    connectedUser.admin ? (
                                                        <AdminIcon
                                                            sx={{
                                                                fontSize:
                                                                    "14px !important",
                                                            }}
                                                        />
                                                    ) : (
                                                        <PersonIcon
                                                            sx={{
                                                                fontSize:
                                                                    "14px !important",
                                                            }}
                                                        />
                                                    )
                                                }
                                                label={
                                                    connectedUser.admin
                                                        ? "Admin"
                                                        : "User"
                                                }
                                                sx={
                                                    connectedUser.admin
                                                        ? {
                                                              bgcolor:
                                                                  "error.light",
                                                              color: "error.dark",
                                                              fontWeight: 600,
                                                              "& .MuiChip-icon":
                                                                  {
                                                                      color: "error.main",
                                                                  },
                                                          }
                                                        : { bgcolor: "grey.100" }
                                                }
                                            />
                                        </TableCell>

                                        <TableCell>
                                            <Chip
                                                size="small"
                                                variant="outlined"
                                                label={getLocationName(
                                                    connectedUser.location,
                                                )}
                                            />
                                        </TableCell>

                                        <TableCell
                                            sx={{
                                                color: "text.secondary",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {formatConnectedTime(
                                                connectedUser.connectedAt,
                                            )}
                                        </TableCell>

                                        <TableCell>
                                            <Chip
                                                size="small"
                                                icon={
                                                    <TimeIcon
                                                        sx={{
                                                            fontSize:
                                                                "14px !important",
                                                        }}
                                                    />
                                                }
                                                label={getTimeSinceConnected(
                                                    connectedUser.connectedAt,
                                                )}
                                                sx={{
                                                    bgcolor: "success.light",
                                                    color: "success.dark",
                                                    fontWeight: 600,
                                                    "& .MuiChip-icon": {
                                                        color: "success.main",
                                                    },
                                                }}
                                            />
                                        </TableCell>

                                        <TableCell
                                            sx={{
                                                fontFamily: (t) =>
                                                    t.typography.fontFamilyMono,
                                                fontSize: "0.6875rem",
                                                color: "text.disabled",
                                            }}
                                        >
                                            {connectedUser.socketId}
                                        </TableCell>

                                        <TableCell align="center">
                                            <Tooltip
                                                title={
                                                    connectedUser.id === user?.id
                                                        ? "You can't log yourself out"
                                                        : !user?.admin
                                                          ? "Admins only"
                                                          : `Force logout ${connectedUser.username}`
                                                }
                                            >
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() =>
                                                            setLogoutDialog({
                                                                open: true,
                                                                user: connectedUser,
                                                            })
                                                        }
                                                        disabled={
                                                            connectedUser.id ===
                                                                user?.id ||
                                                            !user?.admin
                                                        }
                                                        sx={{
                                                            color: "error.main",
                                                        }}
                                                    >
                                                        <LogoutIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </SectionCard>
        </>
    );

    return (
        <>
            <PageHeader
                title="Admin Dashboard"
                subtitle="Live sessions and system tools"
                actions={[
                    {
                        key: "refresh",
                        label: isLoading ? "Refreshing…" : "Refresh",
                        icon: isLoading ? (
                            <CircularProgress size={16} color="inherit" />
                        ) : (
                            <RefreshIcon />
                        ),
                        primary: true,
                        disabled: isLoading,
                        onClick: () => {
                            refreshAll();
                            showSuccess("Dashboard refreshed");
                        },
                    },
                ]}
            >
                {isDeveloper && (
                    <Tabs
                        value={tab}
                        onChange={(_, value) => setTab(value)}
                        sx={{ borderBottom: 1, borderColor: "divider" }}
                    >
                        <Tab label="Dashboard" value="dashboard" />
                        <Tab
                            label="Dev tools"
                            value="dev"
                            icon={<TerminalIcon sx={{ fontSize: 16 }} />}
                            iconPosition="start"
                        />
                    </Tabs>
                )}
            </PageHeader>

            <PageContainer>
                <Box
                    key={tab}
                    sx={{
                        animation:
                            "seaRiseIn 300ms cubic-bezier(0.22,1,0.36,1) both",
                    }}
                >
                    {tab === "dev" && isDeveloper ? devTools : dashboard}
                </Box>
            </PageContainer>

            {/* ---- Force logout ---- */}
            <ResponsiveDialog
                open={logoutDialog.open}
                onClose={() => {
                    setLogoutDialog({ open: false, user: null });
                    setLogoutReason("");
                }}
                title="Force logout"
                subtitle={logoutDialog.user?.username}
                icon={<WarningIcon />}
                accent="warning"
                maxWidth="sm"
                fullScreen={false}
                actions={
                    <>
                        <Button
                            variant="outlined"
                            onClick={() => {
                                setLogoutDialog({ open: false, user: null });
                                setLogoutReason("");
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleForceLogout}
                            color="error"
                            variant="contained"
                            disabled={isLoading}
                            startIcon={
                                isLoading ? (
                                    <CircularProgress
                                        size={16}
                                        color="inherit"
                                    />
                                ) : (
                                    <LogoutIcon />
                                )
                            }
                        >
                            Force logout
                        </Button>
                    </>
                }
            >
                {logoutDialog.user && (
                    <Stack spacing={2}>
                        <Alert severity="warning" sx={{ boxShadow: "none" }}>
                            <Typography variant="body2">
                                <strong>{logoutDialog.user.username}</strong>{" "}
                                from{" "}
                                {getLocationName(logoutDialog.user.location)}{" "}
                                will be disconnected immediately.
                            </Typography>
                        </Alert>

                        <Divider />

                        <TextField
                            fullWidth
                            label="Reason (optional)"
                            multiline
                            rows={3}
                            value={logoutReason}
                            onChange={(e) => setLogoutReason(e.target.value)}
                            placeholder="Shown to the user when they're disconnected"
                        />
                    </Stack>
                )}
            </ResponsiveDialog>
        </>
    );
};

export default AdminDashboard;
