const {
    generateOfficeReport,
    generateFederalReport,
} = require("../depreciation/services/depreciationReportService");
const { getRuleForState } = require("../depreciation/rules/ruleLoader");
const {
    normalizeStateToCode,
} = require("../depreciation/utils/stateNormalizer");

/**
 * Get depreciation report for an office
 * GET /api/offices/:officeid/depreciation/report?taxYear=2025&taxType=STATE_BUSINESS_INCOME_OR_FRANCHISE
 */
const GetOfficeReport = async (req, res, next) => {
    try {
        const { officeid } = req.params;
        const { taxYear, taxType } = req.query;

        if (!taxYear) {
            return res.status(400).json({ message: "taxYear is required" });
        }

        const year = parseInt(taxYear);
        if (isNaN(year) || year < 1900 || year > 2100) {
            return res.status(400).json({ message: "Invalid tax year" });
        }

        const type = taxType || "STATE_BUSINESS_INCOME_OR_FRANCHISE";

        const report = await generateOfficeReport(
            parseInt(officeid),
            year,
            type,
        );

        res.json(report);
    } catch (err) {
        next(err);
    }
};

/**
 * Get depreciation report by state
 * GET /api/states/:stateCode/depreciation/report?taxYear=2025&taxType=STATE_BUSINESS_INCOME_OR_FRANCHISE
 */
const GetStateReport = async (req, res, next) => {
    try {
        const { stateCode } = req.params;
        const { taxYear, taxType } = req.query;

        if (!taxYear) {
            return res.status(400).json({ message: "taxYear is required" });
        }

        const year = parseInt(taxYear);
        const type = taxType || "STATE_BUSINESS_INCOME_OR_FRANCHISE";

        const normalizedState = normalizeStateToCode(stateCode);
        if (!normalizedState) {
            return res.status(400).json({ message: "Invalid state code" });
        }

        const rule = getRuleForState(normalizedState, type, year);

        res.json({
            stateCode: normalizedState,
            taxYear: year,
            taxType: type,
            rule: rule || null,
            message: rule
                ? "Rule found"
                : "No rule found for this state/year combination",
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Get federal depreciation report
 * GET /api/depreciation/federal/report?taxYear=2025
 */
const GetFederalReport = async (req, res, next) => {
    try {
        const { taxYear } = req.query;

        if (!taxYear) {
            return res.status(400).json({ message: "taxYear is required" });
        }

        const year = parseInt(taxYear);
        if (isNaN(year) || year < 1900 || year > 2100) {
            return res.status(400).json({ message: "Invalid tax year" });
        }

        const report = await generateFederalReport(year);

        res.json(report);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    GetOfficeReport,
    GetStateReport,
    GetFederalReport,
};
