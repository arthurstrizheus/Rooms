const fs = require("fs");
const path = require("path");
const { clearCache } = require("../depreciation/rules/section179LimitsLoader");

const SECTION179_FILE = path.join(
    __dirname,
    "../depreciation/rules/section179-limits.json",
);

/**
 * Read Section 179 limits from JSON file
 */
function readSection179File() {
    const rawData = fs.readFileSync(SECTION179_FILE, "utf-8");
    const data = JSON.parse(rawData);

    // Convert limitsByYear object to array
    const limitsArray = Object.entries(data.limitsByYear).map(
        ([year, limits]) => ({
            taxYear: parseInt(year),
            maxDeduction: limits.maxDeduction,
            phaseoutThreshold: limits.phaseoutThreshold,
            source: limits.source || "",
        }),
    );

    return {
        meta: data.meta,
        limits: limitsArray.sort((a, b) => b.taxYear - a.taxYear),
        rules: data.rules || [],
        recapture: data.recapture || {},
    };
}

/**
 * Write Section 179 limits to JSON file
 */
function writeSection179File(data) {
    // Convert limits array back to limitsByYear object
    const limitsByYear = {};
    data.limits.forEach((limit) => {
        limitsByYear[limit.taxYear.toString()] = {
            maxDeduction: parseInt(limit.maxDeduction),
            phaseoutThreshold: parseInt(limit.phaseoutThreshold),
            source: limit.source || "",
        };
    });

    const fileData = {
        meta: data.meta,
        limitsByYear,
        rules: data.rules,
        recapture: data.recapture,
    };

    fs.writeFileSync(SECTION179_FILE, JSON.stringify(fileData, null, 2));

    // Clear the loader cache
    clearCache();
}

/**
 * GET all Section 179 limits
 */
const GetAll = async (req, res, next) => {
    try {
        const data = readSection179File();
        res.json(data);
    } catch (err) {
        next(err);
    }
};

/**
 * POST new Section 179 limits for a year
 */
const Post = async (req, res, next) => {
    try {
        const { taxYear, maxDeduction, phaseoutThreshold } = req.body;

        if (!taxYear || !maxDeduction || !phaseoutThreshold) {
            return res.status(400).json({
                message:
                    "taxYear, maxDeduction, and phaseoutThreshold are required",
            });
        }

        const data = readSection179File();

        // Check if year already exists
        if (data.limits.find((l) => l.taxYear === parseInt(taxYear))) {
            return res.status(400).json({
                message: `Section 179 limits for year ${taxYear} already exist. Use PUT to update.`,
            });
        }

        // Add new limits
        data.limits.push({
            taxYear: parseInt(taxYear),
            maxDeduction: parseInt(maxDeduction),
            phaseoutThreshold: parseInt(phaseoutThreshold),
            source: req.body.source || "",
        });

        writeSection179File(data);

        res.status(201).json({
            message: "Section 179 limits added successfully",
            data: data.limits,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * PUT update existing Section 179 limits
 */
const Update = async (req, res, next) => {
    try {
        const { year } = req.params;
        const { maxDeduction, phaseoutThreshold } = req.body;

        if (!maxDeduction || !phaseoutThreshold) {
            return res.status(400).json({
                message: "maxDeduction and phaseoutThreshold are required",
            });
        }

        const data = readSection179File();

        const limitIndex = data.limits.findIndex(
            (l) => l.taxYear === parseInt(year),
        );

        if (limitIndex === -1) {
            return res.status(404).json({
                message: `Section 179 limits for year ${year} not found`,
            });
        }

        // Update limits
        data.limits[limitIndex] = {
            taxYear: parseInt(year),
            maxDeduction: parseInt(maxDeduction),
            phaseoutThreshold: parseInt(phaseoutThreshold),
            source: req.body.source || data.limits[limitIndex].source || "",
        };

        writeSection179File(data);

        res.json({
            message: "Section 179 limits updated successfully",
            data: data.limits,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE Section 179 limits
 */
const Delete = async (req, res, next) => {
    try {
        const { year } = req.params;

        const data = readSection179File();

        const limitIndex = data.limits.findIndex(
            (l) => l.taxYear === parseInt(year),
        );

        if (limitIndex === -1) {
            return res.status(404).json({
                message: `Section 179 limits for year ${year} not found`,
            });
        }

        // Remove limits
        data.limits.splice(limitIndex, 1);

        writeSection179File(data);

        res.json({
            message: "Section 179 limits deleted successfully",
            data: data.limits,
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
