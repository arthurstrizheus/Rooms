import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    Box,
    Typography,
    Alert,
    Stepper,
    Step,
    StepLabel,
    Chip,
    Link,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Tooltip,
} from "@mui/material";
import { Add, Close, Info } from "@mui/icons-material";
import axios from "axios";

const TaxRulesManagementDialog = ({
    open,
    onClose,
    officeId,
    officeName,
    onRulesUpdated,
}) => {
    const [activeStep, setActiveStep] = useState(0);
    const [officeRules, setOfficeRules] = useState(null);
    const [ruleTypes, setRuleTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [newRule, setNewRule] = useState({
        taxType: "STATE_BUSINESS_INCOME_OR_FRANCHISE",
        ruleType: "",
        effectiveFromTaxYear: new Date().getFullYear() + 1,
        effectiveToTaxYear: null,
        section179Threshold: 25000,
        spreadYears: 7,
        spreadMethod: "straight_line",
        notes: "",
        sources: [""],
        addbackFormula: "",
        addbackBase: "",
        computation: "",
        implementation: "",
        eligibility: "",
        bonusAddbackPercent: "",
        annualSubtractionPercent: "",
    });

    const [closeRangeForm, setCloseRangeForm] = useState({
        taxType: "STATE_BUSINESS_INCOME_OR_FRANCHISE",
        effectiveFromTaxYear: "",
        effectiveToTaxYear: new Date().getFullYear(),
    });

    const steps = ["View Current Rules", "Add New Rule", "Close Existing Rule"];

    useEffect(() => {
        if (open && officeId) {
            fetchOfficeRules();
            fetchRuleTypes();
        }
    }, [open, officeId]);

    const fetchOfficeRules = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("authToken");
            const response = await axios.get(
                `/api/tax-rules/offices/${officeId}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );
            setOfficeRules(response.data);
        } catch (error) {
            console.error("Error fetching office rules:", error);
            setError("Failed to load tax rules");
        } finally {
            setLoading(false);
        }
    };

    const fetchRuleTypes = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.get("/api/tax-rules/rule-types", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setRuleTypes(response.data);
        } catch (error) {
            console.error("Error fetching rule types:", error);
        }
    };

    // Helper to format rule type for display
    const formatRuleType = (ruleType) => {
        const ruleTypeMap = {
            generally_no_addback: "Generally No Addback",
            addback_bonus_plus_179_over_threshold:
                "Addback Bonus + Section 179 Over Threshold",
            addback_then_subtract_spread: "Addback Then Subtract Spread",
            recompute_depreciation_as_if_no_168k:
                "Recompute Depreciation (No Section 168k)",
            proforma_difference_federal_asfiled_vs_without_decoupled:
                "Pro Forma Difference (Federal vs Decoupled)",
            il_4562_reverse_federal_bonus:
                "Illinois Section 4562 Reverse Federal Bonus",
            texas_franchise_margin_based: "Texas Franchise Margin-Based",
        };
        return ruleTypeMap[ruleType] || ruleType;
    };

    // Helper to format parameters for display
    const formatParameters = (params) => {
        if (!params) return [];
        const items = [];
        if (params.section179Threshold !== undefined) {
            items.push({
                label: "Section 179 Threshold",
                value: `$${params.section179Threshold.toLocaleString()}`,
            });
        }
        if (params.spreadYears !== undefined) {
            items.push({ label: "Spread Years", value: params.spreadYears });
        }
        if (params.addbackFormula) {
            items.push({ label: "Formula", value: params.addbackFormula });
        }
        if (params.notes) {
            items.push({ label: "Notes", value: params.notes });
        }
        return items;
    };

    const handleAddRule = async () => {
        try {
            setLoading(true);
            setError(null);
            setSuccess(null);

            const token = localStorage.getItem("authToken");

            // Build parameters object with only non-empty values
            const parameters = {
                notes: newRule.notes,
            };

            // Add conditional parameters
            if (newRule.section179Threshold) {
                parameters.section179Threshold = parseInt(
                    newRule.section179Threshold,
                );
            }
            if (newRule.spreadYears) {
                parameters.spreadYears = parseInt(newRule.spreadYears);
            }
            if (newRule.spreadMethod) {
                parameters.spreadMethod = newRule.spreadMethod;
            }
            if (newRule.addbackFormula) {
                parameters.addbackFormula = newRule.addbackFormula;
            }
            if (newRule.addbackBase) {
                parameters.addbackBase = newRule.addbackBase;
            }
            if (newRule.computation) {
                parameters.computation = newRule.computation;
            }
            if (newRule.implementation) {
                parameters.implementation = newRule.implementation;
            }
            if (newRule.eligibility) {
                parameters.eligibility = newRule.eligibility;
            }
            if (newRule.bonusAddbackPercent) {
                parameters.bonusAddbackPercent = parseFloat(
                    newRule.bonusAddbackPercent,
                );
            }
            if (newRule.annualSubtractionPercent) {
                parameters.annualSubtractionPercent = parseFloat(
                    newRule.annualSubtractionPercent,
                );
            }

            await axios.post(
                `/api/tax-rules/offices/${officeId}`,
                {
                    taxType: newRule.taxType,
                    yearRange: {
                        ruleType: newRule.ruleType,
                        effectiveFromTaxYear: parseInt(
                            newRule.effectiveFromTaxYear,
                        ),
                        effectiveToTaxYear:
                            newRule.effectiveToTaxYear === ""
                                ? null
                                : parseInt(newRule.effectiveToTaxYear),
                        parameters: parameters,
                        sources: newRule.sources.filter((s) => s.trim() !== ""),
                    },
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );

            setSuccess("Tax rule added successfully!");
            await fetchOfficeRules();
            if (onRulesUpdated) onRulesUpdated();

            // Reset form
            setNewRule({
                ...newRule,
                effectiveFromTaxYear: new Date().getFullYear() + 1,
                notes: "",
                sources: [""],
            });
        } catch (error) {
            console.error("Error adding rule:", error);
            setError(error.response?.data?.message || "Failed to add tax rule");
        } finally {
            setLoading(false);
        }
    };

    const handleCloseRange = async () => {
        try {
            setLoading(true);
            setError(null);
            setSuccess(null);

            const token = localStorage.getItem("authToken");
            await axios.put(
                `/api/tax-rules/offices/${officeId}/close`,
                closeRangeForm,
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );

            setSuccess("Year range closed successfully!");
            await fetchOfficeRules();
            if (onRulesUpdated) onRulesUpdated();
        } catch (error) {
            console.error("Error closing range:", error);
            setError(
                error.response?.data?.message || "Failed to close year range",
            );
        } finally {
            setLoading(false);
        }
    };

    const addSourceField = () => {
        setNewRule({
            ...newRule,
            sources: [...newRule.sources, ""],
        });
    };

    const updateSource = (index, value) => {
        const updatedSources = [...newRule.sources];
        updatedSources[index] = value;
        setNewRule({ ...newRule, sources: updatedSources });
    };

    const removeSource = (index) => {
        const updatedSources = newRule.sources.filter((_, i) => i !== index);
        setNewRule({ ...newRule, sources: updatedSources });
    };

    const renderCurrentRules = () => {
        if (!officeRules || !officeRules.tax) {
            return (
                <Alert severity="info">
                    No tax rules configured for this office
                </Alert>
            );
        }

        const taxRule = officeRules.tax["STATE_BUSINESS_INCOME_OR_FRANCHISE"];
        if (!taxRule) {
            return <Alert severity="info">No state tax rules configured</Alert>;
        }

        return (
            <Box>
                <Alert severity="info" icon={<Info />} sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                        <strong>How This System Works:</strong>
                    </Typography>
                    <Typography variant="body2" component="div">
                        • <strong>Rule Types:</strong> Predefined calculation
                        methods that match common state approaches to federal
                        bonus depreciation
                        <br />• <strong>Parameters:</strong> State-specific
                        values (thresholds, years) that customize the
                        calculation
                        <br />• <strong>Year Ranges:</strong> Rules effective
                        for specific tax years (preserves history when laws
                        change)
                        <br />• <strong>Sources:</strong> Links to official
                        state tax guidance for audit support
                    </Typography>
                    <Typography
                        variant="caption"
                        display="block"
                        sx={{ mt: 1 }}
                        color="text.secondary"
                    >
                        The calculation formulas are built into the system. You
                        configure which method to use and its parameters.
                    </Typography>
                </Alert>

                <Typography variant="subtitle2" gutterBottom>
                    Rule Type:{" "}
                    <Chip
                        label={formatRuleType(taxRule.ruleType)}
                        size="small"
                        color="primary"
                    />
                </Typography>

                <TableContainer component={Paper} sx={{ mt: 2 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Effective From</TableCell>
                                <TableCell>Effective To</TableCell>
                                <TableCell>Parameters</TableCell>
                                <TableCell>Sources</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {taxRule.parametersByYear.map(
                                (yearRange, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            {yearRange.effectiveFromTaxYear}
                                        </TableCell>
                                        <TableCell>
                                            {yearRange.effectiveToTaxYear || (
                                                <Chip
                                                    label="Ongoing"
                                                    size="small"
                                                    color="primary"
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    flexWrap: "wrap",
                                                    gap: 0.5,
                                                }}
                                            >
                                                {formatParameters(
                                                    yearRange.parameters,
                                                ).length > 0 ? (
                                                    formatParameters(
                                                        yearRange.parameters,
                                                    ).map((param, idx) => (
                                                        <Chip
                                                            key={idx}
                                                            label={`${param.label}: ${param.value}`}
                                                            size="small"
                                                            variant="outlined"
                                                            sx={{
                                                                fontSize:
                                                                    "0.75rem",
                                                            }}
                                                        />
                                                    ))
                                                ) : (
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                    >
                                                        No parameters
                                                    </Typography>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            {yearRange.sources &&
                                            yearRange.sources.length > 0
                                                ? yearRange.sources.map(
                                                      (source, idx) => (
                                                          <Link
                                                              key={idx}
                                                              href={source}
                                                              target="_blank"
                                                              rel="noopener"
                                                              display="block"
                                                              variant="caption"
                                                          >
                                                              Source {idx + 1}
                                                          </Link>
                                                      ),
                                                  )
                                                : "None"}
                                        </TableCell>
                                    </TableRow>
                                ),
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Alert severity="info" icon={<Info />} sx={{ mt: 2 }}>
                    <Typography variant="body2">
                        <strong>Important:</strong> Historical rules are
                        preserved. When tax laws change, close the current year
                        range and add a new one for future years. Reports for
                        past years will use the rules that were in effect at
                        that time.
                    </Typography>
                </Alert>
            </Box>
        );
    };

    const renderAddRule = () => {
        const selectedRuleType = ruleTypes.find(
            (rt) => rt.value === newRule.ruleType,
        );

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Alert severity="info" icon={<Info />}>
                    <Typography variant="body2" gutterBottom>
                        <strong>About Tax Depreciation Rules:</strong>
                    </Typography>
                    <Typography variant="body2">
                        States handle federal bonus depreciation differently.
                        This system uses predefined calculation methods that
                        cover all common state approaches. Select the rule type
                        that matches your state's requirements, then provide the
                        specific parameters (thresholds, years, etc.) that
                        apply.
                    </Typography>
                </Alert>

                <TextField
                    select
                    label="Rule Type"
                    value={newRule.ruleType}
                    onChange={(e) =>
                        setNewRule({ ...newRule, ruleType: e.target.value })
                    }
                    fullWidth
                >
                    {ruleTypes.map((rt) => (
                        <MenuItem key={rt.value} value={rt.value}>
                            <Box sx={{ width: "100%" }}>
                                <Typography variant="body2" fontWeight="medium">
                                    {rt.label}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    display="block"
                                >
                                    {rt.description}
                                </Typography>
                                {rt.examples && (
                                    <Typography
                                        variant="caption"
                                        color="primary.main"
                                        display="block"
                                        fontStyle="italic"
                                    >
                                        Examples: {rt.examples}
                                    </Typography>
                                )}
                            </Box>
                        </MenuItem>
                    ))}
                </TextField>

                {selectedRuleType && (
                    <Alert severity="info" icon={<Info />}>
                        <Typography variant="body2" gutterBottom>
                            <strong>{selectedRuleType.label}</strong>
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                            {selectedRuleType.details}
                        </Typography>
                        {selectedRuleType.examples && (
                            <Typography
                                variant="caption"
                                display="block"
                                sx={{ mt: 1 }}
                            >
                                <strong>Common in:</strong>{" "}
                                {selectedRuleType.examples}
                            </Typography>
                        )}
                        {selectedRuleType.requiredParams &&
                            selectedRuleType.requiredParams.length > 0 && (
                                <Typography
                                    variant="caption"
                                    display="block"
                                    sx={{ mt: 1 }}
                                >
                                    <strong>Required parameters:</strong>{" "}
                                    {selectedRuleType.requiredParams.join(", ")}
                                </Typography>
                            )}
                    </Alert>
                )}

                <Box sx={{ display: "flex", gap: 2 }}>
                    <TextField
                        type="number"
                        label="Effective From Tax Year"
                        value={newRule.effectiveFromTaxYear}
                        onChange={(e) =>
                            setNewRule({
                                ...newRule,
                                effectiveFromTaxYear: e.target.value,
                            })
                        }
                        fullWidth
                        helperText="First year this rule applies"
                    />
                    <TextField
                        type="number"
                        label="Effective To Tax Year"
                        value={newRule.effectiveToTaxYear}
                        onChange={(e) =>
                            setNewRule({
                                ...newRule,
                                effectiveToTaxYear: e.target.value,
                            })
                        }
                        fullWidth
                        helperText="Leave blank for ongoing"
                    />
                </Box>

                {(newRule.ruleType ===
                    "addback_bonus_plus_179_over_threshold" ||
                    newRule.ruleType.includes("179")) && (
                    <TextField
                        type="number"
                        label="Section 179 Threshold"
                        value={newRule.section179Threshold}
                        onChange={(e) =>
                            setNewRule({
                                ...newRule,
                                section179Threshold: e.target.value,
                            })
                        }
                        fullWidth
                        InputProps={{ startAdornment: "$" }}
                        helperText="Maximum Section 179 deduction allowed by state without add-back. Federal amounts above this are added back to state taxable income. Example: Ohio allows $25,000."
                    />
                )}

                {newRule.ruleType === "addback_then_subtract_spread" && (
                    <Box sx={{ display: "flex", gap: 2 }}>
                        <TextField
                            type="number"
                            label="Spread Years"
                            value={newRule.spreadYears}
                            onChange={(e) =>
                                setNewRule({
                                    ...newRule,
                                    spreadYears: e.target.value,
                                })
                            }
                            fullWidth
                            helperText="Number of years to spread the subtraction (e.g., Florida uses 7 years). Bonus is added back in year 1, then deducted equally over this many years."
                        />
                        <TextField
                            select
                            label="Spread Method"
                            value={newRule.spreadMethod}
                            onChange={(e) =>
                                setNewRule({
                                    ...newRule,
                                    spreadMethod: e.target.value,
                                })
                            }
                            fullWidth
                            helperText="Equal amounts each year (most common)"
                        >
                            <MenuItem value="straight_line">
                                Straight Line
                            </MenuItem>
                            <MenuItem value="accelerated">Accelerated</MenuItem>
                        </TextField>
                    </Box>
                )}

                <TextField
                    multiline
                    rows={3}
                    label="Notes"
                    value={newRule.notes}
                    onChange={(e) =>
                        setNewRule({ ...newRule, notes: e.target.value })
                    }
                    fullWidth
                    helperText="Additional information about this rule"
                />

                {/* Additional Parameter Fields */}
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    Additional Parameters
                </Typography>

                {(newRule.ruleType ===
                    "addback_bonus_plus_179_over_threshold" ||
                    newRule.ruleType === "addback_then_subtract_spread" ||
                    newRule.ruleType ===
                        "addback_percent_of_federal_bonus_then_spread") && (
                    <TextField
                        multiline
                        rows={2}
                        label="Add-back Formula"
                        value={newRule.addbackFormula}
                        onChange={(e) =>
                            setNewRule({
                                ...newRule,
                                addbackFormula: e.target.value,
                            })
                        }
                        fullWidth
                        placeholder="e.g., stateAddback = federalBonus168k + max(0, federalSection179 - 25000)"
                        helperText={
                            <span>
                                Mathematical formula for calculating state tax
                                addback. See{" "}
                                <Link
                                    href="https://www.irs.gov/publications/p946"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    color="error"
                                >
                                    IRS Pub 946
                                </Link>{" "}
                                for federal depreciation rules.
                            </span>
                        }
                    />
                )}

                {(newRule.ruleType === "addback_then_subtract_spread" ||
                    newRule.ruleType ===
                        "addback_federal_depreciation_compute_ga_separately") && (
                    <TextField
                        label="Add-back Base"
                        value={newRule.addbackBase}
                        onChange={(e) =>
                            setNewRule({
                                ...newRule,
                                addbackBase: e.target.value,
                            })
                        }
                        fullWidth
                        placeholder="e.g., federalBonus168k or federalTotalDepreciation"
                        helperText={
                            <span>
                                What federal amount gets added back to state
                                income. See{" "}
                                <Link
                                    href="https://www.irs.gov/newsroom/bonus-depreciation"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    color="error"
                                >
                                    IRS Bonus Depreciation
                                </Link>{" "}
                                guidance.
                            </span>
                        }
                    />
                )}

                {newRule.ruleType ===
                    "addback_percent_of_federal_bonus_then_spread" && (
                    <TextField
                        type="number"
                        label="Bonus Add-back Percent"
                        value={newRule.bonusAddbackPercent}
                        onChange={(e) =>
                            setNewRule({
                                ...newRule,
                                bonusAddbackPercent: e.target.value,
                            })
                        }
                        fullWidth
                        InputProps={{ endAdornment: "%" }}
                        placeholder="e.g., 85"
                        helperText={
                            <span>
                                Percentage of federal bonus depreciation to add
                                back (e.g., NC adds back 85%). See{" "}
                                <Link
                                    href="https://www.irs.gov/newsroom/bonus-depreciation"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    color="error"
                                >
                                    IRS Bonus Depreciation
                                </Link>{" "}
                                for federal rates.
                            </span>
                        }
                    />
                )}

                {newRule.ruleType === "addback_then_subtract_spread" && (
                    <TextField
                        type="number"
                        label="Annual Subtraction Percent"
                        value={newRule.annualSubtractionPercent}
                        onChange={(e) =>
                            setNewRule({
                                ...newRule,
                                annualSubtractionPercent: e.target.value,
                            })
                        }
                        fullWidth
                        InputProps={{ endAdornment: "%" }}
                        placeholder="e.g., 14.2857142857"
                        helperText={
                            <span>
                                Percentage deducted each year during spread
                                period (typically 100 / spreadYears). See{" "}
                                <Link
                                    href="https://www.irs.gov/publications/p946#en_US_2023_publink1000107449"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    color="error"
                                >
                                    IRS Depreciation Methods
                                </Link>
                                .
                            </span>
                        }
                    />
                )}

                {newRule.ruleType === "addback_then_subtract_spread" && (
                    <TextField
                        label="Eligibility Criteria"
                        value={newRule.eligibility}
                        onChange={(e) =>
                            setNewRule({
                                ...newRule,
                                eligibility: e.target.value,
                            })
                        }
                        fullWidth
                        placeholder="e.g., Assets placed in service before 2027-01-01"
                        helperText={
                            <span>
                                Which assets qualify for this treatment. See{" "}
                                <Link
                                    href="https://www.irs.gov/businesses/small-businesses-self-employed/section-179-deduction"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    color="error"
                                >
                                    IRS Section 179
                                </Link>{" "}
                                and{" "}
                                <Link
                                    href="https://www.irs.gov/newsroom/bonus-depreciation"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    color="error"
                                >
                                    Bonus Depreciation
                                </Link>{" "}
                                eligibility rules.
                            </span>
                        }
                    />
                )}

                {(newRule.ruleType ===
                    "proforma_difference_federal_asfiled_vs_without_decoupled" ||
                    newRule.ruleType ===
                        "addback_federal_depreciation_compute_ga_separately") && (
                    <TextField
                        multiline
                        rows={2}
                        label="Computation Method"
                        value={newRule.computation}
                        onChange={(e) =>
                            setNewRule({
                                ...newRule,
                                computation: e.target.value,
                            })
                        }
                        fullWidth
                        placeholder="e.g., stateModification = (federalAsFiledIncludingDecoupling - federalWithoutDecoupledProvisions)"
                        helperText={
                            <span>
                                How to calculate the state adjustment. See{" "}
                                <Link
                                    href="https://www.irs.gov/publications/p946"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    color="error"
                                >
                                    IRS Publication 946
                                </Link>{" "}
                                for MACRS and federal depreciation computation.
                            </span>
                        }
                    />
                )}

                {(newRule.ruleType ===
                    "proforma_difference_federal_asfiled_vs_without_decoupled" ||
                    newRule.ruleType ===
                        "recompute_depreciation_as_if_no_168k") && (
                    <TextField
                        multiline
                        rows={2}
                        label="Implementation Details"
                        value={newRule.implementation}
                        onChange={(e) =>
                            setNewRule({
                                ...newRule,
                                implementation: e.target.value,
                            })
                        }
                        fullWidth
                        placeholder="e.g., Compute both depreciation totals for the tax year, then apply delta"
                        helperText={
                            <span>
                                Additional guidance on implementing this
                                calculation. See{" "}
                                <Link
                                    href="https://www.irs.gov/publications/p946"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    color="error"
                                >
                                    IRS Pub 946
                                </Link>{" "}
                                and{" "}
                                <Link
                                    href="https://www.irs.gov/forms-pubs/about-form-4562"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    color="error"
                                >
                                    Form 4562
                                </Link>{" "}
                                (Depreciation and Amortization).
                            </span>
                        }
                    />
                )}

                <Box>
                    <Typography variant="subtitle2" gutterBottom>
                        Government Source URLs
                    </Typography>
                    {newRule.sources.map((source, index) => (
                        <Box
                            key={index}
                            sx={{ display: "flex", gap: 1, mb: 1 }}
                        >
                            <TextField
                                value={source}
                                onChange={(e) =>
                                    updateSource(index, e.target.value)
                                }
                                placeholder="https://..."
                                fullWidth
                                size="small"
                            />
                            {newRule.sources.length > 1 && (
                                <IconButton
                                    onClick={() => removeSource(index)}
                                    size="small"
                                >
                                    <Close />
                                </IconButton>
                            )}
                        </Box>
                    ))}
                    <Button
                        startIcon={<Add />}
                        onClick={addSourceField}
                        size="small"
                    >
                        Add Source URL
                    </Button>
                </Box>
            </Box>
        );
    };

    const renderCloseRange = () => {
        if (!officeRules || !officeRules.tax) {
            return <Alert severity="info">No rules to close</Alert>;
        }

        const taxRule = officeRules.tax["STATE_BUSINESS_INCOME_OR_FRANCHISE"];
        if (!taxRule) {
            return <Alert severity="info">No state tax rules to close</Alert>;
        }

        const ongoingRanges = taxRule.parametersByYear.filter(
            (r) => r.effectiveToTaxYear === null,
        );

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Alert severity="warning">
                    <Typography variant="body2">
                        <strong>Before adding a new rule:</strong> Close any
                        ongoing year ranges that should end here first. You
                        cannot have overlapping year ranges for the same tax
                        type. After closing a range, you can add a new rule
                        starting from the next year.
                    </Typography>
                </Alert>

                {ongoingRanges.length === 0 ? (
                    <Alert severity="success">
                        All year ranges are closed. You can add new rules for
                        future years.
                    </Alert>
                ) : (
                    <>
                        <TextField
                            select
                            label="Select Year Range to Close"
                            value={closeRangeForm.effectiveFromTaxYear}
                            onChange={(e) =>
                                setCloseRangeForm({
                                    ...closeRangeForm,
                                    effectiveFromTaxYear: e.target.value,
                                })
                            }
                            fullWidth
                        >
                            {ongoingRanges.map((range, index) => (
                                <MenuItem
                                    key={index}
                                    value={range.effectiveFromTaxYear}
                                >
                                    From {range.effectiveFromTaxYear} (Ongoing)
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            type="number"
                            label="End Year"
                            value={closeRangeForm.effectiveToTaxYear}
                            onChange={(e) =>
                                setCloseRangeForm({
                                    ...closeRangeForm,
                                    effectiveToTaxYear: e.target.value,
                                })
                            }
                            fullWidth
                            helperText="Last year this rule applies"
                        />
                    </>
                )}
            </Box>
        );
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                Manage Tax Rules - {officeName}
                <Typography
                    variant="caption"
                    display="block"
                    color="text.secondary"
                >
                    Configure state depreciation tax rules with year ranges
                </Typography>
            </DialogTitle>
            <DialogContent>
                <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {error && (
                    <Alert
                        severity="error"
                        sx={{ mb: 2 }}
                        onClose={() => setError(null)}
                    >
                        {error}
                    </Alert>
                )}

                {success && (
                    <Alert
                        severity="success"
                        sx={{ mb: 2 }}
                        onClose={() => setSuccess(null)}
                    >
                        {success}
                    </Alert>
                )}

                {loading ? (
                    <Typography>Loading...</Typography>
                ) : (
                    <>
                        {activeStep === 0 && renderCurrentRules()}
                        {activeStep === 1 && renderAddRule()}
                        {activeStep === 2 && renderCloseRange()}
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                    disabled={activeStep === 0}
                >
                    Back
                </Button>
                {activeStep < steps.length - 1 && (
                    <Button
                        onClick={() =>
                            setActiveStep(
                                Math.min(steps.length - 1, activeStep + 1),
                            )
                        }
                        disabled={activeStep === 1 && !newRule.ruleType}
                    >
                        Next
                    </Button>
                )}
                {activeStep === 1 && (
                    <Button
                        onClick={handleAddRule}
                        variant="contained"
                        disabled={loading || !newRule.ruleType}
                    >
                        Add Rule
                    </Button>
                )}
                {activeStep === 2 && (
                    <Button
                        onClick={handleCloseRange}
                        variant="contained"
                        disabled={
                            loading || !closeRangeForm.effectiveFromTaxYear
                        }
                    >
                        Close Range
                    </Button>
                )}
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

export default TaxRulesManagementDialog;
