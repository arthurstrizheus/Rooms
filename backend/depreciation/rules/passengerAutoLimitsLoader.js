const fs = require("fs");
const path = require("path");

let passengerAutoLimitsCache = null;

/**
 * Load and cache the passenger auto 280F limits from JSON file
 * @returns {Object} Passenger auto limits data with passengerAutoLimits
 */
function loadPassengerAutoLimits() {
    if (passengerAutoLimitsCache) {
        return passengerAutoLimitsCache;
    }

    const filePath = path.join(__dirname, "passenger-auto-limits.json");

    if (!fs.existsSync(filePath)) {
        console.error("passenger-auto-limits.json not found");
        return null;
    }

    try {
        const rawData = fs.readFileSync(filePath, "utf-8");
        passengerAutoLimitsCache = JSON.parse(rawData);
        console.log("✓ Loaded passenger auto 280F limits");
        return passengerAutoLimitsCache;
    } catch (err) {
        console.error("Error loading passenger auto limits:", err.message);
        return null;
    }
}

/**
 * Get passenger auto depreciation cap for a given tax year and depreciation year
 * @param {number} taxYear - The placed-in-service year (e.g., 2024, 2025)
 * @param {number} depreciationYear - Which year of depreciation (1, 2, 3, or 4+)
 * @param {boolean} bonusEligible - Whether bonus depreciation applies
 * @returns {number|null} The depreciation cap amount, or null if not found
 */
function getPassengerAutoCapForYear(
    taxYear,
    depreciationYear,
    bonusEligible = true,
) {
    const data = loadPassengerAutoLimits();

    if (!data || !data.passengerAutoLimits) {
        return null;
    }

    const yearStr = taxYear.toString();
    const limits = data.passengerAutoLimits[yearStr];

    if (!limits) {
        console.warn(`No passenger auto limits found for year ${taxYear}`);
        return null;
    }

    // Select the appropriate cap based on depreciation year
    if (depreciationYear === 1) {
        return bonusEligible ? limits.year1_withBonus : limits.year1_noBonus;
    } else if (depreciationYear === 2) {
        return limits.year2;
    } else if (depreciationYear === 3) {
        return limits.year3;
    } else {
        // Year 4 and beyond
        return limits.year4Plus;
    }
}

/**
 * Get all caps for a specific placed-in-service year
 * @param {number} taxYear - The placed-in-service year
 * @returns {Object|null} All caps for that year
 */
function getAllCapsForYear(taxYear) {
    const data = loadPassengerAutoLimits();

    if (!data || !data.passengerAutoLimits) {
        return null;
    }

    const yearStr = taxYear.toString();
    return data.passengerAutoLimits[yearStr] || null;
}

/**
 * Get the year range covered by passenger auto limits data
 * @returns {Object} { minYear, maxYear, years }
 */
function getPassengerAutoYearRange() {
    const data = loadPassengerAutoLimits();

    if (!data || !data.passengerAutoLimits) {
        return { minYear: null, maxYear: null, years: [] };
    }

    const years = Object.keys(data.passengerAutoLimits)
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
    passengerAutoLimitsCache = null;
    console.log("✓ Passenger auto limits cache cleared");
}

module.exports = {
    loadPassengerAutoLimits,
    getPassengerAutoCapForYear,
    getAllCapsForYear,
    getPassengerAutoYearRange,
    clearCache,
};
