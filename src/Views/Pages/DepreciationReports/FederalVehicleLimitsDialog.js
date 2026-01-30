import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    TextField,
    Box,
    Typography,
    Alert,
    Chip,
    Link,
} from "@mui/material";
import { Add, Edit, Delete, Save, Cancel, Info } from "@mui/icons-material";
import axios from "axios";

const FederalVehicleLimitsDialog = ({ open, onClose }) => {
    const [limits, setLimits] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [newLimit, setNewLimit] = useState({
        taxYear: "",
        suv179Cap: "",
        source: "",
        notes: "",
    });
    const [isAdding, setIsAdding] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            fetchLimits();
        }
    }, [open]);

    const fetchLimits = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("authToken");
            const response = await axios.get("/api/federal-vehicle-limits", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setLimits(response.data.limits || []);
            setError("");
        } catch (err) {
            console.error("Error fetching limits:", err);
            setError("Failed to load federal vehicle limits");
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setIsAdding(true);
        setNewLimit({
            taxYear: new Date().getFullYear() + 1,
            suv179Cap: "",
            source: "",
            notes: "",
        });
    };

    const handleSaveNew = async () => {
        try {
            if (!newLimit.taxYear || !newLimit.suv179Cap) {
                setError("Tax year and SUV cap are required");
                return;
            }

            const token = localStorage.getItem("authToken");
            await axios.post(
                "/api/federal-vehicle-limits",
                {
                    taxYear: parseInt(newLimit.taxYear),
                    suv179Cap: parseFloat(newLimit.suv179Cap),
                    source: newLimit.source,
                    notes: newLimit.notes,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );

            setIsAdding(false);
            setNewLimit({ taxYear: "", suv179Cap: "", source: "", notes: "" });
            fetchLimits();
            setError("");
        } catch (err) {
            console.error("Error adding limit:", err);
            setError(
                err.response?.data?.message ||
                    "Failed to add limit. Year may already exist.",
            );
        }
    };

    const handleCancelAdd = () => {
        setIsAdding(false);
        setNewLimit({ taxYear: "", suv179Cap: "", source: "", notes: "" });
        setError("");
    };

    const handleEdit = (limit) => {
        setEditingId(limit.taxYear);
    };

    const handleSaveEdit = async (year) => {
        try {
            const limitToUpdate = limits.find((l) => l.taxYear === year);
            const token = localStorage.getItem("authToken");
            await axios.put(
                `/api/federal-vehicle-limits/${year}`,
                {
                    suv179Cap: parseFloat(limitToUpdate.suv179Cap),
                    source: limitToUpdate.source,
                    notes: limitToUpdate.notes,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );

            setEditingId(null);
            fetchLimits();
            setError("");
        } catch (err) {
            console.error("Error updating limit:", err);
            setError(err.response?.data?.message || "Failed to update limit");
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        fetchLimits();
        setError("");
    };

    const handleDelete = async (year) => {
        if (
            !window.confirm(
                `Delete Section 179 SUV cap for tax year ${year}? This cannot be undone.`,
            )
        ) {
            return;
        }

        try {
            const token = localStorage.getItem("authToken");
            await axios.delete(`/api/federal-vehicle-limits/${year}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            fetchLimits();
            setError("");
        } catch (err) {
            console.error("Error deleting limit:", err);
            setError(err.response?.data?.message || "Failed to delete limit");
        }
    };

    const handleLimitChange = (year, field, value) => {
        setLimits(
            limits.map((limit) =>
                limit.taxYear === year ? { ...limit, [field]: value } : limit,
            ),
        );
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>
                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                >
                    <Typography variant="h6">
                        Federal Vehicle Section 179 Limits
                    </Typography>
                    <Button
                        startIcon={<Add />}
                        onClick={handleAdd}
                        variant="contained"
                        disabled={isAdding}
                    >
                        Add Year
                    </Button>
                </Box>
            </DialogTitle>
            <DialogContent dividers>
                <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                        These are the IRS Section 179 deduction caps for SUVs
                        and trucks with GVWR between 6,000 and 14,000 lbs.
                        Update annually based on{" "}
                        <Link
                            href="https://www.irs.gov/publications/p946#en_US_2024_publink1000107384"
                            target="_blank"
                            rel="noopener"
                        >
                            IRS Publication 946
                        </Link>{" "}
                        and Revenue Procedures.
                    </Typography>
                </Alert>

                {error && (
                    <Alert
                        severity="error"
                        sx={{ mb: 2 }}
                        onClose={() => setError("")}
                    >
                        {error}
                    </Alert>
                )}

                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>
                                    <strong>Tax Year</strong>
                                </TableCell>
                                <TableCell>
                                    <strong>SUV Section 179 Cap</strong>
                                </TableCell>
                                <TableCell>
                                    <strong>IRS Source</strong>
                                </TableCell>
                                <TableCell>
                                    <strong>Notes</strong>
                                </TableCell>
                                <TableCell align="right">
                                    <strong>Actions</strong>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isAdding && (
                                <TableRow sx={{ backgroundColor: "#f0f8ff" }}>
                                    <TableCell>
                                        <TextField
                                            type="number"
                                            value={newLimit.taxYear}
                                            onChange={(e) =>
                                                setNewLimit({
                                                    ...newLimit,
                                                    taxYear: e.target.value,
                                                })
                                            }
                                            size="small"
                                            fullWidth
                                            required
                                            placeholder="2027"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            type="number"
                                            value={newLimit.suv179Cap}
                                            onChange={(e) =>
                                                setNewLimit({
                                                    ...newLimit,
                                                    suv179Cap: e.target.value,
                                                })
                                            }
                                            size="small"
                                            fullWidth
                                            required
                                            InputProps={{
                                                startAdornment: "$",
                                            }}
                                            placeholder="32000"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            value={newLimit.source}
                                            onChange={(e) =>
                                                setNewLimit({
                                                    ...newLimit,
                                                    source: e.target.value,
                                                })
                                            }
                                            size="small"
                                            fullWidth
                                            placeholder="Rev. Proc. 2026-XX"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            value={newLimit.notes}
                                            onChange={(e) =>
                                                setNewLimit({
                                                    ...newLimit,
                                                    notes: e.target.value,
                                                })
                                            }
                                            size="small"
                                            fullWidth
                                            placeholder="Optional notes"
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            onClick={handleSaveNew}
                                            color="primary"
                                            size="small"
                                        >
                                            <Save />
                                        </IconButton>
                                        <IconButton
                                            onClick={handleCancelAdd}
                                            color="error"
                                            size="small"
                                        >
                                            <Cancel />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            )}

                            {limits
                                .sort((a, b) => b.taxYear - a.taxYear)
                                .map((limit) => (
                                    <TableRow key={limit.taxYear}>
                                        <TableCell>
                                            <strong>{limit.taxYear}</strong>
                                            {limit.taxYear >=
                                                new Date().getFullYear() && (
                                                <Chip
                                                    label="Current"
                                                    size="small"
                                                    color="primary"
                                                    sx={{ ml: 1 }}
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {editingId === limit.taxYear ? (
                                                <TextField
                                                    type="number"
                                                    value={limit.suv179Cap}
                                                    onChange={(e) =>
                                                        handleLimitChange(
                                                            limit.taxYear,
                                                            "suv179Cap",
                                                            e.target.value,
                                                        )
                                                    }
                                                    size="small"
                                                    fullWidth
                                                    InputProps={{
                                                        startAdornment: "$",
                                                    }}
                                                />
                                            ) : (
                                                <Typography>
                                                    $
                                                    {parseInt(
                                                        limit.suv179Cap,
                                                    ).toLocaleString()}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {editingId === limit.taxYear ? (
                                                <TextField
                                                    value={limit.source || ""}
                                                    onChange={(e) =>
                                                        handleLimitChange(
                                                            limit.taxYear,
                                                            "source",
                                                            e.target.value,
                                                        )
                                                    }
                                                    size="small"
                                                    fullWidth
                                                />
                                            ) : (
                                                <Typography variant="body2">
                                                    {limit.source || "—"}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {editingId === limit.taxYear ? (
                                                <TextField
                                                    value={limit.notes || ""}
                                                    onChange={(e) =>
                                                        handleLimitChange(
                                                            limit.taxYear,
                                                            "notes",
                                                            e.target.value,
                                                        )
                                                    }
                                                    size="small"
                                                    fullWidth
                                                />
                                            ) : (
                                                <Typography variant="body2">
                                                    {limit.notes || "—"}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            {editingId === limit.taxYear ? (
                                                <>
                                                    <IconButton
                                                        onClick={() =>
                                                            handleSaveEdit(
                                                                limit.taxYear,
                                                            )
                                                        }
                                                        color="primary"
                                                        size="small"
                                                    >
                                                        <Save />
                                                    </IconButton>
                                                    <IconButton
                                                        onClick={
                                                            handleCancelEdit
                                                        }
                                                        color="error"
                                                        size="small"
                                                    >
                                                        <Cancel />
                                                    </IconButton>
                                                </>
                                            ) : (
                                                <>
                                                    <IconButton
                                                        onClick={() =>
                                                            handleEdit(limit)
                                                        }
                                                        size="small"
                                                    >
                                                        <Edit />
                                                    </IconButton>
                                                    <IconButton
                                                        onClick={() =>
                                                            handleDelete(
                                                                limit.taxYear,
                                                            )
                                                        }
                                                        size="small"
                                                        color="error"
                                                    >
                                                        <Delete />
                                                    </IconButton>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}

                            {limits.length === 0 && !isAdding && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        <Typography color="text.secondary">
                                            No limits defined. Click "Add Year"
                                            to add the first entry.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Alert severity="warning" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                        <strong>Important:</strong> Changes take effect
                        immediately for new equipment saves. Existing equipment
                        will be re-validated against updated caps when edited.
                    </Typography>
                </Alert>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

export default FederalVehicleLimitsDialog;
