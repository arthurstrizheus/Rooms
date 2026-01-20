import React, { useState, useEffect } from "react";
import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    Chip,
    IconButton,
    Button,
    useMediaQuery,
    useTheme,
    Card,
    CardContent,
    Stack,
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import { useAuth } from "../../../Utilites/AuthContext";
import axios from "axios";
import { format } from "date-fns";

const MyCheckouts = ({ setLoading, loading }) => {
    const [checkouts, setCheckouts] = useState([]);
    const { user } = useAuth();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

    useEffect(() => {
        fetchCheckouts();
    }, [user]);

    const fetchCheckouts = async () => {
        if (!user?.id) return;

        try {
            setLoading(true);
            const token = localStorage.getItem("authToken");
            const response = await axios.get(`/api/checkouts/user/${user.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setCheckouts(response.data);
        } catch (error) {
            console.error("Error fetching checkouts:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (id) => {
        if (!window.confirm("Are you sure you want to cancel this checkout?"))
            return;

        try {
            setLoading(true);
            const token = localStorage.getItem("authToken");
            await axios.put(
                `/api/checkouts/${id}`,
                { status: "cancelled" },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchCheckouts();
        } catch (error) {
            console.error("Error canceling checkout:", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "approved":
                return "success";
            case "pending":
                return "warning";
            case "checked_out":
                return "info";
            case "returned":
                return "default";
            case "cancelled":
                return "error";
            default:
                return "default";
        }
    };

    const formatDateTime = (dateString) => {
        try {
            return format(new Date(dateString), "MMM dd, yyyy hh:mm a");
        } catch (error) {
            return dateString;
        }
    };

    return (
        <Box
            sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
            }}
        >
            <Typography variant={isMobile ? "h5" : "h4"} sx={{ mb: 3 }}>
                My Checkouts
            </Typography>

            {isMobile ? (
                <Stack spacing={2}>
                    {checkouts.length === 0 ? (
                        <Card>
                            <CardContent>
                                <Typography
                                    color="text.secondary"
                                    align="center"
                                >
                                    No checkouts found
                                </Typography>
                            </CardContent>
                        </Card>
                    ) : (
                        checkouts.map((checkout) => (
                            <Card key={checkout.id}>
                                <CardContent>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "start",
                                            mb: 1,
                                        }}
                                    >
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="h6">
                                                {checkout.Equipment?.name ||
                                                    "N/A"}
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                            >
                                                {
                                                    checkout.Equipment
                                                        ?.serial_number
                                                }
                                            </Typography>
                                        </Box>
                                        {(checkout.status === "pending" ||
                                            checkout.status === "approved") && (
                                            <IconButton
                                                size="small"
                                                onClick={() =>
                                                    handleCancel(checkout.id)
                                                }
                                                color="error"
                                            >
                                                <Delete />
                                            </IconButton>
                                        )}
                                    </Box>
                                    <Stack spacing={1} sx={{ mt: 2 }}>
                                        <Box>
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                            >
                                                Start:
                                            </Typography>
                                            <Typography variant="body2">
                                                {formatDateTime(
                                                    checkout.start_time
                                                )}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                            >
                                                End:
                                            </Typography>
                                            <Typography variant="body2">
                                                {formatDateTime(
                                                    checkout.end_time
                                                )}
                                            </Typography>
                                        </Box>
                                        {checkout.purpose && (
                                            <Box>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                >
                                                    Purpose:
                                                </Typography>
                                                <Typography variant="body2">
                                                    {checkout.purpose}
                                                </Typography>
                                            </Box>
                                        )}
                                        <Box>
                                            <Chip
                                                label={checkout.status}
                                                color={getStatusColor(
                                                    checkout.status
                                                )}
                                                size="small"
                                            />
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </Stack>
            ) : (
                <Paper
                    sx={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                    }}
                >
                    <TableContainer sx={{ flex: 1, overflow: "auto" }}>
                        <Table stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Equipment</TableCell>
                                    <TableCell>Start Time</TableCell>
                                    <TableCell>End Time</TableCell>
                                    <TableCell>Purpose</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {checkouts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center">
                                            <Typography color="text.secondary">
                                                No checkouts found
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    checkouts.map((checkout) => (
                                        <TableRow key={checkout.id}>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {checkout.Equipment?.name ||
                                                        "N/A"}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                >
                                                    {
                                                        checkout.Equipment
                                                            ?.serial_number
                                                    }
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                {formatDateTime(
                                                    checkout.start_time
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {formatDateTime(
                                                    checkout.end_time
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {checkout.purpose || "N/A"}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={checkout.status}
                                                    color={getStatusColor(
                                                        checkout.status
                                                    )}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {(checkout.status ===
                                                    "pending" ||
                                                    checkout.status ===
                                                        "approved") && (
                                                    <IconButton
                                                        size="small"
                                                        onClick={() =>
                                                            handleCancel(
                                                                checkout.id
                                                            )
                                                        }
                                                        color="error"
                                                    >
                                                        <Delete />
                                                    </IconButton>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}
        </Box>
    );
};

export default MyCheckouts;
