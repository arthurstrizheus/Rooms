import React, { useState, useEffect } from "react";
import { Alert, Typography, Link } from "@mui/material";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import axios from "axios";
import TaxTableDialog from "./TaxTableDialog";

const CAP_FIELDS = [
    ["year1_withBonus", "Year 1 (bonus)"],
    ["year1_noBonus", "Year 1 (no bonus)"],
    ["year2", "Year 2"],
    ["year3", "Year 3"],
    ["year4Plus", "Year 4+"],
];

const EMPTY_DRAFT = {
    taxYear: "",
    year1_withBonus: "",
    year1_noBonus: "",
    year2: "",
    year3: "",
    year4Plus: "",
    source: "",
};

/** IRC 280F "luxury auto" depreciation caps for passenger automobiles. */
const PassengerAutoLimitsDialog = ({ open, onClose }) => {
    const [limits, setLimits] = useState([]);
    const [editingYear, setEditingYear] = useState(null);
    const [draft, setDraft] = useState(EMPTY_DRAFT);
    const [isAdding, setIsAdding] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) fetchLimits();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const authHeaders = () => ({
        headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
    });

    const fetchLimits = async () => {
        try {
            setLoading(true);
            const response = await axios.get(
                "/api/passenger-auto-limits",
                authHeaders(),
            );
            setLimits(response.data.limits || []);
            setError("");
        } catch (err) {
            console.error("Error fetching passenger auto limits:", err);
            setError("Failed to load passenger auto limits");
        } finally {
            setLoading(false);
        }
    };

    /** Every cap must parse as a positive integer. Returns null on failure. */
    const parseCaps = (source) => {
        const values = {};
        for (const [key, label] of CAP_FIELDS) {
            const value = parseInt(source[key], 10);
            if (Number.isNaN(value) || value <= 0) {
                setError(`${label} must be a positive number`);
                return null;
            }
            values[key] = value;
        }
        return values;
    };

    const handleSaveNew = async () => {
        if (!draft.taxYear || CAP_FIELDS.some(([key]) => !draft[key])) {
            setError("All fields are required");
            return;
        }

        const values = parseCaps(draft);
        if (!values) return;

        try {
            await axios.post(
                "/api/passenger-auto-limits",
                {
                    taxYear: parseInt(draft.taxYear, 10),
                    ...values,
                    source: draft.source,
                },
                authHeaders(),
            );
            setIsAdding(false);
            setDraft(EMPTY_DRAFT);
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

    const handleSaveEdit = async (year) => {
        const limit = limits.find((l) => l.taxYear === year);
        if (!limit) return;

        const values = parseCaps(limit);
        if (!values) return;

        try {
            await axios.put(
                `/api/passenger-auto-limits/${year}`,
                { ...values, source: limit.source },
                authHeaders(),
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

    const handleDelete = async (year) => {
        try {
            await axios.delete(
                `/api/passenger-auto-limits/${year}`,
                authHeaders(),
            );
            fetchLimits();
            setError("");
        } catch (err) {
            console.error("Error deleting limit:", err);
            setError(err.response?.data?.message || "Failed to delete limit");
        }
    };

    const handleRowChange = (year, field, value) =>
        setLimits((prev) =>
            prev.map((limit) =>
                limit.taxYear === year ? { ...limit, [field]: value } : limit,
            ),
        );

    return (
        <TaxTableDialog
            open={open}
            onClose={onClose}
            title="Passenger auto 280F limits"
            subtitle="Annual depreciation caps for passenger automobiles"
            icon={<DirectionsCarIcon />}
            maxWidth="lg"
            description={
                <Alert severity="info" sx={{ boxShadow: "none" }}>
                    <Typography variant="body2">
                        IRC §280F "luxury auto" caps. These apply to vehicles
                        under 6,000 lbs GVWR that don't qualify as trucks. See{" "}
                        <Link
                            href="https://www.irs.gov/publications/p946#en_US_2024_publink1000299547"
                            target="_blank"
                            rel="noopener"
                        >
                            IRS Publication 946
                        </Link>{" "}
                        and the year's Revenue Procedure.
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
                ...CAP_FIELDS.map(([key, label]) => ({
                    key,
                    label,
                    type: "currency",
                    width: 140,
                    inputProps: { min: 0, step: 100 },
                })),
                {
                    key: "source",
                    label: "Source",
                    type: "link",
                    placeholder: "https://www.irs.gov…",
                },
            ]}
            rows={limits}
            loading={loading}
            error={error}
            onDismissError={() => setError("")}
            isAdding={isAdding}
            draft={draft}
            onDraftChange={setDraft}
            onStartAdd={() => {
                setIsAdding(true);
                setDraft({
                    ...EMPTY_DRAFT,
                    taxYear: new Date().getFullYear() + 1,
                });
            }}
            onCancelAdd={() => {
                setIsAdding(false);
                setDraft(EMPTY_DRAFT);
                setError("");
            }}
            onSaveNew={handleSaveNew}
            editingKey={editingYear}
            onStartEdit={(year) => {
                setEditingYear(year);
                setError("");
            }}
            onCancelEdit={() => {
                setEditingYear(null);
                fetchLimits();
                setError("");
            }}
            onSaveEdit={handleSaveEdit}
            onRowChange={handleRowChange}
            onDelete={handleDelete}
            deleteMessage={(year) =>
                `Delete the passenger auto limits for tax year ${year}? This cannot be undone.`
            }
            emptyTitle="No passenger auto limits defined"
            emptyDescription="Add a tax year to record its 280F depreciation caps."
        />
    );
};

export default PassengerAutoLimitsDialog;
