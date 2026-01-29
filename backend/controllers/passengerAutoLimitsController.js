const fs = require("fs");
const path = require("path");
const {
    clearCache,
} = require("../depreciation/rules/passengerAutoLimitsLoader");

const PASSENGER_AUTO_FILE = path.join(
    __dirname,
    "../depreciation/rules/passenger-auto-limits.json",
);

/**
 * Read passenger auto limits from JSON file
 */
function readPassengerAutoFile() {
    const rawData = fs.readFileSync(PASSENGER_AUTO_FILE, "utf-8");
    const data = JSON.parse(rawData);

    // Convert passengerAutoLimits object to array
    const limitsArray = Object.entries(data.passengerAutoLimits).map(
        ([year, limits]) => ({
            taxYear: parseInt(year),
            year1_withBonus: limits.year1_withBonus,
            year1_noBonus: limits.year1_noBonus,
            year2: limits.year2,
            year3: limits.year3,
            year4Plus: limits.year4Plus,
            source: limits.source || "",
        }),
    );

    return {
        meta: data.meta,
        limits: limitsArray.sort((a, b) => b.taxYear - a.taxYear),
        applicability: data.applicability || {},
        notes: data.notes || [],
    };
}

/**
 * Write passenger auto limits to JSON file
 */
function writePassengerAutoFile(data) {
    // Convert limits array back to passengerAutoLimits object
    const passengerAutoLimits = {};
    data.limits.forEach((limit) => {
        passengerAutoLimits[limit.taxYear.toString()] = {
            year1_withBonus: parseInt(limit.year1_withBonus),
            year1_noBonus: parseInt(limit.year1_noBonus),
            year2: parseInt(limit.year2),
            year3: parseInt(limit.year3),
            year4Plus: parseInt(limit.year4Plus),
            source: limit.source || "",
        };
    });

    const fileData = {
        meta: data.meta,
        passengerAutoLimits,
        applicability: data.applicability,
        notes: data.notes,
    };

    fs.writeFileSync(PASSENGER_AUTO_FILE, JSON.stringify(fileData, null, 2));

    // Clear the loader cache
    clearCache();
}

/**
 * GET all passenger auto limits
 */
const GetAll = async (req, res, next) => {
    try {
        const data = readPassengerAutoFile();
        res.json(data);
    } catch (err) {
        next(err);
    }
};

/**
 * POST new passenger auto limits for a year
 */
const Post = async (req, res, next) => {
    try {
        const {
            taxYear,
            year1_withBonus,
            year1_noBonus,
            year2,
            year3,
            year4Plus,
        } = req.body;

        if (
            !taxYear ||
            !year1_withBonus ||
            !year1_noBonus ||
            !year2 ||
            !year3 ||
            !year4Plus
        ) {
            return res.status(400).json({
                message:
                    "All fields required: taxYear, year1_withBonus, year1_noBonus, year2, year3, year4Plus",
            });
        }

        const data = readPassengerAutoFile();

        // Check if year already exists
        if (data.limits.find((l) => l.taxYear === parseInt(taxYear))) {
            return res.status(400).json({
                message: `Passenger auto limits for year ${taxYear} already exist. Use PUT to update.`,
            });
        }

        // Add new limits
        data.limits.push({
            taxYear: parseInt(taxYear),
            year1_withBonus: parseInt(year1_withBonus),
            year1_noBonus: parseInt(year1_noBonus),
            year2: parseInt(year2),
            year3: parseInt(year3),
            year4Plus: parseInt(year4Plus),
            source: req.body.source || "",
        });

        writePassengerAutoFile(data);

        res.status(201).json({
            message: "Passenger auto limits added successfully",
            data: data.limits,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * PUT update existing passenger auto limits
 */
const Update = async (req, res, next) => {
    try {
        const { year } = req.params;
        const { year1_withBonus, year1_noBonus, year2, year3, year4Plus } =
            req.body;

        if (
            !year1_withBonus ||
            !year1_noBonus ||
            !year2 ||
            !year3 ||
            !year4Plus
        ) {
            return res.status(400).json({
                message:
                    "All fields required: year1_withBonus, year1_noBonus, year2, year3, year4Plus",
            });
        }

        const data = readPassengerAutoFile();

        const limitIndex = data.limits.findIndex(
            (l) => l.taxYear === parseInt(year),
        );

        if (limitIndex === -1) {
            return res.status(404).json({
                message: `Passenger auto limits for year ${year} not found`,
            });
        }

        // Update limits
        data.limits[limitIndex] = {
            taxYear: parseInt(year),
            year1_withBonus: parseInt(year1_withBonus),
            year1_noBonus: parseInt(year1_noBonus),
            year2: parseInt(year2),
            year3: parseInt(year3),
            year4Plus: parseInt(year4Plus),
            source: req.body.source || data.limits[limitIndex].source || "",
        };

        writePassengerAutoFile(data);

        res.json({
            message: "Passenger auto limits updated successfully",
            data: data.limits,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE passenger auto limits
 */
const Delete = async (req, res, next) => {
    try {
        const { year } = req.params;

        const data = readPassengerAutoFile();

        const limitIndex = data.limits.findIndex(
            (l) => l.taxYear === parseInt(year),
        );

        if (limitIndex === -1) {
            return res.status(404).json({
                message: `Passenger auto limits for year ${year} not found`,
            });
        }

        // Remove limits
        data.limits.splice(limitIndex, 1);

        writePassengerAutoFile(data);

        res.json({
            message: "Passenger auto limits deleted successfully",
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
