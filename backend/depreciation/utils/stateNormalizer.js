/**
 * State code normalization utility
 * Maps full state names to their two-letter codes
 */

const stateMap = {
    alabama: "AL",
    alaska: "AK",
    arizona: "AZ",
    arkansas: "AR",
    california: "CA",
    colorado: "CO",
    connecticut: "CT",
    delaware: "DE",
    florida: "FL",
    georgia: "GA",
    hawaii: "HI",
    idaho: "ID",
    illinois: "IL",
    indiana: "IN",
    iowa: "IA",
    kansas: "KS",
    kentucky: "KY",
    louisiana: "LA",
    maine: "ME",
    maryland: "MD",
    massachusetts: "MA",
    michigan: "MI",
    minnesota: "MN",
    mississippi: "MS",
    missouri: "MO",
    montana: "MT",
    nebraska: "NE",
    nevada: "NV",
    "new hampshire": "NH",
    "new jersey": "NJ",
    "new mexico": "NM",
    "new york": "NY",
    "north carolina": "NC",
    "north dakota": "ND",
    ohio: "OH",
    oklahoma: "OK",
    oregon: "OR",
    pennsylvania: "PA",
    "rhode island": "RI",
    "south carolina": "SC",
    "south dakota": "SD",
    tennessee: "TN",
    texas: "TX",
    utah: "UT",
    vermont: "VT",
    virginia: "VA",
    washington: "WA",
    "west virginia": "WV",
    wisconsin: "WI",
    wyoming: "WY",
};

/**
 * Normalize a state string to a two-letter code
 * @param {string} stateStr - State name or code
 * @returns {string|null} Two-letter state code or null if not found
 */
function normalizeStateToCode(stateStr) {
    if (!stateStr || typeof stateStr !== "string") {
        return null;
    }

    const cleaned = stateStr.trim().toLowerCase();

    // If already a two-letter code, return uppercase
    if (cleaned.length === 2) {
        const upper = cleaned.toUpperCase();
        // Validate it's a real state code
        if (Object.values(stateMap).includes(upper)) {
            return upper;
        }
        return null;
    }

    // Look up by full name
    return stateMap[cleaned] || null;
}

module.exports = {
    normalizeStateToCode,
};
