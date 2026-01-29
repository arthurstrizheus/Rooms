import React, { useState, useEffect } from "react";
import {
    Box,
    Paper,
    Typography,
    Button,
    TextField,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Card,
    CardContent,
    Grid,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Link,
    CircularProgress,
} from "@mui/material";
import {
    ExpandMore,
    Download,
    Edit,
    Info,
    Warning,
    Settings,
} from "@mui/icons-material";
import axios from "axios";
import { useAuth } from "../../../Utilites/AuthContext";
import TaxRulesManagementDialog from "./TaxRulesManagementDialog";

const DepreciationReports = ({ setLoading }) => {
    const { user } = useAuth();
    const currentYear = new Date().getFullYear();

    const [offices, setOffices] = useState([]);
    const [selectedOffice, setSelectedOffice] = useState("");
    const [taxYear, setTaxYear] = useState(currentYear);
    const [taxType, setTaxType] = useState(
        "STATE_BUSINESS_INCOME_OR_FRANCHISE",
    );
    const [report, setReport] = useState(null);
    const [loadingReport, setLoadingReport] = useState(false);
    const [error, setError] = useState(null);

    const [openTaxMetaDialog, setOpenTaxMetaDialog] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [taxMetaForm, setTaxMetaForm] = useState({
        placed_in_service_date: "",
        cost_basis: "",
        property_class: "7yr",
        method: "MACRS",
        bonus_eligible: false,
        section179_elected: 0,
    });

    const [openTaxRulesDialog, setOpenTaxRulesDialog] = useState(false);
    const [selectedOfficeForRules, setSelectedOfficeForRules] = useState(null);

    useEffect(() => {
        fetchOffices();
    }, []);

    const fetchOffices = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.get("/api/locations", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setOffices(response.data);
            if (response.data.length > 0) {
                setSelectedOffice(response.data[0].officeid);
            }
        } catch (error) {
            console.error("Error fetching offices:", error);
            setError("Failed to load offices");
        }
    };

    const generateReport = async () => {
        if (!selectedOffice) {
            setError("Please select an office");
            return;
        }

        try {
            setLoadingReport(true);
            setError(null);
            const token = localStorage.getItem("authToken");
            const response = await axios.get(
                `/api/depreciation/offices/${selectedOffice}/report`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { taxYear, taxType },
                },
            );
            setReport(response.data);
        } catch (error) {
            console.error("Error generating report:", error);
            setError(
                error.response?.data?.message || "Failed to generate report",
            );
        } finally {
            setLoadingReport(false);
        }
    };

    const handleEditTaxMeta = (asset) => {
        setSelectedAsset(asset);

        // Pre-fill form with existing data if available
        setTaxMetaForm({
            placed_in_service_date: asset.placed_in_service_date
                ? new Date(asset.placed_in_service_date)
                      .toISOString()
                      .split("T")[0]
                : "",
            cost_basis: asset.cost_basis || asset.cost || "",
            property_class: asset.property_class || "7yr",
            method: asset.method || "MACRS",
            bonus_eligible: asset.bonus_eligible || false,
            section179_elected: asset.section179_elected || 0,
        });

        setOpenTaxMetaDialog(true);
    };

    const saveTaxMeta = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("authToken");
            await axios.post(
                `/api/asset-tax-meta/${selectedAsset.id}`,
                taxMetaForm,
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );

            setOpenTaxMetaDialog(false);
            // Regenerate report to show updated values
            await generateReport();
        } catch (error) {
            console.error("Error saving tax meta:", error);
            setError("Failed to save tax data");
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(amount || 0);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "N/A";
        return new Date(dateStr).toLocaleDateString();
    };

    const formatRuleType = (ruleType) => {
        const ruleTypeMap = {
            generally_no_addback: "No Add-back (Follow Federal)",
            addback_bonus_plus_179_over_threshold:
                "Add-back Bonus + Section 179 Over Threshold",
            addback_then_subtract_spread: "Add-back Then Spread Subtraction",
            recompute_depreciation_as_if_no_168k:
                "Recompute Without Bonus Depreciation",
            proforma_difference_federal_asfiled_vs_without_decoupled:
                "Pro-forma Difference Method",
            il_4562_reverse_federal_bonus: "Illinois Form 4562 Method",
            texas_franchise_margin_based: "Texas Franchise Tax (Margin-Based)",
        };
        return ruleTypeMap[ruleType] || ruleType;
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Report Parameters */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={2}>
                        <TextField
                            select
                            label="Office"
                            value={selectedOffice}
                            onChange={(e) => setSelectedOffice(e.target.value)}
                            fullWidth
                        >
                            {offices.map((office) => (
                                <MenuItem
                                    key={office.officeid}
                                    value={office.officeid}
                                >
                                    {office.Alias} ({office.state})
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={1}>
                        <TextField
                            type="number"
                            label="Tax Year"
                            value={taxYear}
                            onChange={(e) =>
                                setTaxYear(parseInt(e.target.value))
                            }
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            select
                            label="Tax Type"
                            value={taxType}
                            onChange={(e) => setTaxType(e.target.value)}
                            fullWidth
                        >
                            <MenuItem value="FEDERAL_INCOME">
                                Federal Income Tax
                            </MenuItem>
                            <MenuItem value="STATE_BUSINESS_INCOME_OR_FRANCHISE">
                                State Business Income / Franchise Tax
                            </MenuItem>
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={generateReport}
                            disabled={loadingReport}
                            fullWidth
                            startIcon={
                                loadingReport ? (
                                    <CircularProgress size={20} />
                                ) : null
                            }
                        >
                            Generate Report
                        </Button>
                    </Grid>
                    {(user?.admin || user?.equipment_admin) && (
                        <Grid item xs={12} md={3}>
                            <Button
                                variant="outlined"
                                size="large"
                                onClick={() => {
                                    const office = offices.find(
                                        (o) => o.officeid === selectedOffice,
                                    );
                                    setSelectedOfficeForRules(office);
                                    setOpenTaxRulesDialog(true);
                                }}
                                disabled={!selectedOffice}
                                fullWidth
                                startIcon={<Settings />}
                            >
                                Manage Tax Rules
                            </Button>
                        </Grid>
                    )}
                </Grid>
            </Paper>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* No data message */}
            {report && report.assets && report.assets.length === 0 && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        No Equipment with Tax Data Found
                    </Typography>
                    <Typography variant="body2">
                        This office has no equipment with depreciation tax data
                        configured. To generate a report, you need to:
                    </Typography>
                    <ul>
                        <li>Add equipment assigned to this office location</li>
                        <li>
                            Configure tax depreciation fields (placed in service
                            date, cost basis, property class, etc.)
                        </li>
                    </ul>
                    <Typography variant="body2">
                        You can add tax data when creating equipment or by
                        editing existing equipment and filling in the "Optional
                        Tax Depreciation Fields" section.
                    </Typography>
                </Alert>
            )}

            {/* Report Display */}
            {report && report.assets && report.assets.length > 0 && (
                <>
                    {/* Summary Cards */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} md={4}>
                            <Card>
                                <CardContent>
                                    <Typography
                                        variant="subtitle2"
                                        color="text.secondary"
                                    >
                                        Total Federal Depreciation
                                    </Typography>
                                    <Typography variant="h5">
                                        {formatCurrency(
                                            report.totals.federalDepreciation,
                                        )}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card>
                                <CardContent>
                                    <Typography
                                        variant="subtitle2"
                                        color="text.secondary"
                                    >
                                        Total State Depreciation
                                    </Typography>
                                    <Typography variant="h5">
                                        {formatCurrency(
                                            report.totals.stateDepreciation,
                                        )}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card>
                                <CardContent>
                                    <Typography
                                        variant="subtitle2"
                                        color="text.secondary"
                                    >
                                        Difference
                                    </Typography>
                                    <Typography
                                        variant="h5"
                                        color={
                                            report.totals.difference > 0
                                                ? "success.main"
                                                : report.totals.difference < 0
                                                  ? "error.main"
                                                  : "text.primary"
                                        }
                                    >
                                        {formatCurrency(
                                            report.totals.difference,
                                        )}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Office and Rule Info */}
                    <Accordion defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant="h6">
                                <Info sx={{ mr: 1, verticalAlign: "middle" }} />
                                Office & Rule Information
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2">
                                        Office
                                    </Typography>
                                    <Typography>
                                        {report.office.alias},{" "}
                                        {report.office.city},{" "}
                                        {report.office.state}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2">
                                        Tax Year
                                    </Typography>
                                    <Typography>{report.taxYear}</Typography>
                                </Grid>
                                {report.rule && (
                                    <>
                                        <Grid item xs={12}>
                                            <Typography variant="subtitle2">
                                                Rule Type
                                            </Typography>
                                            <Chip
                                                label={formatRuleType(
                                                    report.rule.ruleType,
                                                )}
                                                size="small"
                                                color="primary"
                                            />
                                        </Grid>
                                        {report.rule.parameters?.notes && (
                                            <Grid item xs={12}>
                                                <Typography variant="subtitle2">
                                                    Notes
                                                </Typography>
                                                <Typography variant="body2">
                                                    {
                                                        report.rule.parameters
                                                            .notes
                                                    }
                                                </Typography>
                                            </Grid>
                                        )}
                                    </>
                                )}
                            </Grid>
                        </AccordionDetails>
                    </Accordion>

                    {/* Warnings */}
                    {report.warnings && report.warnings.length > 0 && (
                        <Alert severity="warning" sx={{ my: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                <Warning sx={{ verticalAlign: "middle" }} />{" "}
                                Important Notices:
                            </Typography>
                            <ul>
                                {report.warnings.map((warning, idx) => (
                                    <li key={idx}>
                                        <Typography variant="body2">
                                            {warning}
                                        </Typography>
                                    </li>
                                ))}
                            </ul>
                        </Alert>
                    )}

                    {/* Asset Details Table */}
                    <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                        Asset Depreciation Details
                    </Typography>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Asset</TableCell>
                                    <TableCell>Cost Basis</TableCell>
                                    <TableCell>Placed in Service</TableCell>
                                    <TableCell align="right">
                                        Federal Depr.
                                    </TableCell>
                                    <TableCell align="right">
                                        State Depr.
                                    </TableCell>
                                    <TableCell align="right">
                                        Difference
                                    </TableCell>
                                    <TableCell align="center">
                                        Actions
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {report.assets.map((item) => (
                                    <TableRow key={item.asset.id}>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {item.asset.name}
                                            </Typography>
                                            {item.asset.serial_number && (
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                >
                                                    SN:{" "}
                                                    {item.asset.serial_number}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {formatCurrency(
                                                item.asset.cost_basis,
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(
                                                item.asset
                                                    .placed_in_service_date,
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            {formatCurrency(item.federal.total)}
                                        </TableCell>
                                        <TableCell align="right">
                                            {formatCurrency(
                                                item.state.stateDepreciation,
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography
                                                color={
                                                    item.state
                                                        .stateDepreciation -
                                                        item.federal.total >
                                                    0
                                                        ? "success.main"
                                                        : item.state
                                                                .stateDepreciation -
                                                                item.federal
                                                                    .total <
                                                            0
                                                          ? "error.main"
                                                          : "text.primary"
                                                }
                                            >
                                                {formatCurrency(
                                                    item.state
                                                        .stateDepreciation -
                                                        item.federal.total,
                                                )}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Button
                                                size="small"
                                                startIcon={<Edit />}
                                                onClick={() =>
                                                    handleEditTaxMeta(
                                                        item.asset,
                                                    )
                                                }
                                            >
                                                Edit
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Sources */}
                    {report.sources && report.sources.length > 0 && (
                        <Box sx={{ mt: 3 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Official Sources:
                            </Typography>
                            <ul>
                                {report.sources.map((source, idx) => (
                                    <li key={idx}>
                                        <Link
                                            href={source}
                                            target="_blank"
                                            rel="noopener"
                                        >
                                            {source}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </Box>
                    )}
                </>
            )}

            {/* Tax Meta Edit Dialog */}
            <Dialog
                open={openTaxMetaDialog}
                onClose={() => setOpenTaxMetaDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    Edit Tax Data for {selectedAsset?.name}
                </DialogTitle>
                <DialogContent>
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                            pt: 2,
                        }}
                    >
                        <TextField
                            label="Placed in Service Date"
                            type="date"
                            value={taxMetaForm.placed_in_service_date}
                            onChange={(e) =>
                                setTaxMetaForm({
                                    ...taxMetaForm,
                                    placed_in_service_date: e.target.value,
                                })
                            }
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                        />
                        <TextField
                            label="Cost Basis"
                            type="number"
                            value={taxMetaForm.cost_basis}
                            onChange={(e) =>
                                setTaxMetaForm({
                                    ...taxMetaForm,
                                    cost_basis: e.target.value,
                                })
                            }
                            InputProps={{
                                startAdornment: "$",
                            }}
                            inputProps={{
                                step: "0.01",
                            }}
                            fullWidth
                        />
                        <TextField
                            select
                            label="Property Class"
                            value={taxMetaForm.property_class}
                            onChange={(e) =>
                                setTaxMetaForm({
                                    ...taxMetaForm,
                                    property_class: e.target.value,
                                })
                            }
                            fullWidth
                        >
                            <MenuItem value="3yr">3-year</MenuItem>
                            <MenuItem value="5yr">5-year</MenuItem>
                            <MenuItem value="7yr">7-year</MenuItem>
                            <MenuItem value="10yr">10-year</MenuItem>
                            <MenuItem value="15yr">15-year</MenuItem>
                            <MenuItem value="20yr">20-year</MenuItem>
                            <MenuItem value="27.5yr">
                                27.5-year (Residential)
                            </MenuItem>
                            <MenuItem value="39yr">
                                39-year (Nonresidential)
                            </MenuItem>
                        </TextField>
                        <TextField
                            select
                            label="Depreciation Method"
                            value={taxMetaForm.method}
                            onChange={(e) =>
                                setTaxMetaForm({
                                    ...taxMetaForm,
                                    method: e.target.value,
                                })
                            }
                            fullWidth
                        >
                            <MenuItem value="MACRS">MACRS (GDS)</MenuItem>
                            <MenuItem value="ADS">ADS</MenuItem>
                        </TextField>
                        <TextField
                            select
                            label="Bonus Depreciation Eligible"
                            value={taxMetaForm.bonus_eligible}
                            onChange={(e) =>
                                setTaxMetaForm({
                                    ...taxMetaForm,
                                    bonus_eligible: e.target.value === "true",
                                })
                            }
                            fullWidth
                        >
                            <MenuItem value={false}>No</MenuItem>
                            <MenuItem value={true}>Yes</MenuItem>
                        </TextField>
                        <TextField
                            label="Section 179 Elected Amount"
                            type="number"
                            value={taxMetaForm.section179_elected}
                            onChange={(e) =>
                                setTaxMetaForm({
                                    ...taxMetaForm,
                                    section179_elected: e.target.value,
                                })
                            }
                            InputProps={{
                                startAdornment: "$",
                            }}
                            inputProps={{
                                step: "0.01",
                            }}
                            fullWidth
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenTaxMetaDialog(false)}>
                        Cancel
                    </Button>
                    <Button onClick={saveTaxMeta} variant="contained">
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Tax Rules Management Dialog */}
            <TaxRulesManagementDialog
                open={openTaxRulesDialog}
                onClose={() => setOpenTaxRulesDialog(false)}
                officeId={selectedOfficeForRules?.officeid}
                officeName={selectedOfficeForRules?.Alias}
                onRulesUpdated={() => {
                    // Optionally refresh the report if one is already generated
                    if (report) {
                        generateReport();
                    }
                }}
            />
        </Box>
    );
};

export default DepreciationReports;
