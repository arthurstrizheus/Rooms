import React, { useState, useEffect } from "react";
import { Alert, Typography, Link } from "@mui/material";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import axios from "axios";
import TaxTableDialog from "./TaxTableDialog";

const EMPTY_DRAFT = {
    taxYear: "",
    maxDeduction: "",
    phaseoutThreshold: "",
    source: "",
};

/** Company-wide IRC Section 179 deduction limit and phase-out threshold. */
const Section179LimitsDialog = ({ open, onClose }) => {
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
                "/api/section179-limits",
                authHeaders(),
            );
            setLimits(response.data.limits || []);
            setError("");
        } catch (err) {
            console.error("Error fetching Section 179 limits:", err);
            setError("Failed to load Section 179 limits");
        } finally {
            setLoading(false);
        }
    };

    /** Both amounts must parse as positive integers. */
    const validateAmounts = (maxDeduction, phaseoutThreshold) => {
        const maxDed = parseInt(maxDeduction, 10);
        const phaseout = parseInt(phaseoutThreshold, 10);

        if (Number.isNaN(maxDed) || maxDed <= 0) {
            setError("Max deduction must be a positive number");
            return null;
        }
        if (Number.isNaN(phaseout) || phaseout <= 0) {
            setError("Phase-out threshold must be a positive number");
            return null;
        }
        return { maxDeduction: maxDed, phaseoutThreshold: phaseout };
    };

    const handleSaveNew = async () => {
        if (!draft.taxYear || !draft.maxDeduction || !draft.phaseoutThreshold) {
            setError("All fields are required");
            return;
        }

        const amounts = validateAmounts(
            draft.maxDeduction,
            draft.phaseoutThreshold,
        );
        if (!amounts) return;

        try {
            await axios.post(
                "/api/section179-limits",
                {
                    taxYear: parseInt(draft.taxYear, 10),
                    ...amounts,
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
                err.response?.data?.message || "Failed to add Section 179 limit",
            );
        }
    };

    const handleSaveEdit = async (year) => {
        const limit = limits.find((l) => l.taxYear === year);
        if (!limit) return;

        const amounts = validateAmounts(
            limit.maxDeduction,
            limit.phaseoutThreshold,
        );
        if (!amounts) return;

        try {
            await axios.put(
                `/api/section179-limits/${year}`,
                { ...amounts, source: limit.source },
                authHeaders(),
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

    const handleDelete = async (year) => {
        try {
            await axios.delete(`/api/section179-limits/${year}`, authHeaders());
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
            title="Section 179 overall limits"
            subtitle="Company-wide deduction cap and phase-out"
            icon={<AttachMoneyIcon />}
            description={
                <Alert severity="info" sx={{ boxShadow: "none" }}>
                    <Typography variant="body2">
                        Annual IRC §179 deduction limits across all equipment.
                        The phase-out reduces the limit dollar for dollar once
                        total equipment placed in service exceeds the threshold.
                        See{" "}
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
                {
                    key: "maxDeduction",
                    label: "Max deduction",
                    type: "currency",
                    width: 170,
                    placeholder: "1220000",
                    inputProps: { min: 0, step: 1000 },
                },
                {
                    key: "phaseoutThreshold",
                    label: "Phase-out threshold",
                    type: "currency",
                    width: 190,
                    placeholder: "3050000",
                    inputProps: { min: 0, step: 1000 },
                },
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
                `Delete the Section 179 limits for tax year ${year}? This cannot be undone.`
            }
            emptyTitle="No Section 179 limits defined"
            emptyDescription="Add a tax year to record its deduction cap and phase-out threshold."
        />
    );
};

export default Section179LimitsDialog;
