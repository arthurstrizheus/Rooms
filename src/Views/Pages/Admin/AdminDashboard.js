import { useEffect, useState } from "react";
import { useAuth } from "../../../Utilites/AuthContext";
import { useTheme } from "@emotion/react";
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
    CardContent,
    CardHeader,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    Badge,
    Paper,
} from "@mui/material";
import {
    Refresh as RefreshIcon,
    LogoutOutlined as LogoutIcon,
    PersonOutline as PersonIcon,
    AdminPanelSettings as AdminIcon,
    LocationOn as LocationIcon,
    Schedule as TimeIcon,
    Warning as WarningIcon,
} from "@mui/icons-material";
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

const AdminDashboard = ({ setLoading }) => {
    const theme = useTheme();
    const { user } = useAuth();
    const [tabValue, setTabValue] = useState(
        process.env.REACT_APP_DEV_IDS.split(",").includes(`${user?.id}`) ? 1 : 0
    );
    const [connectedUsers, setConnectedUsers] = useState([]);
    const [connectionStats, setConnectionStats] = useState(null);
    const [locations, setLocations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [logoutDialog, setLogoutDialog] = useState({
        open: false,
        user: null,
    });
    const [logoutReason, setLogoutReason] = useState("");

    // Get location name by ID
    const getLocationName = (locationId) => {
        if (!locationId) return "Unknown Location";

        const location = locations.find((loc) => loc.officeid == locationId);
        if (location) {
            return (
                location.Alias ||
                location.city ||
                location.City ||
                `Location ${locationId}`
            );
        }

        return `Location ${locationId}`;
    };

    // Fetch locations data
    const fetchLocationData = async () => {
        try {
            const locationsData = await GetLocations();
            setLocations(locationsData || []);
        } catch (error) {
            console.error("Error fetching location data:", error);
        }
    };

    // Fetch connected users
    const fetchConnectedUsers = async () => {
        setIsLoading(true);
        try {
            const response = await GetConnectedUsers();
            if (response?.success) {
                setConnectedUsers(response.users || []);
            } else {
                showError("Failed to fetch connected users");
            }
        } catch (error) {
            console.error("Error fetching connected users:", error);
            showError("Error fetching connected users");
        }
        setIsLoading(false);
    };

    // Fetch connection stats
    const fetchConnectionStats = async () => {
        try {
            const response = await GetConnectionStatus();
            if (response?.success) {
                setConnectionStats(response.stats);
            } else {
                showError("Failed to fetch connection statistics");
            }
        } catch (error) {
            console.error("Error fetching connection stats:", error);
            showError("Error fetching connection statistics");
        }
    };

    // Handle force logout
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
                    `Successfully logged out ${logoutDialog.user.username}`
                );
                fetchConnectedUsers(); // Refresh the list
            } else {
                showError("Failed to force logout user");
            }
        } catch (error) {
            console.error("Error forcing logout:", error);
            showError("Error during force logout");
        }

        setLogoutDialog({ open: false, user: null });
        setLogoutReason("");
        setIsLoading(false);
    };

    // Format time
    const formatConnectedTime = (connectedAt) => {
        const date = new Date(connectedAt);
        return date.toLocaleString();
    };

    // Get time since connected
    const getTimeSinceConnected = (connectedAt) => {
        const now = new Date();
        const connected = new Date(connectedAt);
        const diff = now - connected;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        return `${minutes}m`;
    };

    const handleRefresh = () => {
        fetchConnectedUsers();
        fetchConnectionStats();
        showSuccess("Dashboard refreshed");
    };

    useEffect(() => {
        // Always fetch location data when component mounts
        fetchLocationData();
    }, []);

    useEffect(() => {
        if (
            (tabValue === 1 &&
                process.env.REACT_APP_DEV_IDS.split(",").includes(
                    `${user?.id}`
                )) ||
            (tabValue === 0 &&
                !process.env.REACT_APP_DEV_IDS.split(",").includes(
                    `${user?.id}`
                ))
        ) {
            // Admin Dashboard tab
            fetchConnectedUsers();
            fetchConnectionStats();
        }
    }, [tabValue]);

    // Auto-refresh every 30 seconds when on admin dashboard
    useEffect(() => {
        let interval;
        if (
            (tabValue === 1 &&
                process.env.REACT_APP_DEV_IDS.split(",").includes(
                    `${user?.id}`
                )) ||
            (tabValue === 0 &&
                !process.env.REACT_APP_DEV_IDS.split(",").includes(
                    `${user?.id}`
                ))
        ) {
            interval = setInterval(() => {
                fetchConnectedUsers();
                fetchConnectionStats();
            }, 300000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [tabValue]);

    const StatCard = ({ title, value, icon, color = "primary" }) => (
        <Card sx={{ height: "100%" }}>
            <CardContent>
                <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                >
                    <Box>
                        <Typography variant="h4" color={`${color}.main`}>
                            {value}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {title}
                        </Typography>
                    </Box>
                    <Box color={`${color}.main`}>{icon}</Box>
                </Box>
            </CardContent>
        </Card>
    );

    const EmptyState = ({ message }) => (
        <TableRow>
            <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    gap={2}
                >
                    <PersonIcon sx={{ fontSize: 48, color: "text.disabled" }} />
                    <Typography variant="h6" color="text.disabled">
                        {message}
                    </Typography>
                </Box>
            </TableCell>
        </TableRow>
    );

    return (
        <Grid container sx={{ height: "100vh", p: 3 }}>
            <Grid item xs={12}>
                <Tabs
                    value={tabValue}
                    onChange={(_, newValue) => setTabValue(newValue)}
                >
                    {process.env.REACT_APP_DEV_IDS.split(",").includes(
                        `${user?.id}`
                    ) && <Tab label="Dev Tools" />}

                    <Tab label="Admin Dashboard" />
                </Tabs>
            </Grid>

            {/* Dev Tools Tab */}
            {tabValue === 0 &&
                process.env.REACT_APP_DEV_IDS.split(",").includes(
                    `${user?.id}`
                ) && (
                    <Grid item xs={12} sx={{ mt: 2 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={3}>
                                <Tooltip title="Run monthly matter manager group emails">
                                    <Button
                                        variant="outlined"
                                        fullWidth
                                        onClick={() =>
                                            RunMatterManagerMonthlyGroupReport()
                                        }
                                    >
                                        Run MM Report
                                    </Button>
                                </Tooltip>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Tooltip title="Get All Connected Users">
                                    <Button
                                        variant="outlined"
                                        fullWidth
                                        onClick={async () =>
                                            await GetConnectedUsers().then(
                                                (resp) => console.log(resp)
                                            )
                                        }
                                    >
                                        Log Connected Users
                                    </Button>
                                </Tooltip>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Tooltip title="Get Socket Status">
                                    <Button
                                        variant="outlined"
                                        fullWidth
                                        onClick={async () =>
                                            await GetConnectionStatus().then(
                                                (resp) => console.log(resp)
                                            )
                                        }
                                    >
                                        Log Socket Status
                                    </Button>
                                </Tooltip>
                            </Grid>
                        </Grid>
                    </Grid>
                )}

            {/* Admin Dashboard Tab */}
            {((tabValue === 1 &&
                process.env.REACT_APP_DEV_IDS.split(",").includes(
                    `${user?.id}`
                )) ||
                (tabValue === 0 &&
                    !process.env.REACT_APP_DEV_IDS.split(",").includes(
                        `${user?.id}`
                    ))) && (
                <>
                    {/* Header */}
                    <Grid item xs={12} sx={{ mt: 3 }}>
                        <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                        >
                            <Typography variant="h4">
                                Connected Users Dashboard
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={
                                    isLoading ? (
                                        <CircularProgress
                                            size={16}
                                            color="inherit"
                                        />
                                    ) : (
                                        <RefreshIcon />
                                    )
                                }
                                onClick={handleRefresh}
                                disabled={isLoading}
                            >
                                Refresh
                            </Button>
                        </Box>
                    </Grid>

                    {/* Stats Cards */}
                    {connectionStats && (
                        <Grid item xs={12} sx={{ mt: 3 }}>
                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6} md={2.4}>
                                    <StatCard
                                        title="Total Connected"
                                        value={connectionStats.total}
                                        icon={
                                            <PersonIcon sx={{ fontSize: 40 }} />
                                        }
                                        color="primary"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6} md={2.4}>
                                    <StatCard
                                        title="Admins Online"
                                        value={connectionStats.admins}
                                        icon={
                                            <AdminIcon sx={{ fontSize: 40 }} />
                                        }
                                        color="secondary"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6} md={2.4}>
                                    <StatCard
                                        title="Office Admins"
                                        value={
                                            connectionStats.officeAdmins || 0
                                        }
                                        icon={
                                            <AdminIcon sx={{ fontSize: 40 }} />
                                        }
                                        color="warning"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6} md={2.4}>
                                    <StatCard
                                        title="Regular Users"
                                        value={connectionStats.regular}
                                        icon={
                                            <PersonIcon sx={{ fontSize: 40 }} />
                                        }
                                        color="info"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6} md={2.4}>
                                    <StatCard
                                        title="Locations"
                                        value={
                                            Object.keys(
                                                connectionStats.byLocation || {}
                                            ).length
                                        }
                                        icon={
                                            <LocationIcon
                                                sx={{ fontSize: 40 }}
                                            />
                                        }
                                        color="success"
                                    />
                                </Grid>
                            </Grid>
                        </Grid>
                    )}

                    {/* Location Breakdown */}
                    {connectionStats?.byLocation &&
                        Object.keys(connectionStats.byLocation).length > 0 && (
                            <Grid item xs={12} sx={{ mt: 3 }}>
                                <Card>
                                    <CardHeader title="Users by Location" />
                                    <CardContent>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                flexWrap: "wrap",
                                                gap: 1,
                                            }}
                                        >
                                            {Object.entries(
                                                connectionStats.byLocation
                                            ).map(([locationId, count]) => (
                                                <Chip
                                                    key={locationId}
                                                    label={`${getLocationName(
                                                        parseInt(locationId)
                                                    )}: ${count}`}
                                                    color="primary"
                                                    variant="outlined"
                                                />
                                            ))}
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        )}

                    {/* Connected Users Table */}
                    <Grid item xs={12} sx={{ mt: 3, mb: 3 }}>
                        <Card>
                            <CardHeader
                                title={
                                    <Box
                                        display="flex"
                                        alignItems="center"
                                        gap={3}
                                    >
                                        Connected Users
                                        <Badge
                                            badgeContent={connectedUsers.length}
                                            color="primary"
                                        />
                                    </Box>
                                }
                            />
                            <CardContent sx={{ p: 0 }}>
                                <TableContainer
                                    component={Paper}
                                    sx={{ maxHeight: 500 }}
                                >
                                    <Table stickyHeader size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>User</TableCell>
                                                <TableCell>Role</TableCell>
                                                <TableCell>Location</TableCell>
                                                <TableCell>
                                                    Connected Time
                                                </TableCell>
                                                <TableCell>Duration</TableCell>
                                                <TableCell>Socket ID</TableCell>
                                                <TableCell align="center">
                                                    Actions
                                                </TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {isLoading ? (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={7}
                                                        align="center"
                                                    >
                                                        <CircularProgress />
                                                    </TableCell>
                                                </TableRow>
                                            ) : connectedUsers.length === 0 ? (
                                                <EmptyState message="No users currently connected" />
                                            ) : (
                                                connectedUsers.map(
                                                    (connectedUser) => (
                                                        <TableRow
                                                            key={
                                                                connectedUser.id
                                                            }
                                                            hover
                                                        >
                                                            <TableCell>
                                                                <Box>
                                                                    <Typography
                                                                        variant="body2"
                                                                        sx={{
                                                                            fontWeight:
                                                                                "bold",
                                                                        }}
                                                                    >
                                                                        {
                                                                            connectedUser.firstName
                                                                        }{" "}
                                                                        {
                                                                            connectedUser.lastName
                                                                        }
                                                                    </Typography>
                                                                    <Typography
                                                                        variant="caption"
                                                                        color="text.secondary"
                                                                    >
                                                                        @
                                                                        {
                                                                            connectedUser.username
                                                                        }
                                                                    </Typography>
                                                                    <Typography
                                                                        variant="caption"
                                                                        color="text.secondary"
                                                                        display="block"
                                                                    >
                                                                        {
                                                                            connectedUser.email
                                                                        }
                                                                    </Typography>
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Chip
                                                                    size="small"
                                                                    label={
                                                                        connectedUser.admin
                                                                            ? "Admin"
                                                                            : "User"
                                                                    }
                                                                    color={
                                                                        connectedUser.admin
                                                                            ? "error"
                                                                            : "default"
                                                                    }
                                                                    icon={
                                                                        connectedUser.admin ? (
                                                                            <AdminIcon />
                                                                        ) : (
                                                                            <PersonIcon />
                                                                        )
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Chip
                                                                    size="small"
                                                                    label={getLocationName(
                                                                        connectedUser.location
                                                                    )}
                                                                    variant="outlined"
                                                                    icon={
                                                                        <LocationIcon />
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Typography variant="caption">
                                                                    {formatConnectedTime(
                                                                        connectedUser.connectedAt
                                                                    )}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Chip
                                                                    size="small"
                                                                    label={getTimeSinceConnected(
                                                                        connectedUser.connectedAt
                                                                    )}
                                                                    color="success"
                                                                    icon={
                                                                        <TimeIcon />
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Typography
                                                                    variant="caption"
                                                                    sx={{
                                                                        fontFamily:
                                                                            "monospace",
                                                                        fontSize:
                                                                            "0.7rem",
                                                                    }}
                                                                >
                                                                    {
                                                                        connectedUser.socketId
                                                                    }
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <Tooltip
                                                                    title={
                                                                        connectedUser.id ===
                                                                        user?.id
                                                                            ? "Cannot logout yourself"
                                                                            : !user?.admin
                                                                            ? "Must be an Admin to perform this action"
                                                                            : `Force logout ${connectedUser.username}`
                                                                    }
                                                                >
                                                                    <span>
                                                                        <IconButton
                                                                            color="error"
                                                                            size="small"
                                                                            onClick={() =>
                                                                                setLogoutDialog(
                                                                                    {
                                                                                        open: true,
                                                                                        user: connectedUser,
                                                                                    }
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                connectedUser.id ===
                                                                                    user?.id ||
                                                                                !user?.admin
                                                                            }
                                                                        >
                                                                            <LogoutIcon />
                                                                        </IconButton>
                                                                    </span>
                                                                </Tooltip>
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                )
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </CardContent>
                        </Card>
                    </Grid>
                </>
            )}

            {/* Force Logout Dialog */}
            <Dialog
                open={logoutDialog.open}
                onClose={() => setLogoutDialog({ open: false, user: null })}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                    <WarningIcon color="warning" />
                    Force Logout User
                </DialogTitle>
                <DialogContent>
                    {logoutDialog.user && (
                        <Box sx={{ pt: 1 }}>
                            <Box
                                sx={{
                                    p: 2,
                                    mb: 2,
                                    backgroundColor:
                                        theme.palette.warning.light,
                                    borderRadius: 1,
                                    border: `1px solid ${theme.palette.warning.main}`,
                                }}
                            >
                                <Typography
                                    variant="body1"
                                    sx={{ fontWeight: "bold" }}
                                >
                                    Warning: Force Logout Action
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 1 }}>
                                    You are about to force logout{" "}
                                    <strong>
                                        {logoutDialog.user.username}
                                    </strong>{" "}
                                    from{" "}
                                    {getLocationName(
                                        logoutDialog.user.location
                                    )}
                                    . This will immediately disconnect them from
                                    the application.
                                </Typography>
                            </Box>
                            <TextField
                                fullWidth
                                label="Reason for logout (optional)"
                                multiline
                                rows={3}
                                value={logoutReason}
                                onChange={(e) =>
                                    setLogoutReason(e.target.value)
                                }
                                placeholder="Enter reason for forcing logout..."
                                variant="outlined"
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
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
                                <CircularProgress size={16} color="inherit" />
                            ) : (
                                <LogoutIcon />
                            )
                        }
                    >
                        Force Logout
                    </Button>
                </DialogActions>
            </Dialog>
        </Grid>
    );
};

export default AdminDashboard;
