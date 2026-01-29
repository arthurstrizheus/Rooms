const fs = require("fs");
const path = require("path");

let section179LimitsCache = null;

/**
 * Load and cache the Section 179 limits from JSON file
 * @returns {Object} Section 179 limits data with limitsByYear
 */
function loadSection179Limits() {
    if (section179LimitsCache) {
        return section179LimitsCache;
    }

    const filePath = path.join(__dirname, "section179-limits.json");

    if (!fs.existsSync(filePath)) {
        console.error("section179-limits.json not found");
        return null;
    }

    try {
        const rawData = fs.readFileSync(filePath, "utf-8");
        section179LimitsCache = JSON.parse(rawData);
        console.log("✓ Loaded Section 179 limits");
        return section179LimitsCache;
    } catch (err) {
        console.error("Error loading Section 179 limits:", err.message);
        return null;
    }
}

/**
 * Get Section 179 limits for a given tax year
 * @param {number} taxYear - The tax year (e.g., 2024, 2025)
 * @returns {Object} { maxDeduction, phaseoutThreshold } or null if not found
 */
function getSection179LimitsForYear(taxYear) {
    const data = loadSection179Limits();

    if (!data || !data.limitsByYear) {
        return null;
    }

    const yearStr = taxYear.toString();
    const limits = data.limitsByYear[yearStr];

    if (!limits) {
        console.warn(`No Section 179 limits found for year ${taxYear}`);
        return null;
    }

    return {
        maxDeduction: limits.maxDeduction,
        phaseoutThreshold: limits.phaseoutThreshold,
    };
}

/**
 * Validate if a Section 179 amount exceeds the overall limit
 * @param {number} section179Amount - The Section 179 amount to validate
 * @param {number} taxYear - The tax year
 * @returns {Object} { valid, maxDeduction, exceedsBy }
 */
function validateSection179Amount(section179Amount, taxYear) {
    const limits = getSection179LimitsForYear(taxYear);

    if (!limits) {
        // If no limits found, can't validate - assume valid
        return { valid: true, maxDeduction: null, exceedsBy: 0 };
    }

    const exceedsBy = section179Amount - limits.maxDeduction;

    return {
        valid: section179Amount <= limits.maxDeduction,
        maxDeduction: limits.maxDeduction,
        exceedsBy: exceedsBy > 0 ? exceedsBy : 0,
    };
}

/**
 * Get the year range covered by Section 179 limits data
 * @returns {Object} { minYear, maxYear, years }
 */
function getSection179YearRange() {
    const data = loadSection179Limits();

    if (!data || !data.limitsByYear) {
        return { minYear: null, maxYear: null, years: [] };
    }

    const years = Object.keys(data.limitsByYear)
        .map(Number)
        .sort((a, b) => a - b);

    return {
        minYear: years[0],
        maxYear: years[years.length - 1],
        years,
    };
}

/**
 * Clear the cache (useful when JSON file is updated)
 */
function clearCache() {
    section179LimitsCache = null;
    console.log("✓ Section 179 limits cache cleared");
}

module.exports = {
    loadSection179Limits,
    getSection179LimitsForYear,
    validateSection179Amount,
    getSection179YearRange,
    clearCache,
};
