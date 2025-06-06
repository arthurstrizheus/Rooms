/**
 * Parses a 12-hour time string ("h:mm AM" / "h:mm PM") into minutes since midnight.
 */
function parseTimeToMinutes(t) {
  const [timePart, period] = t.trim().split(" ");
  let [hour, minute] = timePart.split(":").map(Number);
  if (period === "AM") {
    if (hour === 12) hour = 0; // "12:xx AM" → 0:xx
  } else {
    if (hour !== 12) hour += 12; // "1–11 PM" → 13–23
  }
  return hour * 60 + minute;
}

/**
 * Given an array of 12-hour strings and a cutoff (same format),
 * returns only those times strictly after the cutoff.
 *
 * @param {string[]} timesList  – e.g. ["12:00 AM", "9:15 AM", "1:30 PM", "1:45 PM", "3:00 PM"]
 * @param {string}   cutoff     – e.g. "1:30 PM"
 * @returns {string[]} Filtered list of times > cutoff, in original order.
 */
export function filterTimesAfterCutoff(timesList, cutoff) {
  const cutoffMinutes = parseTimeToMinutes(cutoff);
  return timesList.filter((t) => parseTimeToMinutes(t) > cutoffMinutes);
}
