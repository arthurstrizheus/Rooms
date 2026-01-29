/**
 * Passenger Auto Validator (IRC Section 280F)
 * Validates depreciation for passenger automobiles against annual depreciation limits
 * Handles luxury auto caps that vary by year and depreciation year
 */

const {
    getPassengerAutoCapForYear,
} = require("../rules/passengerAutoLimitsLoader");

/**
 * Validate passenger auto depreciation
 * @param {Object} asset - Asset object with id, name, etc.
 * @param {Object} taxMeta - Tax metadata object
 * @param {string} taxMeta.placed_in_service_date - ISO date string
 * @param {number} taxMeta.cost_basis - Asset cost basis
 * @param {number} taxMeta.section179_elected - Section 179 amount elected
 * @param {boolean} taxMeta.bonus_eligible - Whether bonus depreciation applies
 * @param {number} depreciationYear - Which year of depreciation (1, 2, 3, 4+)
 * @returns {Object} { errors: [], warnings: [], maxAllowed: number|null }
 */
function validatePassengerAuto(asset, taxMeta, depreciationYear = 1) {
    const result = {
        errors: [],
        warnings: [],
        maxAllowed: null,
    };

    // Only applies to PASSENGER_AUTO classification
    if (taxMeta.vehicle_class !== "PASSENGER_AUTO") {
        return result;
    }

    const costBasis = parseFloat(taxMeta.cost_basis || 0);
    const section179Amount = parseFloat(taxMeta.section179_elected || 0);
    const bonusEligible = taxMeta.bonus_eligible || false;

    // Derive tax year from placed in service date
    let taxYear = null;
    if (taxMeta.placed_in_service_date) {
        const placedDate = new Date(taxMeta.placed_in_service_date);
        taxYear = placedDate.getFullYear();
    }

    if (!taxYear) {
        result.warnings.push(
            "Cannot determine tax year from placed in service date. Unable to verify passenger auto 280F limits.",
        );
        return result;
    }

    // Get the 280F cap for this year
    const cap = getPassengerAutoCapForYear(
        taxYear,
        depreciationYear,
        bonusEligible,
    );

    if (cap === null) {
        result.warnings.push(
            `IRS passenger auto depreciation limits for tax year ${taxYear} are not defined in system. ` +
                `Cannot automatically validate against IRC Section 280F caps. See IRS Pub 946 Table A-19.`,
        );
        return result;
    }

    result.maxAllowed = cap;

    // Calculate total first-year depreciation (Section 179 + bonus + MACRS)
    // For year 1, the total depreciation cannot exceed the cap
    if (depreciationYear === 1) {
        // Just check Section 179 against the cap for now
        // Full depreciation calculation would need to compute bonus + MACRS
        if (section179Amount > cap) {
            result.errors.push(
                `Section 179 deduction ($${section179Amount.toLocaleString()}) exceeds IRS passenger auto first-year cap of $${cap.toLocaleString()} for ${taxYear}. ` +
                    `Passenger autos are subject to IRC Section 280F luxury auto limits. See IRS Pub 946.`,
            );
        } else if (section179Amount > 0) {
            result.warnings.push(
                `Passenger auto first-year depreciation cap is $${cap.toLocaleString()} for ${taxYear}. ` +
                    `Section 179 of $${section179Amount.toLocaleString()} is within cap, but total depreciation (179 + bonus + MACRS) must not exceed this limit.`,
            );
        }
    } else {
        // For subsequent years, the cap applies to that year's depreciation
        result.warnings.push(
            `Passenger auto year ${depreciationYear} depreciation cap is $${cap.toLocaleString()} for ${taxYear} placed-in-service date. ` +
                `Verify annual depreciation does not exceed this limit.`,
        );
    }

    return result;
}

/**
 * Get explanation of passenger auto limits for a given tax year
 * @param {number} taxYear - The tax year
 * @param {boolean} bonusEligible - Whether bonus depreciation applies
 * @returns {string} Explanation text
 */
function getPassengerAutoLimitsExplanation(taxYear, bonusEligible = true) {
    const { getAllCapsForYear } = require("../rules/passengerAutoLimitsLoader");

    const caps = getAllCapsForYear(taxYear);

    if (!caps) {
        return `Passenger auto depreciation limits for ${taxYear} are not available in the system.`;
    }

    const year1Cap = bonusEligible ? caps.year1_withBonus : caps.year1_noBonus;

    return (
        `IRC Section 280F passenger auto depreciation limits for ${taxYear}:\n` +
        `  Year 1: $${year1Cap.toLocaleString()} (${bonusEligible ? "with" : "without"} bonus)\n` +
        `  Year 2: $${caps.year2.toLocaleString()}\n` +
        `  Year 3: $${caps.year3.toLocaleString()}\n` +
        `  Year 4+: $${caps.year4Plus.toLocaleString()}\n` +
        `These are total annual depreciation caps including Section 179, bonus, and MACRS.`
    );
}

module.exports = {
    validatePassengerAuto,
    getPassengerAutoLimitsExplanation,
};
