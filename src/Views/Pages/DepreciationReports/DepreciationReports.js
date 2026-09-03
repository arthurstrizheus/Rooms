import React, { useState, useEffect } from "react";
import {
    Box,
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
    Grid,
    Chip,
    Alert,
    AlertTitle,
    Link,
    CircularProgress,
    Menu,
    ListItemIcon,
    ListItemText,
    Stack,
    IconButton,
    Tooltip,
    Divider,
} from "@mui/material";
import {
    Edit,
    Info,
    Settings,
    ArrowDropDown,
    DirectionsCar,
    Gavel,
    TrendingDown,
    AttachMoney,
    AccountBalanceOutlined,
} from "@mui/icons-material";
import axios from "axios";

import { useAuth } from "../../../Utilites/AuthContext";
import useResponsive from "../../../hooks/useResponsive";
import TaxRulesManagementDialog from "./TaxRulesManagementDialog";
import FederalVehicleLimitsDialog from "./FederalVehicleLimitsDialog";
import BonusRatesDialog from "./BonusRatesDialog";
import Section179LimitsDialog from "./Section179LimitsDialog";
import PassengerAutoLimitsDialog from "./PassengerAutoLimitsDialog";
import {
    PageHeader,
    PageContainer,
    SectionCard,
    StatCard,
    EmptyState,
    ResponsiveDialog,
    DetailField,
    Stagger,
} from "../../Components/UI";

const PROPERTY_CLASSES = [
    ["3yr", "3-year"],
    ["5yr", "5-year"],
    ["7yr", "7-year"],
    ["10yr", "10-year"],
    ["15yr", "15-year"],
    ["20yr", "20-year"],
    ["27.5yr", "27.5-year (residential)"],
    ["39yr", "39-year (nonresidential)"],
];

const RULE_TYPE_LABELS = {
    generally_no_addback: "No add-back (follow federal)",
    addback_bonus_plus_179_over_threshold:
        "Add back bonus + Section 179 over threshold",
    addback_then_subtract_spread: "Add back, then spread subtraction",
    recompute_depreciation_as_if_no_168k: "Recompute without bonus depreciation",
    proforma_difference_federal_asfiled_vs_without_decoupled:
        "Pro-forma difference method",
    il_4562_reverse_federal_bonus: "Illinois Form 4562 method",
    texas_franchise_margin_based: "Texas franchise tax (margin-based)",
};

/**
 * Federal vs. state depreciation reporting, per office and tax year.
 */
const DepreciationReports = ({ setLoading }) => {
    const { user } = useAuth();
    const { isCompact } = useResponsive();
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
    const [warning, setWarning] = useState(null);

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
    const [openFederalLimitsDialog, setOpenFederalLimitsDialog] =
        useState(false);
    const [openBonusRatesDialog, setOpenBonusRatesDialog] = useState(false);
    const [openSection179LimitsDialog, setOpenSection179LimitsDialog] =
        useState(false);
    const [openPassengerAutoLimitsDialog, setOpenPassengerAutoLimitsDialog] =
        useState(false);
    const [selectedOfficeForRules, setSelectedOfficeForRules] = useState(null);
    const [settingsMenuAnchor, setSettingsMenuAnchor] = useState(null);

    // ---- Data -------------------------------------------------------------

    useEffect(() => {
        fetchOffices();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchOffices = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.get("/api/locations", {
                headers: { Authorization: `Bearer ${token}` },
            });

            const filteredOffices = response.data.filter(
                (office) => office.Alias !== "All",
            );
            setOffices(filteredOffices);

            if (filteredOffices.length > 0) {
                const userOffice = filteredOffices.find(
                    (office) => office.officeid === user?.location,
                );
                setSelectedOffice(
                    userOffice
                        ? userOffice.officeid
                        : filteredOffices[0].officeid,
                );
            }
        } catch (err) {
            console.error("Error fetching offices:", err);
            setError("Failed to load offices");
        }
    };

    const resetReportState = () => {
        setReport(null);
        setError(null);
        setWarning(null);
    };

    const generateReport = async () => {
        if (!selectedOffice) {
            setError("Please select an office");
            return;
        }

        try {
            setLoadingReport(true);
            setError(null);
            setWarning(null);

            const token = localStorage.getItem("authToken");
            const response = await axios.get(
                `/api/depreciation/offices/${selectedOffice}/report`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { taxYear, taxType },
                },
            );
            const reportData = response.data;
            const isFutureYear = taxYear > new Date().getFullYear();

            if (reportData.assets && reportData.assets.length === 0) {
                setError(
                    isFutureYear
                        ? `No depreciation data available for future tax year ${taxYear}. Equipment must be placed in service to appear in reports.`
                        : `No depreciation data found for tax year ${taxYear}. Either no equipment has been placed in service as of ${taxYear}, or no equipment is assigned to this office.`,
                );
            } else if (isFutureYear) {
                setWarning(
                    `${taxYear} is a future tax year. These figures are projections based on current tax rules, which may change before ${taxYear}.`,
                );
            }

            setReport(reportData);
        } catch (err) {
            console.error("Error generating report:", err);
            setError(err.response?.data?.message || "Failed to generate report");
        } finally {
            setLoadingReport(false);
        }
    };

    const handleEditTaxMeta = (asset) => {
        setSelectedAsset(asset);
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
                { headers: { Authorization: `Bearer ${token}` } },
            );
            setOpenTaxMetaDialog(false);
            await generateReport();
        } catch (err) {
            console.error("Error saving tax meta:", err);
            setError("Failed to save tax data");
        } finally {
            setLoading(false);
        }
    };

    // ---- Formatting -------------------------------------------------------

    const formatCurrency = (amount) =>
        new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(amount || 0);

    const formatDate = (dateStr) =>
        dateStr ? new Date(dateStr).toLocaleDateString() : "—";

    const formatRuleType = (ruleType) =>
        RULE_TYPE_LABELS[ruleType] || ruleType;

    const differenceColor = (value) =>
        value > 0 ? "success.main" : value < 0 ? "error.main" : "text.primary";

    // ---- Settings menu ----------------------------------------------------

    const settingsItems = [
        {
            label: "Manage tax rules",
            icon: <Gavel fontSize="small" />,
            disabled: !selectedOffice,
            onClick: () => {
                setSelectedOfficeForRules(
                    offices.find((o) => o.officeid === selectedOffice),
                );
                setOpenTaxRulesDialog(true);
            },
        },
        {
            label: "Vehicle Section 179 limits",
            icon: <DirectionsCar fontSize="small" />,
            onClick: () => setOpenFederalLimitsDialog(true),
        },
        {
            label: "Bonus depreciation rates",
            icon: <TrendingDown fontSize="small" />,
            onClick: () => setOpenBonusRatesDialog(true),
        },
        {
            label: "Section 179 overall limits",
            icon: <AttachMoney fontSize="small" />,
            onClick: () => setOpenSection179LimitsDialog(true),
        },
        {
            label: "Passenger auto 280F limits",
            icon: <DirectionsCar fontSize="small" />,
            onClick: () => setOpenPassengerAutoLimitsDialog(true),
        },
    ];

    const canManageTaxSettings = user?.admin || user?.equipment_admin;
    const hasAssets = report?.assets?.length > 0;

    // ---- Asset presentation ----------------------------------------------

    const assetDifference = (item) =>
        item.state.stateDepreciation - item.federal.total;

    const assetCard = (item) => {
        const difference = assetDifference(item);
        return (
            <Card key={item.asset.id} sx={{ p: 2, mb: 1.5 }}>
                <Stack direction="row" alignItems="flex-start" spacing={1}>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2">
                            {item.asset.name}
                        </Typography>
                        <Typography
                            variant="caption"
                            color="text.disabled"
                            sx={{ display: "block" }}
                            noWrap
                        >
                            {[
                                item.asset.asset_number &&
                                    `Asset ${item.asset.asset_number}`,
                                item.asset.serial_number &&
                                    `SN ${item.asset.serial_number}`,
                            ]
                                .filter(Boolean)
                                .join(" · ") || "No identifiers"}
                        </Typography>
                    </Box>
                    <Tooltip title="Edit tax data">
                        <IconButton
                            size="small"
                            onClick={() => handleEditTaxMeta(item.asset)}
                        >
                            <Edit sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Tooltip>
                </Stack>

                <Divider sx={{ my: 1.5 }} />

                <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                        <DetailField
                            label="Cost basis"
                            value={formatCurrency(item.asset.cost_basis)}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <DetailField
                            label="Placed in service"
                            value={formatDate(
                                item.asset.placed_in_service_date,
                            )}
                        />
                    </Grid>
                    <Grid item xs={4}>
                        <DetailField
                            label="Federal"
                            value={formatCurrency(item.federal.total)}
                        />
                    </Grid>
                    <Grid item xs={4}>
                        <DetailField
                            label="State"
                            value={formatCurrency(
                                item.state.stateDepreciation,
                            )}
                        />
                    </Grid>
                    <Grid item xs={4}>
                        <DetailField label="Difference">
                            <Typography
                                variant="body2"
                                sx={{
                                    mt: 0.25,
                                    fontWeight: 650,
                                    color: differenceColor(difference),
                                }}
                            >
                                {formatCurrency(difference)}
                            </Typography>
                        </DetailField>
                    </Grid>
                </Grid>
            </Card>
        );
    };

    const assetTable = (
        <Card sx={{ overflow: "hidden" }}>
            <TableContainer sx={{ maxHeight: "calc(100dvh - 460px)" }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            {/* The Asset # column was missing here, so every
                                cell after it rendered under the wrong header. */}
                            <TableCell>Asset</TableCell>
                            <TableCell>Asset #</TableCell>
                            <TableCell align="right">Cost basis</TableCell>
                            <TableCell>Placed in service</TableCell>
                            <TableCell align="right">Federal depr.</TableCell>
                            <TableCell align="right">State depr.</TableCell>
                            <TableCell align="right">Difference</TableCell>
                            <TableCell align="center">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {report?.assets?.map((item, index) => {
                            const difference = assetDifference(item);
                            return (
                                <TableRow
                                    key={item.asset.id}
                                    hover
                                    sx={{
                                        animation: "seaFadeIn 240ms ease both",
                                        animationDelay: `${Math.min(index, 20) * 16}ms`,
                                    }}
                                >
                                    <TableCell>
                                        <Typography
                                            variant="body2"
                                            sx={{ fontWeight: 600 }}
                                        >
                                            {item.asset.name}
                                        </Typography>
                                        {item.asset.serial_number && (
                                            <Typography
                                                variant="caption"
                                                color="text.disabled"
                                            >
                                                SN {item.asset.serial_number}
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            fontFamily: (t) =>
                                                t.typography.fontFamilyMono,
                                            fontSize: "0.8125rem",
                                            color: "text.secondary",
                                        }}
                                    >
                                        {item.asset.asset_number || "—"}
                                    </TableCell>
                                    <TableCell
                                        align="right"
                                        sx={{
                                            fontVariantNumeric: "tabular-nums",
                                        }}
                                    >
                                        {formatCurrency(item.asset.cost_basis)}
                                    </TableCell>
                                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                                        {formatDate(
                                            item.asset.placed_in_service_date,
                                        )}
                                    </TableCell>
                                    <TableCell
                                        align="right"
                                        sx={{
                                            fontVariantNumeric: "tabular-nums",
                                        }}
                                    >
                                        {formatCurrency(item.federal.total)}
                                    </TableCell>
                                    <TableCell
                                        align="right"
                                        sx={{
                                            fontVariantNumeric: "tabular-nums",
                                        }}
                                    >
                                        {formatCurrency(
                                            item.state.stateDepreciation,
                                        )}
                                    </TableCell>
                                    <TableCell
                                        align="right"
                                        sx={{
                                            fontVariantNumeric: "tabular-nums",
                                            fontWeight: 650,
                                            color: differenceColor(difference),
                                        }}
                                    >
                                        {formatCurrency(difference)}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="Edit tax data">
                                            <IconButton
                                                size="small"
                                                onClick={() =>
                                                    handleEditTaxMeta(
                                                        item.asset,
                                                    )
                                                }
                                            >
                                                <Edit sx={{ fontSize: 18 }} />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Card>
    );

    return (
        <>
            <PageHeader
                title="Depreciation Reports"
                subtitle={
                    report
                        ? `${report.office?.alias} · tax year ${report.taxYear}`
                        : "Compare federal and state depreciation by office"
                }
                actions={[
                    canManageTaxSettings && {
                        key: "settings",
                        render: (
                            <>
                                <Button
                                    variant="outlined"
                                    onClick={(e) =>
                                        setSettingsMenuAnchor(e.currentTarget)
                                    }
                                    startIcon={<Settings />}
                                    endIcon={<ArrowDropDown />}
                                >
                                    Tax settings
                                </Button>
                                <Menu
                                    anchorEl={settingsMenuAnchor}
                                    open={Boolean(settingsMenuAnchor)}
                                    onClose={() => setSettingsMenuAnchor(null)}
                                    anchorOrigin={{
                                        vertical: "bottom",
                                        horizontal: "right",
                                    }}
                                    transformOrigin={{
                                        vertical: "top",
                                        horizontal: "right",
                                    }}
                                >
                                    {settingsItems.map((item) => (
                                        <MenuItem
                                            key={item.label}
                                            disabled={item.disabled}
                                            onClick={() => {
                                                setSettingsMenuAnchor(null);
                                                item.onClick();
                                            }}
                                        >
                                            <ListItemIcon>
                                                {item.icon}
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={item.label}
                                            />
                                        </MenuItem>
                                    ))}
                                </Menu>
                            </>
                        ),
                    },
                ].filter(Boolean)}
            />

            <PageContainer>
                {/* ---- Parameters ---- */}
                <SectionCard
                    title="Report parameters"
                    icon={<AccountBalanceOutlined />}
                    sx={{ mb: 2.5 }}
                >
                    <Grid container spacing={2} alignItems="flex-start">
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                select
                                label="Office"
                                value={selectedOffice}
                                onChange={(e) => {
                                    setSelectedOffice(e.target.value);
                                    resetReportState();
                                }}
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

                        <Grid item xs={6} sm={3} md={2}>
                            <TextField
                                type="number"
                                label="Tax year"
                                value={taxYear}
                                onChange={(e) => {
                                    setTaxYear(parseInt(e.target.value, 10));
                                    resetReportState();
                                }}
                                fullWidth
                            />
                        </Grid>

                        <Grid item xs={12} sm={6} md={4}>
                            <TextField
                                select
                                label="Tax type"
                                value={taxType}
                                onChange={(e) => {
                                    setTaxType(e.target.value);
                                    resetReportState();
                                }}
                                fullWidth
                            >
                                <MenuItem value="FEDERAL_INCOME">
                                    Federal income tax
                                </MenuItem>
                                <MenuItem value="STATE_BUSINESS_INCOME_OR_FRANCHISE">
                                    State business income / franchise tax
                                </MenuItem>
                            </TextField>
                        </Grid>

                        <Grid item xs={12} md={3}>
                            <Button
                                variant="contained"
                                size="large"
                                onClick={generateReport}
                                disabled={loadingReport}
                                fullWidth
                                startIcon={
                                    loadingReport ? (
                                        <CircularProgress
                                            size={18}
                                            color="inherit"
                                        />
                                    ) : (
                                        <AccountBalanceOutlined />
                                    )
                                }
                            >
                                {loadingReport ? "Running…" : "Generate report"}
                            </Button>
                        </Grid>
                    </Grid>
                </SectionCard>

                {error && (
                    <Alert severity="error" sx={{ mb: 2.5 }}>
                        {error}
                    </Alert>
                )}

                {/* This is advisory, not a failure — it used to render as an
                    error, which made projections look like something broke. */}
                {warning && (
                    <Alert severity="warning" sx={{ mb: 2.5 }}>
                        {warning}
                    </Alert>
                )}

                {report && report.assets?.length === 0 && !error && (
                    <Alert severity="warning" sx={{ mb: 2.5 }}>
                        <AlertTitle>
                            No applicable equipment for {taxYear}
                        </AlertTitle>
                        <Typography variant="body2" component="div">
                            Nothing qualifies for depreciation reporting this
                            tax year. Usually that means:
                            <ul style={{ margin: "8px 0 8px 18px" }}>
                                <li>
                                    Nothing was placed in service during or
                                    after {taxYear}
                                </li>
                                <li>
                                    Everything is fully depreciated for this year
                                </li>
                                <li>No equipment is assigned to this office</li>
                                <li>
                                    Equipment exists but is missing tax data
                                    (placed-in-service date, cost basis)
                                </li>
                            </ul>
                            Try another tax year, or add tax data to the
                            equipment records.
                        </Typography>
                    </Alert>
                )}

                {!report && !error && !loadingReport && (
                    <EmptyState
                        icon={<AccountBalanceOutlined />}
                        title="No report yet"
                        description="Choose an office, tax year and tax type above, then generate a report."
                        action={{
                            label: "Generate report",
                            onClick: generateReport,
                        }}
                    />
                )}

                {hasAssets && (
                    <>
                        <Grid container spacing={2} sx={{ mb: 2.5 }}>
                            <Grid item xs={12} sm={4}>
                                <StatCard
                                    label="Total federal depreciation"
                                    value={formatCurrency(
                                        report.totals.federalDepreciation,
                                    )}
                                    icon={<AccountBalanceOutlined />}
                                    tone="primary"
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <StatCard
                                    label="Total state depreciation"
                                    value={formatCurrency(
                                        report.totals.stateDepreciation,
                                    )}
                                    icon={<AccountBalanceOutlined />}
                                    tone="info"
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <StatCard
                                    label="Difference"
                                    value={formatCurrency(
                                        report.totals.difference,
                                    )}
                                    icon={<TrendingDown />}
                                    tone={
                                        report.totals.difference < 0
                                            ? "error"
                                            : "success"
                                    }
                                />
                            </Grid>
                        </Grid>

                        <SectionCard
                            title="Office & rule information"
                            icon={<Info />}
                            collapsible
                            defaultExpanded
                            sx={{ mb: 2.5 }}
                        >
                            <Grid container spacing={2.5}>
                                <Grid item xs={12} sm={6}>
                                    <DetailField
                                        label="Office"
                                        value={`${report.office.alias}, ${report.office.city}, ${report.office.state}`}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <DetailField
                                        label="Tax year"
                                        value={report.taxYear}
                                    />
                                </Grid>
                                {report.rule && (
                                    <>
                                        <Grid item xs={12}>
                                            <DetailField label="Rule type">
                                                <Box sx={{ mt: 0.5 }}>
                                                    <Chip
                                                        size="small"
                                                        label={formatRuleType(
                                                            report.rule
                                                                .ruleType,
                                                        )}
                                                        sx={{
                                                            bgcolor:
                                                                "primary.50",
                                                            color: "primary.dark",
                                                            border: "1px solid",
                                                            borderColor:
                                                                "primary.100",
                                                        }}
                                                    />
                                                </Box>
                                            </DetailField>
                                        </Grid>
                                        {report.rule.parameters?.notes && (
                                            <Grid item xs={12}>
                                                <DetailField
                                                    label="Notes"
                                                    value={
                                                        report.rule.parameters
                                                            .notes
                                                    }
                                                />
                                            </Grid>
                                        )}
                                    </>
                                )}
                            </Grid>
                        </SectionCard>

                        {report.warnings?.length > 0 && (
                            <Alert severity="warning" sx={{ mb: 2.5 }}>
                                <AlertTitle>Important notices</AlertTitle>
                                <Box
                                    component="ul"
                                    sx={{ m: 0, pl: 2.25 }}
                                >
                                    {report.warnings.map((note, idx) => (
                                        <li key={idx}>
                                            <Typography variant="body2">
                                                {note}
                                            </Typography>
                                        </li>
                                    ))}
                                </Box>
                            </Alert>
                        )}

                        <Typography variant="h5" sx={{ mb: 1.5 }}>
                            Asset depreciation details
                        </Typography>

                        {isCompact ? (
                            <Stagger step={30} max={12}>
                                {report.assets.map((item) => assetCard(item))}
                            </Stagger>
                        ) : (
                            assetTable
                        )}

                        {report.sources?.length > 0 && (
                            <SectionCard
                                title="Official sources"
                                icon={<Info />}
                                collapsible
                                defaultExpanded={false}
                                sx={{ mt: 2.5 }}
                            >
                                <Stack spacing={0.75}>
                                    {report.sources.map((source, idx) => (
                                        <Link
                                            key={idx}
                                            href={source}
                                            target="_blank"
                                            rel="noopener"
                                            variant="body2"
                                            sx={{ wordBreak: "break-all" }}
                                        >
                                            {source}
                                        </Link>
                                    ))}
                                </Stack>
                            </SectionCard>
                        )}
                    </>
                )}
            </PageContainer>

            {/* ---- Edit tax data ---- */}
            <ResponsiveDialog
                open={openTaxMetaDialog}
                onClose={() => setOpenTaxMetaDialog(false)}
                title="Edit tax data"
                subtitle={selectedAsset?.name}
                icon={<Edit />}
                maxWidth="sm"
                actions={
                    <>
                        <Button
                            variant="outlined"
                            onClick={() => setOpenTaxMetaDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button onClick={saveTaxMeta} variant="contained">
                            Save
                        </Button>
                    </>
                }
            >
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Placed in service date"
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
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Cost basis"
                            type="number"
                            value={taxMetaForm.cost_basis}
                            onChange={(e) =>
                                setTaxMetaForm({
                                    ...taxMetaForm,
                                    cost_basis: e.target.value,
                                })
                            }
                            InputProps={{ startAdornment: "$" }}
                            inputProps={{ step: "0.01" }}
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            select
                            label="Property class"
                            value={taxMetaForm.property_class}
                            onChange={(e) =>
                                setTaxMetaForm({
                                    ...taxMetaForm,
                                    property_class: e.target.value,
                                })
                            }
                            fullWidth
                        >
                            {PROPERTY_CLASSES.map(([value, label]) => (
                                <MenuItem key={value} value={value}>
                                    {label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            select
                            label="Depreciation method"
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
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            select
                            label="Bonus depreciation eligible"
                            value={taxMetaForm.bonus_eligible}
                            onChange={(e) =>
                                setTaxMetaForm({
                                    ...taxMetaForm,
                                    bonus_eligible:
                                        e.target.value === "true" ||
                                        e.target.value === true,
                                })
                            }
                            fullWidth
                        >
                            <MenuItem value={false}>No</MenuItem>
                            <MenuItem value={true}>Yes</MenuItem>
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Section 179 elected amount"
                            type="number"
                            value={taxMetaForm.section179_elected}
                            onChange={(e) =>
                                setTaxMetaForm({
                                    ...taxMetaForm,
                                    section179_elected: e.target.value,
                                })
                            }
                            InputProps={{ startAdornment: "$" }}
                            inputProps={{ step: "0.01" }}
                            fullWidth
                        />
                    </Grid>
                </Grid>
            </ResponsiveDialog>

            <TaxRulesManagementDialog
                open={openTaxRulesDialog}
                onClose={() => setOpenTaxRulesDialog(false)}
                officeId={selectedOfficeForRules?.officeid}
                officeName={selectedOfficeForRules?.Alias}
                onRulesUpdated={() => {
                    if (report) generateReport();
                }}
            />
            <FederalVehicleLimitsDialog
                open={openFederalLimitsDialog}
                onClose={() => setOpenFederalLimitsDialog(false)}
            />
            <BonusRatesDialog
                open={openBonusRatesDialog}
                onClose={() => setOpenBonusRatesDialog(false)}
            />
            <Section179LimitsDialog
                open={openSection179LimitsDialog}
                onClose={() => setOpenSection179LimitsDialog(false)}
            />
            <PassengerAutoLimitsDialog
                open={openPassengerAutoLimitsDialog}
                onClose={() => setOpenPassengerAutoLimitsDialog(false)}
            />
        </>
    );
};

export default DepreciationReports;
