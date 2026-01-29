const fs = require("fs");
const path = require("path");
const { clearCache } = require("../depreciation/rules/bonusRatesLoader");

const BONUS_RATES_FILE = path.join(
    __dirname,
    "../depreciation/rules/bonus-depreciation-rates.json",
);

/**
 * Read bonus rates from JSON file
 */
function readBonusRatesFile() {
    const rawData = fs.readFileSync(BONUS_RATES_FILE, "utf-8");
    const data = JSON.parse(rawData);

    // Convert bonusByYear object to array for frontend table
    const ratesArray = Object.entries(data.bonusByYear).map(([year, info]) => ({
        taxYear: parseInt(year),
        bonusPercent: info.bonusPercent,
        notes: info.notes || "",
        source: info.source || "",
    }));

    return {
        meta: data.meta,
        rates: ratesArray.sort((a, b) => b.taxYear - a.taxYear), // Newest first
        notes: data.notes || [],
    };
}

/**
 * Write bonus rates to JSON file
 */
function writeBonusRatesFile(data) {
    // Convert rates array back to bonusByYear object
    const bonusByYear = {};
    data.rates.forEach((rate) => {
        bonusByYear[rate.taxYear.toString()] = {
            bonusPercent: parseFloat(rate.bonusPercent),
            notes: rate.notes || "",
            source: rate.source || "",
        };
    });

    const fileData = {
        meta: data.meta,
        bonusByYear,
        notes: data.notes,
    };

    fs.writeFileSync(BONUS_RATES_FILE, JSON.stringify(fileData, null, 2));

    // Clear the loader cache so it reloads
    clearCache();
}

/**
 * GET all bonus rates
 */
const GetAll = async (req, res, next) => {
    try {
        const data = readBonusRatesFile();
        res.json(data);
    } catch (err) {
        next(err);
    }
};

/**
 * POST new bonus rate for a year
 */
const Post = async (req, res, next) => {
    try {
        const { taxYear, bonusPercent, notes } = req.body;

        if (!taxYear || bonusPercent === undefined) {
            return res.status(400).json({
                message: "taxYear and bonusPercent are required",
            });
        }

        const data = readBonusRatesFile();

        // Check if year already exists
        if (data.rates.find((r) => r.taxYear === parseInt(taxYear))) {
            return res.status(400).json({
                message: `Bonus rate for year ${taxYear} already exists. Use PUT to update.`,
            });
        }

        // Add new rate
        data.rates.push({
            taxYear: parseInt(taxYear),
            bonusPercent: parseFloat(bonusPercent),
            notes: notes || "",
            source: req.body.source || "",
        });

        writeBonusRatesFile(data);

        res.status(201).json({
            message: "Bonus rate added successfully",
            data: data.rates,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * PUT update existing bonus rate
 */
const Update = async (req, res, next) => {
    try {
        const { year } = req.params;
        const { bonusPercent, notes } = req.body;

        if (bonusPercent === undefined) {
            return res.status(400).json({
                message: "bonusPercent is required",
            });
        }

        const data = readBonusRatesFile();

        const rateIndex = data.rates.findIndex(
            (r) => r.taxYear === parseInt(year),
        );

        if (rateIndex === -1) {
            return res.status(404).json({
                message: `Bonus rate for year ${year} not found`,
            });
        }

        // Update rate
        data.rates[rateIndex] = {
            taxYear: parseInt(year),
            bonusPercent: parseFloat(bonusPercent),
            notes: notes || data.rates[rateIndex].notes,
            source: req.body.source || data.rates[rateIndex].source || "",
        };

        writeBonusRatesFile(data);

        res.json({
            message: "Bonus rate updated successfully",
            data: data.rates,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE a bonus rate
 */
const Delete = async (req, res, next) => {
    try {
        const { year } = req.params;

        const data = readBonusRatesFile();

        const rateIndex = data.rates.findIndex(
            (r) => r.taxYear === parseInt(year),
        );

        if (rateIndex === -1) {
            return res.status(404).json({
                message: `Bonus rate for year ${year} not found`,
            });
        }

        // Remove rate
        data.rates.splice(rateIndex, 1);

        writeBonusRatesFile(data);

        res.json({
            message: "Bonus rate deleted successfully",
            data: data.rates,
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    GetAll,
    Post,
    Update,
    Delete,
};
