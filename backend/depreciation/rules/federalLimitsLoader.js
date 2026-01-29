/**
 * Federal Vehicle Limits Loader
 * Loads IRS-published Section 179 vehicle limits from local JSON file
 * NO runtime web calls - all data is versioned in repository
 */

const fs = require("fs");
const path = require("path");

let federalLimitsCache = null;

/**
 * Load federal vehicle limits from JSON file
 * @returns {Object} Federal vehicle limits data
 */
function loadFederalVehicleLimits() {
    if (federalLimitsCache) {
        return federalLimitsCache;
    }

    try {
        const limitsPath = path.join(__dirname, "federal-vehicle-limits.json");
        const rawData = fs.readFileSync(limitsPath, "utf8");
        const data = JSON.parse(rawData);

        // Basic schema validation
        if (!data.meta || !data.meta.version) {
            throw new Error("federal-vehicle-limits.json missing meta.version");
        }

        if (!data.byTaxYear || typeof data.byTaxYear !== "object") {
            throw new Error(
                "federal-vehicle-limits.json missing or invalid byTaxYear",
            );
        }

        // Validate each year entry has required fields
        for (const [year, limits] of Object.entries(data.byTaxYear)) {
            if (typeof limits.suv179Cap !== "number") {
                throw new Error(
                    `federal-vehicle-limits.json: ${year} missing or invalid suv179Cap`,
                );
            }
        }

        federalLimitsCache = data;
        console.log(
            `✓ Loaded federal vehicle limits version ${data.meta.version}`,
        );
        console.log(
            `  ${Object.keys(data.byTaxYear).length} tax years defined`,
        );

        return federalLimitsCache;
    } catch (error) {
        console.error(
            "❌ Error loading federal vehicle limits:",
            error.message,
        );
        throw error;
    }
}

/**
 * Get SUV Section 179 cap for a specific tax year
 * @param {number} taxYear - Tax year (e.g., 2024)
 * @returns {number|null} Cap amount or null if not defined
 */
function getSuv179CapForYear(taxYear) {
    const limits = loadFederalVehicleLimits();
    const yearData = limits.byTaxYear[taxYear.toString()];
    return yearData ? yearData.suv179Cap : null;
}

/**
 * Get all available tax years with defined limits
 * @returns {number[]} Array of tax years
 */
function getAvailableTaxYears() {
    const limits = loadFederalVehicleLimits();
    return Object.keys(limits.byTaxYear)
        .map((y) => parseInt(y))
        .sort((a, b) => a - b);
}

/**
 * Get metadata about the limits file
 * @returns {Object} Metadata with version, sources, etc.
 */
function getFederalLimitsMeta() {
    const limits = loadFederalVehicleLimits();
    return limits.meta;
}

/**
 * Clear the cache (useful for testing)
 */
function clearCache() {
    federalLimitsCache = null;
}

module.exports = {
    loadFederalVehicleLimits,
    getSuv179CapForYear,
    getAvailableTaxYears,
    getFederalLimitsMeta,
    clearCache,
};
