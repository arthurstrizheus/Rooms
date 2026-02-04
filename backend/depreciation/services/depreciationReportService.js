/**
 * Depreciation Report Service
 * Orchestrates federal and state depreciation calculations
 */

const {
    Equipment,
    AssetTaxMeta,
    DepreciationEntry,
    DepreciationCarryforward,
    Office,
} = require("../../models");
const { computeFederalDepreciation } = require("./federalDepreciationService");
const { applyStateAdjustment } = require("../engine/stateRuleEngine");
const { getRuleForOffice } = require("../rules/ruleLoader");
const { normalizeStateToCode } = require("../utils/stateNormalizer");

/**
 * Generate depreciation report for an office
 * @param {number} officeid - Office ID
 * @param {number} taxYear - Tax year to report
 * @param {string} taxType - Tax type (default: STATE_BUSINESS_INCOME_OR_FRANCHISE)
 * @returns {Object} Depreciation report
 */
async function generateOfficeReport(
    officeid,
    taxYear,
    taxType = "STATE_BUSINESS_INCOME_OR_FRANCHISE",
) {
    // Get office info (read-only)
    const office = await Office.findByPk(officeid);
    if (!office) {
        throw new Error(`Office ${officeid} not found`);
    }

    const stateCode = normalizeStateToCode(office.state);

    // Get rule for this office
    const rule = getRuleForOffice(officeid, taxType, taxYear);

    // Get all equipment for this office
    const equipment = await Equipment.findAll({
        where: { location: office.Alias },
        include: [
            {
                model: AssetTaxMeta,
                required: false, // Left join - include equipment without tax meta
                as: "AssetTaxMeta", // Explicitly specify the alias
            },
        ],
    });

    console.log(
        `[Depreciation Report] Office: ${office.Alias}, Found ${equipment.length} equipment items`,
    );

    const assetReports = [];
    let federalTotal = 0;
    let stateTotal = 0;
    const allSources = new Set();
    const allWarnings = [];

    for (const asset of equipment) {
        const taxMeta = asset.AssetTaxMeta;

        console.log(
            `[Depreciation Report] Asset: ${asset.name}, Has TaxMeta: ${!!taxMeta}, Cost Basis: ${taxMeta?.cost_basis}`,
        );

        // Skip if no tax meta or no cost
        if (!taxMeta || !taxMeta.cost_basis) {
            continue;
        }

        // Skip if equipment was placed in service AFTER the selected tax year
        if (taxMeta.placed_in_service_date) {
            const placedInServiceYear = new Date(
                taxMeta.placed_in_service_date,
            ).getFullYear();
            if (placedInServiceYear > taxYear) {
                console.log(
                    `[Depreciation Report] Skipping ${asset.name} - placed in service in ${placedInServiceYear}, after tax year ${taxYear}`,
                );
                continue;
            }
        }

        // Combine asset and tax meta
        const assetWithMeta = {
            id: asset.id,
            name: asset.name,
            serial_number: asset.serial_number,
            asset_number: asset.asset_number,
            cost: parseFloat(asset.cost || 0),
            ...taxMeta.toJSON(),
        };

        // Compute federal depreciation
        const federalResult = computeFederalDepreciation(
            assetWithMeta,
            taxYear,
        );

        // Apply state adjustment
        const stateResult = applyStateAdjustment(
            federalResult,
            rule,
            assetWithMeta,
            taxYear,
        );

        // Skip if both federal and state depreciation are 0 (cannot be written off)
        if (federalResult.total === 0 && stateResult.stateDepreciation === 0) {
            console.log(
                `[Depreciation Report] Skipping ${asset.name} - both federal and state depreciation are $0`,
            );
            continue;
        }

        // Check for carryforwards if needed
        if (stateResult.needsCarryforwardCheck) {
            const carryforwards = await DepreciationCarryforward.findAll({
                where: {
                    asset_id: asset.id,
                    jurisdiction: stateCode,
                    tax_type: taxType,
                },
            });

            for (const cf of carryforwards) {
                const schedule = cf.schedule_json || [];
                const applicableYear = schedule.find(
                    (s) => s.taxYear === taxYear && s.status === "pending",
                );

                if (applicableYear) {
                    stateResult.adjustments.push({
                        type: "subtraction",
                        amount: applicableYear.amount,
                        description: `Carryforward subtraction from ${cf.originating_tax_year}`,
                    });
                    stateResult.stateDepreciation -= applicableYear.amount;

                    // Mark as applied
                    applicableYear.status = "applied";
                    await cf.update({ schedule_json: schedule });
                }
            }
        }

        // Handle carryforward creation
        for (const adj of stateResult.adjustments) {
            if (adj.type === "carryforward_created" && adj.schedule) {
                await DepreciationCarryforward.create({
                    asset_id: asset.id,
                    jurisdiction: stateCode,
                    tax_type: taxType,
                    originating_tax_year: taxYear,
                    schedule_json: adj.schedule,
                });
            }
        }

        // Store depreciation entry for audit trail
        await DepreciationEntry.create({
            asset_id: asset.id,
            tax_year: taxYear,
            tax_type: taxType,
            jurisdiction: stateCode,
            amount: stateResult.stateDepreciation,
            detail_json: {
                federal: federalResult,
                state: stateResult,
                rule: rule
                    ? {
                          ruleType: rule.ruleType,
                          office: rule.office,
                      }
                    : null,
            },
        });

        federalTotal += federalResult.total;
        stateTotal += stateResult.stateDepreciation;

        if (rule && rule.sources) {
            rule.sources.forEach((s) => allSources.add(s));
        }

        if (stateResult.warnings) {
            stateResult.warnings.forEach((w) => allWarnings.push(w));
        }

        assetReports.push({
            asset: {
                id: asset.id,
                name: asset.name,
                serial_number: asset.serial_number,
                asset_number: asset.asset_number,
                asset_number: asset.asset_number,
                cost: assetWithMeta.cost,
                cost_basis: assetWithMeta.cost_basis,
                placed_in_service_date: assetWithMeta.placed_in_service_date,
                property_class: assetWithMeta.property_class,
            },
            federal: federalResult,
            state: stateResult,
        });
    }

    return {
        office: {
            officeid: office.officeid,
            alias: office.Alias,
            city: office.City,
            state: office.state,
            stateCode,
        },
        taxYear,
        taxType,
        rule: rule
            ? {
                  ruleType: rule.ruleType,
                  parameters: rule.parameters,
              }
            : null,
        totals: {
            federalDepreciation: parseFloat(federalTotal.toFixed(2)),
            stateDepreciation: parseFloat(stateTotal.toFixed(2)),
            difference: parseFloat((stateTotal - federalTotal).toFixed(2)),
        },
        assets: assetReports,
        sources: Array.from(allSources),
        warnings: [...new Set(allWarnings)], // Deduplicate warnings
        generatedAt: new Date().toISOString(),
    };
}

/**
 * Generate federal-only report
 * @param {number} taxYear - Tax year
 * @returns {Object} Federal depreciation report
 */
async function generateFederalReport(taxYear) {
    // Get all equipment with tax meta
    const equipment = await Equipment.findAll({
        include: [
            {
                model: AssetTaxMeta,
                required: true, // Only include equipment with tax meta
            },
        ],
    });

    const assetReports = [];
    let federalTotal = 0;

    for (const asset of equipment) {
        const taxMeta = asset.AssetTaxMeta;

        // Skip if equipment was placed in service AFTER the selected tax year
        if (taxMeta.placed_in_service_date) {
            const placedInServiceYear = new Date(
                taxMeta.placed_in_service_date,
            ).getFullYear();
            if (placedInServiceYear > taxYear) {
                console.log(
                    `[Federal Report] Skipping ${asset.name} - placed in service in ${placedInServiceYear}, after tax year ${taxYear}`,
                );
                continue;
            }
        }

        const assetWithMeta = {
            id: asset.id,
            name: asset.name,
            serial_number: asset.serial_number,
            asset_number: asset.asset_number,
            cost: parseFloat(asset.cost || 0),
            ...taxMeta.toJSON(),
        };

        const federalResult = computeFederalDepreciation(
            assetWithMeta,
            taxYear,
        );

        // Skip if federal depreciation is 0 (cannot be written off)
        if (federalResult.total === 0) {
            console.log(
                `[Federal Report] Skipping ${asset.name} - federal depreciation is $0`,
            );
            continue;
        }

        federalTotal += federalResult.total;

        assetReports.push({
            asset: {
                id: asset.id,
                name: asset.name,
                serial_number: asset.serial_number,
                asset_number: asset.asset_number,
                location: asset.location,
            },
            depreciation: federalResult,
        });
    }

    return {
        taxYear,
        taxType: "FEDERAL_INCOME",
        jurisdiction: "US",
        total: parseFloat(federalTotal.toFixed(2)),
        assets: assetReports,
        generatedAt: new Date().toISOString(),
    };
}

module.exports = {
    generateOfficeReport,
    generateFederalReport,
};
