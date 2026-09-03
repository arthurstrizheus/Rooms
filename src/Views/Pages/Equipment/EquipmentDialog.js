import React from "react";
import {
    Button,
    TextField,
    MenuItem,
    Box,
    Autocomplete,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Typography,
    Link,
    Grid,
    Stack,
    Divider,
    Alert,
    Collapse,
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import ResponsiveDialog from "../../Components/UI/ResponsiveDialog";
import ApproverPicker from "../../Components/Equipment/ApproverPicker";

// ---------------------------------------------------------------------------
// State tax resources
// ---------------------------------------------------------------------------

const STATE_TAX_LINKS = {
    OH: ["https://tax.ohio.gov/faq-IncomeDepreciation", "OH depreciation guidance"],
    MO: [
        "https://dor.mo.gov/faq/taxation/business/corporation-income.html",
        "MO tax guidance",
    ],
    TX: [
        "https://comptroller.texas.gov/taxes/franchise/",
        "TX franchise tax info",
    ],
    IL: [
        "https://tax.illinois.gov/content/dam/soi/en/web/tax/forms/incometax/documents/currentyear/miscellaneous/il-4562-instr.pdf",
        "IL Form 4562",
    ],
    FL: [
        "https://floridarevenue.com/taxes/tips/Documents/TIP_24C01-02.pdf",
        "FL depreciation adjustments",
    ],
    NC: [
        "https://www.ncdor.gov/taxes-forms/individual-income-tax/filing-topics/adjustment-bonus-depreciation",
        "NC bonus depreciation",
    ],
    GA: [
        "https://dor.georgia.gov/taxes/tax-rules-and-policies/income-tax-federal-tax-changes",
        "GA federal tax changes",
    ],
    MD: [
        "https://www.marylandtaxes.gov/forms/Tax_Publications/Administrative_Releases/Income_and_Estate_Tax_Releases/ar_it38.pdf",
        "MD depreciation decoupling",
    ],
    MI: [
        "https://www.michigan.gov/taxes/questions/cit/corporate/corporate-tax-base-16--the-tax-base-under-the-cit-is-computed-as-though-section-168k-bonus-deprecia",
        "MI CIT Section 168(k)",
    ],
};

/** The nine state guidance links were three identical lookup functions. */
const StateTaxLink = ({ state }) => {
    const entry = STATE_TAX_LINKS[state];
    if (!entry) return <span>state Section 179 info</span>;
    const [href, label] = entry;
    return (
        <Link href={href} target="_blank" rel="noopener">
            {label}
        </Link>
    );
};

const IrsLink = ({ href, children }) => (
    <Link href={href} target="_blank" rel="noopener">
        {children}
    </Link>
);

/** Bonus depreciation percentage by placed-in-service year (IRC 168(k) phase-down). */
function bonusPercentForYear(year) {
    if (year <= 2022) return "100%";
    if (year === 2023) return "80%";
    if (year === 2024) return "60%";
    if (year === 2025) return "40%";
    if (year === 2026) return "20%";
    return "0%";
}

const PROPERTY_CLASSES = [
    "3yr",
    "5yr",
    "7yr",
    "10yr",
    "15yr",
    "20yr",
    "27.5yr",
    "39yr",
];

/** A labeled group of fields inside the dialog body. */
const FormSection = ({ title, hint, children }) => (
    <Box>
        <Typography variant="overline" sx={{ color: "text.secondary" }}>
            {title}
        </Typography>
        {hint && (
            <Typography
                variant="caption"
                color="text.disabled"
                sx={{ display: "block", mb: 1 }}
            >
                {hint}
            </Typography>
        )}
        <Box sx={{ mt: hint ? 0 : 1 }}>{children}</Box>
    </Box>
);

/**
 * Add / edit equipment.
 *
 * Fields are grouped into labeled sections and laid out two-up on wider
 * screens; the tax depreciation block stays collapsed since most items don't
 * need it. Validation is unchanged — it still walks the form for `required`
 * inputs, so the `name` / `data-label` input props matter.
 */
const EquipmentDialog = ({
    open,
    onClose,
    selectedEquipment,
    formData,
    setFormData,
    locations,
    users,
    onSave,
    showAlert,
}) => {
    const formRef = React.useRef(null);
    const [fieldErrors, setFieldErrors] = React.useState({});

    const set = (patch) => setFormData({ ...formData, ...patch });

    const clearFieldError = React.useCallback((key) => {
        setFieldErrors((prev) => {
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    }, []);

    const validateRequiredFields = React.useCallback(() => {
        const root = formRef.current;
        if (!root) return { valid: true, missingLabels: [] };

        const requiredEls = root.querySelectorAll(
            "input[required], textarea[required], select[required]",
        );

        const nextErrors = {};
        const missingLabels = [];

        requiredEls.forEach((el) => {
            const rawValue = el.value;
            const isMissing =
                rawValue == null ||
                (typeof rawValue === "string" && rawValue.trim() === "");
            if (!isMissing) return;

            const formControl = el.closest(".MuiFormControl-root");
            const labelText =
                formControl?.querySelector("label")?.textContent?.trim() ||
                el.getAttribute("aria-label") ||
                el.getAttribute("placeholder") ||
                el.dataset.label ||
                "A required field";

            const key =
                el.getAttribute("name") ||
                el.dataset.field ||
                el.getAttribute("id") ||
                labelText ||
                "";

            const label =
                el.dataset.label ||
                (key ? key.replaceAll("_", " ") : "A required field");

            if (key) nextErrors[key] = true;
            missingLabels.push(label);
        });

        // Placed-in-service defaults to the purchase date, and can't precede it.
        const purchaseRaw = formData.date_of_purchase || "";
        const placedRaw = formData.placed_in_service_date || purchaseRaw;
        const purchase = purchaseRaw ? new Date(purchaseRaw) : null;
        const placed = placedRaw ? new Date(placedRaw) : null;

        if (
            purchase &&
            placed &&
            !Number.isNaN(purchase.getTime()) &&
            !Number.isNaN(placed.getTime()) &&
            purchase > placed
        ) {
            missingLabels.push(
                "Placed in Service Date must be on or after Date of Purchase",
            );
            nextErrors.placed_in_service_date = true;
            nextErrors.date_of_purchase = true;
        }

        const uniqueMissing = Array.from(new Set(missingLabels));
        setFieldErrors(nextErrors);

        return {
            valid: uniqueMissing.length === 0,
            missingLabels: uniqueMissing,
        };
    }, [formData.date_of_purchase, formData.placed_in_service_date]);

    const handleSave = React.useCallback(async () => {
        const { valid, missingLabels } = validateRequiredFields();

        if (!valid) {
            showAlert(
                `Please fill out the required field(s): ${missingLabels.join(", ")}.`,
                "error",
                "Error Saving Equipment",
            );
            return;
        }

        try {
            await onSave();
        } catch (error) {
            showAlert(
                error?.response?.data?.message ||
                    "Failed to save equipment. Please try again.",
                "error",
                "Error Saving Equipment",
            );
        }
    }, [onSave, showAlert, validateRequiredFields]);

    const locationState = locations.find(
        (l) => l.Alias === formData.location,
    )?.state;

    const placedYear = formData.placed_in_service_date
        ? new Date(formData.placed_in_service_date).getFullYear()
        : null;

    return (
        <ResponsiveDialog
            open={open}
            onClose={onClose}
            title={selectedEquipment ? "Edit equipment" : "Add equipment"}
            subtitle={
                selectedEquipment
                    ? selectedEquipment.name
                    : "Add a new item to the catalog"
            }
            icon={<BuildOutlinedIcon />}
            maxWidth="md"
            actions={
                <>
                    <Button onClick={onClose} variant="outlined">
                        Cancel
                    </Button>
                    <Button onClick={handleSave} variant="contained">
                        {selectedEquipment ? "Save changes" : "Add equipment"}
                    </Button>
                </>
            }
        >
            <Box ref={formRef} component="form" noValidate>
                <Stack spacing={3} divider={<Divider flexItem />}>
                    {/* ---- Identity ---- */}
                    <FormSection title="Identity">
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={8}>
                                <TextField
                                    label="Name"
                                    value={formData.name}
                                    onChange={(e) => {
                                        clearFieldError("name");
                                        set({ name: e.target.value });
                                    }}
                                    required
                                    fullWidth
                                    error={!!fieldErrors.name}
                                    helperText={
                                        fieldErrors.name
                                            ? "Name is required."
                                            : " "
                                    }
                                    inputProps={{
                                        name: "name",
                                        "data-label": "Name",
                                    }}
                                />
                            </Grid>

                            <Grid item xs={12} sm={4}>
                                <TextField
                                    select
                                    label="Can be booked"
                                    value={formData.can_book}
                                    required
                                    onChange={(e) => {
                                        clearFieldError("can_book");
                                        set({ can_book: e.target.value });
                                    }}
                                    fullWidth
                                    error={!!fieldErrors.can_book}
                                    helperText={
                                        fieldErrors.can_book
                                            ? "Required."
                                            : "Reservable by users"
                                    }
                                    SelectProps={{
                                        inputProps: {
                                            name: "can_book",
                                            "data-label": "Can Be Booked",
                                        },
                                    }}
                                >
                                    <MenuItem value={true}>Yes</MenuItem>
                                    <MenuItem value={false}>No</MenuItem>
                                </TextField>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Serial number"
                                    value={formData.serial_number}
                                    onChange={(e) =>
                                        set({ serial_number: e.target.value })
                                    }
                                    fullWidth
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Asset number"
                                    value={formData.asset_number}
                                    required
                                    onChange={(e) =>
                                        set({ asset_number: e.target.value })
                                    }
                                    fullWidth
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Brand name"
                                    value={formData.brand_name}
                                    onChange={(e) =>
                                        set({ brand_name: e.target.value })
                                    }
                                    fullWidth
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    select
                                    label="Status"
                                    value={formData.status}
                                    onChange={(e) =>
                                        set({ status: e.target.value })
                                    }
                                    fullWidth
                                >
                                    <MenuItem value="available">
                                        Available
                                    </MenuItem>
                                    <MenuItem value="reserved">
                                        Reserved
                                    </MenuItem>
                                    <MenuItem value="out for calibration">
                                        Out for calibration
                                    </MenuItem>
                                    <MenuItem value="retired">Retired</MenuItem>
                                </TextField>
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    label="Notes"
                                    value={formData.description}
                                    onChange={(e) =>
                                        set({ description: e.target.value })
                                    }
                                    multiline
                                    rows={2}
                                    fullWidth
                                />
                            </Grid>
                        </Grid>
                    </FormSection>

                    {/* ---- Approval ---- */}
                    <FormSection
                        title="Approval"
                        hint="Who signs off before a reservation of this item is confirmed."
                    >
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    select
                                    label="Needs approval"
                                    // Older rows predate the column, so the
                                    // value can arrive null — coerce it or the
                                    // Select flips from uncontrolled on first
                                    // edit.
                                    value={!!formData.requires_approval}
                                    required
                                    onChange={(e) => {
                                        clearFieldError("requires_approval");
                                        set({
                                            requires_approval: e.target.value,
                                        });
                                    }}
                                    fullWidth
                                    error={!!fieldErrors.requires_approval}
                                    helperText={
                                        fieldErrors.requires_approval
                                            ? "Required."
                                            : "Reservations wait for sign-off"
                                    }
                                    SelectProps={{
                                        inputProps: {
                                            name: "requires_approval",
                                            "data-label": "Needs Approval",
                                        },
                                    }}
                                >
                                    <MenuItem value={true}>Yes</MenuItem>
                                    <MenuItem value={false}>No</MenuItem>
                                </TextField>
                            </Grid>

                            <Grid item xs={12}>
                                {/* Kept mounted so the picker's in-flight AD
                                    search and typed text survive a toggle. */}
                                <Collapse
                                    in={!!formData.requires_approval}
                                    timeout={280}
                                >
                                    <Box sx={{ pt: 0.5 }}>
                                        <ApproverPicker
                                            value={formData.approvers || []}
                                            onChange={(approvers) =>
                                                set({ approvers })
                                            }
                                            users={users}
                                        />
                                    </Box>
                                </Collapse>
                            </Grid>
                        </Grid>
                    </FormSection>

                    {/* ---- Location & contact ---- */}
                    <FormSection title="Location & contact">
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    select
                                    label="Location"
                                    value={formData.location}
                                    required
                                    onChange={(e) =>
                                        set({ location: e.target.value })
                                    }
                                    fullWidth
                                >
                                    <MenuItem value="">
                                        <em>None</em>
                                    </MenuItem>
                                    {locations.map((loc) => (
                                        <MenuItem
                                            key={loc.officeid}
                                            value={loc.Alias}
                                        >
                                            {loc.Alias} — {loc.City},{" "}
                                            {loc.state}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <Autocomplete
                                    options={users}
                                    getOptionLabel={(option) =>
                                        typeof option === "string"
                                            ? option
                                            : `${option.first_name} ${option.last_name}`
                                    }
                                    value={
                                        users.find(
                                            (u) =>
                                                u.id ===
                                                formData.contact_person_id,
                                        ) || null
                                    }
                                    onChange={(_, newValue) =>
                                        set({
                                            contact_person: newValue
                                                ? `${newValue.first_name} ${newValue.last_name}`
                                                : "",
                                            contact_person_id:
                                                newValue?.id ?? null,
                                        })
                                    }
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Contact person"
                                            fullWidth
                                        />
                                    )}
                                    renderOption={(props, option) => (
                                        <Box
                                            component="li"
                                            {...props}
                                            key={option.id}
                                        >
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography
                                                    variant="body2"
                                                    noWrap
                                                >
                                                    {option.first_name}{" "}
                                                    {option.last_name}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    noWrap
                                                >
                                                    {option.email}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    )}
                                    isOptionEqualToValue={(option, value) =>
                                        option.id === value?.id
                                    }
                                    ListboxProps={{
                                        style: { maxHeight: 250 },
                                    }}
                                    fullWidth
                                />
                            </Grid>
                        </Grid>
                    </FormSection>

                    {/* ---- Purchase & billing ---- */}
                    <FormSection title="Purchase & billing">
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Date of purchase"
                                    type="date"
                                    value={formData.date_of_purchase}
                                    onChange={(e) =>
                                        set({ date_of_purchase: e.target.value })
                                    }
                                    fullWidth
                                    error={!!fieldErrors.date_of_purchase}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Purchase cost"
                                    type="number"
                                    value={formData.cost}
                                    onChange={(e) =>
                                        set({ cost: e.target.value })
                                    }
                                    fullWidth
                                    InputProps={{ startAdornment: "$" }}
                                    inputProps={{ step: "0.01", min: "0" }}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Billing rate"
                                    value={formData.billing_rate}
                                    onChange={(e) =>
                                        set({ billing_rate: e.target.value })
                                    }
                                    fullWidth
                                    InputProps={{ startAdornment: "$" }}
                                    inputProps={{ step: "0.01", min: "0" }}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Billing code"
                                    value={formData.billing_code}
                                    onChange={(e) =>
                                        set({ billing_code: e.target.value })
                                    }
                                    fullWidth
                                />
                            </Grid>
                        </Grid>
                    </FormSection>

                    {/* ---- Calibration ---- */}
                    <FormSection
                        title="Calibration"
                        hint="Leave blank if calibration doesn't apply to this item."
                    >
                        <Grid container spacing={2}>
                            <Grid item xs={8} sm={4}>
                                <TextField
                                    label="Interval"
                                    type="number"
                                    value={formData.calibration_interval_value}
                                    onChange={(e) =>
                                        set({
                                            calibration_interval_value:
                                                e.target.value,
                                        })
                                    }
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={4} sm={3}>
                                <TextField
                                    select
                                    label="Unit"
                                    value={formData.calibration_interval_unit}
                                    onChange={(e) =>
                                        set({
                                            calibration_interval_unit:
                                                e.target.value,
                                        })
                                    }
                                    fullWidth
                                >
                                    <MenuItem value="days">Days</MenuItem>
                                    <MenuItem value="months">Months</MenuItem>
                                    <MenuItem value="years">Years</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={5}>
                                <TextField
                                    label="Last calibration date"
                                    type="date"
                                    value={formData.last_calibration_date}
                                    onChange={(e) =>
                                        set({
                                            last_calibration_date:
                                                e.target.value,
                                        })
                                    }
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                        </Grid>
                    </FormSection>

                    {/* ---- Tax depreciation ---- */}
                    <Accordion>
                        <AccordionSummary
                            expandIcon={<ExpandMore />}
                            aria-controls="tax-fields-content"
                            id="tax-fields-header"
                        >
                            <Box>
                                <Typography variant="subtitle2">
                                    Tax depreciation
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    Optional — for assets tracked for tax
                                </Typography>
                            </Box>
                        </AccordionSummary>

                        <AccordionDetails sx={{ px: { xs: 1.5, sm: 2 }, pb: 2.5 }}>
                            <Grid container spacing={2.5}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        label="Placed in service date"
                                        type="date"
                                        value={formData.placed_in_service_date}
                                        onChange={(e) =>
                                            set({
                                                placed_in_service_date:
                                                    e.target.value,
                                            })
                                        }
                                        fullWidth
                                        error={
                                            !!fieldErrors.placed_in_service_date
                                        }
                                        InputLabelProps={{ shrink: true }}
                                        helperText={
                                            <span>
                                                Defaults to the date of
                                                purchase. See{" "}
                                                <IrsLink href="https://www.irs.gov/publications/p946#en_US_2024_publink1000107604">
                                                    IRS Pub 946
                                                </IrsLink>
                                                {locationState && (
                                                    <>
                                                        {" and "}
                                                        <StateTaxLink
                                                            state={locationState}
                                                        />
                                                    </>
                                                )}
                                            </span>
                                        }
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        label="Cost basis for depreciation"
                                        type="number"
                                        value={formData.cost_basis}
                                        onChange={(e) =>
                                            set({ cost_basis: e.target.value })
                                        }
                                        fullWidth
                                        InputProps={{ startAdornment: "$" }}
                                        inputProps={{
                                            step: "0.01",
                                            min: "0",
                                        }}
                                        helperText={
                                            <span>
                                                Leave blank to use purchase
                                                cost. See{" "}
                                                <IrsLink href="https://www.irs.gov/publications/p946#en_US_2024_publink1000107366">
                                                    IRS Pub 946 — Basis
                                                </IrsLink>
                                            </span>
                                        }
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        select
                                        label="Property class"
                                        value={formData.property_class}
                                        onChange={(e) =>
                                            set({
                                                property_class: e.target.value,
                                            })
                                        }
                                        fullWidth
                                        helperText={
                                            <span>
                                                IRS recovery period. See{" "}
                                                <IrsLink href="https://www.irs.gov/publications/p946#en_US_2024_publink1000107524">
                                                    MACRS recovery periods
                                                </IrsLink>
                                            </span>
                                        }
                                    >
                                        {PROPERTY_CLASSES.map((cls) => (
                                            <MenuItem key={cls} value={cls}>
                                                {cls.replace("yr", "")}-year
                                                property
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        select
                                        label="Depreciation method"
                                        value={formData.method}
                                        onChange={(e) =>
                                            set({ method: e.target.value })
                                        }
                                        fullWidth
                                        helperText={
                                            <span>
                                                <IrsLink href="https://www.irs.gov/publications/p946#en_US_2024_publink1000107510">
                                                    MACRS GDS vs ADS
                                                </IrsLink>
                                            </span>
                                        }
                                    >
                                        <MenuItem value="MACRS">
                                            MACRS GDS (modified accelerated)
                                        </MenuItem>
                                        <MenuItem value="ADS">
                                            ADS (alternative depreciation)
                                        </MenuItem>
                                    </TextField>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        select
                                        label="Bonus depreciation eligible"
                                        value={formData.bonus_eligible}
                                        onChange={(e) =>
                                            set({
                                                bonus_eligible:
                                                    e.target.value === "true" ||
                                                    e.target.value === true,
                                            })
                                        }
                                        fullWidth
                                        helperText={
                                            <span>
                                                IRC §168(k). See{" "}
                                                <IrsLink href="https://www.irs.gov/publications/p946#en_US_2023_publink1000293543">
                                                    special depreciation
                                                    allowance
                                                </IrsLink>
                                                {locationState && (
                                                    <>
                                                        {" | "}
                                                        <StateTaxLink
                                                            state={locationState}
                                                        />
                                                    </>
                                                )}
                                            </span>
                                        }
                                    >
                                        <MenuItem value={true}>Yes</MenuItem>
                                        <MenuItem value={false}>No</MenuItem>
                                    </TextField>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        select
                                        label="Depreciation convention"
                                        value={formData.convention}
                                        onChange={(e) =>
                                            set({ convention: e.target.value })
                                        }
                                        fullWidth
                                        helperText={
                                            <span>
                                                Half-year is the common case.
                                                See{" "}
                                                <IrsLink href="https://www.irs.gov/publications/p946#en_US_2024_publink1000107596">
                                                    applicable conventions
                                                </IrsLink>
                                            </span>
                                        }
                                    >
                                        <MenuItem value="half-year">
                                            Half-year (default)
                                        </MenuItem>
                                        <MenuItem value="mid-quarter">
                                            Mid-quarter
                                        </MenuItem>
                                        <MenuItem value="mid-month">
                                            Mid-month (real property)
                                        </MenuItem>
                                    </TextField>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        select
                                        label="Vehicle classification"
                                        value={formData.vehicle_class}
                                        onChange={(e) =>
                                            set({
                                                vehicle_class: e.target.value,
                                            })
                                        }
                                        fullWidth
                                        helperText={
                                            <span>
                                                Required for vehicles taking a
                                                §179 deduction — passenger autos
                                                and SUVs have lower caps. See{" "}
                                                <IrsLink href="https://www.irs.gov/publications/p946#en_US_2023_publink1000107484">
                                                    listed property
                                                </IrsLink>{" "}
                                                and{" "}
                                                <IrsLink href="https://www.irs.gov/pub/irs-drop/rp-23-34.pdf">
                                                    Rev. Proc. 2023-34
                                                </IrsLink>
                                                .
                                            </span>
                                        }
                                    >
                                        <MenuItem value="UNKNOWN">
                                            Unknown / not a vehicle
                                        </MenuItem>
                                        <MenuItem value="PASSENGER_AUTO">
                                            Passenger automobile
                                        </MenuItem>
                                        <MenuItem value="SUV_LIMITED_179">
                                            SUV / truck / van (6,000–14,000 lbs)
                                        </MenuItem>
                                        <MenuItem value="HEAVY_TRUCK_NOT_LIMITED_179">
                                            Heavy vehicle (&gt;14,000 lbs)
                                        </MenuItem>
                                    </TextField>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        label="Section 179 election amount"
                                        type="number"
                                        value={formData.section179_elected}
                                        onChange={(e) =>
                                            set({
                                                section179_elected:
                                                    e.target.value,
                                            })
                                        }
                                        fullWidth
                                        InputProps={{ startAdornment: "$" }}
                                        inputProps={{ step: "1", min: "0" }}
                                        helperText={
                                            <span>
                                                Amount elected for immediate
                                                expensing. See{" "}
                                                <IrsLink href="https://www.irs.gov/publications/p946#idm140530190808640">
                                                    §179 deduction
                                                </IrsLink>
                                                {locationState && (
                                                    <>
                                                        {" | "}
                                                        <StateTaxLink
                                                            state={locationState}
                                                        />
                                                    </>
                                                )}
                                            </span>
                                        }
                                    />
                                </Grid>

                                {placedYear && (
                                    <Grid item xs={12}>
                                        <Alert
                                            severity="info"
                                            sx={{ boxShadow: "none" }}
                                        >
                                            <Typography
                                                variant="subtitle2"
                                                sx={{ mb: 0.5 }}
                                            >
                                                Tax year {placedYear} IRS limits
                                            </Typography>
                                            <Typography variant="body2">
                                                • Bonus depreciation:{" "}
                                                {bonusPercentForYear(placedYear)}
                                            </Typography>
                                            <Typography variant="body2">
                                                • Section 179 overall limit:
                                                $1,220,000 (per company, 2024)
                                            </Typography>
                                            {formData.vehicle_class ===
                                                "SUV_LIMITED_179" && (
                                                <Typography variant="body2">
                                                    • SUV §179 cap: $30,500
                                                    (2024)
                                                </Typography>
                                            )}
                                            {formData.vehicle_class ===
                                                "PASSENGER_AUTO" && (
                                                <Typography variant="body2">
                                                    • Passenger auto year-1 cap:
                                                    $20,400 with bonus, $12,400
                                                    without (2024)
                                                </Typography>
                                            )}
                                        </Alert>
                                    </Grid>
                                )}
                            </Grid>
                        </AccordionDetails>
                    </Accordion>
                </Stack>
            </Box>
        </ResponsiveDialog>
    );
};

export default EquipmentDialog;
