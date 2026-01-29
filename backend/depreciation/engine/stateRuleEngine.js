/**
 * State Adjustment Rule Engine
 * Applies state-specific depreciation adjustments based on rule type
 */

/**
 * Apply state adjustment rules to federal depreciation
 * @param {Object} federalResult - Federal depreciation result
 * @param {Object} rule - State rule from rule pack
 * @param {Object} asset - Asset with tax meta
 * @param {number} taxYear - Tax year
 * @returns {Object} State adjustment result
 */
function applyStateAdjustment(federalResult, rule, asset, taxYear) {
    if (!rule) {
        return {
            stateDepreciation: federalResult.total,
            adjustments: [],
            warnings: ["No state rule found; using federal depreciation"],
        };
    }

    const handler = ruleHandlers[rule.ruleType];
    if (!handler) {
        return {
            stateDepreciation: federalResult.total,
            adjustments: [],
            warnings: [
                `Unknown rule type: ${rule.ruleType}; using federal depreciation`,
            ],
        };
    }

    return handler(federalResult, rule, asset, taxYear);
}

/**
 * Rule handlers by type
 */
const ruleHandlers = {
    /**
     * No adjustment - use federal depreciation as-is
     */
    use_federal_as_is: (federalResult) => {
        return {
            stateDepreciation: federalResult.total,
            adjustments: [],
            warnings: [],
        };
    },

    /**
     * Generally no add-back (Missouri-style)
     */
    generally_no_addback: (federalResult, rule) => {
        return {
            stateDepreciation: federalResult.total,
            adjustments: [],
            warnings: [],
            notes: rule.parameters.notes,
        };
    },

    /**
     * Add back bonus + Section 179 over threshold (Ohio-style)
     */
    addback_bonus_plus_179_over_threshold: (federalResult, rule) => {
        const threshold = rule.parameters.section179Threshold || 25000;
        const section179Excess = Math.max(
            0,
            federalResult.section179 - threshold,
        );
        const addback = federalResult.bonus + section179Excess;

        const adjustments = [];
        if (federalResult.bonus > 0) {
            adjustments.push({
                type: "addition",
                amount: federalResult.bonus,
                description: `Add back IRC Section 168(k) bonus depreciation`,
            });
        }
        if (section179Excess > 0) {
            adjustments.push({
                type: "addition",
                amount: section179Excess,
                description: `Add back IRC Section 179 expense over $${threshold.toLocaleString()} threshold`,
            });
        }

        return {
            stateDepreciation: federalResult.total + addback,
            adjustments,
            warnings: [],
        };
    },

    /**
     * Add back then subtract spread over years (Florida-style)
     */
    addback_then_subtract_spread: (federalResult, rule, asset, taxYear) => {
        const placedYear = new Date(asset.placed_in_service_date).getFullYear();
        const addback = federalResult.bonus;

        const adjustments = [];

        // In the year of placement, add back the bonus
        if (taxYear === placedYear && addback > 0) {
            adjustments.push({
                type: "addition",
                amount: addback,
                description: `Add back IRC Section 168(k) bonus depreciation`,
            });

            // Create carryforward schedule for future years
            const spreadYears = rule.parameters.spreadYears || 7;
            const annualSubtraction = addback / spreadYears;

            adjustments.push({
                type: "carryforward_created",
                amount: addback,
                description: `Create ${spreadYears}-year carryforward schedule for equal subtraction`,
                schedule: Array.from({ length: spreadYears }, (_, i) => ({
                    taxYear: placedYear + i + 1,
                    amount: parseFloat(annualSubtraction.toFixed(2)),
                    status: "pending",
                })),
            });

            return {
                stateDepreciation: federalResult.total + addback,
                adjustments,
                warnings: [],
            };
        }

        // In future years, apply the subtraction if there's a carryforward
        // This would require checking the carryforward table (handled in main service)
        return {
            stateDepreciation: federalResult.total,
            adjustments: [],
            warnings: [],
            needsCarryforwardCheck: true,
        };
    },

    /**
     * Add back percentage of bonus then spread (North Carolina-style)
     */
    addback_percent_of_federal_bonus_then_spread: (
        federalResult,
        rule,
        asset,
        taxYear,
    ) => {
        const placedYear = new Date(asset.placed_in_service_date).getFullYear();
        const bonusAddbackPercent = rule.parameters.bonusAddbackPercent / 100;
        const addback = federalResult.bonus * bonusAddbackPercent;

        const adjustments = [];

        // In the year of placement, add back the percentage
        if (taxYear === placedYear && addback > 0) {
            adjustments.push({
                type: "addition",
                amount: addback,
                description: `Add back ${rule.parameters.bonusAddbackPercent}% of IRC Section 168(k) bonus depreciation`,
            });

            // Create carryforward schedule
            const subSchedule = rule.parameters.subtractionSchedule;
            const yearsToSpread = subSchedule.years || 5;
            const percentPerYear = subSchedule.percentPerYear / 100;
            const annualSubtraction = addback * percentPerYear;

            adjustments.push({
                type: "carryforward_created",
                amount: addback,
                description: `Create ${yearsToSpread}-year carryforward: ${subSchedule.percentPerYear}% per year`,
                schedule: Array.from({ length: yearsToSpread }, (_, i) => ({
                    taxYear: placedYear + i + 1,
                    amount: parseFloat(annualSubtraction.toFixed(2)),
                    status: "pending",
                })),
            });

            return {
                stateDepreciation: federalResult.total + addback,
                adjustments,
                warnings: [],
            };
        }

        return {
            stateDepreciation: federalResult.total,
            adjustments: [],
            warnings: [],
            needsCarryforwardCheck: true,
        };
    },

    /**
     * Recompute depreciation as if no 168(k) (Michigan-style)
     */
    recompute_depreciation_as_if_no_168k: (federalResult, rule) => {
        // Remove bonus, keep MACRS and Section 179
        const adjustments = [];
        if (federalResult.bonus > 0) {
            adjustments.push({
                type: "subtraction",
                amount: federalResult.bonus,
                description: `Remove IRC Section 168(k) bonus depreciation (disallowed)`,
            });
        }

        return {
            stateDepreciation: federalResult.total - federalResult.bonus,
            adjustments,
            warnings: [],
            notes: rule.parameters.notes,
        };
    },

    /**
     * Proforma difference calculation (Maryland-style)
     */
    proforma_difference_federal_asfiled_vs_without_decoupled: (
        federalResult,
        rule,
    ) => {
        // This is a placeholder - would need full asset schedule computation
        return {
            stateDepreciation: federalResult.total,
            adjustments: [],
            warnings: [
                "Maryland Form 500DM computation requires full asset schedule analysis",
                "Manual computation recommended for accuracy",
            ],
            notes: rule.parameters.notes,
        };
    },

    /**
     * IL-4562 reverse federal bonus (Illinois-style)
     */
    il_4562_reverse_federal_bonus: (federalResult, rule) => {
        return {
            stateDepreciation: federalResult.total,
            adjustments: [],
            warnings: [
                "Illinois IL-4562 worksheet module not implemented",
                "Manual computation required using IL-4562 form",
            ],
            notes: rule.parameters.notes,
        };
    },

    /**
     * Add back federal depreciation, compute GA separately (Georgia-style)
     */
    addback_federal_depreciation_compute_ga_separately: (
        federalResult,
        rule,
    ) => {
        return {
            stateDepreciation: federalResult.total,
            adjustments: [],
            warnings: [
                "Georgia depreciation schedule module not implemented",
                "Manual computation required per GA rules",
            ],
            notes: rule.parameters.notes,
        };
    },

    /**
     * Texas franchise margin-based
     */
    texas_franchise_margin_based: (federalResult, rule) => {
        return {
            stateDepreciation: federalResult.total,
            adjustments: [],
            warnings: [
                "Texas franchise tax margin calculation is complex",
                "Depreciation treatment depends on margin method selected",
                "Refer to TX Comptroller guidance for report year",
            ],
            notes: rule.parameters.notes,
        };
    },

    /**
     * Requires manual confirmation
     */
    requires_manual_confirmation: (federalResult, rule) => {
        return {
            stateDepreciation: federalResult.total,
            adjustments: [],
            warnings: [
                "State depreciation rule not definitively codified",
                "Manual confirmation required before filing",
                "See official state guidance for the tax year",
            ],
            notes: rule.parameters.notes,
        };
    },
};

module.exports = {
    applyStateAdjustment,
};
