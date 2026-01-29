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

const PassengerAutoLimitsDialog = ({ open, onClose }) => {
    const [limits, setLimits] = useState([]);
    const [editingYear, setEditingYear] = useState(null);
    const [newLimit, setNewLimit] = useState({
        taxYear: "",
        year1_withBonus: "",
        year1_noBonus: "",
        year2: "",
        year3: "",
        year4Plus: "",
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
            const response = await axios.get("/api/passenger-auto-limits", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setLimits(response.data.limits || []);
            setError("");
        } catch (err) {
            console.error("Error fetching passenger auto limits:", err);
            setError("Failed to load passenger auto limits");
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setIsAdding(true);
        setNewLimit({
            taxYear: new Date().getFullYear() + 1,
            year1_withBonus: "",
            year1_noBonus: "",
            year2: "",
            year3: "",
            year4Plus: "",
            source: "",
        });
    };

    const handleSaveNew = async () => {
        try {
            // Validate all required fields
            if (
                !newLimit.taxYear ||
                !newLimit.year1_withBonus ||
                !newLimit.year1_noBonus ||
                !newLimit.year2 ||
                !newLimit.year3 ||
                !newLimit.year4Plus
            ) {
                setError("All fields are required");
                return;
            }

            // Parse and validate numeric values
            const values = {
                taxYear: parseInt(newLimit.taxYear),
                year1_withBonus: parseInt(newLimit.year1_withBonus),
                year1_noBonus: parseInt(newLimit.year1_noBonus),
                year2: parseInt(newLimit.year2),
                year3: parseInt(newLimit.year3),
                year4Plus: parseInt(newLimit.year4Plus),
            };

            // Check for NaN or negative values
            for (const [key, value] of Object.entries(values)) {
                if (key !== "taxYear" && (isNaN(value) || value <= 0)) {
                    setError(`${key} must be a positive number`);
                    return;
                }
            }

            const token = localStorage.getItem("authToken");
            await axios.post(
                "/api/passenger-auto-limits",
                {
                    ...values,
                    source: newLimit.source,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );

            setIsAdding(false);
            setNewLimit({
                taxYear: "",
                year1_withBonus: "",
                year1_noBonus: "",
                year2: "",
                year3: "",
                year4Plus: "",
                source: "",
            });
            fetchLimits();
            setError("");
        } catch (err) {
            console.error("Error adding limit:", err);
            setError(
                err.response?.data?.message ||
                    "Failed to add passenger auto limit",
            );
        }
    };

    const handleCancelNew = () => {
        setIsAdding(false);
        setNewLimit({
            taxYear: "",
            year1_withBonus: "",
            year1_noBonus: "",
            year2: "",
            year3: "",
            year4Plus: "",
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

            // Parse and validate all year cap values
            const values = {
                year1_withBonus: parseInt(limit.year1_withBonus),
                year1_noBonus: parseInt(limit.year1_noBonus),
                year2: parseInt(limit.year2),
                year3: parseInt(limit.year3),
                year4Plus: parseInt(limit.year4Plus),
            };

            // Check for NaN or negative values
            for (const [key, value] of Object.entries(values)) {
                if (isNaN(value) || value <= 0) {
                    setError(`${key} must be a positive number`);
                    return;
                }
            }

            const token = localStorage.getItem("authToken");
            await axios.put(
                `/api/passenger-auto-limits/${year}`,
                {
                    ...values,
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
                    "Failed to update passenger auto limit",
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
                `Delete passenger auto limits for tax year ${year}? This cannot be undone.`,
            )
        ) {
            return;
        }

        try {
            const token = localStorage.getItem("authToken");
            await axios.delete(`/api/passenger-auto-limits/${year}`, {
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
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>
                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                >
                    <Typography variant="h6">
                        Passenger Auto 280F Limits
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
                        IRC Section 280F annual depreciation caps for passenger
                        automobiles (luxury auto limits). Applies to vehicles
                        with GVWR under 6,000 lbs and not qualifying as trucks.
                        See{" "}
                        <Link
                            href="https://www.irs.gov/publications/p946"
                            target="_blank"
                            rel="noopener"
                        >
                            IRS Publication 946
                        </Link>{" "}
                        and annual Revenue Procedures.
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
                                    <strong>Year 1 (w/ Bonus)</strong>
                                </TableCell>
                                <TableCell>
                                    <strong>Year 1 (no Bonus)</strong>
                                </TableCell>
                                <TableCell>
                                    <strong>Year 2</strong>
                                </TableCell>
                                <TableCell>
                                    <strong>Year 3</strong>
                                </TableCell>
                                <TableCell>
                                    <strong>Year 4+</strong>
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
                                            sx={{ width: 90 }}
                                            placeholder="2026"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            type="number"
                                            value={newLimit.year1_withBonus}
                                            onChange={(e) =>
                                                setNewLimit({
                                                    ...newLimit,
                                                    year1_withBonus:
                                                        e.target.value,
                                                })
                                            }
                                            size="small"
                                            sx={{ width: 120 }}
                                            placeholder="20200"
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
                                            value={newLimit.year1_noBonus}
                                            onChange={(e) =>
                                                setNewLimit({
                                                    ...newLimit,
                                                    year1_noBonus:
                                                        e.target.value,
                                                })
                                            }
                                            size="small"
                                            sx={{ width: 120 }}
                                            placeholder="12200"
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
                                            value={newLimit.year2}
                                            onChange={(e) =>
                                                setNewLimit({
                                                    ...newLimit,
                                                    year2: e.target.value,
                                                })
                                            }
                                            size="small"
                                            sx={{ width: 120 }}
                                            placeholder="19600"
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
                                            value={newLimit.year3}
                                            onChange={(e) =>
                                                setNewLimit({
                                                    ...newLimit,
                                                    year3: e.target.value,
                                                })
                                            }
                                            size="small"
                                            sx={{ width: 120 }}
                                            placeholder="11800"
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
                                            value={newLimit.year4Plus}
                                            onChange={(e) =>
                                                setNewLimit({
                                                    ...newLimit,
                                                    year4Plus: e.target.value,
                                                })
                                            }
                                            size="small"
                                            sx={{ width: 120 }}
                                            placeholder="11800"
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
                                                value={limit.year1_withBonus}
                                                onChange={(e) =>
                                                    handleLimitChange(
                                                        limit.taxYear,
                                                        "year1_withBonus",
                                                        e.target.value,
                                                    )
                                                }
                                                size="small"
                                                sx={{ width: 120 }}
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
                                                limit.year1_withBonus,
                                            )
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {editingYear === limit.taxYear ? (
                                            <TextField
                                                type="number"
                                                value={limit.year1_noBonus}
                                                onChange={(e) =>
                                                    handleLimitChange(
                                                        limit.taxYear,
                                                        "year1_noBonus",
                                                        e.target.value,
                                                    )
                                                }
                                                size="small"
                                                sx={{ width: 120 }}
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            $
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />
                                        ) : (
                                            formatCurrency(limit.year1_noBonus)
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {editingYear === limit.taxYear ? (
                                            <TextField
                                                type="number"
                                                value={limit.year2}
                                                onChange={(e) =>
                                                    handleLimitChange(
                                                        limit.taxYear,
                                                        "year2",
                                                        e.target.value,
                                                    )
                                                }
                                                size="small"
                                                sx={{ width: 120 }}
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            $
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />
                                        ) : (
                                            formatCurrency(limit.year2)
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {editingYear === limit.taxYear ? (
                                            <TextField
                                                type="number"
                                                value={limit.year3}
                                                onChange={(e) =>
                                                    handleLimitChange(
                                                        limit.taxYear,
                                                        "year3",
                                                        e.target.value,
                                                    )
                                                }
                                                size="small"
                                                sx={{ width: 120 }}
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            $
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />
                                        ) : (
                                            formatCurrency(limit.year3)
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {editingYear === limit.taxYear ? (
                                            <TextField
                                                type="number"
                                                value={limit.year4Plus}
                                                onChange={(e) =>
                                                    handleLimitChange(
                                                        limit.taxYear,
                                                        "year4Plus",
                                                        e.target.value,
                                                    )
                                                }
                                                size="small"
                                                sx={{ width: 120 }}
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            $
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />
                                        ) : (
                                            formatCurrency(limit.year4Plus)
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
                                        colSpan={8}
                                        align="center"
                                        sx={{ py: 3 }}
                                    >
                                        <Typography color="text.secondary">
                                            No passenger auto limits defined.
                                            Click "Add Year" to create one.
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

export default PassengerAutoLimitsDialog;
