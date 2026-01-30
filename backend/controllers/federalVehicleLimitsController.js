const fs = require("fs");
const path = require("path");
const {
    loadFederalVehicleLimits,
    clearCache,
} = require("../depreciation/rules/federalLimitsLoader");

const LIMITS_FILE = path.join(
    __dirname,
    "../depreciation/rules/federal-vehicle-limits.json",
);

/**
 * Read the federal vehicle limits file
 */
function readLimitsFile() {
    try {
        const data = fs.readFileSync(LIMITS_FILE, "utf8");
        const parsed = JSON.parse(data);

        // Convert byTaxYear object to limits array for API response
        if (parsed.byTaxYear && !parsed.limits) {
            parsed.limits = Object.entries(parsed.byTaxYear).map(
                ([year, data]) => ({
                    taxYear: parseInt(year),
                    suv179Cap: data.suv179Cap,
                    source: data.source,
                    notes: data.notes,
                }),
            );
        }

        return parsed;
    } catch (error) {
        console.error("Error reading federal vehicle limits file:", error);
        throw new Error("Failed to read federal vehicle limits");
    }
}

/**
 * Write to the federal vehicle limits file
 */
function writeLimitsFile(data) {
    try {
        // Rebuild byTaxYear object from limits array
        if (data.limits && Array.isArray(data.limits)) {
            data.byTaxYear = {};
            data.limits.forEach((limit) => {
                data.byTaxYear[limit.taxYear.toString()] = {
                    suv179Cap: limit.suv179Cap,
                    ...(limit.source && { source: limit.source }),
                    ...(limit.notes && { notes: limit.notes }),
                };
            });
        }

        fs.writeFileSync(LIMITS_FILE, JSON.stringify(data, null, 4), "utf8");
        // Clear the cache so the new data is loaded
        clearCache();
        // Reload the limits into memory
        loadFederalVehicleLimits();
    } catch (error) {
        console.error("Error writing federal vehicle limits file:", error);
        throw new Error("Failed to save federal vehicle limits");
    }
}

/**
 * Get all federal vehicle limits
 */
const GetLimits = async (req, res, next) => {
    try {
        const data = readLimitsFile();
        res.json(data);
    } catch (err) {
        next(err);
    }
};

/**
 * Add a new limit for a tax year
 */
const AddLimit = async (req, res, next) => {
    try {
        const { taxYear, suv179Cap, source, notes } = req.body;

        // Validation
        if (!taxYear || !suv179Cap) {
            return res.status(400).json({
                message: "Tax year and SUV cap are required",
            });
        }

        const year = parseInt(taxYear);
        const cap = parseFloat(suv179Cap);

        if (isNaN(year) || year < 2000 || year > 2100) {
            return res.status(400).json({
                message: "Invalid tax year",
            });
        }

        if (isNaN(cap) || cap <= 0) {
            return res.status(400).json({
                message: "Invalid SUV cap amount",
            });
        }

        const data = readLimitsFile();

        // Check if year already exists
        if (data.limits.some((l) => l.taxYear === year)) {
            return res.status(400).json({
                message: `Limit for tax year ${year} already exists`,
            });
        }

        // Add new limit
        const newLimit = {
            taxYear: year,
            suv179Cap: cap,
        };

        if (source) newLimit.source = source;
        if (notes) newLimit.notes = notes;

        data.limits.push(newLimit);
        data.limits.sort((a, b) => a.taxYear - b.taxYear);
        data.lastUpdated = new Date().toISOString().split("T")[0];

        writeLimitsFile(data);

        res.json({
            message: `Successfully added limit for tax year ${year}`,
            limit: newLimit,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Update an existing limit
 */
const UpdateLimit = async (req, res, next) => {
    try {
        const year = parseInt(req.params.year);
        const { suv179Cap, source, notes } = req.body;

        if (isNaN(year)) {
            return res.status(400).json({
                message: "Invalid tax year",
            });
        }

        const cap = parseFloat(suv179Cap);
        if (isNaN(cap) || cap <= 0) {
            return res.status(400).json({
                message: "Invalid SUV cap amount",
            });
        }

        const data = readLimitsFile();

        const limitIndex = data.limits.findIndex((l) => l.taxYear === year);
        if (limitIndex === -1) {
            return res.status(404).json({
                message: `Limit for tax year ${year} not found`,
            });
        }

        // Update the limit
        data.limits[limitIndex] = {
            taxYear: year,
            suv179Cap: cap,
            ...(source !== undefined && { source: source || "" }),
            ...(notes !== undefined && { notes: notes || "" }),
        };

        data.lastUpdated = new Date().toISOString().split("T")[0];

        writeLimitsFile(data);

        res.json({
            message: `Successfully updated limit for tax year ${year}`,
            limit: data.limits[limitIndex],
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Delete a limit
 */
const DeleteLimit = async (req, res, next) => {
    try {
        const year = parseInt(req.params.year);

        if (isNaN(year)) {
            return res.status(400).json({
                message: "Invalid tax year",
            });
        }

        const data = readLimitsFile();

        const limitIndex = data.limits.findIndex((l) => l.taxYear === year);
        if (limitIndex === -1) {
            return res.status(404).json({
                message: `Limit for tax year ${year} not found`,
            });
        }

        // Remove the limit
        data.limits.splice(limitIndex, 1);
        data.lastUpdated = new Date().toISOString().split("T")[0];

        writeLimitsFile(data);

        res.json({
            message: `Successfully deleted limit for tax year ${year}`,
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    GetLimits,
    AddLimit,
    UpdateLimit,
    DeleteLimit,
};
