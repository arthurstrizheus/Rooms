import { differenceInMilliseconds, format } from 'date-fns';
export function formatDate(dateString) {
    // Convert the ISO string to a Date object
    const date = new Date(dateString);

    // Extract date components
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}

export function getDay(dateString){
    const date = new Date(dateString);
    return(date.getDay());
}
export function getMonth(dateString){
    const date = new Date(dateString);
    return(date.getMonth());
}
export function getYear(dateString){
    const date = new Date(dateString);
    return(date.getFullYear());
}
export function getHours(dateString){
    const date = new Date(dateString);
    return(date.getHours() > 12 ? date.getHours() - 12 : date.getHours());
}
export function getMinutes(dateString){
    const date = new Date(dateString);
    return(date.getMinutes());
}
export function getAmPm(utcISOString) {
    // Parse the UTC ISO string into a Date object
    const utcDate = new Date(utcISOString);

    // Automatically convert UTC to the local time zone
    const localHour = utcDate.getHours();

    // Determine if it's AM or PM
    return localHour < 12 ? 'am' : 'pm';
}
/**
 * Get 'a' for AM and 'p' for PM based on the provided date
 * @param {Date | number} date - The date object or timestamp
 * @returns {string} - 'a' for AM and 'p' for PM
 */
export function getDateAmPm (date) {
    // Use date-fns format function to get the AM/PM part of the time
    const amPm = format(date, 'a');
    // Return 'a' for AM and 'p' for PM
    return amPm.toLowerCase().charAt(0);
};
export function setTime(date, timeString) {
    // Clone the date object to avoid modifying the original one
    const newDate = new Date(date);

    // Extract the period (AM/PM) and time from the timeString
    const period = timeString.slice(-2).toLowerCase(); // Get "am" or "pm"
    const time = timeString.slice(0, -2); // Get the time part (e.g., "7:00", "11:30")

    let [hours, minutes] = time.split(":")?.map(Number);

    // Convert 12-hour format to 24-hour format if necessary
    if (period === "pm" && hours < 12) {
        hours += 12;
    } else if (period === "am" && hours === 12) {
        hours = 0;
    }

    // Set hours and minutes on the new date object in local time
    newDate.setHours(hours, minutes, 0, 0);

    return newDate;
}

export function getDuration(startDate, endDate) {
    const durationInMilliseconds = differenceInMilliseconds(endDate, startDate);

    const totalSeconds = Math.floor(durationInMilliseconds / 1000);
    const seconds = totalSeconds % 60;

    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;

    const hours = Math.floor(totalMinutes / 60);

    return {
        hours,
        minutes,
        seconds,
    };
}

export async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
