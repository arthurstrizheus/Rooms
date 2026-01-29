const fs = require("fs");
const path = require("path");

let bonusRatesCache = null;

/**
 * Load and cache the bonus depreciation rates from JSON file
 * @returns {Object} Bonus rates data structure with meta and bonusByYear
 */
function loadBonusRates() {
    if (bonusRatesCache) {
        return bonusRatesCache;
    }

    const filePath = path.join(__dirname, "bonus-depreciation-rates.json");

    if (!fs.existsSync(filePath)) {
        console.error("bonus-depreciation-rates.json not found");
        return null;
    }

    try {
        const rawData = fs.readFileSync(filePath, "utf-8");
        bonusRatesCache = JSON.parse(rawData);
        console.log("✓ Loaded bonus depreciation rates");
        return bonusRatesCache;
    } catch (err) {
        console.error("Error loading bonus depreciation rates:", err.message);
        return null;
    }
}

/**
 * Get bonus depreciation percentage for a given tax year
 * @param {number} taxYear - The tax year (e.g., 2024, 2025)
 * @returns {number} Bonus percentage as decimal (e.g., 0.60 for 60%, 0.40 for 40%)
 */
function getBonusPercentForYear(taxYear) {
    const data = loadBonusRates();

    if (!data || !data.bonusByYear) {
        return 0;
    }

    const yearStr = taxYear.toString();
    const yearData = data.bonusByYear[yearStr];

    if (!yearData) {
        // If year not found, return 0 (no bonus)
        console.warn(
            `No bonus rate found for year ${taxYear}, defaulting to 0%`,
        );
        return 0;
    }

    return yearData.bonusPercent;
}

/**
 * Get the year range covered by bonus rates data
 * @returns {Object} { minYear, maxYear, years }
 */
function getBonusYearRange() {
    const data = loadBonusRates();

    if (!data || !data.bonusByYear) {
        return { minYear: null, maxYear: null, years: [] };
    }

    const years = Object.keys(data.bonusByYear)
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
    bonusRatesCache = null;
    console.log("✓ Bonus rates cache cleared");
}

module.exports = {
    loadBonusRates,
    getBonusPercentForYear,
    getBonusYearRange,
    clearCache,
};
