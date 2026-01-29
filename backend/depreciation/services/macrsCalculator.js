/**
 * MACRS Depreciation Tables
 * Source: IRS Publication 946
 * These are simplified tables for common property classes
 */

// MACRS GDS (General Depreciation System) - Half-Year Convention
const MACRS_TABLES = {
    "3yr": [33.33, 44.45, 14.81, 7.41],
    "5yr": [20.0, 32.0, 19.2, 11.52, 11.52, 5.76],
    "7yr": [14.29, 24.49, 17.49, 12.49, 8.93, 8.92, 8.93, 4.46],
    "10yr": [10.0, 18.0, 14.4, 11.52, 9.22, 7.37, 6.55, 6.55, 6.56, 6.55, 3.28],
    "15yr": [
        5.0, 9.5, 8.55, 7.7, 6.93, 6.23, 5.9, 5.9, 5.91, 5.9, 5.91, 5.9, 5.91,
        5.9, 5.91, 2.95,
    ],
    "20yr": [
        3.75, 7.219, 6.677, 6.177, 5.713, 5.285, 4.888, 4.522, 4.462, 4.461,
        4.462, 4.461, 4.462, 4.461, 4.462, 4.461, 4.462, 4.461, 4.462, 4.461,
        2.231,
    ],
    "27.5yr": [], // Residential rental property - simplified
    "39yr": [], // Nonresidential real property - simplified
};

/**
 * Get MACRS depreciation percentage for a given year
 * @param {string} propertyClass - Property class (e.g., "5yr", "7yr")
 * @param {number} yearIndex - Year index (0-based)
 * @returns {number} Depreciation percentage (as decimal, e.g., 0.20 for 20%)
 */
function getMACRSPercent(propertyClass, yearIndex) {
    const table = MACRS_TABLES[propertyClass];
    if (!table || table.length === 0) {
        return 0; // Special handling needed for 27.5yr and 39yr
    }

    if (yearIndex < 0 || yearIndex >= table.length) {
        return 0; // Fully depreciated
    }

    return table[yearIndex] / 100; // Convert to decimal
}

/**
 * Compute MACRS depreciation for a given year
 * @param {Object} asset - Asset with tax meta
 * @param {number} taxYear - Tax year to compute
 * @returns {number} MACRS depreciation amount
 */
function computeMACRS(asset, taxYear) {
    if (!asset.placed_in_service_date || !asset.cost_basis) {
        return 0;
    }

    const placedYear = new Date(asset.placed_in_service_date).getFullYear();
    const yearIndex = taxYear - placedYear;

    if (yearIndex < 0) {
        return 0; // Not yet in service
    }

    const propertyClass = asset.property_class || "7yr"; // Default to 7-year
    const costBasis = parseFloat(asset.cost_basis);

    // For 27.5yr and 39yr, use straight-line
    if (propertyClass === "27.5yr") {
        const totalYears = 27.5;
        if (yearIndex >= totalYears) return 0;
        // Mid-month convention simplified: first and last years are partial
        if (yearIndex === 0) {
            return (costBasis / totalYears) * (11.5 / 12); // Assume mid-year
        }
        if (yearIndex === Math.floor(totalYears)) {
            return (costBasis / totalYears) * (0.5 / 12);
        }
        return costBasis / totalYears;
    }

    if (propertyClass === "39yr") {
        const totalYears = 39;
        if (yearIndex >= totalYears) return 0;
        if (yearIndex === 0) {
            return (costBasis / totalYears) * (11.5 / 12);
        }
        if (yearIndex === Math.floor(totalYears)) {
            return (costBasis / totalYears) * (0.5 / 12);
        }
        return costBasis / totalYears;
    }

    const percent = getMACRSPercent(propertyClass, yearIndex);
    return costBasis * percent;
}

module.exports = {
    computeMACRS,
    getMACRSPercent,
    MACRS_TABLES,
};
