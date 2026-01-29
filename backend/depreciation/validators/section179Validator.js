/**
 * Section 179 Validator
 * Validates Section 179 deductions against IRS vehicle limits and overall annual limits
 * Handles different vehicle classifications with appropriate caps
 */

const { getSuv179CapForYear } = require("../rules/federalLimitsLoader");
const {
    getSection179LimitsForYear,
    validateSection179Amount,
} = require("../rules/section179LimitsLoader");

/**
 * Vehicle classification constants
 */
const VEHICLE_CLASS = {
    UNKNOWN: "UNKNOWN",
    PASSENGER_AUTO: "PASSENGER_AUTO",
    SUV_LIMITED_179: "SUV_LIMITED_179",
    HEAVY_TRUCK_NOT_LIMITED_179: "HEAVY_TRUCK_NOT_LIMITED_179",
};

/**
 * Validate Section 179 deduction for an asset
 * @param {Object} asset - Asset object with id, name, etc.
 * @param {Object} taxMeta - Tax metadata object
 * @param {string} taxMeta.placed_in_service_date - ISO date string
 * @param {number} taxMeta.cost_basis - Asset cost basis
 * @param {number} taxMeta.section179_elected - Section 179 amount elected
 * @param {string} taxMeta.vehicle_class - Vehicle classification
 * @returns {Object} { errors: [], warnings: [], requiresManualConfirmation: boolean, maxAllowed: number|null }
 */
function validateSection179(asset, taxMeta) {
    const result = {
        errors: [],
        warnings: [],
        requiresManualConfirmation: false,
        maxAllowed: null,
    };

    // If no Section 179 elected, nothing to validate
    if (
        !taxMeta.section179_elected ||
        parseFloat(taxMeta.section179_elected) === 0
    ) {
        return result;
    }

    const section179Amount = parseFloat(taxMeta.section179_elected);
    const costBasis = parseFloat(taxMeta.cost_basis || 0);
    const vehicleClass = taxMeta.vehicle_class || VEHICLE_CLASS.UNKNOWN;

    // Derive tax year from placed in service date
    let taxYear = null;
    if (taxMeta.placed_in_service_date) {
        const placedDate = new Date(taxMeta.placed_in_service_date);
        taxYear = placedDate.getFullYear();
    }

    // Section 179 can never exceed cost basis
    if (section179Amount > costBasis) {
        result.errors.push(
            `Section 179 deduction ($${section179Amount.toLocaleString()}) cannot exceed cost basis ($${costBasis.toLocaleString()})`,
        );
    }

    // Validate against overall Section 179 limit for the tax year
    if (taxYear) {
        const overallValidation = validateSection179Amount(
            section179Amount,
            taxYear,
        );
        if (!overallValidation.valid) {
            result.errors.push(
                `Section 179 deduction ($${section179Amount.toLocaleString()}) exceeds IRS overall limit of $${overallValidation.maxDeduction.toLocaleString()} for tax year ${taxYear}. ` +
                    `Amount exceeds limit by $${overallValidation.exceedsBy.toLocaleString()}.`,
            );
        }
    }

    // Handle validation by vehicle class
    switch (vehicleClass) {
        case VEHICLE_CLASS.SUV_LIMITED_179:
            validateSuvLimited179(taxYear, section179Amount, result);
            break;

        case VEHICLE_CLASS.PASSENGER_AUTO:
            validatePassengerAuto(section179Amount, result);
            break;

        case VEHICLE_CLASS.HEAVY_TRUCK_NOT_LIMITED_179:
            validateHeavyTruck(section179Amount, costBasis, result);
            break;

        case VEHICLE_CLASS.UNKNOWN:
        default:
            // Unknown vehicle class with Section 179 elected
            if (section179Amount > 0) {
                result.warnings.push(
                    "Vehicle classification is UNKNOWN. Cannot verify Section 179 limits apply. Please classify as PASSENGER_AUTO, SUV_LIMITED_179, or HEAVY_TRUCK_NOT_LIMITED_179.",
                );
                result.requiresManualConfirmation = true;
            }
            break;
    }

    return result;
}

/**
 * Validate SUV with Section 179 limit
 */
function validateSuvLimited179(taxYear, section179Amount, result) {
    if (!taxYear) {
        result.warnings.push(
            "Cannot determine tax year from placed in service date. Unable to verify SUV Section 179 cap.",
        );
        result.requiresManualConfirmation = true;
        return;
    }

    // Look up cap for this year
    const cap = getSuv179CapForYear(taxYear);

    if (cap === null) {
        // Year not defined in limits file
        result.warnings.push(
            `IRS Section 179 SUV cap for tax year ${taxYear} is not defined in system. Deduction of $${section179Amount.toLocaleString()} cannot be automatically validated. Requires manual confirmation against current IRS guidance.`,
        );
        result.requiresManualConfirmation = true;
        return;
    }

    // Cap is defined - enforce it
    result.maxAllowed = cap;

    if (section179Amount > cap) {
        result.errors.push(
            `Section 179 deduction ($${section179Amount.toLocaleString()}) exceeds IRS cap of $${cap.toLocaleString()} for SUVs placed in service in ${taxYear}. See IRS Pub 946 for details.`,
        );
    }
}

/**
 * Validate passenger automobile
 */
function validatePassengerAuto(section179Amount, result) {
    if (section179Amount > 0) {
        result.warnings.push(
            `Passenger automobiles have complex luxury depreciation limits that are not fully implemented in this system. Section 179 deduction of $${section179Amount.toLocaleString()} requires manual confirmation against IRS first-year depreciation caps for passenger autos. See IRS Pub 946 Table A-19.`,
        );
        result.requiresManualConfirmation = true;
    }
}

/**
 * Validate heavy truck (not limited by Section 179 vehicle cap)
 */
function validateHeavyTruck(section179Amount, costBasis, result) {
    // Heavy trucks (>14,000 lbs GVWR) are not subject to SUV caps
    // But Section 179 still cannot exceed cost basis (already checked above)
    // And overall Section 179 limits apply ($1.22M in 2024) - checked above

    result.maxAllowed = costBasis; // Effectively, can elect up to full cost basis (or overall limit, whichever is lower)
}

/**
 * Get user-friendly description of vehicle class
 */
function getVehicleClassDescription(vehicleClass) {
    const descriptions = {
        [VEHICLE_CLASS.UNKNOWN]:
            "Unknown - Classification needed for validation",
        [VEHICLE_CLASS.PASSENGER_AUTO]:
            "Passenger Automobile (subject to luxury depreciation limits)",
        [VEHICLE_CLASS.SUV_LIMITED_179]:
            "SUV/Truck 6,000-14,000 lbs GVWR (Section 179 cap applies)",
        [VEHICLE_CLASS.HEAVY_TRUCK_NOT_LIMITED_179]:
            "Heavy Vehicle >14,000 lbs GVWR (not subject to vehicle caps)",
    };
    return descriptions[vehicleClass] || descriptions[VEHICLE_CLASS.UNKNOWN];
}

module.exports = {
    validateSection179,
    getVehicleClassDescription,
    VEHICLE_CLASS,
};
