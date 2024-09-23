/**
 * Convert hex color to RGB
 * @param {string} hex - The hex color value
 * @returns {object} - An object containing the r, g, b values
 */
const hexToRgb = (hex) => {
    // Remove the hash at the start if it's there
    hex = hex?.replace(/^#/, '');

    // Parse the r, g, b values
    let bigint = parseInt(hex, 16);
    let r = (bigint >> 16) & 255;
    let g = (bigint >> 8) & 255;
    let b = bigint & 255;

    return { r, g, b };
};

/**
 * Calculate the luminance of a color
 * @param {object} rgb - The r, g, b values
 * @returns {number} - The luminance value
 */
const calculateLuminance = ({ r, g, b }) => {
    const a = [r, g, b].map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};

/**
 * Get contrast text color (black or white) for a given hex color
 * @param {string} hex - The hex color value
 * @returns {string} - 'black' or 'white'
 */
export const getContrastHexColor = (hex) => {
    const rgb = hexToRgb(hex);
    const luminance = calculateLuminance(rgb);
    return luminance > 0.179 ? 'black' : 'white';
};

// Returns Hex color
export function darkenHexColor(hex, amount = 20) {
    // Remove the hash at the start if it's there
    hex = hex.replace(/^#/, '');

    // Parse the r, g, b values from the hex color
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    // Decrease each color by the amount, ensuring it doesn't go below 0
    r = Math.max(0, r - amount);
    g = Math.max(0, g - amount);
    b = Math.max(0, b - amount);

    // Convert the r, g, b values back to a hex string
    const newHex = `#${(r.toString(16).padStart(2, '0'))}${(g.toString(16).padStart(2, '0'))}${(b.toString(16).padStart(2, '0'))}`;

    return newHex;
}

// Returns RGBA
export function darkenHexColorWithAplha(hex, amount = 20, alpha = 1) {
    // Remove the hash at the start if it's there
    hex = hex.replace(/^#/, '');

    // Parse the r, g, b values from the hex color
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    // Decrease each color by the amount, ensuring it doesn't go below 0
    r = Math.max(0, r - amount);
    g = Math.max(0, g - amount);
    b = Math.max(0, b - amount);

    // Return the color in rgba format
    return `${r}, ${g}, ${b}, ${alpha}`;
}

// Convert Hex to rgba
export function hexToRgba(hex, alpha = 1) {
    // Remove the hash at the start if it's there
    hex = hex.replace(/^#/, '');

    // Parse the r, g, b values from the hex color
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    // Return the color in rgba format
    return `${r}, ${g}, ${b}, ${alpha}`;
}