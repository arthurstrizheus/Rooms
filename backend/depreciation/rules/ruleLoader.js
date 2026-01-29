const fs = require("fs");
const path = require("path");

/**
 * Rule loader for state depreciation rules
 * Loads and validates state-depreciation-rules.json rule pack
 */

let rulesCache = null;

/**
 * Load the state depreciation rules from state-depreciation-rules.json
 * @returns {Object} The rule pack with metadata and office rules
 */
function loadRules() {
    if (rulesCache) {
        return rulesCache;
    }

    try {
        const rulePath = path.join(__dirname, "state-depreciation-rules.json");
        const rawData = fs.readFileSync(rulePath, "utf8");
        const rulePack = JSON.parse(rawData);

        // Basic validation
        if (!rulePack.rulePackMeta || !rulePack.offices) {
            throw new Error(
                "Invalid rule pack structure: missing rulePackMeta or offices",
            );
        }

        console.log(
            `Loaded depreciation rule pack: ${rulePack.rulePackMeta.name} version ${rulePack.rulePackMeta.version}`,
        );
        console.log(`  ${rulePack.offices.length} office rules loaded`);

        rulesCache = rulePack;
        return rulePack;
    } catch (error) {
        console.error("Error loading depreciation rules:", error.message);
        throw new Error(`Failed to load depreciation rules: ${error.message}`);
    }
}

/**
 * Get rule for a specific office and tax year
 * @param {number} officeid - Office ID
 * @param {string} taxType - Tax type (e.g., STATE_BUSINESS_INCOME_OR_FRANCHISE)
 * @param {number} taxYear - Tax year
 * @returns {Object|null} Rule parameters or null if not found
 */
function getRuleForOffice(officeid, taxType, taxYear) {
    const rules = loadRules();

    const office = rules.offices.find((o) => o.officeid === officeid);
    if (!office) {
        return null;
    }

    const taxRules = office.tax?.[taxType];
    if (!taxRules) {
        return null;
    }

    // Find the applicable year range
    const yearRules = taxRules.parametersByYear || [];
    const applicableRule = yearRules.find((rule) => {
        const fromYear = rule.effectiveFromTaxYear;
        const toYear = rule.effectiveToTaxYear;
        return taxYear >= fromYear && (toYear === null || taxYear <= toYear);
    });

    if (!applicableRule) {
        return null;
    }

    return {
        ruleType: taxRules.ruleType,
        parameters: applicableRule.parameters,
        sources: applicableRule.sources || [],
        office: {
            officeid: office.officeid,
            alias: office.alias,
            state: office.state,
            city: office.city,
        },
    };
}

/**
 * Get rule for a specific state code and tax year
 * @param {string} stateCode - Two-letter state code
 * @param {string} taxType - Tax type
 * @param {number} taxYear - Tax year
 * @returns {Object|null} Rule parameters or null if not found
 */
function getRuleForState(stateCode, taxType, taxYear) {
    const rules = loadRules();

    const office = rules.offices.find(
        (o) => o.state === stateCode.toUpperCase(),
    );
    if (!office) {
        return null;
    }

    return getRuleForOffice(office.officeid, taxType, taxYear);
}

/**
 * Get all offices from the rule pack
 * @returns {Array} Array of office objects
 */
function getAllOfficesFromRules() {
    const rules = loadRules();
    return rules.offices.map((o) => ({
        officeid: o.officeid,
        alias: o.alias,
        state: o.state,
        city: o.city,
    }));
}

module.exports = {
    loadRules,
    getRuleForOffice,
    getRuleForState,
    getAllOfficesFromRules,
};
