import React, { useState, useEffect } from "react";
import { Alert, Typography, Link } from "@mui/material";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import axios from "axios";
import TaxTableDialog from "./TaxTableDialog";

const EMPTY_DRAFT = {
    taxYear: "",
    suv179Cap: "",
    source: "",
    notes: "",
};

/** Section 179 deduction caps for SUVs and trucks 6,000–14,000 lbs GVWR. */
const FederalVehicleLimitsDialog = ({ open, onClose }) => {
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
                "/api/federal-vehicle-limits",
                authHeaders(),
            );
            setLimits(response.data.limits || []);
            setError("");
        } catch (err) {
            console.error("Error fetching limits:", err);
            setError("Failed to load federal vehicle limits");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNew = async () => {
        if (!draft.taxYear || !draft.suv179Cap) {
            setError("Tax year and SUV cap are required");
            return;
        }

        try {
            await axios.post(
                "/api/federal-vehicle-limits",
                {
                    taxYear: parseInt(draft.taxYear, 10),
                    suv179Cap: parseFloat(draft.suv179Cap),
                    source: draft.source,
                    notes: draft.notes,
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
                    "Failed to add limit. That year may already exist.",
            );
        }
    };

    const handleSaveEdit = async (year) => {
        const limit = limits.find((l) => l.taxYear === year);
        if (!limit) return;

        try {
            await axios.put(
                `/api/federal-vehicle-limits/${year}`,
                {
                    suv179Cap: parseFloat(limit.suv179Cap),
                    source: limit.source,
                    notes: limit.notes,
                },
                authHeaders(),
            );
            setEditingYear(null);
            fetchLimits();
            setError("");
        } catch (err) {
            console.error("Error updating limit:", err);
            setError(err.response?.data?.message || "Failed to update limit");
        }
    };

    const handleDelete = async (year) => {
        try {
            await axios.delete(
                `/api/federal-vehicle-limits/${year}`,
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
            title="Vehicle Section 179 limits"
            subtitle="SUVs and trucks, 6,000–14,000 lbs GVWR"
            icon={<DirectionsCarIcon />}
            maxWidth="lg"
            description={
                <Alert severity="info" sx={{ boxShadow: "none" }}>
                    <Typography variant="body2">
                        IRS Section 179 deduction caps for SUVs and trucks with
                        a GVWR between 6,000 and 14,000 lbs. Update annually
                        from{" "}
                        <Link
                            href="https://www.irs.gov/publications/p946#en_US_2024_publink1000107384"
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
                {
                    key: "suv179Cap",
                    label: "SUV §179 cap",
                    type: "currency",
                    width: 160,
                    placeholder: "30500",
                    inputProps: { min: 0, step: 100 },
                },
                {
                    key: "notes",
                    label: "Notes",
                    type: "text",
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
                `Delete the Section 179 SUV cap for tax year ${year}? This cannot be undone.`
            }
            emptyTitle="No vehicle limits defined"
            emptyDescription="Add a tax year to record its SUV Section 179 cap."
        />
    );
};

export default FederalVehicleLimitsDialog;
