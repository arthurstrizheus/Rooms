import React from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
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
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";

// Helper functions to get state-specific tax resource links
const getStateDepreciationLink = (state) => {
    const links = {
        OH: (
            <Link
                href="https://tax.ohio.gov/faq-IncomeDepreciation"
                target="_blank"
                rel="noopener"
            >
                OH depreciation guidance
            </Link>
        ),
        MO: (
            <Link
                href="https://dor.mo.gov/faq/taxation/business/corporation-income.html"
                target="_blank"
                rel="noopener"
            >
                MO tax guidance
            </Link>
        ),
        TX: (
            <Link
                href="https://comptroller.texas.gov/taxes/franchise/"
                target="_blank"
                rel="noopener"
            >
                TX franchise tax info
            </Link>
        ),
        IL: (
            <Link
                href="https://tax.illinois.gov/content/dam/soi/en/web/tax/forms/incometax/documents/currentyear/miscellaneous/il-4562-instr.pdf"
                target="_blank"
                rel="noopener"
            >
                IL Form 4562
            </Link>
        ),
        FL: (
            <Link
                href="https://floridarevenue.com/taxes/tips/Documents/TIP_24C01-02.pdf"
                target="_blank"
                rel="noopener"
            >
                FL depreciation adjustments
            </Link>
        ),
        NC: (
            <Link
                href="https://www.ncdor.gov/taxes-forms/individual-income-tax/filing-topics/adjustment-bonus-depreciation"
                target="_blank"
                rel="noopener"
            >
                NC bonus depreciation
            </Link>
        ),
        GA: (
            <Link
                href="https://dor.georgia.gov/taxes/tax-rules-and-policies/income-tax-federal-tax-changes"
                target="_blank"
                rel="noopener"
            >
                GA federal tax changes
            </Link>
        ),
        MD: (
            <Link
                href="https://www.marylandtaxes.gov/forms/Tax_Publications/Administrative_Releases/Income_and_Estate_Tax_Releases/ar_it38.pdf"
                target="_blank"
                rel="noopener"
            >
                MD depreciation decoupling
            </Link>
        ),
        MI: (
            <Link
                href="https://www.michigan.gov/taxes/questions/cit/corporate/corporate-tax-base-16--the-tax-base-under-the-cit-is-computed-as-though-section-168k-bonus-deprecia"
                target="_blank"
                rel="noopener"
            >
                MI CIT Section 168(k)
            </Link>
        ),
    };
    return links[state] || <span>state Section 179 info</span>;
};

const getStateBonusDepreciationLink = (state) => {
    // Same links as above for bonus depreciation guidance
    return getStateDepreciationLink(state);
};

const getStateSection179Link = (state) => {
    // Same links as above for Section 179 guidance
    return getStateDepreciationLink(state);
};

const EquipmentDialog = ({
    open,
    onClose,
    selectedEquipment,
    formData,
    setFormData,
    locations,
    users,
    onSave,
}) => {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {selectedEquipment ? "Edit Equipment" : "Add Equipment"}
            </DialogTitle>
            <DialogContent>
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        mt: 1,
                    }}
                >
                    <TextField
                        label="Name"
                        value={formData.name}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                name: e.target.value,
                            })
                        }
                        required
                        fullWidth
                    />
                    <TextField
                        label="Description"
                        value={formData.description}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                description: e.target.value,
                            })
                        }
                        multiline
                        rows={3}
                        fullWidth
                    />
                    <TextField
                        label="Serial Number"
                        value={formData.serial_number}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                serial_number: e.target.value,
                            })
                        }
                        fullWidth
                    />
                    <TextField
                        label="Purchase Cost"
                        type="number"
                        value={formData.cost}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                cost: e.target.value,
                            })
                        }
                        fullWidth
                        InputProps={{
                            startAdornment: "$",
                        }}
                        inputProps={{
                            step: "0.01",
                            min: "0",
                        }}
                    />

                    <TextField
                        select
                        label="Location"
                        value={formData.location}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                location: e.target.value,
                            })
                        }
                        fullWidth
                    >
                        <MenuItem value="">
                            <em>None</em>
                        </MenuItem>
                        {locations.map((loc) => (
                            <MenuItem key={loc.officeid} value={loc.Alias}>
                                {loc.Alias} - {loc.City}, {loc.state}
                            </MenuItem>
                        ))}
                    </TextField>
                    <Autocomplete
                        options={users}
                        getOptionLabel={(option) =>
                            typeof option === "string"
                                ? option
                                : `${option.first_name} ${option.last_name}`
                        }
                        value={
                            users.find(
                                (u) => u.id === formData.contact_person_id,
                            ) || null
                        }
                        onChange={(event, newValue) => {
                            setFormData({
                                ...formData,
                                contact_person: newValue
                                    ? `${newValue.first_name} ${newValue.last_name}`
                                    : "",
                                contact_person_id: newValue
                                    ? newValue.id
                                    : null,
                            });
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Contact Person"
                                fullWidth
                            />
                        )}
                        renderOption={(props, option) => (
                            <li {...props} key={option.id}>
                                {option.first_name} {option.last_name} (
                                {option.email})
                            </li>
                        )}
                        isOptionEqualToValue={(option, value) =>
                            option.id === value?.id
                        }
                        ListboxProps={{
                            style: { maxHeight: "250px" },
                        }}
                        fullWidth
                    />
                    <TextField
                        select
                        label="Status"
                        value={formData.status}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                status: e.target.value,
                            })
                        }
                        fullWidth
                    >
                        <MenuItem value="available">Available</MenuItem>
                        <MenuItem value="reserved">Reserved</MenuItem>
                        <MenuItem value="maintenance">Maintenance</MenuItem>
                        <MenuItem value="retired">Retired</MenuItem>
                    </TextField>
                    <TextField
                        select
                        label="Can Be Booked"
                        value={formData.can_book}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                can_book: e.target.value === "true",
                            })
                        }
                        fullWidth
                    >
                        <MenuItem value={true}>Yes</MenuItem>
                        <MenuItem value={false}>No</MenuItem>
                    </TextField>
                    <TextField
                        label="Last Calibration Date"
                        type="date"
                        value={formData.last_calibration_date}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                last_calibration_date: e.target.value,
                            })
                        }
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                    />
                    <Box sx={{ display: "flex", gap: 2 }}>
                        <TextField
                            label="Calibration Interval"
                            type="number"
                            value={formData.calibration_interval_value}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    calibration_interval_value: e.target.value,
                                })
                            }
                            fullWidth
                            sx={{ flex: 2 }}
                        />
                        <TextField
                            select
                            label="Unit"
                            value={formData.calibration_interval_unit}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    calibration_interval_unit: e.target.value,
                                })
                            }
                            fullWidth
                            sx={{ flex: 1 }}
                        >
                            <MenuItem value="days">Days</MenuItem>
                            <MenuItem value="months">Months</MenuItem>
                            <MenuItem value="years">Years</MenuItem>
                        </TextField>
                    </Box>

                    {/* Optional Tax Depreciation Section */}
                    <Accordion sx={{ mt: 3 }}>
                        <AccordionSummary
                            expandIcon={<ExpandMore />}
                            aria-controls="tax-fields-content"
                            id="tax-fields-header"
                        >
                            <Typography variant="subtitle1">
                                Optional Tax Depreciation Fields
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 2,
                                }}
                            >
                                <TextField
                                    label="Placed in Service Date"
                                    type="date"
                                    value={formData.placed_in_service_date}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            placed_in_service_date:
                                                e.target.value,
                                        })
                                    }
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                    helperText={
                                        <span>
                                            Date asset was put into service for
                                            tax purposes. See{" "}
                                            <Link
                                                href="https://www.irs.gov/publications/p946#en_US_2024_publink1000107604"
                                                target="_blank"
                                                rel="noopener"
                                            >
                                                IRS Pub 946
                                            </Link>
                                            {formData.location &&
                                                locations.find(
                                                    (l) =>
                                                        l.Alias ===
                                                        formData.location,
                                                )?.state && (
                                                    <>
                                                        {" "}
                                                        and{" "}
                                                        {getStateDepreciationLink(
                                                            locations.find(
                                                                (l) =>
                                                                    l.Alias ===
                                                                    formData.location,
                                                            )?.state,
                                                        )}
                                                    </>
                                                )}
                                        </span>
                                    }
                                />

                                <TextField
                                    label="Cost Basis for Depreciation"
                                    type="number"
                                    value={formData.cost_basis}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            cost_basis: e.target.value,
                                        })
                                    }
                                    fullWidth
                                    InputProps={{
                                        startAdornment: "$",
                                    }}
                                    inputProps={{
                                        step: "0.01",
                                        min: "0",
                                    }}
                                    helperText={
                                        <span>
                                            Leave blank to use Purchase Cost.
                                            See{" "}
                                            <Link
                                                href="https://www.irs.gov/publications/p946#en_US_2024_publink1000107366"
                                                target="_blank"
                                                rel="noopener"
                                            >
                                                IRS Pub 946 - Basis
                                            </Link>
                                        </span>
                                    }
                                />

                                <TextField
                                    select
                                    label="Property Class"
                                    value={formData.property_class}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            property_class: e.target.value,
                                        })
                                    }
                                    fullWidth
                                    helperText={
                                        <span>
                                            IRS depreciation recovery period.
                                            See{" "}
                                            <Link
                                                href="https://www.irs.gov/publications/p946#en_US_2024_publink1000107524"
                                                target="_blank"
                                                rel="noopener"
                                            >
                                                IRS Pub 946 - MACRS Recovery
                                                Periods
                                            </Link>
                                        </span>
                                    }
                                >
                                    <MenuItem value="3yr">
                                        3-Year Property
                                    </MenuItem>
                                    <MenuItem value="5yr">
                                        5-Year Property
                                    </MenuItem>
                                    <MenuItem value="7yr">
                                        7-Year Property
                                    </MenuItem>
                                    <MenuItem value="10yr">
                                        10-Year Property
                                    </MenuItem>
                                    <MenuItem value="15yr">
                                        15-Year Property
                                    </MenuItem>
                                    <MenuItem value="20yr">
                                        20-Year Property
                                    </MenuItem>
                                    <MenuItem value="27.5yr">
                                        27.5-Year Property
                                    </MenuItem>
                                    <MenuItem value="39yr">
                                        39-Year Property
                                    </MenuItem>
                                </TextField>

                                <TextField
                                    select
                                    label="Depreciation Method"
                                    value={formData.method}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            method: e.target.value,
                                        })
                                    }
                                    fullWidth
                                    helperText={
                                        <span>
                                            <Link
                                                href="https://www.irs.gov/publications/p946#en_US_2024_publink1000107510"
                                                target="_blank"
                                                rel="noopener"
                                            >
                                                MACRS GDS(Modified Accelerated
                                                Cost Recovery)
                                            </Link>{" "}
                                            vs{" "}
                                            <Link
                                                href="https://www.irs.gov/publications/p946#en_US_2024_publink1000107510"
                                                target="_blank"
                                                rel="noopener"
                                            >
                                                ADS (Alternative Depreciation
                                                System)
                                            </Link>
                                        </span>
                                    }
                                >
                                    <MenuItem value="MACRS">
                                        MACRS GDS (Modified Accelerated)
                                    </MenuItem>
                                    <MenuItem value="ADS">
                                        ADS (Alternative Depreciation)
                                    </MenuItem>
                                </TextField>

                                <TextField
                                    select
                                    label="Bonus Depreciation Eligible"
                                    value={formData.bonus_eligible}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            bonus_eligible:
                                                e.target.value === "true",
                                        })
                                    }
                                    fullWidth
                                    helperText={
                                        <span>
                                            IRC Section 168(k) Bonus
                                            Depreciation. See{" "}
                                            <Link
                                                href="https://www.irs.gov/publications/p946#en_US_2023_publink1000293543"
                                                target="_blank"
                                                rel="noopener"
                                            >
                                                IRS Pub 946 - Special
                                                Depreciation Allowance
                                            </Link>
                                            {formData.location &&
                                                locations.find(
                                                    (l) =>
                                                        l.Alias ===
                                                        formData.location,
                                                )?.state && (
                                                    <>
                                                        {" "}
                                                        |{" "}
                                                        {getStateBonusDepreciationLink(
                                                            locations.find(
                                                                (l) =>
                                                                    l.Alias ===
                                                                    formData.location,
                                                            )?.state,
                                                        )}
                                                    </>
                                                )}
                                        </span>
                                    }
                                >
                                    <MenuItem value={true}>Yes</MenuItem>
                                    <MenuItem value={false}>No</MenuItem>
                                </TextField>

                                <TextField
                                    select
                                    label="Vehicle Classification (if applicable)"
                                    value={formData.vehicle_class}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            vehicle_class: e.target.value,
                                        })
                                    }
                                    fullWidth
                                    helperText={
                                        <span>
                                            Required for vehicles with Section
                                            179 deduction. Passenger autos have
                                            lower caps ($12k-20k). SUVs
                                            6,000-14,000 lbs GVWR have mid-range
                                            caps (~$28k-32k). Heavy vehicles
                                            &gt;14,000 lbs have no special caps.
                                            See{" "}
                                            <Link
                                                href="https://www.irs.gov/publications/p946#en_US_2023_publink1000107484"
                                                target="_blank"
                                                rel="noopener"
                                            >
                                                IRS Pub 946 - Listed Property
                                            </Link>{" "}
                                            for vehicle definitions and{" "}
                                            <Link
                                                href="https://www.irs.gov/pub/irs-drop/rp-23-34.pdf"
                                                target="_blank"
                                                rel="noopener"
                                            >
                                                Rev. Proc. 2023-34
                                            </Link>{" "}
                                            for current year limits.
                                        </span>
                                    }
                                >
                                    <MenuItem value="UNKNOWN">
                                        Unknown / Not a Vehicle
                                    </MenuItem>
                                    <MenuItem value="PASSENGER_AUTO">
                                        Passenger Automobile
                                    </MenuItem>
                                    <MenuItem value="SUV_LIMITED_179">
                                        SUV/Truck/Van (6,000-14,000 lbs)
                                    </MenuItem>
                                    <MenuItem value="HEAVY_TRUCK_NOT_LIMITED_179">
                                        Heavy Vehicle (&gt;14,000 lbs)
                                    </MenuItem>
                                </TextField>

                                <TextField
                                    label="Section 179 Election Amount"
                                    type="number"
                                    value={formData.section179_elected}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            section179_elected: e.target.value,
                                        })
                                    }
                                    fullWidth
                                    InputProps={{
                                        startAdornment: "$",
                                    }}
                                    inputProps={{
                                        step: "1",
                                        min: "0",
                                    }}
                                    helperText={
                                        <span>
                                            Amount elected for immediate Section
                                            179 expensing. See{" "}
                                            <Link
                                                href="https://www.irs.gov/publications/p946#idm140530190808640"
                                                target="_blank"
                                                rel="noopener"
                                            >
                                                IRS Pub 946 - Section 179
                                                Deduction
                                            </Link>
                                            {formData.location &&
                                                locations.find(
                                                    (l) =>
                                                        l.Alias ===
                                                        formData.location,
                                                )?.state && (
                                                    <>
                                                        {" "}
                                                        |{" "}
                                                        {getStateSection179Link(
                                                            locations.find(
                                                                (l) =>
                                                                    l.Alias ===
                                                                    formData.location,
                                                            )?.state,
                                                        )}
                                                    </>
                                                )}
                                        </span>
                                    }
                                />

                                <TextField
                                    select
                                    label="Depreciation Convention"
                                    value={formData.convention}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            convention: e.target.value,
                                        })
                                    }
                                    fullWidth
                                    helperText={
                                        <span>
                                            Determines first-year depreciation
                                            timing. Half-year (most common)
                                            assumes mid-year placement.
                                            Mid-quarter applies if {">"}40% of
                                            year's assets placed in Q4. See{" "}
                                            <Link
                                                href="https://www.irs.gov/publications/p946#en_US_2024_publink1000107596"
                                                target="_blank"
                                                rel="noopener"
                                            >
                                                IRS Pub 946 - Using the
                                                Applicable Convention
                                            </Link>
                                        </span>
                                    }
                                >
                                    <MenuItem value="half-year">
                                        Half-Year Convention (default)
                                    </MenuItem>
                                    <MenuItem value="mid-quarter">
                                        Mid-Quarter Convention
                                    </MenuItem>
                                    <MenuItem value="mid-month">
                                        Mid-Month Convention (real property)
                                    </MenuItem>
                                </TextField>

                                {formData.placed_in_service_date && (
                                    <Box
                                        sx={{
                                            mt: 2,
                                            p: 2,
                                            bgcolor: "info.lighter",
                                            borderRadius: 1,
                                        }}
                                    >
                                        <Typography
                                            variant="body2"
                                            color="info.dark"
                                            gutterBottom
                                        >
                                            <strong>
                                                Tax Year{" "}
                                                {new Date(
                                                    formData.placed_in_service_date,
                                                ).getFullYear()}{" "}
                                                IRS Limits:
                                            </strong>
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                        >
                                            • Bonus Depreciation:{" "}
                                            {new Date(
                                                formData.placed_in_service_date,
                                            ).getFullYear() === 2024
                                                ? "60%"
                                                : new Date(
                                                        formData.placed_in_service_date,
                                                    ).getFullYear() === 2025
                                                  ? "40%"
                                                  : new Date(
                                                          formData.placed_in_service_date,
                                                      ).getFullYear() === 2026
                                                    ? "20%"
                                                    : new Date(
                                                            formData.placed_in_service_date,
                                                        ).getFullYear() >= 2027
                                                      ? "0%"
                                                      : new Date(
                                                              formData.placed_in_service_date,
                                                          ).getFullYear() <=
                                                          2022
                                                        ? "100%"
                                                        : "80%"}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                        >
                                            • Section 179 Overall Limit:
                                            $1,220,000 (per company, 2024)
                                        </Typography>
                                        {formData.vehicle_class ===
                                            "SUV_LIMITED_179" && (
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                • SUV Section 179 Cap: $30,500
                                                (2024)
                                            </Typography>
                                        )}
                                        {formData.vehicle_class ===
                                            "PASSENGER_AUTO" && (
                                            <Typography
                                                variant="body2"
                                                color="warning.dark"
                                            >
                                                • Passenger Auto Year 1 Cap:
                                                $20,400 (with bonus) or $12,400
                                                (no bonus) - 2024
                                            </Typography>
                                        )}
                                    </Box>
                                )}
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={onSave} variant="contained">
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default EquipmentDialog;
