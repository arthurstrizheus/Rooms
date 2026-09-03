import React, { useState, useEffect } from "react";
import { Alert, Typography, Link } from "@mui/material";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import axios from "axios";
import TaxTableDialog from "./TaxTableDialog";

const EMPTY_DRAFT = {
    taxYear: "",
    bonusPercent: "",
    notes: "",
    source: "",
};

// Stored as a decimal (0.4); shown and entered as a percentage (40).
const PERCENT_COLUMN = {
    key: "bonusPercent",
    label: "Bonus depreciation %",
    type: "percent",
    width: 130,
    placeholder: "20",
    inputProps: { min: 0, max: 100, step: 1 },
    toInput: (value) =>
        value === "" || value == null ? "" : Number(value) * 100,
    fromInput: (raw) => (raw === "" ? "" : parseFloat(raw) / 100),
};

/** IRC 168(k) bonus depreciation rate, per tax year. */
const BonusRatesDialog = ({ open, onClose }) => {
    const [rates, setRates] = useState([]);
    const [editingYear, setEditingYear] = useState(null);
    const [draft, setDraft] = useState(EMPTY_DRAFT);
    const [isAdding, setIsAdding] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) fetchRates();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const authHeaders = () => ({
        headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
    });

    const fetchRates = async () => {
        try {
            setLoading(true);
            const response = await axios.get("/api/bonus-rates", authHeaders());
            setRates(response.data.rates || []);
            setError("");
        } catch (err) {
            console.error("Error fetching bonus rates:", err);
            setError("Failed to load bonus depreciation rates");
        } finally {
            setLoading(false);
        }
    };

    const handleStartAdd = () => {
        setIsAdding(true);
        setDraft({ ...EMPTY_DRAFT, taxYear: new Date().getFullYear() + 1 });
    };

    const handleCancelAdd = () => {
        setIsAdding(false);
        setDraft(EMPTY_DRAFT);
        setError("");
    };

    const handleSaveNew = async () => {
        // The draft holds a decimal, same as a stored row.
        if (!draft.taxYear || draft.bonusPercent === "") {
            setError("Tax year and bonus percentage are required");
            return;
        }

        const bonusValue = parseFloat(draft.bonusPercent);
        if (Number.isNaN(bonusValue) || bonusValue < 0 || bonusValue > 1) {
            setError("Bonus percentage must be between 0 and 100");
            return;
        }

        try {
            await axios.post(
                "/api/bonus-rates",
                {
                    taxYear: parseInt(draft.taxYear, 10),
                    bonusPercent: bonusValue,
                    notes: draft.notes,
                    source: draft.source,
                },
                authHeaders(),
            );

            setIsAdding(false);
            setDraft(EMPTY_DRAFT);
            fetchRates();
            setError("");
        } catch (err) {
            console.error("Error adding rate:", err);
            setError(err.response?.data?.message || "Failed to add bonus rate");
        }
    };

    const handleSaveEdit = async (year) => {
        const rate = rates.find((r) => r.taxYear === year);
        if (!rate) return;

        const bonusValue = parseFloat(rate.bonusPercent);
        if (Number.isNaN(bonusValue) || bonusValue < 0 || bonusValue > 1) {
            setError("Bonus percentage must be between 0 and 100");
            return;
        }

        try {
            await axios.put(
                `/api/bonus-rates/${year}`,
                {
                    bonusPercent: bonusValue,
                    notes: rate.notes,
                    source: rate.source,
                },
                authHeaders(),
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

    const handleDelete = async (year) => {
        try {
            await axios.delete(`/api/bonus-rates/${year}`, authHeaders());
            fetchRates();
            setError("");
        } catch (err) {
            console.error("Error deleting rate:", err);
            setError(err.response?.data?.message || "Failed to delete rate");
        }
    };

    const handleRowChange = (year, field, value) =>
        setRates((prev) =>
            prev.map((rate) =>
                rate.taxYear === year ? { ...rate, [field]: value } : rate,
            ),
        );

    return (
        <TaxTableDialog
            open={open}
            onClose={onClose}
            title="Bonus depreciation rates"
            subtitle="IRC §168(k), per tax year"
            icon={<TrendingDownIcon />}
            description={
                <Alert severity="info" sx={{ boxShadow: "none" }}>
                    <Typography variant="body2">
                        The TCJA phase-down schedule is 100% (2017–2022), 80%
                        (2023), 60% (2024), 40% (2025), 20% (2026) and 0% from
                        2027. See{" "}
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
            }
            columns={[
                {
                    key: "taxYear",
                    label: "Tax year",
                    type: "number",
                    width: 110,
                    placeholder: "2026",
                    newOnly: true,
                },
                PERCENT_COLUMN,
                {
                    key: "notes",
                    label: "Notes",
                    type: "text",
                    placeholder: "TCJA phase-down",
                },
                {
                    key: "source",
                    label: "Source",
                    type: "link",
                    placeholder: "https://www.irs.gov…",
                },
            ]}
            rows={rates}
            loading={loading}
            error={error}
            onDismissError={() => setError("")}
            isAdding={isAdding}
            draft={draft}
            onDraftChange={setDraft}
            onStartAdd={handleStartAdd}
            onCancelAdd={handleCancelAdd}
            onSaveNew={handleSaveNew}
            editingKey={editingYear}
            onStartEdit={(year) => {
                setEditingYear(year);
                setError("");
            }}
            onCancelEdit={() => {
                setEditingYear(null);
                fetchRates();
                setError("");
            }}
            onSaveEdit={handleSaveEdit}
            onRowChange={handleRowChange}
            onDelete={handleDelete}
            deleteMessage={(year) =>
                `Delete the bonus depreciation rate for tax year ${year}? This cannot be undone.`
            }
            emptyTitle="No bonus rates defined"
            emptyDescription="Add a tax year to record its bonus depreciation rate."
        />
    );
};

export default BonusRatesDialog;
