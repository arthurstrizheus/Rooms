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
} from "@mui/material";
import { Add, Edit, Delete, Save, Cancel } from "@mui/icons-material";
import axios from "axios";

const BonusRatesDialog = ({ open, onClose }) => {
    const [rates, setRates] = useState([]);
    const [editingYear, setEditingYear] = useState(null);
    const [newRate, setNewRate] = useState({
        taxYear: "",
        bonusPercent: "",
        notes: "",
        source: "",
    });
    const [isAdding, setIsAdding] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            fetchRates();
        }
    }, [open]);

    const fetchRates = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("authToken");
            const response = await axios.get("/api/bonus-rates", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setRates(response.data.rates || []);
            setError("");
        } catch (err) {
            console.error("Error fetching bonus rates:", err);
            setError("Failed to load bonus depreciation rates");
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setIsAdding(true);
        setNewRate({
            taxYear: new Date().getFullYear() + 1,
            bonusPercent: "",
            notes: "",
            source: "",
        });
    };

    const handleSaveNew = async () => {
        try {
            if (!newRate.taxYear || newRate.bonusPercent === "") {
                setError("Tax year and bonus percentage are required");
                return;
            }

            const bonusValue = parseFloat(newRate.bonusPercent);
            if (isNaN(bonusValue) || bonusValue < 0 || bonusValue > 100) {
                setError("Bonus percentage must be between 0 and 100");
                return;
            }

            const token = localStorage.getItem("authToken");
            await axios.post(
                "/api/bonus-rates",
                {
                    taxYear: parseInt(newRate.taxYear),
                    bonusPercent: bonusValue / 100, // Convert to decimal
                    notes: newRate.notes,
                    source: newRate.source,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );

            setIsAdding(false);
            setNewRate({
                taxYear: "",
                bonusPercent: "",
                notes: "",
                source: "",
            });
            fetchRates();
            setError("");
        } catch (err) {
            console.error("Error adding rate:", err);
            setError(err.response?.data?.message || "Failed to add bonus rate");
        }
    };

    const handleCancelNew = () => {
        setIsAdding(false);
        setNewRate({ taxYear: "", bonusPercent: "", notes: "", source: "" });
        setError("");
    };

    const handleEdit = (year) => {
        setEditingYear(year);
        setError("");
    };

    const handleSaveEdit = async (year) => {
        try {
            const rate = rates.find((r) => r.taxYear === year);
            if (!rate) return;

            const bonusValue = parseFloat(rate.bonusPercent);
            if (isNaN(bonusValue) || bonusValue < 0 || bonusValue > 1) {
                setError("Bonus percentage must be between 0 and 100");
                return;
            }

            const token = localStorage.getItem("authToken");
            await axios.put(
                `/api/bonus-rates/${year}`,
                {
                    bonusPercent: bonusValue, // Already in decimal format from handleRateChange
                    notes: rate.notes,
                    source: rate.source,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );

            setEditingYear(null);
            fetchRates();
            setError("");
        } catch (err) {
            console.error("Error updating rate:", err);
            setError(
                err.response?.data?.message || "Failed to update bonus rate",
            );
        }
    };

    const handleCancelEdit = () => {
        setEditingYear(null);
        fetchRates(); // Reload to reset edited values
        setError("");
    };

    const handleDelete = async (year) => {
        if (
            !window.confirm(
                `Delete bonus depreciation rate for tax year ${year}? This cannot be undone.`,
            )
        ) {
            return;
        }

        try {
            const token = localStorage.getItem("authToken");
            await axios.delete(`/api/bonus-rates/${year}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            fetchRates();
            setError("");
        } catch (err) {
            console.error("Error deleting rate:", err);
            setError(err.response?.data?.message || "Failed to delete rate");
        }
    };

    const handleRateChange = (year, field, value) => {
        setRates(
            rates.map((rate) =>
                rate.taxYear === year ? { ...rate, [field]: value } : rate,
            ),
        );
    };

    const formatPercentDisplay = (decimalValue) => {
        return (decimalValue * 100).toFixed(0) + "%";
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
                        Bonus Depreciation Rates
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
                        IRS bonus depreciation rates under IRC Section 168(k).
                        The TCJA phase-down schedule: 100% (2017-2022), 80%
                        (2023), 60% (2024), 40% (2025), 20% (2026), 0% (2027+).
                        See{" "}
                        <Link
                            href="https://www.irs.gov/publications/p946"
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
                                    <strong>Bonus Depreciation %</strong>
                                </TableCell>
                                <TableCell>
                                    <strong>Notes</strong>
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
                                            value={newRate.taxYear}
                                            onChange={(e) =>
                                                setNewRate({
                                                    ...newRate,
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
                                            value={newRate.bonusPercent}
                                            onChange={(e) =>
                                                setNewRate({
                                                    ...newRate,
                                                    bonusPercent:
                                                        e.target.value,
                                                })
                                            }
                                            size="small"
                                            sx={{ width: 100 }}
                                            placeholder="20"
                                            inputProps={{
                                                min: 0,
                                                max: 100,
                                                step: 1,
                                            }}
                                            InputProps={{
                                                endAdornment: "%",
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            value={newRate.notes}
                                            onChange={(e) =>
                                                setNewRate({
                                                    ...newRate,
                                                    notes: e.target.value,
                                                })
                                            }
                                            size="small"
                                            fullWidth
                                            placeholder="TCJA phase-down"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            value={newRate.source}
                                            onChange={(e) =>
                                                setNewRate({
                                                    ...newRate,
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

                            {rates.map((rate) => (
                                <TableRow key={rate.taxYear}>
                                    <TableCell>{rate.taxYear}</TableCell>
                                    <TableCell>
                                        {editingYear === rate.taxYear ? (
                                            <TextField
                                                type="number"
                                                value={rate.bonusPercent * 100}
                                                onChange={(e) =>
                                                    handleRateChange(
                                                        rate.taxYear,
                                                        "bonusPercent",
                                                        parseFloat(
                                                            e.target.value,
                                                        ) / 100,
                                                    )
                                                }
                                                size="small"
                                                sx={{ width: 100 }}
                                                inputProps={{
                                                    min: 0,
                                                    max: 100,
                                                    step: 1,
                                                }}
                                                InputProps={{
                                                    endAdornment: "%",
                                                }}
                                            />
                                        ) : (
                                            formatPercentDisplay(
                                                rate.bonusPercent,
                                            )
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {editingYear === rate.taxYear ? (
                                            <TextField
                                                value={rate.notes || ""}
                                                onChange={(e) =>
                                                    handleRateChange(
                                                        rate.taxYear,
                                                        "notes",
                                                        e.target.value,
                                                    )
                                                }
                                                size="small"
                                                fullWidth
                                            />
                                        ) : (
                                            rate.notes || ""
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {editingYear === rate.taxYear ? (
                                            <TextField
                                                value={rate.source || ""}
                                                onChange={(e) =>
                                                    handleRateChange(
                                                        rate.taxYear,
                                                        "source",
                                                        e.target.value,
                                                    )
                                                }
                                                size="small"
                                                fullWidth
                                                placeholder="https://..."
                                            />
                                        ) : rate.source ? (
                                            <Link
                                                href={rate.source}
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
                                        {editingYear === rate.taxYear ? (
                                            <>
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() =>
                                                        handleSaveEdit(
                                                            rate.taxYear,
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
                                                        handleEdit(rate.taxYear)
                                                    }
                                                >
                                                    <Edit />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() =>
                                                        handleDelete(
                                                            rate.taxYear,
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

                            {!isAdding && rates.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell
                                        colSpan={5}
                                        align="center"
                                        sx={{ py: 3 }}
                                    >
                                        <Typography color="text.secondary">
                                            No bonus rates defined. Click "Add
                                            Year" to create one.
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

export default BonusRatesDialog;
