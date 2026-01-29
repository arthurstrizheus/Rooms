/**
 * Federal Depreciation Service
 * Computes Federal depreciation including MACRS, Section 179, and Bonus depreciation
 */

const { computeMACRS } = require("./macrsCalculator");
const { getBonusPercentForYear } = require("../rules/bonusRatesLoader");

/**
 * Compute Section 179 expense for a tax year
 * @param {Object} asset - Asset with tax meta
 * @param {number} taxYear - Tax year
 * @returns {number} Section 179 expense amount
 */
function computeSection179(asset, taxYear) {
    if (!asset.placed_in_service_date || !asset.section179_elected) {
        return 0;
    }

    const placedYear = new Date(asset.placed_in_service_date).getFullYear();

    // Section 179 is claimed in the year placed in service only
    if (taxYear !== placedYear) {
        return 0;
    }

    return parseFloat(asset.section179_elected || 0);
}

/**
 * Compute Bonus depreciation (IRC 168(k))
 * @param {Object} asset - Asset with tax meta
 * @param {number} taxYear - Tax year
 * @returns {number} Bonus depreciation amount
 */
function computeBonus(asset, taxYear) {
    if (
        !asset.placed_in_service_date ||
        !asset.bonus_eligible ||
        !asset.cost_basis
    ) {
        return 0;
    }

    const placedYear = new Date(asset.placed_in_service_date).getFullYear();

    // Bonus depreciation is claimed in the year placed in service only
    if (taxYear !== placedYear) {
        return 0;
    }

    const costBasis = parseFloat(asset.cost_basis);
    const section179Amount = parseFloat(asset.section179_elected || 0);

    // Bonus is applied to remaining basis after Section 179
    const remainingBasis = costBasis - section179Amount;

    if (remainingBasis <= 0) {
        return 0;
    }

    // Get bonus percentage from rules file based on placed-in-service year
    const bonusPercent = getBonusPercentForYear(placedYear);

    return remainingBasis * bonusPercent;
}

/**
 * Compute total federal depreciation for a tax year
 * @param {Object} assetWithMeta - Combined asset and tax meta data
 * @param {number} taxYear - Tax year to compute
 * @returns {Object} Depreciation breakdown
 */
function computeFederalDepreciation(assetWithMeta, taxYear) {
    if (!assetWithMeta || !assetWithMeta.placed_in_service_date) {
        return {
            macrs: 0,
            bonus: 0,
            section179: 0,
            total: 0,
            detail: {
                message: "Asset not placed in service or missing data",
            },
        };
    }

    const section179 = computeSection179(assetWithMeta, taxYear);
    const bonus = computeBonus(assetWithMeta, taxYear);

    // MACRS is computed on remaining basis after Section 179 and Bonus
    const costBasis = parseFloat(assetWithMeta.cost_basis || 0);
    const remainingBasisForMACRS = costBasis - section179 - bonus;

    let macrs = 0;
    if (remainingBasisForMACRS > 0) {
        // Create modified asset for MACRS with remaining basis
        const macrsAsset = {
            ...assetWithMeta,
            cost_basis: remainingBasisForMACRS,
        };
        macrs = computeMACRS(macrsAsset, taxYear);
    }

    const total = section179 + bonus + macrs;

    return {
        macrs: parseFloat(macrs.toFixed(2)),
        bonus: parseFloat(bonus.toFixed(2)),
        section179: parseFloat(section179.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        detail: {
            costBasis: parseFloat(costBasis.toFixed(2)),
            propertyClass: assetWithMeta.property_class || "7yr",
            method: assetWithMeta.method || "MACRS",
            placedInServiceDate: assetWithMeta.placed_in_service_date,
            yearsSincePlacement:
                taxYear -
                new Date(assetWithMeta.placed_in_service_date).getFullYear(),
        },
    };
}

module.exports = {
    computeFederalDepreciation,
    computeSection179,
    computeBonus,
};
