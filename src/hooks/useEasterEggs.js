import { useState } from "react";

/**
 * Custom hook for managing easter egg animations triggered by search terms
 * @returns {Object} Object containing:
 *   - meatRain: boolean indicating if meat rain is active
 *   - higgyRain: boolean indicating if higgy rain is active
 *   - handleSearchChange: function to handle search input changes and trigger easter eggs
 */
const useEasterEggs = () => {
    const [meatRain, setMeatRain] = useState(false);
    const [higgyRain, setHiggyRain] = useState(false);

    /**
     * Handles search input changes and checks for easter egg triggers
     * @param {string} value - The search input value
     * @param {Function} setSearchCallback - Optional callback to set the search term in parent component
     */
    const handleSearchChange = (value, setSearchCallback) => {
        // Call the parent's setSearch function if provided
        if (setSearchCallback) {
            setSearchCallback(value);
        }

        const lowerValue = value.toLowerCase();

        // Easter egg: trigger meat rain when "meat" is typed
        if (lowerValue === "meat") {
            setMeatRain(true);
            setTimeout(() => setMeatRain(false), 5000);
        }

        // Easter egg: trigger higgy rain when "higgy" is typed
        if (lowerValue === "higgy") {
            setHiggyRain(true);
            setTimeout(() => setHiggyRain(false), 5000);
        }
    };

    return {
        meatRain,
        higgyRain,
        handleSearchChange,
    };
};

export default useEasterEggs;
