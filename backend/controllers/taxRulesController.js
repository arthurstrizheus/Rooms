const fs = require("fs");
const path = require("path");
const { loadRules } = require("../depreciation/rules/ruleLoader");

/**
 * Get all tax rules
 */
const GetAllRules = async (req, res, next) => {
    try {
        const rules = loadRules();
        res.json(rules);
    } catch (err) {
        next(err);
    }
};

/**
 * Get rules for a specific office
 */
const GetRulesByOffice = async (req, res, next) => {
    try {
        const { officeid } = req.params;
        const rules = loadRules();

        const office = rules.offices.find(
            (o) => o.officeid === parseInt(officeid),
        );
        if (!office) {
            return res.status(404).json({ message: "Office not found" });
        }

        res.json(office);
    } catch (err) {
        next(err);
    }
};

/**
 * Update tax rules for an office
 * This adds a NEW year range without overwriting historical data
 */
const UpdateOfficeRules = async (req, res, next) => {
    try {
        const { officeid } = req.params;
        const { taxType, yearRange } = req.body;

        if (!taxType || !yearRange) {
            return res.status(400).json({
                message: "taxType and yearRange are required",
            });
        }

        // Validate year range
        if (
            !yearRange.effectiveFromTaxYear ||
            !yearRange.parameters ||
            !yearRange.sources
        ) {
            return res.status(400).json({
                message:
                    "yearRange must include effectiveFromTaxYear, parameters, and sources",
            });
        }

        // Load current rules
        const taxJsonPath = path.join(__dirname, "../../Tax.json");
        const rulesData = JSON.parse(fs.readFileSync(taxJsonPath, "utf8"));

        // Find the office
        const officeIndex = rulesData.offices.findIndex(
            (o) => o.officeid === parseInt(officeid),
        );
        if (officeIndex === -1) {
            return res.status(404).json({ message: "Office not found" });
        }

        // Initialize tax type if it doesn't exist
        if (!rulesData.offices[officeIndex].tax) {
            rulesData.offices[officeIndex].tax = {};
        }
        if (!rulesData.offices[officeIndex].tax[taxType]) {
            rulesData.offices[officeIndex].tax[taxType] = {
                ruleType: yearRange.ruleType || "generally_no_addback",
                parametersByYear: [],
            };
        }

        // Check for overlapping year ranges
        const existingYearRanges =
            rulesData.offices[officeIndex].tax[taxType].parametersByYear;
        const newFromYear = yearRange.effectiveFromTaxYear;
        const newToYear = yearRange.effectiveToTaxYear;

        for (const existing of existingYearRanges) {
            const existingFrom = existing.effectiveFromTaxYear;
            const existingTo = existing.effectiveToTaxYear;

            // Check for overlap
            const hasOverlap =
                (newFromYear >= existingFrom &&
                    (existingTo === null || newFromYear <= existingTo)) ||
                (newToYear !== null &&
                    newToYear >= existingFrom &&
                    (existingTo === null || newToYear <= existingTo));

            if (hasOverlap) {
                return res.status(400).json({
                    message: `Year range ${newFromYear}-${newToYear || "ongoing"} overlaps with existing range ${existingFrom}-${existingTo || "ongoing"}`,
                    suggestion:
                        "Close the existing range by setting effectiveToTaxYear before adding a new range",
                });
            }
        }

        // Update rule type if provided
        if (yearRange.ruleType) {
            rulesData.offices[officeIndex].tax[taxType].ruleType =
                yearRange.ruleType;
        }

        // Add the new year range
        rulesData.offices[officeIndex].tax[taxType].parametersByYear.push({
            effectiveFromTaxYear: yearRange.effectiveFromTaxYear,
            effectiveToTaxYear: yearRange.effectiveToTaxYear,
            parameters: yearRange.parameters,
            sources: yearRange.sources,
        });

        // Update version
        const today = new Date().toISOString().split("T")[0];
        rulesData.rulePackMeta.version = today;

        // Write back to file with formatting
        fs.writeFileSync(
            taxJsonPath,
            JSON.stringify(rulesData, null, 4),
            "utf8",
        );

        // Clear the cache so new rules are loaded
        delete require.cache[
            require.resolve("../depreciation/rules/ruleLoader")
        ];

        res.json({
            message: "Tax rules updated successfully",
            office: rulesData.offices[officeIndex],
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Close an existing year range (set effectiveToTaxYear)
 */
const CloseYearRange = async (req, res, next) => {
    try {
        const { officeid } = req.params;
        const { taxType, effectiveFromTaxYear, effectiveToTaxYear } = req.body;

        if (!taxType || !effectiveFromTaxYear || !effectiveToTaxYear) {
            return res.status(400).json({
                message:
                    "taxType, effectiveFromTaxYear, and effectiveToTaxYear are required",
            });
        }

        // Load current rules
        const taxJsonPath = path.join(__dirname, "../../Tax.json");
        const rulesData = JSON.parse(fs.readFileSync(taxJsonPath, "utf8"));

        // Find the office
        const officeIndex = rulesData.offices.findIndex(
            (o) => o.officeid === parseInt(officeid),
        );
        if (officeIndex === -1) {
            return res.status(404).json({ message: "Office not found" });
        }

        if (!rulesData.offices[officeIndex].tax?.[taxType]) {
            return res
                .status(404)
                .json({ message: "Tax type not found for this office" });
        }

        // Find the year range to close
        const yearRanges =
            rulesData.offices[officeIndex].tax[taxType].parametersByYear;
        const rangeToClose = yearRanges.find(
            (r) => r.effectiveFromTaxYear === effectiveFromTaxYear,
        );

        if (!rangeToClose) {
            return res.status(404).json({ message: "Year range not found" });
        }

        // Close the range
        rangeToClose.effectiveToTaxYear = effectiveToTaxYear;

        // Update version
        const today = new Date().toISOString().split("T")[0];
        rulesData.rulePackMeta.version = today;

        // Write back to file
        fs.writeFileSync(
            taxJsonPath,
            JSON.stringify(rulesData, null, 4),
            "utf8",
        );

        // Clear the cache
        delete require.cache[
            require.resolve("../depreciation/rules/ruleLoader")
        ];

        res.json({
            message: "Year range closed successfully",
            office: rulesData.offices[officeIndex],
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Get available rule types
 */
const GetRuleTypes = async (req, res, next) => {
    try {
        const ruleTypes = [
            {
                value: "generally_no_addback",
                label: "No Add-back (Follow Federal)",
                description:
                    "State conforms to federal depreciation rules, no adjustments needed.",
                details:
                    "Use this when the state has coupled to federal IRC Section 168(k) bonus depreciation provisions.",
                examples: "Missouri, some conformity states",
                requiredParams: [],
            },
            {
                value: "addback_bonus_plus_179_over_threshold",
                label: "Add-back Bonus + Section 179 Over Threshold",
                description:
                    "Add back all federal bonus depreciation plus Section 179 deductions exceeding a state-specific threshold.",
                details:
                    "This is a permanent adjustment - amounts added back are not deducted in future years.",
                examples: "Ohio (threshold: $25,000), some Midwestern states",
                requiredParams: ["section179Threshold"],
                paramHelp: {
                    section179Threshold:
                        "Maximum Section 179 deduction allowed by state. Amounts above this are added back to taxable income.",
                },
            },
            {
                value: "addback_then_subtract_spread",
                label: "Add-back Then Spread Subtraction",
                description:
                    "Add back bonus depreciation in year 1, then allow equal subtractions over multiple years.",
                details:
                    "Creates a timing difference. Total depreciation matches federal over time, but spread differently.",
                examples: "Florida (7 years), some Southern states",
                requiredParams: ["spreadYears"],
                paramHelp: {
                    spreadYears:
                        "Number of years to spread the subtraction (typically 5, 7, or 10 years)",
                },
            },
            {
                value: "recompute_depreciation_as_if_no_168k",
                label: "Recompute Without Bonus Depreciation",
                description:
                    "Completely ignore IRC Section 168(k) bonus and recalculate using only regular MACRS.",
                details:
                    "State depreciation is calculated as if bonus depreciation was never elected.",
                examples: "California (pre-2020), some decoupling states",
                requiredParams: [],
            },
            {
                value: "proforma_difference_federal_asfiled_vs_without_decoupled",
                label: "Pro-forma Difference Method",
                description:
                    "Calculate the difference between federal return as filed vs. hypothetical return without decoupled provisions.",
                details:
                    "Advanced method requiring side-by-side calculations. Creates complex carryforwards.",
                examples: "Some states with partial conformity",
                requiredParams: [],
            },
            {
                value: "il_4562_reverse_federal_bonus",
                label: "Illinois Form 4562 Method",
                description:
                    "Use Illinois-specific worksheet to reverse and recalculate federal bonus depreciation.",
                details:
                    "Illinois has unique add-back and subtraction schedules tied to Form IL-4562.",
                examples: "Illinois only",
                requiredParams: [],
            },
            {
                value: "texas_franchise_margin_based",
                label: "Texas Franchise Tax (Margin-Based)",
                description:
                    "Texas franchise tax uses margin calculation, not traditional income tax depreciation.",
                details:
                    "Cost of Goods Sold (COGS) method - depreciation may be included in COGS rather than separate deduction.",
                examples: "Texas only",
                requiredParams: [],
            },
        ];

        res.json(ruleTypes);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    GetAllRules,
    GetRulesByOffice,
    UpdateOfficeRules,
    CloseYearRange,
    GetRuleTypes,
};
