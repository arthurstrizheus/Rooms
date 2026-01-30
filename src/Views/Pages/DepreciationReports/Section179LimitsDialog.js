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
    Link,
    InputAdornment,
} from "@mui/material";
import { Add, Edit, Delete, Save, Cancel } from "@mui/icons-material";
import axios from "axios";

const Section179LimitsDialog = ({ open, onClose }) => {
    const [limits, setLimits] = useState([]);
    const [editingYear, setEditingYear] = useState(null);
    const [newLimit, setNewLimit] = useState({
        taxYear: "",
        maxDeduction: "",
        phaseoutThreshold: "",
        source: "",
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
            const response = await axios.get("/api/section179-limits", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setLimits(response.data.limits || []);
            setError("");
        } catch (err) {
            console.error("Error fetching Section 179 limits:", err);
            setError("Failed to load Section 179 limits");
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setIsAdding(true);
        setNewLimit({
            taxYear: new Date().getFullYear() + 1,
            maxDeduction: "",
            phaseoutThreshold: "",
            source: "",
        });
    };

    const handleSaveNew = async () => {
        try {
            if (
                !newLimit.taxYear ||
                !newLimit.maxDeduction ||
                !newLimit.phaseoutThreshold
            ) {
                setError("All fields are required");
                return;
            }

            const maxDed = parseInt(newLimit.maxDeduction);
            const phaseout = parseInt(newLimit.phaseoutThreshold);

            if (isNaN(maxDed) || maxDed <= 0) {
                setError("Max deduction must be a positive number");
                return;
            }

            if (isNaN(phaseout) || phaseout <= 0) {
                setError("Phase-out threshold must be a positive number");
                return;
            }

            const token = localStorage.getItem("authToken");
            await axios.post(
                "/api/section179-limits",
                {
                    taxYear: parseInt(newLimit.taxYear),
                    maxDeduction: maxDed,
                    phaseoutThreshold: phaseout,
                    source: newLimit.source,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );

            setIsAdding(false);
            setNewLimit({
                taxYear: "",
                maxDeduction: "",
                phaseoutThreshold: "",
                source: "",
            });
            fetchLimits();
            setError("");
        } catch (err) {
            console.error("Error adding limit:", err);
            setError(
                err.response?.data?.message ||
                    "Failed to add Section 179 limit",
            );
        }
    };

    const handleCancelNew = () => {
        setIsAdding(false);
        setNewLimit({
            taxYear: "",
            maxDeduction: "",
            phaseoutThreshold: "",
            source: "",
        });
        setError("");
    };

    const handleEdit = (year) => {
        setEditingYear(year);
        setError("");
    };

    const handleSaveEdit = async (year) => {
        try {
            const limit = limits.find((l) => l.taxYear === year);
            if (!limit) return;

            const maxDed = parseInt(limit.maxDeduction);
            const phaseout = parseInt(limit.phaseoutThreshold);

            if (isNaN(maxDed) || maxDed <= 0) {
                setError("Max deduction must be a positive number");
                return;
            }

            if (isNaN(phaseout) || phaseout <= 0) {
                setError("Phase-out threshold must be a positive number");
                return;
            }

            const token = localStorage.getItem("authToken");
            await axios.put(
                `/api/section179-limits/${year}`,
                {
                    maxDeduction: maxDed,
                    phaseoutThreshold: phaseout,
                    source: limit.source,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );

            setEditingYear(null);
            fetchLimits();
            setError("");
        } catch (err) {
            console.error("Error updating limit:", err);
            setError(
                err.response?.data?.message ||
                    "Failed to update Section 179 limit",
            );
        }
    };

    const handleCancelEdit = () => {
        setEditingYear(null);
        fetchLimits(); // Reload to reset edited values
        setError("");
    };

    const handleDelete = async (year) => {
        if (
            !window.confirm(
                `Delete Section 179 limits for tax year ${year}? This cannot be undone.`,
            )
        ) {
            return;
        }

        try {
            const token = localStorage.getItem("authToken");
            await axios.delete(`/api/section179-limits/${year}`, {
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

    const formatCurrency = (value) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                >
                    <Typography variant="h6">
                        Section 179 Overall Limits
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
                        IRC Section 179 annual deduction limits (company-wide,
                        all equipment combined). Phase-out reduces the limit
                        dollar-for-dollar when total equipment placed in service
                        exceeds the threshold. See{" "}
                        <Link
                            href="https://www.irs.gov/publications/p946#en_US_2024_publink1000299547"
                            target="_blank"
                            rel="noopener"
                        >
                            IRS Publication 946
                        </Link>
                        .
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
                                    <strong>Max Deduction</strong>
                                </TableCell>
                                <TableCell>
                                    <strong>Phase-out Threshold</strong>
                                </TableCell>
                                <TableCell>
                                    <strong>Source</strong>
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
                                            sx={{ width: 100 }}
                                            placeholder="2026"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            type="number"
                                            value={newLimit.maxDeduction}
                                            onChange={(e) =>
                                                setNewLimit({
                                                    ...newLimit,
                                                    maxDeduction:
                                                        e.target.value,
                                                })
                                            }
                                            size="small"
                                            sx={{ width: 150 }}
                                            placeholder="1220000"
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        $
                                                    </InputAdornment>
                                                ),
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            type="number"
                                            value={newLimit.phaseoutThreshold}
                                            onChange={(e) =>
                                                setNewLimit({
                                                    ...newLimit,
                                                    phaseoutThreshold:
                                                        e.target.value,
                                                })
                                            }
                                            size="small"
                                            sx={{ width: 150 }}
                                            placeholder="3050000"
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        $
                                                    </InputAdornment>
                                                ),
                                            }}
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
                                            placeholder="https://www.irs.gov..."
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            size="small"
                                            color="primary"
                                            onClick={handleSaveNew}
                                        >
                                            <Save />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={handleCancelNew}
                                        >
                                            <Cancel />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            )}

                            {limits.map((limit) => (
                                <TableRow key={limit.taxYear}>
                                    <TableCell>{limit.taxYear}</TableCell>
                                    <TableCell>
                                        {editingYear === limit.taxYear ? (
                                            <TextField
                                                type="number"
                                                value={limit.maxDeduction}
                                                onChange={(e) =>
                                                    handleLimitChange(
                                                        limit.taxYear,
                                                        "maxDeduction",
                                                        e.target.value,
                                                    )
                                                }
                                                size="small"
                                                sx={{ width: 150 }}
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            $
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />
                                        ) : (
                                            formatCurrency(limit.maxDeduction)
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {editingYear === limit.taxYear ? (
                                            <TextField
                                                type="number"
                                                value={limit.phaseoutThreshold}
                                                onChange={(e) =>
                                                    handleLimitChange(
                                                        limit.taxYear,
                                                        "phaseoutThreshold",
                                                        e.target.value,
                                                    )
                                                }
                                                size="small"
                                                sx={{ width: 150 }}
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            $
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />
                                        ) : (
                                            formatCurrency(
                                                limit.phaseoutThreshold,
                                            )
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {editingYear === limit.taxYear ? (
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
                                                placeholder="https://..."
                                            />
                                        ) : limit.source ? (
                                            <Link
                                                href={limit.source}
                                                target="_blank"
                                                rel="noopener"
                                                sx={{ fontSize: "0.875rem" }}
                                            >
                                                View
                                            </Link>
                                        ) : (
                                            ""
                                        )}
                                    </TableCell>
                                    <TableCell align="right">
                                        {editingYear === limit.taxYear ? (
                                            <>
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() =>
                                                        handleSaveEdit(
                                                            limit.taxYear,
                                                        )
                                                    }
                                                >
                                                    <Save />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={handleCancelEdit}
                                                >
                                                    <Cancel />
                                                </IconButton>
                                            </>
                                        ) : (
                                            <>
                                                <IconButton
                                                    size="small"
                                                    onClick={() =>
                                                        handleEdit(
                                                            limit.taxYear,
                                                        )
                                                    }
                                                >
                                                    <Edit />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() =>
                                                        handleDelete(
                                                            limit.taxYear,
                                                        )
                                                    }
                                                >
                                                    <Delete />
                                                </IconButton>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}

                            {!isAdding && limits.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell
                                        colSpan={5}
                                        align="center"
                                        sx={{ py: 3 }}
                                    >
                                        <Typography color="text.secondary">
                                            No Section 179 limits defined. Click
                                            "Add Year" to create one.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

export default Section179LimitsDialog;
